import { css, html, LitElement, nothing, type TemplateResult } from 'lit';

import type { StatusView } from '../status-view';

import { LocaleController } from '../../../core/locale-controller';
import { WEIGHT_TOTAL } from '../burndown';
import { usmMessages, type UsmMessages } from '../messages';
import { statusIcon, statusStyles, statusToneStyle } from '../render/tone';
import { moveWeightDivider, weightsBetween } from '../weight-split';

const barStyles = css`
  :host {
    display: block;
  }
  .wb {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 10px;
    row-gap: 4px;
    align-items: center;
  }
  .wb-track {
    position: relative;
    height: 36px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
    touch-action: none;
  }
  .wb-part {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 10px;
    overflow: hidden;
    background: color-mix(in oklab, var(--usm-tone) 16%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    transition:
      left 120ms ease-out,
      width 120ms ease-out;
  }
  .wb-track[data-dragging] .wb-part {
    transition: none;
  }
  .wb-parts {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
  }
  .wb-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wb-value {
    flex: none;
    color: var(--usm-tone);
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }
  .wb-line {
    position: absolute;
    top: -4px;
    bottom: -4px;
    z-index: 1;
    width: 14px;
    margin-left: -7px;
    border-radius: var(--dpk-radius-sm);
    outline: none;
    cursor: col-resize;
  }
  .wb-line::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 6px;
    width: 2px;
    border-radius: 1px;
    background: var(--dpk-ink-soft);
    transition: background 120ms ease-out;
  }
  /* The grip says the line can be taken hold of. */
  .wb-line::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 2px;
    width: 10px;
    height: 20px;
    margin-top: -10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 5px;
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    transition: border-color 120ms ease-out;
  }
  .wb-line:hover::before,
  .wb-line[data-active]::before {
    background: var(--dpk-ink);
  }
  .wb-line:hover::after,
  .wb-line[data-active]::after {
    border-color: var(--dpk-ink-soft);
  }
  .wb-line:focus-visible {
    box-shadow: var(--dpk-focus);
  }
  .wb-end {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--dpk-ink-faint);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  .wb-scale {
    position: relative;
    height: 12px;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }
  .wb-tick {
    position: absolute;
    top: 0;
    width: 1px;
    height: 3px;
    background: var(--dpk-rule-strong);
  }
  .wb-scale-end {
    position: absolute;
    top: 0;
    line-height: 12px;
  }
  .wb-scale-end[data-at='0'] {
    left: 0;
  }
  .wb-scale-end[data-at='max'] {
    right: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .wb-part,
    .wb-line::before,
    .wb-line::after {
      transition: none;
    }
  }
`;

/** A line the reader is dragging, and where the lines stand while it moves. */
type Drag = { readonly index: number; readonly dividers: readonly number[] };

/**
 * `<dpk-internal-usm-weight-bar>` — how a story's work is shared out between
 * the statuses, as one bar of `WEIGHT_TOTAL` parts: a part for each status
 * but the last, which ends the bar. The lines between the parts are dragged,
 * or moved with the arrow keys, a whole part at a time; `commit` gets where
 * they stand once one has moved.
 */
export class DpkInternalUsmWeightBar extends LitElement {
  static override styles = [statusStyles, barStyles];

  static override properties = {
    statuses: { attribute: false },
    dividers: { attribute: false },
    commit: { attribute: false },
    drag: { state: true },
  };

  /** Every status, in order; the last ends the bar. */
  declare statuses: readonly StatusView[];
  /** Where the lines between the parts stand, from 0 to `WEIGHT_TOTAL`. */
  declare dividers: readonly number[];
  declare commit: (dividers: readonly number[]) => void;
  declare drag: Drag | null;

  readonly #i18n = new LocaleController(this);

  constructor() {
    super();
    this.statuses = [];
    this.dividers = [];
    this.commit = () => undefined;
    this.drag = null;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopDragging();
  }

