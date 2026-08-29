import { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { toPng } from 'html-to-image';
import { compileAndRun, CompilerError } from './lib/compiler.js';
import { SAMPLES, DEFAULT_CODE } from './lib/samples.js';
import { OutputPanel, NetworkErrorBanner, CompileErrorBanner } from './components/OutputPanel.jsx';

export default function App() {
  const [language, setLanguage] = useState('c');
  const [compiler, setCompiler] = useState('auto');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('idle');
  const [runError, setRunError] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  const [lastRunInfo, setLastRunInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 800px)').matches : false
  );
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 800px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!downloadOpen) return;
    const onOutside = () => setDownloadOpen(false);
    window.addEventListener('click', onOutside);
    return () => window.removeEventListener('click', onOutside);
  }, [downloadOpen]);

  const isRunning = status === 'running';

  const applySample = useCallback((sample) => {
    setRunError(null);
    setNetworkError(null);
    setOutput('');
    setStatus('idle');
    setCode(sample.code);
  }, []);

  const selectLanguage = (lang) => {
    setLanguage(lang);
    const samples = SAMPLES[lang];
    const first = Object.values(samples)[0];
    applySample(first);
  };

  const openConsole = useCallback((height) => {
    setConsoleOpen(true);
    if (height) setConsoleHeight(height);
  }, []);

  const downloadCode = useCallback(() => {
    const ext = language === 'cpp' ? 'cpp' : 'c';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, language]);

  const downloadPicture = useCallback(async () => {
    const node = editorRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#0f1117',
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `code-${language}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setNetworkError('Could not capture the picture of your code.');
      console.error(e);
    }
  }, [language]);

  const runCode = useCallback(async () => {
    setRunError(null);
    setNetworkError(null);
    setStatus('running');
    setOutput('');
    openConsole(isMobile ? 200 : 300);
    try {
      const result = await compileAndRun({ code, language, compiler });
      setOutput(result.output);
      setStatus('success');
      setLastRunInfo({ ok: true, at: new Date() });
    } catch (err) {
      if (err instanceof CompilerError) {
        if (err.stage === 'network' || err.stage === 'http') {
          setNetworkError(err.message);
          setStatus('idle');
        } else {
          setRunError({ message: err.message, output: err.output, stage: err.stage });
          setOutput(err.output || '');
          setStatus('failed');
        }
      } else {
        setNetworkError('Unexpected error while running your program.');
        setStatus('idle');
      }
    }
  }, [code, language, compiler, isMobile, openConsole]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) runCode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runCode, isRunning]);

  const samples = SAMPLES[language];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">C++</span>
          <div className="title-wrap">
            <h1>C/C++ Learning Playground</h1>
            <p className="subtitle">Write, compile &amp; run — no phone needed, just this page</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="hint">Press Ctrl+Enter to run</span>
        </div>
      </header>

      <div className="toolbar">
        <div className="toolbar-group">
          <label className="field">
            Language
            <select
              value={language}
              onChange={(e) => selectLanguage(e.target.value)}
              disabled={isRunning}
            >
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </label>
          {language === 'cpp' && (
            <label className="field">
              Compiler
              <select
                value={compiler}
                onChange={(e) => setCompiler(e.target.value)}
                disabled={isRunning}
              >
                <option value="auto">Auto (g++)</option>
                <option value="gcc">gcc</option>
              </select>
            </label>
          )}
        </div>

        <div className="toolbar-group samples">
          <span className="field-label">Examples</span>
          {Object.entries(samples).map(([key, sample]) => (
            <button
              key={key}
              className="chip"
              disabled={isRunning}
              onClick={() => applySample(sample)}
            >
              {sample.name}
            </button>
          ))}
        </div>

        <button className="btn btn-run" onClick={runCode} disabled={isRunning}>
          {isRunning ? 'Compiling & running…' : '▶ Run code'}
        </button>

        <div className="dropdown">
          <button
            className="btn btn-ghost dropdown-toggle"
            onClick={() => setDownloadOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={downloadOpen}
          >
            ⬇ Download <span className="caret">▾</span>
          </button>
          {downloadOpen && (
            <div className="dropdown-menu" role="menu">
              <button
                className="dropdown-item"
                role="menuitem"
                onClick={() => {
                  downloadPicture();
                  setDownloadOpen(false);
                }}
                title="Download a picture (PNG) of your code"
              >
                <span className="dropdown-ic">◫</span> Picture (PNG)
              </button>
              <button
                className="dropdown-item"
                role="menuitem"
                onClick={() => {
                  downloadCode();
                  setDownloadOpen(false);
                }}
                title={`Download this code as program.${language === 'cpp' ? 'cpp' : 'c'}`}
              >
                <span className="dropdown-ic">≡</span>
                File ({language === 'cpp' ? '.cpp' : '.c'})
              </button>
            </div>
          )}
        </div>
      </div>

      <NetworkErrorBanner message={networkError} />

      <div className="workspace">
        <main className="main">
          <section className="pane editor-pane" ref={editorRef}>
            <div className="pane-header">
              <span>main.{language === 'cpp' ? 'cpp' : 'c'}</span>
              <span className="cursor-info">{code.length} chars</span>
            </div>
            <CodeMirror
              value={code}
              height="100%"
              onChange={(v) => setCode(v)}
              extensions={[cpp()]}
              theme={oneDark}
              basicSetup={{
                highlightActiveLine: true,
                indentWithTab: true,
              }}
            />
          </section>
        </main>
      </div>

      {consoleOpen && (
        <div className="console-overlay" onClick={() => setConsoleOpen(false)}>
          <section
            className="terminal"
            style={{ height: consoleHeight }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pane-header terminal-header">
              <span className="terminal-title">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
                Console
                {lastRunInfo && (
                  <span className="run-time">
                    last run {lastRunInfo.at.toLocaleTimeString()}
                  </span>
                )}
              </span>
              <button
                className="icon-btn"
                onClick={() => setConsoleOpen(false)}
                title="Close console"
              >
                ✕
              </button>
            </div>
            <CompileErrorBanner error={runError} sourceLines={code.split('\n')} />
            <OutputPanel output={output} status={status} />
          </section>
        </div>
      )}
    </div>
  );
}
