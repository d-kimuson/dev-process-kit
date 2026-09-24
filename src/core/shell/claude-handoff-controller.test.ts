// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { COMMENT_TEXT_LIMIT } from '../claude-handoff';
import { claudeHandoffOver, connectClaudeHandoff } from './claude-handoff-controller';

const fakeComments = (overrides: Record<string, unknown> = {}) => ({
  anchorFor: vi.fn(async () => ({ path: 'body', x: 0, y: 0 })),
  canSendToClaude: vi.fn(async () => 'available'),
  sendToClaude: vi.fn(async () => ({ threadId: 't', commentId: 'c' })),
  ...overrides,
});

const fakeDb = () => {
  const set = vi.fn(async () => undefined);
  return { set, db: { collection: vi.fn((path: string) => ({ doc: () => ({ path: `${path}/r1`, set }) })) } };
};

const anchor = () => document.body;
const long = 'x'.repeat(COMMENT_TEXT_LIMIT);

describe('connectClaudeHandoff', () => {
  it('stays off outside the Artifact viewer', async () => {
    expect(await connectClaudeHandoff(undefined)).toBeNull();
    expect(await connectClaudeHandoff({})).toBeNull();
  });

  it('stays off when the comments capability is not granted', async () => {
    expect(await connectClaudeHandoff({ use: async () => null })).toBeNull();
    expect(
      await connectClaudeHandoff({
        use: async () => {
          throw new Error('nope');
        },
      }),
    ).toBeNull();
  });

  it('offers the send only when the viewer can reach Claude', async () => {
    const comments = fakeComments({ canSendToClaude: vi.fn(async () => 'writers_only') });
    const handoff = await connectClaudeHandoff({
      use: async (name: string) => (name === 'comments' ? comments : null),
    });
    expect(handoff).not.toBeNull();
    expect(await handoff?.canSend()).toBe(false);
  });
});

describe('claudeHandoffOver', () => {
  it('sends a short brief inline, pinned to the given element', async () => {
    const comments = fakeComments();
    const outcome = await claudeHandoffOver(comments, null).send({ brief: '# brief', draft: '[]', anchor: anchor() });
    expect(outcome).toEqual({ ok: true });
    expect(comments.anchorFor).toHaveBeenCalledWith(document.body);
    expect(comments.sendToClaude).toHaveBeenCalledWith({
      anchor: { path: 'body', x: 0, y: 0 },
      text: expect.stringContaining('# brief'),
    });
  });

  it('stores a long brief first and points the agent at it', async () => {
    const comments = fakeComments();
    const { db, set } = fakeDb();
    const outcome = await claudeHandoffOver(comments, db).send({ brief: long, draft: '[1]', anchor: anchor() });
    expect(outcome).toEqual({ ok: true });
    expect(db.collection).toHaveBeenCalledWith('reviews');
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ brief: long, draft: '[1]' }));
    expect(comments.sendToClaude).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('`reviews/r1`') }),
    );
  });

  it('refuses a long brief when there is nowhere to store it', async () => {
    const comments = fakeComments();
    const outcome = await claudeHandoffOver(comments, null).send({ brief: long, draft: '[]', anchor: anchor() });
    expect(outcome).toEqual({ ok: false, reason: 'too_large' });
    expect(comments.sendToClaude).not.toHaveBeenCalled();
  });

  it('does not send when storing the brief fails', async () => {
    const comments = fakeComments();
    const db = {
      collection: () => ({ doc: () => ({ path: 'reviews/r1', set: async () => Promise.reject(new Error('quota')) }) }),
    };
    const outcome = await claudeHandoffOver(comments, db).send({ brief: long, draft: '[]', anchor: anchor() });
    expect(outcome).toEqual({ ok: false, reason: 'storage' });
    expect(comments.sendToClaude).not.toHaveBeenCalled();
  });

  it('reports the rejection code of the send', async () => {
    const comments = fakeComments({
      sendToClaude: vi.fn(async () => Promise.reject({ code: 'consent_required', message: '' })),
    });
    const outcome = await claudeHandoffOver(comments, null).send({ brief: '#', draft: '[]', anchor: anchor() });
    expect(outcome).toEqual({ ok: false, reason: 'consent' });
  });
});
