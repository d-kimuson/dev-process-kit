import { html, nothing, type TemplateResult } from 'lit';

import type { WhiteboardMessages } from '../messages';

import { iconChevronDown, iconComment, iconTrash } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { ARRANGE_DIRECTIONS, type ArrangeDirection } from '../arrange';
import { toScreen, type Viewport } from '../interactions';
import { boardBounds, connectorPath } from '../layout';
import {
  findItem,
  hasColor,
  hasFontSize,
  WB_COLORS,
  WB_CONNECTOR_ROUTES,
  WB_FONT_SIZES,
  type WbColor,
  type WbConnector,
  type WbConnectorRoute,
  type WbFontSize,
  type WbItem,
  type WhiteboardState,
} from '../model';
import { iconArrange, iconLayers, iconRoute } from './icons';
import { colorStyle } from './palette';

export type WbToolbarHandlers = {
  readonly setColor: (color: WbColor) => void;
  readonly setFontSize: (fontSize: WbFontSize) => void;
  readonly arrange: (direction: ArrangeDirection) => void;
  readonly toggleArrangeMenu: () => void;
  readonly toggleComment: (target: string) => void;
  readonly deleteSelection: () => void;
  readonly setLabel: (connectorId: string, label: string) => void;
  readonly setRoute: (connectorId: string, route: WbConnectorRoute) => void;
};

export type WbSelection =
  /** One or more items; the tools apply to every one they fit. */
  | { readonly kind: 'items'; readonly items: readonly WbItem[] }
  | { readonly kind: 'connector'; readonly connector: WbConnector };

export type WbToolbarProps = {
  readonly m: WhiteboardMessages;
  readonly state: WhiteboardState;
  readonly viewport: Viewport;
  readonly selection: WbSelection;
  /** The stacking moves that would change what covers what; none hides the control. */
  readonly arrange: ReadonlySet<ArrangeDirection>;
  readonly arrangeMenuOpen: boolean;
  readonly commenting: boolean;
  readonly comments: number;
  readonly handlers: WbToolbarHandlers;
};

/** Room above the selection for its toolbar; a frame's title sits above its box, so it needs more. */
const GAP = { item: 14, frame: 40, connector: 18 };

const anchorOf = (props: WbToolbarProps): { x: number; y: number } | undefined => {
  const { selection, viewport, state } = props;
  if (selection.kind === 'items') {
    const box = boardBounds(selection.items);
    if (box === null) return undefined;
    const titled = selection.items.some((item) => item.kind === 'frame' && item.y === box.y);
    const top = toScreen(viewport, { x: box.x + box.w / 2, y: box.y });
    return { x: top.x, y: top.y - (titled ? GAP.frame : GAP.item) };
  }
  const from = findItem(state, selection.connector.from);
  const to = findItem(state, selection.connector.to);
  if (from === undefined || to === undefined) return undefined;
  const mid = toScreen(viewport, connectorPath(from, to, selection.connector.route).mid);
  return { x: mid.x, y: mid.y - GAP.connector };
};

const stop = (event: Event): void => event.stopPropagation();

const separator = html`<span class="wb-toolbar-sep" aria-hidden="true"></span>`;

/** The one value every item shares, or `undefined` when they differ. */
const shared = <T>(values: readonly T[]): T | undefined =>
  values.length > 0 && values.every((value) => value === values[0]) ? values[0] : undefined;

/**
 * The floating toolbar over the selection: color, text size and stacking
 * order (when something overlaps) for items, line shape and label for a connector; comment (one thing
 * selected) and delete for both.
 */
export const renderSelectionToolbar = (props: WbToolbarProps): TemplateResult | typeof nothing => {
  const anchor = anchorOf(props);
  if (anchor === undefined) return nothing;
  const { m, selection, handlers } = props;
  const single =
    selection.kind === 'connector'
      ? selection.connector
      : selection.items.length === 1
        ? selection.items[0]
        : undefined;
  const ref =
    single === undefined ? undefined : selection.kind === 'connector' ? `connector:${single.id}` : `item:${single.id}`;
  const label =
    selection.kind === 'items' && selection.items.length > 1
      ? m.selectionCount(selection.items.length)
      : m.selectionLabel;
  return html`<div
    class="wb-toolbar"
    role="toolbar"
    aria-label=${label}
    style=${`left:${anchor.x}px;top:${anchor.y}px`}
    @pointerdown=${stop}
    @dblclick=${stop}
    @keydown=${stop}
  >
    ${selection.kind === 'items' ? renderItemTools(props, selection.items) : renderConnectorTools(props, selection.connector)}
    ${
      ref === undefined
        ? nothing
        : html`<button
            type="button"
            class="dpk-icon-btn wb-toolbar-btn"
            data-role="comment"
            aria-label=${m.comment}
            title=${m.comment}
            data-active=${String(props.commenting)}
            @click=${() => handlers.toggleComment(ref)}
          >
            ${iconComment()}
            ${props.comments > 0 ? html`<span class="wb-toolbar-count">${props.comments}</span>` : nothing}
          </button>`
    }
    <button
      type="button"
      class="dpk-icon-btn wb-toolbar-btn"
      data-role="delete"
      aria-label=${m.delete}
      title=${m.delete}
      @click=${() => handlers.deleteSelection()}
    >
      ${iconTrash()}
    </button>
  </div>`;
};

