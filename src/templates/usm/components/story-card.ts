import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Lock, Network } from 'lucide';

import type { DraftAction } from '../../../core/types';
import type { Estimate, Member, StoryLabel, StoryLink, UserStory } from '../model';

import { iconComment, lucide } from '../../../core/icons';
import { LocaleController } from '../../../core/locale-controller';
import { controls } from '../../../core/theme';
import { describeLink } from '../../../lib/link-label';
import { renderMarkdown } from '../../../lib/markdown';
import { usmMessages, type UsmMessages } from '../messages';
import { initialOf } from '../render/avatar';
import { linkIcon, linkStyles } from '../render/link-icon';
import { statusIcon, statusStyles, statusToneStyle } from '../render/tone';
import { statusViewOf, type StatusView } from '../status-view';

const iconBlocks = lucide(Network);
const iconWaits = lucide(Lock);

/** Links beyond this many collapse into a `+n` chip; the panel lists them all. */
const MAX_LINK_CHIPS = 3;

const cardStyles = css`
  /*
   * The card wears its status's color the way a modern board does: a flat,
   * barely tinted face and a hairline edge in that hue, with a neutral, soft
   * elevation. Tints are mixed in OKLab so every hue stays clean instead of
   * turning muddy.
   */
  :host {
    --card-tone: var(--usm-tone, var(--dpk-ink-faint));
    position: relative;
    display: grid;
    gap: 8px;
    padding: 12px 13px;
    border: 1px solid color-mix(in oklab, var(--card-tone) 24%, var(--dpk-rule));
    border-radius: 12px;
    background: color-mix(in oklab, var(--card-tone) 6%, var(--dpk-paper-raised));
    box-shadow:
      0 1px 1px var(--dpk-shade-1),
      0 2px 6px -3px var(--dpk-shade-2);
    cursor: pointer;
    transition:
      box-shadow 180ms var(--dpk-ease),
      transform 180ms var(--dpk-ease),
      border-color 180ms var(--dpk-ease);
  }

  :host(:hover) {
    border-color: color-mix(in oklab, var(--card-tone) 45%, var(--dpk-rule));
    box-shadow:
      0 1px 2px var(--dpk-shade-1),
      0 8px 20px -10px var(--dpk-shade-3);
    transform: translateY(-1px);
  }

  :host([focused]) {
    border-color: var(--dpk-blue);
    box-shadow:
      0 0 0 3px color-mix(in oklab, var(--dpk-blue) 20%, transparent),
      0 8px 20px -10px var(--dpk-shade-3);
  }

  /* The card is the button that opens its story; the keyboard ring is the focused look. */
  :host(:focus-visible) {
    outline: none;
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
  }

  :host([dragging]) {
    opacity: 0.45;
    transform: none;
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
  }

  /* The estimate and the assignee sit at the end of the head, small, like a ticket's size and owner. */
  .card-meta {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }
  .estimate-chip {
    padding: 0 6px;
    border: 1px solid color-mix(in oklab, var(--card-tone) 30%, var(--dpk-rule-strong));
    border-radius: 5px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 650;
    line-height: 17px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .assignee-avatar {
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--usm-tone);
    color: var(--dpk-paper-raised);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  .card-status {
    flex: none;
    display: inline-flex;
    margin-top: 1.5px;
  }

  .card-name {
    flex: 1 1 auto;
    min-width: 0;
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  /* The description, rendered from Markdown and cut after three lines. */
  .card-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  .card-text > * {
    margin: 0;
  }

  /* A heading in the description reads as a line of the preview, not a title over the card. */
  .card-text :is(h1, h2, h3, h4, h5, h6) {
    font-size: inherit;
    font-weight: 650;
  }

  .card-text ul,
  .card-text ol {
    padding-left: 1.2em;
  }

  .card-text code {
    padding: 0 3px;
    border-radius: 4px;
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 0.92em;
  }

  .card-text a {
    color: var(--dpk-blue);
  }

  /* Where the story sits and what was said about it. */
  .card-foot {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .card-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 1px 7px;
    border-radius: 6px;
    background: color-mix(in oklab, var(--card-tone) 10%, var(--dpk-paper-sunken));
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
    background: transparent;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }

  .card-chip svg {
    flex: none;
    width: 12px;
    height: 12px;
  }

  /* The labels the story carries, each in its own color. */
  .card-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  .label-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    max-width: 100%;
    padding: 0 7px;
    border: 1px solid color-mix(in oklab, var(--usm-tone) 35%, transparent);
    border-radius: 999px;
    background: color-mix(in oklab, var(--usm-tone) 12%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 17px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .label-chip::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--usm-tone);
  }

  /*
   * Where the story sits among the others. A story that holds others up is
   * work to pull forward (a spike), so its chip is the loud one; one still
   * waiting reads quieter and goes away once its blockers are done.
   */
  .card-deps {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .dep-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 7px;
    border-radius: 6px;
    font-size: 10.5px;
    font-weight: 650;
    line-height: 18px;
    white-space: nowrap;
  }

  .dep-chip svg {
    flex: none;
    width: 12px;
    height: 12px;
  }

  .dep-chip[data-kind='blocks'] {
    background: var(--dpk-amber);
    color: var(--dpk-paper-raised);
  }

  .dep-chip[data-kind='waits'] {
    border: 1px dashed color-mix(in oklab, var(--dpk-ink-faint) 60%, transparent);
    color: var(--dpk-ink-soft);
  }

  /* With a story open, the cards it waits on and the cards waiting on it stand out. */
  :host([data-relation]) {
    outline: 2px dashed var(--relation-tone);
    outline-offset: 2px;
  }

  :host([data-relation='blocker']) {
    --relation-tone: var(--dpk-amber);
  }

  :host([data-relation='dependent']) {
    --relation-tone: var(--dpk-violet);
  }

  .card-links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  .card-links .link-chip {
    border-color: color-mix(in oklab, var(--card-tone) 16%, var(--dpk-rule));
    background: var(--dpk-paper-raised);
  }
`;

