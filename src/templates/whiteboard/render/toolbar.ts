import { html, nothing, type TemplateResult } from 'lit';

import type { WhiteboardMessages } from '../messages';

import { iconComment, iconLink, iconPencil, iconTrash } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { toScreen, type Viewport } from '../interactions';
import { connectorGeometry } from '../layout';
import {
  findItem,
  hasColor,
  WB_COLORS,
  type WbColor,
  type WbConnector,
  type WbItem,
  type WhiteboardState,
} from '../model';
import { colorStyle } from './palette';

export type WbToolbarHandlers = {
  readonly setColor: (itemId: string, color: WbColor) => void;
  readonly edit: (itemId: string) => void;
  readonly connect: (itemId: string) => void;
  readonly toggleComment: (target: string) => void;
  readonly deleteItem: (itemId: string) => void;
  readonly setLabel: (connectorId: string, label: string) => void;
  readonly deleteConnector: (connectorId: string) => void;
};

export type WbSelection =
  | { readonly kind: 'item'; readonly item: WbItem }
  | { readonly kind: 'connector'; readonly connector: WbConnector };

export type WbToolbarProps = {
  readonly m: WhiteboardMessages;
  readonly state: WhiteboardState;
  readonly viewport: Viewport;
  readonly selection: WbSelection;
  readonly commenting: boolean;
  readonly comments: number;
  readonly handlers: WbToolbarHandlers;
};

/** Room above an item for its toolbar; a frame's title sits above its box, so it needs more. */
const GAP = { item: 14, frame: 40, connector: 18 };

const anchorOf = (props: WbToolbarProps): { x: number; y: number } | undefined => {
  const { selection, viewport, state } = props;
  if (selection.kind === 'item') {
    const { item } = selection;
    const top = toScreen(viewport, { x: item.x + item.w / 2, y: item.y });
    return { x: top.x, y: top.y - (item.kind === 'frame' ? GAP.frame : GAP.item) };
  }
  const from = findItem(state, selection.connector.from);
  const to = findItem(state, selection.connector.to);
  if (from === undefined || to === undefined) return undefined;
  const mid = toScreen(viewport, connectorGeometry(from, to).mid);
  return { x: mid.x, y: mid.y - GAP.connector };
};

const stop = (event: Event): void => event.stopPropagation();

/** The floating toolbar over the selection: color, edit, connect, comment, delete. */
export const renderSelectionToolbar = (props: WbToolbarProps): TemplateResult | typeof nothing => {
  const anchor = anchorOf(props);
  if (anchor === undefined) return nothing;
  const { m, selection, handlers } = props;
  const ref = selection.kind === 'item' ? `item:${selection.item.id}` : `connector:${selection.connector.id}`;
  return html`<div
    class="wb-toolbar"
    role="toolbar"
    aria-label=${m.selectionLabel}
    style=${`left:${anchor.x}px;top:${anchor.y}px`}
    @pointerdown=${stop}
    @dblclick=${stop}
    @keydown=${stop}
  >
    ${selection.kind === 'item' ? renderItemTools(props, selection.item) : renderConnectorTools(props, selection.connector)}
    <button
      type="button"
      class="dpk-icon-btn wb-toolbar-btn"
      data-role="comment"
      aria-label=${m.comment}
      title=${m.comment}
      data-active=${String(props.commenting)}
      @click=${() => handlers.toggleComment(ref)}
    >
      ${iconComment()} ${props.comments > 0 ? html`<span class="wb-toolbar-count">${props.comments}</span>` : nothing}
    </button>
    <button
      type="button"
      class="dpk-icon-btn wb-toolbar-btn"
      data-role="delete"
      aria-label=${m.delete}
      title=${m.delete}
      @click=${() =>
        selection.kind === 'item'
          ? handlers.deleteItem(selection.item.id)
          : handlers.deleteConnector(selection.connector.id)}
    >
      ${iconTrash()}
    </button>
  </div>`;
};

const renderItemTools = (props: WbToolbarProps, item: WbItem): TemplateResult => {
  const { m, handlers } = props;
  return html`
    ${
      hasColor(item)
        ? html`<div class="wb-swatches" role="radiogroup" aria-label=${m.colorLabelPrefix}>
              ${WB_COLORS.map(
                (color) =>
                  html`<button
                    type="button"
                    class="wb-swatch"
                    role="radio"
                    data-color=${color}
                    style=${colorStyle(color)}
                    aria-checked=${String(item.color === color)}
                    aria-label=${`${m.colorLabelPrefix}: ${m.colorLabel(color)}`}
                    title=${m.colorLabel(color)}
                    @click=${() => handlers.setColor(item.id, color)}
                  ></button>`,
              )}
            </div>
            <span class="wb-toolbar-sep" aria-hidden="true"></span>`
        : nothing
    }
    <button
      type="button"
      class="dpk-icon-btn wb-toolbar-btn"
      data-role="edit"
      aria-label=${item.kind === 'frame' ? m.renameFrame : m.editText}
      title=${item.kind === 'frame' ? m.renameFrame : m.editText}
      @click=${() => handlers.edit(item.id)}
    >
      ${iconPencil()}
    </button>
    <button
      type="button"
      class="dpk-icon-btn wb-toolbar-btn"
      data-role="connect"
      aria-label=${m.connect}
      title=${m.connect}
      @click=${() => handlers.connect(item.id)}
    >
      ${iconLink()}
    </button>
  `;
};

const renderConnectorTools = (props: WbToolbarProps, connector: WbConnector): TemplateResult => {
  const { m, handlers } = props;
  return html`<dpk-component-inline-edit
    class="wb-toolbar-label"
    .value=${connector.label ?? ''}
    .placeholder=${m.labelPlaceholder}
    .label=${m.labelField}
    @dpk-commit=${onCommit((label) => handlers.setLabel(connector.id, label))}
  ></dpk-component-inline-edit>`;
};
