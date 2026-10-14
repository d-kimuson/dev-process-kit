/**
 * The effects behind the change notices: reading the change log the author
 * wrote, remembering what this reader has seen, the toasts' timers and closing
 * the list when the reader clicks elsewhere.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  CHANGES_ATTRIBUTE,
  initialNotices,
  parseChangeLog,
  parseSeenRecord,
  presentNotices,
  reduceNotices,
  revisionsOf,
  seenRecordOf,
  type ChangeEntry,
  type ChangeLog,
  type NoticeEvent,
  type NoticeState,
  type NoticeViewModel,
  type SeenRecord,
  type ToastHold,
} from '../changes';

/** Long enough to read a title and decide whether to look. */
export const TOAST_MS = 8000;

type ToastTimer = { handle: ReturnType<typeof setTimeout> | null; deadline: number; remaining: number };

export type ChangeNoticeOptions = {
  readonly persist: () => boolean;
  readonly storageKey: () => string;
  /** The reader's click landed on the list or the button that opens it. */
  readonly inside: (path: readonly EventTarget[]) => boolean;
  /** Takes the reader to the change. */
  readonly show: (entry: ChangeEntry) => void;
};

const isChangeScript = (node: Element): boolean =>
  node.localName === 'script' &&
  node.getAttribute('type') === 'application/json' &&
  node.hasAttribute(CHANGES_ATTRIBUTE);

export class ChangeNoticeController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: ChangeNoticeOptions;
  #log: ChangeLog | null = null;
  #error: string | null = null;
  #state: NoticeState | null = null;
  #store: JsonStore<SeenRecord> | null = null;
  /** The record last written, so an event that changes nothing stored writes nothing. */
  #written = '';
  #observer: MutationObserver | null = null;
  readonly #timers = new Map<string, ToastTimer>();
  /** Why the toasts hold still; they run again once nothing holds them. */
  readonly #holds = new Set<ToastHold>();

  constructor(host: ReactiveControllerHost & HTMLElement, options: ChangeNoticeOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** `null` when the page has no change log. */
  get view(): NoticeViewModel | null {
    return this.#log && this.#state ? presentNotices(this.#log, this.#state) : null;
  }

  /** Why the change log could not be read, for the author. */
  get error(): string | null {
    return this.#error;
  }

  hostConnected(): void {
    if (!this.#settled() && !this.#read()) this.#watchForScript();
    document.addEventListener('pointerdown', this.#onPointerDown, true);
    document.addEventListener('keydown', this.#onKeyDown);
  }

  /** The change log may have arrived with the base data, before the observer reports it. */
  hostUpdate(): void {
    if (!this.#settled() && this.#read()) this.#stopWatching();
  }

  hostDisconnected(): void {
    this.#stopWatching();
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    document.removeEventListener('keydown', this.#onKeyDown);
    for (const timer of this.#timers.values()) if (timer.handle !== null) clearTimeout(timer.handle);
    this.#timers.clear();
  }

  send(event: NoticeEvent): void {
    if (!this.#log || !this.#state) return;
    this.#state = reduceNotices(this.#log, this.#state, event);
    this.#remember();
    this.#syncTimers();
    this.#host.requestUpdate();
  }

  toggleList(): void {
    this.send({ kind: this.#state?.list.open ? 'close-list' : 'open-list' });
  }

  show(key: string): void {
    const entry = this.#log
      ? revisionsOf(this.#log)
          .flatMap((revision) => revision.entries)
          .find((candidate) => candidate.key === key)
      : undefined;
    if (!entry) return;
    this.send({ kind: 'jump', key });
    this.#options.show(entry);
  }

  /** The reader is reading a toast: none of them times out meanwhile. */
  pause(hold: ToastHold): void {
    const held = this.#holds.size > 0;
    this.#holds.add(hold);
    if (held) return;
    const now = Date.now();
    for (const timer of this.#timers.values()) {
      if (timer.handle !== null) clearTimeout(timer.handle);
      timer.handle = null;
      timer.remaining = Math.max(0, timer.deadline - now);
    }
  }

  resume(hold: ToastHold): void {
    if (!this.#holds.delete(hold) || this.#holds.size > 0) return;
    for (const [key, timer] of this.#timers) this.#start(key, timer);
  }

  #key(): string {
    return `${this.#options.storageKey()}:seen-changes`;
  }

  /** Read once: as a valid log, or as the error that names what is wrong with it. */
  #settled(): boolean {
    return this.#log !== null || this.#error !== null;
  }

  /** `false` when there is no change log yet. */
  #read(): boolean {
    const script = [...this.#host.children].find(isChangeScript);
    if (!script) return false;
    let input: unknown;
    try {
      input = JSON.parse(script.textContent ?? '');
    } catch (error) {
      return this.#fail(error instanceof Error ? error.message : String(error));
    }
    const parsed = parseChangeLog(input);
    if (!parsed.ok) return this.#fail(parsed.error);
    this.#log = parsed.log;
    this.#store = this.#options.persist() ? defaultJsonStore(parseSeenRecord) : memoryJsonStore(parseSeenRecord);
    this.#state = initialNotices(parsed.log, this.#store.read(this.#key()));
    // Written at once: the next version is told from this one on, even if the reader looks at nothing now.
    this.#remember();
    this.#syncTimers();
    this.#host.requestUpdate();
    return true;
  }

  #remember(): void {
    if (!this.#log || !this.#state) return;
    const record = seenRecordOf(this.#log, this.#state);
    const serialized = JSON.stringify(record);
    if (serialized === this.#written) return;
    this.#written = serialized;
    this.#store?.write(this.#key(), record);
  }

  #fail(message: string): true {
    console.error('[dev-process-kit] invalid change log:', message);
    this.#error = message;
    this.#host.requestUpdate();
    return true;
  }

  /** The change log may be appended after the element is upgraded (streaming HTML). */
  #watchForScript(): void {
    this.#observer = new MutationObserver(() => {
      if (this.#settled() || this.#read()) this.#stopWatching();
    });
    this.#observer.observe(this.#host, { childList: true });
  }

  #stopWatching(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  #syncTimers(): void {
    const visible = new Set(this.view?.toasts.map((toast) => toast.key) ?? []);
    for (const [key, timer] of this.#timers) {
      if (visible.has(key)) continue;
      if (timer.handle !== null) clearTimeout(timer.handle);
      this.#timers.delete(key);
    }
    for (const key of visible) {
      if (this.#timers.has(key)) continue;
      const timer: ToastTimer = { handle: null, deadline: 0, remaining: TOAST_MS };
      this.#timers.set(key, timer);
      if (this.#holds.size === 0) this.#start(key, timer);
    }
  }

  #start(key: string, timer: ToastTimer): void {
    timer.deadline = Date.now() + timer.remaining;
    timer.handle = setTimeout(() => {
      timer.handle = null;
      this.send({ kind: 'close-toast', key });
    }, timer.remaining);
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (!this.#state?.list.open || this.#options.inside(event.composedPath())) return;
    this.send({ kind: 'close-list' });
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#state?.list.open) return;
    this.send({ kind: 'close-list' });
  };
}
