// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GrillElement } from './element';

import '../../index';
import { answerQuestion } from './actions';
import { applyGrillAction } from './apply';
import { grillDefinition } from './definition';
import { answerCounts, parseGrillBase, withAnswer } from './model';
import {
  describeGrillAction,
  grillCommentTargets,
  nextOpenQuestion,
  resolveGrillNavigation,
  serializeGrillAction,
} from './present';

const base = {
  title: '注文フローのレビュー',
  questions: [
    {
      id: 'retry',
      title: '決済の再試行で、二重請求が起きない？',
      description: 'タイムアウトで結果を受け取れないケースを決めます。',
      note: '成功したのに、レスポンスが返らなかったら？',
      options: [
        { id: 'key', label: '注文IDを冪等キーにして再試行する' },
        { id: 'lookup', label: '結果を照会してから再試行する' },
      ],
    },
    {
      id: 'cancel',
      title: 'キャンセルはいつまで？',
      freeText: false,
      options: [{ id: 'before-shipping', label: '出荷指示前まで' }],
    },
  ],
};

const mainSlot = `
  <div class="flow" slot="main">
    <div data-grill-questions="Q1">カート確定</div>
    <div data-grill-questions="Q2">在庫予約</div>
  </div>`;

const mount = (questions: unknown = base, content: string = mainSlot, hash = ''): GrillElement => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <artifact-grill storage="memory">
      <script type="application/json">${JSON.stringify(questions)}</script>
      ${content}
    </artifact-grill>`;
  const element = document.querySelector('artifact-grill');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as GrillElement;
};

const settle = async (element: GrillElement): Promise<void> => {
  await element.artifact.ready;
  await element.updateComplete;
  await Promise.resolve();
  await element.updateComplete;
  await Promise.resolve();
  await element.updateComplete;
};

const state = () => parseGrillBase(base);

const answer = (id: string, value: Parameters<typeof answerQuestion>[1]) =>
  applyGrillAction(state(), {
    id: 'a',
    type: 'ANSWER_QUESTION',
    target: { type: 'question', id },
    payload: value,
    createdAt: '2026-01-01T00:00:00Z',
  });

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('grill base data', () => {
  it('fills references, option and free-text defaults, and rejects bad shapes', () => {
    const parsed = parseGrillBase(base);
    expect(parsed.questions.map((question) => question.ref)).toEqual(['Q1', 'Q2']);
    expect(parsed.questions[0]?.options).toHaveLength(2);
    expect(parsed.questions[1]?.freeText).toBe(false);
    expect(parsed.answers).toEqual({});
    expect(parseGrillBase({ questions: [{ id: 'a', ref: 'F-1', title: 'T' }] }).questions[0]?.ref).toBe('F-1');
    expect(() =>
      parseGrillBase({
        questions: [
          { id: 'a', title: 'T' },
          { id: 'a', title: 'U' },
        ],
      }),
    ).toThrow(/duplicate question id/);
    expect(() =>
      parseGrillBase({
        questions: [
          {
            id: 'a',
            title: 'T',
            options: [
              { id: 'o', label: 'l' },
              { id: 'o', label: 'm' },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate option id/);
    expect(() => parseGrillBase({ questions: [{ id: 'a', title: 'T', typo: 1 }] })).toThrow();
  });
});

describe('grill actions', () => {
  it('keeps identity for repeated answers and clears back to unanswered', () => {
    const answered = answer('retry', { kind: 'option', optionId: 'key' });
    expect(answered?.answers['retry']).toEqual({ kind: 'option', optionId: 'key' });
    expect(withAnswer(answered as NonNullable<typeof answered>, 'retry', { kind: 'option', optionId: 'key' })).toBe(
      answered,
    );
    const cleared = answer('retry', { kind: 'clear' });
    expect(cleared?.answers).toEqual({});
    const fresh = state();
    expect(withAnswer(fresh, 'retry', null)).toBe(fresh);
  });

  it('treats an unknown question or option as not applicable', () => {
    expect(answer('nope', { kind: 'option', optionId: 'key' })).toBeNull();
    expect(answer('retry', { kind: 'option', optionId: 'gone' })).toBeNull();
    expect(
      applyGrillAction(state(), {
        id: 'a',
        type: 'SET_SOMETHING',
        target: { type: 'question', id: 'retry' },
        payload: {},
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ).toBeNull();
  });

  it('counts non-empty answers', () => {
    const answered = answer('retry', { kind: 'free', text: '  照会してから判断する  ' });
    if (answered === null) throw new Error('answer not applicable');
    expect(answerCounts(answered)).toEqual({ total: 2, answered: 1 });
    expect(answerCounts(state())).toEqual({ total: 2, answered: 0 });
    expect(answerCounts(withAnswer(answered, 'retry', { kind: 'free', text: '  ' })).answered).toBe(0);
  });
});

describe('grill review rail', () => {
  it('describes and serializes an answer as a draft action', () => {
    const action = {
      id: 'a',
      type: 'ANSWER_QUESTION',
      target: { type: 'question', id: 'retry' },
      payload: { kind: 'option', optionId: 'lookup' },
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(describeGrillAction(action, state())).toMatchObject({
      title: '回答',
      targetLabel: 'Q1 · 決済の再試行で、二重請求が起きない？',
      summary: '→ 「結果を照会してから再試行する」',
      tone: 'update',
    });
    expect(serializeGrillAction(action)).toBe('ANSWER_QUESTION question:retry {"kind":"option","optionId":"lookup"}');
    expect(describeGrillAction({ ...action, payload: { kind: 'clear' } }, state()).title).toBe('回答をクリア');
    expect(grillDefinition.title(state())).toBe('注文フローのレビュー');
    expect(grillDefinition.title(parseGrillBase({ questions: [] }))).toBe('Visually Grill');
  });

  it('walks to the next unanswered question and wraps around', () => {
    const applicable = (id: string, value: Parameters<typeof answerQuestion>[1]) => {
      const next = answer(id, value);
      if (next === null) throw new Error('answer not applicable');
      return next;
    };
    const answered = applicable('retry', { kind: 'option', optionId: 'key' });
    expect(nextOpenQuestion(state(), 'retry')).toBe('cancel');
    // Nothing answered yet: the list wraps around.
    expect(nextOpenQuestion(state(), 'cancel')).toBe('retry');
    expect(nextOpenQuestion(answered, 'retry')).toBe('cancel');
    expect(nextOpenQuestion(answered, 'cancel')).toBeNull();
  });

  it('offers the questions as comment targets without attaching notes to the open one', () => {
    expect(grillCommentTargets(state()).map((option) => option.value)).toEqual(['question:retry', 'question:cancel']);
    // Notes are about the design as a whole or a diagram element, never "the open question":
    // the answer already is the reply to it, so the composer offers no attach-to-question checkbox.
    expect('currentTarget' in grillDefinition).toBe(false);
    expect(resolveGrillNavigation(state(), {})).toEqual({ question: 'retry' });
    expect(resolveGrillNavigation(state(), { question: 'gone' })).toEqual({ question: 'retry' });
    expect(resolveGrillNavigation(state(), { question: 'cancel' })).toEqual({ question: 'cancel' });
  });
});

describe('artifact-grill', () => {
  it('renders the question list, the fold control and the badges', async () => {
    const element = mount();
    await settle(element);
    const shadow = element.shadowRoot;
    if (!shadow) throw new Error('no shadow root');
    expect(shadow.querySelectorAll('.grill-question')).toHaveLength(2);
    // The corner button carries the progress; other templates show their review
    // button in the same place.
    expect(shadow.querySelector('.grill-toggle-badge')?.textContent).toBe('0 / 2');
    expect(shadow.querySelector('.grill-toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect([...shadow.querySelectorAll('.grill-label')].map((label) => label.textContent?.trim())).toEqual([
      'Q1',
      'Q2',
    ]);

    // The author's main content is captured by the stage, so badges share its space.
    const slots = [...shadow.querySelectorAll<HTMLSlotElement>('slot[name="main"]')];
    expect(slots).toHaveLength(2);
    expect(slots[0]?.assignedElements().map((node) => node.className)).toEqual(['flow']);
    expect(slots[1]?.assignedElements()).toHaveLength(0);
  });

  it('turns a choice into a draft action, and copies the review brief', async () => {
    const element = mount();
    await settle(element);
    const shadow = element.shadowRoot;
    if (!shadow) throw new Error('no shadow root');
    const choice = shadow.querySelector<HTMLInputElement>('[data-question="retry"] input[value="key"]');
    if (!choice) throw new Error('missing choice');
    choice.checked = true;
    choice.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(element);

    expect(element.artifact.state.answers['retry']).toEqual({ kind: 'option', optionId: 'key' });
    expect(element.artifact.actions).toHaveLength(1);
    expect(element.artifact.stale).toHaveLength(0);
    expect(shadow.querySelector('[data-question="retry"]')?.getAttribute('data-answered')).toBe('true');
    expect(shadow.querySelector('.grill-toggle-badge')?.textContent).toBe('1 / 2');

    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const button = shadow.querySelector<HTMLButtonElement>('.grill-copy');
    if (!button) throw new Error('missing copy button');
    expect(button.textContent?.trim()).toBe('回答・Review をまとめてコピー');
    button.click();
    await settle(element);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('注文IDを冪等キーにして再試行する'));
    // A click is never silent: the button reports what happened.
    expect(button.textContent?.trim()).toBe('コピーしました');
    expect(button.dataset['status']).toBe('copied');
    expect(shadow.querySelector('.grill-sr')?.textContent).toBe('コピーしました');
  });

  it('reports a failed copy, and settles back to the plain label', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const element = mount();
      await settle(element);
      const shadow = element.shadowRoot;
      if (!shadow) throw new Error('no shadow root');
      const choice = shadow.querySelector<HTMLInputElement>('[data-question="retry"] input[value="key"]');
      if (!choice) throw new Error('missing choice');
      choice.checked = true;
      choice.dispatchEvent(new Event('change', { bubbles: true }));
      await settle(element);

      vi.stubGlobal('navigator', {
        clipboard: { writeText: vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error('blocked')) },
      });
      const button = shadow.querySelector<HTMLButtonElement>('.grill-copy');
      if (!button) throw new Error('missing copy button');
      button.click();
      await settle(element);
      expect(button.textContent?.trim()).toBe('コピーできませんでした');
      expect(button.dataset['status']).toBe('failed');

      vi.advanceTimersByTime(2400);
      await settle(element);
      expect(button.textContent?.trim()).toBe('回答・Review をまとめてコピー');
      expect(button.dataset['status']).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the question a badge points at, and folds the sidebar away', async () => {
    const element = mount();
    await settle(element);
    const shadow = element.shadowRoot;
    if (!shadow) throw new Error('no shadow root');

    const badges = [...shadow.querySelectorAll<HTMLButtonElement>('.grill-label')];
    badges[1]?.click();
    await settle(element);
    expect(element.navigation['question']).toBe('cancel');
    expect(shadow.querySelector('[data-question="cancel"] .grill-heading')?.getAttribute('aria-expanded')).toBe('true');
    expect(badges[1]?.getAttribute('aria-pressed')).toBe('true');

    shadow.querySelector<HTMLButtonElement>('.grill-toggle')?.click();
    await settle(element);
    expect(shadow.querySelector('.af-sidebar')?.hasAttribute('hidden')).toBe(true);
    expect(shadow.querySelector('.grill-stage')).not.toBeNull();
    expect(shadow.querySelector('.grill-toggle')?.getAttribute('aria-expanded')).toBe('false');

    shadow.querySelector<HTMLButtonElement>('.grill-toggle')?.click();
    await settle(element);
    expect(shadow.querySelector('.af-sidebar')?.hasAttribute('hidden')).toBe(false);
    expect(shadow.querySelectorAll('.grill-question')).toHaveLength(2);
  });

  it('moves to the next unanswered question after a choice', async () => {
    const element = mount();
    await settle(element);
    const shadow = element.shadowRoot;
    if (!shadow) throw new Error('no shadow root');
    const choose = async (questionId: string, optionId: string) => {
      const choice = shadow.querySelector<HTMLInputElement>(
        `[data-question="${questionId}"] input[value="${optionId}"]`,
      );
      if (!choice) throw new Error(`missing choice ${questionId}/${optionId}`);
      choice.checked = true;
      choice.dispatchEvent(new Event('change', { bubbles: true }));
      await settle(element);
    };

    expect(element.navigation['question']).toBe('retry');
    await choose('retry', 'lookup');
    // The answered question folds and the next unanswered one opens.
    expect(element.navigation['question']).toBe('cancel');
    expect(shadow.querySelector('[data-question="retry"] .grill-heading')?.getAttribute('aria-expanded')).toBe('false');
    expect(shadow.querySelector('[data-question="cancel"] .grill-heading')?.getAttribute('aria-expanded')).toBe('true');

    // Nothing left to answer: the review stays where it is.
    await choose('cancel', 'before-shipping');
    expect(element.navigation['question']).toBe('cancel');
    expect(element.artifact.state.answers).toHaveProperty('cancel');
  });

  it('answers with free text, keeps the caret, and clears back', async () => {
    const element = mount();
    await settle(element);
    const shadow = element.shadowRoot;
    if (!shadow) throw new Error('no shadow root');
    const free = shadow.querySelector<HTMLInputElement>('[data-question="retry"] input[value="__free"]');
    if (!free) throw new Error('missing free-text option');
    free.checked = true;
    free.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(element);

    const area = shadow.querySelector<HTMLTextAreaElement>('[data-free-text="retry"]');
    expect(area?.hidden).toBe(false);
    expect(shadow.activeElement).toBe(area);
    if (!area) throw new Error('missing textarea');
    area.value = '照会してから判断する';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(element);
    expect(element.artifact.state.answers['retry']).toEqual({ kind: 'free', text: '照会してから判断する' });
    expect(element.artifact.exportBrief()).toContain('照会してから判断する');

    shadow.querySelector<HTMLButtonElement>('[data-question="retry"] .grill-clear')?.click();
    await settle(element);
    expect(element.artifact.state.answers).toEqual({});
  });

  it('marks an answer stale when its question is gone', async () => {
    const element = mount();
    await settle(element);
    element.artifact.dispatch(answerQuestion('retry', { kind: 'option', optionId: 'key' }));
    await settle(element);
    const other = mount({ questions: [{ id: 'cancel', title: 'キャンセルはいつまで？' }] });
    await settle(other);
    other.artifact.importDraft(element.artifact.actions);
    await settle(other);
    expect(other.artifact.stale.map((entry) => entry.reason)).toEqual(['target-missing']);
  });
});
