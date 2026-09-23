import { css } from 'lit';

/**
 * Shared design tokens. They are declared on `:host`, so they inherit into the
 * light DOM as well — user CSS can theme artifacts with `var(--af-*)`.
 */
export const tokens = css`
  :host {
    /* Neutral, white-based surface scale. */
    --af-paper: #fafbfc;
    --af-paper-raised: #ffffff;
    --af-paper-sunken: #f3f5f8;
    --af-paper-inset: #eceef2;
    --af-ink: #1a1d24;
    --af-ink-soft: #4d5566;
    --af-ink-faint: #7c8599;
    --af-rule: rgba(20, 28, 44, 0.08);
    --af-rule-strong: rgba(20, 28, 44, 0.14);
    --af-accent: #d94920;
    --af-accent-soft: rgba(217, 73, 32, 0.07);
    --af-accent-ink: #ffffff;
    --af-blue: #3366cc;
    --af-blue-soft: rgba(51, 102, 204, 0.08);
    --af-green: #1a8a4a;
    --af-green-soft: rgba(26, 138, 74, 0.08);
    --af-amber: #b47a0a;
    --af-amber-soft: rgba(180, 122, 10, 0.09);
    --af-violet: #7c4dcc;
    --af-violet-soft: rgba(124, 77, 204, 0.08);
    --af-display: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --af-body: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --af-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;

    /* Shape + elevation scale, so every surface reads as one system. */
    --af-radius-xs: 5px;
    --af-radius-sm: 7px;
    --af-radius: 8px;
    --af-radius-lg: 12px;
    --af-shadow-xs: 0 1px 2px rgba(20, 28, 44, 0.05), 0 1px 1px rgba(20, 28, 44, 0.03);
    --af-shadow-sm: 0 1px 2px rgba(20, 28, 44, 0.06), 0 2px 8px -2px rgba(20, 28, 44, 0.12);
    --af-shadow: 0 1px 3px rgba(20, 28, 44, 0.06), 0 8px 24px -8px rgba(20, 28, 44, 0.18);
    --af-shadow-lg: 0 2px 6px rgba(20, 28, 44, 0.06), 0 16px 40px -12px rgba(20, 28, 44, 0.22);
    --af-focus: 0 0 0 3px rgba(51, 102, 204, 0.25);
    --af-control-h: 32px;

    color: var(--af-ink);
    font-family: var(--af-body);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    display: block;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  h1,
  h2,
  h3,
  h4 {
    font-family: var(--af-display);
    font-weight: 650;
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  button {
    font: inherit;
    color: inherit;
  }

  ::selection {
    background: rgba(47, 90, 168, 0.18);
  }

  .af-mono,
  .af-num {
    font-variant-numeric: tabular-nums;
  }

  .af-label {
    font-family: var(--af-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--af-ink-faint);
  }
`;

export const controls = css`
  .af-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-size: 12.5px;
    font-weight: 520;
    line-height: 1;
    white-space: nowrap;
    box-shadow: var(--af-shadow-xs);
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease,
      transform 80ms ease;
  }

  .af-btn:hover:not([disabled]) {
    background: var(--af-paper-sunken);
    border-color: rgba(20, 28, 44, 0.22);
    box-shadow: var(--af-shadow-sm);
  }

  .af-btn:active:not([disabled]) {
    transform: translateY(1px);
    box-shadow: none;
  }

  .af-btn:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .af-btn[disabled] {
    opacity: 0.45;
    box-shadow: none;
    cursor: not-allowed;
  }

  .af-btn--accent {
    border-color: transparent;
    background: linear-gradient(180deg, var(--af-accent), #c23e12);
    color: var(--af-accent-ink);
    box-shadow:
      0 1px 2px rgba(217, 73, 32, 0.25),
      0 0 0 1px rgba(217, 73, 32, 0.15);
  }

  .af-btn--accent:hover:not([disabled]) {
    background: linear-gradient(180deg, #e0521f, #b83710);
    border-color: transparent;
    box-shadow:
      0 2px 6px rgba(217, 73, 32, 0.3),
      0 0 0 1px rgba(217, 73, 32, 0.2);
  }

  /* Selection state, shared by every template's filter/nav controls. */
  .af-btn--selected {
    border-color: transparent;
    background: linear-gradient(180deg, var(--af-blue), #2952a3);
    color: #fff;
    box-shadow: 0 1px 3px rgba(51, 102, 204, 0.3);
  }

  .af-btn--selected:hover:not([disabled]) {
    background: linear-gradient(180deg, #2952a3, #213f80);
    border-color: transparent;
    box-shadow: 0 2px 6px rgba(51, 102, 204, 0.35);
  }

  .af-btn--ghost {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    color: var(--af-ink-soft);
  }

  .af-btn--ghost:hover:not([disabled]) {
    background: var(--af-paper-inset);
    border-color: transparent;
    color: var(--af-ink);
  }

  .af-icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--af-radius-xs);
    background: transparent;
    color: var(--af-ink-faint);
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    transition:
      background 140ms ease,
      color 140ms ease,
      transform 100ms ease;
  }

  .af-icon-btn:hover:not([disabled]) {
    background: var(--af-paper-inset);
    color: var(--af-ink);
    transform: scale(1.08);
  }

  .af-icon-btn:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  .af-icon-btn[disabled] {
    opacity: 0.35;
    cursor: default;
  }

  .af-icon-btn[data-active='true'] {
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .af-icon-btn svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Count badge for an icon-only control (comments on a card, drafts on the rail). */
  .af-icon-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border: 1.5px solid var(--af-paper-raised);
    border-radius: 999px;
    background: var(--af-accent);
    color: var(--af-accent-ink);
    font-family: var(--af-mono);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    line-height: 12px;
    text-align: center;
  }

  .af-input,
  .af-textarea,
  .af-select {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--af-control-h);
    padding: 5px 9px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font: inherit;
    font-size: 12.5px;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .af-input:hover,
  .af-textarea:hover,
  .af-select:hover {
    border-color: rgba(20, 22, 26, 0.24);
  }

  .af-input:focus,
  .af-textarea:focus,
  .af-select:focus {
    outline: none;
    border-color: var(--af-blue);
    box-shadow: var(--af-focus);
  }

  .af-select {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 7px center;
    padding-right: 26px;
    cursor: pointer;
  }

  .af-textarea {
    resize: vertical;
    min-height: 64px;
    line-height: 1.55;
  }
`;

/** Floating surface (`popover="manual"`) shared by card composers and pickers. */
export const popoverSurface = css`
  .comment-pop {
    box-sizing: border-box;
    overflow: auto;
    position: fixed;
    inset: auto;
    margin: 0;
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--af-rule);
    border-radius: var(--af-radius-lg);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-lg);
    color: var(--af-ink);
    font-size: 12.5px;
  }

  .comment-pop .comment-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
    max-height: 140px;
    overflow: auto;
    font-size: 12px;
    color: var(--af-ink-soft);
  }

  .comment-pop .comment-list li {
    padding-left: 8px;
    border-left: 2px solid var(--af-accent);
  }

  .comment-pop .af-textarea {
    min-height: 54px;
  }

  .pop-actions {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
  }
`;