  protected override render(): TemplateResult | typeof nothing {
    const m = usmMessages(this.#i18n.locale);
    const parts = this.statuses.slice(0, -1);
    const end = this.statuses.at(-1);
    if (!end || parts.length === 0) return nothing;
    const dividers = this.drag?.dividers ?? this.dividers;
    const weights = weightsBetween(dividers);
    const at = (position: number): string => `${(position / WEIGHT_TOTAL) * 100}%`;
    return html`<div class="wb">
      <div class="wb-track" role="group" aria-label=${m.statusWeightLabel} ?data-dragging=${this.drag !== null}>
        <div class="wb-parts">
          ${parts.map((status, index) => {
            const from = dividers[index - 1] ?? 0;
            const weight = weights[index] ?? 0;
            return html`<span
              class="wb-part"
              data-part=${status.id}
              title=${`${status.name} ${formatWeight(weight)}`}
              style=${`${statusToneStyle(status.tone)}; left: ${at(from)}; width: ${at(weight)}`}
            >
              <span class="wb-name">${status.name}</span><span class="wb-value">${formatWeight(weight)}</span>
            </span>`;
          })}
        </div>
        ${dividers.map((position, index) => this.#renderLine(m, parts, dividers, index, at(position)))}
      </div>
      <span class="wb-end" data-end style=${statusToneStyle(end.tone)}>${statusIcon(end)}${end.name}</span>
      <div class="wb-scale" aria-hidden="true">
        ${Array.from(
          { length: WEIGHT_TOTAL - 1 },
          (_tick, index) => html`<span class="wb-tick" style=${`left: ${at(index + 1)}`}></span>`,
        )}
        <span class="wb-scale-end" data-at="0">0</span>
        <span class="wb-scale-end" data-at="max">${WEIGHT_TOTAL}</span>
      </div>
    </div>`;
  }

  #renderLine(
    m: UsmMessages,
    parts: readonly StatusView[],
    dividers: readonly number[],
    index: number,
    left: string,
  ): TemplateResult {
    const before = parts[index]?.name ?? '';
    const after = parts[index + 1]?.name ?? '';
    const weights = weightsBetween(dividers);
    const position = dividers[index] ?? 0;
    return html`<span
      class="wb-line"
      role="slider"
      tabindex="0"
      style=${`left: ${left}`}
      aria-label=${m.weightLineLabel(before, after)}
      aria-valuemin=${String(dividers[index - 1] ?? 0)}
      aria-valuemax=${String(dividers[index + 1] ?? WEIGHT_TOTAL)}
      aria-valuenow=${String(position)}
      aria-valuetext=${m.weightLineValue(before, formatWeight(weights[index] ?? 0), after, formatWeight(weights[index + 1] ?? 0))}
      ?data-active=${this.drag?.index === index}
      @keydown=${(event: KeyboardEvent) => this.#onKeydown(event, index)}
      @pointerdown=${(event: PointerEvent) => this.#startDragging(event, index)}
    ></span>`;
  }

  /** The arrow keys move the line a part at a time; Home and End take it as far as it goes. */
  #onKeydown(event: KeyboardEvent, index: number): void {
    const position = this.dividers[index] ?? 0;
    const to = (() => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          return position - 1;
        case 'ArrowRight':
        case 'ArrowUp':
          return position + 1;
        case 'Home':
          return 0;
        case 'End':
          return WEIGHT_TOTAL;
        default:
          return null;
      }
    })();
    if (to === null) return;
    event.preventDefault();
    this.#commitIfMoved(moveWeightDivider(this.dividers, index, to));
  }

  // The move and the release are read off the document, so the line keeps
  // following a pointer that leaves it (or the bar) while it is held.
  #startDragging(event: PointerEvent, index: number): void {
    if (event.button !== 0) return;
    // Held off the text it would select, the press would also keep the line
    // from the focus, so it is given to the line by hand.
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true });
    this.drag = { index, dividers: this.dividers };
    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
    document.addEventListener('pointercancel', this.#onPointerCancel);
  }

  readonly #onPointerMove = (event: PointerEvent): void => {
    const track = this.renderRoot.querySelector('.wb-track')?.getBoundingClientRect();
    if (!this.drag || !track || track.width === 0) return;
    const to = ((event.clientX - track.left) / track.width) * WEIGHT_TOTAL;
    this.drag = { ...this.drag, dividers: moveWeightDivider(this.drag.dividers, this.drag.index, to) };
  };

  readonly #onPointerUp = (): void => {
    const moved = this.drag?.dividers;
    this.#stopDragging();
    if (moved) this.#commitIfMoved(moved);
  };

  readonly #onPointerCancel = (): void => this.#stopDragging();

  #stopDragging(): void {
    this.drag = null;
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('pointercancel', this.#onPointerCancel);
  }

  #commitIfMoved(dividers: readonly number[]): void {
    if (dividers.some((position, index) => position !== this.dividers[index])) this.commit(dividers);
  }
}

/** A part as the bar reads it: whole parts as they are, a ratio not yet set in whole parts to one decimal. */
const formatWeight = (weight: number): string => String(Math.round(weight * 10) / 10);

export const defineUsmWeightBar = (): void => {
  if (!customElements.get('dpk-internal-usm-weight-bar'))
    customElements.define('dpk-internal-usm-weight-bar', DpkInternalUsmWeightBar);
};
