import { html, nothing, type TemplateResult } from 'lit';
import { ChevronDown, WandSparkles } from 'lucide';

import type { PrototypeMessages } from '../messages';
import type { ScreenActionGroup } from '../present';

import { lucide } from '../../../core/icons';

/** The screens' actions on stage, whether their menu is open, and what picking one does. */
export type ActionsMenuView = {
  readonly groups: readonly ScreenActionGroup[];
  readonly open: boolean;
  readonly toggle: () => void;
  readonly run: (screenId: string, actionId: string) => void;
};

const iconActions = lucide(WandSparkles);
const iconChevron = lucide(ChevronDown);

/** The button that opens the menu, in the stage bar or among a demo's controls. */
export const renderActionsToggle = (
  m: PrototypeMessages,
  view: ActionsMenuView,
  variant: 'bar' | 'demo' = 'bar',
): TemplateResult => {
  return html`<button
    class=${variant === 'demo' ? 'demo-control actions-toggle' : 'dpk-btn actions-toggle'}
    type="button"
    data-role="actions"
    aria-haspopup="menu"
    aria-expanded=${String(view.open)}
    title=${m.actionsHint}
    @click=${view.toggle}
  >
    ${iconActions()} ${m.actions} ${iconChevron()}
  </button>`;
};

/** Up and down move between the items, as in a menu; Home and End go to either end. */
const moveFocus = (event: KeyboardEvent): void => {
  const menu = event.currentTarget;
  if (!(menu instanceof HTMLElement)) return;
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  // The key comes from the focused item (the menu sits in a shadow root, so it is the event's origin).
  const current = items.findIndex((item) => item === event.composedPath()[0]);
  const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : step === 0
          ? -1
          : (current + step + items.length) % items.length;
  const item = items[next];
  if (item === undefined) return;
  event.preventDefault();
  item.focus();
};

/**
 * The menu itself, a popover the host anchors under its button. Side by side,
 * each screen's actions sit under the screen's title.
 */
export const renderActionsMenu = (m: PrototypeMessages, view: ActionsMenuView): TemplateResult | typeof nothing => {
  if (!view.open || view.groups.length === 0) return nothing;
  const titled = view.groups.length > 1;
  return html`<div
    class="comment-pop actions-menu"
    popover="manual"
    role="menu"
    aria-label=${m.actions}
    @keydown=${moveFocus}
  >
    ${view.groups.map(
      (group) => html`<div class="actions-group" role="group" aria-label=${group.screen.title}>
        ${titled ? html`<span class="actions-group-title" aria-hidden="true">${group.screen.title}</span>` : nothing}
        ${group.actions.map(
          (action) => html`<button
            class="actions-item"
            type="button"
            role="menuitem"
            data-action=${action.id}
            @click=${() => view.run(group.screen.id, action.id)}
          >
            <span class="actions-label">${action.label}</span>
            ${action.description === undefined ? nothing : html`<span class="actions-description">${action.description}</span>`}
          </button>`,
        )}
      </div>`,
    )}
  </div>`;
};
