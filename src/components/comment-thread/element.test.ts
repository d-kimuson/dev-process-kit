import { afterEach, describe, expect, it } from 'vitest';

import { defineCommentThread, type DpkCommentThread } from './index';

defineCommentThread();

const mount = async (
  attributes = '',
  comments: readonly { id: string; body: string; createdAt?: string }[] = [],
): Promise<DpkCommentThread> => {
  document.body.innerHTML = `<dpk-comment-thread ${attributes}></dpk-comment-thread>`;
  const thread = document.querySelector('dpk-comment-thread') as DpkCommentThread;
  thread.comments = comments;
  await thread.updateComplete;
  return thread;
};

const textarea = (thread: DpkCommentThread): HTMLTextAreaElement | null =>
  thread.renderRoot.querySelector<HTMLTextAreaElement>('textarea');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-comment-thread inline', () => {
  it('shows the empty state with no comments', async () => {
    const thread = await mount('inline');
    expect(thread.renderRoot.querySelector('.thread-empty')).not.toBeNull();
    expect(thread.renderRoot.querySelector('.thread-list')).toBeNull();
  });

  it('lists comments with their body and time', async () => {
    const thread = await mount('inline', [{ id: 'c1', body: 'Looks good', createdAt: '2026-01-01T12:00:00.000Z' }]);
    const items = thread.renderRoot.querySelectorAll('.thread-list li');
    expect(items).toHaveLength(1);
    expect(items[0]?.querySelector('.thread-item-body')?.textContent).toBe('Looks good');
    expect(items[0]?.querySelector('time')).not.toBeNull();
  });

  it('has no trigger button or Cancel button inline', async () => {
    const thread = await mount('inline');
    expect(thread.renderRoot.querySelector('.thread-trigger')).toBeNull();
    expect(thread.renderRoot.querySelector('[data-dpk-text-discard]')).toBeNull();
  });

  it('adds a comment, clearing the field once the host accepts it', async () => {
    const thread = await mount('inline');
    const added: string[] = [];
    thread.addEventListener('dpk-thread-comment-add', (event) => {
      added.push((event as CustomEvent<{ body: string }>).detail.body);
      event.preventDefault();
    });
    const field = textarea(thread);
    expect(field).not.toBeNull();
    field!.value = '  Needs a test  ';
    thread.renderRoot.querySelector('form')?.requestSubmit();
    await thread.updateComplete;
    expect(added).toEqual(['Needs a test']);
    expect(field!.value).toBe('');
    expect(thread.renderRoot.querySelector('.thread-error')).toBeNull();
  });

  it('keeps the text and shows an error when the host rejects the add', async () => {
    const thread = await mount('inline');
    const field = textarea(thread);
    field!.value = 'Rejected';
    thread.renderRoot.querySelector('form')?.requestSubmit();
    await thread.updateComplete;
    expect(field!.value).toBe('Rejected');
    expect(thread.renderRoot.querySelector('.thread-error')).not.toBeNull();
  });

  it('does not submit a blank comment', async () => {
    const thread = await mount('inline');
    const added: unknown[] = [];
    thread.addEventListener('dpk-thread-comment-add', (event) => added.push(event));
    const field = textarea(thread);
    field!.value = '   ';
    thread.renderRoot.querySelector('form')?.requestSubmit();
    await thread.updateComplete;
    expect(added).toHaveLength(0);
  });

  it('submits with ctrl+enter from the field', async () => {
    const thread = await mount('inline');
    const added: string[] = [];
    thread.addEventListener('dpk-thread-comment-add', (event) => {
      added.push((event as CustomEvent<{ body: string }>).detail.body);
      event.preventDefault();
    });
    const field = textarea(thread)!;
    field.value = 'Shortcut';
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    await thread.updateComplete;
    expect(added).toEqual(['Shortcut']);
  });

  it('asks the host to delete a comment and leaves the list to it', async () => {
    const thread = await mount('inline', [{ id: 'c1', body: 'Remove me' }]);
    const deleted: string[] = [];
    thread.addEventListener('dpk-thread-comment-delete', (event) => {
      deleted.push((event as CustomEvent<{ id: string }>).detail.id);
    });
    thread.renderRoot.querySelector<HTMLButtonElement>('.thread-list [data-role="delete-comment"]')?.click();
    expect(deleted).toEqual(['c1']);
  });

  it('forwards draft-key to the field as its text-recovery key', async () => {
    const thread = await mount('inline draft-key="story:1:comment"');
    expect(textarea(thread)?.dataset['dpkTextKey']).toBe('story:1:comment');
  });
});

describe('dpk-comment-thread popover', () => {
  it('starts closed, with a trigger badge and no popover surface', async () => {
    const thread = await mount();
    expect(thread.renderRoot.querySelector('.thread-trigger')).not.toBeNull();
    expect(thread.renderRoot.querySelector('.thread-pop')).toBeNull();
  });

  it('shows the comment count on the trigger', async () => {
    const thread = await mount('', [
      { id: 'c1', body: 'a' },
      { id: 'c2', body: 'b' },
    ]);
    expect(thread.renderRoot.querySelector('.thread-trigger span')?.textContent).toBe('2');
  });

  it('opens the popover from the trigger and closes it from Escape or Cancel', async () => {
    const thread = await mount();
    const trigger = thread.renderRoot.querySelector<HTMLButtonElement>('.thread-trigger')!;
    trigger.click();
    await thread.updateComplete;
    expect(thread.renderRoot.querySelector('.thread-pop')).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    thread.renderRoot
      .querySelector('.thread-pop')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await thread.updateComplete;
    expect(thread.renderRoot.querySelector('.thread-pop')).toBeNull();

    trigger.click();
    await thread.updateComplete;
    thread.renderRoot.querySelector<HTMLButtonElement>('[data-dpk-text-discard]')?.click();
    await thread.updateComplete;
    expect(thread.renderRoot.querySelector('.thread-pop')).toBeNull();
  });
});
