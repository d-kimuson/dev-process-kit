import { describe, expect, it } from 'vitest';

import { highlight, languageOf, type Token } from './highlight';

/** The tokens that carry a kind, as `kind:text`, for compact assertions. */
const marked = (tokens: readonly Token[]): string[] =>
  tokens.flatMap((token) => (token.kind === null ? [] : [`${token.kind}:${token.text}`]));

const joined = (tokens: readonly Token[]): string => tokens.map((token) => token.text).join('');

describe('languageOf', () => {
  it('maps the common names and extensions onto a grammar', () => {
    expect(languageOf('ts')).toBe('js');
    expect(languageOf('TypeScript')).toBe('js');
    expect(languageOf('svg')).toBe('html');
    expect(languageOf('jsonc')).toBe('json');
    expect(languageOf('bash')).toBe('sh');
    expect(languageOf('css')).toBe('css');
  });

  it('has no grammar for an unknown or missing language', () => {
    expect(languageOf('cobol')).toBeNull();
    expect(languageOf(null)).toBeNull();
  });
});

describe('highlight', () => {
  it('keeps every character of the source, in order', () => {
    const source = 'const a = `x${1}`; // done\n<p class="x">&amp;</p>';
    for (const language of ['ts', 'html', 'css', 'json', 'sh', 'cobol', null]) {
      expect(joined(highlight(source, language))).toBe(source);
    }
  });

  it('leaves text without a grammar as one plain token', () => {
    expect(highlight('a < b', 'cobol')).toEqual([{ kind: null, text: 'a < b' }]);
  });

  it('marks the keywords, strings, numbers, comments and calls of a script', () => {
    expect(marked(highlight("export const total = sum(1.5, 'a'); // why", 'ts'))).toEqual([
      'keyword:export',
      'keyword:const',
      'function:sum',
      'number:1.5',
      "string:'a'",
      'comment:// why',
    ]);
  });

  it('does not mark a keyword inside a longer name', () => {
    expect(marked(highlight('constant newer', 'js'))).toEqual([]);
  });

  it('reads a template literal and a block comment as one token each', () => {
    expect(marked(highlight('/* a\nb */ `x ${y}`', 'js'))).toEqual(['comment:/* a\nb */', 'string:`x ${y}`']);
  });

  it('marks the tags, attributes and values of markup', () => {
    expect(marked(highlight('<a href="/x" hidden>go &amp; see</a><!-- c -->', 'html'))).toEqual([
      'tag:<a',
      'attr:href',
      'punct:=',
      'string:"/x"',
      'attr:hidden',
      'tag:>',
      'keyword:&amp;',
      'tag:</a',
      'tag:>',
      'comment:<!-- c -->',
    ]);
  });

  it('reads the text between tags as plain text', () => {
    expect(marked(highlight('<b>class="x"</b>', 'html'))).toEqual(['tag:<b', 'tag:>', 'tag:</b', 'tag:>']);
  });

  it('tells the selectors of a stylesheet from its declarations', () => {
    expect(marked(highlight('@media print { .a:hover { color: #fff; margin: -2px; } }', 'css'))).toEqual([
      'keyword:@media',
      'tag:print ',
      'punct:{',
      'tag:.a:hover ',
      'punct:{',
      'property:color',
      'number:#fff',
      'property:margin',
      'number:-2px',
      'punct:}',
      'punct:}',
    ]);
  });

  it('tells the keys of a JSON document from its values', () => {
    expect(marked(highlight('{"a": "b", "n": -1, "ok": true}', 'json'))).toEqual([
      'property:"a"',
      'string:"b"',
      'property:"n"',
      'number:-1',
      'property:"ok"',
      'keyword:true',
    ]);
  });

  it('marks the comments, strings, variables and flags of a shell command', () => {
    expect(marked(highlight('pnpm add -D "x" $HOME # note\necho a#b', 'sh'))).toEqual([
      'attr:-D',
      'string:"x"',
      'keyword:$HOME',
      'comment:# note',
    ]);
  });

  it('closes an unterminated string or comment at the end of the source', () => {
    expect(marked(highlight("'open", 'js'))).toEqual(["string:'open"]);
    expect(marked(highlight('<!-- open', 'html'))).toEqual(['comment:<!-- open']);
  });
});