/**
 * `<dpk-internal-usm-story-card>` — one user story on the map, read-only.
 *
 * Everything about a story is edited in the story panel a click on the card
 * opens; the host binds that click, the keys that do the same (the card is a
 * button to the keyboard) and the drag & drop on this element, so `focused`
 * and `dragging` are plain reflected inputs. Its link chips stay out of the
 * tab order: the panel lists every link.
 */
export class DpkInternalUsmStoryCard extends LitElement {
  static override styles = [controls, statusStyles, linkStyles, cardStyles];

  static override properties = {
    story: { attribute: false },
    stepName: { attribute: false },
    statuses: { attribute: false },
    labels: { attribute: false },
    notes: { attribute: false },
    estimate: { attribute: false },
    assignee: { attribute: false },
    blocks: { type: Number },
    waits: { type: Number },
    focused: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
  };

  declare story: UserStory | null;
  /** The story's step, shown where the column does not already say it; `''` hides it. */
  declare stepName: string;
  /** The statuses the map defines; with none, the card shows no status. */
  declare statuses: readonly StatusView[];
  /** The labels the story carries, in the order of the labels tab. */
  declare labels: readonly StoryLabel[];
  /** Comments already left on this story. */
  declare notes: readonly DraftAction[];
  /** The story's estimate, `null` while it has none (or estimates are off). */
  declare estimate: Estimate | null;
  /** Who the story is assigned to, `null` while no one is (or assignees are off). */
  declare assignee: Member | null;
  /** How many stories wait on this one. */
  declare blocks: number;
  /** How many unfinished stories this one waits on. */
  declare waits: number;
  declare focused: boolean;
  declare dragging: boolean;

  readonly #i18n = new LocaleController(this);

