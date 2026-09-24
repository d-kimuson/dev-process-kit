import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { DragController, Drop } from '../../../lib/dom/drag';
import type { ExampleMappingMessages } from '../messages';

import { CARD_KINDS, cardPaletteStyle } from '../components/mapping-card';
import {
  examplesOfRule,
  questionsOfRule,
  rulesOfStory,
  type ExampleMappingState,
  type MappingCardKind,
  type MappingRule,
  type MappingStory,
} from '../model';
import { presentStorySummary } from '../present';
import { cardModeOf, type ExampleMappingUiMode, type MappingCardIntent } from '../ui-mode';

/** The four kinds of things that move on the board. */
export type MappingDragType = MappingCardKind;

export type BoardHandlers = {
  readonly cardIntent: (cardId: string, kind: MappingCardKind, intent: MappingCardIntent) => void;
  readonly addStory: () => void;
  readonly addRule: (storyId: string) => void;
  readonly addExample: (ruleId: string) => void;
  readonly addQuestion: (ruleId: string) => void;
  readonly dropStory: (drop: Drop<'story'>) => void;
  readonly dropRule: (storyId: string, drop: Drop<'rule'>) => void;
  readonly dropExample: (ruleId: string, drop: Drop<'example'>) => void;
  readonly dropQuestion: (ruleId: string, drop: Drop<'question'>) => void;
};

export type BoardProps = {
  readonly context: TemplateRenderContext<ExampleMappingState>;
  readonly mode: ExampleMappingUiMode;
  readonly drag: DragController<MappingDragType>;
  readonly handlers: BoardHandlers;
  readonly m: ExampleMappingMessages;
};

type Entity = { readonly id: string; readonly name: string; readonly description?: string };

/** A hand-placed tilt, stable per card so a rerender never makes the wall jitter. */
const tiltOf = (kind: MappingCardKind, id: string): number => {
  if (kind === 'story') return 0;
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 5) - 2) * 0.45;
};

/** The color key: what each sticky note color means. */
export const renderLegend = (m: ExampleMappingMessages): TemplateResult => {
  return html`<ul class="legend" aria-label=${m.cardKinds}>
    ${CARD_KINDS.map(
      (kind) => html`<li><span class="legend-swatch" style=${cardPaletteStyle(kind)}></span>${m.kindLabel(kind)}</li>`,
    )}
  </ul>`;
};

/** One story per section: story on top, rules side by side, and under each rule its examples, then its questions. */
export const renderBoard = (props: BoardProps): TemplateResult => {
  const { context, handlers, m } = props;
  if (context.state.stories.length === 0) {
    return html`
      <div class="empty">
        <h2>${m.noStoriesTitle}</h2>
        <p>${m.noStoriesBody}</p>
        <button class="dpk-btn dpk-btn--accent" type="button" @click=${handlers.addStory}>${m.firstStory}</button>
      </div>
    `;
  }
  return html`
    <div class="board" data-testid="example-mapping-board">
      ${repeat(
        context.state.stories,
        (story) => story.id,
        (story) => renderStorySection(props, story),
      )}
      <button class="add-story" type="button" @click=${handlers.addStory}>${m.addStoryButton}</button>
    </div>
  `;
};

const renderCard = (props: BoardProps, kind: MappingCardKind, entity: Entity): TemplateResult => {
  const { context, mode, drag, handlers } = props;
  const notes = context.comments.filter((c) => c.target.type === kind && c.target.id === entity.id);
  const source = drag.source({ type: kind, id: entity.id });
  return html`<dpk-internal-example-mapping-card
    data-card=${entity.id}
    data-card-kind=${kind}
    draggable="true"
    .card=${{
      kind,
      id: entity.id,
      name: entity.name,
      ...(entity.description === undefined ? {} : { description: entity.description }),
    }}
    .notes=${notes}
    .tilt=${tiltOf(kind, entity.id)}
    .mode=${cardModeOf(mode, entity.id)}
    .onIntent=${(intent: MappingCardIntent) => handlers.cardIntent(entity.id, kind, intent)}
    ?focused=${context.navigation['card'] === entity.id}
    ?dragging=${drag.isDragging(kind, entity.id)}
    @dragstart=${source.dragstart}
    @dragend=${source.dragend}
  ></dpk-internal-example-mapping-card>`;
};

