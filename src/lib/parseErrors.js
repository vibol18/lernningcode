/**
 * Parses gcc/g++ diagnostic output into structured entries so we can render
 * compile errors like an IDE (severity, file:line:col, plus the source line).
 *
 * Example input lines we handle:
 *   main.c:5:14: error: 'x' undeclared (first use in this function)
 *   main.cpp:12:3: warning: unused variable 'y' [-Wunused-variable]
 *       12 |   int y = 0;
 *         |   ^
 */

export function parseCompilerOutput(output, sourceLines) {
  if (!output) return { errors: [], warnings: [], raw: '' };

  const lines = output.split('\n');
  const errors = [];
  const warnings = [];
  const srcLines = sourceLines || [];

  // Diagnostic regex: file:line:col: severity: message
  const diagRe = /^([^:]+):(\d+):(\d+):\s+(error|warning|fatal error):\s+(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(diagRe);
    if (!m) continue;

    const [, file, lineStr, colStr, kind, message] = m;
    const lineNo = parseInt(lineStr, 10);
    const colNo = parseInt(colStr, 10);
    const entry = {
      file,
      line: lineNo,
      column: colNo,
      message,
      code: srcLines[lineNo - 1] ? srcLines[lineNo - 1].trim() : undefined,
    };

    // After a diagnostic, gcc may print the source line and a caret marker:
    //      12 |   int y = 0;
    //         |   ^
    // Try to capture the caret marker line (the line after the source line).
    const srcLineIdx = i + 1;
    const caretIdx = i + 2;
    if (i + caretIdx < lines.length) {
      entry.caret = lines[caretIdx];
    }
    // Also take the source line printed by gcc if we don't have one already.
    if (!entry.code && srcLineIdx < lines.length) {
      const printed = lines[srcLineIdx];
      const lm = printed.match(/^\s*\d+\s*\|\s*(.*)$/);
      if (lm) entry.code = lm[1];
    }

    if (kind === 'error' || kind === 'fatal error') {
      entry.severity = 'error';
      errors.push(entry);
    } else {
      entry.severity = 'warning';
      warnings.push(entry);
    }
  }

  return { errors, warnings, raw: output };
}
