// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkTemplateDelegationPoker } from './element';

import '../../index';
import { delegationPokerAction } from './actions';
import { applyDelegationPokerAction } from './apply';
import { delegationPokerDefinitionFor } from './definition';
import { delegationPokerMessages } from './messages';
import { parseDelegationPokerBase, type DelegationPokerState } from './model';
import { presentBoard } from './present';

const m = delegationPokerMessages('en');
const definition = delegationPokerDefinitionFor('en');

const base = {
  title: 'Who decides what',
  parties: { delegator: 'You', delegate: 'Claude' },
  players: [
    { id: 'claude', name: 'Claude' },
    { id: 'lead', name: 'Tech lead' },
  ],
  decisions: [
    {
      id: 'deps',
      name: 'Adding a dependency',
      cards: [
        { player: 'claude', level: 5, reason: 'I can compare licenses' },
        { player: 'lead', level: 3 },
      ],
    },
    { id: 'release', name: 'Release timing', cards: [{ player: 'claude', level: 2 }] },
    { id: 'commits', name: 'Commit granularity', cards: [{ player: 'claude', level: 7 }], agreed: 7 },
  ],
};

const action = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'a', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const state = (): DelegationPokerState => parseDelegationPokerBase(base);

const apply = (s: DelegationPokerState, input: ReturnType<typeof delegationPokerAction.playCard>) => {
  const target = typeof input.target === 'string' ? { type: 'decision', id: input.target } : input.target;
  return applyDelegationPokerAction(s, action(input.type, target, input.payload));
};

