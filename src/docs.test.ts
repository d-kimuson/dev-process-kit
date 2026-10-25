// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import pkg from '../package.json' with { type: 'json' };
import { parseDelegationPokerBase } from './views/delegation-poker/model';
import { parsePlainBase } from './views/plain/model';
import { parsePrototypeBase } from './views/prototype/model';
import { parseSlidesBase } from './views/slides/model';
import { parseTaskBoardBase } from './views/task-board/model';
import { parseUsmBase } from './views/usm/model';

/**
 * A reader's first draft of a page is usually the Base data example copied straight out of
 * `docs/views/<name>.md`. If that example cannot parse, every page built from it opens
 * to the error banner. `vite.config.ts` already asserts `package.json`'s `exports` matches its
 * `ENTRIES`, so the public view entries there are the single source of truth for which
 * `docs/views/<name>.md` pages exist — this list is not hand-maintained a second time here.
 */
const VIEW_NAMES = Object.keys(pkg.exports)
  .filter((key) => key.startsWith('./views/'))
  .map((key) => key.replace('./views/', ''));

/**
 * Each template's own `parse<Name>Base` (from `src/views/<name>/model.ts`) is the strict
 * validator the custom element itself runs against the base data `<script>` child — the same
 * function wired into that view's `ViewDefinition.parseBase`. The mapping is hand-written
 * because every view names its parser differently; `VIEW_NAMES` is what must not drift.
 */
const parseBaseFor: Record<string, (input: unknown) => unknown> = {
  prototype: parsePrototypeBase,
  usm: parseUsmBase,
  plain: parsePlainBase,
  slides: parseSlidesBase,
  'task-board': parseTaskBoardBase,
  'delegation-poker': parseDelegationPokerBase,
};

const doc = (name: string): string => readFileSync(resolve('docs/views', `${name}.md`), 'utf8');

/**
 * The first ```json fenced block directly under the `## Base data` heading: the example of the
 * template's whole base data (no envelope — see that heading's own text). A page with no such
 * block is not silently skipped; the test below fails and says so.
 */
const baseDataExample = (markdown: string): string | undefined => {
  const afterHeading = markdown.split(/^## Base data$/m)[1];
  if (afterHeading === undefined) return undefined;
  return /```json\n([\s\S]*?)\n```/.exec(afterHeading)?.[1];
};

describe('docs/views/*.md "## Base data" examples parse', () => {
  it.each(VIEW_NAMES)('%s.md', (name) => {
    const parseBase = parseBaseFor[name];
    expect(parseBase, `no parser wired up in parseBaseFor for template "${name}"`).toBeDefined();

    const markdown = doc(name);
    const json = baseDataExample(markdown);
    expect(json, `docs/views/${name}.md has no json example under "## Base data"`).toBeDefined();

    const data: unknown = JSON.parse(json as string);
    expect(() => parseBase?.(data)).not.toThrow();
  });
});

/**
 * The skill sends an agent to `docs/index.md` to pick a view, so its "## Choose a view" table is
 * the only list of what each view is for. A view missing from it is one an agent never picks.
 */
describe('docs/index.md "## Choose a view" lists every view', () => {
  const section = readFileSync(resolve('docs/index.md'), 'utf8')
    .split(/^## Choose a view$/m)[1]
    ?.split(/^## /m)[0];

  it.each(VIEW_NAMES)('%s', (name) => {
    expect(section, 'docs/index.md has no "## Choose a view" section').toBeDefined();
    expect(section).toMatch(new RegExp(`\\| \`dpk-view-${name}\``));
  });
});
