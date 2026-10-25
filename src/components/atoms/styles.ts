import { css } from 'lit';

import { iconButtonCss, motion, themeScope } from '../../core/theme';
import { cardAtom } from './card';
import { chartAtom } from './chart';
import { controlAtom } from './controls';
import { mockAtom } from './mock';

/**
 * The CSS atoms: styling-only building blocks for author content, applied by
 * class (`dpk-*`) and varied by data attributes (`data-tone`, `data-variant`,
 * `data-size`). They have no behavior and no review meaning, so they are not
 * custom elements: plain HTML stays the authoring surface.
 *
 * Everything is wrapped in `:where()` so a page's own CSS always wins without a
 * specificity fight.
 *
 * Motion: author content is the document, not a shadow root, so the atoms
 * declare the motion keyframes themselves (`motion`, shared with the
 * components) and each entrance is opt-in per atom. Because a document-level
 * `*` reset would override the page's own CSS, every atom animation is
 * declared inside `@media (prefers-reduced-motion: no-preference)` instead:
 * with motion turned down, nothing in this sheet animates at all.
 */
export const atomStyles = css`
  /* ------------------------------------------------------------ theme scope */

  ${themeScope}

  /* ------------------------------------------------------------ motion */

  ${motion}

  /*
   * A group that should arrive in sequence rather than all at once: put
   * 'data-dpk-stagger' on the container (a .dpk-stack, a .dpk-grid, a list) and
   * its children rise in one after another, --dpk-stagger apart. Opt-in, so no
   * ordinary list animates; the seventh child onwards arrives with the sixth.
   */
  @media (prefers-reduced-motion: no-preference) {
    :where([data-dpk-stagger]) > :where(*) {
      animation: dpk-rise-in var(--dpk-dur) var(--dpk-ease-out) backwards;
    }

    :where([data-dpk-stagger]) > :where(:nth-child(2)) {
      animation-delay: var(--dpk-stagger);
    }

    :where([data-dpk-stagger]) > :where(:nth-child(3)) {
      animation-delay: calc(var(--dpk-stagger) * 2);
    }

    :where([data-dpk-stagger]) > :where(:nth-child(4)) {
      animation-delay: calc(var(--dpk-stagger) * 3);
    }

    :where([data-dpk-stagger]) > :where(:nth-child(5)) {
      animation-delay: calc(var(--dpk-stagger) * 4);
    }

    :where([data-dpk-stagger]) > :where(:nth-child(n + 6)) {
      animation-delay: calc(var(--dpk-stagger) * 5);
    }
  }

  /* ------------------------------------------------------------ layout */

  :where(.dpk-stack) {
    display: flex;
    flex-direction: column;
    gap: var(--dpk-gap, 12px);
  }

  :where(.dpk-cluster) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dpk-gap, 8px);
  }

  :where(.dpk-status) {
    --tone: var(--dpk-ink-soft);
    --tone-soft: var(--dpk-paper-sunken);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 11px 4px 9px;
    border-radius: 999px;
    background: var(--tone-soft);
    color: color-mix(in srgb, var(--tone) 80%, var(--dpk-ink));
    font-size: 12.5px;
    font-weight: 650;
    line-height: 1.5;
    white-space: nowrap;
  }

  :where(.dpk-status)::before {
    content: '';
    flex: 0 0 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tone);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--tone) 22%, transparent);
  }

  :where(.dpk-status[data-status='todo']) {
    --tone: var(--dpk-rule-strong);
    --tone-soft: var(--dpk-paper-sunken);
  }

  :where(.dpk-status[data-status='doing']) {
    --tone: var(--dpk-blue);
    --tone-soft: var(--dpk-blue-soft);
  }

  :where(.dpk-status[data-status='done']) {
    --tone: var(--dpk-green);
    --tone-soft: var(--dpk-green-soft);
  }

  :where(.dpk-status[data-status='blocked']) {
    --tone: var(--dpk-danger);
    --tone-soft: var(--dpk-danger-soft);
  }

  :where(.dpk-hover-tools) {
    display: inline-flex;
    align-items: center;
    gap: var(--dpk-gap, 4px);
    opacity: 0;
    /* Revealed by its host: fades up a hair, so the row does not just blink. */
    transform: translateY(2px);
    pointer-events: none;
    transition:
      opacity var(--dpk-dur-fast) var(--dpk-ease),
      transform var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-hover-host):is(:hover, :focus-within) :where(.dpk-hover-tools) {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }

  @media (hover: none) {
    :where(.dpk-hover-tools) {
      opacity: 1;
      transform: none;
      pointer-events: auto;
    }
  }

  :where(.dpk-navlist) {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  :where(.dpk-navlist) > :where(li) {
    min-width: 0;
  }

  :where(.dpk-navlist) > :where(li) > :where(a, button) {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
    padding: 7px 10px;
    border: none;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 13px;
    line-height: 1.4;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      color var(--dpk-dur-fast) var(--dpk-ease),
      box-shadow var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-navlist) > :where(li) > :where(a, button):hover {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
  }

  :where(.dpk-navlist) > :where(li) > :where(a, button):focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-navlist) > :where(li) > :where([aria-current='page'], [aria-selected='true']) {
    background: color-mix(in srgb, var(--dpk-accent) 8%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--dpk-accent) 20%, transparent),
      var(--dpk-shadow-xs);
  }

  /*
   * A tree: rows nested one step per level, with a guide line down each level
   * and a caret on the rows that open. A branch is a details element whose
   * summary is the row (or a row carrying aria-expanded); a leaf is a
   * plain row, indented to the label column so the levels still read as one
   * list. aria-current="page" marks the row the reader is on.
   */
  :where(.dpk-tree) {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  :where(.dpk-tree) :where(.dpk-tree) {
    margin-left: 14px;
    padding-left: 7px;
    border-left: 1px solid var(--dpk-rule);
  }

  :where(.dpk-tree-node) {
    min-width: 0;
  }

  :where(.dpk-tree-row) {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 5px 8px;
    border: none;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12.5px;
    line-height: 1.45;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      color var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(button.dpk-tree-row) {
    width: 100%;
  }

  :where(.dpk-tree-row):hover {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
  }

  :where(.dpk-tree-row):focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* The caret, turned the way a disclosure's is: closed points along the row, open points down it. */
  :where(summary.dpk-tree-row, .dpk-tree-row[aria-expanded]) {
    list-style: none;
  }

  :where(summary.dpk-tree-row)::-webkit-details-marker {
    display: none;
  }

  :where(summary.dpk-tree-row)::before,
  :where(.dpk-tree-row[aria-expanded])::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    margin-right: 2px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(-45deg);
    transition: transform var(--dpk-dur) var(--dpk-ease);
  }

  :where(details[open]) > :where(summary.dpk-tree-row)::before,
  :where(.dpk-tree-row[aria-expanded='true'])::before {
    transform: rotate(45deg);
  }

  /* A leaf keeps the column of the labels above it, with no caret to take. */
  :where(.dpk-tree-row[data-leaf]) {
    padding-left: 22px;
    cursor: default;
  }

  :where(.dpk-tree-row[aria-current='page'], .dpk-tree-row[aria-selected='true'], .dpk-tree-row[data-current]) {
    background: color-mix(in srgb, var(--dpk-accent) 8%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-weight: 650;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--dpk-accent) 20%, transparent),
      var(--dpk-shadow-xs);
  }

  :where(.dpk-list-row) {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 8px 10px;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink);
    transition: background var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-list-row):hover {
    background: var(--dpk-paper-sunken);
  }

  :where(.dpk-list-row) > :where(:nth-child(2)) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(.dpk-list-row) > :where(:last-child) {
    justify-self: end;
  }

  :where(.dpk-list-row[data-density='compact']) {
    gap: 8px;
    padding: 5px 8px;
  }

  /*
   * An overview row: the same row carrying what a list of the page's own
   * things needs — a tone swatch or a status icon in the first column, a name
   * that is edited in place, and the row's tools at the end.
   */
  :where(.dpk-list-row-name) {
    min-width: 0;
    overflow: hidden;
    color: var(--dpk-ink);
    font-size: 13.5px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The editor pads its text by 4px; pull it back so the name sits on the row's own line. */
  :where(.dpk-list-row-name) > :where(dpk-inline-edit) {
    display: block;
    margin: 0 -4px;
  }

  /* A label's color: a small rounded swatch in --tone. */
  :where(.dpk-list-row-swatch) {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 4px;
    background: var(--tone, var(--dpk-ink-faint));
  }

  /* A status's icon, where a label shows its swatch. */
  :where(.dpk-list-row-icon) {
    flex: none;
    width: 16px;
    height: 16px;
    color: var(--tone, var(--dpk-ink-faint));
  }

  :where(.dpk-list-row-icon) > :where(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* What the row is worth: a share, a count, a note. */
  :where(.dpk-list-row-meta) {
    min-width: 0;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  /* The row's own tools, gathered in its last column. */
  :where(.dpk-list-row-tools) {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  :where(.dpk-toolbar) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    min-height: var(--dpk-control-h, 32px);
    padding: 5px 12px;
  }

  :where(.dpk-toolbar[data-align='end']) {
    justify-content: flex-end;
  }

  :where(.dpk-toolbar-sep) {
    flex: 0 0 1px;
    align-self: stretch;
    margin-block: 4px;
    background: var(--dpk-rule);
  }

  :where(.dpk-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--dpk-min, 220px)), 1fr));
    gap: var(--dpk-gap, 12px);
  }

  :where(.dpk-grid[data-cols='2']) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :where(.dpk-grid[data-cols='3']) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    :where(.dpk-grid[data-cols]) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  :where(.dpk-hscroll) {
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
  }

  :where(.dpk-hscroll[data-snap]) {
    scroll-snap-type: x proximity;
  }

  :where(.dpk-hscroll[data-snap]) > :where(*) {
    scroll-snap-align: start;
  }

  :where(.dpk-legend) {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    line-height: 1.4;
  }

  :where(.dpk-legend) > :where(.dpk-legend-item) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  :where(.dpk-legend) > :where(.dpk-legend-item)::before {
    content: '';
    flex: 0 0 8px;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--dpk-swatch, var(--dpk-rule-strong));
  }

  :where(.dpk-separator) {
    height: 0;
    margin: 20px 0;
    border: none;
    border-top: 1px solid var(--dpk-rule);
  }

  /* ------------------------------------------------------------ prose */

  :where(.dpk-prose) {
    max-width: var(--dpk-measure, 860px);
    color: var(--dpk-ink-soft);
    font-size: 13.5px;
    line-height: 1.8;
    overflow-wrap: anywhere;
    word-break: auto-phrase;
    text-wrap: pretty;
  }

  :where(.dpk-prose) :where(h1, h2, h3, h4) {
    color: var(--dpk-ink);
    font-family: var(--dpk-display);
    font-weight: 660;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  :where(.dpk-prose) :where(h1) {
    margin: 0 0 12px;
    font-size: 22px;
  }

  :where(.dpk-prose) :where(h2) {
    margin: 36px 0 12px;
    font-size: 16px;
  }

  :where(.dpk-prose) :where(h3) {
    margin: 22px 0 8px;
    font-size: 13.5px;
  }

  :where(.dpk-prose) :where(p, ul, ol, blockquote, pre, table) {
    margin: 0 0 12px;
  }

  :where(.dpk-prose) > :where(:first-child) {
    margin-top: 0;
  }

  :where(.dpk-prose) > :where(:last-child) {
    margin-bottom: 0;
  }

  :where(.dpk-prose) :where(ul, ol) {
    padding-left: 20px;
  }

  :where(.dpk-prose) :where(strong) {
    color: var(--dpk-ink);
    font-weight: 650;
  }

  :where(.dpk-prose) :where(a) {
    color: var(--dpk-blue);
    text-underline-offset: 2px;
  }

  :where(.dpk-prose) :where(:not(pre) > code) {
    padding: 0.08em 0.35em;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
    font-family: var(--dpk-mono);
    font-size: 0.88em;
  }

  :where(.dpk-prose) :where(blockquote) {
    padding: 8px 14px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }

  /*
   * A code block is revealed rather than simply present: the frame fades up as
   * its already-highlighted lines land, at the slow step so a long block reads
   * as one panel instead of a flicker. 'dpk-code' (its own element) gets the
   * same entrance from the outside, since its frame is in its shadow root.
   */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-prose) :where(pre),
    :where(dpk-code, dpk-code-group) {
      animation: dpk-rise-in var(--dpk-dur-slow) var(--dpk-ease-out) backwards;
    }
  }

  :where(.dpk-eyebrow) {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 550;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  :where(.dpk-muted) {
    color: var(--dpk-ink-faint);
  }

  /* ------------------------------------------------------------ button */

  :where(.dpk-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    font-weight: 550;
    line-height: 1;
    white-space: nowrap;
    text-decoration: none;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    cursor: pointer;
    transition:
      background var(--dpk-dur) var(--dpk-ease),
      border-color var(--dpk-dur) var(--dpk-ease),
      box-shadow var(--dpk-dur) var(--dpk-ease),
      transform var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-btn):hover:not(:disabled) {
    border-color: var(--dpk-rule-hover);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  :where(.dpk-btn):active:not(:disabled) {
    transform: translateY(1px) scale(0.985);
  }

  :where(.dpk-btn):focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-btn):disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :where(.dpk-btn[data-variant='primary']) {
    border-color: transparent;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
  }

  :where(.dpk-btn[data-variant='primary']):hover:not(:disabled) {
    border-color: transparent;
    background: var(--dpk-accent-strong);
  }

  :where(.dpk-btn[data-variant='ghost']) {
    border-color: transparent;
    background: transparent;
    color: var(--dpk-ink-soft);
    box-shadow: none;
  }

  :where(.dpk-btn[data-variant='ghost']):hover:not(:disabled) {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
    box-shadow: none;
  }

  :where(.dpk-btn[data-variant='danger']) {
    color: var(--dpk-danger);
  }

  :where(.dpk-btn[data-variant='danger']):hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--dpk-danger) 40%, transparent);
    background: var(--dpk-danger-soft);
  }

  :where(.dpk-btn[data-size='sm']) {
    min-height: 24px;
    padding: 0 9px;
    font-size: 11.5px;
  }

  /*
   * An icon-only button: a close ✕, a comment glyph, a card's hover tools.
   * The same class and rules as the shadow-DOM components use (src/core/theme,
   * \`iconButtonCss\`), so author content and the kit's own chrome read as one
   * button family. data-size='sm' is quieter; data-variant='subtle' stays
   * visible at rest instead of only on hover; data-active marks a toggle.
   */
  ${iconButtonCss((selector) => `:where(${selector})`)}

  /*
   * The comment trigger: a quiet pill that opens a review comment on the thing
   * it sits beside (a commentable region's corner, a board's chrome). It stays
   * out of the way at rest, warms to the accent on hover and while its popover
   * is open, and with data-reveal it only appears once its .dpk-hover-host is
   * hovered or focused (always, on a touch screen).
   */
  :where(.dpk-comment-btn) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 6px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    color: var(--dpk-ink-faint);
    font: inherit;
    font-size: 11.5px;
    font-weight: 550;
    line-height: 18px;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      border-color var(--dpk-dur-fast) var(--dpk-ease),
      color var(--dpk-dur-fast) var(--dpk-ease),
      opacity var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-comment-btn):hover,
  :where(.dpk-comment-btn[aria-expanded='true']) {
    border-color: color-mix(in srgb, var(--dpk-accent) 30%, transparent);
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
  }

  :where(.dpk-comment-btn):focus-visible {
    outline: none;
    color: var(--dpk-accent);
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-comment-btn) > :where(svg) {
    flex: none;
    width: 14px;
    height: 14px;
  }

  /* Revealed by its host rather than standing at rest: the row or card it belongs to turns it up. */
  :where(.dpk-comment-btn[data-reveal]) {
    opacity: 0;
    pointer-events: none;
  }

  :where(.dpk-hover-host):is(:hover, :focus-within) :where(.dpk-comment-btn[data-reveal]),
  :where(.dpk-comment-btn[data-reveal]):is(:focus-visible, [aria-expanded='true']) {
    opacity: 1;
    pointer-events: auto;
  }

  @media (hover: none) {
    :where(.dpk-comment-btn[data-reveal]) {
      opacity: 1;
      pointer-events: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :where(.dpk-comment-btn) {
      transition: none;
    }
  }

  /*
   * The copy button: compact, and it says what happened. data-state='copied'
   * (or data-copied='true') turns it green, a failure red; data-variant
   * 'outline' gives it a border where it stands on its own instead of in a row.
   */
  :where(.dpk-copy-btn) {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 24px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      border-color var(--dpk-dur-fast) var(--dpk-ease),
      color var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-copy-btn):hover:not(:disabled) {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }

  :where(.dpk-copy-btn):focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-copy-btn[data-variant='outline']) {
    border-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  :where(.dpk-copy-btn[data-variant='outline']):hover:not(:disabled) {
    border-color: var(--dpk-rule-hover);
  }

  :where(.dpk-copy-btn):is([data-state='copied'], [data-copied='true']) {
    color: var(--dpk-green);
  }

  :where(.dpk-copy-btn[data-variant='outline']):is([data-state='copied'], [data-copied='true']) {
    border-color: color-mix(in srgb, var(--dpk-green) 35%, transparent);
    background: var(--dpk-green-soft);
  }

  :where(.dpk-copy-btn):is([data-state='failed'], [data-status='failed']) {
    color: var(--dpk-danger);
  }

  :where(.dpk-copy-btn[data-variant='outline']):is([data-state='failed'], [data-status='failed']) {
    border-color: color-mix(in srgb, var(--dpk-danger) 35%, transparent);
    background: var(--dpk-danger-soft);
  }

  :where(.dpk-copy-btn):disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :where(.dpk-copy-btn) > :where(svg) {
    flex: none;
    width: 13px;
    height: 13px;
  }

  /* ------------------------------------------------------------ badge / chip / kbd */

  :where(.dpk-badge) {
    --tone: var(--dpk-ink-soft);
    --tone-soft: var(--dpk-paper-sunken);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--tone-soft);
    color: var(--tone);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.5;
    white-space: nowrap;
    vertical-align: 0.08em;
  }

  :where([data-tone='accent']) {
    --tone: var(--dpk-accent);
    --tone-soft: var(--dpk-accent-soft);
  }

  :where([data-tone='blue'], [data-tone='info']) {
    --tone: var(--dpk-blue);
    --tone-soft: var(--dpk-blue-soft);
  }

  :where([data-tone='green'], [data-tone='success']) {
    --tone: var(--dpk-green);
    --tone-soft: var(--dpk-green-soft);
  }

  :where([data-tone='amber'], [data-tone='warning']) {
    --tone: var(--dpk-amber);
    --tone-soft: var(--dpk-amber-soft);
  }

  :where([data-tone='violet'], [data-tone='note']) {
    --tone: var(--dpk-violet);
    --tone-soft: var(--dpk-violet-soft);
  }

  :where([data-tone='danger']) {
    --tone: var(--dpk-danger);
    --tone-soft: var(--dpk-danger-soft);
  }

  :where(.dpk-chip) {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 3px 12px 3px 4px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    line-height: 1.6;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  :where(.dpk-chip[data-tone]) {
    padding-left: 12px;
    border-color: color-mix(in srgb, var(--tone) 35%, transparent);
    background: var(--tone-soft);
    color: var(--tone);
  }

  :where(.dpk-chip) > :where(b) {
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
    font-weight: 550;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /*
   * A link chip: the service's mark and the short label, for a story's
   * references and anything else that points outward. The mark is a 12px SVG
   * slot in currentColor; the label truncates rather than widening its line.
   */
  :where(.dpk-link-chip) {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    max-width: 100%;
    padding: 1px 8px 1px 6px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 18px;
    text-decoration: none;
    transition:
      color var(--dpk-dur-fast) var(--dpk-ease),
      border-color var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(.dpk-link-chip):hover {
    border-color: var(--dpk-ink-faint);
    color: var(--dpk-ink);
  }

  :where(.dpk-link-chip):focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-link-chip) > :where(svg) {
    flex: none;
    width: 12px;
    height: 12px;
  }

  :where(.dpk-link-chip) > :where(span) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(.dpk-kbd) {
    display: inline-block;
    min-width: 1.6em;
    padding: 0 5px;
    border: 1px solid var(--dpk-rule-strong);
    border-bottom-width: 2px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 0.82em;
    line-height: 1.5;
    text-align: center;
  }

  /* ------------------------------------------------------------ motion on state */

  /*
   * A figure that appears beside a thing — a status, a badge, a chip, a count —
   * grows into its place over the fast step. It is the same pop the kit's own
   * count badge uses (src/core/theme), at the size of a chip: enough to say
   * "this is new" without the row moving.
   */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-status, .dpk-badge, .dpk-chip, .dpk-link-chip, .dpk-kbd) {
      animation: dpk-scale-in var(--dpk-dur-fast) var(--dpk-ease-out);
    }

    /* A press: the surface gives a hair, and the shadow with it. */
    :where(.dpk-btn, .dpk-copy-btn, .dpk-comment-btn, .dpk-add, .dpk-filter, .dpk-segmented > *):active {
      transform: scale(var(--dpk-press));
    }

    /* A menu is lifted into place from the control that opened it. */
    :where(.dpk-menu[popover]:popover-open) {
      animation: dpk-scale-in var(--dpk-dur-fast) var(--dpk-ease-out);
    }
  }

  :where(.dpk-menu-item):active {
    background: var(--dpk-paper-inset);
  }

  ${controlAtom}

  /* ------------------------------------------------------------ field */

  :where(.dpk-field) {
    display: grid;
    gap: 6px;
  }

  :where(.dpk-field-hint) {
    margin: -2px 0 0;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    line-height: 1.5;
  }

  :where(.dpk-field[data-invalid]) > :where(.dpk-label) {
    color: var(--dpk-danger);
  }

  :where(.dpk-field[data-invalid]) > :where(.dpk-input, .dpk-select, .dpk-textarea) {
    border-color: var(--dpk-danger);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--dpk-danger) 22%, transparent);
  }

  :where(.dpk-field[data-invalid]) > :where(.dpk-field-hint) {
    color: var(--dpk-danger);
  }

  /* ------------------------------------------------------------ surfaces */

  ${cardAtom}

  /* Info by default; a data-tone (same specificity, earlier in the sheet) must still win. */
  :where(.dpk-callout:not([data-tone])) {
    --tone: var(--dpk-blue);
    --tone-soft: var(--dpk-blue-soft);
  }

  :where(.dpk-callout) {
    position: relative;
    display: grid;
    gap: 2px;
    padding: 12px 14px 12px 40px;
    border: 1px solid color-mix(in srgb, var(--tone) 24%, transparent);
    border-radius: var(--dpk-radius);
    background: var(--tone-soft);
    color: var(--dpk-ink-soft);
    font-size: 13px;
    line-height: 1.65;
  }

  :where(.dpk-callout)::before {
    content: '';
    position: absolute;
    top: 15px;
    left: 14px;
    width: 16px;
    height: 16px;
    background: var(--tone);
    mask: var(--dpk-callout-icon) center / contain no-repeat;
    -webkit-mask: var(--dpk-callout-icon) center / contain no-repeat;
    --dpk-callout-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round'><circle cx='8' cy='8' r='6.3'/><path d='M8 7.2v3.6M8 5.2v.1'/></svg>");
  }

  :where(.dpk-callout[data-tone='success'])::before {
    --dpk-callout-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><circle cx='8' cy='8' r='6.3'/><path d='m5.4 8.2 1.8 1.8 3.4-3.6'/></svg>");
  }

  :where(.dpk-callout[data-tone='warning'], .dpk-callout[data-tone='danger'])::before {
    --dpk-callout-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M8 2.2 14.3 13H1.7z'/><path d='M8 6.6v3M8 11.3v.1'/></svg>");
  }

  :where(.dpk-callout[data-tone='note'])::before {
    --dpk-callout-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 2.5h7l3 3v8H3z'/><path d='M5.5 8h5M5.5 10.5h3.5'/></svg>");
  }

  :where(.dpk-callout) > :where(*) {
    margin: 0;
  }

  /* A callout arrives as a block of its own — and its mark lands a step later,
     like a stamp on the block it belongs to. */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-callout) {
      animation: dpk-rise-in var(--dpk-dur-slow) var(--dpk-ease-out) backwards;
    }

    :where(.dpk-callout)::before {
      animation: dpk-pop var(--dpk-dur) var(--dpk-ease-spring) both;
      animation-delay: calc(var(--dpk-stagger) * 2);
    }
  }

  :where(.dpk-callout) > :where(strong:first-child, b:first-child) {
    color: var(--dpk-ink);
  }

  :where(.dpk-empty) {
    display: grid;
    justify-items: center;
    gap: 8px;
    max-width: 620px;
    padding: 28px 24px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-faint);
    font-size: 13px;
    line-height: 1.65;
    text-align: center;
  }

  :where(.dpk-empty[data-variant='dashed']) {
    border-style: dashed;
  }

  :where(.dpk-empty) > :where(*) {
    margin: 0;
  }

  :where(.dpk-empty) > :where(svg:first-child) {
    width: 24px;
    height: 24px;
    color: var(--dpk-ink-faint);
    opacity: 0.7;
  }

  /*
   * A menu: the shell's settings menu and the context menu turned into an atom
   * for author content. One raised panel on the lg radius with the kit's own
   * bevel and shadow, 6px of padding and a 2px gap between its rows; a row is
   * a button, a link or an option that is on. It opens as a popover (the
   * browser places it) or sits inline as a plain panel.
   */
  :where(.dpk-menu) {
    box-sizing: border-box;
    display: grid;
    align-content: start;
    gap: 2px;
    min-width: 180px;
    margin: 0;
    padding: 6px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    color: var(--dpk-ink);
    font-size: 12.5px;
    line-height: 1.45;
  }

  /*
   * As a popover it keeps the browser's own hiding: this reset takes the UA's
   * margins and border off it, and its layout waits for :popover-open, so a
   * closed menu is never laid out.
   */
  :where(.dpk-menu[popover]) {
    position: fixed;
    inset: auto;
    display: none;
    max-height: min(70vh, 480px);
    margin: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }

  :where(.dpk-menu[popover]:popover-open) {
    display: grid;
  }

  :where(.dpk-menu-item) {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    min-width: 0;
    padding: 7px 9px;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: none;
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    font-weight: 550;
    line-height: 1.4;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      color var(--dpk-dur-fast) var(--dpk-ease);
  }

  /* The row a pointer or a keyboard arrow is on, and the one the menu opened from. */
  :where(.dpk-menu-item):hover,
  :where(.dpk-menu-item[data-active]) {
    background: var(--dpk-paper-sunken);
  }

  :where(.dpk-menu-item):focus-visible {
    outline: none;
    background: var(--dpk-paper-sunken);
    box-shadow: var(--dpk-focus);
  }

  :where(.dpk-menu-item):is(:disabled, [aria-disabled='true']) {
    color: var(--dpk-ink-faint);
    opacity: 0.55;
    cursor: default;
  }

  :where(.dpk-menu-item[aria-checked='true'], .dpk-menu-item[aria-selected='true'], .dpk-menu-item[data-checked]) {
    font-weight: 650;
  }

  /* A destructive row carries the danger tone's own ink and hover tint. */
  :where(.dpk-menu-item[data-tone='danger']) {
    color: var(--dpk-danger);
  }

  :where(.dpk-menu-item[data-tone='danger']):hover {
    background: var(--dpk-danger-soft);
  }

  :where(.dpk-menu-item) > :where(svg) {
    flex: none;
    width: 15px;
    height: 15px;
  }

  :where(.dpk-menu-heading) {
    margin: 0;
    padding: 6px 9px 2px;
    color: var(--dpk-ink-faint);
    font-size: 10.5px;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  :where(.dpk-menu-separator) {
    height: 0;
    margin: 4px 2px;
    border: 0;
    border-top: 1px solid var(--dpk-rule);
  }

  /* What the row is bound to on the keyboard, kept out of its label's way. */
  :where(.dpk-menu-shortcut) {
    margin-inline-start: auto;
    padding-inline-start: 16px;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* The check column: a box that fills with the accent while its row is on. */
  :where(.dpk-menu-check) {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 4px;
    background: var(--dpk-paper-raised);
    /* A tick always in the markup keeps its place and shows only when checked. */
    color: transparent;
  }

  :where(.dpk-menu-check) > :where(svg) {
    width: 12px;
    height: 12px;
    stroke-width: 3;
  }

  :where(.dpk-menu-item[aria-checked='true'], .dpk-menu-item[data-checked]) > :where(.dpk-menu-check) {
    border-color: var(--dpk-accent-strong);
    background: var(--dpk-accent-strong);
    color: var(--dpk-accent-ink);
  }

  /* A row of two lines: what it does, and what that means. */
  :where(.dpk-menu-text) {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  :where(.dpk-menu-label) {
    min-width: 0;
    overflow: hidden;
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(.dpk-menu-hint) {
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    font-weight: 400;
    line-height: 1.45;
    white-space: normal;
  }

  /* ------------------------------------------------------------ table */

  :where(table.dpk-table) {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    font-size: 12.5px;
    line-height: 1.55;
    overflow: hidden;
  }

  :where(table.dpk-table) :where(th, td) {
    padding: 8px 12px;
    border-bottom: 1px solid var(--dpk-rule);
    text-align: left;
    vertical-align: top;
    /* A row's highlight follows the pointer across it instead of jumping cell
       to cell; a background fade costs no layout. */
    transition: background var(--dpk-dur-fast) var(--dpk-ease);
  }

  :where(table.dpk-table) :where(thead th) {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  :where(table.dpk-table) :where(tbody tr:last-child) > :where(td, th) {
    border-bottom: none;
  }

  :where(table.dpk-table) :where(tbody tr):hover > :where(td, th) {
    background: color-mix(in srgb, var(--dpk-paper-sunken) 60%, transparent);
  }

  :where(table.dpk-table) :where(tbody tr[data-chosen], tbody tr[aria-current='true']) > :where(td, th) {
    background: var(--dpk-blue-soft);
  }

  :where(table.dpk-table) :where(td.dpk-num, th.dpk-num) {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  :where(.dpk-table-wrap) {
    max-width: 100%;
    overflow-x: auto;
  }

  /* ------------------------------------------------------------ data display */

  :where(dl.dpk-dl) {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 6px 18px;
    margin: 0;
    font-size: 13px;
  }

  :where(dl.dpk-dl) > :where(dt) {
    color: var(--dpk-ink-faint);
    font-weight: 550;
  }

  :where(dl.dpk-dl) > :where(dd) {
    margin: 0;
    color: var(--dpk-ink);
  }

  :where(.dpk-stat) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  :where(.dpk-stat) > :where(span) {
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
  }

  :where(.dpk-stat) > :where(strong) {
    color: var(--dpk-ink);
    font-family: var(--dpk-display);
    font-size: 22px;
    font-weight: 660;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
  }

  :where(.dpk-stat) > :where(small) {
    color: var(--tone, var(--dpk-ink-faint));
    font-size: 11.5px;
  }

  :where(ol.dpk-steps) {
    counter-reset: dpk-step;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  :where(ol.dpk-steps) > :where(li) {
    position: relative;
    padding: 0 0 18px 36px;
    counter-increment: dpk-step;
    color: var(--dpk-ink-soft);
  }

  :where(ol.dpk-steps) > :where(li)::before {
    content: counter(dpk-step);
    position: absolute;
    top: 0;
    left: 0;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 600;
  }

  :where(ol.dpk-steps) > :where(li:not(:last-child))::after {
    content: '';
    position: absolute;
    top: 28px;
    bottom: 4px;
    left: 12px;
    width: 1px;
    background: var(--dpk-rule-strong);
  }

  :where(ol.dpk-steps) > :where(li[data-state='done'])::before {
    content: '✓';
    border-color: transparent;
    background: var(--dpk-green-soft);
    color: var(--dpk-green);
  }

  :where(ol.dpk-steps) > :where(li[data-state='current'])::before {
    border-color: var(--dpk-blue);
    background: var(--dpk-blue);
    color: #fff;
  }

  :where(ol.dpk-steps) > :where(li) > :where(b, strong):first-child {
    display: block;
    color: var(--dpk-ink);
    line-height: 24px;
  }

  /*
   * A timeline: a vertical rail with a node per entry, the date beside it in
   * the when column and the entry itself in the body. The rail runs through
   * each entry's own padding, so the nodes read as one line; data-variant
   * 'add' ends it in a dashed stub, and a data-tone colors a node through
   * --tone.
   */
  :where(ol.dpk-timeline) {
    --dpk-timeline-when: 96px;
    --dpk-timeline-node: 26px;
    --dpk-timeline-gap: 24px;
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  :where(.dpk-timeline-entry) {
    display: grid;
    grid-template-columns: var(--dpk-timeline-when) var(--dpk-timeline-node) minmax(0, 1fr);
    grid-template-areas: 'when rail body';
    column-gap: 14px;
    padding-bottom: var(--dpk-timeline-gap);
  }

  :where(.dpk-timeline-entry:last-child) {
    padding-bottom: 0;
  }

  :where(.dpk-timeline-when) {
    grid-area: when;
    display: flex;
    justify-content: flex-end;
    padding-top: 3px;
  }

  :where(.dpk-timeline-date) {
    color: var(--dpk-ink);
    font-family: var(--dpk-mono);
    font-size: 11.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }

  :where(.dpk-timeline-rail) {
    grid-area: rail;
    position: relative;
    display: flex;
    justify-content: center;
  }

  :where(.dpk-timeline-rail)::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: calc(-1 * var(--dpk-timeline-gap));
    left: calc(50% - 1px);
    width: 2px;
    border-radius: 1px;
    background: var(--dpk-rule-strong);
  }

  /* The first node starts the rail, the last one ends it. */
  :where(.dpk-timeline-entry:first-child) > :where(.dpk-timeline-rail)::before {
    top: calc(var(--dpk-timeline-node) / 2);
  }

  :where(.dpk-timeline-entry:last-child) > :where(.dpk-timeline-rail)::before {
    bottom: auto;
    height: calc(var(--dpk-timeline-node) / 2);
  }

  :where(.dpk-timeline-entry[data-variant='add']) > :where(.dpk-timeline-rail)::before {
    bottom: auto;
    height: calc(var(--dpk-timeline-node) / 2);
    background: repeating-linear-gradient(to bottom, var(--dpk-rule-strong) 0 3px, transparent 3px 7px);
  }

  :where(.dpk-timeline-node) {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--dpk-timeline-node);
    height: var(--dpk-timeline-node);
    border: 1px solid color-mix(in srgb, var(--tone, var(--dpk-rule-strong)) 45%, transparent);
    border-radius: 50%;
    background: var(--dpk-paper-raised);
    color: var(--tone, var(--dpk-ink));
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    /* A ring of page color cuts the rail around the node. */
    box-shadow:
      0 0 0 4px var(--dpk-timeline-ring, var(--dpk-paper)),
      var(--dpk-bevel),
      var(--dpk-shadow-xs);
  }

  :where(.dpk-timeline-entry[data-variant='add']) > :where(.dpk-timeline-node) {
    border-style: dashed;
    border-color: var(--dpk-rule-strong);
    background: var(--dpk-paper);
    box-shadow: 0 0 0 4px var(--dpk-timeline-ring, var(--dpk-paper));
  }

  /* The add node draws its own plus, so an empty node is enough. */
  :where(.dpk-timeline-entry[data-variant='add']) > :where(.dpk-timeline-node)::before,
  :where(.dpk-timeline-entry[data-variant='add']) > :where(.dpk-timeline-node)::after {
    content: '';
    position: absolute;
    top: calc(50% - 0.75px);
    left: calc(50% - 5px);
    width: 10px;
    height: 1.5px;
    border-radius: 1px;
    background: var(--dpk-ink-faint);
  }

  :where(.dpk-timeline-entry[data-variant='add']) > :where(.dpk-timeline-node)::after {
    transform: rotate(90deg);
  }

  :where(.dpk-timeline-body) {
    grid-area: body;
    display: grid;
    gap: 6px;
    min-width: 0;
    justify-items: start;
  }

  /*
   * A milestone: the same timeline, one slice of the work per entry — a title,
   * what it is for, and the facts that measure it. data-at marks the entry the
   * page stands on, whose node takes the accent; data-empty leaves a date or a
   * text the timeline has none for faint rather than blank.
   */
  :where(.dpk-timeline-entry[data-at]) > :where(.dpk-timeline-node) {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  :where(.dpk-timeline-title) {
    min-width: 0;
    margin: 0;
    color: var(--dpk-ink);
    font-family: var(--dpk-display);
    font-size: 16px;
    font-weight: 660;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  :where(.dpk-timeline-text) {
    max-width: 62ch;
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 13px;
    line-height: 1.7;
  }

  :where(.dpk-timeline-date[data-empty], .dpk-timeline-title[data-empty], .dpk-timeline-text[data-empty]) {
    color: var(--dpk-ink-faint);
    font-weight: 500;
  }

  /* What the slice is worth: label over value, as many facts as fit on the line. */
  :where(dl.dpk-timeline-facts) {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 32px;
    margin: 2px 0 0;
  }

  :where(dl.dpk-timeline-facts) > :where(div) {
    min-width: 0;
  }

  :where(dl.dpk-timeline-facts) :where(dt) {
    margin-bottom: 3px;
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  :where(dl.dpk-timeline-facts) :where(dd) {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--dpk-ink-faint);
    font-size: 12px;
  }

  :where(dl.dpk-timeline-facts) :where(strong) {
    color: var(--dpk-ink);
    font-size: 15px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  /* Narrow: the date moves above the name and the rail takes the left column. */
  @media (max-width: 640px) {
    :where(ol.dpk-timeline) {
      --dpk-timeline-node: 24px;
    }

    :where(.dpk-timeline-entry) {
      grid-template-columns: var(--dpk-timeline-node) minmax(0, 1fr);
      grid-template-areas:
        'rail when'
        'rail body';
      column-gap: 14px;
    }

    :where(.dpk-timeline-when) {
      justify-content: flex-start;
      padding-top: 0;
    }

    :where(.dpk-timeline-date) {
      text-align: left;
    }
  }

  :where(progress.dpk-progress, meter.dpk-progress) {
    width: 100%;
    height: 6px;
    border: none;
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    overflow: hidden;
    appearance: none;
  }

  :where(progress.dpk-progress)::-webkit-progress-bar {
    background: var(--dpk-paper-inset);
  }

  :where(progress.dpk-progress)::-webkit-progress-value {
    border-radius: 999px;
    background: var(--tone, var(--dpk-blue));
  }

  :where(progress.dpk-progress)::-moz-progress-bar {
    border-radius: 999px;
    background: var(--tone, var(--dpk-blue));
  }

  :where(.dpk-meter) {
    display: block;
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    overflow: hidden;
  }

  :where(.dpk-meter)::before {
    content: '';
    display: block;
    width: clamp(0%, calc(var(--dpk-value, 0) * 1%), 100%);
    height: 100%;
    border-radius: inherit;
    background: var(--tone, var(--dpk-blue));
    transform-origin: left center;
    transition: width var(--dpk-dur-slow) var(--dpk-ease);
  }

  /*
   * The fill grows in from its start edge the first time the bar is drawn, and
   * a bar with no value yet ('data-loading') says so with the one continuous
   * animation in the kit: a shimmer sweeping across the fill. Both are
   * transform/opacity only — a progress bar never nudges its own row.
   */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-meter)::before {
      animation: dpk-grow-in var(--dpk-dur-slow) var(--dpk-ease-out);
    }

    :where(.dpk-meter[data-loading])::before {
      width: 100%;
      background-image: linear-gradient(
        90deg,
        transparent 0%,
        color-mix(in srgb, var(--dpk-paper-raised) 65%, transparent) 50%,
        transparent 100%
      );
      background-size: 50% 100%;
      background-repeat: no-repeat;
      animation: dpk-shimmer 1.4s var(--dpk-ease) infinite;
    }
  }

  /*
   * A status mark: a 16px slot for a status's own SVG (data-size 'sm' or 'lg'
   * resizes it), and with data-progress a ring around it, swept from the tone
   * to --dpk-progress (0-100) and masked to a hairline, so one small mark says
   * both which status a thing is in and how far through it is.
   */
  :where(.dpk-status-mark) {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 16px;
    height: 16px;
    color: var(--tone, var(--dpk-ink-faint));
  }

  :where(.dpk-status-mark) > :where(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  :where(.dpk-status-mark[data-size='sm']) {
    width: 12px;
    height: 12px;
  }

  :where(.dpk-status-mark[data-size='lg']) {
    width: 22px;
    height: 22px;
  }

  /* The ring sits outside the slot, so it never squeezes the mark it measures. */
  :where(.dpk-status-mark[data-progress]) {
    position: relative;
  }

  :where(.dpk-status-mark[data-progress])::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: conic-gradient(
      var(--tone, var(--dpk-blue)) calc(var(--dpk-progress, 0) * 1%),
      color-mix(in srgb, var(--dpk-ink-faint) 25%, transparent) 0
    );
    mask: radial-gradient(closest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px));
    -webkit-mask: radial-gradient(closest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px));
  }

  /*
   * A segmented status bar: the statuses a thing has passed through, one 6px
   * bar of them. Each segment grows by --dpk-value, an empty one stays faint,
   * and data-size 'lg' thickens the whole bar where it is the point of a view.
   */
  :where(.dpk-status-segments) {
    display: flex;
    gap: 2px;
    height: 6px;
    min-width: 0;
  }

  :where(.dpk-status-segments[data-size='lg']) {
    height: 8px;
  }

  :where(.dpk-status-segment) {
    flex-grow: var(--dpk-value, 1);
    flex-basis: 0;
    min-width: 4px;
    border-radius: 3px;
    background: var(--tone, var(--dpk-blue));
    transition: flex-grow var(--dpk-dur-slow) var(--dpk-ease);
  }

  :where(.dpk-status-segment[data-empty]) {
    background: color-mix(in srgb, var(--dpk-ink-faint) 30%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    :where(.dpk-status-segment) {
      transition: none;
    }
  }

  /*
   * The weight bar: how a whole is shared out between named parts, as one bar
   * of them with a scale under it. CSS only and no dragging: a part grows by
   * --dpk-value, and a scale's ticks stand at --dpk-at, a percentage of the
   * track's own width.
   */
  :where(.dpk-weight-bar) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 10px;
    row-gap: 4px;
    align-items: center;
    min-width: 0;
  }

  :where(.dpk-weight-track) {
    grid-area: 1 / 1;
    display: flex;
    gap: 2px;
    height: 32px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
    overflow: hidden;
  }

  :where(.dpk-weight-part) {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-grow: var(--dpk-value, 1);
    flex-basis: 0;
    min-width: 0;
    padding: 0 9px;
    overflow: hidden;
    background: color-mix(in oklab, var(--tone, var(--dpk-blue)) 16%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    transition: flex-grow var(--dpk-dur) var(--dpk-ease);
  }

  :where(.dpk-weight-name) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :where(.dpk-weight-value) {
    flex: none;
    color: var(--tone, var(--dpk-blue));
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }

  /* What the bar is out of: the whole at its end, outside the track. */
  :where(.dpk-weight-end) {
    grid-area: 1 / 2;
    align-self: center;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }

  :where(.dpk-weight-scale) {
    grid-area: 2 / 1;
    position: relative;
    height: 14px;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }

  /* A tick with its value under it, standing where --dpk-at puts it. */
  :where(.dpk-weight-tick) {
    position: absolute;
    top: 0;
    left: calc(var(--dpk-at, 0) * 1%);
    padding-top: 5px;
    transform: translateX(-50%);
    white-space: nowrap;
  }

  :where(.dpk-weight-tick)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 1px;
    height: 3px;
    background: var(--dpk-rule-strong);
  }

  @media (prefers-reduced-motion: reduce) {
    :where(.dpk-weight-part) {
      transition: none;
    }
  }

  ${chartAtom}

  ${mockAtom}

  /* ------------------------------------------------------------ disclosure */

  :where(details.dpk-disclosure) {
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
  }

  :where(details.dpk-disclosure + details.dpk-disclosure) {
    margin-top: 8px;
  }

  :where(details.dpk-disclosure) > :where(summary) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    color: var(--dpk-ink);
    font-weight: 600;
    list-style: none;
    cursor: pointer;
  }

  :where(details.dpk-disclosure) > :where(summary)::-webkit-details-marker {
    display: none;
  }

  :where(details.dpk-disclosure) > :where(summary)::before {
    content: '';
    width: 7px;
    height: 7px;
    border-right: 1.5px solid var(--dpk-ink-faint);
    border-bottom: 1.5px solid var(--dpk-ink-faint);
    transform: rotate(-45deg);
    transition: transform var(--dpk-dur) var(--dpk-ease);
  }

  :where(details.dpk-disclosure[open]) > :where(summary)::before {
    transform: rotate(45deg);
  }

  :where(details.dpk-disclosure) > :where(summary):focus-visible {
    outline: none;
    border-radius: var(--dpk-radius);
    box-shadow: var(--dpk-focus);
  }

  :where(details.dpk-disclosure) > :where(:not(summary)) {
    margin: 0;
    padding: 0 14px 12px 29px;
    color: var(--dpk-ink-soft);
  }
`;
