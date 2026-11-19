import { css } from 'lit';

import { controls, popoverSurface, tokens } from '../../core/theme';

/**
 * Diff styling: one card per file, a table of lines below its header.
 * Additions and deletions tint their whole row (green, red) and the changed
 * words of a replaced line a shade deeper; the gutter's line actions appear
 * on hover and focus, so the code stays quiet while reading.
 */
export const diffStyles = [
  tokens,
  controls,
  popoverSurface,
  css`
    :host {
      display: block;
      color: var(--dpk-ink);
      font-family: var(--dpk-body);
      --diff-add: color-mix(in srgb, var(--dpk-green) 11%, transparent);
      --diff-add-strong: color-mix(in srgb, var(--dpk-green) 28%, transparent);
      --diff-add-num: color-mix(in srgb, var(--dpk-green) 18%, transparent);
      --diff-del: color-mix(in srgb, var(--dpk-danger) 10%, transparent);
      --diff-del-strong: color-mix(in srgb, var(--dpk-danger) 26%, transparent);
      --diff-del-num: color-mix(in srgb, var(--dpk-danger) 16%, transparent);
    }

    .diff {
      display: grid;
      gap: 12px;
    }

    /* ----------------------------------------------------------- toolbar */

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 12px;
      padding: 0 2px 10px;
      border-bottom: 1px solid var(--dpk-rule);
    }

    .title {
      font-family: var(--dpk-display);
      font-size: 14px;
      font-weight: 650;
    }

    .summary {
      display: inline-flex;
      gap: 6px;
      color: var(--dpk-ink-soft);
      font-size: 12.5px;
    }

    .stat-add {
      color: var(--dpk-green);
      font-weight: 600;
    }

    .stat-del {
      color: var(--dpk-danger);
      font-weight: 600;
    }

    .views {
      display: inline-flex;
      margin-left: auto;
      padding: 2px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-sunken);
    }

    .views button {
      padding: 2px 10px;
      border: 0;
      border-radius: var(--dpk-radius-xs);
      background: transparent;
      color: var(--dpk-ink-soft);
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .views button[aria-pressed='true'] {
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink);
      font-weight: 600;
      box-shadow: var(--dpk-shadow-xs);
    }

    .views button:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .notice,
    .empty {
      margin: 0;
      padding: 14px;
      border-radius: var(--dpk-radius);
      font-size: 12.5px;
    }

    .notice {
      background: var(--dpk-danger-soft);
      color: var(--dpk-danger);
    }

    .empty {
      color: var(--dpk-ink-faint);
    }

    /* -------------------------------------------------------------- file */

    .file {
      overflow: hidden;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper-raised);
    }

    .file-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background: var(--dpk-paper-sunken);
      font-size: 12.5px;
    }

    .file:has(.scroll, .file-note, .file-thread) .file-head {
      border-bottom: 1px solid var(--dpk-rule);
    }

    .toggle svg {
      transition: transform var(--dpk-dur-fast) var(--dpk-ease);
    }

    .toggle[aria-expanded='true'] svg {
      transform: rotate(90deg);
    }

    .status {
      flex: none;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--dpk-paper-inset);
      color: var(--dpk-ink-soft);
      font-size: 11px;
      font-weight: 600;
    }

    .status[data-status='added'] {
      background: var(--dpk-green-soft);
      color: var(--dpk-green);
    }

    .status[data-status='deleted'] {
      background: var(--dpk-danger-soft);
      color: var(--dpk-danger);
    }

    .status[data-status='renamed'],
    .status[data-status='copied'] {
      background: var(--dpk-blue-soft);
      color: var(--dpk-blue);
    }

    .path {
      min-width: 0;
      font-family: var(--dpk-mono);
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .old-path {
      color: var(--dpk-ink-faint);
      font-weight: 400;
    }

    .file-stat {
      margin-left: auto;
      font-size: 12px;
      white-space: nowrap;
    }

    .file-note {
      margin: 0;
      padding: 12px 14px;
      color: var(--dpk-ink-faint);
      font-size: 12.5px;
    }

    /* ------------------------------------------------------------- lines */

    .scroll {
      overflow-x: auto;
    }

    .lines {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-family: var(--dpk-mono);
      font-size: 12.5px;
      line-height: 1.55;
      tab-size: 4;
    }

    .col-num {
      width: 4.5ch;
    }

    .col-act {
      width: 26px;
    }

    .lines td {
      padding: 0;
      vertical-align: top;
    }

    .num {
      padding: 0 6px !important;
      color: var(--dpk-ink-faint);
      text-align: right;
      user-select: none;
      font-variant-numeric: tabular-nums;
    }

    .code {
      padding: 0 12px 0 0 !important;
    }

    /* Only the line's own text keeps its spaces; the markup around it may be wrapped freely. */
    .code .text,
    .suggestion-line .text {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .comment {
      color: var(--dpk-code-comment, var(--dpk-ink-faint));
      font-style: italic;
    }

    .string {
      color: var(--dpk-code-string, var(--dpk-green));
    }

    .number {
      color: var(--dpk-code-number, var(--dpk-amber));
    }

    .keyword {
      color: var(--dpk-code-keyword, var(--dpk-violet));
    }

    .function {
      color: var(--dpk-code-function, var(--dpk-blue));
    }

    .tag {
      color: var(--dpk-code-tag, var(--dpk-accent-strong));
    }

    .attr {
      color: var(--dpk-code-attr, var(--dpk-blue));
    }

    .property {
      color: var(--dpk-code-property, var(--dpk-blue));
    }

    .punct {
      color: var(--dpk-code-punct, var(--dpk-ink-soft));
    }

    .sign {
      display: inline-block;
      width: 2ch;
      color: var(--dpk-ink-faint);
      text-align: center;
      user-select: none;
    }

    .line[data-kind='add'] td,
    .lines td[data-kind='add'] {
      background: var(--diff-add);
    }

    .line[data-kind='add'] .num,
    .lines .num[data-kind='add'],
    .lines .act[data-kind='add'] {
      background: var(--diff-add-num);
    }

    .line[data-kind='del'] td,
    .lines td[data-kind='del'] {
      background: var(--diff-del);
    }

    .line[data-kind='del'] .num,
    .lines .num[data-kind='del'],
    .lines .act[data-kind='del'] {
      background: var(--diff-del-num);
    }

    td[data-kind='add'] .sign,
    .line[data-kind='add'] .sign {
      color: var(--dpk-green);
    }

    td[data-kind='del'] .sign,
    .line[data-kind='del'] .sign {
      color: var(--dpk-danger);
    }

    td[data-kind='add'] [data-changed] {
      border-radius: 2px;
      background: var(--diff-add-strong);
    }

    td[data-kind='del'] [data-changed] {
      border-radius: 2px;
      background: var(--diff-del-strong);
    }

    td[data-blank] {
      background: var(--dpk-paper-sunken);
    }

    .no-newline {
      margin-left: 4px;
      color: var(--dpk-danger);
      user-select: none;
    }

    .hunk td {
      padding: 3px 12px;
      background: var(--dpk-blue-soft);
      color: var(--dpk-ink-soft);
      font-size: 12px;
    }

    .hunk-section {
      color: var(--dpk-ink-faint);
    }

    /* Comments and suggestions on a line, shown while the row is pointed at or focused. */
    .act {
      white-space: nowrap;
    }

    .line-actions {
      display: inline-flex;
      opacity: 0;
      transition: opacity var(--dpk-dur-fast) var(--dpk-ease);
    }

    tr:hover .line-actions,
    .line-actions:focus-within,
    .line-actions[data-open] {
      opacity: 1;
    }

    @media (hover: none) {
      .line-actions {
        opacity: 1;
      }
    }

    .line-btn {
      display: inline-grid;
      place-items: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: 0;
      border-radius: var(--dpk-radius-xs);
      background: transparent;
      color: var(--dpk-blue);
      cursor: pointer;
    }

    .line-btn:hover {
      background: var(--dpk-blue-soft);
    }

    .line-btn:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .line-btn svg {
      width: 13px;
      height: 13px;
    }

    /* ------------------------------------------------------- suggestions */

    .extra td {
      padding: 6px 12px 8px;
      border-block: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
      font-family: var(--dpk-body);
    }

    .suggestion,
    .composer {
      display: grid;
      gap: 6px;
      max-width: 760px;
    }

    .suggestion {
      overflow: hidden;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-raised);
      gap: 0;
    }

    .suggestion-head {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 4px 10px;
      border-bottom: 1px solid var(--dpk-rule);
      color: var(--dpk-ink-soft);
      font-size: 12px;
      font-weight: 600;
    }

    .suggestion-head svg {
      width: 13px;
      height: 13px;
    }

    .suggestion-line {
      padding: 0 10px 0 0;
      font-family: var(--dpk-mono);
      font-size: 12.5px;
      line-height: 1.55;
    }

    .suggestion-line[data-kind='add'] {
      background: var(--diff-add);
    }

    .suggestion-line[data-kind='del'] {
      background: var(--diff-del);
    }

    .suggestion-line[data-kind='add'] .sign {
      color: var(--dpk-green);
    }

    .suggestion-line[data-kind='del'] .sign {
      color: var(--dpk-danger);
    }

    .composer-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
    }

    .composer-tabs {
      display: inline-flex;
      padding: 2px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-inset);
    }

    .composer-tabs button {
      padding: 2px 10px;
      border: 0;
      border-radius: var(--dpk-radius-xs);
      background: transparent;
      color: var(--dpk-ink-soft);
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .composer-tabs button[aria-selected='true'] {
      background: var(--dpk-paper-raised);
      color: var(--dpk-ink);
      font-weight: 600;
      box-shadow: var(--dpk-shadow-xs);
    }

    .composer-tabs button:focus-visible {
      outline: none;
      box-shadow: var(--dpk-focus);
    }

    .composer-title {
      font-size: 12px;
    }

    .composer-target {
      min-width: 0;
      color: var(--dpk-ink-faint);
      font-family: var(--dpk-mono);
      font-size: 11.5px;
      overflow-wrap: anywhere;
    }

    .composer[data-tab='suggest'] textarea {
      font-family: var(--dpk-mono);
      font-size: 12.5px;
    }

    .composer-error {
      margin: 0;
      color: var(--dpk-danger);
      font-size: 12px;
    }

    .composer-actions {
      display: flex;
      gap: 6px;
    }

    /* ----------------------------------------------------------- threads */

    .file-thread {
      padding: 8px 12px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
    }

    .thread {
      display: grid;
      max-width: 760px;
      overflow: hidden;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-sm);
      background: var(--dpk-paper-raised);
    }

    .thread-items {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .thread-item {
      padding: 8px 12px;
    }

    .thread-item + .thread-item {
      border-top: 1px solid var(--dpk-rule);
    }

    .thread-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 2px;
      color: var(--dpk-ink-faint);
      font-size: 11.5px;
    }

    .thread-meta svg {
      width: 12px;
      height: 12px;
    }

    .thread-body {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .thread-reply {
      margin: 0;
      padding: 8px 12px;
      border: 0;
      border-top: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
      color: var(--dpk-ink-faint);
      font: inherit;
      font-size: 12.5px;
      text-align: left;
      cursor: text;
    }

    .thread-reply:hover {
      color: var(--dpk-ink-soft);
    }

    .thread-reply:focus-visible {
      outline: none;
      box-shadow: inset var(--dpk-focus);
    }

    .thread-compose {
      display: grid;
      gap: 6px;
      padding: 8px 12px;
      border-top: 1px solid var(--dpk-rule);
    }
  `,
];
