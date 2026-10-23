import { css } from 'lit';

import { iconButtonCss, themeScope } from '../../core/theme';
import { cardAtom } from './card';
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
 */
export const atomStyles = css`
  /* ------------------------------------------------------------ theme scope */

  ${themeScope}

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
    pointer-events: none;
    transition: opacity 140ms var(--dpk-ease);
  }

  :where(.dpk-hover-host):is(:hover, :focus-within) :where(.dpk-hover-tools) {
    opacity: 1;
    pointer-events: auto;
  }

  @media (hover: none) {
    :where(.dpk-hover-tools) {
      opacity: 1;
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
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease),
      box-shadow 140ms var(--dpk-ease);
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

  :where(.dpk-list-row) {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 8px 10px;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink);
    transition: background 140ms var(--dpk-ease);
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
    line-height: 1.75;
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
    margin: 36px 0 10px;
    font-size: 16px;
  }

  :where(.dpk-prose) :where(h3) {
    margin: 22px 0 6px;
    font-size: 13.5px;
  }

  :where(.dpk-prose) :where(p, ul, ol, blockquote, pre, table) {
    margin: 0 0 10px;
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
      background 160ms var(--dpk-ease),
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 120ms var(--dpk-ease);
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
    transition: width 240ms var(--dpk-ease);
  }

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
    transition: transform 160ms var(--dpk-ease);
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
