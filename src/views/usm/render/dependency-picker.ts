import { css, html, nothing, type TemplateResult } from 'lit';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';
import type { DependencySearch } from '../ui-mode';

import { dependencyChoices, type DependencyChoice, type DependencySide } from '../dependency-choices';
import { statusViews } from '../status-view';
import { statusIcon, statusToneStyle } from './tone';

/** The search the story panel's pickers share (one list is open at most), and how to change it. */
export type DependencyPicker = {
  readonly search: DependencySearch | null;
  readonly set: (search: DependencySearch | null) => void;
};

/**
 * A combobox that adds one side of the story's dependencies: typing narrows
 * the stories it may take (by name, activity or step), the arrow keys move
 * through them and Enter or a click adds one. The list is open while the
 * field has the focus; Escape closes it before it closes the panel. Nothing
 * shows when no story is left to take.
 */
export const renderDependencyPicker = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  storyId: string,
  side: DependencySide,
  picker: DependencyPicker,
  pick: (id: string) => void,
): TemplateResult | typeof nothing => {
  const { state } = context;
  if (dependencyChoices(state, storyId, side, '').length === 0) return nothing;
  const search = picker.search?.side === side ? picker.search : null;
  const choices = search ? dependencyChoices(state, storyId, side, search.query) : [];
  const active = Math.max(0, Math.min(search?.active ?? 0, choices.length - 1));
  const highlighted = search ? choices[active] : undefined;
  const label = side === 'blocker' ? m.addBlockerPlaceholder : m.addDependentPlaceholder;
  const listId = `dep-${side}-choices`;
  const optionId = (choice: DependencyChoice): string => `dep-${side}-${choice.story.id}`;
  const open = (event: Event): void => {
    if (search || !(event.currentTarget instanceof HTMLInputElement)) return;
    picker.set({ side, query: event.currentTarget.value, active: 0 });
  };
  const choose = (choice: DependencyChoice): void => {
    pick(choice.story.id);
    picker.set(null);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    switch (keyOf(event)) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!search) {
          open(event);
          return;
        }
        if (choices.length === 0) return;
        const step = keyOf(event) === 'ArrowDown' ? 1 : -1;
        picker.set({ ...search, active: (active + step + choices.length) % choices.length });
        return;
      }
      case 'Enter':
        if (!highlighted) return;
        event.preventDefault();
        choose(highlighted);
        return;
      case 'Escape':
        // Left alone while closed, so it closes the panel instead.
        if (!search) return;
        event.preventDefault();
        picker.set(null);
        return;
    }
  };
  return html`<div class="sp-dep-picker">
    <input
      class="dpk-input sp-dep-search"
      type="text"
      role="combobox"
      data-role=${`add-${side}`}
      aria-label=${label}
      placeholder=${label}
      autocomplete="off"
      spellcheck="false"
      aria-autocomplete="list"
      aria-expanded=${String(choices.length > 0)}
      aria-controls=${listId}
      aria-activedescendant=${highlighted ? optionId(highlighted) : nothing}
      .value=${search?.query ?? ''}
      @focus=${open}
      @click=${open}
      @input=${(event: Event) => {
        if (event.currentTarget instanceof HTMLInputElement)
          picker.set({ side, query: event.currentTarget.value, active: 0 });
      }}
      @keydown=${onKeydown}
      @blur=${() => {
        if (search) picker.set(null);
      }}
    />
    ${
      !search
        ? nothing
        : choices.length === 0
          ? html`<p class="sp-dep-none" role="status">${m.noDependencyMatch}</p>`
          : html`<ul id=${listId} class="sp-dep-choices" role="listbox" aria-label=${label}>
              ${choices.map((choice) => renderChoice(state, choice, optionId(choice), choice === highlighted, choose))}
            </ul>`
    }
  </div>`;
};

/** The key pressed, with Ctrl+N and Ctrl+P read as the arrow keys they stand for in a list of completions. */
const keyOf = (event: KeyboardEvent): string => {
  if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return event.key;
  if (event.key === 'n') return 'ArrowDown';
  if (event.key === 'p') return 'ArrowUp';
  return event.key;
};

const renderChoice = (
  state: UsmState,
  choice: DependencyChoice,
  id: string,
  selected: boolean,
  choose: (choice: DependencyChoice) => void,
): TemplateResult => {
  const status = statusViews(state).find((view) => view.id === choice.story.statusId);
  return html`<li
    id=${id}
    role="option"
    data-story=${choice.story.id}
    aria-selected=${String(selected)}
    @pointerdown=${(event: PointerEvent) => event.preventDefault()}
    @click=${() => choose(choice)}
  >
    <span class="sp-dep-choice-name" style=${statusToneStyle(status?.tone)}>
      ${status ? statusIcon(status) : nothing}<span>${choice.story.name}</span>
    </span>
    ${
      choice.place.length === 0
        ? nothing
        : html`<span class="sp-dep-choice-place">${choice.place.map((name) => html`<span>${name}</span>`)}</span>`
    }
  </li>`;
};

export const dependencyPickerStyles = css`
  .sp-dep-picker {
    display: grid;
    gap: 4px;
  }
  /* The choices push the panel's content down rather than float: the panel
     scrolls, and a list hanging out of it would be cut. */
  .sp-dep-choices {
    display: grid;
    gap: 1px;
    max-height: 240px;
    margin: 0;
    padding: 4px;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    list-style: none;
  }
  .sp-dep-choices [role='option'] {
    display: grid;
    gap: 1px;
    padding: 5px 8px;
    border-radius: var(--dpk-radius-sm);
    cursor: pointer;
  }
  .sp-dep-choices [role='option']:hover,
  .sp-dep-choices [role='option'][aria-selected='true'] {
    background: var(--dpk-paper-sunken);
  }
  .sp-dep-choice-name {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--dpk-ink);
    font-size: 12.5px;
    font-weight: 600;
  }
  .sp-dep-choice-name > span,
  .sp-dep-choice-place {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sp-dep-choice-place {
    padding-left: 22px;
    color: var(--dpk-ink-faint);
    font-size: 11px;
  }
  .sp-dep-choice-place span + span::before {
    content: ' / ';
  }
  .sp-dep-none {
    margin: 0;
    padding: 6px 2px;
    color: var(--dpk-ink-faint);
    font-size: 12px;
  }
`;
