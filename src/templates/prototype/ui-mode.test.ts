import { describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { prototypeDefinitionFor } from './definition';
import { prototypeMessages } from './messages';
import { parsePrototypeBase, parseUiTargetId, uiTargetId } from './model';
import { prototypeTargetLabel, prototypeUiCommentCount, prototypeUiCommentPins } from './present';
import { reduceUiComment, UI_COMMENT_OFF, type UiCommentMode } from './ui-mode';

const m = prototypeMessages('en');

const state = parsePrototypeBase({
  apps: [
    {
      id: 'shop',
      name: 'Shop',
      screens: [{ id: 'cart-screen', title: 'Cart', previews: [{ id: 'cart', viewport: 'mobile', label: 'Cart' }] }],
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
            {
              id: 'x',
              name: 'X',
              panes: [{ material: { id: 'memo', kind: 'plain' } }, { screen: 'cart-screen' }],
            },
          ],
        },
      ],
    },
  ],
});

const comment = (id: string, targetId: string, body: string, type = 'ui'): DraftAction => ({
  id,
  type: 'comment',
  target: { type, id: targetId },
  payload: { body },
  createdAt: '2025-01-01T00:00:00.000Z',
});

describe('UI comment targets', () => {
  it('round-trips the preview, the selector and the text', () => {
    const id = uiTargetId({ previewId: 'cart', selector: 'nav > a:nth-of-type(2)', text: 'Say "hi"' });
    expect(id).toBe(`cart/nav > a:nth-of-type(2) "Say 'hi'"`);
    expect(parseUiTargetId(id)).toEqual({ previewId: 'cart', selector: 'nav > a:nth-of-type(2)', text: "Say 'hi'" });
    expect(parseUiTargetId('cart/button.save')).toEqual({ previewId: 'cart', selector: 'button.save' });
  });

  it('rejects an id without a preview or a selector', () => {
    expect(parseUiTargetId('button.save')).toBeUndefined();
    expect(parseUiTargetId('cart/')).toBeUndefined();
    expect(parseUiTargetId('a.b/button')).toBeUndefined();
  });

  it('holds while its preview exists, and is labelled by the preview and what the element says', () => {
    const definition = prototypeDefinitionFor('en');
    expect(definition.hasTarget(state, { type: 'ui', id: 'cart/button "Pay"' })).toBe(true);
    expect(definition.hasTarget(state, { type: 'ui', id: 'gone/button "Pay"' })).toBe(false);
    expect(prototypeTargetLabel(m, state, { type: 'ui', id: 'cart/button "Pay"' })).toBe('UI · Cart › "Pay"');
    // without text, the selector names the element; without a label, the preview id names the preview
    expect(prototypeTargetLabel(m, state, { type: 'ui', id: 'memo/div > p' })).toBe('UI · memo › div > p');
    expect(prototypeTargetLabel(m, state, { type: 'ui', id: 'gone/p' })).toBe(m.targetMissing(m.uiGroup, 'gone/p'));
  });

  it('numbers the comments on the previews on screen as pins, and counts them', () => {
    const comments = [
      comment('1', 'cart/button "Pay"', 'Too small'),
      comment('2', 'x', 'About the step', 'step'),
      comment('3', 'other/p', 'Elsewhere'),
      comment('4', 'memo/p', 'Handwriting'),
    ];
    expect(prototypeUiCommentPins(comments, ['cart', 'memo'])).toEqual([
      { id: '1', previewId: 'cart', selector: 'button', number: 1, body: 'Too small' },
      { id: '4', previewId: 'memo', selector: 'p', number: 2, body: 'Handwriting' },
    ]);
    expect(prototypeUiCommentCount(comments, ['memo'])).toBe(1);
  });
});

describe('UI comment mode', () => {
  const target = { previewId: 'cart', selector: 'button', text: 'Pay' };

  it('picks an element, composes, and keeps picking after a comment', () => {
    let mode: UiCommentMode = reduceUiComment(UI_COMMENT_OFF, { kind: 'toggle' });
    expect(mode).toEqual({ kind: 'picking' });
    mode = reduceUiComment(mode, { kind: 'pick', target });
    mode = reduceUiComment(mode, { kind: 'input', body: 'Bigger' });
    expect(mode).toEqual({ kind: 'composing', target, body: 'Bigger' });
    expect(reduceUiComment(mode, { kind: 'submitted' })).toEqual({ kind: 'picking' });
    expect(reduceUiComment(mode, { kind: 'dismiss' })).toEqual({ kind: 'picking' });
  });

  it('turns off from any state, and ignores picks while off', () => {
    const composing: UiCommentMode = { kind: 'composing', target, body: 'x' };
    expect(reduceUiComment(composing, { kind: 'toggle' })).toBe(UI_COMMENT_OFF);
    expect(reduceUiComment(composing, { kind: 'exit' })).toBe(UI_COMMENT_OFF);
    expect(reduceUiComment(UI_COMMENT_OFF, { kind: 'pick', target })).toBe(UI_COMMENT_OFF);
    expect(reduceUiComment(UI_COMMENT_OFF, { kind: 'input', body: 'x' })).toBe(UI_COMMENT_OFF);
  });
});