const mount = (hash = '', lang = '', mode = ''): DpkTemplateDelegationPoker => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-delegation-poker storage="memory"${lang === '' ? '' : ` lang="${lang}"`}${mode === '' ? '' : ` mode="${mode}"`}>
      <script type="application/json">${JSON.stringify(base)}</script>
    </dpk-template-delegation-poker>`;
  return document.querySelector('dpk-template-delegation-poker') as DpkTemplateDelegationPoker;
};

const settle = async (el: DpkTemplateDelegationPoker): Promise<void> => {
  await el.api.ready;
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
};

describe('delegation poker base data', () => {
  it('parses decisions with the cards other players already played', () => {
    const parsed = state();
    expect(parsed.decisions.map((decision) => decision.id)).toEqual(['deps', 'release', 'commits']);
    expect(parsed.decisions[0]?.cards).toHaveLength(2);
    expect(parsed.decisions[2]?.agreed).toBe(7);
    expect(parsed.decisions[0]?.yours).toBeUndefined();
  });

  it('only accepts the seven delegation levels', () => {
    const withLevel = (level: unknown) => ({
      ...base,
      decisions: [{ id: 'd', name: 'D', cards: [{ player: 'claude', level }] }],
    });
    expect(() => parseDelegationPokerBase(withLevel(0))).toThrow();
    expect(() => parseDelegationPokerBase(withLevel(8))).toThrow();
    expect(() => parseDelegationPokerBase(withLevel(2.5))).toThrow();
    expect(() => parseDelegationPokerBase({ ...base, decisions: [{ id: 'd', name: 'D', agreed: 9 }] })).toThrow();
  });

  it('rejects unknown players, a player playing twice and duplicate ids', () => {
    const decision = (cards: unknown) => ({ ...base, decisions: [{ id: 'd', name: 'D', cards }] });
    expect(() => parseDelegationPokerBase(decision([{ player: 'nobody', level: 3 }]))).toThrow(/unknown player/);
    expect(() =>
      parseDelegationPokerBase(
        decision([
          { player: 'claude', level: 3 },
          { player: 'claude', level: 4 },
        ]),
      ),
    ).toThrow(/more than one card/);
    expect(() =>
      parseDelegationPokerBase({
        ...base,
        decisions: [
          { id: 'd', name: 'D' },
          { id: 'd', name: 'E' },
        ],
      }),
    ).toThrow(/duplicate/);
    // The reader's own card is a draft action, never base data.
    expect(() =>
      parseDelegationPokerBase({ ...base, decisions: [{ id: 'd', name: 'D', yours: { level: 3 } }] }),
    ).toThrow();
  });

  it('starts empty without base data', () => {
    expect(definition.emptyBase()).toEqual({ players: [], decisions: [] });
  });
});

describe('delegation poker actions', () => {
  it('plays the reader’s card, and a later card replaces it', () => {
    const played = apply(state(), delegationPokerAction.playCard('deps', 4));
    expect(played?.decisions[0]?.yours).toBe(4);
    const replayed = played && apply(played, delegationPokerAction.playCard('deps', 6));
    expect(replayed?.decisions[0]?.yours).toBe(6);
  });

  it('records the agreed level', () => {
    const agreed = apply(state(), delegationPokerAction.agreeLevel('release', 3));
    expect(agreed?.decisions[1]?.agreed).toBe(3);
  });

  it('adds, renames and deletes decision areas', () => {
    const added = apply(state(), delegationPokerAction.addDecision('new-1', 'Hiring'));
    expect(added?.decisions.at(-1)).toEqual({ id: 'new-1', name: 'Hiring', cards: [] });
    const renamed = added && apply(added, delegationPokerAction.setDecisionName('new-1', 'Hiring a contractor'));
    expect(renamed?.decisions.at(-1)?.name).toBe('Hiring a contractor');
    const deleted = renamed && apply(renamed, delegationPokerAction.deleteDecision('new-1'));
    expect(deleted?.decisions.map((decision) => decision.id)).toEqual(['deps', 'release', 'commits']);
  });

  it('is stale against a decision area that no longer exists', () => {
    expect(apply(state(), delegationPokerAction.playCard('gone', 3))).toBeNull();
    expect(apply(state(), delegationPokerAction.agreeLevel('gone', 3))).toBeNull();
    expect(apply(state(), delegationPokerAction.setDecisionName('gone', 'X'))).toBeNull();
    expect(apply(state(), delegationPokerAction.deleteDecision('gone'))).toBeNull();
  });

  it('rejects a level outside 1–7 and a reason at dispatch time', () => {
    const el = mount();
    return settle(el).then(() => {
      expect(el.api.dispatch(delegationPokerAction.playCard('deps', 8 as never)).ok).toBe(false);
      expect(
        el.api.dispatch({
          type: 'PLAY_CARD',
          target: { type: 'decision', id: 'deps' },
          payload: { level: 2, reason: 'x' },
        }).ok,
      ).toBe(false);
      expect(el.api.dispatch(delegationPokerAction.playCard('deps', 2)).ok).toBe(true);
    });
  });
});

describe('delegation poker board', () => {
  const rowOf = (s: DelegationPokerState, id: string, mode: 'strict' | 'lax' = 'lax') =>
    presentBoard(m, s, mode).rows.find((row) => row.id === id);

  it('heads the seven levels with their names and the phrase for the two parties', () => {
    const { levels } = presentBoard(m, state(), 'lax');
    expect(levels.map((level) => level.name)).toEqual([
      'Tell',
      'Sell',
      'Consult',
      'Agree',
      'Advise',
      'Inquire',
      'Delegate',
    ]);
    expect(levels[0]?.phrase).toBe('You decide and tell Claude');
    expect(levels[6]?.phrase).toBe('Claude decides; You need not know');
  });

  it('keeps the other players’ cards face down until the reader plays on that row', () => {
    const before = rowOf(state(), 'deps');
    expect(before?.status).toBe('to-play');
    expect(before?.hidden).toBe(2);
    expect(before?.cells.every((cell) => cell.chips.length === 0 && !cell.yours)).toBe(true);

    const after = rowOf(apply(state(), delegationPokerAction.playCard('deps', 4)) ?? state(), 'deps');
    expect(after?.hidden).toBe(0);
    expect(after?.status).toBe('discuss');
    expect(after?.cells[3]).toMatchObject({ yours: true, chips: [{ label: 'You', kind: 'you' }] });
    expect(after?.cells[4]?.chips).toEqual([{ label: 'Claude', kind: 'player', reason: 'I can compare licenses' }]);
    expect(after?.cells[2]?.chips).toEqual([{ label: 'Tech lead', kind: 'player' }]);
  });

  it('locks a played row only in strict mode', () => {
    const played = apply(state(), delegationPokerAction.playCard('deps', 4)) ?? state();
    expect(rowOf(played, 'deps', 'strict')?.locked).toBe(true);
    expect(rowOf(played, 'release', 'strict')?.locked).toBe(false);
    expect(rowOf(played, 'deps', 'lax')?.locked).toBe(false);
  });

  it('calls a single level a consensus', () => {
    const played = apply(state(), delegationPokerAction.playCard('release', 2)) ?? state();
    expect(rowOf(played, 'release')?.status).toBe('consensus');
  });

  it('shows an agreed row face up without asking for a card', () => {
    const commits = rowOf(state(), 'commits');
    expect(commits?.status).toBe('agreed');
    expect(commits?.agreed).toBe(7);
    expect(commits?.cells[6]).toMatchObject({ agreed: true, chips: [{ label: 'Claude', kind: 'player' }] });
  });

  it('counts how far the reader has come', () => {
    const played = apply(state(), delegationPokerAction.playCard('deps', 4)) ?? state();
    expect(presentBoard(m, played, 'lax').progress).toEqual({ played: 1, agreed: 1, total: 3 });
  });
});

describe('delegation poker definition', () => {
  it('describes the reader’s card and the agreement for the review rail', () => {
    const s = state();
    expect(definition.describe(action('PLAY_CARD', { type: 'decision', id: 'deps' }, { level: 3 }), s)).toEqual({
      title: 'Played a card',
      summary: '→ 3 Consult',
      targetLabel: 'Decision area · Adding a dependency',
      tone: 'update',
    });
    expect(
      definition.describe(action('AGREE_LEVEL', { type: 'decision', id: 'commits' }, { level: 6 }), s, s).summary,
    ).toBe('7 Delegate → 6 Inquire');
  });

  it('offers the board and every decision area as comment targets', () => {
    expect(definition.commentTargets(state(), {}).map((option) => option.value)).toEqual([
      'page:delegation-poker',
      'decision:deps',
      'decision:release',
      'decision:commits',
    ]);
  });

  it('has no navigation of its own: the whole board is one page', () => {
    expect(definition.resolveNavigation(state(), {})).toEqual({});
  });
});

describe('<dpk-template-delegation-poker>', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  const rowEl = (root: ShadowRoot, id: string) =>
    root.querySelector<HTMLElement>(`[data-testid="board"] [data-decision="${id}"]`);

  it('is the board alone, with no separate table', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot as ShadowRoot;
    expect(root.querySelector('[data-testid="board"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="table"]')).toBeNull();
  });

  it('plays a card by clicking a cell, which turns the row face up', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot as ShadowRoot;
    expect(rowEl(root, 'deps')?.querySelectorAll('.chip')).toHaveLength(0);
    rowEl(root, 'deps')?.querySelector<HTMLButtonElement>('button[data-level="4"]')?.click();
    await settle(el);
    expect(el.api.actions.map((a) => [a.type, a.target.id, a.payload])).toEqual([['PLAY_CARD', 'deps', { level: 4 }]]);
    expect(rowEl(root, 'deps')?.querySelectorAll('.chip')).toHaveLength(3);
    expect(rowEl(root, 'deps')?.querySelector('button[data-level="4"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('agrees on a level from the row', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot as ShadowRoot;
    const select = rowEl(root, 'deps')?.querySelector<HTMLSelectElement>('select[data-testid="agree"]');
    expect(select).not.toBeNull();
    if (select) {
      select.value = '4';
      select.dispatchEvent(new Event('change'));
    }
    await settle(el);
    expect(el.api.state.decisions[0]?.agreed).toBe(4);
    expect(rowEl(root, 'deps')?.querySelector('[data-level="4"][data-agreed]')).not.toBeNull();
  });

  it('adds and deletes decision areas', async () => {
    const el = mount();
    await settle(el);
    const root = el.shadowRoot as ShadowRoot;
    root.querySelector<HTMLButtonElement>('[data-testid="add-decision"]')?.click();
    await settle(el);
    const added = el.api.state.decisions.at(-1);
    expect(added?.name).toBe(m.newDecision);
    rowEl(root, added?.id ?? '')
      ?.querySelector<HTMLButtonElement>('[data-testid="delete-decision"]')
      ?.click();
    await settle(el);
    expect(el.api.state.decisions.map((decision) => decision.id)).toEqual(['deps', 'release', 'commits']);
  });

  describe('in strict mode', () => {
    const cellOf = (root: ShadowRoot, id: string, level: number) =>
      rowEl(root, id)?.querySelector<HTMLButtonElement>(`button[data-level="${level}"]`);
    const confirmEl = (root: ShadowRoot) => root.querySelector<HTMLElement>('[data-testid="confirm-play"]');

    it('asks before the first card and plays it once confirmed', async () => {
      const el = mount('', '', 'strict');
      await settle(el);
      const root = el.shadowRoot as ShadowRoot;
      cellOf(root, 'deps', 4)?.click();
      await settle(el);
      expect(el.api.actions).toEqual([]);
      expect(confirmEl(root)).not.toBeNull();
      confirmEl(root)?.querySelector<HTMLButtonElement>('[data-testid="confirm-play-ok"]')?.click();
      await settle(el);
      expect(el.api.actions.map((a) => [a.type, a.target.id, a.payload])).toEqual([
        ['PLAY_CARD', 'deps', { level: 4 }],
      ]);
      expect(confirmEl(root)).toBeNull();
    });

    it('plays nothing when the reader cancels', async () => {
      const el = mount('', '', 'strict');
      await settle(el);
      const root = el.shadowRoot as ShadowRoot;
      cellOf(root, 'deps', 4)?.click();
      await settle(el);
      confirmEl(root)?.querySelector<HTMLButtonElement>('[data-testid="confirm-play-cancel"]')?.click();
      await settle(el);
      expect(el.api.actions).toEqual([]);
      expect(confirmEl(root)).toBeNull();
    });

    it('does not let the reader change a card once played', async () => {
      const el = mount('', '', 'strict');
      await settle(el);
      const root = el.shadowRoot as ShadowRoot;
      el.api.dispatch(delegationPokerAction.playCard('deps', 4));
      await settle(el);
      expect(cellOf(root, 'deps', 6)?.getAttribute('aria-disabled')).toBe('true');
      cellOf(root, 'deps', 6)?.click();
      await settle(el);
      expect(confirmEl(root)).toBeNull();
      expect(el.api.state.decisions[0]?.yours).toBe(4);
    });

    it('stops asking once the reader ticks “don’t ask again”', async () => {
      const el = mount('', '', 'strict');
      await settle(el);
      const root = el.shadowRoot as ShadowRoot;
      cellOf(root, 'deps', 4)?.click();
      await settle(el);
      const skip = confirmEl(root)?.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (skip) {
        skip.checked = true;
        skip.dispatchEvent(new Event('change'));
      }
      confirmEl(root)?.querySelector<HTMLButtonElement>('[data-testid="confirm-play-ok"]')?.click();
      await settle(el);
      cellOf(root, 'release', 2)?.click();
      await settle(el);
      expect(confirmEl(root)).toBeNull();
      expect(el.api.state.decisions[1]?.yours).toBe(2);
    });
  });

  it('renders its own chrome in Japanese', async () => {
    const el = mount('', 'ja');
    await settle(el);
    expect(el.shadowRoot?.textContent).toContain('委任する');
  });
});
