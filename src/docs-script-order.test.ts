// @vitest-environment node
import { Window } from 'happy-dom';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `docs/index.md` prescribes the authoring contract: the base data is the first
 * `<script type="application/json">` child of a content element, and the `data-dpk-grill` /
 * `data-dpk-changes` option blocks come after it. An element reads its first JSON child as its
 * base data: the current sources skip the two option blocks, but released bundles up to `0.2.1`
 * (what `lp/kit.js` loads from npm outside `pnpm dev`) read a component's first JSON child as its
 * base data, so an example that writes an option block first teaches an order that breaks a page
 * read by one of those versions (`Invalid key: Expected "states" but received undefined`).
 *
 * This test scans every ```html example under `docs/` (and `README.md`) and fails on an option
 * block that comes before its base data, so the docs cannot regress the way they did when the
 * Questions example put `data-dpk-grill` first.
 */

/** `docs/tmp` is a gitignored scratch area (articles, their `node_modules`); not shipped docs. */
const IGNORED_DIRECTORIES = new Set(['tmp', 'node_modules']);

const markdownUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return IGNORED_DIRECTORIES.has(entry.name) ? [] : markdownUnder(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });

const DOC_FILES: readonly string[] = ['README.md', ...markdownUnder('docs')];

const OPTION_ATTRIBUTES = ['data-dpk-grill', 'data-dpk-changes'] as const;

const isOptionBlock = (script: Element): boolean =>
  OPTION_ATTRIBUTES.some((attribute) => script.hasAttribute(attribute));

/** The JSON scripts that are direct children of `host`, in document order. */
const jsonChildrenOf = (host: Element): Element[] =>
  [...host.children].filter(
    (child): child is Element => child.localName === 'script' && child.getAttribute('type') === 'application/json',
  );

const htmlExamples = (markdown: string): readonly string[] =>
  [...markdown.matchAll(/```html\n([\s\S]*?)\n```/g)].map((match) => match[1] ?? '');

/** One message per HTML example whose option block precedes the base data it belongs with. */
const orderProblems = (markdown: string): readonly string[] => {
  const problems: string[] = [];
  htmlExamples(markdown).forEach((html, index) => {
    const { document } = new Window();
    document.body.innerHTML = html;
    const body = document.body as unknown as Element;
    for (const host of [body, ...body.querySelectorAll('*')]) {
      const scripts = jsonChildrenOf(host);
      const firstOption = scripts.findIndex(isOptionBlock);
      if (firstOption === -1) continue;
      const firstBase = scripts.findIndex((script) => !isOptionBlock(script));
      const where = `HTML example ${index + 1}, <${host.localName}>`;
      if (firstBase === -1) problems.push(`${where}: has a data-dpk-* block but no base data script`);
      else if (firstBase > firstOption) problems.push(`${where}: puts a data-dpk-* block before its base data`);
    }
  });
  return problems;
};

/** The markdown under one `## heading`, up to the next `## ` heading; `''` when there is none. */
const sectionOf = (markdown: string, heading: string): string => {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return '';
  const rest = markdown.slice(start + heading.length + 3);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
};

describe('docs HTML examples write base data before option blocks', () => {
  it('scans the shipped documentation', () => {
    expect(DOC_FILES.length).toBeGreaterThan(10);
    expect(DOC_FILES.some((file) => file.startsWith('docs/tmp/'))).toBe(false);
  });

  it('puts the base data first, before any data-dpk-grill / data-dpk-changes block', () => {
    const problems = DOC_FILES.flatMap((file) =>
      orderProblems(readFileSync(file, 'utf8')).map((problem) => `${file}: ${problem}`),
    );
    expect(
      problems,
      'base data must be the first <script type="application/json"> child (docs/index.md, Base data)',
    ).toEqual([]);
  });

  it('flags an option block written before the base data', () => {
    const optionFirst = `\`\`\`html
<dpk-view-usm>
  <script type="application/json" data-dpk-grill>{ "questions": [] }</script>
  <script type="application/json">{ "activities": [] }</script>
</dpk-view-usm>
\`\`\``;
    expect(orderProblems(optionFirst)).toEqual([
      'HTML example 1, <dpk-view-usm>: puts a data-dpk-* block before its base data',
    ]);

    const baseFirst = optionFirst.replace(
      '  <script type="application/json" data-dpk-grill>{ "questions": [] }</script>\n  <script type="application/json">{ "activities": [] }</script>',
      '  <script type="application/json">{ "activities": [] }</script>\n  <script type="application/json" data-dpk-grill>{ "questions": [] }</script>',
    );
    expect(orderProblems(baseFirst)).toEqual([]);
  });

  /* The examples are only the symptom: the rule itself has to stay where an author reads it. */
  it('keeps the rule in the "Base data", Questions and Change notices sections', () => {
    const markdown = readFileSync('docs/index.md', 'utf8');
    const baseData = sectionOf(markdown, 'Base data');
    expect(baseData, 'docs/index.md has no "## Base data" section').not.toBe('');
    expect(baseData).toContain('Base data comes first');
    for (const attribute of OPTION_ATTRIBUTES) expect(baseData).toContain(`\`${attribute}\``);

    for (const section of ['Questions (grill)', 'Change notices']) {
      expect(sectionOf(markdown, section), `docs/index.md has no "## ${section}" section`).toContain('base data');
    }
  });
});
