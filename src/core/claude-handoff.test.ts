import { describe, expect, it } from 'vitest';

import {
  COMMENT_TEXT_LIMIT,
  handoffFailureLabel,
  handoffFailureOf,
  inlineHandoffText,
  storedHandoffText,
  utf8Length,
} from './claude-handoff';
import { coreMessages } from './messages';

describe('inlineHandoffText', () => {
  it('puts the brief under an instruction to apply and republish', () => {
    const text = inlineHandoffText('# Review draft');
    expect(text).toMatch(/republish/);
    expect(text?.endsWith('# Review draft')).toBe(true);
  });

  it('drops control characters the comment store rejects, keeping newlines and tabs', () => {
    expect(inlineHandoffText('a\r\n\tb\u0007c')).toMatch(/a\n\tbc$/);
  });

  it('gives up when the brief does not fit one comment, counting UTF-8 bytes', () => {
    const intro = utf8Length(inlineHandoffText('') ?? '');
    const room = COMMENT_TEXT_LIMIT - intro;
    expect(inlineHandoffText('a'.repeat(room))).not.toBeNull();
    expect(inlineHandoffText('a'.repeat(room + 1))).toBeNull();
    // Three bytes per character: a third of the room is the most that fits.
    expect(inlineHandoffText('あ'.repeat(Math.floor(room / 3) + 1))).toBeNull();
  });
});

describe('storedHandoffText', () => {
  it('points the agent at the stored document', () => {
    const text = storedHandoffText('reviews/abc');
    expect(text).toContain('`reviews/abc`');
    expect(utf8Length(text)).toBeLessThan(COMMENT_TEXT_LIMIT);
  });
});

describe('handoffFailureOf', () => {
  it('reads the error code of a rejection', () => {
    expect(handoffFailureOf({ code: 'consent_required', message: '' })).toBe('consent');
    expect(handoffFailureOf({ code: 'claude_unavailable' })).toBe('claude_unavailable');
    expect(handoffFailureOf({ code: 'rate_limited' })).toBe('rate_limited');
    expect(handoffFailureOf({ code: 'not_granted' })).toBe('forbidden');
  });

  it('treats anything unknown as a generic failure', () => {
    expect(handoffFailureOf(new Error('boom'))).toBe('error');
    expect(handoffFailureOf({ code: 'something_new' })).toBe('error');
  });
});

describe('handoffFailureLabel', () => {
  it('tells the reader what to do instead, in the page language', () => {
    expect(handoffFailureLabel('too_large', 'en')).toBe(coreMessages('en').handoffTooLarge);
    expect(handoffFailureLabel('storage', 'ja')).toBe(coreMessages('ja').handoffStorage);
  });
});
