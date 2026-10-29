import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Lock, Network } from 'lucide';

import type { ContextMenuGroup, ContextMenuRequest } from '../../../core/context-menu/types';

import { cardAtom } from '../../../components/atoms/card';
import { iconComment, iconNote, lucide } from '../../../core/icons';
import { LocaleController } from '../../../core/locale-controller';
import { controls } from '../../../core/theme';
import { copyText } from '../../../lib/dom/clipboard';
import { describeLink } from '../../../lib/link-label';
import { renderMarkdown } from '../../../lib/markdown';
import { usmMessages, type UsmMessages } from '../messages';
import {
  emptyUsmBase,
  type Estimate,
  type Member,
  type StoryLabel,
  type StoryLink,
  type UserStory,
  type UsmState,
} from '../model';
import { initialOf } from '../render/avatar';
import { linkIcon, linkStyles } from '../render/link-icon';
import { statusIcon, statusStyles, statusToneStyle } from '../render/tone';
import { statusViewOf, type StatusView } from '../status-view';
import { storyIdTitle, storyInfoMarkdown } from '../story-copy';
import { storyKey } from '../story-key';

const iconBlocks = lucide(Network);
const iconWaits = lucide(Lock);

/** Links beyond this many collapse into a `+n` chip; the panel lists them all. */
const MAX_LINK_CHIPS = 3;

