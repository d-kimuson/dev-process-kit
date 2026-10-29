/**
 * The base JSON an element starts from, and keeps up with.
 *
 * A base block is not necessarily there when the element upgrades: a parser
 * may stream the HTML, an agent may write the JSON after the markup, and a
 * page the draft added has no base at all yet. The same block may also be
 * invalid when it first appears and be fixed later. This controller owns that
 * one story — reading, watching and the error it shows — so a banner can
 * never outlive the data that caused it: adopting valid data clears the
 * error, and adopting invalid data keeps both in step.
 */
export type BaseRead<S> = {
  /** The state the element shows: what the block says, or the content's empty base. */
  readonly state: S;
  /** Why the block could not be read, for the element's banner; `null` once it reads. */
  readonly error: string | null;
};

export type BaseSource<S> = {
  /** The element whose light DOM the block lives in; the controller watches it. */
  readonly host: Element;
  /** The element's own name for logs (`<dpk-view-usm>`). */
  readonly name: () => string;
  /** The block, read the way this element reads it (`scriptOf`). */
  readonly script: () => Element | null;
  readonly parse: (input: unknown) => S;
  readonly empty: () => S;
  /**
   * Whether having no readable block is normal. A page the draft added starts
   * without one: the agent writes it from the draft, so waiting silently is
   * the right answer there.
   */
  readonly optional: () => boolean;
  /** Called with every state adopted after the initial read. */
  readonly onChange: (read: BaseRead<S>) => void;
};

const EMPTY_BLOCK = 'the <script type="application/json"> child is empty';
const MISSING_BLOCK = 'no <script type="application/json"> child found';

export class BaseDataController<S> {
  readonly #source: BaseSource<S>;
  /** The text last read; `undefined` before the first read, `null` without a block. */
  #text: string | null | undefined;
  #error: string | null = null;
  #observer: MutationObserver | undefined;

  constructor(source: BaseSource<S>) {
    this.#source = source;
  }

  /** Why the base could not be read; `null` while it reads. */
  get error(): string | null {
    return this.#error;
  }

  /** Reads the block now; the caller starts its draft from the state it returns. */
  read(): S {
    return this.#adopt(this.#textOf()).state;
  }

  /**
   * Watches for a block written or changed after the read: a script appended
   * later, an empty one filled in, an invalid one fixed.
   */
  observe(): void {
    if (this.#observer !== undefined) return;
    this.#observer = new MutationObserver(() => this.#refresh());
    this.#observer.observe(this.#source.host, { childList: true, subtree: true, characterData: true });
  }

  disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
  }

  #refresh(): void {
    const text = this.#textOf();
    if (text === this.#text) return;
    this.#source.onChange(this.#adopt(text));
  }

  #textOf(): string | null {
    const script = this.#source.script();
    return script === null ? null : (script.textContent ?? '');
  }

  #adopt(text: string | null): BaseRead<S> {
    this.#text = text;
    if (text === null || text.trim().length === 0) {
      // An optional block may still arrive; only its absence is not an error
      // once this element is expected to have one.
      if (this.#source.optional()) {
        this.#error = null;
      } else {
        this.#error = text === null ? MISSING_BLOCK : EMPTY_BLOCK;
        console.warn(
          `[dev-process-kit] ${this.#source.name()} has ${text === null ? 'no' : 'an empty'} base JSON; starting from an empty state.`,
        );
      }
      return { state: this.#source.empty(), error: this.#error };
    }
    try {
      const state = this.#source.parse(JSON.parse(text));
      this.#error = null;
      return { state, error: null };
    } catch (error) {
      console.error('[dev-process-kit] invalid base data:', error);
      this.#error = error instanceof Error ? error.message : String(error);
      return { state: this.#source.empty(), error: this.#error };
    }
  }
}
