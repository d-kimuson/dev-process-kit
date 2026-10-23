import { LitElement, css, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import { scrollByWheel } from '../../../lib/dom/scroll';
import { iconChevronLeft, iconChevronRight } from '../../icons';
import { LocaleController } from '../../locale-controller';
import { tokens } from '../../theme';
import { SidebarCollapseController } from './collapse-controller';
import { sidebarMessages } from './messages';
import {
  DEFAULT_SIDEBAR_PANE,
  SIDEBAR_WIDTH,
  sidebarArrangement,
  sidebarToggle,
  type SidebarArrangement,
  type SidebarPane,
  type SidebarSide,
} from './model';
import { NarrowScreenController } from './narrow-screen-controller';
import { SidebarResizeController } from './resize-controller';

/** One side's sidebar: what it was told, the reader's width and fold, and whether it has content. */
class Pane {
  readonly width: SidebarResizeController;
  readonly fold: SidebarCollapseController;
  /** Whether anything is assigned to the side's slot. */
  filled = false;

  constructor(
    host: LitElement,
    readonly side: SidebarSide,
    readonly layout: () => SidebarPane,
  ) {
    this.width = new SidebarResizeController(host, {
      persistKey: () => layout().persistKey,
      side: () => side,
      defaultWidth: () => layout().width,
    });
    this.fold = new SidebarCollapseController(host, { persistKey: () => layout().persistKey });
  }

  /** The width it is drawn at: the reader's (when resizable), or the layout's. */
  get drawnWidth(): number {
    return this.layout().resizable ? this.width.width : this.layout().width;
  }
}

/**
 * `<dpk-internal-layout-sidebar>` — the shell's body: a main column with an
 * optional sidebar on either side, and an optional rail at the far left.
 *
 * Internal to the shell: a page gets these regions through the `sidebar` /
 * `aside` slots of its template or `<dpk-page>`, never by using this element.
 *
 * - The `left` and `right` slots are the sidebars; the default slot is the
 *   main column. A side with nothing slotted draws nothing, not even its
 *   buttons, and the main column takes the room.
 * - `.left` / `.right` say how each side behaves (`SidebarPane`): its width,
 *   whether the reader can resize or fold it, and how it stands on a phone
 *   (`drawer`, `stack` or `keep`). Folded, the button that brings it back
 *   floats near the main column's edge.
 * - The `rail` slot is a fixed column before everything else (the page's
 *   boards); it never folds and stays on a phone.
 * - `main="fill"` makes the main column a fixed box its content fills (a
 *   canvas that pans inside); by default it scrolls.
 *
 * Parts: `rail`, `sidebar`, `main`, `resizer`, `toggle`, `bar`, `scrim`.
 * Custom properties: `--dpk-sidebar-padding`, `--dpk-sidebar-padding-end`,
 * `--dpk-sidebar-background`.
 */
export class DpkInternalLayoutSidebar extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        display: flex;
        min-width: 0;
        min-height: 0;
        color: var(--dpk-ink);
      }

      :host([hidden]) {
        display: none;
      }

      .rail {
        flex: none;
        box-sizing: border-box;
        border-right: 1px solid var(--dpk-rule);
        background: var(--dpk-sidebar-background, var(--dpk-paper-sunken));
        overflow: auto;
        padding: 6px 4px calc(6px + var(--dpk-dock-clearance, 0px));
        scrollbar-width: none;
      }

      .rail[hidden] {
        display: none;
      }

      /* Positioned: a drawer opens over the main column. */
      .body {
        position: relative;
        flex: 1 1 auto;
        display: flex;
        min-width: 0;
        min-height: 0;
      }

      .sidebar {
        /* A wide sidebar on a narrow screen still leaves the main column some room. */
        width: var(--dpk-sidebar-width);
        max-width: calc(100% - 120px);
        flex: 0 0 auto;
        box-sizing: border-box;
        border-right: 1px solid var(--dpk-rule);
        background: var(--dpk-sidebar-background, var(--dpk-paper-sunken));
        overflow: auto;
        padding: var(--dpk-sidebar-padding, 18px 14px);
        /* Scrolled to the end, the last of it clears the hand-off dock (\`--dpk-dock-clearance\`). */
        padding-bottom: calc(var(--dpk-sidebar-padding-end, 18px) + var(--dpk-dock-clearance, 0px));
        scrollbar-width: thin;
      }

      .sidebar[hidden] {
        display: none;
      }

      .sidebar[data-side='right'] {
        border-right: 0;
        border-left: 1px solid var(--dpk-rule);
      }

      .main {
        flex: 1 1 0%;
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        overflow: auto;
      }

      .main ::slotted(*) {
        flex: 1 0 auto;
        min-width: 0;
      }

      /* A canvas: the main column does not scroll, its content fills it exactly. */
      :host([main='fill']) .main {
        overflow: hidden;
      }

      :host([main='fill']) .main ::slotted(*) {
        flex: 1 1 0%;
        min-height: 0;
      }

      /*
       * The fold button. Expanded, it sits on the sidebar's border near the top
       * and, like the resizer, takes no room of its own; folded, it floats over
       * the main column near its edge, and nothing else is left where the
       * sidebar was.
       */
      .toggle {
        --dpk-drawer-width: min(var(--dpk-sidebar-width), calc(100% - 48px));
        position: relative;
        z-index: 7;
        display: inline-flex;
        flex: none;
        align-self: flex-start;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin: 14px -11px 0;
        padding: 0;
        border: 1px solid var(--dpk-rule-strong);
        border-radius: 999px;
        background: var(--dpk-paper-raised);
        color: var(--dpk-ink-soft);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
        cursor: pointer;
        transition:
          color 160ms var(--dpk-ease),
          border-color 160ms var(--dpk-ease),
          background 160ms var(--dpk-ease);
      }

      .toggle svg {
        width: 13px;
        height: 13px;
      }

      .toggle:hover {
        color: var(--dpk-accent);
        border-color: color-mix(in srgb, var(--dpk-accent) 45%, transparent);
      }

      .toggle:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }

      /* Folded: a button floating a little in from the main column's outer edge, big enough to hit. */
      .toggle[data-float] {
        position: absolute;
        top: 10px;
        z-index: 26;
        width: 32px;
        height: 32px;
        margin: 0;
        border-radius: var(--dpk-radius, 8px);
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
      }

      .toggle[data-float] svg {
        width: 16px;
        height: 16px;
      }

      .toggle[data-float='left'] {
        left: 10px;
      }

      .toggle[data-float='right'] {
        right: 10px;
      }

      /* An open drawer: the button rides its edge as a round one, ready to close it. */
      .toggle[data-float][data-open] {
        top: 14px;
        width: 22px;
        height: 22px;
        border-radius: 999px;
      }

      .toggle[data-float][data-open] svg {
        width: 13px;
        height: 13px;
      }

      .toggle[data-float='left'][data-open] {
        left: calc(var(--dpk-drawer-width) - 11px);
      }

      .toggle[data-float='right'][data-open] {
        right: calc(var(--dpk-drawer-width) - 11px);
      }

      /*
       * The resizable edge: a hit area straddling the sidebar's border that takes
       * no room of its own, with an accent line while hovered, focused or dragged.
       */
      .resizer {
        position: relative;
        z-index: 6;
        flex: none;
        width: 9px;
        /* Centred on the sidebar's border, whichever side that is. */
        margin: 0 -5px 0 -4px;
        cursor: col-resize;
        touch-action: none;
      }

      .resizer::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 3px;
        width: 2px;
        border-radius: 1px;
        background: var(--dpk-accent);
        opacity: 0;
        transition: opacity 160ms var(--dpk-ease);
      }

      .resizer:hover::after,
      .resizer:focus-visible::after,
      .resizer[data-dragging]::after {
        opacity: 1;
      }

      .resizer:focus-visible {
        outline: none;
      }

      /* While dragging, the cursor stays put and nothing underneath (text, preview frames) reacts. */
      .body[data-resizing] {
        cursor: col-resize;
        user-select: none;
      }

      .body[data-resizing] > .main {
        pointer-events: none;
      }

      /*
       * A drawer: no room for a column beside the main one, so the floating
       * button slides the sidebar over the main column, leaving a sliver of it
       * to tap the drawer shut.
       */
      .sidebar[data-arrangement='drawer'] {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 25;
        width: min(var(--dpk-sidebar-width), calc(100% - 48px));
        max-width: none;
        box-shadow: var(--dpk-shadow-lg);
      }

      .sidebar[data-arrangement='drawer'][data-side='right'] {
        left: auto;
        right: 0;
      }

      .scrim {
        position: absolute;
        inset: 0;
        z-index: 24;
        background: color-mix(in srgb, var(--dpk-ink) 16%, transparent);
      }

      /*
       * Stacked: a sidebar takes the full width before (left) or after (right)
       * the main column, and they scroll as one page. Folded, it is a bar
       * holding the button that unfolds it.
       */
      .body[data-stack] {
        flex-direction: column;
        overflow: auto;
      }

      .body[data-stack] > .main {
        flex: 0 0 auto;
        overflow: visible;
      }

      .sidebar[data-arrangement='stack'] {
        flex: 0 0 auto;
        overflow: visible;
        width: auto;
        max-width: none;
        border: 0;
        border-bottom: 1px solid var(--dpk-rule);
      }

      .sidebar[data-arrangement='stack'][data-side='right'] {
        border: 0;
        border-top: 1px solid var(--dpk-rule);
      }

      .bar {
        display: flex;
        background: var(--dpk-sidebar-background, var(--dpk-paper-sunken));
        padding: 8px 14px;
        justify-content: flex-start;
        border-bottom: 1px solid var(--dpk-rule);
      }

      .bar[data-side='right'] {
        border-bottom: 0;
        border-top: 1px solid var(--dpk-rule);
      }
    `,
  ];

  static override properties = {
    left: { attribute: false },
    right: { attribute: false },
    main: { type: String, reflect: true },
  };

  /** How the left sidebar behaves. */
  declare left: SidebarPane;
  /** How the right sidebar behaves. */
  declare right: SidebarPane;
  /** `scroll` (default) or `fill`. */
  declare main: string | null;

  readonly #i18n = new LocaleController(this);
  readonly #narrowScreen = new NarrowScreenController(this);
  readonly #panes: Readonly<Record<SidebarSide, Pane>> = {
    left: new Pane(this, 'left', () => this.left),
    right: new Pane(this, 'right', () => this.right),
  };
  /** Whether anything is assigned to the `rail` slot. */
  #railFilled = false;
  /** A fold button is re-rendered in a new place after a press; focus follows it. */
  #refocusToggle: SidebarSide | null = null;

  constructor() {
    super();
    this.left = DEFAULT_SIDEBAR_PANE;
    this.right = DEFAULT_SIDEBAR_PANE;
    this.main = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Known before the first render, so a side with nothing never draws for a frame.
    const slots = new Set(Array.from(this.children, (child) => child.slot));
    this.#panes.left.filled = slots.has('left');
    this.#panes.right.filled = slots.has('right');
    this.#railFilled = slots.has('rail');
  }

  protected override updated(): void {
    if (this.#refocusToggle === null) return;
    const side = this.#refocusToggle;
    this.#refocusToggle = null;
    this.renderRoot.querySelector<HTMLElement>(`.toggle[data-side='${side}']`)?.focus();
  }

  #arrangementOf(pane: Pane): SidebarArrangement {
    return sidebarArrangement(pane.layout(), this.#narrowScreen.narrow);
  }

  #collapsedOf(pane: Pane): boolean {
    if (!pane.layout().collapsible) return false;
    return this.#arrangementOf(pane) === 'drawer' ? !pane.fold.drawerOpen : pane.fold.collapsed;
  }

  /**
   * Whether this side's sidebar is folded away right now (collapsed, or an
   * unopened drawer); `false` for a side with nothing slotted. Lets a control
   * outside this element (a page's rail, say) read the state its own fold
   * button already shows.
   */
  foldedOn(side: SidebarSide): boolean {
    const pane = this.#panes[side];
    return pane.filled && this.#collapsedOf(pane);
  }

  /**
   * Folds or unfolds this side's sidebar, exactly as its own fold button
   * would. A no-op for a side with nothing slotted.
   */
  toggleFold(side: SidebarSide): void {
    const pane = this.#panes[side];
    if (!pane.filled) return;
    this.#fold(pane);
  }

  /**
   * Folds or unfolds one pane, however it was asked for (this element's own
   * button, or `toggleFold` called from outside), and tells the outside world
   * it changed: a composed, bubbling event, since a control that mirrors this
   * state (a page's rail, say) may sit beyond this element's own shadow root,
   * in a host several levels up.
   */
  #fold(pane: Pane): void {
    if (this.#arrangementOf(pane) === 'drawer') pane.fold.toggleDrawer();
    else pane.fold.toggle();
    this.dispatchEvent(new CustomEvent('dpk-sidebar-fold', { bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    const { left, right } = this.#panes;
    const panes = [left, right].filter((pane) => pane.filled);
    const stack = panes.some((pane) => this.#arrangementOf(pane) === 'stack');
    const drawerOpen = panes.some((pane) => this.#arrangementOf(pane) === 'drawer' && !this.#collapsedOf(pane));
    const scrim = drawerOpen
      ? html`<div
          part="scrim"
          class="scrim"
          @click=${() => {
            left.fold.closeDrawer();
            right.fold.closeDrawer();
          }}
        ></div>`
      : nothing;
    return html`<div part="rail" class="rail" ?hidden=${!this.#railFilled}>
        <slot name="rail" @slotchange=${this.#onRailChange}></slot>
      </div>
      <div class="body" ?data-stack=${stack} ?data-resizing=${left.width.dragging || right.width.dragging}>
        ${this.#renderSidebar(left)}${this.#renderEdge(left)}
        <div part="main" class="main"><slot></slot></div>
        ${this.#renderEdge(right)}${this.#renderSidebar(right)} ${scrim}
      </div>`;
  }

  #renderSidebar(pane: Pane): TemplateResult {
    return html`<div
      id=${`sidebar-${pane.side}`}
      part="sidebar"
      class="sidebar"
      data-side=${pane.side}
      data-arrangement=${this.#arrangementOf(pane)}
      ?hidden=${!pane.filled || this.#collapsedOf(pane)}
      style=${`--dpk-sidebar-width: ${pane.drawnWidth}px`}
      @wheel=${this.#onSidebarWheel}
    >
      <slot name=${pane.side} @slotchange=${(event: Event) => this.#onPaneChange(pane, event)}></slot>
    </div>`;
  }

  /**
   * Scrolls the sidebar by hand instead of relying on the browser's own
   * wheel-scroll chaining. This sidebar's content reaches it through two
   * nested shadow-root/slot boundaries (a template slots the page's content
   * into its own `.dpk-sidebar`, which is itself slotted into this element),
   * and at least Chromium fails to resolve wheel scrolling across that path:
   * the pointer sits over a genuinely scrollable `.sidebar`, but the wheel
   * event never moves it. See `scrollByWheel` for the shared, tested logic.
   */
  readonly #onSidebarWheel = (event: WheelEvent): void => {
    if (event.currentTarget instanceof HTMLElement && scrollByWheel(event.currentTarget, event)) {
      event.preventDefault();
    }
  };

  /**
   * What sits between a sidebar and the main column: the resizable edge and
   * the fold button on it. Folded (or as a drawer) the button floats over the
   * main column instead; stacked, it sits in a bar of its own. A side with
   * nothing slotted has no edge at all.
   */
  #renderEdge(pane: Pane): TemplateResult | typeof nothing {
    if (!pane.filled) return nothing;
    const layout = pane.layout();
    const arrangement = this.#arrangementOf(pane);
    const collapsed = this.#collapsedOf(pane);
    if (arrangement === 'stack') {
      // Stacked, the sidebar takes the full width: there is no edge to drag, only a bar to fold it from.
      return collapsed
        ? html`<div part="bar" class="bar" data-side=${pane.side}>${this.#renderToggle(pane, collapsed)}</div>`
        : nothing;
    }
    const drawer = arrangement === 'drawer';
    if (collapsed || drawer) return layout.collapsible ? this.#renderToggle(pane, collapsed, true) : nothing;
    const toggle = layout.collapsible ? this.#renderToggle(pane, collapsed) : nothing;
    const resizer = layout.resizable ? this.#renderResizer(pane) : nothing;
    return pane.side === 'left' ? html`${resizer}${toggle}` : html`${toggle}${resizer}`;
  }

  #renderToggle(pane: Pane, collapsed: boolean, float = false): TemplateResult {
    const m = sidebarMessages(this.#i18n.locale);
    const toggle = sidebarToggle(pane.side, collapsed);
    const label = toggle.action === 'collapse' ? m.collapseSidebar : m.expandSidebar;
    return html`<button
      part="toggle"
      class="toggle"
      type="button"
      data-side=${pane.side}
      data-float=${float ? pane.side : nothing}
      ?data-open=${float && !collapsed}
      style=${`--dpk-sidebar-width: ${pane.drawnWidth}px`}
      aria-controls=${`sidebar-${pane.side}`}
      aria-expanded=${collapsed ? 'false' : 'true'}
      aria-label=${label}
      title=${label}
      @click=${() => {
        this.#refocusToggle = pane.side;
        this.#fold(pane);
      }}
    >
      ${toggle.points === 'left' ? iconChevronLeft() : iconChevronRight()}
    </button>`;
  }

  /** The edge facing the main column: dragged, or focused and moved with the arrow keys. */
  #renderResizer(pane: Pane): TemplateResult {
    const m = sidebarMessages(this.#i18n.locale);
    const on = pane.width.handlers;
    return html`<div
      part="resizer"
      class="resizer"
      role="separator"
      tabindex="0"
      data-side=${pane.side}
      ?data-dragging=${pane.width.dragging}
      aria-orientation="vertical"
      aria-controls=${`sidebar-${pane.side}`}
      aria-label=${m.resizeSidebar}
      aria-valuemin=${SIDEBAR_WIDTH.min}
      aria-valuemax=${SIDEBAR_WIDTH.max}
      aria-valuenow=${pane.width.width}
      title=${m.resizeSidebarHint}
      @pointerdown=${on.pointerdown}
      @pointermove=${on.pointermove}
      @pointerup=${on.pointerup}
      @pointercancel=${on.pointercancel}
      @keydown=${on.keydown}
      @dblclick=${on.dblclick}
    ></div>`;
  }

  #onPaneChange(pane: Pane, event: Event): void {
    if (!(event.target instanceof HTMLSlotElement)) return;
    const filled = event.target.assignedNodes({ flatten: true }).length > 0;
    if (filled === pane.filled) return;
    pane.filled = filled;
    this.requestUpdate();
  }

  readonly #onRailChange = (event: Event): void => {
    if (!(event.target instanceof HTMLSlotElement)) return;
    const filled = event.target.assignedNodes({ flatten: true }).length > 0;
    if (filled === this.#railFilled) return;
    this.#railFilled = filled;
    this.requestUpdate();
  };
}