const cardStyles = css`
  /*
   * The card is the kit's card atom (it was back-ported from this one); what
   * stays here is the map's own: the status icon, the dependency chips and the
   * host's states mapped onto the card.
   */
  :host {
    --dpk-card-tone: var(--usm-tone, var(--dpk-ink-faint));
    display: block;
  }

  :host(:focus-visible) {
    outline: none;
  }

  /* The card is the button that opens its story; the keyboard ring is the focused look. */
  :host(:focus-visible) .dpk-card {
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
  }

  :host(:focus-visible) .dpk-card[data-state~='dimmed'] {
    opacity: 0.85;
    filter: none;
  }

  /* With a story open, the cards it waits on and the cards waiting on it stand out. */
  :host([data-relation='blocker']) {
    --dpk-card-mark: var(--dpk-amber);
  }

  :host([data-relation='dependent']) {
    --dpk-card-mark: var(--dpk-violet);
  }

  .card-status {
    flex: none;
    display: inline-flex;
    margin-top: 1.5px;
  }

  /*
   * Where the story sits among the others. A story that holds others up is
   * work to pull forward (a spike), so its chip is the loud one; one still
   * waiting reads quieter and goes away once its blockers are done.
   */
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

  .dpk-pill,
  .dpk-avatar {
    --tone: var(--usm-tone);
  }

  .card-links .link-chip {
    border-color: color-mix(in oklab, var(--dpk-card-tone) 16%, var(--dpk-rule));
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
  static override styles = [controls, cardAtom, statusStyles, linkStyles, cardStyles];

  static override properties = {
    story: { attribute: false },
    map: { attribute: false },
    stepName: { attribute: false },
    statuses: { attribute: false },
    labels: { attribute: false },
    reviewCount: { type: Number },
    estimate: { attribute: false },
    assignee: { attribute: false },
    blocks: { type: Number },
    waits: { type: Number },
    focused: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
    highlight: { attribute: 'data-highlight' },
    relation: { attribute: 'data-relation' },
  };

  declare story: UserStory | null;
  /**
   * The map the card sits in, for the Markdown its right-click menu copies
   * (the step's path, the other stories' keys). The host that renders the map
   * hands it to every card; a card shown on its own copies what it has.
   */
  declare map: UsmState;
  /** The story's step, shown where the column does not already say it; `''` hides it. */
  declare stepName: string;
  /** The statuses the map defines; with none, the card shows no status. */
  declare statuses: readonly StatusView[];
  /** The labels the story carries, in the order of the labels. */
  declare labels: readonly StoryLabel[];
  /** How many review comments in the draft ask the agent for a change to this story. */
  declare reviewCount: number;
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
  /** The map's highlight (the critical path): `on`, `dimmed` or none. */
  declare highlight: string | null;
  /** How the story relates to the open one: `blocker`, `dependent` or none. */
  declare relation: string | null;

  readonly #i18n = new LocaleController(this);

  constructor() {
    super();
    this.story = null;
    this.map = emptyUsmBase();
    this.stepName = '';
    this.statuses = [];
    this.labels = [];
    this.reviewCount = 0;
    this.estimate = null;
    this.assignee = null;
    this.blocks = 0;
    this.waits = 0;
    this.focused = false;
    this.dragging = false;
    this.highlight = null;
    this.relation = null;
  }

  /**
   * The card's own context-menu contribution: the story's key (`STORY-6`), its
   * key and title, or the whole card as Markdown — how people pass a story on
   * to someone else, rather than the page's URL.
   */
  getContextMenuItems(_request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    const story = this.story;
    if (!story) return null;
    const m = usmMessages(this.#i18n.locale);
    const key = storyKey(story);
    return [
      {
        id: 'usm-story-card',
        entries: [
          { kind: 'item', id: 'copy-story-id', label: m.copyId, run: () => void copyText(key) },
          {
            kind: 'item',
            id: 'copy-story-id-title',
            label: m.copyIdTitle,
            run: () => void copyText(storyIdTitle(story)),
          },
          {
            kind: 'item',
            id: 'copy-story-info',
            label: m.copyStoryInfo,
            run: () => void copyText(storyInfoMarkdown(m, this.map, story)),
          },
        ],
      },
    ];
  }

  protected override render(): TemplateResult | typeof nothing {
    const story = this.story;
    if (!story) return nothing;
    const m = usmMessages(this.#i18n.locale);
    const comments = story.comments?.length ?? 0;
    return html`<div class="dpk-card" data-interactive data-state=${this.#cardState()}>
      <div class="dpk-card-head">
        ${this.statuses.length === 0 ? nothing : this.#renderStatus(m, story)}
        <div class="dpk-card-title"><span>${story.name}</span></div>
        ${this.estimate || this.assignee ? this.#renderMeta(m) : nothing}
      </div>
      ${
        story.description
          ? html`<div class="dpk-card-text" @click=${stopLinkClicks}>
              ${unsafeHTML(renderMarkdown(story.description))}
            </div>`
          : nothing
      }
      ${this.blocks > 0 || this.waits > 0 ? this.#renderDependencies(m) : nothing}
      ${this.labels.length > 0 ? renderLabels(this.labels) : nothing}
      ${story.links && story.links.length > 0 ? this.#renderLinks(story.links) : nothing}
      <div class="dpk-card-foot">
        <span class="dpk-card-key">${storyKey(story)}</span>
        ${
          this.stepName === ''
            ? nothing
            : html`<span class="dpk-card-chip" data-kind="step"><span>${this.stepName}</span></span>`
        }
        ${
          comments > 0
            ? html`<span
                class="dpk-card-chip"
                data-variant="count"
                data-kind="comments"
                aria-label=${m.commentCountAria(comments)}
              >
                ${iconNote()}<span>${comments}</span>
              </span>`
            : nothing
        }
        ${
          this.reviewCount > 0
            ? html`<span
                class="dpk-card-chip"
                data-variant="count"
                data-tone="accent"
                data-kind="review"
                aria-label=${m.reviewCountAria(this.reviewCount)}
              >
                ${iconComment()}<span>${this.reviewCount}</span>
              </span>`
            : nothing
        }
      </div>
    </div>`;
  }

  /** The host's states as the card atom's `data-state` words. */
  #cardState(): string | typeof nothing {
    const words = [
      this.focused ? 'selected' : '',
      this.highlight === 'on' ? 'highlight' : this.highlight === 'dimmed' ? 'dimmed' : '',
      this.dragging ? 'dragging' : '',
      this.relation ? 'marked' : '',
    ].filter((word) => word !== '');
    return words.length === 0 ? nothing : words.join(' ');
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
    return html`<span class="dpk-card-meta">
      ${
        estimate
          ? html`<span
              class="dpk-card-chip"
              data-variant="outline"
              data-kind="estimate"
              title=${m.estimateChipTitle(m.estimateText(estimate.name, estimate.points))}
              >${estimate.name}</span
            >`
          : nothing
      }
      ${
        assignee
          ? html`<span
              class="dpk-avatar"
              data-kind="assignee"
              style=${statusToneStyle(assignee.tone)}
              title=${m.assigneeChipTitle(assignee.name)}
              >${initialOf(assignee.name)}</span
            >`
          : nothing
      }
    </span>`;
  }

  #renderDependencies(m: UsmMessages): TemplateResult {
    return html`<div class="dpk-card-row card-deps">
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
    return html`<div class="dpk-card-row card-links">
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

const renderLabels = (labels: readonly StoryLabel[]): TemplateResult => html`<div class="dpk-card-row card-labels">
  ${labels.map(
    (label) =>
      html`<span class="dpk-pill" data-label=${label.id} style=${statusToneStyle(label.tone)}>${label.name}</span>`,
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
