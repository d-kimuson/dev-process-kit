import { describe, expect, it } from 'vitest';

import { DraftController } from './controller';
import { answerGrill, parseGrill } from './grill';
import { MemoryDraftStorage } from './persistence';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

const grill = parseGrill({
  questions: [
    {
      id: 'retry',
      title: '二重請求は起きない？',
      options: [
        { id: 'key', label: '冪等キー' },
        { id: 'lookup', label: '照会してから' },
      ],
    },
    { id: 'notify', title: '誰に知らせる？' },
  ],
});

const makeController = () => {
  const storage = new MemoryDraftStorage();
  const controller = new DraftController({
    definition: tinyDefinition,
    base: tinyBase([{ id: 'a', name: 'Alpha' }]),
    storage,
    storageKey: 'test',
    grill: { grill, locale: 'en' },
  });
  return { controller, storage };
};

describe('grill answers in the draft', () => {
  it('derives the answers apart from the template state', () => {
    const { controller } = makeController();
    const state = controller.derivation.state;
    expect(controller.dispatch(answerGrill('retry', { kind: 'option', optionId: 'key' })).ok).toBe(true);
    expect(controller.derivation.answers).toEqual({ retry: { kind: 'option', optionId: 'key' } });
    expect(controller.derivation.grill).toBe(grill);
    expect(controller.derivation.state).toBe(state);
    expect(controller.derivation.applied).toHaveLength(1);
  });

  it('keeps one answer per question, and drops an answer cleared again', () => {
    const { controller, storage } = makeController();
    controller.dispatch(answerGrill('retry', { kind: 'option', optionId: 'key' }));
    controller.dispatch({ type: 'SET_NAME', target: 'a', payload: { name: 'A2' } });
    controller.dispatch(answerGrill('retry', { kind: 'option', optionId: 'lookup' }));
    expect(controller.actions.map((action) => action.type)).toEqual(['SET_NAME', 'answer']);
    controller.dispatch(answerGrill('retry', { kind: 'clear' }));
    expect(controller.actions.map((action) => action.type)).toEqual(['SET_NAME']);
    expect(storage.load('test', 'tiny')).toHaveLength(1);
  });

  it('keeps every action in order, even one that ends up back where it started', () => {
    const { controller } = makeController();
    controller.dispatch({ type: 'SET_NAME', target: 'a', payload: { name: 'A2' } });
    controller.dispatch(answerGrill('notify', { kind: 'free', text: '購入者' }));
    controller.dispatch({ type: 'SET_NAME', target: 'a', payload: { name: 'Alpha' } });
    expect(controller.actions.map((action) => action.type)).toEqual(['SET_NAME', 'answer', 'SET_NAME']);
  });

  it('marks an answer stale when its question or option is gone, and applies it again when it is back', () => {
    const { controller } = makeController();
    controller.dispatch(answerGrill('retry', { kind: 'option', optionId: 'key' }));
    controller.setGrill({ grill: parseGrill({ questions: [{ id: 'retry', title: 'T' }] }), locale: 'en' });
    expect(controller.derivation.stale.map((entry) => entry.reason)).toEqual(['constraint-violated']);
    controller.setGrill({ grill: parseGrill({ questions: [] }), locale: 'en' });
    expect(controller.derivation.stale.map((entry) => entry.reason)).toEqual(['target-missing']);
    expect(controller.actions).toHaveLength(1);
    controller.setGrill({ grill, locale: 'en' });
    expect(controller.derivation.stale).toEqual([]);
    expect(controller.derivation.answers).toEqual({ retry: { kind: 'option', optionId: 'key' } });
  });

  it('rejects an answer that is not one, and a batch whose answer does not apply', () => {
    const { controller } = makeController();
    expect(controller.dispatch({ type: 'answer', target: 'grill:retry', payload: { kind: 'maybe' } }).ok).toBe(false);
    expect(
      controller.dispatchBatch([
        { type: 'SET_NAME', target: 'a', payload: { name: 'A2' } },
        answerGrill('retry', { kind: 'option', optionId: 'gone' }),
      ]).ok,
    ).toBe(false);
    expect(controller.actions).toEqual([]);
    expect(controller.dispatchBatch([answerGrill('notify', { kind: 'free', text: 'x' })]).ok).toBe(true);
  });

  it('describes answers and lets comments target the questions', () => {
    const { controller } = makeController();
    controller.dispatch(answerGrill('retry', { kind: 'option', optionId: 'key' }));
    controller.dispatch({ type: 'comment', target: 'grill:notify', payload: { body: '選択肢がほしい' } });
    const [answer, comment] = controller.actions;
    if (!answer || !comment) throw new Error('missing actions');
    const { definition, derivation } = controller;
    expect(definition.describe(answer, derivation.state, derivation.base)).toEqual({
      title: 'Answer',
      summary: '→ “冪等キー”',
      tone: 'update',
      targetLabel: 'Q1 · 二重請求は起きない？',
    });
    expect(definition.describe(comment, derivation.state, derivation.base).targetLabel).toBe('Q2 · 誰に知らせる？');
    expect(definition.serialize(answer)).toBe('answer grill:retry {"kind":"option","optionId":"key"}');
    expect(definition.commentTargets(derivation.state, {}).filter((target) => target.group === 'Question')).toEqual([
      { value: 'grill:retry', label: 'Q1 · 二重請求は起きない？', group: 'Question' },
      { value: 'grill:notify', label: 'Q2 · 誰に知らせる？', group: 'Question' },
    ]);
    expect(derivation.comments).toHaveLength(1);
  });

  it('restores stored answers before the questions are read, and applies them once they are', () => {
    const storage = new MemoryDraftStorage();
    storage.save('test', 'tiny', [
      {
        id: 'x',
        type: 'answer',
        target: { type: 'grill', id: 'retry' },
        payload: { kind: 'option', optionId: 'key' },
        createdAt: '2026-10-16T00:00:00Z',
      },
    ]);
    const controller = new DraftController({
      definition: tinyDefinition,
      base: tinyBase(),
      storage,
      storageKey: 'test',
    });
    expect(controller.actions).toHaveLength(1);
    controller.setGrill({ grill, locale: 'ja' });
    expect(controller.derivation.answers).toEqual({ retry: { kind: 'option', optionId: 'key' } });
    const [answer] = controller.actions;
    if (!answer) throw new Error('missing action');
    expect(controller.definition.describe(answer, controller.derivation.state).title).toBe('回答');
  });
});
