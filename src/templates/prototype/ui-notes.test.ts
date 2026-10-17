// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { ActionInput, DraftAction } from '../../core/types';

import { appendAction } from '../../core/action';
import { toTarget } from '../../core/target';
import { prototypeAction, prototypeActions } from './actions';
import { applyPrototypeAction } from './apply';
import { prototypeDefinitionFor } from './definition';
import { prototypeMessages } from './messages';
import { allUiNoteIds, findPreview, parsePrototypeBase, type PrototypeState } from './model';
import { prototypeUiNoteBadges } from './present';

const m = prototypeMessages('en');
const definition = prototypeDefinitionFor('en');

const raw = {
  apps: [
    {
      id: 'shop',
      name: 'Shop',
      screens: [
        {
          id: 'cart-screen',
          title: 'Cart',
          previews: [
            {
              id: 'cart',
              viewport: 'mobile',
              label: 'Cart',
              notes: [
                {
                  id: 'n1',
                  selector: 'button.pay',
                  text: 'Pay',
                  body: 'Agreed with legal',
                  createdAt: '2026-10-01T09:00:00Z',
                },
              ],
            },
            { id: 'cart-desktop', viewport: 'desktop' },
          ],
        },
      ],
    },
  ],
  activities: [
    {
      id: 'a',
      name: 'A',
      stories: [
        {
          id: 's',
          name: 'S',
          steps: [
            { id: 'x', name: 'X', panes: [{ material: { id: 'memo', kind: 'plain' } }, { screen: 'cart-screen' }] },
          ],
        },
      ],
    },
  ],
};

const base = parsePrototypeBase(raw);

const act = (input: ActionInput): DraftAction => ({
  id: 'x',
  type: input.type,
  target: toTarget(input.target, 'page'),
  payload: input.payload,
  createdAt: '2026-01-01T00:00:00Z',
});

const apply = (state: PrototypeState, input: ActionInput) => applyPrototypeAction(state, act(input));

const notesOf = (state: PrototypeState | null, previewId: string) =>
  state === null ? undefined : findPreview(state, previewId)?.preview.notes;

const pay = { previewId: 'cart', selector: 'button.pay', text: 'Pay' };

describe('prototype UI notes: model', () => {
  it('keeps the notes a preview carries as part of the prototype', () => {
    expect(notesOf(base, 'cart')).toEqual([
      { id: 'n1', selector: 'button.pay', text: 'Pay', body: 'Agreed with legal', createdAt: '2026-10-01T09:00:00Z' },
    ]);
    expect(findPreview(base, 'cart-desktop')?.preview).not.toHaveProperty('notes');
    expect(allUiNoteIds(base)).toEqual(['n1']);
  });

  it('rejects a blank note and a note id used twice, even on another preview', () => {
    const withNotes = (notes: unknown[]) => ({
      ...raw,
      apps: [
        {
          ...raw.apps[0],
          screens: [
            {
              ...raw.apps[0]!.screens[0],
              previews: [raw.apps[0]!.screens[0]!.previews[0], { id: 'cart-desktop', viewport: 'desktop', notes }],
            },
          ],
        },
      ],
    });
    expect(() => parsePrototypeBase(withNotes([{ id: 'n2', selector: 'p', body: ' ' }]))).toThrow();
    expect(() => parsePrototypeBase(withNotes([{ id: 'n1', selector: 'p', body: 'again' }]))).toThrow(
      /duplicate note id "n1"/,
    );
  });

  it('does not take notes in the payload of an action that adds a preview', () => {
    const added = applyPrototypeAction(base, {
      ...act(prototypeAction.addPreview('x', { id: 'fax', kind: 'plain', viewport: 'fluid' })),
      payload: { id: 'fax', notes: [{ id: 'n9', selector: 'p', body: 'hi' }] },
    });
    expect(added).toBeNull();
  });
});

