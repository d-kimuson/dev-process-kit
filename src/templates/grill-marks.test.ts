// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import '../index';

/**
 * A template that renders cards from its data lets each card name the page's
 * questions it is about (`questions`), as a diagram's nodes do: the card
 * carries `data-grill-questions`, and the shell lays a Q badge on it.
 */
type Case = {
  readonly tag: string;
  readonly base: unknown;
  /** Each card that names `Q1`, by a selector inside the template's shadow root. */
  readonly marked: readonly string[];
};

const grill = { questions: [{ id: 'open', title: 'Still open?' }] };

const cases: readonly Case[] = [
  {
    tag: 'dpk-template-usm',
    base: {
      activities: [{ id: 'buy', name: 'Buy', questions: 'Q1', steps: [{ id: 'pay', name: 'Pay', questions: 'Q1' }] }],
      milestones: [{ id: 'mvp', name: 'MVP', questions: 'Q1' }],
      stories: [
        { id: 'card', name: 'Pay by card', activityId: 'buy', stepId: 'pay', milestoneId: 'mvp', questions: 'Q1' },
      ],
    },
    marked: [
      '.act-head[data-activity="buy"]',
      '.col-head[data-column-step="pay"]',
      '.row-head[data-milestone="mvp"]',
      '[data-story="card"]',
    ],
  },
  {
    tag: 'dpk-template-event-storming',
    base: {
      contexts: [{ id: 'order', name: 'Order', questions: 'Q1' }],
      elements: [
        { id: 'placed', type: 'event', name: 'Order placed', contextId: 'order', questions: 'Q1' },
        { id: 'why', type: 'hotspot', name: 'Why?' },
      ],
      links: [{ id: 'l1', from: 'why', to: 'placed' }],
    },
    marked: ['.context-region', '[data-dpk-target="element:placed"]'],
  },
  {
    tag: 'dpk-template-task-board',
    base: {
      title: 'Ship checkout',
      todos: [{ id: 'pay', title: 'Wire payments', questions: 'Q1' }],
      outputs: [{ id: 'pr', href: 'https://example.com/pr/1', questions: 'Q1' }],
      log: [{ id: 'l1', title: 'Started', questions: 'Q1' }],
    },
    marked: ['[data-todo="pay"]', '[data-output="pr"]', '[data-log="l1"]'],
  },
  {
    tag: 'dpk-template-delegation-poker',
    base: {
      players: [{ id: 'lead', name: 'Lead' }],
      decisions: [
        { id: 'hiring', name: 'Hiring', questions: 'Q1' },
        { id: 'tools', name: 'Tools' },
      ],
    },
    marked: ['[data-decision="hiring"] .cell-name'],
  },
  {
    tag: 'dpk-template-whiteboard',
    base: {
      items: [
        { id: 'idea', kind: 'sticky', x: 0, y: 0, text: 'Idea', questions: 'Q1' },
        { id: 'note', kind: 'text', x: 200, y: 0, text: 'Note' },
      ],
    },
    marked: ['[data-item-id="idea"]'],
  },
];

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
});

const settle = async (element: HTMLElement & { api: { ready: Promise<void> }; updateComplete: Promise<boolean> }) => {
  await element.api.ready;
  for (let i = 0; i < 4; i += 1) {
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

describe.each(cases)('$tag cards name the questions they are about', ({ tag, base, marked }) => {
  it('marks each card that names a question and lays a badge on it', async () => {
    document.body.innerHTML = `<${tag} storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script>
      <script type="application/json" data-dpk-grill>${JSON.stringify(grill)}</script>
    </${tag}>`;
    const element = document.querySelector(tag) as HTMLElement & {
      api: { ready: Promise<void> };
      updateComplete: Promise<boolean>;
    };
    await settle(element);
    const root = element.shadowRoot!;
    expect(
      marked.map((selector) => [selector, root.querySelector(selector)?.getAttribute('data-grill-questions')]),
    ).toEqual(marked.map((selector) => [selector, 'Q1']));
    expect(root.querySelectorAll('[data-grill-questions]')).toHaveLength(marked.length);
    expect(root.querySelectorAll('.dpk-grill-badge')).toHaveLength(marked.length);
  });
});
