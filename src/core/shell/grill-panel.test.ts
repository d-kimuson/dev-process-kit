import { describe, expect, it } from 'vitest';

import { parseGrill } from '../grill';
import { coreMessages } from '../messages';
import { openQuestionOf, presentGrillPanel, resolveRound } from './grill-panel';

const m = coreMessages('en');

const grill = parseGrill({
  questions: [
    {
      id: 'retry',
      title: 'Double charge?',
      note: 'What if the response is lost?',
      options: [
        { id: 'key', label: 'Idempotency key' },
        { id: 'lookup', label: 'Look it up first' },
      ],
    },
    { id: 'notify', title: 'Who hears of it?', freeText: true },
    { id: 'cancel', title: 'Until when?', freeText: false, options: [{ id: 'before', label: 'Before dispatch' }] },
  ],
  history: [
    {
      questions: [
        {
          id: 'deadline',
          title: 'Deadline?',
          options: [{ id: 'dispatch', label: 'Before dispatch' }],
          answer: { kind: 'option', optionId: 'dispatch' },
        },
        { id: 'skipped', title: 'Left open' },
      ],
    },
    { label: 'Refunds', questions: [{ id: 'free', title: 'Why?', answer: { kind: 'free', text: 'Because' } }] },
  ],
});

describe('the open question', () => {
  it('is the one picked while it exists, else the first', () => {
    expect(openQuestionOf(grill, 'notify')).toBe('notify');
    expect(openQuestionOf(grill, 'gone')).toBe('retry');
    expect(openQuestionOf(grill, null)).toBe('retry');
    expect(openQuestionOf(parseGrill({ questions: [] }), null)).toBeNull();
  });
});

describe('presentGrillPanel', () => {
  it('shows the current questions with their answers, the open one unfolded', () => {
    const vm = presentGrillPanel(
      m,
      grill,
      { retry: { kind: 'option', optionId: 'lookup' } },
      { open: 'notify', round: 'current' },
    );
    expect(vm.progress).toBe('1 of 3 answered');
    expect(vm.rounds).toEqual([
      { value: 'current', label: 'Current questions (3)', selected: true },
      { value: '1', label: 'Refunds (1)', selected: false },
      { value: '0', label: 'v1 (2)', selected: false },
    ]);
    if (vm.view.kind !== 'current') throw new Error('expected the current round');
    const [retry, notify, cancel] = vm.view.questions;
    expect(retry).toMatchObject({
      id: 'retry',
      ref: 'Q1',
      open: false,
      answered: true,
      summary: 'Look it up first',
      freeSelected: false,
      allowFreeText: true,
    });
    expect(retry?.choices.map((choice) => [choice.letter, choice.checked])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(notify).toMatchObject({ open: true, answered: false, draft: '' });
    expect(cancel?.allowFreeText).toBe(false);
  });

  it('keeps the text being written, even blank, as a free answer', () => {
    const vm = presentGrillPanel(m, grill, { notify: { kind: 'free', text: '  ' } }, { open: null, round: 'current' });
    if (vm.view.kind !== 'current') throw new Error('expected the current round');
    expect(vm.view.questions[1]).toMatchObject({ freeSelected: true, answered: false, draft: '  ' });
  });

  it('shows an earlier round read-only, with what was answered then', () => {
    const vm = presentGrillPanel(m, grill, {}, { open: null, round: 0 });
    expect(vm.rounds.find((choice) => choice.selected)?.value).toBe('0');
    expect(vm.view).toMatchObject({
      kind: 'past',
      note: 'v1: earlier questions, read-only',
      questions: [
        { id: 'deadline', answered: true, summary: 'Before dispatch', freeText: null },
        { id: 'skipped', answered: false, summary: 'Not answered' },
      ],
    });
    const refunds = presentGrillPanel(m, grill, {}, { open: null, round: 1 });
    expect(refunds.view).toMatchObject({ kind: 'past', questions: [{ summary: 'Because', freeText: 'Because' }] });
  });

  it('offers no round choice without history', () => {
    const plain = parseGrill({ questions: [{ id: 'a', title: 'A?' }] });
    expect(presentGrillPanel(m, plain, {}, { open: null, round: 'current' }).rounds).toEqual([]);
  });
});

describe('resolveRound', () => {
  it('falls back to the current questions when the round is gone', () => {
    expect(resolveRound(grill, 1)).toBe(1);
    expect(resolveRound(grill, 5)).toBe('current');
    expect(resolveRound(grill, 'current')).toBe('current');
  });
});
