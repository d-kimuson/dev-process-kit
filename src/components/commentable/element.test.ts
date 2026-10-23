import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ContextMenuRequest } from '../../core/context-menu/types';

import { parseTargetRef } from '../../core/target';
import { DpkCommentable } from './element';
import { defineCommentable } from './index';
import { commentableMessages } from './messages';

const m = commentableMessages('en');

defineCommentable();

afterEach(() => {
  document.body.replaceChildren();
});

const mount = async (id = 'doc'): Promise<DpkCommentable> => {
  const element = document.createElement('dpk-commentable');
  if (!(element instanceof DpkCommentable)) throw new Error('did not upgrade');
  if (id) element.id = id;
  element.heading = 'Doc';
  element.innerHTML = `
    <section data-dpk-item="section:risks">
      <h3>Risks</h3>
      <p data-dpk-item="risk:timeout">The refund API can time out.</p>
      <p data-dpk-item="risk:timeout">A duplicate id, dropped as ambiguous.</p>
    </section>
  `;
  document.body.append(element);
  for (let index = 0; index < 3; index++) await element.updateComplete;
  return element;
};

/** Runs the right-click "Review comment" action for a target. */
const reviewComment = (element: DpkCommentable, ref: string): void => {
  const request: ContextMenuRequest = { clientX: 0, clientY: 0, target: parseTargetRef(ref) };
  const groups = element.getContextMenuItems(request) ?? [];
  const entry = groups.flatMap((group) => group.entries).find((candidate) => candidate.id === 'review-comment');
  if (entry?.kind === 'item') entry.run();
};

describe('dpk-commentable', () => {
  it('lists every uniquely marked item as a comment target, grouped by heading and id', async () => {
    const element = await mount();
    expect(element.commentTargets).toEqual([
      { value: 'element:doc/section/risks', label: 'Risks', group: 'Doc · doc' },
    ]);
  });

  it('has no comment targets without an id', async () => {
    const element = await mount('');
    expect(element.commentTargets).toEqual([]);
  });

  it('marks only the unique items with the attribute the context menu and popover anchor use', async () => {
    const element = await mount();
    expect(element.querySelector('[data-dpk-item="section:risks"]')?.getAttribute('data-dpk-target')).toBe(
      'element:doc/section/risks',
    );
    for (const paragraph of element.querySelectorAll('[data-dpk-item="risk:timeout"]'))
      expect(paragraph.getAttribute('data-dpk-target')).toBeNull();
  });

  it('opens the comment popover on the marked element and submits it to the enclosing template', async () => {
    const element = await mount();
    const submitted = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('dpk-comment-submit', submitted);
    reviewComment(element, 'element:doc/section/risks');
    await element.updateComplete;
    const textarea = element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea');
    if (!textarea) throw new Error('no composer');
    textarea.value = 'Who owns the retry budget?';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    const submit = element.renderRoot.querySelector<HTMLButtonElement>('.comment-pop .dpk-btn--accent');
    if (!submit) throw new Error('no submit button');
    submit.click();
    await element.updateComplete;
    expect(submitted).toHaveBeenCalledOnce();
    const event = submitted.mock.calls[0]?.[0];
    expect(event instanceof CustomEvent ? event.detail : null).toEqual({
      target: 'element:doc/section/risks',
      body: 'Who owns the retry budget?',
    });
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
  });

  it('keeps the comment and says why when no template saves it', async () => {
    const element = await mount();
    reviewComment(element, 'element:doc/section/risks');
    await element.updateComplete;
    const textarea = element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea');
    if (!textarea) throw new Error('no composer');
    textarea.value = 'Too weak';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    const submit = element.renderRoot.querySelector<HTMLButtonElement>('.comment-pop .dpk-btn--accent');
    if (!submit) throw new Error('no submit button');
    submit.click();
    await element.updateComplete;
    const error = element.renderRoot.querySelector('.comment-pop .comment-error');
    expect(error?.textContent).toBe(m.sendFailed);
    expect(element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea')?.value).toBe('Too weak');
  });

  it('offers no "Review comment" item for a target it does not own', async () => {
    const element = await mount();
    const groups = element.getContextMenuItems({ clientX: 0, clientY: 0, target: { type: 'element', id: 'other' } });
    expect(groups).toBeNull();
  });
});
