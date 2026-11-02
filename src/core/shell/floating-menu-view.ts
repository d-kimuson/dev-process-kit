/**
 * The floating menu's markup and look.
 *
 * It carries the page's own controls — undo and redo, the review's sections,
 * Check Mode and the changes bell — and nothing about where it goes: the spot
 * it rests at, its orientation and its position come from `floating-menu.ts`,
 * and the effects from `floating-menu-controller.ts`.
 *
 * Every button in it is a `.dpk-chrome-action`, the icon-button class the
 * header's own controls use too, so the screen's chrome is one kind of thing.
 */
import { css, html, nothing, type TemplateResult } from 'lit';

import type { CoreMessages } from '../messages';

import { iconGrip, iconGripHorizontal } from '../icons';
import {
  spotOrientation,
  type MenuGhost,
  type MenuInset,
  type MenuOrientation,
  type MenuPlacement,
} from './floating-menu';

export type FloatingMenuPlacement = MenuPlacement;

export type FloatingMenuContents = {
  /** The undo and redo pair, as their own group. */
  readonly undoRedo: TemplateResult;
  /** The review's section buttons: the comments, the changes and, while the page asks any, the questions. */
  readonly review: TemplateResult;
  /** Check Mode's toggle. */
  readonly checkMode: TemplateResult;
  /** The changes bell, or nothing while there is no change log to read. */
  readonly notices: TemplateResult | typeof nothing;
};

export type FloatingMenuIntents = {
  readonly grip: {
    readonly pointerdown: (event: PointerEvent) => void;
    readonly pointermove: (event: PointerEvent) => void;
    readonly pointerup: (event: PointerEvent) => void;
    readonly pointercancel: (event: PointerEvent) => void;
    readonly lostpointercapture: (event: PointerEvent) => void;
    readonly keydown: (event: KeyboardEvent) => void;
  };
};

/**
 * The menu. The grip is a real button: it takes focus, names itself, and docks
 * the menu with the arrow keys and Home/End, so the position is reachable
 * without a drag. It is drawn where the reader left it from the first render:
 * before it has been measured, by the dock's own insets, so nothing about the
 * menu waits for a measurement to become visible.
 */
export const renderFloatingMenu = (
  m: CoreMessages,
  placement: FloatingMenuPlacement,
  contents: FloatingMenuContents,
  intents: FloatingMenuIntents,
  dragging: boolean,
): TemplateResult => {
  const orientation = spotOrientation(placement.spot);
  const box = placement.box;
  return html`${renderMenuGhost(placement.ghost)}
    <div
      class="dpk-floating-menu"
      data-edge=${placement.spot.kind === 'header' ? 'header' : placement.spot.dock.edge}
      data-orientation=${orientation}
      ?data-dragging=${dragging}
      style=${box === null ? insetStyle(placement.insets) : `left: ${box.left}px; top: ${box.top}px`}
      role="group"
      aria-label=${m.menu}
    >
      <button
        class="dpk-chrome-action dpk-menu-grip"
        type="button"
        aria-label=${m.menuMove}
        data-tooltip=${m.menuMove}
        @pointerdown=${intents.grip.pointerdown}
        @pointermove=${intents.grip.pointermove}
        @pointerup=${intents.grip.pointerup}
        @pointercancel=${intents.grip.pointercancel}
        @lostpointercapture=${intents.grip.lostpointercapture}
        @keydown=${intents.grip.keydown}
      >
        ${orientation === 'horizontal' ? iconGripHorizontal() : iconGrip()}
      </button>
      ${contents.undoRedo} ${separator(orientation)} ${contents.review} ${separator(orientation)}
      <div class="dpk-menu-tools">${contents.checkMode} ${contents.notices}</div>
    </div>`;
};

/**
 * The room the header holds for the menu, between the page's own header
 * controls and the reader's tools. The menu is not inside it — it stays in the
 * overlay, so a drag keeps its pointer capture — but is drawn over it; while
 * the menu is carried, the slot shows itself as a place it can be let go.
 */
export const renderFloatingMenuSlot = (placement: FloatingMenuPlacement): TemplateResult => {
  const { state, width } = placement.slot;
  return html`<div
    class="dpk-menu-slot"
    data-state=${state}
    style=${state === 'empty' || width === null ? '' : `width: ${width}px`}
    aria-hidden="true"
  ></div>`;
};

/** Where an edge drop would put the menu, outlined while it is carried there. */
const renderMenuGhost = (ghost: MenuGhost | null): TemplateResult | typeof nothing =>
  ghost === null
    ? nothing
    : html`<div
        class="dpk-menu-drop"
        style="left: ${ghost.left}px; top: ${ghost.top}px; width: ${ghost.width}px; height: ${ghost.height}px"
        aria-hidden="true"
      ></div>`;

/** The dock's insets as the style that draws it, before the menu has a measured box. */
const insetStyle = (insets: readonly MenuInset[]): string =>
  insets.map(({ side, value }) => `${side}: ${value}px`).join('; ');

