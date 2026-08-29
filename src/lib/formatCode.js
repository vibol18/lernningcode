function maskLiterals(src) {
  let res = '';
  let i = 0;
  const n = src.length;
  let inString = false;
  let inChar = false;
  let lineComment = false;
  let blockComment = false;
  while (i < n) {
    const c = src[i];
    const nx = src[i + 1];
    if (lineComment) {
      if (c === '\n') {
        lineComment = false;
        res += c;
      } else {
        res += ' ';
      }
      i++;
      continue;
    }
    if (blockComment) {
      if (c === '*' && nx === '/') {
        res += '  ';
        i += 2;
        blockComment = false;
      } else {
        res += c === '\n' ? c : ' ';
        i++;
      }
      continue;
    }
    if (c === '"' && !inChar) {
      inString = !inString;
      res += c;
      i++;
      continue;
    }
    if (c === "'" && !inString) {
      inChar = !inChar;
      res += c;
      i++;
      continue;
    }
    if (inString || inChar) {
      if (c === '\\' && i + 1 < n) {
        res += '  ';
        i += 2;
      } else {
        res += c === '\n' ? c : ' ';
        i++;
      }
      continue;
    }
    if (c === '/' && nx === '/') {
      lineComment = true;
      res += '  ';
      i += 2;
      continue;
    }
    if (c === '/' && nx === '*') {
      blockComment = true;
      res += '  ';
      i += 2;
      continue;
    }
    res += c;
    i++;
  }
  return res;
}

export function formatCode(src) {
  if (typeof src !== 'string') return src;
  const masked = maskLiterals(src);
  const origLines = src.split('\n');
  const maskLines = masked.split('\n');
  let depth = 0;
  const out = [];
  for (let li = 0; li < origLines.length; li++) {
    const ori = (origLines[li] ?? '').replace(/\s+$/, '');
    const m = (maskLines[li] ?? '').trim();
    if (m === '') {
      out.push('');
      continue;
    }
    let outDepth = depth;
    if (m.startsWith('}')) outDepth = Math.max(depth - 1, 0);
    if (m.startsWith('#')) outDepth = 0;
    out.push('  '.repeat(outDepth) + ori.replace(/^\s+/, ''));
    let d = depth;
    for (const ch of m) {
      if (ch === '{') d++;
      else if (ch === '}') d = Math.max(d - 1, 0);
    }
    depth = d;
  }
  return out.join('\n');
}