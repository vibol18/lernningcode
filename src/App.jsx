import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  classifyRuntimeError,
  CPP_STANDARDS,
} from './lib/browserCompiler.js';
import { SAMPLES } from './lib/samples.js';
import { PROBLEMS } from './lib/problems.js';
import { LESSONS } from './lib/lessons.js';
import { QUIZZES } from './lib/quizzes.js';
import { formatCode } from './lib/formatCode.js';
import { cppAutocomplete } from './lib/cppAutocomplete.js';
import { loadSettings, saveSettings } from './lib/settings.js';
import { NetworkErrorBanner, CheckResultBanner } from './components/OutputPanel.jsx';
import { LessonsPanel, ProblemsPanel, QuizPanel } from './components/LearnPanels.jsx';
import CodeToImage from './components/CodeToImage.jsx';
import Terminal from './components/Terminal.jsx';
import FileExplorer from './components/FileExplorer.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';

// CodeMirror search/language/view extensions for the upgraded editor.
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
  foldGutter,
  foldKeymap,
  indentUnit,
  bracketMatching,
} from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { EditorView, keymap, lineNumbers as cmLineNumbers } from '@codemirror/view';

const DRAFT_KEY = 'ccpp.project.v1';
const PROGRAMS_KEY = 'ccpp.programs.v1';

function fileExt(language) {
  return language === 'c' ? '.c' : '.cpp';
}

function defaultProject(settings) {
  const code = SAMPLES.cpp.hello.code;
  return {
    name: 'My Project',
    active: `main${fileExt(settings.language)}`,
    files: [
      {
        name: `main${fileExt(settings.language)}`,
        language: settings.language,
        code,
        saved: true,
      },
    ],
  };
}

function readProject() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.files) && p.files.length) return p;
    }
  } catch {
    /* ignore */
  }
  // Fallback: migrate old single-program + draft stores into a project.
  try {
    const draft = JSON.parse(localStorage.getItem('ccpp.draft.v1') || 'null');
    const programs = JSON.parse(localStorage.getItem(PROGRAMS_KEY) || '[]');
    const s = loadSettings();
    const active = draft && typeof draft.code === 'string' && draft.code.trim()
      ? draft
      : { code: SAMPLES.cpp.hello.code, language: s.language };
    return defaultProjectWithCode(active);
  } catch {
    const s = loadSettings();
    return defaultProject(s);
  }
}

function defaultProjectWithCode(active) {
  return {
    name: 'My Project',
    active: `main${fileExt(active.language || 'cpp')}`,
    files: [
      {
        name: `main${fileExt(active.language || 'cpp')}`,
        language: active.language || 'cpp',
        code: active.code || SAMPLES.cpp.hello.code,
        saved: true,
      },
    ],
  };
}

