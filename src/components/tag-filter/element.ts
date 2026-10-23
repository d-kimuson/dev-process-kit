import { LitElement, css, html, nothing, type CSSResultGroup } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { LocaleController } from '../../core/locale-controller';
import { tokens } from '../../core/theme';
import { observeJsonChild } from '../../lib/dom/base-data';
import { clearTags, setTagMatch, tagStateMatches, toggleTag, type TagMatch, type TagState } from '../diagram/model';
import { tagFilterMessages, type TagFilterMessages } from './messages';
import { normalizeOptions, parseTagFilterData, type TagFilterOption } from './model';

const MATCH_LABELS: readonly (readonly [TagMatch, string])[] = [
  ['single', 'Single'],
  ['all', 'AND'],
  ['any', 'OR'],
];

/**
 * `<dpk-tag-filter>` — a row of tag chips with Single / AND / OR
 * matching: the filter row every diagram uses.
 *
 * Give the tags as the `tags` property or a JSON child (a list, or
 * `{ "tags": [...], "active": [...], "match": "any" }`); a tag is a name or
 * `{ "tag", "count" }`. The reader's pick is view state: it is never recorded
 * in the draft. Every change fires `dpk-tag-filter-change` with
 * `{ active, match }`, and `passes(tags)` answers whether an item's tags pass.
 *
 * With no tags to filter by, the Single/AND/OR toggle has nothing to switch
 * between, so the whole row renders nothing instead of an empty bar.
 */
export class DpkTagFilter extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    css`
      :host {
        display: block;
        flex-shrink: 0;
      }

      .diagram-tags {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
        padding: 7px 12px;
        border-bottom: 1px solid var(--dpk-rule);
        background: var(--dpk-paper);
      }

      :host([bare]) .diagram-tags {
        padding: 0;
        border-bottom: 0;
        background: none;
      }

      .diagram-match {
        display: flex;
        gap: 2px;
        padding: 3px;
        margin-right: 6px;
        border: 1px solid var(--dpk-rule);
        border-radius: var(--dpk-radius-sm);
        background: var(--dpk-paper-sunken);
        box-shadow: inset 0 1px 2px var(--dpk-shade-1);
      }

      .diagram-match button {
        border: 0;
        border-radius: var(--dpk-radius-xs);
        padding: 4px 8px;
        background: transparent;
        color: var(--dpk-ink-faint);
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition:
          background 160ms var(--dpk-ease),
          color 160ms var(--dpk-ease),
          box-shadow 160ms var(--dpk-ease);
      }

      .diagram-match button:hover[aria-pressed='false'] {
        color: var(--dpk-ink-soft);
      }

      .diagram-match button[aria-pressed='true'] {
        background: var(--dpk-paper-raised);
        color: var(--dpk-ink);
        font-weight: 650;
        box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
      }

      .dpk-tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 100%;
        padding: 4px 9px;
        border: 1px solid transparent;
        border-radius: var(--dpk-radius-xs);
        background: var(--dpk-paper-inset);
        color: var(--dpk-ink-soft);
        font-size: 10.5px;
        cursor: pointer;
        transition:
          background 140ms var(--dpk-ease),
          color 140ms var(--dpk-ease),
          border-color 140ms var(--dpk-ease),
          box-shadow 140ms var(--dpk-ease);
      }

      .dpk-tag:hover {
        background: var(--dpk-paper-sunken);
        color: var(--dpk-ink);
      }

      .dpk-tag[aria-pressed='true'] {
        border-color: color-mix(in srgb, var(--dpk-blue) 45%, transparent);
        background: var(--dpk-blue-soft);
        color: var(--dpk-blue);
        font-weight: 600;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dpk-blue) 20%, transparent);
      }

      .dpk-tag-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dpk-tag-count {
        flex: none;
        font-family: var(--dpk-mono);
        font-size: 9px;
        opacity: 0.7;
        font-variant-numeric: tabular-nums;
      }

      .dpk-tag-clear {
        border: 0;
        background: none;
        padding: 4px 6px;
        color: var(--dpk-ink-faint);
        font-size: 10px;
        cursor: pointer;
      }

      button:focus-visible {
        outline: none;
        box-shadow: var(--dpk-focus);
      }
    `,
  ];

  static override properties = {
    tags: { attribute: false },
    active: { attribute: false },
    match: { type: String, reflect: true },
  };

  /** The tags offered, in order. */
  declare tags: readonly TagFilterOption[];
  /** The tags picked. */
  declare active: readonly string[];
  declare match: TagMatch;

  readonly #i18n = new LocaleController(this);
  #stopJsonChild: (() => void) | null = null;

  constructor() {
    super();
    this.tags = [];
    this.active = [];
    this.match = 'single';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopJsonChild = observeJsonChild(this, parseTagFilterData, (result) => {
      if (!result.ok) {
        console.warn(`[dev-process-kit] ${this.localName}: ${result.error}`);
        return;
      }
      this.tags = result.value.tags;
      if (result.value.active !== null) this.active = result.value.active;
      if (result.value.match !== null) this.match = result.value.match;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
  }

  /** Whether an item carrying `tags` passes the filter (always, with nothing picked). */
  passes(tags: readonly string[]): boolean {
    return tagStateMatches(tags, this.#state);
  }

  protected override render(): unknown {
    const options = normalizeOptions(this.tags);
    // Nothing to filter by: the Single/AND/OR toggle has no meaning without
    // tags, and with no toggle and no tags the row itself has nothing to
    // show, so the whole thing collapses rather than leaving an empty bar.
    if (options.length === 0) return nothing;
    const m = this.#m;
    return html`
      <div class="diagram-tags" part="row" role="group" aria-label=${m.tagFilter}>
        <div class="diagram-match" role="group" aria-label=${m.tagMatch}>
          ${MATCH_LABELS.map(
            ([id, label]) => html`
              <button
                type="button"
                data-match=${id}
                aria-pressed=${this.match === id ? 'true' : 'false'}
                @click=${() => this.#change(setTagMatch(this.#state, id))}
              >
                ${label}
              </button>
            `,
          )}
        </div>
        ${repeat(
          options,
          (option) => option.tag,
          (option) => html`
            <button
              type="button"
              class="dpk-tag"
              data-tag=${option.tag}
              aria-pressed=${this.active.includes(option.tag) ? 'true' : 'false'}
              @click=${() => this.#change(toggleTag(this.#state, option.tag))}
            >
              <span class="dpk-tag-name" title=${option.tag}>${option.tag}</span>${
                option.count === null ? nothing : html`<span class="dpk-tag-count">${option.count}</span>`
              }
            </button>
          `,
        )}
        ${
          this.active.length > 0
            ? html`<button type="button" class="dpk-tag-clear" @click=${() => this.#change(clearTags(this.#state))}>
                ${m.clearTags}
              </button>`
            : nothing
        }
      </div>
    `;
  }

  get #m(): TagFilterMessages {
    return tagFilterMessages(this.#i18n.locale);
  }

  get #state(): TagState {
    return { active: this.active, match: this.match };
  }

  #change(next: TagState): void {
    this.active = next.active;
    this.match = next.match;
    this.dispatchEvent(
      new CustomEvent('dpk-tag-filter-change', {
        detail: { active: next.active, match: next.match },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
