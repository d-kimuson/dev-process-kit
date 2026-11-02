/**
 * The floating menu's markup and look.
 *
 * It carries the page's own controls — undo and redo, Check Mode and the
 * changes bell, then the review's sections last, so the review opens right
 * under them — and nothing about where it goes: the spot it rests at, its
 * orientation and its position come from `floating-menu.ts`, and the effects
 * from `floating-menu-controller.ts`.
 *
 * Every button in it is a `.dpk-chrome-action`, the icon-button class the
 * header's own controls use too, so the screen's chrome is one kind of thing.
 */
import { css, html, nothing, type TemplateResult } from 'lit';

import type { CoreMessages } from '../messages';

import { iconArrowUpToLine, iconGrip, iconGripHorizontal } from '../icons';
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

export type FloatingMenuSlotIntents = {
  /** The slot's button, while the menu is elsewhere: it brings the menu back into the header. */
  readonly toHeader: () => void;
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
      ${contents.undoRedo} ${separator(orientation)}
      <div class="dpk-menu-tools">${contents.checkMode} ${contents.notices}</div>
      ${separator(orientation)} ${contents.review}
    </div>`;
};

/**
 * The header's place for the menu, at the end of its row after the settings
 * gear. While the menu is there it is the room the menu takes — the menu is not
 * inside it but stays in the overlay, so a drag keeps its pointer capture, and
 * is drawn over it. While the menu is elsewhere it is a button that brings the
 * menu back. Either way it is where a carried menu can be let go, shown by its
 * look alone: its width does not change under a drag, so neither does the header.
 */
export const renderFloatingMenuSlot = (
  m: CoreMessages,
  placement: FloatingMenuPlacement,
  intents: FloatingMenuSlotIntents,
): TemplateResult => {
  const slot = placement.slot;
  if (slot.kind === 'return')
    return html`<button
      class="dpk-chrome-action dpk-menu-slot dpk-menu-return"
      type="button"
      data-drop=${slot.drop}
      aria-label=${m.menuReturn}
      data-tooltip=${m.menuReturn}
      @click=${intents.toHeader}
    >
      ${iconArrowUpToLine()}
    </button>`;
  return html`<div
    class="dpk-menu-slot"
    data-drop=${slot.drop}
    style=${slot.width === null ? '' : `width: ${slot.width}px`}
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

  /* The header's place for the menu: the menu's own row while the menu is
     there, a button that brings it back while it is elsewhere, and either way a
     place to let it go while it is carried. Only its look follows the drag; its
     width is not animated: the menu is drawn where the slot is, measured after
     each render. */
  .dpk-menu-slot {
    flex: none;
    height: 32px;
    border-radius: var(--dpk-radius-lg);
    outline: 1.5px dashed transparent;
    outline-offset: 3px;
    transition:
      outline-color 160ms var(--dpk-ease),
      background-color 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }

  /* The button that brings the menu back is tinted with the accent, so among
     the header's grey icon buttons it reads as the one waiting to be pressed. */
  .dpk-menu-return {
    border-color: color-mix(in srgb, var(--dpk-accent) 60%, transparent);
    background: color-mix(in srgb, var(--dpk-accent) 14%, transparent);
    color: var(--dpk-accent);
  }

  /* Filled under the pointer, the accent's own button look: it reads as pressable. */
  .dpk-menu-return:hover {
    border-color: var(--dpk-accent);
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    box-shadow:
      var(--dpk-bevel),
      0 6px 16px -8px color-mix(in srgb, var(--dpk-accent) 70%, transparent);
  }

  .dpk-menu-slot[data-drop='offered'] {
    outline-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-sunken);
  }

  /* Offered under a drag, the button keeps its tint: it is still the way back. */
  .dpk-menu-return[data-drop='offered'] {
    outline-color: color-mix(in srgb, var(--dpk-accent) 60%, transparent);
    background: color-mix(in srgb, var(--dpk-accent) 14%, transparent);
  }

  .dpk-menu-slot[data-drop='targeted'] {
    outline-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
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

  /* The group before the review's sections: Check Mode, then the changes bell. */
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
