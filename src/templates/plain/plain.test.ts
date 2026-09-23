// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlainElement } from './element';

import '../../index';
import { plainDefinition, plainHasTarget } from './definition';
import { parsePlainBase } from './model';
import { describePlainAction, plainCommentTargets, plainTargetLabel } from './present';

const base = {
  title: '注文フローの設計メモ',
  sections: [
    { id: 'background', title: '背景' },
    { id: 'decision', title: '決めたこと' },
  ],
};

const diagram = `
  <artifact-state-diagram id="order-states" slot="main">
    <script type="application/json">
      { "states": [{ "id": "a", "name": "A" }, { "id": "b", "name": "B" }],
        "transitions": [{ "id": "go", "from": "a", "to": "b", "title": "進む" }] }
    </script>
  </artifact-state-diagram>`;

const mount = (data: unknown = base, content = diagram): PlainElement => {
  window.location.hash = '';
  document.body.innerHTML = `
    <artifact-plain storage="memory">
      <script type="application/json">${JSON.stringify(data)}</script>
      <section slot="main"><h2>背景</h2><button data-artifact-comment="section:background">コメント</button></section>
      ${content}
    </artifact-plain>`;
  const element = document.querySelector('artifact-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as PlainElement;
};

const settle = async (element: PlainElement): Promise<void> => {
  await element.artifact.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  vi.restoreAllMocks();
});

describe('plain base data', () => {
  it('defaults to an untitled page without sections and rejects bad shapes', () => {
    expect(parsePlainBase({})).toEqual({ title: '', sections: [] });
    expect(parsePlainBase(base).sections.map((section) => section.id)).toEqual(['background', 'decision']);
    expect(() =>
      parsePlainBase({
        sections: [
          { id: 'a', title: 'A' },
          { id: 'a', title: 'B' },
        ],
      }),
    ).toThrow(/duplicate section id/);
    expect(() => parsePlainBase({ sections: [{ id: 'a.b', title: 'A' }] })).toThrow();
    expect(() => parsePlainBase({ title: 'x', typo: 1 })).toThrow();
  });
});

describe('plain definition', () => {
  const state = parsePlainBase(base);

  it('offers the declared sections as comment targets', () => {
    expect(plainCommentTargets(state).map((option) => option.value)).toEqual([
      'section:background',
      'section:decision',
    ]);
    expect(plainHasTarget(state, { type: 'section', id: 'decision' })).toBe(true);
    expect(plainHasTarget(state, { type: 'section', id: 'gone' })).toBe(false);
    expect(plainHasTarget(state, { type: 'artifact', id: 'plain' })).toBe(true);
  });

  it('labels targets and never throws on a missing one', () => {
    expect(plainTargetLabel(state, { type: 'section', id: 'background' })).toBe('背景');
    expect(plainTargetLabel(state, { type: 'section', id: 'gone' })).toBe('gone');
    expect(plainTargetLabel(state, { type: 'artifact', id: 'plain' })).toBe('Artifact 全体');
    const comment = {
      id: 'c',
      type: 'comment',
      target: { type: 'section', id: 'decision' },
      payload: { body: 'x' },
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(describePlainAction(comment, state).targetLabel).toBe('決めたこと');
  });

  it('has no actions of its own and titles itself', () => {
    expect(plainDefinition.actions).toEqual({});
    expect(plainDefinition.title(state)).toBe('注文フローの設計メモ');
    expect(plainDefinition.title(parsePlainBase({}))).toBe('Plain');
  });
});

describe('<artifact-plain>', () => {
  it('renders the header chrome and slots the author content into main', async () => {
    const element = mount();
    await settle(element);
    const root = element.shadowRoot;
    expect(root?.querySelector('.af-header h1')?.textContent).toBe('注文フローの設計メモ');
    expect(root?.querySelector('.af-banner')).toBeNull();
    expect(root?.querySelector('slot[name="main"]')).not.toBeNull();
    expect(root?.querySelector('artifact-comment-panel')).not.toBeNull();
    expect(root?.querySelector('.af-fab')).not.toBeNull();
  });

  it('accepts artifact, section and diagram-element comments into one draft', async () => {
    const element = mount();
    await settle(element);
    expect(element.artifact.comment({ type: 'artifact', id: 'plain' }, '全体').ok).toBe(true);
    expect(element.artifact.comment('section:decision', 'セクション').ok).toBe(true);
    expect(element.artifact.comment('element:order-states/node/a', '状態 A').ok).toBe(true);
    expect(element.artifact.comments).toHaveLength(3);
    expect(element.artifact.stale).toEqual([]);
    expect(element.artifact.exportBrief()).toContain('element:order-states/node/a');
  });

  it('opens the review rail from data-artifact-comment on author markup', async () => {
    const element = mount();
    await settle(element);
    expect(element.notesOpen).toBe(false);
    element.querySelector<HTMLButtonElement>('[data-artifact-comment]')?.click();
    await settle(element);
    expect(element.notesOpen).toBe(true);
  });

  it('keeps a comment on a removed section as stale', async () => {
    const element = mount();
    await settle(element);
    element.artifact.comment('section:decision', '残る');
    element.controller.setBase(parsePlainBase({ title: 'x', sections: [] }));
    expect(element.artifact.stale.map((entry) => entry.action.target)).toEqual([{ type: 'section', id: 'decision' }]);
  });
});