function writeProject(project) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(project));
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [settings, setSettings] = useState(() => {
    const s = loadSettings();
    // Only keep language/standard from settings at first run; the project's
    // active file carries the real language going forward.
    s.language = s.language || 'cpp';
    return s;
  });

  const [project, setProject] = useState(() => readProject());
  const activeFile = project.files.find((f) => f.name === project.active) || project.files[0];
  const code = activeFile ? activeFile.code : '';
  const language = activeFile ? activeFile.language : settings.language;

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [showConsole, setShowConsole] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 800 : false
  );
  const [showExplorer, setShowExplorer] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 900 : false
  );
  const [terminalTab, setTerminalTab] = useState('console');
  const [terminalHeight, setTerminalHeight] = useState(260);

  const [awaitingInput, setAwaitingInput] = useState(false);
  const [liveInput, setLiveInput] = useState('');
  const [consoleLog, setConsoleLog] = useState([]);
  const [runInfo, setRunInfo] = useState(null);
  const runRef = useRef(null);

  const [learnTab, setLearnTab] = useState('none');
  const [activeProblem, setActiveProblem] = useState(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const [downloadName, setDownloadName] = useState('my_program');
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [savedPrograms, setSavedPrograms] = useState([]);
  const [clipNotice, setClipNotice] = useState(null);
  const [showCodeImage, setShowCodeImage] = useState(false);
  const [imgCode, setImgCode] = useState('');

  const editorRef = useRef(null);
  const editorViewRef = useRef(null);

  // ---- Preload compiler ----
  useEffect(() => {
    preloadCompiler();
  }, []);

  // ---- Persist settings ----
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    saveSettings(settings);
  }, [settings]);

  // ---- Persist project (debounced) ----
  useEffect(() => {
    const t = setTimeout(() => writeProject(project), 400);
    return () => clearTimeout(t);
  }, [project]);

  // ---- Mobile detection ----
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 800px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ---- iOS: keep the input visible above the on-screen keyboard ----
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const keepInputVisible = () => {
      if (window.innerWidth > 800 || !showConsole) return;
      const kbOpen = vv.height < window.innerHeight - 80;
      const el = document.querySelector('.live-input');
      if (kbOpen && el) {
        requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'auto' }));
      }
    };
    vv.addEventListener('resize', keepInputVisible);
    vv.addEventListener('scroll', keepInputVisible);
    return () => {
      vv.removeEventListener('resize', keepInputVisible);
      vv.removeEventListener('scroll', keepInputVisible);
    };
  }, [showConsole]);

  // ---- Outside-click close for share menu ----
  useEffect(() => {
    if (!shareOpen && !fileMenuOpen) return;
    const onOutside = () => {
      setShareOpen(false);
      setFileMenuOpen(false);
    };
    window.addEventListener('click', onOutside);
    return () => window.removeEventListener('click', onOutside);
  }, [shareOpen, fileMenuOpen]);

  // ---- Load shared code from URL hash ----
  useEffect(() => {
    if (!window.location.hash) return;
    const m = window.location.hash.match(/[#&]code=([^&]+)/);
    if (!m) return;
    try {
      const shared = decodeURIComponent(escape(atob(m[1])));
      if (shared && shared.trim()) {
        setProject((p) => ({ ...p, active: activeFile ? activeFile.name : p.active }));
        setProject((p) => ({
          ...p,
          files: p.files.map((f) => (f.name === p.active ? { ...f, code: shared } : f)),
        }));
        setRunError(null);
        setCheckResult(null);
        setOutput('');
        setStatus('idle');
      }
    } catch {
      /* invalid share code */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = status === 'running';

  // ---- CodeMirror extensions (rebuilt when settings change) ----
  const cmExtensions = useMemo(() => {
    const exts = [
      cpp(),
      history(),
      foldGutter(),
      bracketMatching(),
      indentUnit.of(' '.repeat(settings.tabSize)),
      highlightSelectionMatches(),
    ];
    if (settings.lineNumbers) exts.push(cmLineNumbers());
    if (settings.autocomplete) exts.push(cppAutocomplete());
    if (settings.wordWrap) exts.push(EditorView.lineWrapping);
    exts.push(
      keymap.of([
        ...defaultKeymap,
        ...searchKeymap,
        ...foldKeymap,
        ...historyKeymap,
        indentWithTab,
      ])
    );
    return exts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, language]);

  // We need access to the editor view for goto-line; store it via onUpdate.
  const handleEditorMount = useCallback((view) => {
    editorViewRef.current = view;
  }, []);

  // ---- Project helpers ----
  const setActiveFileCode = useCallback((nextCode) => {
    setProject((p) => ({
      ...p,
      files: p.files.map((f) => (f.name === p.active ? { ...f, code: nextCode, saved: false } : f)),
    }));
  }, []);

  const selectFile = useCallback((name) => {
    setProject((p) => ({ ...p, active: name }));
    setRunError(null);
    setCheckResult(null);
    setOutput('');
    setStatus('idle');
    setActiveProblem(null);
  }, []);

  const createFile = useCallback((name) => {
    const clean = name.endsWith('.cpp') || name.endsWith('.c') || name.endsWith('.h') || name.endsWith('.hpp')
      ? name
      : name.replace(/\.[^.]+$/, '') + (name.endsWith('.c') ? '.c' : '.cpp');
    setProject((p) => {
      if (p.files.some((f) => f.name === clean)) return p;
      const isC = clean.endsWith('.c');
      return {
        ...p,
        active: clean,
        files: [
          ...p.files,
          { name: clean, language: isC ? 'c' : 'cpp', code: isC
            ? '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n'
            : '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n', saved: false },
        ],
      };
    });
    setRunError(null);
    setCheckResult(null);
    setOutput('');
    setStatus('idle');
  }, []);

  const renameFile = useCallback((oldName, newName) => {
    if (!newName || oldName === newName) return;
    setProject((p) => {
      if (p.files.some((f) => f.name === newName)) return p;
      const isC = newName.endsWith('.c');
      return {
        ...p,
        active: newName,
        files: p.files.map((f) =>
          f.name === oldName
            ? { ...f, name: newName, language: isC ? 'c' : f.language }
            : f
        ),
      };
    });
  }, []);

  const deleteFile = useCallback((name) => {
    setProject((p) => {
      if (p.files.length <= 1) return p;
      const remaining = p.files.filter((f) => f.name !== name);
      const active = p.active === name ? remaining[0].name : p.active;
      return { ...p, active, files: remaining };
    });
    setRunError(null);
    setCheckResult(null);
    setOutput('');
    setStatus('idle');
  }, []);

  const downloadFile = useCallback((name) => {
    const f = project.files.find((x) => x.name === name);
    if (!f) return;
    const blob = new Blob([f.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [project]);

  const uploadFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const name = file.name;
      const isC = name.endsWith('.c');
      setProject((p) => {
        if (p.files.some((f) => f.name === name)) return p;
        return {
          ...p,
          active: name,
          files: [...p.files, { name, language: isC ? 'c' : 'cpp', code: String(reader.result || ''), saved: false }],
        };
      });
      setStatus('idle');
      setRunError(null);
      setCheckResult(null);
      setOutput('');
    };
    reader.readAsText(file);
  }, []);

  // ---- Saved programs (localStorage list view, kept for compatibility) ----
  useEffect(() => {
    try {
      const programs = JSON.parse(localStorage.getItem(PROGRAMS_KEY) || '[]');
      setSavedPrograms(Array.isArray(programs) ? programs : []);
    } catch {
      /* ignore */
    }
  }, []);

  // ---- Run ----
  const openConsole = useCallback(() => {
    setShowConsole(true);
    setTerminalTab('console');
  }, []);

  const handleRun = useCallback(() => {
    setRunError(null);
    setNetworkError(null);
    setCheckResult(null);
    setStatus('running');
    setOutput('');
    setConsoleLog([]);
    setAwaitingInput(false);
    setLiveInput('');
    setRunInfo(null);
    openConsole();

    const standard = settings.standard || 'c++17';
    const extraFiles = {};
    project.files.forEach((f) => {
      if (f.name !== project.active) extraFiles[f.name] = f.code;
    });

    // Fallback (no cross-origin isolation): whole stdin supplied up front.
    if (!INTERACTIVE_OK) {
      browserCompileAndRun({ code, language, input, standard, extraFiles })
        .then((result) => {
          const echoes = input.trim() ? `> ${input.trim()}\n` : '';
          setOutput(echoes + result.output);
          setConsoleLog([{ type: 'out', text: echoes + result.output }]);
          setStatus('success');
          setLastRunInfo({ ok: true, at: new Date() });
          setRunInfo({ exitCode: 0, elapsedMs: 0 });
        })
        .catch((err) => {
          const stage = err && err.stage;
          const message = (err && err.message) || 'Unexpected error while running your program.';
          const out = (err && err.output) || '';
          if (stage) {
            setRunError({ message, output: out, stage: stage || 'compile' });
            setOutput(out);
            setStatus('failed');
            setRunInfo({ exitCode: 1, elapsedMs: 0 });
          } else {
            setNetworkError(message);
            setStatus('idle');
          }
        });
      return;
    }

    const handle = startInteractiveRun({
      code,
      language,
      standard,
      extraFiles,
      onStdout: (t) => setConsoleLog((p) => [...p, { type: 'out', text: t }]),
      onStderr: (t) => setConsoleLog((p) => [...p, { type: 'out', text: t }]),
      onNeedInput: () => setAwaitingInput(true),
      onDone: (exitCode, elapsedMs) => {
        runRef.current = null;
        setAwaitingInput(false);
        setLiveInput('');
        setRunInfo({ exitCode, elapsedMs: elapsedMs || 0 });
        setLastRunInfo({ ok: exitCode === 0, at: new Date() });
        if (exitCode === 0) {
          setStatus('success');
        } else {
          setStatus('failed');
          setRunError({
            message: `Your program exited with code ${exitCode}. ${classifyRuntimeError(exitCode, '')}`,
            stage: 'runtime',
            output: '',
          });
        }
      },
      onError: (err) => {
        runRef.current = null;
        setAwaitingInput(false);
        setLiveInput('');
        setRunInfo({ exitCode: 1, elapsedMs: 0 });
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
  }, [code, language, input, settings.standard, project, isMobile]);

  const stopRun = useCallback(() => {
    if (runRef.current) runRef.current.terminate();
    runRef.current = null;
    setAwaitingInput(false);
    setLiveInput('');
    setConsoleLog((p) => [...p, { type: 'out', text: '[stopped]\n' }]);
    setStatus('idle');
  }, []);

  const submitLiveInput = useCallback(
    (text) => {
      const t = text;
      setLiveInput('');
      if (runRef.current) runRef.current.sendInput(t + '\n');
      setConsoleLog((p) => [...p, { type: 'in', text: t + '\n' }]);
      setAwaitingInput(false);
    },
    []
  );

  // ---- Check solution (problems) ----
  const runCheck = useCallback(async () => {
    const p = PROBLEMS.find((x) => x.id === activeProblem);
    if (!p) return;
    setRunError(null);
    setNetworkError(null);
    setCheckResult(null);
    setChecking(true);
    openConsole();
    try {
      const res = await browserCheckSolution({
        code,
        language,
        input: p.input,
        expected: p.expected,
        standard: settings.standard || 'c++17',
      });
      setStatus('success');
      setOutput(res.output);
      setConsoleLog([{ type: 'out', text: res.output }]);
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
  }, [activeProblem, code, language, settings.standard]);

  // ---- Apply lesson/problem/sample ----
  const applyCode = useCallback(
    (nextCode, lang) => {
      const stdLang = lang || language;
      setProject((p) => ({
        ...p,
        active: `main${fileExt(stdLang)}`,
        files: [
          { name: `main${fileExt(stdLang)}`, language: stdLang, code: nextCode, saved: false },
          ...p.files.filter((f) => f.name !== `main${fileExt(stdLang)}`),
        ],
      }));
      setRunError(null);
      setNetworkError(null);
      setCheckResult(null);
      setOutput('');
      setStatus('idle');
      setActiveProblem(null);
    },
    [language]
  );

  const selectProblem = useCallback(
    (p) => {
      setActiveProblem(p ? p.id : null);
      if (p) {
        applyCode(p.starterCode || p.code || '', p.language);
        setInput(p.input || '');
        setDownloadName(p.title.toLowerCase().replace(/\s+/g, '_'));
      }
    },
    [applyCode]
  );

  const loadLesson = useCallback(
    (lesson) => {
      setLearnTab('none');
      applyCode(lesson.code, lesson.language);
    },
    [applyCode]
  );

  // ---- Save current program (compat list) ----
  const saveCurrentProgram = useCallback(() => {
    const rec = { name: downloadName.trim() || 'my_program', code, language, updatedAt: Date.now() };
    setSavedPrograms((prev) => {
      const updated = prev.filter((s) => s.name !== rec.name);
      updated.unshift(rec);
      try {
        localStorage.setItem(PROGRAMS_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
    // Mark the active file saved in the project too.
    setProject((p) => ({
      ...p,
      files: p.files.map((f) => (f.name === p.active ? { ...f, saved: true } : f)),
    }));
    setClipNotice(`Saved "${rec.name}"`);
    setTimeout(() => setClipNotice(null), 2000);
  }, [downloadName, code, language]);

  const handleSaveCurrent = saveCurrentProgram;

  const openProgram = useCallback(
    (s) => {
      applyCode(s.code, s.language || 'cpp');
      setDownloadName(s.name);
      setFileMenuOpen(false);
    },
    [applyCode]
  );

  const deleteProgram = useCallback(
    (name) => {
      setSavedPrograms((prev) => {
        const updated = prev.filter((s) => s.name !== name);
        try {
          localStorage.setItem(PROGRAMS_KEY, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
    },
    []
  );

  // ---- Download (single current file) ----
  const ext = fileExt(language).slice(1);
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
        backgroundColor: settings.theme === 'light' ? '#ffffff' : '#0f1117',
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
  }, [language, settings.theme]);

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
    setShareOpen(false);
  }, [code]);

  // ---- Keyboard: Ctrl+Enter run (worker path), Ctrl+S save ----
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) handleRun();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveCurrent();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun, isRunning, handleSaveCurrent]);

  const samples = SAMPLES[language];
  const isProblem = activeProblem !== null;
  const editorTheme = settings.theme === 'light' ? githubLight : oneDark;
  const interactiveOk = INTERACTIVE_OK;

  const jumpToError = useCallback(
    (line) => {
      setTerminalTab('console');
      const view = editorViewRef.current;
      if (view) {
        const target = view.state.doc.line(line);
        view.dispatch({
          selection: { anchor: target.from },
          effects: EditorView.scrollIntoView(target.from, { y: 'center' }),
        });
        view.focus();
      }
    },
    []
  );

  const clearConsole = useCallback(() => {
    setConsoleLog([]);
    setOutput('');
  }, []);

  if (showCodeImage) {
    return (
      <CodeToImage
        onExit={() => setShowCodeImage(false)}
        initialCode={imgCode || code}
        initialLanguage={language}
        initialFileName={`${downloadName || 'program'}.${ext}`}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <button
            className="icon-btn"
            title="Toggle explorer"
            onClick={() => setShowExplorer((v) => !v)}
          >
            ☰
          </button>
          <span className="logo">C++</span>
          <div className="title-wrap">
            <h1>C/C++ Learning Playground</h1>
            <p className="subtitle">A browser-based IDE — lessons, problems &amp; quizzes</p>
          </div>
        </div>
        <div className="header-actions">
          <span className={`iso-badge ${interactiveOk ? 'ok' : 'warn'}`}>
            {interactiveOk ? 'Live input' : 'Batch input'}
          </span>
          <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>⚙ Settings</button>
        </div>
      </header>

      <div className="learn-row">
        <button className={`nav-btn ${learnTab === 'lessons' ? 'active' : ''}`} onClick={() => setLearnTab(learnTab === 'lessons' ? 'none' : 'lessons')}>Lessons</button>
        <button className={`nav-btn ${learnTab === 'problems' ? 'active' : ''}`} onClick={() => setLearnTab(learnTab === 'problems' ? 'none' : 'problems')}>Practice Problems</button>
        <button className={`nav-btn ${learnTab === 'quizzes' ? 'active' : ''}`} onClick={() => setLearnTab(learnTab === 'quizzes' ? 'none' : 'quizzes')}>Quizzes</button>
        <span className="field-label" style={{ marginLeft: 'auto' }}>
          {isProblem ? 'Problem active — use “Check solution”' : 'Examples: run to see output'}
        </span>
      </div>

      <NetworkErrorBanner message={networkError} />

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="field">
            Language
            <select
              value={language}
              onChange={(e) => {
                const lang = e.target.value;
                setSettings((s) => ({ ...s, language: lang }));
                setProject((p) => {
                  const single = p.files.length === 1;
                  const rename = single || p.active.startsWith('main.');
                  const newActive = lang === 'c' ? 'main.c' : 'main.cpp';
                  return {
                    ...p,
                    files: p.files.map((f) =>
                      f.name === p.active && rename
                        ? { ...f, language: lang, name: newActive }
                        : f
                    ),
                    active: rename ? newActive : p.active,
                  };
                });
                setRunError(null);
                setCheckResult(null);
                setOutput('');
                setStatus('idle');
              }}
              disabled={isRunning || isProblem}
            >
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </label>
          {language === 'cpp' && (
            <label className="field">
              Standard
              <select
                value={settings.standard || 'c++17'}
                onChange={(e) => setSettings((s) => ({ ...s, standard: e.target.value }))}
                disabled={isRunning}
              >
                {CPP_STANDARDS.map((s) => (
                  <option key={s} value={s}>{s.replace('c++', 'C++')}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="toolbar-group live-actions">
          {isProblem ? (
            <button className="btn btn-run" onClick={runCheck} disabled={isRunning || checking}>
              {checking ? 'Checking…' : 'Check solution'}
            </button>
          ) : (
            <>
              <button className="btn btn-run" onClick={() => handleRun()} disabled={isRunning}>
                {isRunning ? 'Running…' : '▶ Run'}
              </button>
              <button className="btn btn-stop" onClick={stopRun} disabled={!isRunning}>■ Stop</button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setConsoleLog((p) => [...p, { type: 'out', text: '\n[Debug mode is unavailable in the in-browser compiler]\n' }]);
                  openConsole();
                  setStatus('success');
                }}
                title="The browser-only compiler cannot run a full GDB debugger"
              >
                Debug
              </button>
            </>
          )}
        </div>

        <div className="toolbar-group right-actions">
          <button className="btn btn-ghost" onClick={() => openConsole()}>Console</button>
          <button className="btn btn-ghost" onClick={() => { setImgCode(code); setShowCodeImage(true); }}>◫ Picture</button>

          <div className="dropdown" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost dropdown-toggle" onClick={() => { setShareOpen((o) => !o); setFileMenuOpen(false); }}>Share ▾</button>
            {shareOpen && (
              <div className="dropdown-menu" role="menu">
                <button className="dropdown-item" role="menuitem" onClick={shareCode}><span className="dropdown-ic">↗</span> Copy share link</button>
                <button className="dropdown-item" role="menuitem" onClick={() => { copyCode(); setShareOpen(false); }}><span className="dropdown-ic">⧉</span> Copy code</button>
                <button className="dropdown-item" role="menuitem" onClick={() => { saveCurrentProgram(); setShareOpen(false); }}><span className="dropdown-ic">+</span> Save current</button>
                {savedPrograms.length > 0 && (
                  <>
                    <div className="dropdown-divider" />
                    {savedPrograms.map((s) => (
                      <div key={s.name} className="dropdown-item-row">
                        <button className="dropdown-item" role="menuitem" onClick={() => { openProgram(s); setShareOpen(false); }}><span className="dropdown-ic">◀︎</span> {s.name}</button>
                        <button className="dropdown-del" onClick={() => deleteProgram(s.name)} title="Delete">✕</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="dropdown" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost dropdown-toggle" onClick={() => { setFileMenuOpen((o) => !o); setShareOpen(false); }}>⬇ Save ▾</button>
            {fileMenuOpen && (
              <div className="dropdown-menu" role="menu">
                <button className="dropdown-item" role="menuitem" onClick={() => { downloadCode(); setFileMenuOpen(false); }}><span className="dropdown-ic">≡</span> Download .{ext}</button>
                <button className="dropdown-item" role="menuitem" onClick={() => { downloadPicture(); setFileMenuOpen(false); }}><span className="dropdown-ic">◫</span> Picture (PNG)</button>
                <button className="dropdown-item" role="menuitem" onClick={() => { copyCode(); setFileMenuOpen(false); }}><span className="dropdown-ic">⧉</span> Copy code</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workspace: explorer | editor | terminal */}
      <div className="workspace">
        {showExplorer && (
          <aside className="sidebar" style={{ width: 240 }}>
            <FileExplorer
              files={project.files}
              activeFile={project.active}
              onSelect={selectFile}
              onRename={renameFile}
              onCreate={createFile}
              onDelete={deleteFile}
              onDownload={downloadFile}
              onUpload={uploadFile}
            />
          </aside>
        )}

        <main className="main">
          <section className="pane editor-pane" ref={editorRef}>
            <div className="pane-tabs">
              {project.files.map((f) => (
                <button
                  key={f.name}
                  className={`file-tab ${f.name === project.active ? 'active' : ''} ${!f.saved ? 'unsaved' : ''}`}
                  onClick={() => selectFile(f.name)}
                >
                  {f.name}
                </button>
              ))}
              <span className="pane-tab-space" />
              <button className="icon-btn" title="New file" onClick={() => createFile('untitled.cpp')}>＋</button>
            </div>
            <CodeMirror
              value={code}
              height="100%"
              style={{ fontSize: `${settings.fontSize}px` }}
              onChange={(v) => setActiveFileCode(v)}
              onUpdate={(vu) => {
                if (vu.view) editorViewRef.current = vu.view;
                if (vu.selectionSet && vu.state.selection.main.head != null) {
                  const pos = vu.state.selection.main.head;
                  const line = vu.state.doc.lineAt(pos);
                  setCursor({ line: line.number, col: pos - line.from + 1 });
                }
              }}
              extensions={cmExtensions}
              theme={editorTheme}
              basicSetup={{
                highlightActiveLine: true,
                lineNumbers: false,
                foldGutter: false,
                autocompletion: false,
                bracketMatching: false,
                indentOnInput: true,
              }}
            />
            <div className="live-bar">
              <span className="live-dot">
                {status === 'running' ? '🟡 Running…' : status === 'success' ? '✓ Finished' : status === 'failed' ? '✗ Error' : `In-browser compiler · ${interactiveOk ? 'live input' : 'batch input'}`}
              </span>
              <span className="cursor-pos">Ln {cursor.line}, Col {cursor.col}</span>
              <span className="cursor-pos">{code.length} chars</span>
            </div>
          </section>
        </main>
      </div>

      {/* Docked terminal */}
      {showConsole && (
        <Terminal
          mode={interactiveOk ? 'interactive' : 'batch'}
          status={status}
          consoleLog={consoleLog}
          awaitingInput={awaitingInput}
          liveInput={liveInput}
          onLiveInputChange={setLiveInput}
          onSubmitInput={submitLiveInput}
          onStop={stopRun}
          isRunning={isRunning}
          batchInput={input}
          onBatchInputChange={setInput}
          onBatchRun={() => handleRun()}
          output={output}
          runError={runError}
          sourceLines={code.split('\n')}
          checkResult={checkResult}
          onJumpToError={jumpToError}
          terminalFontSize={settings.terminalFontSize}
          terminalFontWeight={settings.terminalFontWeight}
          interactiveOk={interactiveOk}
          runInfo={runInfo}
          showConsole={showConsole}
          terminalTab={terminalTab}
          setTerminalTab={setTerminalTab}
          onOpen={openConsole}
          onClose={() => setShowConsole(false)}
          onClear={clearConsole}
          isProblem={isProblem}
          isMobile={isMobile}
        />
      )}

      {clipNotice && <div className="toast">{clipNotice}</div>}
      {settingsOpen && (
        <SettingsPanel settings={settings} setSettings={setSettings} onClose={() => setSettingsOpen(false)} />
      )}

      {learnTab === 'lessons' && (
        <div className="learn-overlay" onClick={() => setLearnTab('none')}>
          <div onClick={(e) => e.stopPropagation()}>
            <LessonsPanel lessons={LESSONS.filter((l) => l.language === language)} onLoadCode={loadLesson} onExit={() => setLearnTab('none')} />
          </div>
        </div>
      )}
      {learnTab === 'problems' && (
        <div className="learn-overlay" onClick={() => setLearnTab('none')}>
          <div onClick={(e) => e.stopPropagation()}>
            <ProblemsPanel problems={PROBLEMS} activeProblem={activeProblem} onSelect={selectProblem} onCheck={runCheck} checking={checking} onExit={() => setLearnTab('none')} />
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
