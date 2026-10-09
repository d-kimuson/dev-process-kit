import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';

import type { DraftAction } from '../../../core/types';
import type { StoryLink, UserStory } from '../model';
import type { CardIntent, CardMode } from '../ui-mode';

import { composerMessages } from '../../../components/comment-composer/messages';
import { presentComposer } from '../../../components/comment-composer/present';
import { renderComposer } from '../../../components/comment-composer/view';
import { commentBody } from '../../../core/comment';
import { iconComment, iconTrash } from '../../../core/icons';
import { LocaleController } from '../../../core/locale-controller';
import { PopoverController } from '../../../core/popover-controller';
import { controls, popoverSurface } from '../../../core/theme';
import { describeLink } from '../../../lib/link-label';
import { usmMessages, type UsmMessages } from '../messages';
import { linkIcon, linkStyles } from '../render/link-icon';
import { statusIcon, statusStyles } from '../render/tone';
import { statusViewOf, type StatusView } from '../status-view';

const COMPOSER_SIZE = { width: 300, height: 260 };
/** Links beyond this many collapse into a `+n` chip; the panel lists them all. */
const MAX_LINK_CHIPS = 3;

const cardStyles = css`
  /*
   * The card takes its status's color (--usm-tone, set by the map) over its
   * whole surface, like a sticky note of that color: a tinted face, a tinted
   * edge and a tinted foot, never a colored strip down one side. The status
   * icon leads the title; the tools float above the top edge on hover.
   */
  :host {
    --card-tone: var(--usm-tone, var(--dpk-ink-faint));
    position: relative;
    display: grid;
    gap: 7px;
    background:
      radial-gradient(120% 70% at 0% 0%, color-mix(in srgb, var(--card-tone) 16%, transparent), transparent 70%),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--card-tone) 9%, var(--dpk-paper-raised)),
        var(--dpk-paper-raised) 80%
      );
    border: 1px solid color-mix(in srgb, var(--card-tone) 30%, var(--dpk-rule));
    border-radius: var(--dpk-radius);
    box-shadow:
      var(--dpk-bevel),
      0 1px 0 color-mix(in srgb, var(--card-tone) 12%, transparent),
      0 6px 14px -10px color-mix(in srgb, var(--card-tone) 55%, transparent),
      var(--dpk-shadow-xs);
    padding: 11px 12px 10px;
    cursor: pointer;
    transition:
      box-shadow 200ms var(--dpk-ease),
      transform 200ms var(--dpk-ease),
      border-color 200ms var(--dpk-ease);
  }

  :host(:hover) {
    border-color: color-mix(in srgb, var(--card-tone) 50%, var(--dpk-rule-strong));
    box-shadow:
      var(--dpk-bevel),
      0 10px 22px -12px color-mix(in srgb, var(--card-tone) 65%, transparent),
      var(--dpk-shadow-sm);
    transform: translateY(-2px);
  }

  :host([focused]) {
    border-color: var(--dpk-blue);
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow),
      0 0 0 2px color-mix(in srgb, var(--dpk-blue) 22%, transparent);
  }

  :host([dragging]) {
    opacity: 0.45;
    transform: none;
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    min-width: 0;
  }

  .card-status {
    flex: none;
    display: inline-flex;
    margin-top: 2px;
  }

  .card-name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 13px;
    font-weight: 640;
    letter-spacing: -0.01em;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .card-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--dpk-ink-soft);
    white-space: pre-wrap;
  }

  .card-links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  .card-links .link-chip {
    border-color: color-mix(in srgb, var(--card-tone) 30%, var(--dpk-rule));
    background: color-mix(in srgb, var(--card-tone) 5%, var(--dpk-paper-raised));
  }

  /* Where the story sits and what was said about it, under a tinted rule. */
  .card-foot {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-top: 1px;
    padding-top: 7px;
    border-top: 1px dashed color-mix(in srgb, var(--card-tone) 28%, var(--dpk-rule));
  }

  .card-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 1px 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--card-tone) 12%, var(--dpk-paper-sunken));
    color: var(--dpk-ink-soft);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 18px;
  }

  .card-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-chip[data-kind='comments'] {
    margin-left: auto;
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }

  .card-chip svg {
    flex: none;
    width: 12px;
    height: 12px;
  }

  .card-tools {
    position: absolute;
    top: -13px;
    right: 8px;
    z-index: 1;
    display: flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    opacity: 0;
    transform: translateY(3px);
    pointer-events: none;
    transition:
      opacity 150ms ease,
      transform 150ms var(--dpk-ease);
  }

  .card-tools .dpk-icon-btn {
    width: 24px;
    height: 24px;
  }

  :host(:hover) .card-tools,
  :host(:focus-within) .card-tools,
  :host([focused]) .card-tools,
  :host([data-mode='commenting']) .card-tools {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
`;

/**
 * `<dpk-internal-usm-story-card>` — one user story on the map.
 *
 * The card shows a story; editing it happens in the story panel the card
 * opens on click. The card owns only what is ephemeral *to itself*: the
 * comment draft while it is typed and the placement of its composer. Which card is being edited,
 * commented on is the host's decision (`UsmUiMode`); the card
 * just renders the `mode` it is given and reports `CardIntent`s through
 * `onIntent`. It never dispatches actions.
 *
 * Drag & drop is bound by the host on this element (it is the draggable), so
 * `dragging` is a plain reflected input like `focused`.
 */
export class DpkInternalUsmStoryCard extends LitElement {
  static override styles = [controls, statusStyles, linkStyles, cardStyles, popoverSurface];

