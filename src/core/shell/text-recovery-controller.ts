/**
 * Keeps the reader's unsent text through a reload: every text field the kit
 * renders inside the template (its own and its nested components') is watched
 * through the composed `focusin` and `input` events, so no field has to opt in.
 * The author's own markup in the light DOM (a prototype's mock form) is left
 * alone. See `text-recovery.ts` for what is kept and when it comes back.
 *
 * A button marked `data-dpk-text-discard` (a Cancel beside the field) throws
 * the text away: a click on it forgets the fields it sits with.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { memoryJsonStore, sessionJsonStore, type JsonStore } from '../../lib/dom/json-store';
import {
  forgetUnsentText,
  parseUnsentTexts,
  recordUnsentText,
  textToRestore,
  unsentTextId,
  type UnsentTexts,
} from '../text-recovery';

export type TextRecoveryOptions = {
  /** Read on first connect: `storage="off"` / `"memory"` keeps the text to this page load. */
  readonly persist: () => boolean;
  /** The session record's key, read on first connect. */
  readonly storageKey: () => string;
};

type TextField = HTMLInputElement | HTMLTextAreaElement;

/** Input types whose value is text the reader writes. */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'email', 'tel']);

const textFieldOf = (node: EventTarget | undefined): TextField | null => {
  if (node instanceof HTMLTextAreaElement) return node;
  if (node instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(node.type)) return node;
  return null;
};

/** Tag names of the custom elements between `host` and `field`, or `null` when `host`'s shadow does not hold it. */
const hostsBetween = (host: Element, field: Element): readonly string[] | null => {
  const hosts: string[] = [];
  let root = field.getRootNode();
  while (root instanceof ShadowRoot) {
    if (root.host === host) return hosts;
    hosts.unshift(root.host.localName);
    root = root.host.getRootNode();
  }
  return null;
};

/** `data-dpk-text-key` of the field or its nearest ancestor, across shadow boundaries. */
const keyOf = (field: Element): string | undefined => {
  let node: Element | null = field;
  while (node !== null) {
    const key = node.getAttribute('data-dpk-text-key');
    if (key !== null && key !== '') return key;
    const root = node.getRootNode();
    node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return undefined;
};

/** The button a click landed on, when it throws its fields' text away. */
const discardOf = (event: Event): Element | null =>
  event
    .composedPath()
    .find((node): node is Element => node instanceof Element && node.hasAttribute('data-dpk-text-discard')) ?? null;

/** The fields among `fields` beside `button`: those in its nearest ancestor that holds any of them. */
const fieldsBeside = (button: Element, fields: Iterable<TextField>): readonly TextField[] => {
  const candidates = [...fields];
  for (let node = button.parentElement; node !== null; node = node.parentElement) {
    const beside = candidates.filter((field) => node.contains(field));
    if (beside.length > 0) return beside;
  }
  return [];
};

const nameOf = (field: TextField): string =>
  field.getAttribute('aria-label') ?? (field.placeholder || field.name || field.localName);

/** Every string in an action payload: the text a field sent may sit at any depth. */
const stringsIn = (value: unknown): readonly string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(stringsIn);
  return [];
};

/** Fields commit their text trimmed, and a one-line field with its line breaks folded. */
const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim();

export class TextRecoveryController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: TextRecoveryOptions;
  #store: JsonStore<UnsentTexts> | null = null;
  #key = '';
  /** The record each field has filed its text under since it opened. */
  readonly #fields = new WeakMap<TextField, { readonly id: string; readonly base: string }>();
  /** Fields with unsent text that are, or were lately, on screen. */
  readonly #typed = new Set<TextField>();

  constructor(host: ReactiveControllerHost & HTMLElement, options: TextRecoveryOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.#store === null) {
      this.#store = this.#options.persist() ? sessionJsonStore(parseUnsentTexts) : memoryJsonStore(parseUnsentTexts);
      this.#key = this.#options.storageKey();
    }
    this.#host.addEventListener('focusin', this.#onFocusIn);
    this.#host.addEventListener('input', this.#onInput);
    // Captured, so the fields are still there when the button's own handler closes them.
    this.#host.addEventListener('click', this.#onClick, true);
  }

  hostDisconnected(): void {
    this.#host.removeEventListener('focusin', this.#onFocusIn);
    this.#host.removeEventListener('input', this.#onInput);
    this.#host.removeEventListener('click', this.#onClick, true);
  }

  /**
   * Changes entered the draft. A field whose text one of them carries (the
   * comment a composer sent, the name an inline edit committed) has said what
   * it had to say, so its text is forgotten. Any other field keeps its text,
   * open or dismissed: nothing has received it yet.
   */
  settle(payloads: readonly unknown[]): void {
    const sent = new Set(payloads.flatMap(stringsIn).map(normalize));
    this.#forget([...this.#typed].filter((field) => sent.has(normalize(field.value))));
  }

  #forget(fields: readonly TextField[]): void {
    for (const field of fields) {
      this.#typed.delete(field);
      const filed = this.#fields.get(field);
      if (filed !== undefined) this.#write(forgetUnsentText(this.#read(), filed.id));
    }
  }

  #onClick = (event: MouseEvent): void => {
    const button = discardOf(event);
    if (button !== null) this.#forget(fieldsBeside(button, this.#typed));
  };

  #onFocusIn = (event: FocusEvent): void => {
    const field = textFieldOf(event.composedPath()[0]);
    // A field the reader is writing in keeps the record it opened with; one
    // that stayed on screen after its text was sent starts over from what it shows.
    if (field === null || this.#typed.has(field)) return;
    const hosts = hostsBetween(this.#host, field);
    if (hosts === null) return;
    const key = keyOf(field);
    const base = field.value;
    const id = unsentTextId({ ...(key === undefined ? {} : { key }), hosts, name: nameOf(field), base });
    this.#fields.set(field, { id, base });
    const restored = textToRestore(this.#read(), id, base);
    if (restored === null) return;
    // After the component that focused the field has finished opening it, and
    // with the caret at the end: a selected text would go with the next key.
    queueMicrotask(() => {
      if (field.value !== base) return;
      field.value = restored;
      try {
        field.setSelectionRange(restored.length, restored.length);
      } catch {
        /* an e-mail field has no caret position to set */
      }
      this.#typed.add(field);
      // The component that owns the field reads its value from this event, as from typing.
      field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
  };

  #onInput = (event: Event): void => {
    const field = textFieldOf(event.composedPath()[0]);
    const filed = field === null ? undefined : this.#fields.get(field);
    if (field === null || filed === undefined) return;
    for (const typed of this.#typed) if (!typed.isConnected) this.#typed.delete(typed);
    this.#typed.add(field);
    this.#write(recordUnsentText(this.#read(), filed.id, { base: filed.base, value: field.value }));
  };

  #read(): UnsentTexts {
    return this.#store?.read(this.#key) ?? {};
  }

  #write(texts: UnsentTexts): void {
    if (Object.keys(texts).length === 0) this.#store?.remove(this.#key);
    else this.#store?.write(this.#key, texts);
  }
}
