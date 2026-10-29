/**
 * The page switcher of `page-nav`: one icon button in the header row that, on
 * hover, click or keyboard focus, opens a kit-styled popover listing the app's
 * pages (the one shown now checked); choosing one switches. Its last row is
 * "+", so the add menu header-nav used to show as a separate button next to
 * the switcher now lives inside the same list, by way of the same addable
 * contents (`PageContent`). `AppElement` owns when it is open, the close delay
 * (so moving the pointer from the trigger into the popover does not close it)
 * and which view (pages or contents) is showing; this module is the pure half —
 * how the trigger and list render for a given state, and what each row does
 * when it is picked.
 */
import { html, nothing, type TemplateResult } from 'lit';

import { onCommit } from '../../lib/dom/events';
import { iconCheck, iconClose } from '../icons';

/** The popover `aria-controls` points at. */
export const SWITCHER_ID = 'dpk-page-switcher-menu';

/** One row of the open switcher: a board to jump to, or (last) a template to add. */
export type SwitcherRow = {
  readonly key: string;
  readonly label: string;
  readonly icon: () => TemplateResult;
  /** Whether this is the board shown now; always `false` for an action row. */
  readonly current: boolean;
  /**
   * `'action'` for a row that does something once — the trailing "+", and
   * every row of the template view it opens — rendered `menuitem`. A board
   * row is the default, `menuitemradio`, since the list as a whole picks one.
   */
  readonly kind?: 'action';
  readonly activate: () => void;
  /** A board row only: lets the popover remove that board, mirroring the page's old remove button. */
  readonly remove?: { readonly label: string; readonly activate: () => void };
  /**
   * The page shown now: its name is renamed where it is listed, in place, so
   * the row is that name instead of a button that would only re-open the page
   * it is already on.
   */
  readonly rename?: { readonly label: string; readonly commit: (name: string) => void };
};

export type SwitcherMessages = {
  readonly switcher: string;
  readonly switcherCount: (count: number) => string;
};

export type SwitcherTriggerIntents = {
  /** Opens the menu, cancelling any close the pointer leaving it had scheduled. */
  readonly open: () => void;
  /** Schedules a close a moment out, so crossing the gap to the menu does not cancel it. */
  readonly scheduleClose: () => void;
};

export type SwitcherMenuIntents = {
  readonly cancelClose: () => void;
  readonly scheduleClose: () => void;
};

export const renderSwitcherTrigger = (
  icon: () => TemplateResult,
  open: boolean,
  boardCount: number,
  m: SwitcherMessages,
  on: SwitcherTriggerIntents,
  /** The page shown now: the trigger's own label names it, so no second label stands beside the icon. */
  active: { readonly active: string | null } = { active: null },
): TemplateResult => {
  const label =
    active.active === null ? m.switcherCount(boardCount) : `${active.active} · ${m.switcherCount(boardCount)}`;
  return html`<button
    class="dpk-chrome-action dpk-page-switcher-trigger"
    type="button"
    aria-haspopup="menu"
    aria-controls=${SWITCHER_ID}
    aria-expanded=${open ? 'true' : 'false'}
    aria-label=${label}
    data-tooltip=${label}
    @pointerenter=${on.open}
    @pointerleave=${on.scheduleClose}
    @focus=${on.open}
    @click=${on.open}
  >
    ${icon()}
    ${
      // A single board is nothing to choose between, so the count would only draw an eye it
      // doesn't need to; from two on, it shows as quiet inline text, never the corner badge
      // `.dpk-icon-badge` uses elsewhere for something unread.
      boardCount > 1 ? html`<span class="dpk-page-switcher-count" aria-hidden="true">${boardCount}</span>` : nothing
    }
  </button>`;
};

export const renderSwitcherMenu = (
  rows: readonly SwitcherRow[],
  m: SwitcherMessages,
  on: SwitcherMenuIntents,
): TemplateResult => html`<div
  id=${SWITCHER_ID}
  class="dpk-settings dpk-page-switcher-menu"
  popover="manual"
  role="menu"
  aria-label=${m.switcher}
  @pointerenter=${on.cancelClose}
  @pointerleave=${(event: PointerEvent) => {
    // Picking a row that swaps the whole row set (board list <-> add view, #86) can resize the
    // popover around a pointer that never moved: the row the click landed on sat lower than the
    // shorter set that replaces it, so the now-stationary cursor ends up past the new popover's
    // edge, and the browser reads that as the pointer leaving. `#focusFirstSwitcherRowAfterUpdate`
    // moves focus into that new set as it renders for exactly this swap, so treat focus still
    // inside as the same "still engaged with this menu" signal pointer presence would otherwise be.
    const current = event.currentTarget;
    if (current instanceof Element && current.matches(':focus-within')) return;
    on.scheduleClose();
  }}
  @focusin=${on.cancelClose}
  @focusout=${(event: FocusEvent) => {
    // Tab moving among this menu's own rows fires `focusout` too; only a focus that actually
    // leaves the menu (nothing it contains) should schedule the close. Picking a row that swaps
    // the whole row set (board list <-> add view, #86) removes the focused row's element before
    // anything else claims focus, so the browser fires this with no `relatedTarget` at all -- not
    // distinguishable here from a real outside press. `cancelClose` on `@focusin` is what actually
    // saves that case: the host moves focus into the new row set once it renders, and that cancels
    // this schedule before its delay elapses.
    const current = event.currentTarget;
    const next = event.relatedTarget;
    if (current instanceof Node && next instanceof Node && current.contains(next)) return;
    on.scheduleClose();
  }}
>
  ${rows.map(
    (row) =>
      html`<div class="dpk-page-switcher-row" role="presentation">
        ${
          row.rename === undefined
            ? html`<button
                class="dpk-settings-option dpk-page-switcher-option"
                type="button"
                data-key=${row.key}
                role=${row.kind === 'action' ? 'menuitem' : 'menuitemradio'}
                aria-checked=${row.kind === 'action' ? nothing : row.current ? 'true' : 'false'}
                @click=${row.activate}
              >
                <span class="dpk-settings-check" aria-hidden="true">${row.current ? iconCheck() : row.icon()}</span>
                <span class="dpk-settings-text"><span class="dpk-settings-name">${row.label}</span></span>
              </button>`
            : html`<div
                class="dpk-settings-option dpk-page-switcher-option"
                data-key=${row.key}
                data-current
                role="menuitemradio"
                aria-checked="true"
              >
                <span class="dpk-settings-check" aria-hidden="true">${iconCheck()}</span>
                <span class="dpk-settings-text">
                  <span class="dpk-settings-name dpk-page-switcher-name"
                    ><dpk-inline-edit
                      .value=${row.label}
                      .label=${row.rename.label}
                      @dpk-commit=${onCommit(row.rename.commit)}
                    ></dpk-inline-edit
                  ></span>
                </span>
              </div>`
        }
        ${
          row.remove === undefined
            ? nothing
            : html`<button
                class="dpk-page-switcher-remove"
                type="button"
                aria-label=${row.remove.label}
                title=${row.remove.label}
                @click=${row.remove.activate}
              >
                ${iconClose()}
              </button>`
        }
      </div>`,
  )}
</div>`;
