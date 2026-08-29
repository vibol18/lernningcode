# C/C++ Learning Playground

A web app where students can **write, compile, and run** C and C++ programs
entirely in the browser — no phone, no local compiler, no backend needed.
Compilation happens inside the browser using **clang/LLVM compiled to
WebAssembly** (`browsercc`), so the app is 100% static and can be hosted on
any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.).

## Features

- In-browser code editor (CodeMirror) with C/C++ syntax highlighting
- Compile & run C/C++ entirely in the browser via wasm-clang (`browsercc`)
- Program input (stdin) support — works with `scanf`, `std::cin`, `fgets`, etc.
- Clear error messages for compilation errors and runtime crashes
- Built-in example programs, lessons, practice problems, and quizzes for C and C++
- File manager: save programs to localStorage, download as `.c`/`.cpp` file or PNG
- Share links (`#code=...` in the URL), copy code, dark/light themes
- Robust React error handling via a top-level Error Boundary
- Keyboard shortcut: `Ctrl+Enter` to run code

## Hosting

This is a single static Vite app — the repo root builds to plain static files
(HTML/CSS/JS). No server is involved at runtime.

```bash
npm install
npm run build    # outputs ready-to-host files in dist/
```

Upload the contents of `dist/` to any static host:

- **Vercel** — the included `vercel.json` (framework Vite, build `npm run
  build`, output `dist`) is applied automatically on push; no settings needed.
- **GitHub Pages** — push `dist/` to the `gh-pages` branch (or a `/docs`
  folder), or use Actions.
- **Netlify / Cloudflare Pages** — set the build command to `npm run build`
  and the publish directory to `dist`.
- Anywhere you can drop static files (nginx, S3, etc.).

Paths are relative (`base: './'`), so it also works in a subdirectory.

### First-run note

The compiler binary (clang + lld, ~90 MB) is streamed from the
[jsDelivr](https://www.jsdelivr.com/) CDN on the first run, then cached by the
browser. Users need internet access on their first compile. A large first-run
download happens once per browser.

### Local development

```bash
npm install
npm run dev     # http://localhost:5173
```

## Architecture

```
src/   React + Vite + CodeMirror frontend (fully static, no backend)
dist/  build output — deploy this folder
```

- Compilation: `browsercc` (clang/LLVM compiled to WebAssembly) runs in the
  browser tab; C is compiled with `clang++ -x c`, C++ with `-std=c++17`.
- Execution: the resulting WASM binary runs under `@bjorn3/browser_wasi_shim`,
  with the program-input box wired to stdin and output shown in the console.

### Trade-offs vs. a native compiler

- One-time ~90 MB download on first run (cached afterwards).
- Compiling is slower than native gcc (roughly 1–2 s for typical samples).
- An infinite loop in user code will freeze the tab (browser WASM cannot be
  interrupted from JavaScript).
- No exceptions or threading support in the WASM sysroot.