/** The keys that do the same from the board. */
const ARRANGE_SHORTCUT = {
  front: '⌘/Ctrl ]',
  forward: ']',
  backward: '[',
  back: '⌘/Ctrl [',
} as const satisfies Record<ArrangeDirection, string>;

const renderItemTools = (props: WbToolbarProps, items: readonly WbItem[]): TemplateResult => {
  const { m, handlers } = props;
  const colors = items.filter(hasColor).map((item) => item.color);
  const sizes = items.flatMap((item) => (hasFontSize(item) ? [item.fontSize] : []));
  const color = shared(colors);
  const size = shared(sizes);
  return html`
    ${
      colors.length > 0
        ? html`<div class="wb-swatches" role="radiogroup" aria-label=${m.colorLabelPrefix}>
              ${WB_COLORS.map(
                (option) =>
                  html`<button
                    type="button"
                    class="wb-swatch"
                    role="radio"
                    data-color=${option}
                    style=${colorStyle(option)}
                    aria-checked=${String(color === option)}
                    aria-label=${`${m.colorLabelPrefix}: ${m.colorLabel(option)}`}
                    title=${m.colorLabel(option)}
                    @click=${() => handlers.setColor(option)}
                  ></button>`,
              )}
            </div>
            ${separator}`
        : nothing
    }
    ${
      sizes.length > 0
        ? html`<div class="wb-choice" role="radiogroup" aria-label=${m.fontSizeLabelPrefix}>
              ${WB_FONT_SIZES.map(
                (option) =>
                  html`<button
                    type="button"
                    class="wb-choice-btn"
                    role="radio"
                    data-font-size=${option}
                    aria-checked=${String(size === option)}
                    aria-label=${`${m.fontSizeLabelPrefix}: ${m.fontSizeLabel(option)}`}
                    title=${`${m.fontSizeLabelPrefix}: ${m.fontSizeLabel(option)}`}
                    @click=${() => handlers.setFontSize(option)}
                  >
                    ${m.fontSizeShort(option)}
                  </button>`,
              )}
            </div>
            ${separator}`
        : nothing
    }
    ${props.arrange.size > 0 ? html`${renderArrange(props)} ${separator}` : nothing}
  `;
};

/** Stacking order: one button that opens a menu of named moves, each with its key. */
const renderArrange = (props: WbToolbarProps): TemplateResult => {
  const { m, handlers } = props;
  const label = {
    front: m.bringToFront,
    forward: m.bringForward,
    backward: m.sendBackward,
    back: m.sendToBack,
  } as const satisfies Record<ArrangeDirection, string>;
  const closeOnEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') handlers.toggleArrangeMenu();
  };
  return html`<div class="wb-menu-anchor" @keydown=${closeOnEscape}>
    <button
      type="button"
      class="wb-menu-btn"
      data-role="arrange"
      aria-haspopup="menu"
      aria-expanded=${String(props.arrangeMenuOpen)}
      aria-label=${m.arrangeLabel}
      title=${m.arrangeLabel}
      @click=${() => handlers.toggleArrangeMenu()}
    >
      ${iconLayers()} ${iconChevronDown()}
    </button>
    ${
      props.arrangeMenuOpen
        ? html`<div class="wb-menu" role="menu" aria-label=${m.arrangeLabel}>
            ${ARRANGE_DIRECTIONS.map(
              (direction) =>
                html`<button
                  type="button"
                  class="wb-menu-item"
                  role="menuitem"
                  data-arrange=${direction}
                  ?disabled=${!props.arrange.has(direction)}
                  @click=${() => handlers.arrange(direction)}
                >
                  ${iconArrange(direction)}
                  <span class="wb-menu-label">${label[direction]}</span>
                  <kbd class="wb-menu-key">${ARRANGE_SHORTCUT[direction]}</kbd>
                </button>`,
            )}
          </div>`
        : nothing
    }
  </div>`;
};

const renderConnectorTools = (props: WbToolbarProps, connector: WbConnector): TemplateResult => {
  const { m, handlers } = props;
  return html`<div class="wb-choice" role="radiogroup" aria-label=${m.routeLabelPrefix}>
      ${WB_CONNECTOR_ROUTES.map(
        (route) =>
          html`<button
            type="button"
            class="wb-choice-btn wb-choice-btn--icon"
            role="radio"
            data-route=${route}
            aria-checked=${String(connector.route === route)}
            aria-label=${`${m.routeLabelPrefix}: ${m.routeLabel(route)}`}
            title=${m.routeLabel(route)}
            @click=${() => handlers.setRoute(connector.id, route)}
          >
            ${iconRoute(route)}
          </button>`,
      )}
    </div>
    ${separator}
    <dpk-component-inline-edit
      class="wb-toolbar-label"
      .value=${connector.label ?? ''}
      .placeholder=${m.labelPlaceholder}
      .label=${m.labelField}
      @dpk-commit=${onCommit((label) => handlers.setLabel(connector.id, label))}
    ></dpk-component-inline-edit>`;
};