describe('prototype UI notes: actions', () => {
  it('adds a note to the element once and deletes it again', () => {
    const added = apply(base, prototypeAction.addUiNote(pay, 'n2', 'Ship behind a flag', '2026-10-02T10:00:00.000Z'));
    expect(notesOf(added, 'cart')?.map((note) => note.id)).toEqual(['n1', 'n2']);
    expect(notesOf(added, 'cart')?.[1]).toEqual({
      id: 'n2',
      selector: 'button.pay',
      text: 'Pay',
      body: 'Ship behind a flag',
      createdAt: '2026-10-02T10:00:00.000Z',
    });
    expect(apply(added!, prototypeAction.addUiNote(pay, 'n2', 'Ship behind a flag'))).toBe(added);

    const removed = apply(added!, prototypeAction.deleteUiNote(pay, 'n2'));
    expect(removed).toEqual(base);
    const empty = apply(base, prototypeAction.deleteUiNote(pay, 'n1'));
    expect(findPreview(empty!, 'cart')?.preview).not.toHaveProperty('notes');
    expect(apply(base, prototypeAction.deleteUiNote(pay, 'ghost'))).toBeNull();
  });

  it('adds a note to a material as well', () => {
    const added = apply(base, prototypeAction.addUiNote({ previewId: 'memo', selector: ':scope' }, 'n2', 'Real FAX'));
    expect(notesOf(added, 'memo')).toEqual([{ id: 'n2', selector: ':scope', body: 'Real FAX' }]);
  });

  it('refuses a blank note, an unknown preview and a note id another element already uses', () => {
    expect(apply(base, prototypeAction.addUiNote(pay, 'n2', '  '))).toBeNull();
    expect(apply(base, prototypeAction.addUiNote({ ...pay, previewId: 'ghost' }, 'n2', 'hi'))).toBeNull();
    expect(apply(base, prototypeAction.addUiNote({ previewId: 'cart', selector: 'h1' }, 'n1', 'hi'))).toBeNull();
  });

  it('rewrites the body of a note and keeps the rest of it', () => {
    const edited = apply(base, prototypeAction.setUiNoteBody(pay, 'n1', 'Agreed with legal and QA'));
    expect(notesOf(edited, 'cart')).toEqual([
      {
        id: 'n1',
        selector: 'button.pay',
        text: 'Pay',
        body: 'Agreed with legal and QA',
        createdAt: '2026-10-01T09:00:00Z',
      },
    ]);
    expect(apply(base, prototypeAction.setUiNoteBody(pay, 'n1', '  '))).toBeNull();
    expect(apply(base, prototypeAction.setUiNoteBody(pay, 'ghost', 'hi'))).toBeNull();
  });

  it('keeps every note deleted in a row, and only the last edit of the same note', () => {
    const removeFirst = act(prototypeAction.deleteUiNote(pay, 'n1'));
    const removeSecond = act(prototypeAction.deleteUiNote(pay, 'n2'));
    expect(appendAction([removeFirst], removeSecond, prototypeActions.DELETE_UI_NOTE)).toEqual([
      removeFirst,
      removeSecond,
    ]);
    const draft = act(prototypeAction.setUiNoteBody(pay, 'n1', 'Agreed'));
    const final = act(prototypeAction.setUiNoteBody(pay, 'n1', 'Agreed with legal'));
    const other = act(prototypeAction.setUiNoteBody(pay, 'n2', 'Ship behind a flag'));
    expect(appendAction([draft], final, prototypeActions.SET_UI_NOTE_BODY)).toEqual([final]);
    expect(appendAction([final], other, prototypeActions.SET_UI_NOTE_BODY)).toEqual([final, other]);
  });

  it('describes the note in the review rail, on the element it is on', () => {
    const add = act(prototypeAction.addUiNote(pay, 'n2', 'Ship behind a flag'));
    const added = apply(base, prototypeAction.addUiNote(pay, 'n2', 'Ship behind a flag'))!;
    expect(definition.describe(add, added, base)).toEqual({
      title: m.addUiNote,
      targetLabel: 'UI · Cart › "Pay"',
      tone: 'create',
      summary: '+ "Ship behind a flag"',
    });
    const remove = act(prototypeAction.deleteUiNote(pay, 'n1'));
    expect(definition.describe(remove, base, base)).toMatchObject({
      title: m.deleteUiNote,
      tone: 'delete',
      summary: '− "Agreed with legal"',
    });
    const edit = act(prototypeAction.setUiNoteBody(pay, 'n1', 'Agreed with legal and QA'));
    const edited = apply(base, prototypeAction.setUiNoteBody(pay, 'n1', 'Agreed with legal and QA'))!;
    expect(definition.describe(edit, edited, base)).toMatchObject({
      title: m.editUiNote,
      tone: 'update',
      summary: '"Agreed with legal" → "Agreed with legal and QA"',
    });
  });
});

describe('prototype UI notes: badges', () => {
  it('groups the notes on the previews on screen by the element they are on', () => {
    const state = apply(
      apply(base, prototypeAction.addUiNote(pay, 'n2', 'Second'))!,
      prototypeAction.addUiNote({ previewId: 'memo', selector: 'p' }, 'n3', 'On the memo'),
    )!;
    expect(prototypeUiNoteBadges(state, ['cart'])).toEqual([
      {
        previewId: 'cart',
        selector: 'button.pay',
        label: 'Cart › "Pay"',
        notes: [
          expect.objectContaining({ id: 'n1', body: 'Agreed with legal' }),
          expect.objectContaining({ id: 'n2', body: 'Second' }),
        ],
      },
    ]);
    expect(prototypeUiNoteBadges(state, ['memo']).map((badge) => badge.selector)).toEqual(['p']);
    expect(prototypeUiNoteBadges(state, [])).toEqual([]);
  });
});
