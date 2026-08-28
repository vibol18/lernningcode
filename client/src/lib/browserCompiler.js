/**
 * Browser-only C/C++ compiler (no backend).
 *
 * Uses `browsercc` (a prebuilt Clang/LLVM compiler compiled to WebAssembly)
 * to compile source entirely in the browser, then runs the resulting WASM
 * binary with `@bjorn3/browser_wasi_shim`, feeding console input as stdin and
 * capturing stdout/stderr. All heavy compiler files are streamed from a CDN
 * at runtime, so the app itself stays a lightweight static build that works on
 * any static host (GitHub Pages, Netlify, Vercel, etc.).
 *
 * Trade-offs vs. the server compiler:
 *   - One-time ~90 MB download on first run (clang + lld + sysroot).
 *   - C++ compilation is slower and has some WASI limits (no exceptions,
 *     no threading). An infinite loop will freeze the tab (cannot be
 *     interrupted easily).
 */

const BROWSERCC_CDN = 'https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js';
const WASI_CDN = 'https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/index.js';

let compilerModulePromise = null;
let wasiModulePromise = null;

function loadModule(url) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const mod = await import(/* @vite-ignore */ url);
      resolve(mod);
    } catch (err) {
      reject(new Error('Could not load the in-browser compiler. Check your internet connection and try again.'));
    }
  });
}

function getCompilerModule() {
  if (!compilerModulePromise) compilerModulePromise = loadModule(BROWSERCC_CDN);
  return compilerModulePromise;
}

function getWasi() {
  if (!wasiModulePromise) wasiModulePromise = loadModule(WASI_CDN);
  return wasiModulePromise;
}

function langFile(language) {
  return language === 'cpp' ? 'main.cpp' : 'main.c';
}

function langFlags(language) {
  return language === 'cpp' ? ['-std=c++17', '-O0', '-Wall'] : ['-std=c11', '-O0', '-Wall'];
}

function normalizeOutput(str) {
  return String(str || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/g, '')
    .trim();
}

/**
 * Compiles and runs `code` entirely in the browser.
 * Resolves with `{ success, output }` on success.
 * Throws `{ message, stage, output }` on compile or runtime failure.
 * Throws a global Error if the compiler itself could not be loaded.
 */
export async function browserCompileAndRun({ code, language, input }) {
  const [{ compile }, { WASI, File, OpenFile, ConsoleStdout }] = await Promise.all([
    getCompilerModule(),
    getWasi(),
  ]);

  const fileName = langFile(language);
  const flags = langFlags(language);

  let result;
  try {
    result = await compile({ source: code, fileName, flags });
  } catch (err) {
    throw { message: (err && err.message) || 'The in-browser compiler crashed.', stage: 'unknown' };
  }

  if (!result.module) {
    const out = result.compileOutput || 'Compilation failed.';
    throw { message: out, stage: 'compile', output: out };
  }

  const stdoutParts = [];
  const stderrParts = [];
  const decoder = new TextDecoder();

  const fds = [
    new OpenFile(new File([new TextEncoder().encode(input || '')])), // stdin
    new ConsoleStdout((buf) => stdoutParts.push(decoder.decode(buf))),
    new ConsoleStdout((buf) => stderrParts.push(decoder.decode(buf))),
  ];

  const wasi = new WASI([], [], fds);
  const instance = await WebAssembly.instantiate(result.module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  let exitCode = 0;
  try {
    wasi.start(instance);
  } catch (err) {
    // Program called proc_exit or the run failed.
    if (err && typeof err.code === 'number') exitCode = err.code;
    else if (err && err.message && err.message !== '') exitCode = -1;
  }

  const out = stdoutParts.join('');
  const errText = stderrParts.join('');

  if (exitCode !== 0) {
    const output = (errText ? errText + '\n' : '') + out;
    throw {
      message:
        (errText || out || 'Your program did not run successfully.') +
        (exitCode > 0 ? `\n(exit code ${exitCode})` : ''),
      stage: 'runtime',
      output,
    };
  }

  return { success: true, output: (errText ? errText + '\n' : '') + out };
}

/**
 * Compiles and runs, then compares against the expected output (same
 * normalization as the server). Resolves with `{ passed, output, expected }`.
 * Throws like browserCompileAndRun on failures.
 */
export async function browserCheckSolution({ code, language, input, expected }) {
  const result = await browserCompileAndRun({ code, language, input });
  return {
    passed: normalizeOutput(result.output) === normalizeOutput(expected),
    output: result.output,
    expected: String(expected || ''),
  };
}
