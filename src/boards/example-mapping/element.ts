import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';

import type { DpkInlineEdit } from '../../components/inline-edit';
import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';

import { createEntityId } from '../../core/target';
import { DragController, type Drop, type DropPlace } from '../../lib/dom/drag';
import { BoardChromeBase } from '../base/element';
import { chromeStyles } from '../base/styles';
import { resolveExampleDrop, resolveQuestionDrop, resolveRuleDrop, resolveStoryDrop } from './drop';
import { exampleMappingMessages } from './messages';
import {
  allMappingIds,
  emptyExampleMappingBase,
  findCard,
  parseExampleMappingBase,
  type ExampleMappingState,
  type MappingCardKind,
} from './model';
import { reduceExampleMappingActions } from './reduce';
import { renderBoard, type MappingDragType } from './render/board';
import { exampleMappingStyles } from './styles';
import { IDLE_MODE, reduceCardIntent, type ExampleMappingUiMode, type MappingCardIntent } from './ui-mode';

export type MappingSelection = { readonly kind: MappingCardKind; readonly id: string };

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

/** Where `ADD_STORY` is anchored: there is no story to hang it off of yet. */
const MAP_ANCHOR = 'example-mapping';

/**
 * `<dpk-board-example-mapping>` — Example Mapping (Matt Wynne) table.
 *
 * The element is the seam between the pure parts: it owns the one ephemeral
 * `#mode` (which card takes the caret, freshly added), lends its
 * `DragController` to the board renderer, and turns card intents and drops
 * into element actions. Layout lives in `render/`, the sticky note in
 * `components/`, and every drop decision in `drop.ts` — all unchanged since
 * the template days (ADR 20261023_diagram-as-board). Comments open the chrome's
 * own contextual composer over a card: from the card's hover comment button,
 * or from the right-click menu.
 */
export class DpkBoardExampleMapping extends BoardChromeBase<ExampleMappingState, MappingSelection> {
  protected override boardAddable(): boolean {
    return true;
  }
  static override styles: CSSResultGroup = [chromeStyles, exampleMappingStyles];

  readonly #drag = new DragController<MappingDragType>(this);

  #seededFrom: ExampleMappingState | null = null;
  #mode: ExampleMappingUiMode = IDLE_MODE;

  protected override parseData(input: unknown): ExampleMappingState {
    return parseExampleMappingBase(input);
  }

  protected override emptyData(): ExampleMappingState {
    return emptyExampleMappingBase();
  }

  protected override reduceElementActions(
    data: ExampleMappingState,
    actions: readonly DraftAction[],
  ): { readonly data: ExampleMappingState; readonly results: readonly ElementActionResult[] } {
    return reduceExampleMappingActions(exampleMappingMessages(this.locale), data, actions);
  }

  protected override defaultHeading(): string {
    return exampleMappingMessages(this.locale).heading;
  }

  protected override shellClass(): string {
    return 'example-mapping';
  }

  protected override emptyMessage(): string {
    return exampleMappingMessages(this.locale).noStoriesTitle;
  }

  protected override commentItems(): readonly CommentTargetOption[] {
    const items = this.items();
    return [
      ...items.stories.map((story) => ({ value: this.commentRef('story', story.id), label: story.name })),
      ...items.rules.map((rule) => ({ value: this.commentRef('rule', rule.id), label: rule.name })),
      ...items.examples.map((example) => ({ value: this.commentRef('example', example.id), label: example.name })),
      ...items.questions.map((question) => ({
        value: this.commentRef('question', question.id),
        label: question.name,
      })),
    ];
  }

  protected override hasSelection(selection: MappingSelection): boolean {
    return findCard(this.items(), selection.id)?.kind === selection.kind;
  }

  protected override isEmpty(): boolean {
    return this.items().stories.length === 0;
  }

  /** New authored data drops the fresh-card caret that belonged to the old board. */
  protected override refreshContent(): void {
    const authored = this.authoredItems();
    if (authored !== this.#seededFrom) {
      this.#seededFrom = authored;
      this.#mode = IDLE_MODE;
    }
  }

  protected override render(): TemplateResult {
    this.prepareRender();
    const m = exampleMappingMessages(this.locale);
    const chrome = this.chromeMessages;
    const subject = this.subject ?? this.defaultSubject();
    return html`
      <dpk-dialog-panel
        class=${this.shellClass()}
        ?maximizable=${this.frameControls}
        ?resizable=${this.frameControls}
        heading=${this.heading ?? this.defaultHeading()}
        subject=${subject === '' ? nothing : subject}
        @dpk-maximize-change=${() => this.closeComposer()}
      >
        ${this.renderToolbarActionsSlot()} ${this.renderTagFilterRow()}
        ${
          this.dataError !== null
            ? html`<p class="em-notice" role="alert">${chrome.dataError}<br />${this.dataError}</p>`
            : renderBoard({
                state: this.items(),
                mode: this.#mode,
                drag: this.#drag,
                m,
                handlers: {
                  cardIntent: (cardId, kind, intent) => this.#onCardIntent(cardId, kind, intent),
                  addStory: () => this.#addStory(),
                  addRule: (storyId) => this.#addRule(storyId),
                  addExample: (ruleId) => this.#addExample(ruleId),
                  addQuestion: (ruleId) => this.#addQuestion(ruleId),
                  dropStory: (drop) => this.#onStoryDrop(drop),
                  dropRule: (storyId, drop) => this.#onRuleDrop(storyId, drop),
                  dropExample: (ruleId, drop) => this.#onExampleDrop(ruleId, drop),
                  dropQuestion: (ruleId, drop) => this.#onQuestionDrop(ruleId, drop),
                  isSelected: (kind, id) => this.#isSelected(kind, id),
                },
                commentRef: (kind, id) => this.commentRef(kind, id),
                onComment: (kind, cardId) => this.openComment(this.commentRef(kind, cardId)),
              })
        }
      </dpk-dialog-panel>
      ${this.renderSelection()}
    `;
  }