const renderStorySection = (props: BoardProps, story: MappingStory): TemplateResult => {
  const { context, drag, handlers, m } = props;
  const summary = presentStorySummary(m, context.state, story.id);
  const sectionKey = `story:${story.id}`;
  const sectionTarget = drag.target({
    key: sectionKey,
    accepts: 'story',
    hovered: closestWith('.story-section', 'story'),
    onDrop: handlers.dropStory,
  });
  const rowKey = `rules:${story.id}`;
  const rowTarget = drag.target({
    key: rowKey,
    accepts: 'rule',
    hovered: closestWith('.rule-col', 'rule'),
    onDrop: (drop) => handlers.dropRule(story.id, drop),
  });
  return html`
    <section
      class="story-section"
      data-story=${story.id}
      data-drop=${String(drag.isOver(sectionKey))}
      @dragenter=${sectionTarget.dragenter}
      @dragover=${sectionTarget.dragover}
      @dragleave=${sectionTarget.dragleave}
      @drop=${sectionTarget.drop}
    >
      <header class="story-row">
        <div class="story-slot">${renderCard(props, 'story', story)}</div>
        <div class="story-meta">
          <span class="readiness" data-readiness=${summary.readiness}>${summary.label}</span>
          <span class="tally"
            ><i class="tally-dot" style=${cardPaletteStyle('rule')}></i>${m.kindLabel('rule')} ${summary.rules}</span
          >
          <span class="tally"
            ><i class="tally-dot" style=${cardPaletteStyle('example')}></i>${m.kindLabel('example')}
            ${summary.examples}</span
          >
          <span class="tally"
            ><i class="tally-dot" style=${cardPaletteStyle('question')}></i>${m.kindLabel('question')}
            ${summary.questions}</span
          >
        </div>
      </header>
      <div
        class="rules-row"
        data-testid=${`rules-${story.id}`}
        data-drop=${String(drag.isOver(rowKey))}
        @dragenter=${rowTarget.dragenter}
        @dragover=${rowTarget.dragover}
        @dragleave=${rowTarget.dragleave}
        @drop=${rowTarget.drop}
      >
        ${repeat(
          rulesOfStory(context.state, story.id),
          (rule) => rule.id,
          (rule) => renderRuleColumn(props, rule),
        )}
        <button class="add-rule" type="button" @click=${() => handlers.addRule(story.id)}>
          <span class="add-plus">+</span>${m.kindLabel('rule')}
        </button>
      </div>
    </section>
  `;
};

/** One rule and two areas under it: the examples that illustrate it, then the questions still open about it. */
const renderRuleColumn = (props: BoardProps, rule: MappingRule): TemplateResult => {
  const { drag } = props;
  return html`
    <div class="rule-col" data-rule=${rule.id} ?data-dragging=${drag.isDragging('rule', rule.id)}>
      ${renderCard(props, 'rule', rule)} ${renderArea(props, rule.id, 'example')}
      ${renderArea(props, rule.id, 'question')}
    </div>
  `;
};

type AreaKind = 'example' | 'question';

const AREA_TESTID = { example: 'examples', question: 'questions' } as const satisfies Record<AreaKind, string>;

const areaOf = (m: ExampleMappingMessages, kind: AreaKind) => ({
  testid: AREA_TESTID[kind],
  label: m.kindLabel(kind),
  empty: kind === 'example' ? m.noExamples : m.noQuestions,
  add: `+ ${m.kindLabel(kind)}`,
});

/** A rule's examples or questions: its own drop target, its own add button. */
const renderArea = (props: BoardProps, ruleId: string, kind: AreaKind): TemplateResult => {
  const { context, drag, handlers, m } = props;
  const area = areaOf(m, kind);
  const key = `${area.testid}:${ruleId}`;
  const target =
    kind === 'example'
      ? drag.target({
          key,
          accepts: 'example',
          hovered: closestCard('example'),
          onDrop: (drop) => handlers.dropExample(ruleId, drop),
        })
      : drag.target({
          key,
          accepts: 'question',
          hovered: closestCard('question'),
          onDrop: (drop) => handlers.dropQuestion(ruleId, drop),
        });
  const cards = kind === 'example' ? examplesOfRule(context.state, ruleId) : questionsOfRule(context.state, ruleId);
  const add = kind === 'example' ? handlers.addExample : handlers.addQuestion;
  return html`<div
    class="card-area card-area--${kind}"
    data-testid=${`${area.testid}-${ruleId}`}
    data-drop=${String(drag.isOver(key))}
    @dragenter=${target.dragenter}
    @dragover=${target.dragover}
    @dragleave=${target.dragleave}
    @drop=${target.drop}
  >
    <h3 class="area-label"><i class="tally-dot" style=${cardPaletteStyle(kind)}></i>${area.label}</h3>
    ${repeat(
      cards,
      (card) => card.id,
      (card) => renderCard(props, kind, card),
    )}
    ${cards.length === 0 ? html`<p class="stack-hint">${area.empty}</p>` : nothing}
    <button class="add-card add-${kind}" type="button" @click=${() => add(ruleId)}>${area.add}</button>
  </div>`;
};

/**
 * The card under the pointer for one drag kind. Events from inside the card's
 * shadow root retarget to the host, so `closest` finds it — but only cards of
 * the dragged kind may become the anchor.
 */
const closestCard =
  (kind: MappingCardKind) =>
  (event: DragEvent): { id: string | null; element: Element } | null => {
    const card = event.target instanceof Element ? event.target.closest('dpk-internal-example-mapping-card') : null;
    if (!card || card.getAttribute('data-card-kind') !== kind) return null;
    return { id: card.getAttribute('data-card'), element: card };
  };

/** A layout box under the pointer (a story section, a rule column), identified by a data attribute. */
const closestWith =
  (selector: string, attribute: string) =>
  (event: DragEvent): { id: string | null; element: Element } | null => {
    const box = event.target instanceof Element ? event.target.closest(selector) : null;
    return box ? { id: box.getAttribute(`data-${attribute}`), element: box } : null;
  };
