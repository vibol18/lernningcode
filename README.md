# C/C++ Learning Playground

A web app where students can **write, compile, and run** C and C++ programs
entirely in the browser — no phone, no local compiler needed. Everything runs
through a small backend that uses the machine's `gcc`/`g++`.

## Features

- In-browser code editor (CodeMirror) with C/C++ syntax highlighting
- Compile & run on the server using real `gcc` / `g++`
- Clear error messages for compilation errors, runtime crashes (segfault),
  and infinite loops (timeouts)
- Built-in example programs for C and C++
- **Robust React error handling**: a top-level Error Boundary catches any
  React rendering error and shows a friendly fallback UI instead of a
  blank/white page (see `client/src/components/ErrorBoundary.jsx`). Network
  and compile errors are normalized and displayed separately.
- Keyboard shortcut: `Ctrl+Enter` to run code

## Requirements

- Node.js 18+
- `gcc` and `g++` installed on the machine running the **server**

## Setup & run

```bash
# 1. install all dependencies
npm run install:all

# 2. run both the backend (port 4000) and frontend (port 5173)
npm run dev
```

Then open http://localhost:5173 in a browser.

### Run separately

```bash
# terminal 1 — backend compiler API
npm run dev:server

# terminal 2 — frontend dev server
npm run dev:client
```

## Architecture

```
client/  React + Vite + CodeMirror frontend
server/  Express backend that compiles & runs C/C++ code
```

- Frontend sends code to `POST /api/compile` on the backend.
- Backend writes the source to a temp file, compiles with `gcc`/`g++`, runs
  the binary with a timeout, and returns `stdout`/`stderr` plus a friendly
  error message when something goes wrong.
- Temp files are cleaned up after each run.

## Security notes

This server executes arbitrary user-submitted C/C++ code on the host machine.
It is intended for a trusted, internal learning environment only. Do **not**
expose it to the public internet without extra isolation (containers, resource
limits, firewalls, etc.).
