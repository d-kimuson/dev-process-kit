import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

import type { ExampleMappingMessages } from '../messages';
import type { MappingCardKind } from '../model';
import type { MappingCardIntent, MappingCardMode } from '../ui-mode';

import { iconComment, iconTrash } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { classNames } from '../../base/model';

/** Board order of the four card kinds. */
export const CARD_KINDS = ['story', 'rule', 'example', 'question'] as const satisfies readonly MappingCardKind[];

/** Card color per kind — the single source for the cards. */
const CARD_PALETTE = {
  story: { bg: 'linear-gradient(178deg, #fff3a6, #fde77a)', ink: '#4a3a06' },
  rule: { bg: 'linear-gradient(178deg, #a3d1f5, #7cb8ea)', ink: '#0e2c4b' },
  example: { bg: 'linear-gradient(178deg, #c9eb95, #a8dc63)', ink: '#22380a' },
  question: { bg: 'linear-gradient(178deg, #fbc6d9, #f4a0c0)', ink: '#4b1029' },
} as const satisfies Record<MappingCardKind, { readonly bg: string; readonly ink: string }>;

/** The palette travels as custom properties, so the legend can reuse it. */
export const cardPaletteStyle = (kind: MappingCardKind): string => {
  const { bg, ink } = CARD_PALETTE[kind];
  return `--em-card-bg:${bg};--em-card-ink:${ink}`;
};

export type MappingCardProps = {
  readonly kind: MappingCardKind;
  readonly card: { readonly id: string; readonly name: string; readonly description?: string };
  /** Hand-placed tilt, in degrees. */
  readonly tilt: number;
  readonly mode: MappingCardMode;
  readonly focused: boolean;
  readonly dragging: boolean;
  readonly m: ExampleMappingMessages;
  /** This card's `commentRef`: what the right-click menu's "Review comment" item and the comment popover anchor to. */
  readonly dpkTarget: string;
  /** Space-separated grill question ids this card answers, already normalized by `grillMark`. */
  readonly grillQuestions?: string;
  readonly onIntent: (intent: MappingCardIntent) => void;
  /** The card's hover comment button: open the chrome's composer over this card. */
  readonly onComment: (kind: MappingCardKind, cardId: string) => void;
  readonly onDragStart: (event: DragEvent) => void;
  readonly onDragEnd: (event: DragEvent) => void;
};

/** Text in a draggable element cannot be selected: typing turns dragging off. */
const toggleDraggable = (event: FocusEvent): void => {
  const target = event.currentTarget;
  if (target instanceof HTMLElement) target.draggable = event.type === 'focusout';
};

/**
 * One story, rule, example or question, drawn as a sticky note whose name is
 * edited where it sits.
 *
 * The board positions and tilts the card; it only paints itself and reports
 * `MappingCardIntent`s through `onIntent`. Which card is being edited is the
 * host's decision (`ExampleMappingUiMode`, driving `mode`): the card renders
 * the mode it is given and never dispatches actions itself, and the host is
 * the one that calls a freshly added card's `<dpk-inline-edit>` into editing
 * (there is no other way into `mode: 'editing'` — see `ui-mode.ts`). Comments
 * come from the card's own hover comment button (`onComment`) and from the
 * right-click menu, which resolves this card via its `dpkTarget` marker.
 */
export const renderMappingCard = (props: MappingCardProps): TemplateResult => {
  const {
    kind,
    card,
    tilt,
    mode,
    focused,
    dragging,
    m,
    dpkTarget,
    grillQuestions,
    onIntent,
    onComment,
    onDragStart,
    onDragEnd,
  } = props;
  const label = m.kindLabel(kind);
  return html`
    <div
      class=${classNames('em-card', focused && 'is-focused', dragging && 'is-dragging')}
      data-card=${card.id}
      data-card-kind=${kind}
      data-mode=${mode}
      data-dpk-target=${dpkTarget}
      data-grill-questions=${ifDefined(grillQuestions)}
      style=${`${cardPaletteStyle(kind)};--em-tilt:${tilt}deg`}
      draggable="true"
      @click=${() => onIntent({ kind: 'select' })}
      @focusin=${toggleDraggable}
      @focusout=${toggleDraggable}
      @dragstart=${onDragStart}
      @dragend=${onDragEnd}
    >
      <div class="card-kind">${label}</div>
      <dpk-inline-edit
        class="card-name"
        ?wrap=${true}
        ?seamless=${true}
        .value=${card.name}
        .label=${m.nameField(label)}
        @dpk-commit=${onCommit((name) => onIntent({ kind: 'rename', name }))}
      ></dpk-inline-edit>
      ${card.description ? html`<div class="card-text">${card.description}</div>` : nothing}
      <div class="card-tools">
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="comment"
          aria-label=${m.commentCard}
          @click=${(event: Event) => {
            // Asking for a comment must not also select the card or open its name editor.
            event.stopPropagation();
            onComment(kind, card.id);
          }}
        >
          ${iconComment()}
        </button>
        <button
          class="dpk-icon-btn"
          type="button"
          data-role="delete"
          aria-label=${m.deleteButton}
          @click=${(event: Event) => {
            event.stopPropagation();
            onIntent({ kind: 'delete' });
          }}
        >
          ${iconTrash()}
        </button>
      </div>
    </div>
  `;
};
