/**
 * A small syntax highlighter for the code block: the source split into
 * tokens, each with the kind of syntax it is (or none). It is a scanner, not
 * a parser — enough to tell keywords, strings and comments apart when a
 * reviewer reads a snippet, for the languages a design page usually quotes.
 */

export type TokenKind =
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'function'
  | 'tag'
  | 'attr'
  | 'property'
  | 'punct';

/** A run of the source; the tokens of a source join back into it. */
export type Token = { readonly kind: TokenKind | null; readonly text: string };

export type Grammar = 'js' | 'html' | 'css' | 'json' | 'sh';

type Rule = {
  readonly kind: TokenKind | null;
  /** Sticky (`y`), so it matches at the scan position only. */
  readonly pattern: RegExp;
  /** The mode the scan continues in after this rule matched. */
  readonly next?: string;
};

type Modes = { readonly start: string; readonly rules: Readonly<Record<string, readonly Rule[]>> };

const rule = (kind: TokenKind | null, pattern: RegExp, next?: string): Rule =>
  next === undefined ? { kind, pattern } : { kind, pattern, next };

const SPACE = rule(null, /\s+/y);
const QUOTED = rule('string', /"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?/y);
const BLOCK_COMMENT = rule('comment', /\/\*[\s\S]*?(?:\*\/|$)/y);

const JS_KEYWORDS = [
  'abstract',
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'keyof',
  'let',
  'new',
  'null',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'satisfies',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
];

const GRAMMARS: Readonly<Record<Grammar, Modes>> = {
  js: {
    start: 'code',
    rules: {
      code: [
        SPACE,
        rule('comment', /\/\/[^\n]*/y),
        BLOCK_COMMENT,
        rule('string', /`(?:\\[\s\S]|[^\\`])*`?/y),
        QUOTED,
        rule('number', /(?:0[xob][\da-f_]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)n?/iy),
        rule('keyword', new RegExp(`(?:${JS_KEYWORDS.join('|')})(?![\\w$])`, 'y')),
        rule('function', /[A-Za-z_$][\w$]*(?=\s*\()/y),
        rule(null, /[A-Za-z_$][\w$]*/y),
      ],
    },
  },
  html: {
    start: 'text',
    rules: {
      text: [
        rule('comment', /<!--[\s\S]*?(?:-->|$)/y),
        rule('keyword', /&#?\w+;/y),
        rule('tag', /<\/?[A-Za-z][\w:.-]*/y, 'tag'),
        rule(null, /[^<&]+/y),
      ],
      tag: [
        SPACE,
        rule('tag', /\/?>/y, 'text'),
        rule('punct', /=/y),
        rule('string', /"[^"]*"?|'[^']*'?/y),
        rule('attr', /[^\s=>/"']+/y),
      ],
    },
  },
  css: {
    start: 'sheet',
    rules: {
      sheet: [
        SPACE,
        BLOCK_COMMENT,
        QUOTED,
        rule('keyword', /@[\w-]+/y),
        rule('punct', /[{}]/y),
        rule('tag', /[^{};]+(?=\{)/y),
        rule('property', /-{0,2}[A-Za-z][\w-]*(?=\s*:)/y),
        rule('number', /#[\da-f]{3,8}(?![\w-])/iy),
        rule(null, /-?[A-Za-z_][\w-]*/y),
        rule('number', /-?(?:\d*\.)?\d+[a-z%]*/iy),
      ],
    },
  },
  json: {
    start: 'value',
    rules: {
      value: [
        SPACE,
        rule('comment', /\/\/[^\n]*/y),
        BLOCK_COMMENT,
        rule('property', /"(?:\\.|[^\\"\n])*"(?=\s*:)/y),
        rule('string', /"(?:\\.|[^\\"\n])*"?/y),
        rule('number', /-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/iy),
        rule('keyword', /(?:true|false|null)(?!\w)/y),
      ],
    },
  },
  sh: {
    start: 'line',
    rules: {
      line: [
        SPACE,
        rule('comment', /(?<!\S)#[^\n]*/y),
        QUOTED,
        rule('keyword', /\$\{[^}\n]*\}?|\$\w+/y),
        rule('attr', /(?<!\S)--?[\w-]+/y),
        rule(null, /[^\s"'$#]+/y),
      ],
    },
  },
};

const ALIASES: Readonly<Record<string, Grammar>> = {
  js: 'js',
  javascript: 'js',
  jsx: 'js',
  mjs: 'js',
  cjs: 'js',
  ts: 'js',
  typescript: 'js',
  tsx: 'js',
  mts: 'js',
  html: 'html',
  xml: 'html',
  svg: 'html',
  vue: 'html',
  css: 'css',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  sh: 'sh',
  bash: 'sh',
  zsh: 'sh',
  shell: 'sh',
  console: 'sh',
};

/** The grammar for a `language` attribute value, or `null` when there is none. */
export const languageOf = (language: string | null): Grammar | null =>
  language === null ? null : (ALIASES[language.trim().toLowerCase()] ?? null);

const push = (tokens: Token[], kind: TokenKind | null, text: string): void => {
  const last = tokens.at(-1);
  if (kind === null && last !== undefined && last.kind === null)
    tokens[tokens.length - 1] = { kind, text: last.text + text };
  else tokens.push({ kind, text });
};

/** Splits the source into tokens; a language without a grammar gives one plain token. */
export const highlight = (source: string, language: string | null): readonly Token[] => {
  const grammar = languageOf(language);
  if (grammar === null) return source === '' ? [] : [{ kind: null, text: source }];
  const { start, rules } = GRAMMARS[grammar];
  const tokens: Token[] = [];
  let mode = start;
  let index = 0;
  while (index < source.length) {
    const matched = (rules[mode] ?? []).find((candidate) => {
      candidate.pattern.lastIndex = index;
      return candidate.pattern.test(source) && candidate.pattern.lastIndex > index;
    });
    if (matched === undefined) {
      push(tokens, null, source.charAt(index));
      index += 1;
      continue;
    }
    push(tokens, matched.kind, source.slice(index, matched.pattern.lastIndex));
    index = matched.pattern.lastIndex;
    mode = matched.next ?? mode;
  }
  return tokens;
};
