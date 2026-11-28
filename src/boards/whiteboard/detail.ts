import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { WbSelectionRef } from './element';
import type { WhiteboardMessages } from './messages';

import { controls, tokens } from '../../core/theme';
import { onCommit } from '../../lib/dom/events';
import {
  findConnector,
  findItem,
  frameOf,
  itemText,
  type WbConnector,
  type WbItem,
  type WhiteboardState,
} from './model';
import { excerpt } from './present';

/** What the detail asks of its board: each returns whether a template recorded it. */
export type WhiteboardDetailActions = {
  setText(itemId: string, text: string): boolean;
  setLabel(connectorId: string, label: string): boolean;
};

/** What the detail calls an end of a connector: the item's text, or its id once it is gone. */
const endName = (m: WhiteboardMessages, state: WhiteboardState, id: string): string => {
  const end = findItem(state, id);
  return end === undefined ? id : excerpt(m, itemText(end));
};

const detailStyles = css`
  :host {
    display: grid;
    align-content: start;
    gap: 18px;
  }
  .wb-detail-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  .wb-detail-field > dpk-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .wb-detail-value {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .wb-detail-list {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .wb-detail-label {
    color: var(--dpk-ink-faint);
  }
  .wb-detail-error {
    margin: 0;
    padding: 4px 7px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-size: 11.5px;
    line-height: 1.4;
  }
`;

/**
 * The detail of a whiteboard item or connector, drawn in the side panel: its
 * text or label edited in place through the board's element actions, and
 * where it sits on the board (its frame and what it connects).
 */
export class DpkInternalWhiteboardDetail extends LitElement {
  static override styles: CSSResultGroup = [tokens, controls, detailStyles];

  static override properties = {
    state: { attribute: false },
    selection: { attribute: false },
    messages: { attribute: false },
    actions: { attribute: false },
    failed: { state: true },
  };

  declare state: WhiteboardState | null;
  declare selection: WbSelectionRef | null;
  declare messages: WhiteboardMessages | null;
  declare actions: WhiteboardDetailActions | null;
  /** An edit from here that no template recorded. */
  declare failed: boolean;

  constructor() {
    super();
    this.state = null;
    this.selection = null;
    this.messages = null;
    this.actions = null;
    this.failed = false;
  }

  #record(accepted: boolean | undefined): void {
    this.failed = accepted !== true;
  }

  protected override render(): TemplateResult | typeof nothing {
    const { state, selection, messages: m } = this;
    if (state === null || selection === null || m === null) return nothing;
    const body =
      selection.kind === 'item'
        ? this.#renderItem(state, m, findItem(state, selection.id))
        : this.#renderConnector(state, m, findConnector(state, selection.id));
    if (body === nothing) return nothing;
    return html`${body}${this.failed ? html`<p class="wb-detail-error" role="alert">${m.notRecorded}</p>` : nothing}`;
  }

  #renderItem(
    state: WhiteboardState,
    m: WhiteboardMessages,
    item: WbItem | undefined,
  ): TemplateResult | typeof nothing {
    if (item === undefined) return nothing;
    const frame = frameOf(state, item);
    const name = (id: string): string => endName(m, state, id);
    const connections = state.connectors.flatMap((connector) =>
      connector.from === item.id
        ? [{ connector, text: m.connectedTo(name(connector.to)) }]
        : connector.to === item.id
          ? [{ connector, text: m.connectedFrom(name(connector.from)) }]
          : [],
    );
    const textLabel = item.kind === 'frame' ? m.frameTitleField : m.textField;
    return html`
      <section class="wb-detail-field" data-field="text">
        <span class="dpk-label">${textLabel}</span>
        <dpk-inline-edit
          wrap
          ?multiline=${item.kind !== 'frame'}
          .value=${itemText(item)}
          .label=${textLabel}
          .placeholder=${m.textPlaceholder}
          @dpk-commit=${onCommit((text) => this.#record(this.actions?.setText(item.id, text)))}
        ></dpk-inline-edit>
      </section>
      <section class="wb-detail-field" data-field="frame">
        <span class="dpk-label">${m.frameField}</span>
        <p class="wb-detail-value">${frame === undefined ? m.noFrame : excerpt(m, frame.title)}</p>
      </section>
      <section class="wb-detail-field" data-field="connections">
        <span class="dpk-label">${m.connectionsField}</span>
        ${
          connections.length === 0
            ? html`<p class="wb-detail-value">${m.noConnections}</p>`
            : html`<ul class="wb-detail-list">
                ${connections.map(
                  ({ connector, text }) =>
                    html`<li class="wb-detail-value">
                      ${text}${
                        connector.label === undefined || connector.label === ''
                          ? nothing
                          : html` <span class="wb-detail-label">${m.labeled(connector.label)}</span>`
                      }
                    </li>`,
                )}
              </ul>`
        }
      </section>
    `;
  }

  #renderConnector(
    state: WhiteboardState,
    m: WhiteboardMessages,
    connector: WbConnector | undefined,
  ): TemplateResult | typeof nothing {
    if (connector === undefined) return nothing;
    const name = (id: string): string => endName(m, state, id);
    return html`
      <section class="wb-detail-field" data-field="ends">
        <span class="dpk-label">${m.endsField}</span>
        <p class="wb-detail-value">${m.connection(name(connector.from), name(connector.to))}</p>
      </section>
      <section class="wb-detail-field" data-field="label">
        <span class="dpk-label">${m.labelField}</span>
        <dpk-inline-edit
          .value=${connector.label ?? ''}
          .label=${m.labelField}
          .placeholder=${m.labelPlaceholder}
          @dpk-commit=${onCommit((label) => this.#record(this.actions?.setLabel(connector.id, label)))}
        ></dpk-inline-edit>
      </section>
    `;
  }
}

export const defineWhiteboardDetail = (): void => {
  if (!customElements.get('dpk-internal-whiteboard-detail'))
    customElements.define('dpk-internal-whiteboard-detail', DpkInternalWhiteboardDetail);
};
