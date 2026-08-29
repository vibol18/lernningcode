import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

const KEYWORDS = [
  'auto', 'break', 'case', 'class', 'const', 'continue', 'default', 'delete',
  'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'friend', 'goto',
  'if', 'inline', 'int', 'long', 'namespace', 'new', 'operator', 'private',
  'protected', 'public', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'template', 'throw', 'true', 'false', 'try', 'typedef',
  'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile',
  'while', 'nullptr',
];

const TYPES = [
  'string', 'vector', 'map', 'set', 'queue', 'stack', 'list', 'deque',
  'pair', 'unordered_map', 'unordered_set', 'array', 'ostream', 'istream',
  'ifstream', 'ofstream', 'stringstream',
];

const STDLIB = [
  'cout', 'cin', 'endl', 'cerr', 'clog', 'printf', 'scanf', 'fprintf',
  'fscanf', 'sprintf', 'getline', 'NULL', 'std', 'main', 'abs', 'sqrt',
  'pow', 'floor', 'ceil', 'round', 'max', 'min', 'swap', 'sort', 'find',
  'atoi', 'atof', 'tolower', 'toupper',
];

const HEADERS = [
  'iostream', 'vector', 'string', 'map', 'algorithm', 'cstdio', 'cmath',
  'sstream', 'fstream', 'list', 'set', 'queue', 'stack', 'deque',
  'functional', 'cstring', 'cstdlib', 'cctype', 'ctime', 'array',
  'utility', 'unordered_map', 'unordered_set', 'bits/stdc++.h',
];

const DOT_MEMBERS = [
  'push_back', 'pop_back', 'size', 'empty', 'begin', 'end', 'front', 'back',
  'at', 'clear', 'insert', 'erase', 'resize', 'append', 'substr', 'length',
  'find', 'c_str', 'capacity', 'sort',
];

const KEYWORD_SET = new Set([...KEYWORDS, ...TYPES, ...STDLIB]);

function declaredVariables(doc) {
  const found = new Set();
  const re1 =
    /\b(?:int|long|short|double|float|char|bool|string|auto|unsigned|signed)\s+([A-Za-z_]\w*)/g;
  const re2 = /\b([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:[;=])/g;
  let m;
  while ((m = re1.exec(doc)) && found.size < 50) found.add(m[1]);
  while ((m = re2.exec(doc)) && found.size < 50) {
    if (!KEYWORD_SET.has(m[1]) && !KEYWORD_SET.has(m[2])) found.add(m[2]);
  }
  return [...found];
}

function buildOptions(doc) {
  const options = [];
  const prefix = new Set();
  const push = (label, type, detail, boost = 0) => {
    if (prefix.has(label)) return;
    prefix.add(label);
    options.push({ label, type, detail, boost });
  };
  declaredVariables(doc).forEach((v) => push(v, 'variable', 'variable', 30));
  STDLIB.forEach((s) => push(s, 'constant', 'std', 8));
  TYPES.forEach((t) => push(t, 'class', 'type', 6));
  KEYWORDS.forEach((k) => push(k, 'keyword', 'keyword', 5));
  return options;
}

function completer(context) {
  const doc = context.state.doc.toString();

  const inc = context.matchBefore(/#include\s*<[A-Za-z]*$/);
  if (inc) {
    return {
      from: inc.from + inc.text.lastIndexOf('<') + 1,
      options: HEADERS.filter((h) =>
        h.startsWith(inc.text.slice(inc.text.lastIndexOf('<') + 1))
      ).map((h) => ({ label: h, type: 'type', detail: 'header' })),
    };
  }

  const scoped = context.matchBefore(/std::\w*$/);
  if (scoped && scoped.text.length > 4) {
    const prefix = scoped.text.slice(4);
    return {
      from: scoped.from + 4,
      options: [...STDLIB, ...TYPES]
        .filter((s) => s.startsWith(prefix))
        .map((s) => ({ label: s, type: 'constant', detail: 'std::' })),
    };
  }

  const dot = context.matchBefore(/\.\w{0,6}$/);
  if (dot && dot.text.length > 1) {
    const prefix = dot.text.slice(1);
    return {
      from: dot.from + 1,
      options: DOT_MEMBERS.filter((s) => s.startsWith(prefix)).map((s) => ({
        label: s,
        type: 'method',
        detail: 'member',
      })),
    };
  }

  const word = context.matchBefore(/\w{1,6}$/);
  if (!word) return null;
  const options = buildOptions(doc).filter((o) => o.label.startsWith(word.text));
  return { from: word.from, options, validFor: /^\w*$/ };
}

export function cppAutocomplete() {
  return [autocompletion({ override: [completer] }), keymap.of(completionKeymap)];
}