/**
 * One comment kept on a card, like a description or a label: part of the
 * host template's own domain data, not a review comment for the agent (which
 * travels through the review rail and leaves with the draft instead).
 */
export type CommentThreadItem = {
  readonly id: string;
  readonly body: string;
  /** When it was written, as an ISO timestamp; left out, the time is not shown. */
  readonly createdAt?: string;
};