  static override properties = {
    story: { attribute: false },
    stepName: { attribute: false },
    statuses: { attribute: false },
    notes: { attribute: false },
    mode: { type: String, reflect: true, attribute: 'data-mode' },
    focused: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
    onIntent: { attribute: false },
  };

  declare story: UserStory | null;
  /** The story's step, shown where the column does not already say it; `''` hides it. */
  declare stepName: string;
  /** The statuses the map defines; with none, the card shows no status. */
  declare statuses: readonly StatusView[];
  /** Comments already left on this story. */
  declare notes: readonly DraftAction[];
  declare mode: CardMode;
  declare focused: boolean;
  declare dragging: boolean;
  declare onIntent: ((intent: CardIntent) => void) | null;

  /** Typed text is read on submit; the textarea owns it while typing. */
  #draft = '';
  readonly #popovers = new PopoverController(this);
  readonly #i18n = new LocaleController(this);

  constructor() {
    super();
    this.story = null;
    this.stepName = '';
    this.statuses = [];
    this.notes = [];
    this.mode = 'view';
    this.focused = false;
    this.dragging = false;
    this.onIntent = null;
    this.addEventListener('click', () => this.#report({ kind: 'select' }));
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('mode') && this.mode !== 'commenting') this.#draft = '';
    if (this.mode !== 'commenting') return;
    // The composer floats in the top layer so opening it never moves the card;
    // it hangs off the comment button that opened it.
    const composer = this.renderRoot.querySelector<HTMLElement>('.comment-pop');
    const button = this.renderRoot.querySelector('[data-role="comment"]');
    if (composer && button) this.#popovers.open(composer, button, COMPOSER_SIZE);
  }

  protected override render(): TemplateResult | typeof nothing {
    const story = this.story;
    if (!story) return nothing;
    const m = usmMessages(this.#i18n.locale);
    const commenting = this.mode === 'commenting';
    const hasFoot = this.stepName !== '' || this.notes.length > 0;
    return html`
      <div class="card-head">
        ${this.statuses.length === 0 ? nothing : this.#renderStatus(m, story)}
        <div class="card-name"><span>${story.name}</span></div>
      </div>
      ${story.description ? html`<div class="card-text">${story.description}</div>` : nothing}
      ${story.links && story.links.length > 0 ? this.#renderLinks(story.links) : nothing}
      ${
        hasFoot
          ? html`<div class="card-foot">
              ${
                this.stepName === ''
                  ? nothing
                  : html`<span class="card-chip" data-kind="step"><span>${this.stepName}</span></span>`
              }
              ${
                this.notes.length > 0
                  ? html`<span
                      class="card-chip"
                      data-kind="comments"
                      aria-label=${m.commentCountAria(this.notes.length)}
                    >
                      ${iconComment()}<span>${this.notes.length}</span>
                    </span>`
                  : nothing
              }
            </div>`
          : nothing
      }
      <div class="card-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label=${m.commentAria}
          data-active=${String(commenting)}
          @click=${this.#tool({ kind: 'toggle-comment' })}
        >
          ${iconComment()}
          ${this.notes.length > 0 ? html`<span class="dpk-icon-badge">${this.notes.length}</span>` : nothing}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label=${m.deleteAria}
          @click=${this.#tool({ kind: 'delete' })}
        >
          ${iconTrash()}
        </button>
      </div>
      ${commenting ? this.#renderComposer() : nothing}
    `;
  }

  #renderStatus(m: UsmMessages, story: UserStory): TemplateResult {
    const current = statusViewOf(this.statuses, story);
    const name = current?.name ?? m.statusUnset;
    return html`<span class="card-status" role="img" aria-label=${m.storyStatusAria(name)} title=${name}>
      ${statusIcon(current)}
    </span>`;
  }

  /** The first links as chips (the service's mark and a short label); the rest as a count. */
  #renderLinks(links: readonly StoryLink[]): TemplateResult {
    const shown = links.slice(0, MAX_LINK_CHIPS);
    return html`<div class="card-links">
      ${shown.map((link) => {
        const label = describeLink(link.url);
        return html`<a
          class="link-chip"
          data-kind=${label.kind}
          href=${link.url}
          target="_blank"
          rel="noopener noreferrer"
          title=${link.label ?? label.title}
          draggable="false"
          @click=${(event: Event) => event.stopPropagation()}
          >${linkIcon(label.kind)}<span>${link.label ?? label.text}</span></a
        >`;
      })}
      ${links.length > shown.length ? html`<span class="link-chip">+${links.length - shown.length}</span>` : nothing}
    </div>`;
  }

  #renderComposer(): TemplateResult {
    return renderComposer(
      composerMessages(this.#i18n.locale),
      presentComposer(this.#draft, this.notes.map(commentBody), this.story ? { key: `story:${this.story.id}` } : {}),
      (intent) => {
        if (intent.kind === 'input') {
          this.#draft = intent.body;
          this.requestUpdate();
        } else this.#report(intent);
      },
    );
  }

  /** Tool buttons must not also select the card. */
  #tool(intent: CardIntent): (event: Event) => void {
    return (event) => {
      event.stopPropagation();
      this.#report(intent);
    };
  }

  #report(intent: CardIntent): void {
    this.onIntent?.(intent);
  }
}

export const defineUsmStoryCard = (): void => {
  if (!customElements.get('dpk-internal-usm-story-card'))
    customElements.define('dpk-internal-usm-story-card', DpkInternalUsmStoryCard);
};
