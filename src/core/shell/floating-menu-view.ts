/**
 * The floating menu's markup and look.
 *
 * It carries the page's own controls — undo and redo, the review's sections,
 * Check Mode and the changes bell — and nothing about where it goes: the dock
 * it hangs from, its orientation and its position come from
 * `floating-menu.ts`, and the effects from `floating-menu-controller.ts`.
 *
 * Every button in it is a `.dpk-chrome-action`, the icon-button class the
 * header's own controls use too, so the screen's chrome is one kind of thing.
 */
import { css, html, type nothing, type TemplateResult } from 'lit';

import type { CoreMessages } from '../messages';

import { iconGrip, iconGripHorizontal } from '../icons';
import { orientationOf, type MenuInset, type MenuOrientation, type MenuPlacement } from './floating-menu';

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
  const orientation = orientationOf(placement.dock.edge);
  const box = placement.box;
  return html`<div
    class="dpk-floating-menu"
    data-edge=${placement.dock.edge}
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
  }
`;
