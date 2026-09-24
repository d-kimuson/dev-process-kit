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
      background: var(--dpk-paper-raised);
    }

    header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-glass);
      backdrop-filter: blur(12px);
      box-shadow: 0 1px 0 var(--dpk-highlight) inset;
    }

    header h2 {
      font-size: 13.5px;
      font-weight: 660;
      letter-spacing: -0.015em;
    }

    .composer {
      display: grid;
      gap: 10px;
      padding: 14px 16px 14px;
      border-bottom: 1px solid var(--dpk-rule);
      background: var(--dpk-paper-sunken);
      box-shadow: inset 0 1px 3px var(--dpk-shade-1);
    }

    .composer textarea {
      min-height: 62px;
      background: var(--dpk-paper-raised);
      border-radius: var(--dpk-radius);
      box-shadow:
        var(--dpk-bevel),
        inset 0 1px 2px var(--dpk-shade-1);
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
      color: var(--dpk-ink-soft);
      cursor: pointer;
      transition: color 140ms var(--dpk-ease);
    }

    .composer .attach:hover {
      color: var(--dpk-ink);
    }

    .composer .attach input {
      width: 14px;
      height: 14px;
      margin: 0;
      accent-color: var(--dpk-accent);
      cursor: pointer;
    }

    .composer .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border: 1px solid var(--dpk-rule-strong);
      border-radius: 999px;
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-shadow-xs);
      font-size: 11.5px;
      cursor: pointer;
      transition:
        border-color 140ms var(--dpk-ease),
        box-shadow 140ms var(--dpk-ease),
        transform 140ms var(--dpk-ease);
    }

    .composer .chip svg {
      flex: none;
      width: 12px;
      height: 12px;
    }

    .composer .chip:hover {
      border-color: color-mix(in srgb, var(--dpk-accent) 45%, var(--dpk-rule-strong));
      box-shadow: var(--dpk-shadow-sm);
      transform: translateY(-1px);
    }

    .target-line {
      margin-right: auto;
      padding: 3px 9px;
      border-radius: 999px;
      background: var(--dpk-paper-inset);
      font-family: var(--dpk-mono);
      font-size: 10px;
      letter-spacing: 0.03em;
      color: var(--dpk-ink-faint);
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
      gap: 5px;
      padding: 10px 12px 11px 16px;
      border: 1px solid var(--dpk-rule);
      border-radius: var(--dpk-radius);
      background: var(--dpk-paper-raised);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
      transition:
        box-shadow 160ms var(--dpk-ease),
        border-color 160ms var(--dpk-ease),
        transform 160ms var(--dpk-ease);
      animation: dpk-item-in 200ms var(--dpk-ease) backwards;
    }

    @keyframes dpk-item-in {
      from {
        opacity: 0;
        transform: translateY(3px);
      }
    }

    .item:hover {
      border-color: var(--dpk-rule-hover);
      box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
      transform: translateY(-1px);
    }

    .item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 0 2px 2px 0;
      background: var(--tone, var(--dpk-ink-faint));
    }

    .item[data-tone='comment'] {
      --tone: var(--dpk-accent);
      background: linear-gradient(90deg, var(--dpk-accent-soft), transparent 55%), var(--dpk-paper-raised);
    }

    .item[data-tone='create'] {
      --tone: var(--dpk-green);
    }

    .item[data-tone='update'] {
      --tone: var(--dpk-blue);
    }

    .item[data-tone='delete'] {
      --tone: var(--dpk-accent);
    }

    .item[data-tone='move'] {
      --tone: var(--dpk-violet);
    }

    .item[data-stale='true'] {
      opacity: 0.62;
      border-style: dashed;
      box-shadow: none;
      transform: none;
    }

    .item-head {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .item-icon {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: var(--dpk-radius-xs);
      background: color-mix(in srgb, var(--tone, var(--dpk-ink-faint)) 16%, transparent);
      color: var(--tone, var(--dpk-ink-faint));
    }

    .item-icon svg {
      display: block;
      width: 11px;
      height: 11px;
    }

    .item-title {
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: -0.005em;
    }

    .stale-badge {
      padding: 1px 7px;
      border: 1px solid color-mix(in srgb, var(--dpk-amber) 40%, transparent);
      border-radius: 999px;
      background: var(--dpk-amber-soft);
      font-family: var(--dpk-mono);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--dpk-amber);
    }

    .item-head .dpk-icon-btn {
      margin-left: auto;
    }

    .item-target {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 1px 7px;
      border-radius: var(--dpk-radius-xs);
      background: var(--dpk-paper-sunken);
      font-family: var(--dpk-mono);
      font-size: 10px;
      color: var(--dpk-ink-faint);
      overflow-wrap: anywhere;
    }

    .item-summary {
      font-size: 12px;
      color: var(--dpk-ink-soft);
    }

    .item-body {
      margin: 2px 0 0;
      padding-left: 9px;
      border-left: 2px solid var(--dpk-accent);
      font-size: 12.5px;
      white-space: pre-wrap;
    }

    .item-code {
      margin-top: 2px;
      padding: 5px 7px;
      border-radius: var(--dpk-radius-xs);
      background: var(--dpk-paper-sunken);
      font-family: var(--dpk-mono);
      font-size: 10px;
      color: var(--dpk-ink-faint);
      overflow-wrap: anywhere;
    }

    .empty {
      padding: 4px;
    }

    .empty-box {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 26px 16px;
      border: 1px dashed var(--dpk-rule-strong);
      border-radius: var(--dpk-radius-lg);
      background: var(--dpk-paper-sunken);
      text-align: center;
    }

    .empty-box svg {
      width: 20px;
      height: 20px;
      color: var(--dpk-ink-faint);
      opacity: 0.7;
    }

    .empty-box p {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: var(--dpk-ink-soft);
    }

    .empty-box .empty-hint {
      max-width: 30ch;
      color: var(--dpk-ink-faint);
    }

    .issues {
      margin: 10px 12px 0;
      padding: 9px 11px 9px 13px;
      border: 1px solid color-mix(in srgb, var(--dpk-danger) 35%, transparent);
      border-radius: var(--dpk-radius-sm);
      background: linear-gradient(90deg, var(--dpk-danger) 0 3px, transparent 3px), var(--dpk-danger-soft);
      font-size: 11.5px;
    }

    .issues strong {
      color: var(--dpk-danger);
    }

    .issues ul {
      margin: 4px 0 0;
      padding-left: 16px;
      color: var(--dpk-ink-soft);
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--dpk-rule);
      background: var(--dpk-glass);
      backdrop-filter: blur(12px);
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-left: auto;
    }

    .flash {
      font-family: var(--dpk-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--dpk-green);
    }
  `,
];
