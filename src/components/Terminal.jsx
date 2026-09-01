import { useEffect, useRef } from 'react';
import { CompileErrorBanner, CheckResultBanner } from './OutputPanel.jsx';

/**
 * Docked IDE terminal showing Console / Output / Errors, plus the interactive
 * or batch stdin input. Console merges stdout/stderr/typed echo into one
 * stream like a real terminal; Output is the final captured program output;
 * Errors shows parsed compile diagnostics.
 */

const TABS = ['console', 'output', 'errors'];

export default function Terminal({
  mode,          // 'interactive' | 'batch'
  status,        // idle | running | success | failed
  consoleLog,    // [{type:'out'|'in', text}]
  awaitingInput,
  liveInput,
  onLiveInputChange,
  onSubmitInput,
  onStop,
  isRunning,
  batchInput,
  onBatchInputChange,
  onBatchRun,
  output,
  runError,
  sourceLines,
  checkResult,
  onJumpToError,
  terminalFontSize,
  terminalFontWeight,
  interactiveOk,
  runInfo,       // {exitCode, elapsedMs}
  showConsole,
  terminalTab,
  setTerminalTab,
  onOpen,
  onClose,
  onClear,
  isProblem,
  isMobile,
}) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [consoleLog, output, awaitingInput, status, terminalTab]);

  // Focus the live input when the program asks for input.
  useEffect(() => {
    if (awaitingInput && status === 'running' && mode === 'interactive') {
      const el = inputRef.current;
      let cancelled = false;
      const tryFocus = () => {
        if (cancelled) return;
        try { el && el.focus({ preventScroll: true }); } catch { /* ignore */ }
        const focused = document.activeElement === el;
        if (!focused) requestAnimationFrame(() => {
          if (cancelled) return;
          try { el && el.focus({ preventScroll: true }); } catch { /* ignore */ }
        });
      };
      tryFocus();
      const t = setTimeout(tryFocus, 250);
      return () => { cancelled = true; clearTimeout(t); };
    }
  }, [awaitingInput, status, mode]);

  if (!showConsole) return null;

  const tabLabel = { console: 'Console', output: 'Output', errors: 'Errors' }[terminalTab];

  return (
    <div className="terminal-dock">
      <div className="terminal-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`term-tab ${terminalTab === t ? 'active' : ''}`}
            onClick={() => setTerminalTab(t)}
          >
            {t === 'console' && <span className={`term-dot ${isRunning ? 'running' : awaitingInput ? 'waiting' : ''}`} />}
            {tabLabelMap(t)}
          </button>
        ))}
        <span className="terminal-spacer" />
        {runInfo && terminalTab === 'console' && (
          <span className="term-status">
            {status === 'success' ? '✓ finished' : status === 'failed' ? '✗ error' : ''}
            {typeof runInfo.exitCode === 'number' ? ` · exit ${runInfo.exitCode}` : ''}
            {typeof runInfo.elapsedMs === 'number' ? ` · ${runInfo.elapsedMs.toFixed(0)}ms` : ''}
          </span>
        )}
        <button className="icon-btn term-btn" title="Clear console" onClick={onClear}>⌫</button>
        <button className="icon-btn term-btn" title="Close terminal" onClick={onClose}>✕</button>
      </div>

      <div className="terminal-body" style={{ fontSize: terminalFontSize, fontWeight: terminalFontWeight }}>
        {terminalTab === 'console' && (
          <>
            <CheckResultBanner result={checkResult} />
            <div className="term-scroll" ref={scrollRef}>
              {(consoleLog.length === 0 && !awaitingInput) && (
                <div className="term-placeholder">
                  {status === 'running'
                    ? 'Compiling & running…'
                    : 'Output will appear here. Press Run (Ctrl+Enter) to compile & run.'}
                </div>
              )}
              {consoleLog.map((ev, i) =>
                ev.type === 'out' ? (
                  <span key={i} className="term-line">{ev.text}</span>
                ) : (
                  <span key={i} className="term-line term-echo">{ev.text}</span>
                )
              )}
              {awaitingInput && mode === 'interactive' && (
                <span className="term-line term-echo">
                  {liveInput}
                  <span className="console-caret" />
                </span>
              )}
            </div>
          </>
        )}

        {terminalTab === 'output' && (
          <div className="term-scroll" ref={scrollRef}>
            {output ? <pre className="term-output-pre">{output}</pre> : (
              <div className="term-placeholder">No program output yet.</div>
            )}
          </div>
        )}

        {terminalTab === 'errors' && (
          <div className="term-scroll term-errors" ref={scrollRef}>
            <CompileErrorBanner error={runError} sourceLines={sourceLines} />
            {!runError && <div className="term-placeholder">No compilation errors.</div>}
          </div>
        )}

        {/* stdin row */}
        <div className="term-stdin">
          {mode === 'interactive' ? (
            <form
              className="live-row"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmitInput(liveInput);
              }}
            >
              <input
                ref={inputRef}
                className="live-input"
                type="text"
                inputMode="text"
                value={liveInput}
                onChange={(e) => onLiveInputChange(e.target.value)}
                disabled={!isRunning}
                placeholder={awaitingInput ? '🟢 Program is waiting for input — type here' : 'Type program input, press Enter'}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                enterKeyHint="send"
                spellCheck={false}
              />
              <button
                type="submit"
                className="btn btn-run btn-live-send"
                disabled={!isRunning}
              >
                Enter ↵
              </button>
            </form>
          ) : (
            <div className="term-stdin">
              <div className="batch-note">
                {interactiveOk
                  ? 'Type everything then press Run.'
                  : 'Interactive input unavailable — using batch input. Enter all input before running.'}
              </div>
              <form
                className="batch-stdin-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isRunning) onBatchRun();
                }}
              >
                <textarea
                  className="input-area terminal-input"
                  value={batchInput}
                  onChange={(e) => onBatchInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                      e.preventDefault();
                      if (!isRunning) onBatchRun();
                    }
                  }}
                  enterKeyHint={isMobile ? 'enter' : 'go'}
                  placeholder="Program input, e.g.  25"
                  rows={2}
                />
                <div className="batch-send-row">
                  <button
                    type="submit"
                    className="btn btn-run btn-live-send"
                    disabled={isRunning}
                  >
                    Run ▶
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {(isRunning || awaitingInput) && (
        <button className="btn btn-stop term-stopbar" onClick={onStop}>
          ■ Stop
        </button>
      )}
    </div>
  );
}

function tabLabelMap(t) {
  return t === 'console' ? 'Console' : t === 'output' ? 'Output' : 'Errors';
}
