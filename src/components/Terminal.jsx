import { useEffect, useRef } from 'react';
import { CompileErrorBanner, CheckResultBanner } from './OutputPanel.jsx';

/**
 * Docked IDE terminal showing Console / Output / Errors, plus the interactive
 * or batch stdin input. Console merges stdout/stderr/typed echo into one
 * stream like a real terminal; Output is the final captured program output;
 * Errors shows parsed compile diagnostics.
 */

const TABS = ['console', 'output', 'errors'];

const ANSI_COLORS = [
  '#000000', '#cd3131', '#0dbc79', '#e5e510', '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5',
  '#666666', '#f14c4c', '#23d18b', '#f5f543', '#3b8eea', '#d670d6', '#29b8db', '#ffffff',
];

function ansiColor(index) {
  if (index < 16) return ANSI_COLORS[index];
  if (index < 232) {
    const value = index - 16;
    const levels = [0, 95, 135, 175, 215, 255];
    const red = levels[Math.floor(value / 36)];
    const green = levels[Math.floor((value % 36) / 6)];
    const blue = levels[value % 6];
    return `rgb(${red}, ${green}, ${blue})`;
  }
  const gray = 8 + (index - 232) * 10;
  return `rgb(${gray}, ${gray}, ${gray})`;
}

function renderAnsi(text, previousStyle = {}) {
  const style = { ...previousStyle };
  const nodes = [];
  const pattern = /\x1b\[([0-9;:]*)m|\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[@-_]/g;
  let cursor = 0;
  let match;
  let key = 0;

  const append = (value) => {
    if (value) nodes.push(<span key={key++} style={{ ...style }}>{value}</span>);
  };

  while ((match = pattern.exec(String(text))) !== null) {
    append(String(text).slice(cursor, match.index));
    if (match[1] !== undefined) {
      const codes = match[1] ? match[1].split(/[;:]/).map((value) => Number(value || 0)) : [0];
      for (let i = 0; i < codes.length; i += 1) {
        const code = codes[i];
        if (code === 0) {
          Object.keys(style).forEach((name) => delete style[name]);
        } else if (code === 1) style.fontWeight = 700;
        else if (code === 2) style.opacity = 0.7;
        else if (code === 3) style.fontStyle = 'italic';
        else if (code === 4) style.textDecoration = 'underline';
        else if (code === 22) { delete style.fontWeight; delete style.opacity; }
        else if (code === 23) delete style.fontStyle;
        else if (code === 24) delete style.textDecoration;
        else if (code === 39) delete style.color;
        else if (code === 49) delete style.backgroundColor;
        else if (code >= 30 && code <= 37) style.color = ANSI_COLORS[code - 30];
        else if (code >= 90 && code <= 97) style.color = ANSI_COLORS[code - 90 + 8];
        else if (code >= 40 && code <= 47) style.backgroundColor = ANSI_COLORS[code - 40];
        else if (code >= 100 && code <= 107) style.backgroundColor = ANSI_COLORS[code - 100 + 8];
        else if ((code === 38 || code === 48) && codes[i + 1] === 5 && Number.isFinite(codes[i + 2])) {
          style[code === 38 ? 'color' : 'backgroundColor'] = ansiColor(Math.max(0, Math.min(255, codes[i + 2])));
          i += 2;
        } else if ((code === 38 || code === 48) && codes[i + 1] === 2 && codes.slice(i + 2, i + 5).every(Number.isFinite)) {
          const [red, green, blue] = codes.slice(i + 2, i + 5).map((value) => Math.max(0, Math.min(255, value)));
          style[code === 38 ? 'color' : 'backgroundColor'] = `rgb(${red}, ${green}, ${blue})`;
          i += 4;
        }
      }
    }
    cursor = pattern.lastIndex;
  }
  append(String(text).slice(cursor));
  return { nodes, style };
}

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
  let ansiStyle = {};
  const renderedLog = consoleLog.map((ev, i) => {
    if (ev.type !== 'out') {
      return <span key={i} className="term-line term-echo">{ev.text}</span>;
    }
    const parsed = renderAnsi(ev.text, ansiStyle);
    ansiStyle = parsed.style;
    return <span key={i} className="term-line">{parsed.nodes}</span>;
  });

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
              {renderedLog}
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
            {output ? <pre className="term-output-pre">{renderAnsi(output).nodes}</pre> : (
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
