/**
 * The effects behind "Send to Claude": reaching the Claude Artifact viewer's
 * `comments` / `db` capabilities through `window.claude`, and keeping the
 * button's availability current. Outside an Artifact (or when the publisher did
 * not declare `comments`) nothing lights up and the page keeps its copy buttons.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import {
  REVIEW_COLLECTION,
  handoffFailureOf,
  inlineHandoffText,
  storedHandoffText,
  type HandoffOutcome,
} from '../claude-handoff';

export type HandoffInput = {
  readonly brief: string;
  readonly draft: string;
  /** The element the comment thread is pinned to. */
  readonly anchor: Element;
};

export type ClaudeHandoff = {
  canSend(): Promise<boolean>;
  send(input: HandoffInput): Promise<HandoffOutcome>;
};

// The capability namespaces are external input: only the members used here
// are assumed, and each is checked before the handoff is offered.
type CommentsApi = {
  anchorFor(element: Element): Promise<unknown>;
  canSendToClaude(): Promise<unknown>;
  sendToClaude(target: { anchor: unknown; text: string }): Promise<unknown>;
};
type DocRef = { readonly path: string; set(data: Record<string, unknown>): Promise<void> };
type DbApi = { collection(path: string): { doc(): DocRef } };

type ClaudeApi = { use(name: string): unknown };

const hasMethods = (value: unknown, names: readonly string[]): boolean =>
  typeof value === 'object' && value !== null && names.every((name) => typeof Reflect.get(value, name) === 'function');

const isClaude = (value: unknown): value is ClaudeApi => hasMethods(value, ['use']);

const isComments = (value: unknown): value is CommentsApi =>
  hasMethods(value, ['anchorFor', 'canSendToClaude', 'sendToClaude']);

const isDb = (value: unknown): value is DbApi => hasMethods(value, ['collection']);

const useCapability = async (claude: ClaudeApi, name: string): Promise<unknown> => {
  try {
    return await claude.use(name);
  } catch {
    return null;
  }
};

export const claudeHandoffOver = (comments: CommentsApi, db: DbApi | null): ClaudeHandoff => ({
  async canSend() {
    try {
      return (await comments.canSendToClaude()) === 'available';
    } catch {
      return false;
    }
  },
  async send({ brief, draft, anchor }) {
    let text = inlineHandoffText(brief);
    if (text === null) {
      if (db === null) return { ok: false, reason: 'too_large' };
      try {
        const doc = db.collection(REVIEW_COLLECTION).doc();
        await doc.set({ brief, draft, createdAt: new Date().toISOString() });
        text = storedHandoffText(doc.path);
      } catch {
        return { ok: false, reason: 'storage' };
      }
    }
    try {
      await comments.sendToClaude({ anchor: await comments.anchorFor(anchor), text });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: handoffFailureOf(error) };
    }
  },
});

/** `null` unless this view can send comments to Claude at all. */
export const connectClaudeHandoff = async (claude: unknown): Promise<ClaudeHandoff | null> => {
  if (!isClaude(claude)) return null;
  const [comments, db] = await Promise.all([useCapability(claude, 'comments'), useCapability(claude, 'db')]);
  return isComments(comments) ? claudeHandoffOver(comments, isDb(db) ? db : null) : null;
};

const viewerClaude = (): unknown => Reflect.get(globalThis, 'claude');

export class ClaudeHandoffController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #source: () => unknown;
  #handoff: Promise<ClaudeHandoff | null> | null = null;
  #available = false;

  constructor(host: ReactiveControllerHost, source: () => unknown = viewerClaude) {
    this.#host = host;
    this.#source = source;
    host.addController(this);
  }

  /** Whether to offer the button now. A snapshot: it is re-checked on focus and after each send. */
  get available(): boolean {
    return this.#available;
  }

  hostConnected(): void {
    this.#handoff ??= connectClaudeHandoff(this.#source());
    void this.#refresh();
    // Watching Claude sessions come and go: re-check when the reader comes back.
    window.addEventListener('focus', this.#refresh);
  }

  hostDisconnected(): void {
    window.removeEventListener('focus', this.#refresh);
  }

  async send(input: HandoffInput): Promise<HandoffOutcome> {
    const handoff = await this.#handoff;
    if (!handoff) return { ok: false, reason: 'forbidden' };
    const outcome = await handoff.send(input);
    void this.#refresh();
    return outcome;
  }

  #refresh = async (): Promise<void> => {
    const handoff = await this.#handoff;
    const available = handoff ? await handoff.canSend() : false;
    if (available === this.#available) return;
    this.#available = available;
    this.#host.requestUpdate();
  };
}
