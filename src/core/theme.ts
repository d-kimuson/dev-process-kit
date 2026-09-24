import { css, unsafeCSS } from 'lit';

/**
 * The palette as `[light, dark]` pairs. A template sets `color-scheme` on its
 * host from the resolved theme, and `light-dark()` picks the matching value
 * wherever a token is used — in the chrome, in nested components and in the
 * author's light DOM alike. A standalone component follows the page's own
 * `color-scheme`.
 */
const palette = {
  paper: ['#fafbfc', '#15171c'],
  'paper-raised': ['#ffffff', '#1d2027'],
  'paper-sunken': ['#f3f5f8', '#111317'],
  'paper-inset': ['#eceef2', '#272b34'],
  ink: ['#1a1d24', '#e6e9ef'],
  'ink-soft': ['#4d5566', '#aeb5c2'],
  'ink-faint': ['#7c8599', '#7f8798'],
  rule: ['rgba(20, 28, 44, 0.08)', 'rgba(222, 230, 245, 0.09)'],
  'rule-strong': ['rgba(20, 28, 44, 0.14)', 'rgba(222, 230, 245, 0.16)'],
  'rule-hover': ['rgba(20, 28, 44, 0.22)', 'rgba(222, 230, 245, 0.26)'],
  accent: ['#d94920', '#ee6a40'],
  'accent-strong': ['#c23e12', '#d4532a'],
  'accent-bright': ['#e55a2b', '#f47d55'],
  'accent-soft': ['rgba(217, 73, 32, 0.07)', 'rgba(238, 106, 64, 0.15)'],
  'accent-ink': ['#ffffff', '#ffffff'],
  blue: ['#3366cc', '#6f9bf0'],
  'blue-strong': ['#2952a3', '#4f7fdc'],
  'blue-soft': ['rgba(51, 102, 204, 0.08)', 'rgba(111, 155, 240, 0.15)'],
  green: ['#1a8a4a', '#43c07a'],
  'green-soft': ['rgba(26, 138, 74, 0.08)', 'rgba(67, 192, 122, 0.14)'],
  amber: ['#b47a0a', '#e2a73c'],
  'amber-soft': ['rgba(180, 122, 10, 0.09)', 'rgba(226, 167, 60, 0.15)'],
  violet: ['#7c4dcc', '#a88af0'],
  'violet-soft': ['rgba(124, 77, 204, 0.08)', 'rgba(168, 138, 240, 0.15)'],
  danger: ['#b81c33', '#f36b80'],
  'danger-soft': ['rgba(214, 53, 80, 0.08)', 'rgba(243, 107, 128, 0.14)'],
  /** Shadow tint: shadows mix it with transparency, so they stay visible on a dark ground. */
  shade: ['rgb(20, 28, 44)', 'rgb(0, 0, 0)'],
} as const satisfies Record<string, readonly [light: string, dark: string]>;

const declarations = (value: (light: string, dark: string) => string) =>
  unsafeCSS(
    Object.entries(palette)
      .map(([name, [light, dark]]) => `--dpk-${name}: ${value(light, dark)};`)
      .join('\n'),
  );

/**
 * Shared design tokens. They are declared on `:host`, so they inherit into the
 * light DOM as well — user CSS can theme pages with `var(--dpk-*)`.
 */
export const tokens = css`
  :host {
    /* Browsers without light-dark() stay light. */
    ${declarations((light) => light)}
    --dpk-display: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --dpk-body: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --dpk-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;

    /* Shape + elevation scale, so every surface reads as one system. */
    --dpk-radius-xs: 5px;
    --dpk-radius-sm: 7px;
    --dpk-radius: 8px;
    --dpk-radius-lg: 12px;
    --dpk-shadow-xs:
      0 1px 2px color-mix(in srgb, var(--dpk-shade) 5%, transparent),
      0 1px 1px color-mix(in srgb, var(--dpk-shade) 3%, transparent);
    --dpk-shadow-sm:
      0 1px 2px color-mix(in srgb, var(--dpk-shade) 6%, transparent),
      0 2px 8px -2px color-mix(in srgb, var(--dpk-shade) 12%, transparent);
    --dpk-shadow:
      0 1px 3px color-mix(in srgb, var(--dpk-shade) 6%, transparent),
      0 8px 24px -8px color-mix(in srgb, var(--dpk-shade) 18%, transparent);
    --dpk-shadow-lg:
      0 2px 6px color-mix(in srgb, var(--dpk-shade) 6%, transparent),
      0 16px 40px -12px color-mix(in srgb, var(--dpk-shade) 22%, transparent);
    --dpk-focus: 0 0 0 3px color-mix(in srgb, var(--dpk-blue) 28%, transparent);
    --dpk-control-h: 32px;

    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    display: block;
  }

  @supports (color: light-dark(#000, #fff)) {
    :host {
      ${declarations((light, dark) => `light-dark(${light}, ${dark})`)}
    }
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
    font-family: var(--dpk-display);
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

  .dpk-mono,
  .dpk-num {
    font-variant-numeric: tabular-nums;
  }

  .dpk-label {
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--dpk-ink-faint);
  }
`;

