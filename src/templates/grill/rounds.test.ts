// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import type { DpkTemplateGrill } from './element';

import '../../index';
import { grillMessages } from './messages';
import { parseGrillBase } from './model';
import { presentPastRound, presentRoundChoices, resolveRound } from './present';

const current = [
  {
    id: 'refund-failure',
    title: '返金が失敗し続けたらどうする？',
    options: [
      { id: 'keep', label: '返金待ちのまま再試行する' },
      { id: 'manual', label: 'オペレーター対応に移す' },
    ],
  },
];

const base = {
  title: '注文キャンセル',
  questions: current,
  history: [
    {
      questions: [
        {
          id: 'deadline',
          title: '締め切りはどこ？',
          description: '出荷指示との競合を決めます。',
          options: [
            { id: 'before-dispatch', label: '出荷指示の前まで' },
            { id: 'hours-before', label: '出荷の N 時間前まで' },
          ],
          answer: { kind: 'option', optionId: 'before-dispatch' },
        },
        { id: 'refund-timing', title: '返金は同期？', answer: { kind: 'free', text: '非同期にする' } },
        { id: 'skipped', title: '答えなかった質問' },
      ],
    },
    {
      label: '返金の詳細',
      questions: [{ id: 'deadline', ref: 'R1', title: '同じ id を別のラウンドで使ってよい' }],
    },
  ],
};

const m = grillMessages('en');

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
});

