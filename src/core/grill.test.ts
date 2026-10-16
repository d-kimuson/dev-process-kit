import { describe, expect, it } from 'vitest';

import type { DraftAction } from './types';

import {
  answerCounts,
  answerGrill,
  applyAnswer,
  EMPTY_GRILL,
  isAnswerAction,
  nextOpenQuestion,
  optionLetter,
  parseGrill,
  replaceAnswer,
  type GrillAnswers,
} from './grill';

const input = {
  questions: [
    {
      id: 'retry',
      title: '決済の再試行で、二重請求が起きない？',
      note: '成功したのに、レスポンスが返らなかったら？',
      options: [
        { id: 'key', label: '注文IDを冪等キーにして再試行する' },
        { id: 'lookup', label: '結果を照会してから再試行する' },
      ],
    },
    { id: 'cancel', title: 'キャンセルはいつまで？', freeText: false, options: [{ id: 'before', label: '出荷前' }] },
    { id: 'notify', ref: 'N-1', title: '誰に知らせる？' },
  ],
  history: [
    {
      questions: [
        {
          id: 'deadline',
          title: '締め切りは？',
          options: [{ id: 'dispatch', label: '出荷指示の前' }],
          answer: { kind: 'option', optionId: 'dispatch' },
        },
        { id: 'skipped', title: '答えなかった質問' },
      ],
    },
    { label: '返金', questions: [{ id: 'deadline', title: '別のラウンドなら同じ id でよい' }] },
  ],
};

const grill = parseGrill(input);

const action = (id: string, payload: unknown, type = 'answer'): DraftAction => ({
  id: `a-${id}`,
  type,
  target: { type: 'grill', id },
  payload,
  createdAt: '2026-10-16T00:00:00Z',
});

describe('the questions block', () => {
  it('fills references and defaults, and reads earlier rounds labelled v1, v2 … by default', () => {
    expect(grill.questions.map((question) => question.ref)).toEqual(['Q1', 'Q2', 'N-1']);
    expect(grill.questions[0]?.freeText).toBe(true);
    expect(grill.questions[1]?.freeText).toBe(false);
    expect(grill.questions[2]?.options).toEqual([]);
    expect(grill.rounds.map((round) => round.label)).toEqual(['v1', '返金']);
    expect(grill.rounds[0]?.questions.map((question) => question.answer)).toEqual([
      { kind: 'option', optionId: 'dispatch' },
      null,
    ]);
    expect(parseGrill({ questions: [] })).toEqual(EMPTY_GRILL);
  });

  it('rejects duplicate ids, unknown recorded options and unknown fields', () => {
    const twice = [
      { id: 'a', title: 'T' },
      { id: 'a', title: 'U' },
    ];
    expect(() => parseGrill({ questions: twice })).toThrow(/duplicate question id/);
    expect(() =>
      parseGrill({
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
    expect(() =>
      parseGrill({
        questions: [],
        history: [{ questions: [{ id: 'a', title: 'T', answer: { kind: 'option', optionId: 'x' } }] }],
      }),
    ).toThrow(/unknown option id/);
    expect(() => parseGrill({ questions: [{ id: 'a', title: 'T', typo: 1 }] })).toThrow();
    expect(() => parseGrill({ questions: [{ id: 'a.b', title: 'T' }] })).toThrow();
  });
});

describe('answers', () => {
  it('records an option or free text, keeps identity when nothing changes, and clears back', () => {
    const picked = applyAnswer(grill, {}, action('retry', { kind: 'option', optionId: 'key' }));
    expect(picked).toEqual({ retry: { kind: 'option', optionId: 'key' } });
    if (picked === null) throw new Error('not applied');
    expect(applyAnswer(grill, picked, action('retry', { kind: 'option', optionId: 'key' }))).toBe(picked);
    expect(applyAnswer(grill, picked, action('retry', { kind: 'clear' }))).toEqual({});
    const empty: GrillAnswers = {};
    expect(applyAnswer(grill, empty, action('retry', { kind: 'clear' }))).toBe(empty);
    expect(applyAnswer(grill, {}, action('notify', { kind: 'free', text: '購入者' }))).toEqual({
      notify: { kind: 'free', text: '購入者' },
    });
  });

  it('does not apply to an unknown question or option, or free text where it is off', () => {
    expect(applyAnswer(grill, {}, action('gone', { kind: 'clear' }))).toBeNull();
    expect(applyAnswer(grill, {}, action('retry', { kind: 'option', optionId: 'gone' }))).toBeNull();
    expect(applyAnswer(grill, {}, action('cancel', { kind: 'free', text: '自由に' }))).toBeNull();
    expect(applyAnswer(grill, {}, action('retry', { kind: 'nope' }))).toBeNull();
  });

  it('counts answers that say something, and walks to the next open question', () => {
    const answers: GrillAnswers = {
      retry: { kind: 'option', optionId: 'key' },
      notify: { kind: 'free', text: '  ' },
    };
    expect(answerCounts(grill, answers)).toEqual({ total: 3, answered: 1 });
    expect(nextOpenQuestion(grill, answers, 'retry')).toBe('cancel');
    expect(nextOpenQuestion(grill, { ...answers, cancel: { kind: 'option', optionId: 'before' } }, 'cancel')).toBe(
      'notify',
    );
    expect(
      nextOpenQuestion(
        grill,
        {
          retry: answers['retry']!,
          cancel: { kind: 'option', optionId: 'before' },
          notify: { kind: 'free', text: 'x' },
        },
        'notify',
      ),
    ).toBeNull();
  });

  it('names option rows a, b … z, aa', () => {
    expect([0, 1, 25, 26, 27].map(optionLetter)).toEqual(['a', 'b', 'z', 'aa', 'ab']);
  });
});

describe('answer actions', () => {
  it('are the core answer type on a grill target', () => {
    expect(isAnswerAction(action('retry', {}))).toBe(true);
    expect(isAnswerAction(action('retry', {}, 'comment'))).toBe(false);
    expect(isAnswerAction({ ...action('retry', {}), target: { type: 'step', id: 'retry' } })).toBe(false);
    expect(answerGrill('retry', { kind: 'clear' })).toEqual({
      type: 'answer',
      target: { type: 'grill', id: 'retry' },
      payload: { kind: 'clear' },
    });
  });

  it('keep one answer per question in the draft: a new one replaces the last wherever it stands', () => {
    const first = action('retry', { kind: 'option', optionId: 'key' });
    const other = { ...action('step', {}, 'RENAME'), target: { type: 'step', id: 'x' } };
    const second = { ...action('retry', { kind: 'clear' }), id: 'a-retry-2' };
    expect(replaceAnswer([first, other], second)).toEqual([other, second]);
    expect(replaceAnswer([other], first)).toEqual([other, first]);
  });
});