  // ---------------------------------------------------------------- internals

  #isSelected(kind: MappingCardKind, id: string): boolean {
    const selection = this.selection;
    return selection !== null && selection.kind === kind && selection.id === id;
  }

  /** A card that was just added: put the caret straight into its name. */
  #editFresh(cardId: string | null): void {
    if (cardId !== null) {
      this.#mode = { kind: 'editing', cardId };
      this.select({ kind: findCard(this.items(), cardId)?.kind ?? 'story', id: cardId });
      this.requestUpdate();
      void this.updateComplete.then(() => {
        this.renderRoot
          .querySelector<DpkInlineEdit>(`[data-card="${CSS.escape(cardId)}"] dpk-inline-edit`)
          ?.startEditing();
      });
    }
  }

  #addStory(): void {
    const taken = allMappingIds(this.items());
    const name = exampleMappingMessages(this.locale).newStory;
    const id = createEntityId(`story ${name}`, taken);
    this.#editFresh(this.dispatchElementAction('ADD_STORY', ['page', MAP_ANCHOR], { id, name }) ? id : null);
  }

  #addRule(storyId: string): void {
    const taken = allMappingIds(this.items());
    const name = exampleMappingMessages(this.locale).newRule;
    const id = createEntityId(`rule ${name}`, taken);
    this.#editFresh(this.dispatchElementAction('ADD_RULE', ['story', storyId], { id, name }) ? id : null);
  }

  #addExample(ruleId: string): void {
    const taken = allMappingIds(this.items());
    const name = exampleMappingMessages(this.locale).newExample;
    const id = createEntityId(`example ${name}`, taken);
    this.#editFresh(this.dispatchElementAction('ADD_EXAMPLE', ['rule', ruleId], { id, name }) ? id : null);
  }

  #addQuestion(ruleId: string): void {
    const taken = allMappingIds(this.items());
    const name = exampleMappingMessages(this.locale).newQuestion;
    const id = createEntityId(`question ${name}`, taken);
    this.#editFresh(this.dispatchElementAction('ADD_QUESTION', ['rule', ruleId], { id, name }) ? id : null);
  }

  /** A card asked for something: translate it into the element action, then the mode transition. */
  #onCardIntent(cardId: string, kind: MappingCardKind, intent: MappingCardIntent): void {
    switch (intent.kind) {
      case 'select':
        this.select({ kind, id: cardId });
        break;
      case 'rename':
        this.dispatchElementAction(RENAME_ACTION[kind], [kind, cardId], { name: intent.name });
        break;
      case 'delete':
        this.dispatchElementAction(DELETE_ACTION[kind], [kind, cardId], {});
        if (this.selection?.id === cardId) this.select(null);
        break;
    }
    this.#mode = reduceCardIntent(this.#mode, cardId, intent);
    this.requestUpdate();
  }

  #onStoryDrop(drop: Drop<'story'>): void {
    const input = resolveStoryDrop(this.items(), drop.item.id, drop.hoveredId, drop.place);
    if (input) this.dispatchElementAction(input.type, [input.target.type, input.target.id], input.payload);
  }

  /** Rules sit side by side, so before / after is read along the row, not down it. */
  #onRuleDrop(storyId: string, drop: Drop<'rule'>): void {
    const place = this.#horizontalPlace(drop.hoveredId, drop.event.clientX, drop.place);
    const input = resolveRuleDrop(this.items(), storyId, drop.item.id, drop.hoveredId, place);
    if (input) this.dispatchElementAction(input.type, [input.target.type, input.target.id], input.payload);
  }

  #horizontalPlace(hoveredId: string | null, clientX: number, fallback: DropPlace): DropPlace {
    if (hoveredId === null) return fallback;
    const column = this.renderRoot.querySelector(`.rule-col[data-rule="${CSS.escape(hoveredId)}"]`);
    if (!column) return fallback;
    const rect = column.getBoundingClientRect();
    return clientX <= rect.left + rect.width / 2 ? 'before' : 'after';
  }

  #onExampleDrop(ruleId: string, drop: Drop<'example'>): void {
    const input = resolveExampleDrop(this.items(), ruleId, drop.item.id, drop.hoveredId, drop.place);
    if (input) this.dispatchElementAction(input.type, [input.target.type, input.target.id], input.payload);
  }

  /** A question lands in the question area of the rule it was dropped on. */
  #onQuestionDrop(ruleId: string, drop: Drop<'question'>): void {
    const input = resolveQuestionDrop(this.items(), ruleId, drop.item.id, drop.hoveredId, drop.place);
    if (input) this.dispatchElementAction(input.type, [input.target.type, input.target.id], input.payload);
  }
}

export const defineExampleMapping = (): void => {
  if (!customElements.get('dpk-board-example-mapping'))
    customElements.define('dpk-board-example-mapping', DpkBoardExampleMapping);
};
