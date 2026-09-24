/**
 * Handing a review to Claude from inside a Claude Artifact.
 *
 * The viewer's comment channel reaches the Claude session that published the
 * page (`sendToClaude`), but one comment carries at most 4 KiB. A brief that
 * fits goes inline; a longer one is stored in the artifact's database and the
 * comment points the agent at it. Everything here is pure: the adapter in
 * `shell/claude-handoff-controller.ts` owns the calls.
 */

import type { Locale } from './i18n';

import { coreMessages } from './messages';

/** The comment store's limit on one comment, in UTF-8 bytes. */
export const COMMENT_TEXT_LIMIT = 4096;

/** Collection the long briefs are stored in; the agent reads it back with ArtifactData. */
export const REVIEW_COLLECTION = 'reviews';

export type HandoffFailure =
  | 'too_large'
  | 'consent'
  | 'forbidden'
  | 'claude_unavailable'
  | 'rate_limited'
  | 'storage'
  | 'error';

export type HandoffOutcome = { readonly ok: true } | { readonly ok: false; readonly reason: HandoffFailure };

const INTRO = 'Review from the page (dev-process-kit). Apply it to the base data and republish this artifact.';

export const utf8Length = (text: string): number => new TextEncoder().encode(text).length;

/** The comment store rejects control characters other than newlines and tabs. */
// oxlint-disable-next-line no-control-regex -- stripping them is the point
const sanitize = (text: string): string => text.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');

/** The whole brief as one comment, or `null` when it does not fit. */
export const inlineHandoffText = (brief: string): string | null => {
  const text = `${INTRO}\n\n${sanitize(brief)}`;
  return utf8Length(text) <= COMMENT_TEXT_LIMIT ? text : null;
};

/** The comment that points the agent at a brief stored under `path`. */
export const storedHandoffText = (path: string): string =>
  `${INTRO}\n\n` +
  `The brief is too long for a comment, so it is stored in this artifact's database: ` +
  `read the document \`${path}\` (\`brief\` is the review, \`draft\` the raw draft JSON).`;

const FAILURE_BY_CODE: Readonly<Record<string, HandoffFailure>> = {
  consent_required: 'consent',
  forbidden: 'forbidden',
  not_granted: 'forbidden',
  capability_disabled: 'forbidden',
  capability_removed: 'forbidden',
  claude_unavailable: 'claude_unavailable',
  rate_limited: 'rate_limited',
};

/** Rejections are `{ code, message }`; branch on the code, never on the message. */
export const handoffFailureOf = (error: unknown): HandoffFailure => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return (typeof code === 'string' ? FAILURE_BY_CODE[code] : undefined) ?? 'error';
};

const FAILURE_MESSAGES = {
  too_large: 'handoffTooLarge',
  consent: 'handoffConsent',
  forbidden: 'handoffForbidden',
  claude_unavailable: 'handoffClaudeUnavailable',
  rate_limited: 'handoffRateLimited',
  storage: 'handoffStorage',
  error: 'handoffError',
} as const satisfies Record<HandoffFailure, keyof ReturnType<typeof coreMessages>>;

export const handoffFailureLabel = (reason: HandoffFailure, locale: Locale): string =>
  coreMessages(locale)[FAILURE_MESSAGES[reason]];
