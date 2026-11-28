// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The landing page's component catalog (`lp/index.html`) is the one place a reader browses what the
 * kit ships. A public component that has a docs page, or is registered in `src/components`, but has
 * no catalog entry is a component an agent (and a reader) never discovers — exactly how comment
 * panel, tag filter and video fell out of the catalog once. This test makes that gap fail.
 *
 * "Public" is the set `components.js` registers: the `define*` helpers exported from
 * `src/components/index.ts` (each defines `dpk-<dir>`), either in `registerComponentElements` or
 * `registerAtoms`. `defineAtomStyles` is CSS, not an element, so it is skipped. Documented tags come
 * from each `docs/components/*.md` heading (`# dpk-x`, or a longer heading naming `<dpk-x>`).
 */

const COMPONENTS_INDEX = readFileSync(resolve('src/components/index.ts'), 'utf8');
const CATALOG = readFileSync(resolve('lp/index.html'), 'utf8');

/** `define<Name>` helpers that define an element: the `define*` exports but the CSS-atom one. */
const publicDefineHelpers = (): readonly string[] =>
  [...new Set([...COMPONENTS_INDEX.matchAll(/export \{([^}]*)\} from/g)].flatMap((match) => match[1] ?? ''))]
    .flatMap((names) => names.split(',').map((name) => name.trim()))
    .filter((name) => /^define[A-Z]/.test(name) && name !== 'defineAtomStyles');

/**
 * The tag each `define*` helper registers. Every `define<Name>` names its directory in the same
 * export statement (`export { …, define<Name> } from './<dir>'` or `'./<dir>/index'`), so read the
 * helper's directory from its own export statement — the statement ends at the next `'`+`;`, so a
 * one-line export can't run into the next one.
 */
const tagOfDefineHelper = (helper: string): string | null => {
  const match = new RegExp(`export \\{[^}]*\\b${helper}\\b[^}]*\\} from '\\./([^'/]+)(?:/[^']*)?';`).exec(
    COMPONENTS_INDEX,
  );
  return match?.[1] === undefined ? null : `dpk-${match[1]}`;
};

/** Every element tag a `docs/components/*.md` page documents, from its first heading. */
const documentedTags = (): readonly string[] => {
  const dir = resolve('docs/components');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .flatMap((name) => {
      const heading = readFileSync(resolve(dir, name), 'utf8').split('\n')[0] ?? '';
      const first = /^#\s+`?\s*(dpk-[a-z0-9-]+)\s*`?\s*$/.exec(heading)?.[1];
      if (first !== undefined) return [first];
      const inline = /`<\s*(dpk-[a-z0-9-]+)\s*>`/.exec(heading)?.[1];
      return inline === undefined ? [] : [inline];
    });
};

/** The catalog entry whose header names `tag` (`<h3>&lt;dpk-x&gt;</h3>`), and its id if it has a TOC link. */
const catalogEntryFor = (tag: string): { readonly id: string; readonly linked: boolean } | null => {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entry = new RegExp(
    `<article id="(catalog-[a-z0-9-]+)"[^>]*>\\s*<header>\\s*<h3>(?:&lt;|\\<)${escaped}(?:&gt;|\\>)`,
  ).exec(CATALOG);
  if (entry?.[1] === undefined) return null;
  return { id: entry[1], linked: CATALOG.includes(`href="#${entry[1]}"`) };
};

const PUBLIC_TAGS = publicDefineHelpers()
  .flatMap((helper) => {
    const tag = tagOfDefineHelper(helper);
    return tag === null ? [] : [tag];
  })
  .sort();

const DOCUMENTED_TAGS = [...new Set(documentedTags())].sort();

describe('landing catalog covers every public component', () => {
  it('reads a plausible public tag list (a broken regex would hide the gap silently)', () => {
    expect(PUBLIC_TAGS.length).toBeGreaterThan(10);
    expect(PUBLIC_TAGS).toContain('dpk-comment-panel');
    expect(PUBLIC_TAGS).toContain('dpk-video');
    expect(DOCUMENTED_TAGS.length).toBeGreaterThan(10);
  });

  it.each([...new Set([...PUBLIC_TAGS, ...DOCUMENTED_TAGS])].sort())(
    '%s has a catalog entry with a TOC link',
    (tag) => {
      const entry = catalogEntryFor(tag);
      expect(entry, `${tag} has no catalog entry in lp/index.html (a <h3>&lt;${tag}&gt;</h3>)`).not.toBeNull();
      expect(entry?.linked, `${tag}'s catalog entry #${entry?.id} is not linked from the TOC`).toBe(true);
    },
  );
});
