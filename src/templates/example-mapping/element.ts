import { html, type TemplateResult } from 'lit';

import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { ExampleMappingState, MappingCardKind } from './model';

import { TemplateElement } from '../../core/element';
import { DragController, type Drop, type DropPlace } from '../../lib/dom/drag';
import { addExample, addQuestion, addRule, addStory } from './commands';
import { defineExampleMappingCard } from './components/mapping-card';
import { exampleMappingDefinition } from './definition';
import { resolveExampleDrop, resolveQuestionDrop, resolveRuleDrop, resolveStoryDrop } from './drop';
import { renderBoard, renderLegend, type MappingDragType } from './render/board';
import { exampleMappingStyles } from './styles';
import { IDLE_MODE, reduceCardIntent, type ExampleMappingUiMode, type MappingCardIntent } from './ui-mode';

const RENAME_ACTION = {
  story: 'SET_STORY_NAME',
  rule: 'SET_RULE_NAME',
  example: 'SET_EXAMPLE_NAME',
  question: 'SET_QUESTION_NAME',
} as const satisfies Record<MappingCardKind, string>;

const DELETE_ACTION = {
  story: 'DELETE_STORY',
  rule: 'DELETE_RULE',
  example: 'DELETE_EXAMPLE',
  question: 'DELETE_QUESTION',
} as const satisfies Record<MappingCardKind, string>;

/**
 * `<dpk-template-example-mapping>` — Example Mapping (Matt Wynne) table.
 *
 * The element is the seam between the pure parts: it owns the one ephemeral
 * `mode` (which card is being commented on, or which fresh card takes the
 * caret), lends its `DragController` to the board template, and turns card
 * intents and drops into actions. Layout lives in `render/`, the sticky note in
 * `components/`, and every drop decision in `drop.ts`.
 */
export class DpkTemplateExampleMapping extends TemplateElement<ExampleMappingState> {
  static override styles = [TemplateElement.styles, exampleMappingStyles];

  readonly definition = exampleMappingDefinition;

  static override properties = {
    mode: { state: true },
  };

  declare private mode: ExampleMappingUiMode;

  readonly #drag = new DragController<MappingDragType>(this);

  constructor() {
    super();
    this.mode = IDLE_MODE;
  }

  protected override renderRegions(context: TemplateRenderContext<ExampleMappingState>): ShellRegions {
    return {
      header: renderLegend(),
      main: this.#renderMain(context),
    };
  }

  #renderMain(context: TemplateRenderContext<ExampleMappingState>): TemplateResult {
    return html`
      ${renderBoard({
        context,
        mode: this.mode,
        drag: this.#drag,
        handlers: {
          cardIntent: (cardId, kind, intent) => this.#onCardIntent(cardId, kind, intent),
          addStory: () => this.#editFresh(addStory(context)),
          addRule: (storyId) => this.#editFresh(addRule(context, storyId)),
          addExample: (ruleId) => this.#editFresh(addExample(context, ruleId)),
          addQuestion: (ruleId) => this.#editFresh(addQuestion(context, ruleId)),
          dropStory: (drop) => this.#onStoryDrop(drop),
          dropRule: (storyId, drop) => this.#onRuleDrop(storyId, drop),
          dropExample: (ruleId, drop) => this.#onExampleDrop(ruleId, drop),
          dropQuestion: (ruleId, drop) => this.#onQuestionDrop(ruleId, drop),
        },
      })}
    `;
  }

  /** A card that was just added: put the caret straight into its name. */
  #editFresh(cardId: string | null): void {
    if (cardId !== null) this.mode = { kind: 'editing', cardId };
  }

  /** A card asked for something: apply the side effect, then the mode transition. */
  #onCardIntent(cardId: string, kind: MappingCardKind, intent: MappingCardIntent): void {
    const context = this.context();
    switch (intent.kind) {
      case 'select':
        context.navigate({ card: cardId });
        break;
      case 'rename':
        context.dispatch({
          type: RENAME_ACTION[kind],
          target: { type: kind, id: cardId },
          payload: { name: intent.name },
        });
        break;
      case 'comment':
        context.dispatch({ type: 'comment', target: `${kind}:${cardId}`, payload: { body: intent.body } });
        break;
      case 'delete':
        context.dispatch({ type: DELETE_ACTION[kind], target: { type: kind, id: cardId }, payload: {} });
        if (context.navigation['card'] === cardId) context.navigate({ card: null });
        break;
      case 'toggle-comment':
      case 'dismiss':
        break;
    }
    this.mode = reduceCardIntent(this.mode, cardId, intent);
  }

  #onStoryDrop(drop: Drop<'story'>): void {
    const context = this.context();
    const input = resolveStoryDrop(context.state, drop.item.id, drop.hoveredId, drop.place);
    if (input) context.dispatch(input);
  }

  /** Rules sit side by side, so before / after is read along the row, not down it. */
  #onRuleDrop(storyId: string, drop: Drop<'rule'>): void {
    const context = this.context();
    const place = this.#horizontalPlace(drop.hoveredId, drop.event.clientX, drop.place);
    const input = resolveRuleDrop(context.state, storyId, drop.item.id, drop.hoveredId, place);
    if (input) context.dispatch(input);
  }

  #horizontalPlace(hoveredId: string | null, clientX: number, fallback: DropPlace): DropPlace {
    if (hoveredId === null) return fallback;
    const column = this.renderRoot.querySelector(`.rule-col[data-rule="${hoveredId}"]`);
    if (!column) return fallback;
    const rect = column.getBoundingClientRect();
    return clientX <= rect.left + rect.width / 2 ? 'before' : 'after';
  }

  #onExampleDrop(ruleId: string, drop: Drop<'example'>): void {
    const context = this.context();
    const input = resolveExampleDrop(context.state, ruleId, drop.item.id, drop.hoveredId, drop.place);
    if (input) context.dispatch(input);
  }

  /** A question lands in the question area of the rule it was dropped on. */
  #onQuestionDrop(ruleId: string, drop: Drop<'question'>): void {
    const context = this.context();
    const input = resolveQuestionDrop(context.state, ruleId, drop.item.id, drop.hoveredId, drop.place);
    if (input) context.dispatch(input);
  }
}

export const defineExampleMappingElement = (): void => {
  defineExampleMappingCard();
  if (!customElements.get('dpk-template-example-mapping'))
    customElements.define('dpk-template-example-mapping', DpkTemplateExampleMapping);
};
