import express from 'express';
import cors from 'cors';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const WORK_DIR = path.join(os.tmpdir(), 'c-cpp-learning-runs');
await fs.mkdir(WORK_DIR, { recursive: true });

const COMPILE_TIMEOUT = 15000;
const RUN_TIMEOUT = 5000;
const MAX_OUTPUT = 100000;

function runCommand(cmd, args, cwd, timeout, stdin) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { cwd, timeout, maxBuffer: MAX_OUTPUT + 10000 },
      (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
      }
    ).stdin?.end(stdin || '');
  });
}

function sanitizeSource(code, maxLen = 200000) {
  if (typeof code !== 'string') {
    throw new Error('Code must be a string');
  }
  if (code.length === 0) {
    throw new Error('Code cannot be empty');
  }
  if (code.length > maxLen) {
    throw new Error(`Code is too large (max ${maxLen} characters)`);
  }
  return code;
}

function fullOutput(stdout, stderr) {
  let combined = '';
  combined += stderr;
  if (stdout) combined += (combined ? '\n' : '') + stdout;
  return combined.slice(0, MAX_OUTPUT);
}

app.post('/api/compile', async (req, res) => {
  const lang = req.body?.language === 'cpp' ? 'cpp' : 'c';
  let code;
  try {
    code = sanitizeSource(req.body?.code);
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }

  const id = crypto.randomBytes(8).toString('hex');
  const dirPath = path.join(WORK_DIR, id);
  const srcFile = lang === 'cpp' ? 'main.cpp' : 'main.c';
  const binary = path.join(dirPath, 'program');

  try {
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, srcFile), code, 'utf8');

    const compiler = lang === 'cpp' ? (req.body?.compiler === 'gcc' && false ? 'gcc' : 'g++') : 'gcc';
    const compileArgs = lang === 'cpp'
      ? ['-std=c++17', '-O0', '-g', '-Wall', '-Wextra', '-o', binary, srcFile]
      : ['-std=c11', '-O0', '-g', '-Wall', '-Wextra', '-o', binary, srcFile];

    const compileResult = await runCommand(compiler, compileArgs, dirPath, COMPILE_TIMEOUT);

    if (compileResult.error) {
      const compileError = fullOutput(compileResult.stdout, compileResult.stderr);
      return res.json({
        success: false,
        stage: 'compile',
        error: compileResult.error.killed ? 'Compilation timed out.' : (compileError || String(compileResult.error.message || compileResult.error)),
        output: compileError,
      });
    }

    const runResult = await runCommand(binary, [], dirPath, RUN_TIMEOUT, req.body?.input || '');

    if (runResult.error) {
      if (runResult.error.signal === 'SIGSEGV') {
        return res.json({
          success: false,
          stage: 'runtime',
          error: 'Your program crashed (Segmentation fault). This usually means you tried to access memory you should not have.',
          output: fullOutput(runResult.stdout, runResult.stderr),
        });
      }
      if (runResult.error.killed) {
        return res.json({
          success: false,
          stage: 'runtime',
          error: 'Your program timed out (exceeded the run limit). It is likely stuck in an infinite loop.',
          output: fullOutput(runResult.stdout, runResult.stderr),
        });
      }
      const code = runResult.error.code;
      return res.json({
        success: false,
        stage: 'runtime',
        error: `Your program exited with error code ${typeof code === 'number' ? code : 'unknown'}.`,
        output: fullOutput(runResult.stdout, runResult.stderr),
      });
    }

    return res.json({
      success: true,
      stage: 'run',
      output: fullOutput(runResult.stdout, runResult.stderr),
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Server error while compiling: ' + e.message });
  } finally {
    fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
  }
});

/**
 * Normalizes program output so small formatting differences (extra blank
 * lines, trailing spaces, different line endings) don't fail a student.
 */
function normalizeOutput(str) {
  return String(str || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/g, '')
    .trim();
}

app.post('/api/check', async (req, res) => {
  const lang = req.body?.language === 'cpp' ? 'cpp' : 'c';
  let code;
  try {
    code = sanitizeSource(req.body?.code);
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }
  const input = String(req.body?.input || '');
  const expected = String(req.body?.expected || '');

  const id = crypto.randomBytes(8).toString('hex');
  const dirPath = path.join(WORK_DIR, id);
  const srcFile = lang === 'cpp' ? 'main.cpp' : 'main.c';
  const binary = path.join(dirPath, 'program');

  try {
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, srcFile), code, 'utf8');

    const compiler = lang === 'cpp' ? 'g++' : 'gcc';
    const compileArgs = lang === 'cpp'
      ? ['-std=c++17', '-O0', '-g', '-Wall', '-Wextra', '-o', binary, srcFile]
      : ['-std=c11', '-O0', '-g', '-Wall', '-Wextra', '-o', binary, srcFile];

    const compileResult = await runCommand(compiler, compileArgs, dirPath, COMPILE_TIMEOUT);
    if (compileResult.error) {
      const compileError = fullOutput(compileResult.stdout, compileResult.stderr);
      return res.json({
        success: false,
        passed: false,
        stage: 'compile',
        error: compileResult.error.killed ? 'Compilation timed out.' : (compileError || 'Compilation failed.'),
        output: compileError,
      });
    }

    const runResult = await runCommand(binary, [], dirPath, RUN_TIMEOUT, input);
    const actual = fullOutput(runResult.stdout, runResult.stderr);

    if (runResult.error) {
      let message = 'Your program did not run successfully.';
      if (runResult.error.signal === 'SIGSEGV') message = 'Your program crashed (Segmentation fault).';
      else if (runResult.error.killed) message = 'Your program timed out (likely an infinite loop).';
      else message = `Your program exited with error code ${runResult.error.code ?? 'unknown'}.`;
      return res.json({ success: false, passed: false, stage: 'runtime', error: message, output: actual });
    }

    const passed = normalizeOutput(actual) === normalizeOutput(expected);
    return res.json({
      success: true,
      passed,
      stage: 'run',
      output: actual,
      expected,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Server error while checking: ' + e.message });
  } finally {
    fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'c-cpp-learning-server' });
});

app.post('/api/lint', async (req, res) => {
  const lang = req.body?.language === 'cpp' ? 'cpp' : 'c';
  let code;
  try {
    code = sanitizeSource(req.body?.code, 200000);
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }

  const id = crypto.randomBytes(8).toString('hex');
  const dirPath = path.join(WORK_DIR, id);
  const srcFile = lang === 'cpp' ? 'main.cpp' : 'main.c';

  try {
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, srcFile), code, 'utf8');

    const compiler = lang === 'cpp' ? 'g++' : 'gcc';
    const args = lang === 'cpp'
      ? ['-std=c++17', '-fsyntax-only', '-Wall', '-Wextra', srcFile]
      : ['-std=c11', '-fsyntax-only', '-Wall', '-Wextra', srcFile];

    const result = await runCommand(compiler, args, dirPath, COMPILE_TIMEOUT);
    if (result.error && result.error.signal === 'SIGKILL') {
      return res.json({ success: false, error: 'Timed out.' });
    }
    const output = fullOutput(result.stdout, result.stderr);
    return res.json({ success: true, errorCount: result.error ? 1 : 0, output });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  } finally {
    fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`C/C++ learning server running on http://localhost:${PORT}`);
});
