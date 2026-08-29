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
 * Two running modes:
 *   - Batch (used for problems/check + environments without cross-origin
 *     isolation): all stdin is supplied up-front and the whole program runs
 *     synchronously (falls back to this if SharedArrayBuffer is unavailable).
 *   - Interactive (the Console Run button): the program runs inside a Web
 *     Worker, so when it blocks waiting for input the tab stays responsive,
 *     the user types into the Console, and infinite loops can be stopped
 *     instead of freezing the page.
 */

const BROWSERCC_CDN = 'https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js';
const WASI_CDN = 'https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/index.js';

const SAB_STATE_EMPTY = 0;
const SAB_STATE_READY = 1;
const SAB_DATA_BYTES = 64 * 1024;

/** True when the page is served with COOP/COEP headers so that
 * SharedArrayBuffer + Atomics (interactive console input) are available. */
export const INTERACTIVE_OK =
  typeof SharedArrayBuffer !== 'undefined' &&
  typeof crossOriginIsolated === 'boolean' &&
  crossOriginIsolated === true;

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
  return language === 'cpp'
    ? ['-std=c++17', '-O0', '-Wall']
    : ['-x', 'c', '-O0', '-Wall'];
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
 * Starts downloading the in-browser compiler in the background so the first
 * compile is fast (the ~90 MB set is fetched while the page loads instead of
 * when the user first presses Run).
 */
export function preloadCompiler() {
  getCompilerModule().catch(() => {});
  getWasi().catch(() => {});
}

async function getModules() {
  return Promise.all([
    getCompilerModule(),
    getWasi(),
  ]);
}

/**
 * Compiles and runs `code` entirely in the browser.
 * Resolves with `{ success, output }` on success.
 * Throws `{ message, stage, output }` on compile or runtime failure.
 * Throws a global Error if the compiler itself could not be loaded.
 */
export async function browserCompileAndRun({ code, language, input }) {
  const [{ compile }, { WASI, File, OpenFile, ConsoleStdout }] = await getModules();

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
    new OpenFile(new File(new TextEncoder().encode(input || ''))), // stdin
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

/**
 * Interactive run: compiles and runs the program inside a Web Worker with a
 * blocking stdin fed from the main thread. The UI thread stays responsive and
 * the Console can accept typed input the moment the program asks for it.
 *
 * Returns a controller: `{ sendInput(text), terminate(), running }`.
 * `sendInput` delivers a piece of stdin (queued if the program is busy).
 * Callbacks: onStdout(text), onStderr(text), onNeedInput() (program is waiting
 * for a line), onDone(exitCode), onError({stage,message,output}).
 * `sendInput` returns true if it was handed straight to the program.
 */
export function startInteractiveRun({ code, language, onStdout, onStderr, onNeedInput, onDone, onError }) {
  const sab = new SharedArrayBuffer(8 + SAB_DATA_BYTES);
  const state = new Int32Array(sab);
  const len = new Int32Array(sab, 4);
  const data = new Uint8Array(sab, 8);

  const worker = new Worker(new URL('./compilerWorker.js', import.meta.url), { type: 'module' });
  const pending = [];
  let finished = false;
  let watchdog = null;

  function clearWatchdog() {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  }

  function writeToSab(text) {
    const bytes = new TextEncoder().encode(text).slice(0, data.byteLength);
    data.set(bytes, 0);
    Atomics.store(len, 0, bytes.byteLength);
    Atomics.store(state, 0, SAB_STATE_READY);
    Atomics.notify(state, 0);
  }

  // Push one queued piece of input into the SAB if the worker is idle there.
  function flushOne() {
    if (!pending.length) return false;
    if (Atomics.load(state, 0) !== SAB_STATE_EMPTY) return false;
    writeToSab(pending.shift());
    return true;
  }

  function finish() {
    clearWatchdog();
    finished = true;
  }

  function sendInput(text) {
    if (finished) return false;
    if (typeof text === 'string' && text !== '') pending.push(text);
    return flushOne();
  }

  worker.addEventListener('message', (e) => {
    const m = e.data;
    clearWatchdog();
    switch (m.type) {
      case 'need-input':
        if (!flushOne()) onNeedInput && onNeedInput();
        break;
      case 'stdout':
        onStdout && onStdout(m.data);
        break;
      case 'stderr':
        onStderr && onStderr(m.data);
        break;
      case 'done':
        finish();
        worker.terminate();
        onDone && onDone(m.exitCode);
        break;
      case 'compile-error':
        finish();
        worker.terminate();
        onError && onError({ stage: 'compile', message: m.message, output: m.output || '' });
        break;
      case 'error':
        finish();
        worker.terminate();
        onError && onError({ stage: 'unknown', message: m.message });
        break;
      default:
        break;
    }
    if (!finished) resetWatchdog();
  });

  // If the worker goes completely silent while running, it is either a
  // pathological infinite loop or a crashed program — kill it instead of
  // letting the page hang.
  function resetWatchdog() {
    clearWatchdog();
    watchdog = setTimeout(() => {
      finish();
      worker.terminate();
      onError && onError({
        stage: 'runtime',
        message:
          'Your program ran for too long without printing or asking for input.\n' +
          'It is probably stuck in an infinite loop (was it stopped, or is the loop correct?).',
      });
    }, 20000);
  }

  resetWatchdog();
  worker.postMessage({
    type: 'setup',
    sab,
  });
  worker.postMessage({ type: 'run', code, language });

  return {
    sendInput,
    terminate() {
      finish();
      worker.terminate();
    },
  };
}
