import { css } from 'lit';

/**
 * The control atoms back-ported from the user story map's bars: the segmented
 * toggle, the underlined tab strip, the count pill, the select-like filter
 * trigger and the dashed add button. They are styling only: the page (or the
 * template) owns what a click does.
 *
 * A component that draws them in its own shadow root adopts `controlAtom` and
 * renders the same classes, so a page's controls and the templates' controls
 * are one design.
 */
export const controlAtom = css`
  /* ------------------------------------------------------------ count */

  /* How many: a small rounded mono figure, beside a tab or a heading. data-size='sm' is quieter. */
  :where(.dpk-count) {
    display: inline-block;
    flex: none;
    min-width: 18px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--tone-soft, var(--dpk-rule));
    color: var(--tone, var(--dpk-ink-soft));
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    line-height: 17px;
    text-align: center;
  }

  :where(.dpk-count[data-size='sm']) {
    color: var(--tone, var(--dpk-ink-faint));
    font-size: 10px;
    font-weight: 500;
    line-height: 16px;
  }

  /* A count lands like the kit's own count badge does: it pops into place. */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-count) {
      animation: dpk-pop var(--dpk-dur) var(--dpk-ease-spring);
    }
  }

  /* ------------------------------------------------------------ segmented */

  /* A sunken track with the selected segment raised on top of it. */
  :where(.dpk-segmented) {
    display: inline-flex;
    gap: 2px;
    max-width: 100%;
    padding: 2px;
    overflow-x: auto;
    scrollbar-width: none;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  :where(.dpk-segmented) > :where(a, button) {
    padding: 4px 12px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12px;
    font-weight: 550;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background var(--dpk-dur) var(--dpk-ease),
      color var(--dpk-dur) var(--dpk-ease),
      box-shadow var(--dpk-dur) var(--dpk-ease);
  }

  :where(.dpk-segmented) > :where(a:hover, button:hover) {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  :where(.dpk-segmented) > :where(a:focus-visible, button:focus-visible) {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-segmented)
    > :where(
      [aria-selected='true'],
      [aria-pressed='true'],
      [aria-checked='true'],
      [aria-current]:not([aria-current='false'])
    ) {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  /* The pick landing in its track: the raised segment grows into place, so the
     eye follows the selection instead of finding it already moved. */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-segmented)
      > :where(
        [aria-selected='true'],
        [aria-pressed='true'],
        [aria-checked='true'],
        [aria-current]:not([aria-current='false'])
      ) {
      animation: dpk-scale-in var(--dpk-dur-fast) var(--dpk-ease-out);
    }
  }

  /* ------------------------------------------------------------ tab strip */

  /*
   * The pages of a view: an underlined tab strip, heavier than a segmented
   * toggle. The selected tab's underline sits on the strip's bottom rule;
   * --dpk-tabstrip-pad is the room between the tabs and that rule, so a bar
   * that draws its own rule can set it to its padding and drop the strip's.
   */
  :where(.dpk-tabstrip) {
    --_tabstrip-pad: var(--dpk-tabstrip-pad, 6px);
    position: relative;
    display: flex;
    gap: 4px;
    min-width: 0;
    padding-bottom: var(--_tabstrip-pad);
    border-bottom: 1px solid var(--dpk-rule);
  }

  :where(.dpk-tabstrip) > :where(a, button) {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border: none;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.005em;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color var(--dpk-dur) var(--dpk-ease),
      background var(--dpk-dur) var(--dpk-ease);
  }

  :where(.dpk-tabstrip) > :where(a:hover, button:hover) {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  :where(.dpk-tabstrip) > :where(a:focus-visible, button:focus-visible) {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-tabstrip)
    > :where([aria-selected='true'], [aria-pressed='true'], [aria-current]:not([aria-current='false'])) {
    color: var(--dpk-ink);
    font-weight: 700;
  }

  :where(.dpk-tabstrip)
    > :where([aria-selected='true'], [aria-pressed='true'], [aria-current]:not([aria-current='false']))::after {
    content: '';
    position: absolute;
    right: 10px;
    bottom: calc(-1 * var(--_tabstrip-pad) - 1px);
    left: 10px;
    height: 2px;
    border-radius: 2px;
    background: var(--dpk-tabstrip-accent, var(--dpk-blue));
    transform-origin: center;
  }

  /* The underline is drawn out from under its label as the tab takes over. */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-tabstrip)
      > :where([aria-selected='true'], [aria-pressed='true'], [aria-current]:not([aria-current='false']))::after {
      animation: dpk-grow-in var(--dpk-dur-fast) var(--dpk-ease-out);
    }
  }

  :where(.dpk-tabstrip)
    > :where([aria-selected='true'], [aria-pressed='true'], [aria-current]:not([aria-current='false']))
    > :where(.dpk-count) {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  /* ------------------------------------------------------------ filter */

  /*
   * A select-like trigger that names what it filters and what it is set to:
   * <button class="dpk-filter"><span>Status</span><b>All</b></button>.
   * data-active='true' (or aria-pressed) marks a filter that narrows the view.
   */
  :where(.dpk-filter) {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    max-width: 260px;
    min-height: var(--dpk-control-h, 30px);
    padding: 6px 28px 6px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised)
      url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></svg>")
      no-repeat right 8px center;
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    text-align: left;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    cursor: pointer;
    transition:
      border-color var(--dpk-dur) var(--dpk-ease),
      box-shadow var(--dpk-dur) var(--dpk-ease),
      background-color var(--dpk-dur) var(--dpk-ease),
      transform var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-filter:hover) {
    border-color: var(--dpk-rule-hover);
  }

  :where(.dpk-filter:focus-visible) {
    outline: none;
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-filter[data-active='true'], .dpk-filter[aria-pressed='true']) {
    border-color: color-mix(in oklab, var(--dpk-blue) 55%, var(--dpk-rule-strong));
    background-color: color-mix(in oklab, var(--dpk-blue) 8%, var(--dpk-paper-raised));
  }

  :where(.dpk-filter) > :where(:first-child) {
    flex: none;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    font-weight: 600;
  }

  :where(.dpk-filter) > :where(:last-child:not(:first-child)) {
    min-width: 0;
    overflow: hidden;
    color: var(--dpk-ink);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ------------------------------------------------------------ add */

  /* The quiet "add one here" button at the end of a list or a cell: dashed, blue under the pointer. */
  :where(.dpk-add) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 8px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-faint);
    font: inherit;
    font-size: 11.5px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition:
      background var(--dpk-dur) var(--dpk-ease),
      border-color var(--dpk-dur) var(--dpk-ease),
      color var(--dpk-dur) var(--dpk-ease),
      transform var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-add:hover) {
    border-color: var(--dpk-blue);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  :where(.dpk-add:focus-visible) {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* ------------------------------------------------------------ form controls */

  /*
   * Text entry atoms for author content: a one-line .dpk-input (text, url,
   * …), a resizable .dpk-textarea, and the native .dpk-select styled to
   * match. For a filterable or multi-pick list use the combobox component
   * instead; for a popover listbox, the select component.
   */
  :where(.dpk-input, .dpk-textarea, .dpk-select) {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--dpk-control-h, 32px);
    padding: 6px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
    transition:
      border-color var(--dpk-dur) var(--dpk-ease),
      box-shadow var(--dpk-dur) var(--dpk-ease),
      background var(--dpk-dur) var(--dpk-ease);
  }

  :where(.dpk-input, .dpk-textarea)::placeholder {
    color: var(--dpk-ink-faint);
  }

  :where(.dpk-input:hover, .dpk-textarea:hover, .dpk-select:hover) {
    border-color: var(--dpk-rule-hover);
  }

  /* The ring arrives over the fast step rather than snapping on: the same
     focus ring, given the time to read as feedback. */
  :where(.dpk-input:focus, .dpk-textarea:focus, .dpk-select:focus) {
    outline: none;
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
    transition-duration: var(--dpk-dur-fast);
  }

  :where(.dpk-input:disabled, .dpk-textarea:disabled, .dpk-select:disabled) {
    opacity: 0.55;
    cursor: not-allowed;
  }

  :where(.dpk-textarea) {
    resize: vertical;
    min-height: 64px;
    line-height: 1.55;
  }

  :where(.dpk-select) {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 28px;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    cursor: pointer;
  }
`;
