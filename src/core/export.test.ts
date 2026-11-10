import { describe, expect, it } from 'vitest';

import { parseAddressed, type AddressedSet } from './addressed';
import { DraftController } from './controller';
import { buildAgentBrief } from './export';
import { answerGrill, parseGrill } from './grill';
import { tinyBase, tinyDefinition } from './testing/tiny-template';

const briefOf = (controller: DraftController<ReturnType<typeof tinyBase>>, addressed?: AddressedSet): string =>
  buildAgentBrief(
    {
      base: controller.base,
      state: controller.derivation.state,
      actions: controller.actions,
      comments: controller.derivation.comments,
      stale: controller.derivation.stale,
      issues: [],
      navigation: {},
      grill: controller.derivation.grill,
      answers: controller.derivation.answers,
    },
    controller.definition,
    'test',
    addressed,
  );

// A review round against a base that has since moved on: the reader keeps the
// draft (interpretive drafts), but the agent must not re-apply what no longer fits.
const staleRound = () => {
  const first = new DraftController({
    definition: tinyDefinition,
    base: tinyBase([
      { id: 'a', name: 'Alpha' },
      { id: 'gone', name: 'Gone' },
    ]),
    storage: null,
  });
  first.dispatch({ type: 'SET_NAME', target: 'item:a', payload: { name: 'Apple' } });
  first.dispatch({ type: 'SET_NAME', target: 'item:gone', payload: { name: 'Ghost' } });
  first.dispatch({ type: 'comment', target: { type: 'item', id: 'gone' }, payload: { body: 'Why is this here?' } });
  first.dispatch({ type: 'comment', target: { type: 'page', id: 'page' }, payload: { body: 'Looks good' } });
  return new DraftController({
    definition: tinyDefinition,
    base: tinyBase([{ id: 'a', name: 'Alpha' }]),
    storage: null,
    initialActions: first.actions,
  });
};

describe('buildAgentBrief', () => {
  it('lists only applicable actions as pending, and stale ones in a section of their own', () => {
    const controller = staleRound();
    expect(controller.derivation.stale).toHaveLength(2);
    const brief = briefOf(controller);

    expect(brief).toContain('- pending: 1 change(s), 1 comment(s)');
    expect(brief).toContain('## Comments (1)');
    expect(brief).toContain('## Requested changes (1)');
    expect(brief).toContain('## Not applicable to the current base (2)');

    const [pending = '', stale = ''] = brief.split('## Not applicable to the current base');
    expect(pending).toContain('"name": "Apple"');
    expect(pending).not.toContain('Ghost');
    expect(pending).not.toContain('Why is this here?');
    expect(stale).toContain('target-missing');
    expect(stale).toContain('item:gone');
  });

  it('keeps the whole draft in the canonical JSON', () => {
    const brief = briefOf(staleRound());
    const canonical = brief.split('## Canonical draft (JSON)')[1] ?? '';
    expect(canonical).toContain('Ghost');
    expect(canonical).toContain('Why is this here?');
  });

  it('reports no pending actions when everything is stale', () => {
    const first = new DraftController({
      definition: tinyDefinition,
      base: tinyBase([{ id: 'gone', name: 'Gone' }]),
      storage: null,
    });
    first.dispatch({ type: 'SET_NAME', target: 'item:gone', payload: { name: 'Ghost' } });
    const controller = new DraftController({
      definition: tinyDefinition,
      base: tinyBase(),
      storage: null,
      initialActions: first.actions,
    });
    const brief = briefOf(controller);
    expect(brief).toContain('- pending: 0 change(s), 0 comment(s)');
    expect(brief).toContain('_No pending draft actions._');
    expect(brief).toContain('## Not applicable to the current base (1)');
  });

  it('hands the answers over in a section of their own, apart from the requested changes', () => {
    const grill = parseGrill({
      questions: [
        { id: 'retry', title: '二重請求は起きない？', options: [{ id: 'key', label: '冪等キー' }] },
        { id: 'notify', title: '誰に知らせる？' },
        { id: 'open', title: 'まだ答えていない質問' },
      ],
    });
    const controller = new DraftController({
      definition: tinyDefinition,
      base: tinyBase([{ id: 'a', name: 'Alpha' }]),
      storage: null,
      grill: { grill, locale: 'en' },
    });
    controller.dispatch(answerGrill('retry', { kind: 'option', optionId: 'key' }));
    controller.dispatch(answerGrill('notify', { kind: 'free', text: '購入者\nと店舗' }));
    controller.dispatch({ type: 'SET_NAME', target: 'item:a', payload: { name: 'Apple' } });
    const brief = briefOf(controller);

    expect(brief).toContain('- pending: 1 change(s), 0 comment(s), 2 answer(s)');
    expect(brief).toContain('## Requested changes (1)');
    const answers = brief.split('## Answers (2)')[1]?.split('## Requested changes')[0] ?? '';
    expect(answers).toContain('1. **Q1 · 二重請求は起きない？** — `grill:retry`');
    expect(answers).toContain('   > 冪等キー (option `key`)');
    expect(answers).toContain('2. **Q2 · 誰に知らせる？** — `grill:notify`');
    expect(answers).toContain('   > 購入者\n   > と店舗');
    expect(answers).not.toContain('Q3');
  });

  describe('the addressed value', () => {
    const controllerWith = (ids: readonly string[]) =>
      new DraftController({
        definition: tinyDefinition,
        base: tinyBase([{ id: 'a', name: 'Alpha' }]),
        storage: null,
        initialActions: ids.map((id, index) => ({
          id,
          type: 'comment',
          target: { type: 'item', id: 'a' },
          payload: { body: `note ${index}` },
          createdAt: '2026-01-01T00:00:00.000Z',
        })),
      });
    const valueIn = (brief: string): string | undefined =>
      /## Change log: addressed[\s\S]*?```text\n(.*)\n```/.exec(brief)?.[1];

    it('prints what the change log names, grown by the ids of this draft', () => {
      const current = parseAddressed('k3f9:1-10,x7a2:1-4');
      if (typeof current === 'string') throw new Error(current);
      const brief = briefOf(controllerWith(['k3f9:11', 'k3f9:14', 'm0q1:2']), current);
      expect(valueIn(brief)).toBe('k3f9:1-14,m0q1:1-2,x7a2:1-4');
    });

    it('says nothing of it for a draft of old ids only', () => {
      const brief = briefOf(controllerWith(['3f2a9c1e-0000-4000-8000-000000000000']));
      expect(brief).not.toContain('## Change log: addressed');
    });
  });
});