describe('grill rounds in the base data', () => {
  it('reads earlier rounds with their recorded answers, labelled v1, v2 … by default', () => {
    const state = parseGrillBase(base);
    expect(state.pastRounds.map((round) => round.label)).toEqual(['v1', '返金の詳細']);
    const [first] = state.pastRounds;
    expect(first?.questions.map((question) => [question.ref, question.answer])).toEqual([
      ['Q1', { kind: 'option', optionId: 'before-dispatch' }],
      ['Q2', { kind: 'free', text: '非同期にする' }],
      ['Q3', null],
    ]);
    // Past rounds are not the current questions: no draft action can target them.
    expect(state.questions.map((question) => question.id)).toEqual(['refund-failure']);
    expect(parseGrillBase({ questions: current }).pastRounds).toEqual([]);
  });

  it('rejects a recorded answer naming an unknown option, and duplicate ids within a round', () => {
    expect(() =>
      parseGrillBase({
        questions: [],
        history: [{ questions: [{ id: 'a', title: 'T', answer: { kind: 'option', optionId: 'nope' } }] }],
      }),
    ).toThrow(/unknown option id: nope/);
    expect(() =>
      parseGrillBase({
        questions: [],
        history: [
          {
            questions: [
              { id: 'a', title: 'T' },
              { id: 'a', title: 'U' },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate question id/);
  });
});

describe('grill round presentation', () => {
  it('offers the current questions first, then earlier rounds newest first', () => {
    const state = parseGrillBase(base);
    expect(presentRoundChoices(m, state, 'current')).toEqual([
      { value: 'current', label: m.roundOption(m.currentRound, 1), selected: true },
      { value: '1', label: m.roundOption('返金の詳細', 1), selected: false },
      { value: '0', label: m.roundOption('v1', 3), selected: false },
    ]);
    expect(presentRoundChoices(m, parseGrillBase({ questions: current }), 'current')).toEqual([]);
  });

  it('falls back to the current questions when the selected round is gone', () => {
    const state = parseGrillBase(base);
    expect(resolveRound(state, 1)).toBe(1);
    expect(resolveRound(state, 2)).toBe('current');
    expect(resolveRound(parseGrillBase({ questions: current }), 0)).toBe('current');
  });

  it('shows an earlier round read-only, with the answer that was given', () => {
    const view = presentPastRound(m, parseGrillBase(base), 0);
    expect(view?.label).toBe('v1');
    expect(view?.questions.map((question) => [question.ref, question.answered, question.summary])).toEqual([
      ['Q1', true, '出荷指示の前まで'],
      ['Q2', true, '非同期にする'],
      ['Q3', false, m.unanswered],
    ]);
    expect(view?.questions[0]?.choices.map((choice) => [choice.letter, choice.checked])).toEqual([
      ['a', true],
      ['b', false],
    ]);
    expect(view?.questions[1]?.freeText).toBe('非同期にする');
  });
});

const mount = async (data: unknown = base): Promise<DpkTemplateGrill> => {
  document.body.innerHTML = `
    <dpk-template-grill storage="memory">
      <script type="application/json">${JSON.stringify(data)}</script>
      <div slot="main"><div data-grill-questions="Q1">返金ワーカー</div></div>
    </dpk-template-grill>`;
  const element = document.querySelector('dpk-template-grill') as DpkTemplateGrill;
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
  return element;
};

const pick = async (element: DpkTemplateGrill, value: string): Promise<void> => {
  const select = element.shadowRoot?.querySelector<HTMLSelectElement>('.grill-round');
  if (!select) throw new Error('no round select');
  select.value = value;
  select.dispatchEvent(new Event('change'));
  await element.updateComplete;
};

describe('dpk-template-grill with earlier rounds', () => {
  it('keeps the two tabs and plain question tab when there is no history', async () => {
    const element = await mount({ questions: current });
    expect(element.shadowRoot?.querySelector('.grill-round')).toBeNull();
    expect(element.shadowRoot?.querySelectorAll('[role="tab"]')).toHaveLength(2);
  });

  it('switches the question tab between the current questions and an earlier round', async () => {
    const element = await mount();
    const shadow = element.shadowRoot;
    if (!shadow) throw new Error('no shadow root');
    const select = shadow.querySelector<HTMLSelectElement>('.grill-round');
    expect([...(select?.options ?? [])].map((option) => option.textContent?.trim())).toEqual([
      m.roundOption(m.currentRound, 1),
      m.roundOption('返金の詳細', 1),
      m.roundOption('v1', 3),
    ]);

    // From Review, the round select is only a tab: it switches back without opening.
    shadow.querySelector<HTMLButtonElement>('[data-tab="review"]')?.click();
    await element.updateComplete;
    expect(shadow.querySelector<HTMLSelectElement>('.grill-round')?.disabled).toBe(true);
    shadow.querySelector<HTMLButtonElement>('button[data-tab="questions"]')?.click();
    await element.updateComplete;
    expect(shadow.querySelector('#grill-panel-questions')?.hasAttribute('hidden')).toBe(false);
    expect(shadow.querySelector<HTMLSelectElement>('.grill-round')?.disabled).toBe(false);
    expect(shadow.querySelector<HTMLSelectElement>('.grill-round')?.value).toBe('current');
    expect(shadow.querySelector('button[data-tab="questions"]')).toBeNull();

    await pick(element, '0');
    expect(shadow.querySelector('#grill-panel-questions')?.hasAttribute('hidden')).toBe(false);
    expect([...shadow.querySelectorAll('.grill-question')].map((node) => node.getAttribute('data-question'))).toEqual([
      'deadline',
      'refund-timing',
      'skipped',
    ]);
    // Read-only: nothing to answer with.
    expect(shadow.querySelector('#grill-panel-questions input, #grill-panel-questions textarea')).toBeNull();
    expect(shadow.querySelector('[data-question="deadline"] [data-checked="true"]')?.textContent).toContain(
      '出荷指示の前まで',
    );

    // A badge always points at the current questions.
    shadow.querySelector<HTMLButtonElement>('.grill-label')?.click();
    await element.updateComplete;
    expect(shadow.querySelector<HTMLSelectElement>('.grill-round')?.value).toBe('current');
    expect(shadow.querySelector('[data-question="refund-failure"] input')).not.toBeNull();
    expect(element.api.actions).toEqual([]);
  });

  it('leaves earlier rounds out of the hand-off', async () => {
    const element = await mount();
    expect(element.api.exportBrief()).not.toContain('締め切りはどこ？');
  });
});
