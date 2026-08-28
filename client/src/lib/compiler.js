const API_BASE = '/api';

export class CompilerError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CompilerError';
    this.stage = details.stage || 'unknown';
    this.output = details.output || '';
  }
}

/**
 * Sends C/C++ code to the backend, which compiles and runs it.
 * Never throws on a compile/runtime failure of the user's code —
 * instead returns a normalized result object. Throws only on
 * transport/network-level errors.
 */
export async function compileAndRun({ code, language, compiler, input }) {
  let response;
  try {
    response = await fetch(`${API_BASE}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, compiler, input }),
    });
  } catch (networkError) {
    throw new CompilerError(
      'Could not reach the compiler server. Make sure the backend is running (npm run dev in the server folder) and that you are online.',
      { stage: 'network' }
    );
  }

  if (!response.ok) {
    let message = `Server responded with status ${response.status}.`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new CompilerError(message, { stage: 'http' });
  }

  const data = await response.json();
  if (!data.success) {
    throw new CompilerError(data.error || 'Compilation failed.', {
      stage: data.stage,
      output: data.output,
    });
  }

  return {
    success: true,
    output: data.output || '',
  };
}

/**
 * Sends code + input + expected output to the backend, which runs the
 * program and reports whether the student's output matches the expected.
 * Resolves with { passed, output, expected }. Throws CompilerError on
 * compile/runtime/network failures (like compileAndRun).
 */
export async function checkSolution({ code, language, input, expected }) {
  let response;
  try {
    response = await fetch(`${API_BASE}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, input, expected }),
    });
  } catch (e) {
    throw new CompilerError('Could not reach the compiler server.', { stage: 'network' });
  }

  if (!response.ok) {
    throw new CompilerError(`Server responded with status ${response.status}.`, { stage: 'http' });
  }

  const data = await response.json();
  if (!data.success) {
    throw new CompilerError(data.error || 'Could not run your solution.', {
      stage: data.stage,
      output: data.output,
    });
  }

  return {
    passed: !!data.passed,
    output: data.output || '',
    expected: data.expected || '',
  };
}

/**
 * For live "compile as you type" errors. Returns parsed-style raw output
 * from a syntax-only compile. Throws CompilerError on network failures.
 */
export async function lintCode({ code, language }) {
  let response;
  try {
    response = await fetch(`${API_BASE}/lint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });
  } catch (e) {
    throw new CompilerError('Could not reach the compiler server.', { stage: 'network' });
  }
  if (!response.ok) {
    throw new CompilerError(`Server responded with status ${response.status}.`, { stage: 'http' });
  }
  const data = await response.json();
  return { success: true, output: data.output || '', errorCount: data.errorCount || 0 };
}
