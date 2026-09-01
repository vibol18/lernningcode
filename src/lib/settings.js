/**
 * Central place for user-editable IDE settings. Persisted to localStorage so
 * they survive reloads. Split into editor, terminal, and general buckets so
 * individual fields can be updated without touching the rest.
 */

const KEY = 'ccpp.settings.v1';

export const DEFAULT_SETTINGS = {
  // Editor
  theme: 'dark',
  fontSize: 15,
  tabSize: 4,
  wordWrap: false,
  autocomplete: true,
  lineNumbers: true,
  // Terminal
  terminalTheme: 'dark',
  terminalFontSize: 14,
  terminalFontWeight: 400,
  // General
  language: 'cpp',
  // Panel visibility
  showExplorer: typeof window !== 'undefined' && window.innerWidth > 900,
  showConsole: false,
};

function merge(base, incoming) {
  const out = { ...base };
  for (const k of Object.keys(incoming || {})) {
    if (k in base) out[k] = incoming[k];
  }
  return out;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return merge(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}