  constructor() {
    super();
    this.story = null;
    this.stepName = '';
    this.statuses = [];
    this.labels = [];
    this.notes = [];
    this.estimate = null;
    this.assignee = null;
    this.blocks = 0;
    this.waits = 0;
    this.focused = false;
    this.dragging = false;
  }

  protected override render(): TemplateResult | typeof nothing {
    const story = this.story;
    if (!story) return nothing;
    const m = usmMessages(this.#i18n.locale);
    const hasFoot = this.stepName !== '' || this.notes.length > 0;
    return html`
      <div class="card-head">
        ${this.statuses.length === 0 ? nothing : this.#renderStatus(m, story)}
        <div class="card-name"><span>${story.name}</span></div>
        ${this.estimate || this.assignee ? this.#renderMeta(m) : nothing}
      </div>
      ${
        story.description
          ? html`<div class="card-text" @click=${stopLinkClicks}>${unsafeHTML(renderMarkdown(story.description))}</div>`
          : nothing
      }
      ${this.blocks > 0 || this.waits > 0 ? this.#renderDependencies(m) : nothing}
      ${this.labels.length > 0 ? renderLabels(this.labels) : nothing}
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
    `;
  }

  #renderStatus(m: UsmMessages, story: UserStory): TemplateResult | typeof nothing {
    const current = statusViewOf(this.statuses, story);
    if (!current) return nothing;
    const name = current.name;
    return html`<span class="card-status" role="img" aria-label=${m.storyStatusAria(name)} title=${name}>
      ${statusIcon(current)}
    </span>`;
  }

  #renderMeta(m: UsmMessages): TemplateResult {
    const { estimate, assignee } = this;
    return html`<span class="card-meta">
      ${
        estimate
          ? html`<span
              class="estimate-chip"
              title=${m.estimateChipTitle(m.estimateText(estimate.name, estimate.points))}
              >${estimate.name}</span
            >`
          : nothing
      }
      ${
        assignee
          ? html`<span
              class="assignee-avatar"
              style=${statusToneStyle(assignee.tone)}
              title=${m.assigneeChipTitle(assignee.name)}
              >${initialOf(assignee.name)}</span
            >`
          : nothing
      }
    </span>`;
  }

  #renderDependencies(m: UsmMessages): TemplateResult {
    return html`<div class="card-deps">
      ${
        this.blocks > 0
          ? html`<span class="dep-chip" data-kind="blocks" title=${m.blocksChipTitle(this.blocks)}
              >${iconBlocks()}${m.blocksChip(this.blocks)}</span
            >`
          : nothing
      }
      ${
        this.waits > 0
          ? html`<span class="dep-chip" data-kind="waits" title=${m.waitsChipTitle(this.waits)}
              >${iconWaits()}${m.waitsChip(this.waits)}</span
            >`
          : nothing
      }
    </div>`;
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
          tabindex="-1"
          @click=${(event: Event) => event.stopPropagation()}
          >${linkIcon(label.kind)}<span>${link.label ?? label.text}</span></a
        >`;
      })}
      ${links.length > shown.length ? html`<span class="link-chip">+${links.length - shown.length}</span>` : nothing}
    </div>`;
  }
}

const renderLabels = (labels: readonly StoryLabel[]): TemplateResult => html`<div class="card-labels">
  ${labels.map(
    (label) =>
      html`<span class="label-chip" data-label=${label.id} style=${statusToneStyle(label.tone)}>${label.name}</span>`,
  )}
</div>`;

/** A link inside the description opens the link, not the story panel. */
const stopLinkClicks = (event: Event): void => {
  if (event.target instanceof Element && event.target.closest('a')) event.stopPropagation();
};

export const defineUsmStoryCard = (): void => {
  if (!customElements.get('dpk-internal-usm-story-card'))
    customElements.define('dpk-internal-usm-story-card', DpkInternalUsmStoryCard);
};
