import { useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { toPng } from 'html-to-image';
import { StreamLanguage } from '@codemirror/language';

import { cpp } from '@codemirror/lang-cpp';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { php } from '@codemirror/lang-php';
import { yaml } from '@codemirror/lang-yaml';
import { xml } from '@codemirror/lang-xml';
import { sass } from '@codemirror/lang-sass';
import { vue } from '@codemirror/lang-vue';
import { less } from '@codemirror/lang-less';

import { shell } from '@codemirror/legacy-modes/mode/shell';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { haskell } from '@codemirror/legacy-modes/mode/haskell';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { perl } from '@codemirror/legacy-modes/mode/perl';
import { r } from '@codemirror/legacy-modes/mode/r';
import { protobuf } from '@codemirror/legacy-modes/mode/protobuf';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { nginx } from '@codemirror/legacy-modes/mode/nginx';
import { properties } from '@codemirror/legacy-modes/mode/properties';

import { oneDark } from '@codemirror/theme-one-dark';
import { githubLight } from '@uiw/codemirror-theme-github';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { okaidia } from '@uiw/codemirror-theme-okaidia';
import { sublime } from '@uiw/codemirror-theme-sublime';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';

const LANGUAGES = [
  { id: 'cpp', label: 'C / C++', ext: 'cpp', support: cpp() },
  { id: 'javascript', label: 'JavaScript', ext: 'js', support: javascript() },
  { id: 'python', label: 'Python', ext: 'py', support: python() },
  { id: 'html', label: 'HTML', ext: 'html', support: html() },
  { id: 'css', label: 'CSS', ext: 'css', support: css() },
  { id: 'json', label: 'JSON', ext: 'json', support: json() },
  { id: 'java', label: 'Java', ext: 'java', support: java() },
  { id: 'rust', label: 'Rust', ext: 'rs', support: rust() },
  { id: 'go', label: 'Go', ext: 'go', support: go() },
  { id: 'sql', label: 'SQL', ext: 'sql', support: sql() },
  { id: 'php', label: 'PHP', ext: 'php', support: php() },
  { id: 'yaml', label: 'YAML', ext: 'yml', support: yaml() },
  { id: 'markdown', label: 'Markdown', ext: 'md', support: markdown() },
  { id: 'xml', label: 'XML', ext: 'xml', support: xml() },
  { id: 'vue', label: 'Vue', ext: 'vue', support: vue() },
  { id: 'sass', label: 'Sass', ext: 'scss', support: sass() },
  { id: 'less', label: 'Less', ext: 'less', support: less() },
  { id: 'shell', label: 'Shell', ext: 'sh', support: StreamLanguage.define(shell) },
  { id: 'ruby', label: 'Ruby', ext: 'rb', support: StreamLanguage.define(ruby) },
  { id: 'haskell', label: 'Haskell', ext: 'hs', support: StreamLanguage.define(haskell) },
  { id: 'swift', label: 'Swift', ext: 'swift', support: StreamLanguage.define(swift) },
  { id: 'lua', label: 'Lua', ext: 'lua', support: StreamLanguage.define(lua) },
  { id: 'perl', label: 'Perl', ext: 'pl', support: StreamLanguage.define(perl) },
  { id: 'r', label: 'R', ext: 'r', support: StreamLanguage.define(r) },
  { id: 'protobuf', label: 'Protobuf', ext: 'proto', support: StreamLanguage.define(protobuf) },
  { id: 'toml', label: 'TOML', ext: 'toml', support: StreamLanguage.define(toml) },
  { id: 'nginx', label: 'Nginx', ext: 'conf', support: StreamLanguage.define(nginx) },
  { id: 'properties', label: 'Properties', ext: 'properties', support: StreamLanguage.define(properties) },
];

const THEMES = [
  { id: 'oneDark', label: 'One Dark', theme: oneDark, dark: true, bg: '#282c34', windowBg: '#21252b' },
  { id: 'githubLight', label: 'GitHub Light', theme: githubLight, dark: false, bg: '#ffffff', windowBg: '#f6f8fa' },
  { id: 'vscodeDark', label: 'VS Code Dark', theme: vscodeDark, dark: true, bg: '#1e1e1e', windowBg: '#1e1e1e' },
  { id: 'okaidia', label: 'Okaidia', theme: okaidia, dark: true, bg: '#272822', windowBg: '#272822' },
  { id: 'sublime', label: 'Sublime', theme: sublime, dark: true, bg: '#170c0a', windowBg: '#170c0a' },
  { id: 'tokyoNight', label: 'Tokyo Night', theme: tokyoNight, dark: true, bg: '#1a1b26', windowBg: '#16161e' },
];

const SAMPLE_CODE = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, world!" << endl;\n    return 0;\n}`,
  javascript: `const greet = (name) => {\n  return \`Hello, \${name}!\`;\n};\n\nconsole.log(greet("World"));`,
  python: `def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint(fib(10))`,
  html: `<!doctype html>\n<html>\n  <head>\n    <title>Hello</title>\n  </head>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>`,
  css: `.btn {\n  padding: 12px 24px;\n  border-radius: 8px;\n  background: #61dafb;\n  color: #fff;\n}`,
  json: `{\n  "name": "code-pics",\n  "version": "1.0.0",\n  "features": ["4k", "all-languages"]\n}`,
};

