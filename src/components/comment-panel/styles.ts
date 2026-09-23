import { css } from 'lit';

import { controls, tokens } from '../../core/theme';

export const panelStyles = [
  tokens,
  controls,
  css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      background: var(--af-paper-raised);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-raised), var(--af-paper));
    }

    header h2 {
      font-size: 13.5px;
      font-weight: 620;
      letter-spacing: -0.01em;
    }

    .composer {
      display: grid;
      gap: 10px;
      padding: 14px 16px 14px;
      border-bottom: 1px solid var(--af-rule);
      background: var(--af-paper-sunken);
    }

    .composer textarea {
      min-height: 62px;
      background: var(--af-paper-raised);
      border-radius: var(--af-radius);
    }

    .composer .row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .composer .attach {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      color: var(--af-ink-soft);
      cursor: pointer;
    }

    .composer .attach input {
      width: 14px;
      height: 14px;
      margin: 0;
      accent-color: var(--af-accent);
      cursor: pointer;
    }

    .composer .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border: 1px solid var(--af-rule);
      border-radius: 999px;
      background: var(--af-paper-raised);
      font-size: 11.5px;
      cursor: pointer;
    }

    .composer .chip svg {
      flex: none;
      width: 12px;
      height: 12px;
    }

    .composer .chip:hover {
      border-color: var(--af-rule-strong);
    }

    .target-line {
      margin-right: auto;
      font-family: var(--af-mono);
      font-size: 10px;
      letter-spacing: 0.03em;
      color: var(--af-ink-faint);
    }

    .list {
      list-style: none;
      margin: 0;
      padding: 10px 12px;
      overflow: auto;
      flex: 1;
      min-height: 0;
      display: grid;
      gap: 8px;
      align-content: start;
    }

    .item {
      position: relative;
      display: grid;
      gap: 4px;
      padding: 10px 12px 11px 14px;
      border: 1px solid var(--af-rule);
      border-radius: var(--af-radius);
      background: var(--af-paper-raised);
      box-shadow: var(--af-shadow-xs);
      transition:
        box-shadow 160ms ease,
        border-color 160ms ease;
    }

    .item:hover {
      box-shadow: var(--af-shadow-sm);
    }

    .item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 0 2px 2px 0;
      background: var(--tone, var(--af-ink-faint));
    }

    .item[data-tone='comment'] {
      --tone: var(--af-accent);
      background: linear-gradient(90deg, var(--af-accent-soft), transparent 55%);
    }

    .item[data-tone='create'] {
      --tone: var(--af-green);
    }

    .item[data-tone='update'] {
      --tone: var(--af-blue);
    }

    .item[data-tone='delete'] {
      --tone: var(--af-accent);
    }

    .item[data-tone='move'] {
      --tone: var(--af-violet);
    }

    .item[data-stale='true'] {
      opacity: 0.5;
      border-style: dashed;
      box-shadow: none;
    }

    .item-head {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .item-title {
      font-size: 12.5px;
      font-weight: 600;
    }

    .stale-badge {
      padding: 1px 7px;
      border: 1px solid var(--af-rule-strong);
      border-radius: 999px;
      font-family: var(--af-mono);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--af-ink-faint);
    }

    .item-head .af-icon-btn {
      margin-left: auto;
    }

    .item-target {
      font-family: var(--af-mono);
      font-size: 10px;
      color: var(--af-ink-faint);
    }

    .item-summary {
      font-size: 12px;
      color: var(--af-ink-soft);
    }

    .item-body {
      margin: 2px 0 0;
      padding-left: 9px;
      border-left: 2px solid var(--af-accent);
      font-size: 12.5px;
      white-space: pre-wrap;
    }

    .item-code {
      margin-top: 2px;
      font-family: var(--af-mono);
      font-size: 10px;
      color: var(--af-ink-faint);
      overflow-wrap: anywhere;
    }

    .empty {
      padding: 6px 4px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--af-ink-faint);
    }

    .issues {
      margin: 10px 12px 0;
      padding: 9px 11px;
      border: 1px solid rgba(194, 64, 15, 0.35);
      border-radius: var(--af-radius-sm);
      background: var(--af-accent-soft);
      font-size: 11.5px;
    }

    .issues ul {
      margin: 4px 0 0;
      padding-left: 16px;
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--af-rule);
      background: linear-gradient(180deg, var(--af-paper-sunken), var(--af-paper-inset));
    }

    .flash {
      font-family: var(--af-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--af-green);
    }
  `,
];