/** A hairline between two groups; across the menu when the menu is a row, down it when a column. */
const separator = (orientation: MenuOrientation): TemplateResult =>
  orientation === 'horizontal'
    ? html`<span class="dpk-menu-separator" role="separator" aria-orientation="vertical"></span>`
    : html`<span class="dpk-menu-separator" role="separator" aria-orientation="horizontal"></span>`;

/**
 * The menu's own look: a floating pill of icon buttons, one row or one column
 * depending on the edge it hangs from. The header row and the hand-off dock
 * are the two other fixed surfaces, so the menu keeps clear of both by its
 * own margin and by the area the controller measures.
 */
export const floatingMenuStyles = css`
  .dpk-floating-menu {
    position: fixed;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-glass);
    backdrop-filter: saturate(1.6) blur(14px);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    /* A reader with no position yet sees it appear, not slide across the page. */
    animation: dpk-scale-in 160ms var(--dpk-ease);
    /* A drag must not select the page's text under the pointer. */
    user-select: none;
  }

  .dpk-floating-menu[data-orientation='vertical'] {
    flex-direction: column;
  }

  .dpk-floating-menu[data-dragging] {
    cursor: grabbing;
    /* Lifted off the page while it is carried. */
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow-lg),
      0 18px 40px -18px var(--dpk-shade-3);
  }

  /* In the header it is one of the header's controls: no pill of its own, the
     height of the header's buttons. Carried out, it floats as a pill again. */
  .dpk-floating-menu[data-edge='header']:not([data-dragging]) {
    padding: 0;
    border-width: 0;
    background: transparent;
    backdrop-filter: none;
    box-shadow: none;
    animation: none;
  }

  /* The header's room for the menu: nothing while the menu is elsewhere (its
     negative margin takes back the header's gap), the menu's own row while it
     is there, and a place to let it go while it is carried. Its width is not
     animated: the menu is drawn where the slot is, measured after each render. */
  .dpk-menu-slot {
    flex: none;
    height: 32px;
    border-radius: var(--dpk-radius-lg);
    outline: 1.5px dashed transparent;
    outline-offset: 3px;
    transition:
      outline-color 160ms var(--dpk-ease),
      background-color 160ms var(--dpk-ease);
  }

  .dpk-menu-slot[data-state='empty'] {
    width: 0;
    margin-inline-start: -14px;
  }

  .dpk-menu-slot[data-state='offered'] {
    outline-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-sunken);
  }

  .dpk-menu-slot[data-state='targeted'] {
    outline-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
  }

  /* Where letting go on an edge would put the menu. */
  .dpk-menu-drop {
    position: fixed;
    z-index: 49;
    box-sizing: border-box;
    border: 1.5px dashed var(--dpk-blue);
    border-radius: var(--dpk-radius-lg);
    background: color-mix(in srgb, var(--dpk-blue-soft) 70%, transparent);
    pointer-events: none;
  }

  /* The grip: the one part of the menu that moves it. */
  .dpk-floating-menu .dpk-menu-grip {
    cursor: grab;
    border-style: dashed;
    color: var(--dpk-ink-faint);
    box-shadow: none;
    background: transparent;
  }

  .dpk-floating-menu .dpk-menu-grip:hover {
    color: var(--dpk-ink-soft);
    transform: none;
    box-shadow: none;
  }

  .dpk-floating-menu[data-dragging] .dpk-menu-grip {
    cursor: grabbing;
  }

  /* The grip's name above it when the menu is a row, beside it when a column. */
  .dpk-floating-menu[data-edge='bottom'] .dpk-chrome-action[data-tooltip]::after {
    top: auto;
    bottom: calc(100% + 8px);
  }

  .dpk-floating-menu[data-orientation='vertical'] .dpk-chrome-action[data-tooltip]::after {
    right: auto;
    left: calc(100% + 8px);
    top: 0;
  }

  .dpk-menu-separator {
    flex: none;
    align-self: stretch;
    width: 1px;
    margin: 2px;
    background: var(--dpk-rule);
  }

  .dpk-floating-menu[data-orientation='vertical'] .dpk-menu-separator {
    width: auto;
    height: 1px;
    margin: 2px 4px;
  }

  /* The last group of the menu: Check Mode, then the changes bell. */
  .dpk-menu-tools {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* A column menu stacks every group it holds; a row menu keeps them in line. */
  .dpk-floating-menu[data-orientation='vertical'] .dpk-undo-redo,
  .dpk-floating-menu[data-orientation='vertical'] .dpk-review-toggles,
  .dpk-floating-menu[data-orientation='vertical'] .dpk-menu-tools {
    flex-direction: column;
  }

  @media (max-width: 720px) {
    /* A phone keeps the menu on one row's worth of width whatever edge it hangs from. */
    .dpk-floating-menu {
      max-width: calc(100vw - 24px);
    }

    /* A narrow header has no row to spare: a menu kept in it falls back to its edge. */
    .dpk-menu-slot {
      display: none;
    }
  }
`;
