const KEYS = {
  programs: 'ccpp.programs.v1',
  theme: 'ccpp.theme.v1',
  fontSize: 'ccpp.fontsize.v1',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function loadPrograms() {
  const list = read(KEYS.programs, []);
  return Array.isArray(list) ? list : [];
}

export function savePrograms(programs) {
  write(KEYS.programs, programs);
}

export function loadTheme() {
  const t = read(KEYS.theme, 'dark');
  return t === 'light' ? 'light' : 'dark';
}

export function saveTheme(theme) {
  write(KEYS.theme, theme);
}

export function loadFontSize() {
  const f = read(KEYS.fontSize, null);
  if (f && typeof f === 'number' && f >= 12 && f <= 24) return f;
  return null;
}

export function saveFontSize(size) {
  write(KEYS.fontSize, size);
}
