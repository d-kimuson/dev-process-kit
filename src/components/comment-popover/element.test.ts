import { afterEach, describe, expect, it, vi } from 'vitest';

import { DpkCommentPopover } from './element';
import { defineCommentPopover } from './index';
import { commentPopoverMessages } from './messages';

const m = commentPopoverMessages('en');

defineCommentPopover();

afterEach(() => {
  document.body.replaceChildren();
});

const mount = async (): Promise<DpkCommentPopover> => {
  const element = document.createElement('dpk-comment-popover');
  if (!(element instanceof DpkCommentPopover)) throw new Error('did not upgrade');
  element.target = 'element:note:1';
  element.label = 'The refund flow';
  element.innerHTML = `<button type="button">Comment</button>`;
  document.body.append(element);
  for (let index = 0; index < 3; index++) await element.updateComplete;
  return element;
};

describe('dpk-comment-popover', () => {
  it('registers its own target as a comment target, the same provider contract other components use', async () => {
    const element = await mount();
    expect(element.commentTargets).toEqual([{ value: 'element:note:1', label: 'The refund flow' }]);
  });

  it('has no comment targets without a target', async () => {
    const element = await mount();
    element.target = '';
    expect(element.commentTargets).toEqual([]);
  });

  it('marks itself with the anchor attribute the review rail looks up', async () => {
    const element = await mount();
    expect(element.getAttribute('data-dpk-target')).toBe('element:note:1');
    element.target = '';
    await element.updateComplete;
    expect(element.hasAttribute('data-dpk-target')).toBe(false);
  });

  it('stays closed until the slotted trigger is clicked', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
    element.querySelector('button')?.click();
    await element.updateComplete;
    expect(element.open).toBe(true);
    expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
  });

  it('opens from the `open` property directly, without a click', async () => {
    const element = await mount();
    element.open = true;
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
  });

  it('submits to the enclosing template and closes, mirroring `open` back to false', async () => {
    const element = await mount();
    element.open = true;
    await element.updateComplete;
    const submitted = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('dpk-comment-submit', submitted);
    const textarea = element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea');
    if (!textarea) throw new Error('no composer');
    textarea.value = 'Looks good';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    element.renderRoot.querySelector<HTMLButtonElement>('.comment-pop .dpk-btn--accent')?.click();
    await element.updateComplete;
    expect(submitted).toHaveBeenCalledOnce();
    const event = submitted.mock.calls[0]?.[0];
    expect(event instanceof CustomEvent ? event.detail : null).toEqual({
      target: 'element:note:1',
      body: 'Looks good',
    });
    expect(element.open).toBe(false);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
  });

  it('keeps the comment and says why when nothing accepts it', async () => {
    const element = await mount();
    element.open = true;
    await element.updateComplete;
    const textarea = element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea');
    if (!textarea) throw new Error('no composer');
    textarea.value = 'Too weak';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    element.renderRoot.querySelector<HTMLButtonElement>('.comment-pop .dpk-btn--accent')?.click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.comment-pop .comment-error')?.textContent).toBe(m.sendFailed);
    expect(element.open).toBe(true);
    expect(element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea')?.value).toBe('Too weak');
  });

  it('closes on Escape inside the composer, without submitting', async () => {
    const element = await mount();
    element.open = true;
    await element.updateComplete;
    const surface = element.renderRoot.querySelector<HTMLElement>('.comment-pop');
    surface?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await element.updateComplete;
    expect(element.open).toBe(false);
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
  });
});
