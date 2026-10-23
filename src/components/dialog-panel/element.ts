import { LitElement, css, html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';

import type { ViewportAlign, ViewportBox, ViewportPoint, ViewState } from '../diagram/viewport';

import { iconGripHorizontal, iconMaximize, iconMinimize, iconMinus, iconPlus } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { controls, tokens } from '../../core/theme';
import { PanelCanvasController, type CanvasInitial } from './canvas-controller';
import { PanelHeightController } from './height-controller';
import { panelMessages, type PanelMessages } from './messages';
import { scrollsInside } from './model';

/**
 * `<dpk-dialog-panel>` — a framed box with a header and a floating control
 * menu: the shell every diagram uses, for any content.
 *
 * - `heading` / `subject` (or the `heading` slot) title the header.
 * - The `actions` slot is the header's menu: search boxes, toggles, counters.
 * - The `toolbar` slot is a row under the header (a tag filter, say).
 * - The default slot is the body; `flush` drops its padding (a table).
 * - `canvas` turns the body into a pan/zoom canvas: drag, wheel, pinch and
 *   the arrow keys move it, plus and minus scale it, 0 fits it. The `overlay`
 *   slot stays put over it (a legend, a notice). `content-width` /
 *   `content-height` give the content box for content that lays out
 *   absolutely; `initial` is the opening view (`fit`, `fit-width`, `actual`
 *   or `none`), `align` where content that fits sits (`center` or `start`),
 *   `fit-mode` what the fit button means (`all`, or `width`).
 * - The control menu floats at the bottom-right: zoom (with `canvas`),
 *   maximize (with `maximizable`; Escape restores unless something inside
 *   handled the key), a resize grip (with `resizable`), and the `controls`
 *   slot for buttons of the panel's own use. Maximized, it moves to the
 *   bottom-centre instead.
 *
 * Events: `dpk-maximize-change` with `{ maximized }`; with `canvas`,
 * `dpk-canvas-change` with `{ view }` after every move and the cancelable
 * `dpk-canvas-dismiss` on a background click or Escape (cancel it when it
 * cleared something, and Escape stops there).
 *
 * The view, the height and `maximized` are reader state: never recorded in the draft.
 */
export class DpkDialogPanel extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    controls,
    css`
      :host {
        display: block;
        color: var(--dpk-ink);
        /*
         * "align" is a reader-state attribute (fit alignment, "center" by
         * default), not markup; the UA stylesheet still maps the legacy
         * "align" content attribute to text-align through a bare
         * [align=center] selector that matches any element, tag name
         * aside. With no author rule of our own in the way, that is the
         * only declaration text-align gets, so it wins and every slotted
         * cell that does not set its own text-align inherits "center".
         * Inheriting here instead restores ordinary inheritance from
         * whatever this panel sits in.
         */
        text-align: inherit;
      }

      .panel {
        display: flex;
        flex-direction: column;
        /* Auto by default; a canvas inside needs a definite height to fill. */
        height: var(--dpk-dialog-panel-height, auto);
        min-height: var(--dpk-dialog-panel-min-height, 0);
        border: 1px solid var(--dpk-rule);
        border-radius: var(--dpk-radius-lg);
        background: var(--dpk-paper-raised);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
        overflow: hidden;
      }

      /*
       * Maximized: the panel covers the viewport. It is also a manual popover in
       * the top layer, so the UA popover box (fit-content, margin, border,
       * padding) is reset here. A resized panel leaves an inline height
       * behind, which only !important overrides.
       */
      .panel.is-maximized {
        position: fixed;
        /*
         * Not inset: 0 — the kit's own header sits above this panel in the
         * document, but this panel is a top-layer popover, which paints over
         * everything regardless of position in the document or z-index. The
         * header's real height (set by the page/template root as
         * --dpk-header-height; 0 with no such ancestor) keeps this panel's
         * box clear of it instead, so the header and its actions stay put
         * and clickable.
         */
        top: var(--dpk-header-height, 0px);
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 2147483000;
        width: auto !important;
        height: auto !important;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        color: var(--dpk-ink);
        background:
          radial-gradient(
            ellipse 900px 400px at 0% 0%,
            color-mix(in srgb, var(--dpk-accent) 4%, transparent),
            transparent 70%
          ),
          var(--dpk-paper-raised);
        box-shadow: none;
        /* Above the dock in the top layer, so nothing to clear. */
        --dpk-dock-overlap: 0px;
        /* Nothing behind a maximized panel is visible: no axis should chain past it. */
        overscroll-behavior: contain;
      }

      header {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        flex-shrink: 0;
        min-height: 44px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--dpk-rule);
        background: linear-gradient(180deg, var(--dpk-paper-raised), var(--dpk-paper));
        box-shadow: 0 1px 0 var(--dpk-highlight) inset;
      }

      .title {
        font-family: var(--dpk-display);
        font-size: 12.5px;
        font-weight: 660;
        letter-spacing: -0.015em;
        color: var(--dpk-ink);
      }

      /* A long heading or subject elides (the full text is its tooltip) instead of pushing the actions off. */
      .title,
      .subject {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .subject {
        font-size: 10px;
        color: var(--dpk-ink-faint);
        padding-left: 10px;
        border-left: 1px solid var(--dpk-rule-strong);
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        flex-wrap: wrap;
      }

      /* The body and the control menu floating over it. */
      .frame {
        position: relative;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
      }

      .body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        padding: var(--dpk-dialog-panel-padding, 16px);
        overflow: auto;
        /*
         * The -x axis only: an edge swipe must never fall through to the
         * browser's back/forward navigation, but the vertical axis still
         * chains to the page so it keeps scrolling past an inline
         * (non-maximized) panel.
         */
        overscroll-behavior-x: contain;
      }

      :host([flush]) .body {
        padding: 0;
        overflow: hidden;
      }

      /* Scrolled to the end, the last of the body clears the control menu. */
      .frame[data-controls] > .body {
        padding-bottom: 56px;
      }

      /* A canvas: as tall as --dpk-canvas-height, or what is left of a sized panel. */
      :host([canvas]) .frame {
        flex: 1 1 var(--dpk-canvas-height, 420px);
        min-height: 220px;
      }

      .canvas {
        padding: 0;
        position: absolute;
        inset: 0;
        overflow: hidden;
        /* Same reasoning as .body: contain the horizontal edge only. */
        overscroll-behavior-x: contain;
        touch-action: none;
        cursor: grab;
        background: var(--dpk-dots), var(--dpk-paper-sunken);
      }

      .canvas:focus-visible {
        outline: none;
        box-shadow: inset var(--dpk-focus);
      }

      .canvas.is-panning {
        cursor: grabbing;
      }

      .world {
        position: absolute;
        inset: 0 auto auto 0;
        /* Content that lays out in flow measures itself; a given content box overrides this inline. */
        width: max-content;
        transform-origin: 0 0;
      }

      /* The control menu: a floating bar at the bottom, in the manner of a whiteboard's. */
      .controls {
        position: absolute;
        right: 12px;
        bottom: calc(12px + var(--dpk-dock-overlap, 0px));
        z-index: 4;
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 3px;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: var(--dpk-radius);
        background: var(--dpk-glass);
        backdrop-filter: blur(12px);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
      }

      .controls[hidden] {
        display: none;
      }

      /*
       * A corner twin of the bottom maximize control, shown only while
       * maximized: on a tall panel the bottom one can be a long pointer trip
       * away, and a top-right "exit full screen" is where readers expect one.
       * The bottom control stays too, for continuity with the non-maximized menu.
       */
      .exit-fullscreen {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 5;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: var(--dpk-radius);
        background: var(--dpk-glass);
        backdrop-filter: blur(12px);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
        color: var(--dpk-ink-soft);
        cursor: pointer;
        transition:
          background 140ms var(--dpk-ease),
          color 140ms var(--dpk-ease);
      }

      .exit-fullscreen svg {
        width: 14px;
        height: 14px;
      }

      .exit-fullscreen:hover {
        background: var(--dpk-paper-inset);
        color: var(--dpk-ink);
      }

      .exit-fullscreen:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }

      /*
       * Maximized, or with no maximize button to offer at all (a full-page
       * board's frame, which never sets "maximizable" — see the diagrams'
       * own "frameControls"), the menu has the whole viewport width to sit
       * in, so it moves off the corner and centers at the bottom instead.
       */
      .panel.is-maximized .controls,
      :host(:not([maximizable])) .controls {
        right: auto;
        left: 50%;
        transform: translateX(-50%);
      }

      .controls ::slotted(*) {
        flex: none;
      }

      .controls button,
      .grip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        padding: 0 7px;
        border: 0;
        border-radius: var(--dpk-radius-sm);
        background: transparent;
        color: var(--dpk-ink-soft);
        font-size: 10.5px;
        cursor: pointer;
        transition:
          background 140ms var(--dpk-ease),
          color 140ms var(--dpk-ease);
      }

      .controls button svg,
      .grip svg {
        width: 13px;
        height: 13px;
      }

      .controls button:hover,
      .grip:hover {
        background: var(--dpk-paper-inset);
        color: var(--dpk-ink);
      }

      .controls button:focus-visible,
      .grip:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }

      .controls button[aria-pressed='true'] {
        color: var(--dpk-accent);
      }

      .zoom-value {
        min-width: 46px;
        font-family: var(--dpk-mono);
        font-variant-numeric: tabular-nums;
      }

      .separator {
        width: 1px;
        height: 18px;
        margin: 0 3px;
        background: var(--dpk-rule);
      }

      .grip {
        cursor: ns-resize;
        touch-action: none;
      }

      .panel[data-resizing] {
        user-select: none;
        cursor: ns-resize;
      }

      .panel[data-resizing] .frame {
        pointer-events: none;
      }

      @media (max-width: 700px) {
        .subject {
          display: none;
        }
      }
    `,
  ];

  static override properties = {
    heading: { type: String },
    subject: { type: String },
    maximizable: { type: Boolean, reflect: true },
    maximized: { type: Boolean, reflect: true },
    resizable: { type: Boolean, reflect: true },
    canvas: { type: Boolean, reflect: true },
    contentWidth: { type: Number, attribute: 'content-width' },
    contentHeight: { type: Number, attribute: 'content-height' },
    initial: { type: String },
    align: { type: String },
    fitMode: { type: String, attribute: 'fit-mode' },
    label: { type: String },
  };

  /** Header title. The `heading` slot replaces it with markup. */
  declare heading: string | null;
  /** Header subtitle, after the title. */
  declare subject: string | null;
  /** Shows the maximize button. */
  declare maximizable: boolean;
  /** Whether the panel covers the viewport. Settable; the button and Escape toggle it too. */
  declare maximized: boolean;
  /** Shows the resize grip. */
  declare resizable: boolean;
  /** Makes the body a pan/zoom canvas. */
  declare canvas: boolean;
  /** The content box's width in world pixels; measured from the content when absent. */
  declare contentWidth: number | null;
  /** The content box's height in world pixels; measured from the content when absent. */
  declare contentHeight: number | null;
  declare initial: CanvasInitial;
  declare align: ViewportAlign;
  declare fitMode: 'all' | 'width';
  /** Accessible name of the canvas. */
  declare label: string | null;

  readonly #i18n = new LocaleController(this);
  readonly #canvas = new PanelCanvasController(this, {
    elements: () => {
      const canvas = this.renderRoot.querySelector<HTMLElement>('.canvas');
      const world = this.renderRoot.querySelector<HTMLElement>('.world');
      return this.canvas && canvas && world ? { canvas, world } : null;
    },
    align: () => this.align,
    initial: () => this.initial,
    contentSize: () =>
      this.contentWidth !== null && this.contentHeight !== null
        ? { width: this.contentWidth, height: this.contentHeight }
        : null,
    onDismiss: () =>
      !this.dispatchEvent(new CustomEvent('dpk-canvas-dismiss', { bubbles: true, composed: true, cancelable: true })),
    onView: (view) => {
      const value = this.renderRoot.querySelector('.zoom-value');
      if (value) value.textContent = zoomLabel(view);
      this.dispatchEvent(new CustomEvent('dpk-canvas-change', { detail: { view }, bubbles: true, composed: true }));
    },
  });
  readonly #height = new PanelHeightController(
    this,
    () => this.renderRoot.querySelector<HTMLElement>('.panel')?.offsetHeight ?? 0,
  );
  /** The height the panel took in the page, kept by a placeholder while it is maximized. */
  #placeholderHeight = 0;
  /** Whether anything is assigned to the `controls` slot. */
  #hasControls = false;

  constructor() {
    super();
    this.heading = null;
    this.subject = null;
    this.maximizable = false;
    this.maximized = false;
    this.resizable = false;
    this.canvas = false;
    this.contentWidth = null;
    this.contentHeight = null;
    this.initial = 'fit';
    this.align = 'center';
    this.fitMode = 'all';
    this.label = null;
    // On the host, so a key or a wheel turn from slotted content is seen too.
    this.addEventListener('keydown', this.#restoreOnEscape);
    this.addEventListener('wheel', this.#holdWheel, { passive: false });
  }

  // ------------------------------------------------------------- canvas API

  /** The current view of the canvas: translation in canvas pixels and the scale. */
  get view(): ViewState {
    return this.#canvas.view;
  }

  fit(): void {
    this.#canvas.fit();
  }

  /** Width-fitted and top-aligned: for tall content read by scrolling. */
  fitWidth(): void {
    this.#canvas.fitWidth();
  }

  /** Fits one world-space box to the canvas, zooming past 100% if needed. */
  fitTo(box: ViewportBox): void {
    this.#canvas.fitTo(box);
  }

  /** 100%, the content's top-left corner (or `corner`, in world pixels) at the canvas's. */
  reset(corner?: ViewportPoint): void {
    this.#canvas.reset(corner);
  }

  zoom(factor: number): void {
    this.#canvas.zoom(factor);
  }

  /** Re-applies the current view, e.g. after the canvas changed size. */
  apply(): void {
    this.#canvas.apply();
  }

  /** Back to the opening view. */
  resetView(): void {
    this.#canvas.open();
  }

  // -------------------------------------------------------------- lifecycle

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('maximized') && this.maximized) {
      this.#placeholderHeight = this.renderRoot.querySelector<HTMLElement>('.panel')?.offsetHeight ?? 0;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('maximized')) this.#syncTopLayer();
    // The controller reads the alignment once; a change rebuilds it.
    const rebuild =
      (changed.has('canvas') && this.canvas !== this.#canvas.attached) ||
      (changed.has('align') && changed.get('align') !== undefined && this.canvas);
    if (rebuild) {
      if (this.canvas) this.#canvas.attach();
      else this.#canvas.detach();
    } else if (changed.has('contentWidth') || changed.has('contentHeight')) this.#canvas.sync();
  }

  protected override render(): unknown {
    // Read from the children, so the menu does not appear a frame late; the slot reports later changes.
    this.#hasControls = Array.from(this.children).some((child) => child.slot === 'controls');
    const showControls = this.canvas || this.maximizable || this.resizable || this.#hasControls;
    const height = this.#height.height;
    return html`
      ${this.maximized ? html`<div class="placeholder" style="height:${this.#placeholderHeight}px"></div>` : nothing}
      <section
        class=${this.maximized ? 'panel is-maximized' : 'panel'}
        part="panel"
        popover=${this.maximized ? 'manual' : nothing}
        style=${height === null || !this.resizable ? nothing : `height: ${height}px`}
        ?data-resizing=${this.#height.dragging}
      >
        <header part="header">
          <slot name="heading">
            ${this.heading ? html`<span class="title" title=${this.heading}>${this.heading}</span>` : nothing}
            ${this.subject ? html`<span class="subject" title=${this.subject}>${this.subject}</span>` : nothing}
          </slot>
          <div class="actions"><slot name="actions"></slot></div>
        </header>
        <slot name="toolbar"></slot>
        <div class="frame" ?data-controls=${showControls && !this.canvas}>
          ${this.canvas ? this.#renderCanvas() : html`<div class="body" part="body"><slot></slot></div>`}
          ${this.#renderControls(showControls)}
          ${this.maximized && this.maximizable ? this.#renderExitFullscreen() : nothing}
        </div>
        <slot name="footer"></slot>
      </section>
    `;
  }

  get #m(): PanelMessages {
    return panelMessages(this.#i18n.locale);
  }

  #renderCanvas(): TemplateResult {
    return html`<div class="body canvas" part="body canvas" tabindex="0" aria-label=${this.label ?? this.#m.canvas}>
      <div class="world" part="world"><slot></slot></div>
      <slot name="overlay"></slot>
    </div>`;
  }

  /** The floating menu. Always rendered, so the `controls` slot can report what lands in it. */
  #renderControls(show: boolean): TemplateResult {
    const m = this.#m;
    const groups = [
      this.canvas ? this.#renderZoom() : null,
      this.maximizable ? this.#renderMaximize() : null,
      this.resizable && !this.maximized ? this.#renderGrip() : null,
    ].filter((group): group is TemplateResult => group !== null);
    return html`<div class="controls" part="controls" role="toolbar" aria-label=${m.controls} ?hidden=${!show}>
      <slot name="controls" @slotchange=${this.#onControlsChange}></slot>
      ${groups.map((group, index) => html`${index > 0 || this.#hasControls ? html`<span class="separator"></span>` : nothing}${group}`)}
    </div>`;
  }

  /** The value is written straight from `onView`, so it is static text here, never a binding. */
  #renderZoom(): TemplateResult {
    const m = this.#m;
    return html`<button type="button" aria-label=${m.zoomOut} title=${m.zoomOut} @click=${() => this.zoom(1 / 1.1)}>
        ${iconMinus()}
      </button>
      <button
        type="button"
        class="zoom-value"
        title=${m.fit}
        aria-label=${m.fit}
        @click=${() => (this.fitMode === 'width' ? this.fitWidth() : this.fit())}
      >
        100%
      </button>
      <button type="button" aria-label=${m.zoomIn} title=${m.zoomIn} @click=${() => this.zoom(1.1)}>
        ${iconPlus()}
      </button>`;
  }

  #renderMaximize(): TemplateResult {
    const label = this.maximized ? this.#m.restore : this.#m.maximize;
    return html`<button
      type="button"
      class="maximize"
      aria-label=${label}
      title=${label}
      aria-pressed=${this.maximized ? 'true' : 'false'}
      @click=${() => this.#toggle(!this.maximized)}
    >
      ${this.maximized ? iconMinimize() : iconMaximize()}
    </button>`;
  }

  /** A corner twin of the bottom maximize control, reachable without crossing a tall maximized panel. */
  #renderExitFullscreen(): TemplateResult {
    const label = this.#m.restore;
    return html`<button
      type="button"
      class="exit-fullscreen"
      aria-label=${label}
      title=${label}
      @click=${() => this.#toggle(false)}
    >
      ${iconMinimize()}
    </button>`;
  }

  #renderGrip(): TemplateResult {
    const m = this.#m;
    const on = this.#height.handlers;
    return html`<div
      class="grip"
      part="grip"
      role="separator"
      tabindex="0"
      aria-orientation="horizontal"
      aria-label=${m.resize}
      title=${m.resizeHint}
      @pointerdown=${on.pointerdown}
      @pointermove=${on.pointermove}
      @pointerup=${on.pointerup}
      @pointercancel=${on.pointercancel}
      @keydown=${on.keydown}
      @dblclick=${on.dblclick}
    >
      ${iconGripHorizontal()}
    </div>`;
  }

  readonly #onControlsChange = (event: Event): void => {
    if (!(event.target instanceof HTMLSlotElement)) return;
    const has = event.target.assignedElements({ flatten: true }).length > 0;
    if (has !== this.#hasControls) this.requestUpdate();
  };

  #toggle(maximized: boolean): void {
    if (maximized === this.maximized) return;
    this.maximized = maximized;
    this.dispatchEvent(
      new CustomEvent('dpk-maximize-change', { detail: { maximized }, bubbles: true, composed: true }),
    );
  }

  /**
   * Lifts the maximized panel into the top layer, so no ancestor's overflow,
   * transform or stacking context can clip it. Without the Popover API the
   * fixed positioning alone covers the viewport. Removing the `popover`
   * attribute on restore takes it out of the top layer again.
   */
  #syncTopLayer(): void {
    const panel = this.renderRoot.querySelector<HTMLElement>('.panel');
    if (!this.maximized || !panel || typeof panel.showPopover !== 'function') return;
    if (panel.matches(':popover-open')) return;
    try {
      panel.showPopover();
    } catch {
      /* not in a document yet */
    }
  }

  /** While maximized nothing is visible behind the panel, so a turn that scrolls nothing inside is held. */
  readonly #holdWheel = (event: WheelEvent): void => {
    if (!this.maximized || event.defaultPrevented) return;
    const path = event.composedPath();
    const boxes = path.slice(0, Math.max(0, path.indexOf(this))).flatMap((node) => {
      if (!(node instanceof Element)) return [];
      const { overflowX, overflowY } = getComputedStyle(node);
      return [
        {
          overflowX,
          scrollLeft: node.scrollLeft,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          overflowY,
          scrollTop: node.scrollTop,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
        },
      ];
    });
    if (!scrollsInside(boxes, event.deltaX, event.deltaY)) event.preventDefault();
  };

  /** Escape restores, unless something inside used the key (it calls `preventDefault()`). */
  readonly #restoreOnEscape = (event: KeyboardEvent): void => {
    if (!this.maximized || event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    this.#toggle(false);
  };
}

const zoomLabel = (view: ViewState): string => `${Math.round(view.scale * 100)}%`;
