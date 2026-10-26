import { describe, expect, it } from 'vitest';

import { prototypeMessages } from './messages';

const en = prototypeMessages('en');
const ja = prototypeMessages('ja');

describe('prototype messages', () => {
  describe('the UI comment composer', () => {
    it('names the left tab a review comment', () => {
      expect(en.uiCommentFeedback).toBe('Review comment');
      expect(ja.uiCommentFeedback).toBe('レビューコメント');
    });

    it('says a review comment is sent to the agent as a message, and is gone once reflected', () => {
      expect(en.uiCommentFeedbackHint).toContain('Sent to the Agent as a message.');
      expect(ja.uiCommentFeedbackHint).toContain('Agent へのメッセージとして送信されます。');
    });

    it('keeps the note tab and its hint', () => {
      expect(en.uiCommentNote).toBe('Note');
      expect(ja.uiCommentNote).toBe('メモ');
      expect(ja.uiCommentNoteHint).toBe(
        'プロトタイプの一部として要素に残り、シナリオビューでバッジとして表示されます。',
      );
    });
  });
});
