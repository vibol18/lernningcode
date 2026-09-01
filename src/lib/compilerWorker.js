/* Web Worker that compiles C/C++ and runs the program with a REAL interactive
 * stdin: when the program calls read/cin/scanf and no input is queued, this
 * worker blocks (Atomics.wait on a SharedArrayBuffer), tells the main thread
 * "need-input", and the user types straight into the Console. Because the
 * program runs off the main thread, the tab stays responsive and infinite
 * loops can be killed with Stop instead of freezing the whole page. */

const BROWSERCC_CDN = 'https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js';
const WASI_CDN = 'https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/index.js';

const STATE_EMPTY = 0;
const STATE_READY = 1;
/* The worker re-checks the SharedArrayBuffer every WAIT_TIMEOUT_MS instead of
 * relying solely on Atomics.notify to wake it. Some Safari/WebKit builds can
 * miss a notification issued while the worker is blocked here; the periodic
 * re-check guarantees stdin is never stuck waiting. 200ms keeps the UI feel
 * snappy while adding negligible CPU. */
const WAIT_TIMEOUT_MS = 200;

let sabState = null;
let sabLen = null;
let sabData = null;

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'setup') {
    sabState = new Int32Array(msg.sab);
    sabLen = new Int32Array(msg.sab, 4);
    sabData = new Uint8Array(msg.sab, 8);
  } else if (msg.type === 'run') {
    runProgram(msg.code, msg.language, msg.standard, msg.extraFiles || {}).catch((err) => {
      self.postMessage({ type: 'error', message: String((err && err.message) || err) });
    });
  }
  // `wake` is a redundant kick in case a WebKit build dropped the notify; the
  // timeout-based wait below is the real guarantee, so nothing needs to be read
  // from the message itself.
};

async function loadModule(url) {
  return import(/* @vite-ignore */ url);
}

function langFile(language) {
  return language === 'cpp' ? 'main.cpp' : 'main.c';
}

function langFlags(language, standard = 'c++17') {
  if (language !== 'cpp') return ['-x', 'c', '-O0', '-Wall'];
  const stds = ['c++11', 'c++14', 'c++17', 'c++20', 'c++23'];
  const s = stds.includes(standard) ? standard : 'c++17';
  return ['-std=' + s, '-O0', '-Wall'];
}

async function runProgram(code, language, standard = 'c++17', extraFiles = {}) {
  const [{ compile }, { WASI, Fd }] = await Promise.all([
    loadModule(BROWSERCC_CDN),
    loadModule(WASI_CDN),
  ]);

  // stdin: consumes SAB messages one at a time, blocking while empty,
  // and carries leftover bytes across reads so nothing is lost.
  class ConsoleInput extends Fd {
    constructor() {
      super();
      this.residue = new Uint8Array(0);
      // Only notify the UI once per wait: spamming need-input messages on
      // every loop iteration can fight the iOS keyboard / React focus.
      this.notified = false;
    }
    // Block (off the main thread) until the main thread publishes a line.
    readLine() {
      for (;;) {
        if (Atomics.load(sabState, 0) === STATE_READY) {
          const n = Atomics.load(sabLen, 0);
          const bytes = sabData.slice(0, n);
          Atomics.store(sabState, 0, STATE_EMPTY);
          Atomics.notify(sabState, 0, 1);
          this.notified = false;
          return bytes;
        }
        if (!this.notified) {
          self.postMessage({ type: 'need-input' });
          this.notified = true;
        }
        // Timeout-based wait: re-checks state even if a notify is missed, so
        // the C++ program always resumes once the user sends input.
        Atomics.wait(sabState, 0, STATE_EMPTY, WAIT_TIMEOUT_MS);
      }
    }
    fd_read(size) {
      if (this.residue.length === 0) {
        this.residue = this.readLine();
      }
      const want = Math.min(size, this.residue.length);
      const out = this.residue.slice(0, want);
      this.residue = this.residue.slice(want);
      return { ret: 0, data: out };
    }
  }

  class ConsoleOutput extends Fd {
    constructor(kind) {
      super();
      this.kind = kind;
      this.decoder = new TextDecoder();
    }
    fd_write(data) {
      const text = this.decoder.decode(data, { stream: true });
      if (text) self.postMessage({ type: this.kind, data: text });
      return { ret: 0, nwritten: data.byteLength };
    }
  }

  let result;
  try {
    result = await compile({ source: code, fileName: langFile(language), flags: langFlags(language, standard), extraFiles });
  } catch (err) {
    self.postMessage({
      type: 'compile-error',
      message: (err && err.message) || 'The in-browser compiler crashed.',
    });
    return;
  }

  if (!result.module) {
    const out = result.compileOutput || 'Compilation failed.';
    self.postMessage({ type: 'compile-error', message: out, output: out });
    return;
  }

  const wasi = new WASI([], [], [new ConsoleInput(), new ConsoleOutput('stdout'), new ConsoleOutput('stderr')]);
  const instance = await WebAssembly.instantiate(result.module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  self.postMessage({ type: 'run-started' });

  let exitCode = 0;
  const startedAt = performance.now();
  try {
    wasi.start(instance);
  } catch (err) {
    if (err && typeof err.code === 'number') exitCode = err.code;
    else if (err && err.message && err.message !== '') exitCode = -1;
  }
  const elapsedMs = performance.now() - startedAt;
  self.postMessage({ type: 'done', exitCode, elapsedMs });
}