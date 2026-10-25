// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { ViewDefinition } from '../core/types';

import '../index';
import { DpkApp, type PageContent } from './index';

const app = document.createElement('dpk-app');
if (!(app instanceof DpkApp)) throw new Error('not upgraded');

// `PAGE_CONTENTS` (in `index.ts`) duplicates each content's own `label` and `addable` so the
// add menu can read them before an unloaded view's entry is fetched. This guards the two
// sources of truth against drift.
const EXPECTED = [
  'board:architecture-map',
  'board:dependency-graph',
  'board:er-diagram',
  'board:event-storming',
  'board:example-mapping',
  'board:kanban',
  'board:mind-map',
  'board:sequence-diagram',
  'board:state-diagram',
  'board:whiteboard',
  'view:delegation-poker',
  'view:plain',
  'view:prototype',
  'view:slides',
  'view:task-board',
  'view:usm',
].sort();

// `pageContents` is `protected` (an implementation seam for `AppElement` subclasses, not public
// API); this reaches it the same way `AppElement` itself does, without widening its visibility.
type WithPageContents = {
  pageContents(): readonly PageContent[];
};

describe('PAGE_CONTENTS', () => {
  const contents = (app as unknown as WithPageContents).pageContents();

  it('lists exactly the shipped views and boards', () => {
    expect(contents.map((content) => `${content.kind}:${content.name}`).sort()).toEqual(EXPECTED);
  });

  for (const content of contents) {
    it(`"${content.kind}:${content.name}" matches its own definition's label and addable`, () => {
      const tag = `${content.kind === 'view' ? 'dpk-view' : 'dpk-board'}-${content.name}`;
      const element = document.createElement(tag) as HTMLElement & { definition: ViewDefinition<unknown> };
      expect(element.definition.kind).toBe(content.kind);
      expect(content.label).toBe(element.definition.label);
      expect(content.addable ?? true).toBe(element.definition.addable ?? true);
    });
  }
});
