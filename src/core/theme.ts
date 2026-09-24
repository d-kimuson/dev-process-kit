import { css, unsafeCSS } from 'lit';

/**
 * The palette as `[light, dark]` pairs. A template sets `color-scheme` on its
 * host from the resolved theme, and `light-dark()` picks the matching value
 * wherever a token is used — in the chrome, in nested components and in the
 * author's light DOM alike. A standalone component follows the page's own
 * `color-scheme`.
 */
const palette = {
  paper: ['#f6f7f9', '#0e1014'],
  'paper-raised': ['#ffffff', '#171a20'],
  'paper-sunken': ['#eff1f4', '#0a0b0e'],
  'paper-inset': ['#e7eaef', '#22262e'],
  ink: ['#11141b', '#eceef3'],
  'ink-soft': ['#464e5f', '#a9b0bd'],
  'ink-faint': ['#788195', '#737b8b'],
  rule: ['rgba(17, 24, 39, 0.08)', 'rgba(226, 232, 244, 0.08)'],
  'rule-strong': ['rgba(17, 24, 39, 0.13)', 'rgba(226, 232, 244, 0.14)'],
  'rule-hover': ['rgba(17, 24, 39, 0.24)', 'rgba(226, 232, 244, 0.26)'],
  accent: ['#e04e1f', '#f26a3d'],
  'accent-strong': ['#c63f12', '#dc5226'],
  'accent-bright': ['#f0652f', '#ff8a5e'],
  'accent-soft': ['rgba(224, 78, 31, 0.08)', 'rgba(242, 106, 61, 0.14)'],
  'accent-ink': ['#ffffff', '#ffffff'],
  blue: ['#3563d9', '#7aa2f7'],
  'blue-strong': ['#2a4fb3', '#5b86e8'],
  'blue-soft': ['rgba(53, 99, 217, 0.09)', 'rgba(122, 162, 247, 0.15)'],
  green: ['#15894a', '#4cc787'],
  'green-soft': ['rgba(21, 137, 74, 0.09)', 'rgba(76, 199, 135, 0.14)'],
  amber: ['#b27406', '#e9ae45'],
  'amber-soft': ['rgba(178, 116, 6, 0.1)', 'rgba(233, 174, 69, 0.15)'],
  violet: ['#7549d6', '#ab90f5'],
  'violet-soft': ['rgba(117, 73, 214, 0.09)', 'rgba(171, 144, 245, 0.15)'],
  danger: ['#c11d38', '#f5707f'],
  'danger-soft': ['rgba(214, 53, 80, 0.09)', 'rgba(245, 112, 127, 0.14)'],
  /** Shadow tint: shadows mix it with transparency, so they stay visible on a dark ground. */
  shade: ['rgb(17, 24, 39)', 'rgb(0, 0, 0)'],
  /** Shadow layers, pre-mixed per scheme: a dark ground needs far denser shadows to read. */
  'shade-1': ['rgba(17, 24, 39, 0.06)', 'rgba(0, 0, 0, 0.32)'],
  'shade-2': ['rgba(17, 24, 39, 0.08)', 'rgba(0, 0, 0, 0.38)'],
  'shade-3': ['rgba(17, 24, 39, 0.13)', 'rgba(0, 0, 0, 0.5)'],
  /** Top-edge highlight of a raised surface: the light catching its bevel. */
  highlight: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.05)'],
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
    --dpk-radius-xs: 6px;
    --dpk-radius-sm: 8px;
    --dpk-radius: 10px;
    --dpk-radius-lg: 14px;
    --dpk-radius-xl: 20px;
    --dpk-bevel: inset 0 1px 0 var(--dpk-highlight);
    --dpk-shadow-xs: 0 1px 2px var(--dpk-shade-1);
    --dpk-shadow-sm: 0 1px 2px var(--dpk-shade-1), 0 3px 8px -2px var(--dpk-shade-2);
    --dpk-shadow:
      0 1px 2px var(--dpk-shade-1), 0 6px 16px -4px var(--dpk-shade-2), 0 14px 32px -12px var(--dpk-shade-3);
    --dpk-shadow-lg:
      0 2px 4px var(--dpk-shade-1), 0 12px 28px -6px var(--dpk-shade-2), 0 32px 64px -20px var(--dpk-shade-3);
    --dpk-focus: 0 0 0 1px var(--dpk-paper-raised), 0 0 0 3.5px color-mix(in srgb, var(--dpk-blue) 45%, transparent);
    --dpk-control-h: 32px;
    --dpk-ease: cubic-bezier(0.2, 0.7, 0.2, 1);
    --dpk-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    /* Frosted chrome: headers and toolbars that float over scrolling content. */
    --dpk-glass: color-mix(in srgb, var(--dpk-paper-raised) 78%, transparent);
    /* Working surface behind boards and canvases: a quiet dot lattice. */
    --dpk-dots: radial-gradient(circle at 1px 1px, var(--dpk-rule-strong) 1px, transparent 0) 0 0 / 20px 20px;

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
    font-weight: 660;
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.015em;
  }

  button {
    font: inherit;
    color: inherit;
  }

  ::selection {
    background: color-mix(in srgb, var(--dpk-blue) 22%, transparent);
  }

  .dpk-mono,
  .dpk-num {
    font-variant-numeric: tabular-nums;
  }

  .dpk-label {
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 550;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dpk-ink-faint);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 1ms !important;
    }
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
    font-weight: 550;
    line-height: 1;
    white-space: nowrap;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    cursor: pointer;
    transition:
      background 160ms var(--dpk-ease),
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease),
      transform 120ms var(--dpk-ease);
  }

  .dpk-btn:hover:not([disabled]) {
    border-color: var(--dpk-rule-hover);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  .dpk-btn:active:not([disabled]) {
    transform: translateY(1px) scale(0.985);
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
    border-color: color-mix(in srgb, var(--dpk-accent-strong) 70%, transparent);
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent) 55%, var(--dpk-accent-strong));
    color: var(--dpk-accent-ink);
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 1px 2px color-mix(in srgb, var(--dpk-accent) 30%, transparent),
      0 4px 12px -4px color-mix(in srgb, var(--dpk-accent) 55%, transparent);
  }

  .dpk-btn--accent:hover:not([disabled]) {
    border-color: color-mix(in srgb, var(--dpk-accent-strong) 70%, transparent);
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent-bright) 40%, var(--dpk-accent));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      0 2px 4px color-mix(in srgb, var(--dpk-accent) 30%, transparent),
      0 8px 20px -6px color-mix(in srgb, var(--dpk-accent) 65%, transparent);
  }

  /* Selection state, shared by every template's filter/nav controls. */
  .dpk-btn--selected {
    border-color: color-mix(in srgb, var(--dpk-blue-strong) 70%, transparent);
    background: linear-gradient(180deg, var(--dpk-blue), var(--dpk-blue-strong));
    color: #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 2px 8px -2px color-mix(in srgb, var(--dpk-blue) 60%, transparent);
  }

  .dpk-btn--selected:hover:not([disabled]) {
    border-color: color-mix(in srgb, var(--dpk-blue-strong) 70%, transparent);
    background: linear-gradient(180deg, var(--dpk-blue), var(--dpk-blue));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 4px 12px -3px color-mix(in srgb, var(--dpk-blue) 65%, transparent);
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
    box-shadow: none;
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
      background 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease-spring);
  }

  .dpk-icon-btn:hover:not([disabled]) {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .dpk-icon-btn:active:not([disabled]) {
    transform: scale(0.92);
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
    top: -5px;
    right: -5px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border: 1.5px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent));
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    line-height: 13px;
    text-align: center;
    box-shadow: 0 2px 6px -1px color-mix(in srgb, var(--dpk-accent) 55%, transparent);
    animation: dpk-pop 260ms var(--dpk-ease-spring);
  }

  @keyframes dpk-pop {
    from {
      transform: scale(0.4);
      opacity: 0;
    }
  }

  .dpk-input,
  .dpk-textarea,
  .dpk-select {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--dpk-control-h);
    padding: 6px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease);
  }

  .dpk-input::placeholder,
  .dpk-textarea::placeholder {
    color: var(--dpk-ink-faint);
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
    background-position: right 8px center;
    padding-right: 28px;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
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
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    color: var(--dpk-ink);
    font-size: 12.5px;
    animation: dpk-pop-in 180ms var(--dpk-ease);
  }

  @keyframes dpk-pop-in {
    from {
      opacity: 0;
      transform: translateY(4px) scale(0.98);
    }
  }

  .comment-pop .comment-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
    max-height: 140px;
    overflow: auto;
    font-size: 12px;
    color: var(--dpk-ink-soft);
  }

  .comment-pop .comment-list li {
    padding: 6px 10px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-accent-soft);
    border-left: 2px solid var(--dpk-accent);
  }

  .comment-pop .dpk-textarea {
    min-height: 54px;
  }

  .pop-actions {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: flex-end;
  }
`;