export const controls = css`
  .dpk-btn {
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
    font-size: 12.5px;
    font-weight: 520;
    line-height: 1;
    white-space: nowrap;
    box-shadow: var(--dpk-shadow-xs);
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease,
      transform 80ms ease;
  }

  .dpk-btn:hover:not([disabled]) {
    background: var(--dpk-paper-sunken);
    border-color: var(--dpk-rule-hover);
    box-shadow: var(--dpk-shadow-sm);
  }

  .dpk-btn:active:not([disabled]) {
    transform: translateY(1px);
    box-shadow: none;
  }

  .dpk-btn:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .dpk-btn[disabled] {
    opacity: 0.45;
    box-shadow: none;
    cursor: not-allowed;
  }

  .dpk-btn--accent {
    border-color: transparent;
    background: linear-gradient(180deg, var(--dpk-accent), var(--dpk-accent-strong));
    color: var(--dpk-accent-ink);
    box-shadow:
      0 1px 2px rgba(217, 73, 32, 0.25),
      0 0 0 1px rgba(217, 73, 32, 0.15);
  }

  .dpk-btn--accent:hover:not([disabled]) {
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
    border-color: transparent;
    box-shadow:
      0 2px 6px rgba(217, 73, 32, 0.3),
      0 0 0 1px rgba(217, 73, 32, 0.2);
  }

  /* Selection state, shared by every template's filter/nav controls. */
  .dpk-btn--selected {
    border-color: transparent;
    background: linear-gradient(180deg, var(--dpk-blue), var(--dpk-blue-strong));
    color: #fff;
    box-shadow: 0 1px 3px rgba(51, 102, 204, 0.3);
  }

  .dpk-btn--selected:hover:not([disabled]) {
    background: linear-gradient(180deg, var(--dpk-blue-strong), var(--dpk-blue-strong));
    border-color: transparent;
    box-shadow: 0 2px 6px rgba(51, 102, 204, 0.35);
  }

  .dpk-btn--ghost {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    color: var(--dpk-ink-soft);
  }

  .dpk-btn--ghost:hover:not([disabled]) {
    background: var(--dpk-paper-inset);
    border-color: transparent;
    color: var(--dpk-ink);
  }

  .dpk-icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    transition:
      background 140ms ease,
      color 140ms ease,
      transform 100ms ease;
  }

  .dpk-icon-btn:hover:not([disabled]) {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
    transform: scale(1.08);
  }

  .dpk-icon-btn:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .dpk-icon-btn[disabled] {
    opacity: 0.35;
    cursor: default;
  }

  .dpk-icon-btn[data-active='true'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .dpk-icon-btn svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  /* Count badge for an icon-only control (comments on a card, drafts on the rail). */
  .dpk-icon-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border: 1.5px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    line-height: 12px;
    text-align: center;
  }

  .dpk-input,
  .dpk-textarea,
  .dpk-select {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--dpk-control-h);
    padding: 5px 9px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .dpk-input:hover,
  .dpk-textarea:hover,
  .dpk-select:hover {
    border-color: var(--dpk-rule-hover);
  }

  .dpk-input:focus,
  .dpk-textarea:focus,
  .dpk-select:focus {
    outline: none;
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
  }

  .dpk-select {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%23878e9e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 7px center;
    padding-right: 26px;
    cursor: pointer;
  }

  .dpk-textarea {
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
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-lg);
    color: var(--dpk-ink);
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
    color: var(--dpk-ink-soft);
  }

  .comment-pop .comment-list li {
    padding-left: 8px;
    border-left: 2px solid var(--dpk-accent);
  }

  .comment-pop .dpk-textarea {
    min-height: 54px;
  }

  .pop-actions {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: flex-end;
  }
`;