const initialLangId = (lang) => (LANGUAGES.some((l) => l.id === lang) ? lang : 'cpp');

export default function CodeToImage({ onExit, initialCode, initialLanguage, initialFileName }) {
  const [languageId, setLanguageId] = useState(() => initialLangId(initialLanguage));
  const [code, setCode] = useState(() => initialCode || SAMPLE_CODE.cpp);
  const [fileName, setFileName] = useState(() => initialFileName || 'file.cpp');
  const [themeId, setThemeId] = useState('oneDark');
  const [padding, setPadding] = useState(48);
  const [width, setWidth] = useState(1920);
  const [downloading, setDownloading] = useState(false);
  const [note, setNote] = useState(null);
  const previewRef = useRef(null);

  const lang = useMemo(() => LANGUAGES.find((l) => l.id === languageId) || LANGUAGES[0], [languageId]);
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) || THEMES[0], [themeId]);

  const changeLanguage = (id) => {
    setLanguageId(id);
    const l = LANGUAGES.find((x) => x.id === id);
    if (l) {
      setFileName(`file.${l.ext}`);
      setCode((prev) => SAMPLE_CODE[id] || prev);
    }
  };

  const exportImage = async () => {
    const node = previewRef.current;
    if (!node) return;
    setDownloading(true);
    try {
      const srcW = node.offsetWidth || 1;
      const pixelRatio = Math.max(1, Math.round((width / srcW) * 10) / 10);
      const dataUrl = await toPng(node, {
        pixelRatio,
        backgroundColor: theme.bg,
        cacheBust: true,
      });
      const a = document.createElement('a');
      const name = (fileName || `code-${lang.ext}`).replace(/[^\w.-]/g, '_');
      a.href = dataUrl;
      a.download = `${name}-${width >= 3840 ? '4k' : `w${width}`}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setNote('Image exported successfully');
      setTimeout(() => setNote(null), 2000);
    } catch (e) {
      console.error(e);
      setNote('Export failed — please try again');
      setTimeout(() => setNote(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const cardStyle = {
    background: theme.bg,
    borderRadius: 16,
    padding: `${padding}px`,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    width: `${width}px`,
    maxWidth: '100%',
    boxSizing: 'border-box',
  };

  const editorStyle = {
    background: theme.dark ? '#1e1e1e' : '#ffffff',
    color: theme.dark ? '#d4d4d4' : '#24292e',
    borderRadius: 0,
    overflow: 'hidden',
  };

  return (
    <div className="cti-page">
      <div className="cti-toolbar">
        <div className="cti-toolbar-left">
          <button className="btn btn-ghost" onClick={onExit}>← Back to Editor</button>
          <span className="cti-title">Code → Picture</span>
        </div>
        <div className="cti-controls">
          <label className="cti-field">
            Language
            <select value={languageId} onChange={(e) => changeLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </label>
          <label className="cti-field">
            Theme
            <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="cti-field">
            Width
            <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
              <option value={1280}>1280 · HD</option>
              <option value={1920}>1920 · Full HD</option>
              <option value={2560}>2560 · QHD</option>
              <option value={3840}>3840 · 4K</option>
            </select>
          </label>
          <button className="btn btn-primary" onClick={exportImage} disabled={downloading}>
            {downloading ? 'Exporting…' : '⬇ Export PNG'}
          </button>
        </div>
      </div>
      {note && <div className="cti-note">{note}</div>}
      <div className="cti-workspace">
        <div className="cti-preview-scroll">
          <div className="cti-preview" ref={previewRef} style={cardStyle}>
            <div className="cti-window">
              <div className="cti-winbar">
                <span className="cti-dot" style={{ background: '#ff5f56' }} />
                <span className="cti-dot" style={{ background: '#ffbd2e' }} />
                <span className="cti-dot" style={{ background: '#27c93f' }} />
                <span className="cti-filename">{fileName || `code.${lang.ext}`}</span>
              </div>
              <div style={editorStyle}>
                <CodeMirror
                  value={code}
                  height="auto"
                  style={{ fontSize: '15px', background: 'transparent' }}
                  onChange={(v) => setCode(v)}
                  extensions={[lang.support]}
                  theme={theme.theme}
                  basicSetup={{ highlightActiveLine: false, foldGutter: false, lineNumbers: true }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="cti-sidebar">
          <label className="cti-field">
            File name
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </label>
          <label className="cti-field">
            Padding · {padding}px
            <input type="range" min="16" max="120" value={padding} onChange={(e) => setPadding(Number(e.target.value))} />
          </label>
        </div>
      </div>
    </div>
  );
}
