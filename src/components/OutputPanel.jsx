import { useMemo, useState } from 'react';
import { parseCompilerOutput } from '../lib/parseErrors.js';

export function NetworkErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="banner banner-error" role="alert">
      <strong>Network error:</strong> {message}
    </div>
  );
}

export function CompileErrorBanner({ error, sourceLines }) {
  const diags = useMemo(
    () => (error ? parseCompilerOutput(error.output, sourceLines) : null),
    [error, sourceLines]
  );

  if (!error) return null;

  const hasErrors = diags && diags.errors.length > 0;

  return (
    <div
      className={`banner banner-error ${hasErrors ? 'banner-rich' : ''}`}
      role="alert"
    >
      <div className="banner-head">
        <strong>
          {error.stage === 'runtime' ? 'Runtime error' : 'Compilation error'}:
        </strong>
        <span className="banner-summary">{error.message}</span>
      </div>

      {error.stage !== 'runtime' && diags && (diags.errors.length > 0 || diags.warnings.length > 0) && (
        <div className="diag-list">
          {diags.errors.map((d, i) => (
            <DiagnosticRow key={`e-${i}`} d={d} />
          ))}
          {diags.warnings.map((d, i) => (
            <DiagnosticRow key={`w-${i}`} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiagnosticRow({ d }) {
  const [open, setOpen] = useState(false);
  const isError = d.severity === 'error';
  return (
    <div className={`diag-row ${isError ? 'diag-error' : 'diag-warning'}`}>
      <button
        className="diag-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`badge ${isError ? 'badge-error' : 'badge-warning'}`}>
          {isError ? 'ERROR' : 'WARN'}
        </span>
        <span className="diag-loc">
          line {d.line}
          {d.column ? `:${d.column}` : ''}
        </span>
        <span className="diag-msg">{d.message}</span>
        <span className="diag-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="diag-detail">
          {d.code && <pre className="diag-code">{d.code}</pre>}
          {d.caret && <pre className="diag-caret-line">{d.caret.trim()}</pre>}
          {d.file && <div className="diag-file">{d.file}</div>}
        </div>
      )}
    </div>
  );
}

export function OutputPanel({ output, status, events, echo }) {
  if (status === 'idle' && !output && !echo && !events?.length) {
    return <div className="output-empty">Press “Run code” to compile and run your program.</div>;
  }
  return (
    <pre className="output-pre" data-status={status} role="status">
      {events && events.length > 0
        ? events.map((ev, i) =>
            ev.type === 'out' ? (
              <span key={i}>{ev.text}</span>
            ) : (
              <span key={i} className="console-echo">
                {ev.text}
              </span>
            )
          )
        : output || ''}
      {echo ? (
        <span className="console-echo">
          {echo}
          <span className="console-caret" />
        </span>
      ) : null}
      {!output && !echo && !(events && events.length) ? '(no output)' : null}
    </pre>
  );
}

export function CheckResultBanner({ result }) {
  if (!result) return null;
  if (result.passed) {
    return (
      <div className="banner banner-pass" role="status">
        <strong>Correct!</strong> Your output matches the expected result.
      </div>
    );
  }
  return (
    <div className="banner banner-fail" role="alert">
      <strong>Not quite.</strong> Your output does not match the expected result. Compare the two below.
      <div className="io-grid io-compare">
        <div>
          <div className="io-label">Your Output</div>
          <pre className="io-box">{result.output || '(no output)'}</pre>
        </div>
        <div>
          <div className="io-label">Expected Output</div>
          <pre className="io-box">{result.expected || '(empty)'}</pre>
        </div>
      </div>
    </div>
  );
}

