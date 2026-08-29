import { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { githubLight } from '@uiw/codemirror-theme-github';
import { toPng } from 'html-to-image';
import {
  browserCompileAndRun,
  browserCheckSolution,
  preloadCompiler,
  startInteractiveRun,
  INTERACTIVE_OK,
} from './lib/browserCompiler.js';
import { SAMPLES } from './lib/samples.js';
import { PROBLEMS } from './lib/problems.js';
import { LESSONS } from './lib/lessons.js';
import { QUIZZES } from './lib/quizzes.js';
import { formatCode } from './lib/formatCode.js';
import { cppAutocomplete } from './lib/cppAutocomplete.js';
import {
  loadPrograms,
  savePrograms,
  loadTheme,
  saveTheme,
  loadFontSize,
  saveFontSize,
} from './lib/storage.js';
import {
  OutputPanel,
  NetworkErrorBanner,
  CompileErrorBanner,
  CheckResultBanner,
} from './components/OutputPanel.jsx';
import {
  LessonsPanel,
  ProblemsPanel,
  QuizPanel,
} from './components/LearnPanels.jsx';

const DRAFT_KEY = 'ccpp.draft.v1';

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(d) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(SAMPLES.cpp.hello.code);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('idle');
  const [runError, setRunError] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  const [lastRunInfo, setLastRunInfo] = useState(null);
  const [input, setInput] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 800px)').matches : false
  );
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(300);

  // Interactive console input (Worker + SharedArrayBuffer)
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [liveInput, setLiveInput] = useState('');
  const [consoleLog, setConsoleLog] = useState([]);
  const runRef = useRef(null);
  const liveInputRef = useRef(null);

  // Learn + settings
  const [learnTab, setLearnTab] = useState('none');
  const [activeProblem, setActiveProblem] = useState(null);
  const [theme, setTheme] = useState(() => loadTheme() || 'dark');
  const [fontSize, setFontSize] = useState(() => loadFontSize() || 15);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  // Download / files
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadName, setDownloadName] = useState('my_program');
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [savedPrograms, setSavedPrograms] = useState(() => loadPrograms());
  const [clipNotice, setClipNotice] = useState(null);

  const editorRef = useRef(null);

  // ---- Preload compiler in the background so first Run is fast ----
  useEffect(() => {
    preloadCompiler();
  }, []);

  // ---- Theme + font size side effects ----
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveFontSize(fontSize);
  }, [fontSize]);

  // ---- Mobile detection ----
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 800px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ---- Focus the console input whenever the program asks for input ----
  useEffect(() => {
    if (awaitingInput && status === 'running') liveInputRef.current && liveInputRef.current.focus();
  }, [awaitingInput, status]);

  // ---- Outside-click close for dropdowns ----
  useEffect(() => {
    if (!downloadOpen && !fileMenuOpen) return;
    const onOutside = () => {
      setDownloadOpen(false);
      setFileMenuOpen(false);
    };
    window.addEventListener('click', onOutside);
    return () => window.removeEventListener('click', onOutside);
  }, [downloadOpen, fileMenuOpen]);

  // ---- Autosave draft (debounced) ----
  useEffect(() => {
    const t = setTimeout(() => {
      writeDraft({ code, language, input, name: downloadName });
    }, 600);
    return () => clearTimeout(t);
  }, [code, language, input, downloadName]);

  // ---- Restore draft on mount (runs once) ----
  useEffect(() => {
    const draft = readDraft();
    if (draft && draft.code) {
      setCode(draft.code.trim() ? draft.code : SAMPLES.cpp.hello.code);
      if (draft.language) setLanguage(draft.language);
      if (typeof draft.input === 'string') setInput(draft.input);
      if (draft.name) setDownloadName(draft.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load shared code from URL hash (takes priority over draft) ----
  useEffect(() => {
    if (!window.location.hash) return;
    const m = window.location.hash.match(/[#&]code=([^&]+)/);
    if (!m) return;
    try {
      const shared = decodeURIComponent(escape(atob(m[1])));
      if (shared && shared.trim()) {
        setCode(shared);
        setRunError(null);
        setCheckResult(null);
        setOutput('');
        setStatus('idle');
        writeDraft({ code: shared, language, input, name: downloadName });
      }
    } catch {
      /* invalid share code — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = status === 'running';

  // ---- Apply sample / problem / lesson ----
  const applyCode = useCallback(
    (nextCode, lang) => {
      if (lang) setLanguage(lang);
      setCode(nextCode);
      setRunError(null);
      setNetworkError(null);
      setCheckResult(null);
      setOutput('');
      setStatus('idle');
    },
    []
  );

  const selectLanguage = (lang) => {
    setLanguage(lang);
    const samples = SAMPLES[lang];
    const first = Object.values(samples)[0];
    applyCode(first.code, lang);
  };

  // ---- Run ----
  const runCode = useCallback(() => {
    setRunError(null);
    setNetworkError(null);
    setCheckResult(null);
    setStatus('running');
    setOutput('');
    setConsoleLog([]);
    setAwaitingInput(false);
    setLiveInput('');
    openConsole(300);

    // Fallback (no cross-origin isolation): whole stdin supplied up front.
    if (!INTERACTIVE_OK) {
      browserCompileAndRun({ code, language, input })
        .then((result) => {
          const echoes = input.trim() ? `> ${input.trim()}\n` : '';
          setOutput(echoes + result.output);
          setStatus('success');
          setLastRunInfo({ ok: true, at: new Date() });
        })
        .catch((err) => {
          const stage = err && err.stage;
          const message = (err && err.message) || 'Unexpected error while running your program.';
          const out = (err && err.output) || '';
          if (stage) {
            setRunError({ message, output: out, stage: stage || 'compile' });
            setOutput(out);
            setStatus('failed');
          } else {
            setNetworkError(message);
            setStatus('idle');
          }
        });
      return;
    }

    // Interactive: program runs in a Worker; type input into the Console
    // whenever the program asks for it.
    const handle = startInteractiveRun({
      code,
      language,
      onStdout: (t) => setConsoleLog((p) => [...p, { type: 'out', text: t }]),
      onStderr: (t) => setConsoleLog((p) => [...p, { type: 'out', text: t }]),
      onNeedInput: () => setAwaitingInput(true),
      onDone: (exitCode) => {
        runRef.current = null;
        setAwaitingInput(false);
        setLiveInput('');
        setLastRunInfo({ ok: exitCode === 0, at: new Date() });
        if (exitCode === 0) {
          setStatus('success');
        } else {
          setStatus('failed');
          setRunError({
            message: `Your program exited with code ${exitCode}.`,
            stage: 'runtime',
            output: '',
          });
        }
      },
      onError: (err) => {
        runRef.current = null;
        setAwaitingInput(false);
        setLiveInput('');
        if (err && err.stage) {
          setRunError({ message: err.message, output: err.output || '', stage: err.stage });
          setOutput(err.output || '');
          setStatus('failed');
        } else {
          setNetworkError((err && err.message) || 'Could not run your program.');
          setStatus('idle');
        }
      },
    });
    runRef.current = handle;
  }, [code, language, input, isMobile]);

  const stopRun = useCallback(() => {
    if (runRef.current) runRef.current.terminate();
    runRef.current = null;
    setAwaitingInput(false);
    setLiveInput('');
    setOutput((p) => p + '\n[stopped]\n');
    setStatus('idle');
  }, []);

  const submitLiveInput = useCallback(() => {
    const text = liveInput;
    if (!text) return;
    setLiveInput('');
    if (runRef.current) runRef.current.sendInput(text + '\n');
    setConsoleLog((p) => [...p, { type: 'in', text: text + '\n' }]);
    setAwaitingInput(false);
    if (liveInputRef.current) {
      requestAnimationFrame(() => liveInputRef.current && liveInputRef.current.focus());
    }
  }, [liveInput]);

  const openConsole = useCallback((height) => {
    setConsoleOpen(true);
    if (height) setConsoleHeight(height);
  }, []);

  // ---- Check solution (problems) ----
  const runCheck = useCallback(async () => {
    const p = PROBLEMS.find((x) => x.id === activeProblem);
    if (!p) return;
    setRunError(null);
    setNetworkError(null);
    setCheckResult(null);
    setChecking(true);
    openConsole(340);
    try {
      const res = await browserCheckSolution({ code, language, input: p.input, expected: p.expected });
      setStatus('success');
      setOutput(res.output);
      setCheckResult({ passed: res.passed, output: res.output, expected: res.expected });
    } catch (err) {
      const stage = err && err.stage;
      if (stage) {
        setRunError({
          message: (err && err.message) || 'Could not run your solution.',
          output: (err && err.output) || '',
          stage: stage || 'compile',
        });
        setOutput((err && err.output) || '');
        setStatus('failed');
      } else {
        setNetworkError((err && err.message) || 'Could not check your solution.');
        setStatus('idle');
      }
    } finally {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProblem, code, language, isMobile]);

  // ---- Select problem / lesson ----
  const selectProblem = useCallback(
    (p) => {
      setActiveProblem(p ? p.id : null);
      if (p) {
        setLanguage(p.language);
        setCode(p.starterCode || p.code || '');
        setInput(p.input || '');
        setRunError(null);
        setCheckResult(null);
        setOutput('');
        setStatus('idle');
        setDownloadName(p.title.toLowerCase().replace(/\s+/g, '_'));
      }
    },
    []
  );

  const loadLesson = useCallback(
    (lesson) => {
      setLearnTab('none');
      setLanguage(lesson.language);
      setCode(lesson.code);
      setRunError(null);
      setCheckResult(null);
      setOutput('');
      setStatus('idle');
    },
    []
  );

  // ---- Download ----
  const ext = language === 'cpp' ? 'cpp' : 'c';
  const downloadCode = useCallback(() => {
    const name = (downloadName.trim() || 'my_program').replace(/[^\w.-]/g, '_');
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, downloadName, ext]);

  const downloadPicture = useCallback(async () => {
    const node = editorRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: theme === 'light' ? '#ffffff' : '#0f1117',
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
  }, [language, theme]);

  const clipboardFallback = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
  };

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      clipboardFallback(code);
    }
    setClipNotice('Code copied to clipboard');
    setTimeout(() => setClipNotice(null), 2000);
  }, [code]);

  const shareCode = useCallback(async () => {
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const url = `${window.location.origin}${window.location.pathname}#code=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      clipboardFallback(url);
    }
    setClipNotice('Share link copied to clipboard');
    setTimeout(() => setClipNotice(null), 2000);
  }, [code]);

  // ---- File manager ----
  const saveCurrentProgram = useCallback(() => {
    const updated = [...savedPrograms];
    const idx = updated.findIndex((s) => s.name === downloadName);
    const rec = {
      name: downloadName.trim() || 'my_program',
      code,
      language,
      updatedAt: Date.now(),
    };
    if (idx >= 0) updated[idx] = rec;
    else updated.unshift(rec);
    setSavedPrograms(updated);
    savePrograms(updated);
  }, [savedPrograms, downloadName, code, language]);

  const deleteProgram = useCallback(
    (name) => {
      const updated = savedPrograms.filter((s) => s.name !== name);
      setSavedPrograms(updated);
      savePrograms(updated);
    },
    [savedPrograms]
  );

  const openProgram = useCallback(
    (s) => {
      setLanguage(s.language || 'cpp');
      setCode(s.code);
      setDownloadName(s.name);
      setRunError(null);
      setCheckResult(null);
      setOutput('');
      setStatus('idle');
      setFileMenuOpen(false);
    },
    []
  );

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

  const editorTheme = theme === 'light' ? githubLight : oneDark;
  const isProblem = activeProblem !== null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">C++</span>
          <div className="title-wrap">
            <h1>C/C++ Learning Playground</h1>
            <p className="subtitle">
              Write, compile &amp; run — lessons, problems &amp; quizzes included
            </p>
          </div>
        </div>
        <div className="header-actions">
          <div className="settings-group">
            <div className="font-controls">
              <button className="fs-btn" onClick={() => setFontSize((f) => Math.max(12, f - 1))} title="Smaller text">−</button>
              <span className="fs-val">{fontSize}px</span>
              <button className="fs-btn" onClick={() => setFontSize((f) => Math.min(24, f + 1))} title="Larger text">+</button>
            </div>
            <button
              className="icon-head-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Toggle theme"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <span className="hint">Ctrl+Enter to run</span>
          </div>
        </div>
      </header>

      <nav className="learn-row">
        <button
          className={`nav-btn ${learnTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setLearnTab(learnTab === 'lessons' ? 'none' : 'lessons')}
        >
          Lessons
        </button>
        <button
          className={`nav-btn ${learnTab === 'problems' ? 'active' : ''}`}
          onClick={() => setLearnTab(learnTab === 'problems' ? 'none' : 'problems')}
        >
          Practice Problems
        </button>
        <button
          className={`nav-btn ${learnTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => setLearnTab(learnTab === 'quizzes' ? 'none' : 'quizzes')}
        >
          Quizzes
        </button>
        <span className="field-label" style={{ marginLeft: 'auto' }}>
          {isProblem ? `Problem active — use “Check my solution”` : 'Examples: run to see output'}
        </span>
      </nav>

      <div className="toolbar">
        <div className="toolbar-group">
          <label className="field">
            Language
            <select
              value={language}
              onChange={(e) => selectLanguage(e.target.value)}
              disabled={isRunning || isProblem}
            >
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </label>
        </div>

        <div className="toolbar-group samples">
          <span className="field-label">Examples</span>
          {Object.entries(samples).map(([key, sample]) => (
            <button
              key={key}
              className="chip"
              disabled={isRunning}
              onClick={() => applyCode(sample.code)}
            >
              {sample.name}
            </button>
          ))}
        </div>

        <div className="toolbar-group">
          <button
            className="btn btn-ghost"
            onClick={() => setCode((c) => formatCode(c))}
            title="Auto-indent and tidy your code"
          >
            ≡ Format
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => openConsole(300)}
            title="Open the output console"
          >
            Console
          </button>

          {isProblem ? (
            <button
              className="btn btn-run"
              onClick={runCheck}
              disabled={isRunning || checking}
            >
              {checking ? 'Checking…' : 'Check solution'}
            </button>
          ) : (
            <button className="btn btn-run" onClick={runCode} disabled={isRunning}>
              {isRunning ? 'Compiling & running…' : '▶ Run code'}
            </button>
          )}

          <div className="dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost dropdown-toggle"
              onClick={() => {
                setDownloadOpen((o) => !o);
                setFileMenuOpen(false);
              }}
              aria-haspopup="true"
              aria-expanded={downloadOpen}
            >
              ⬇ Download <span className="caret">▾</span>
            </button>
            {downloadOpen && (
              <div className="dropdown-menu" role="menu">
                <div className="dropdown-name-row" onClick={(e) => e.stopPropagation()}>
                  <label>File name</label>
                  <input
                    className="name-input"
                    value={downloadName}
                    onChange={(e) => setDownloadName(e.target.value)}
                    placeholder="my_program"
                  />
                </div>
                <button
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    downloadPicture();
                    setDownloadOpen(false);
                  }}
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
                >
                  <span className="dropdown-ic">≡</span> File (.{ext})
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    copyCode();
                    setDownloadOpen(false);
                  }}
                >
                  <span className="dropdown-ic">⧉</span> Copy code
                </button>
                <button
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    shareCode();
                    setDownloadOpen(false);
                  }}
                >
                  <span className="dropdown-ic">↗</span> Copy share link
                </button>
              </div>
            )}
          </div>

          <div className="dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost dropdown-toggle"
              onClick={() => {
                setFileMenuOpen((o) => !o);
                setDownloadOpen(false);
              }}
              aria-expanded={fileMenuOpen}
            >
              ⬇ Save <span className="caret">▾</span>
            </button>
            {fileMenuOpen && (
              <div className="dropdown-menu" role="menu">
                <button className="dropdown-item" role="menuitem" onClick={saveCurrentProgram}>
                  <span className="dropdown-ic">+</span> Save current
                </button>
                {savedPrograms.length > 0 && (
                  <>
                    <div className="dropdown-divider" />
                    {savedPrograms.map((s) => (
                      <div key={s.name} className="dropdown-item-row">
                        <button
                          className="dropdown-item"
                          role="menuitem"
                          onClick={() => openProgram(s)}
                          title={s.code.slice(0, 60) || ''}
                        >
                          <span className="dropdown-ic">◀︎</span> {s.name}
                        </button>
                        <button
                          className="dropdown-del"
                          onClick={() => deleteProgram(s.name)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <NetworkErrorBanner message={networkError} />
      {status === 'running' && (
        <div className="run-indicator">
          <span className="spinner" /> Compiling &amp; running…
        </div>
      )}

      <div className="workspace">
        <div className="live-bar">
          <span className="live-dot">
            {status === 'running' ? 'Running…' : 'In-browser compiler · first run downloads ~90 MB'}
          </span>
          {cursor.line > 0 && (
            <span className="cursor-pos">
              Ln {cursor.line}, Col {cursor.col}
            </span>
          )}
        </div>

        <main className="main">
          <section className="pane editor-pane" ref={editorRef}>
            <div className="pane-header">
              <span>{downloadName || 'program'}.{ext}</span>
              <span className="cursor-info">{code.length} chars</span>
            </div>
            <CodeMirror
              value={code}
              height="100%"
              style={{ fontSize: `${fontSize}px` }}
              onChange={(v) => setCode(v)}
              onUpdate={(vu) => {
                if (vu.selectionSet && vu.state.selection.main.head != null) {
                  const pos = vu.state.selection.main.head;
                  const line = vu.state.doc.lineAt(pos);
                  setCursor({ line: line.number, col: pos - line.from + 1 });
                }
              }}
              extensions={[cpp(), cppAutocomplete()]}
              theme={editorTheme}
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
                {isProblem ? 'Check Result' : 'Console'}
                {lastRunInfo && (
                  <span className="run-time">
                    last run {lastRunInfo.at.toLocaleTimeString()}
                  </span>
                )}
              </span>
              <button className="icon-btn" onClick={stopRun} title="Stop program (also kills infinite loops)" disabled={!isRunning}>
                ■ Stop
              </button>
              <button className="icon-btn" onClick={() => setConsoleOpen(false)} title="Close console">
                ✕
              </button>
            </div>
            <CompileErrorBanner error={runError} sourceLines={code.split('\n')} />
            <CheckResultBanner result={checkResult} />
            {awaitingInput && (
              <div className="input-await">
                <span className="await-dot" />
                Enter input…
              </div>
            )}
            <OutputPanel
              output={output}
              status={status}
              events={INTERACTIVE_OK ? consoleLog : undefined}
              echo={awaitingInput && INTERACTIVE_OK ? liveInput : ''}
            />
            {INTERACTIVE_OK ? (
              <div className="console-stdin console-live">
                <div className="console-stdin-head">
                  <span>Console input</span>
                  <span className="input-hint">
                    Type what {awaitingInput ? 'the program is asking for and' : 'your program will read with'} <code>cin</code> / <code>scanf</code>, then press Enter
                  </span>
                </div>
                <form
                  className="live-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitLiveInput();
                  }}
                >
                  <input
                    ref={liveInputRef}
                    className="live-input"
                    type="text"
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitLiveInput();
                      }
                    }}
                    disabled={!isRunning}
                    placeholder={awaitingInput ? 'The program is waiting — type here' : 'Type input, press Enter'}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    enterKeyHint="send"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    className="btn btn-run btn-live-send"
                    disabled={!isRunning || !liveInput}
                  >
                    Enter ↵
                  </button>
                </form>
              </div>
            ) : (
              <div className="console-stdin">
                <div className="console-stdin-head">
                  <span>Program input (stdin)</span>
                  <span className="input-hint">
                    Type what your program reads with <code>cin</code> / <code>scanf</code>, then press Run
                  </span>
                </div>
                <textarea
                  className="input-area terminal-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isProblem
                      ? 'This problem provides input automatically. You can still edit it.'
                      : 'Type input here, e.g.  25'
                  }
                  rows={2}
                />
                <div className="batch-send-row">
                  <button
                    type="button"
                    className="btn btn-run btn-live-send"
                    onClick={runCode}
                    disabled={isRunning}
                  >
                    Enter ↵
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {learnTab === 'lessons' && (
        <div className="learn-overlay" onClick={() => setLearnTab('none')}>
          <div onClick={(e) => e.stopPropagation()}>
            <LessonsPanel
              lessons={LESSONS.filter((l) => l.language === language)}
              onLoadCode={(c) => {
                setCode(c);
                setRunError(null);
                setCheckResult(null);
                setOutput('');
                setStatus('idle');
                setLearnTab('none');
              }}
              onExit={() => setLearnTab('none')}
            />
          </div>
        </div>
      )}

      {learnTab === 'problems' && (
        <div className="learn-overlay" onClick={() => setLearnTab('none')}>
          <div onClick={(e) => e.stopPropagation()}>
            <ProblemsPanel
              problems={PROBLEMS}
              activeProblem={activeProblem}
              onSelect={(p) => {
                selectProblem(p);
                if (!p) setLearnTab('none');
              }}
              onCheck={runCheck}
              checking={checking}
              onExit={() => setLearnTab('none')}
            />
          </div>
        </div>
      )}

      {learnTab === 'quizzes' && (
        <div className="learn-overlay" onClick={() => setLearnTab('none')}>
          <div onClick={(e) => e.stopPropagation()}>
            <QuizPanel quiz={QUIZZES.find((q) => q.language === language)} onExit={() => setLearnTab('none')} />
          </div>
        </div>
      )}
    </div>
  );
}
