import { css, unsafeCSS, type CSSResult } from 'lit';

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
 * The two inputs that scope a theme to a subtree: `--dpk-brand-primary` (the
 * `--dpk-accent` family below — primary actions, selection, the kit's own
 * mark) and `--dpk-brand-secondary` (the `--dpk-blue` family — focus rings,
 * links). Neither is ever assigned a literal value on `:host` or `:root`:
 * every derived token reads it through `var(<input>, <dev-process-kit's own
 * color>)`, so a subtree that never sets them keeps the kit's own
 * indigo-violet and blue, and one that does (a class, an inline style)
 * recolors every atom and component inside it — `var()` resolves again at
 * each shadow root, from that root's own position in the (possibly themed)
 * tree. See `dev-docs/adr/20261023_scoped-brand-theme.md` and docs/index.md
 * ("Theme").
 *
 * Brand colors sampled from the dev-process-kit mark, darkened per stop so
 * white button text (`--dpk-accent-ink`) keeps WCAG AA contrast (>= 4.5:1) in
 * both schemes — a theme should keep the same property.
 */
const brandInput = (
  variable: '--dpk-brand-primary' | '--dpk-brand-secondary',
  [light, dark]: readonly [light: string, dark: string],
) => ({
  bare: `var(${variable}, ${light})`,
  schemed: `var(${variable}, light-dark(${light}, ${dark}))`,
});

const primaryInput = brandInput('--dpk-brand-primary', ['#6253d4', '#6858e0']);
const secondaryInput = brandInput('--dpk-brand-secondary', ['#3563d9', '#7aa2f7']);

/**
 * The accent (primary) and blue (secondary) token families, derived from the
 * two brand inputs above with `color-mix()` so a theme only has to supply
 * two base colors. Called once per `declarations()` pass (plain, then the
 * `light-dark()` one under `@supports`), with that pass's own `.bare` or
 * `.schemed` fallback for each input.
 */
const brandTokens = (primary: string, secondary: string) =>
  unsafeCSS(`
  --dpk-accent: ${primary};
  --dpk-accent-strong: color-mix(in oklab, var(--dpk-accent) 80%, black);
  --dpk-accent-bright: color-mix(in oklab, var(--dpk-accent) 88%, white);
  --dpk-accent-soft: color-mix(in srgb, var(--dpk-accent) 8%, transparent);
  --dpk-accent-ink: #ffffff;
  --dpk-blue: ${secondary};
  --dpk-blue-strong: color-mix(in oklab, var(--dpk-blue) 80%, black);
  --dpk-blue-soft: color-mix(in srgb, var(--dpk-blue) 9%, transparent);
`);

/** The non-color tokens: type, shape, elevation and motion. */
const scale = css`
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
  --dpk-shadow: 0 1px 2px var(--dpk-shade-1), 0 6px 16px -4px var(--dpk-shade-2), 0 14px 32px -12px var(--dpk-shade-3);
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
`;

/**
 * Shared design tokens. They are declared on `:host`, so they inherit into the
 * light DOM as well — user CSS can theme pages with `var(--dpk-*)`.
 */
export const tokens = css`
  :host {
    /* Browsers without light-dark() stay light. */
    ${declarations((light) => light)}
    ${brandTokens(primaryInput.bare, secondaryInput.bare)}
    ${scale}

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
      ${brandTokens(primaryInput.schemed, secondaryInput.schemed)}
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

/**
 * The same tokens declared on the document root, for author content outside any
 * template (a standalone component, a page built from atoms only). A template
 * redeclares them on its host, so content inside it keeps the template's scheme.
 */
export const documentTokens = css`
  :where(:root) {
    ${declarations((light) => light)}
    ${brandTokens(primaryInput.bare, secondaryInput.bare)}
    ${scale}
  }

  @supports (color: light-dark(#000, #fff)) {
    :where(:root) {
      ${declarations((light, dark) => `light-dark(${light}, ${dark})`)}
      ${brandTokens(primaryInput.schemed, secondaryInput.schemed)}
    }
  }
`;

/**
 * The scope hook for a brand set somewhere other than `:host` or `:root`.
 *
 * `--dpk-accent*` / `--dpk-blue*` only re-derive from `--dpk-brand-primary` /
 * `--dpk-brand-secondary` where some rule declares them again — `tokens`
 * does that once per component instance (`:host`), `documentTokens` once for
 * the document (`:root`); a `var()` reference does not re-resolve lazily at
 * every inheriting descendant. Content with neither boundary — a page's own
 * light DOM nested inside a component's slot, an app screen a UX Prototype
 * renders with its own brand — needs an explicit third place to redeclare
 * them, so it carries `data-dpk-theme` (shipped with the CSS atoms, so it is
 * wherever atoms are) on the same element that sets the two brand inputs, or
 * on any element between that element and the atoms it should recolor.
 */
export const themeScope = css`
  :where([data-dpk-theme]) {
    ${brandTokens(primaryInput.bare, secondaryInput.bare)}
  }

  @supports (color: light-dark(#000, #fff)) {
    :where([data-dpk-theme]) {
      ${brandTokens(primaryInput.schemed, secondaryInput.schemed)}
    }
  }
`;

/**
 * The icon-only button's rules, parameterized by how a selector is scoped:
 * identity for a shadow root (`controls` below, read by components), or
 * `:where(...)` for the light-DOM atom (`src/components/atoms/styles.ts`,
 * author content) so a page's own CSS still outranks it. One source for a
 * button used both inside the shell/components and over author content —
 * `data-size='sm'` for a quieter control beside dense text, `data-active`
 * for a toggled one, `data-variant='subtle'` for one with nothing else
 * around it to show where it is before the pointer arrives.
 */
export const iconButtonCss = (wrap: (selector: string) => string = (selector) => selector): CSSResult =>
  unsafeCSS(`
  ${wrap('.dpk-icon-btn')} {
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
      border-color 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease-spring);
  }

  ${wrap('.dpk-icon-btn')}:hover:not([disabled]) {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  ${wrap('.dpk-icon-btn')}:active:not([disabled]) {
    transform: scale(0.92);
  }

  ${wrap('.dpk-icon-btn')}:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  ${wrap('.dpk-icon-btn[disabled]')} {
    opacity: 0.35;
    cursor: default;
  }

  ${wrap(".dpk-icon-btn[data-active='true']")} {
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  /*
   * Without this, the generic :hover rule above (higher specificity: class +
   * :hover + :not()) would win over the bare attribute selector here and flip
   * an active toggle back to the neutral hover look while the pointer is over it.
   */
  ${wrap(".dpk-icon-btn[data-active='true']")}:hover:not([disabled]) {
    background: color-mix(in srgb, var(--dpk-blue-soft) 70%, var(--dpk-paper-inset));
    color: var(--dpk-blue);
  }

  ${wrap('.dpk-icon-btn')} svg {
    display: block;
    width: 15px;
    height: 15px;
  }

  ${wrap(".dpk-icon-btn[data-size='sm']")} {
    width: 22px;
    height: 22px;
  }

  ${wrap(".dpk-icon-btn[data-size='sm']")} svg {
    width: 13px;
    height: 13px;
  }

  /*
   * Visible at rest instead of only once hovered or focused: for an icon
   * button that is the sole control in its spot, with no row or card to
   * reveal it on :hover (compare .dpk-hover-tools for that case instead).
   */
  ${wrap(".dpk-icon-btn[data-variant='subtle']")} {
    border-color: var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  ${wrap(".dpk-icon-btn[data-variant='subtle']")}:hover:not([disabled]) {
    border-color: var(--dpk-rule-hover);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  /* Count badge for an icon-only control (comments on a card, drafts on the rail). */
  ${wrap('.dpk-icon-badge')} {
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
`);

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

  /**
   * A destructive confirm action (discard, delete) — the same gradient/shadow steps as
   * .dpk-btn--accent, kept entirely in the --dpk-danger red family so hover and active
   * never drift toward the brand accent color.
   */
  .dpk-btn--danger {
    border-color: color-mix(in srgb, var(--dpk-danger) 70%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-danger) 82%, white),
      var(--dpk-danger) 55%,
      color-mix(in srgb, var(--dpk-danger) 82%, black)
    );
    color: var(--dpk-accent-ink);
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 1px 2px color-mix(in srgb, var(--dpk-danger) 30%, transparent),
      0 4px 12px -4px color-mix(in srgb, var(--dpk-danger) 55%, transparent);
  }

  .dpk-btn--danger:hover:not([disabled]) {
    border-color: color-mix(in srgb, var(--dpk-danger) 70%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-danger) 82%, white),
      color-mix(in srgb, var(--dpk-danger) 82%, white) 40%,
      var(--dpk-danger)
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      0 2px 4px color-mix(in srgb, var(--dpk-danger) 30%, transparent),
      0 8px 20px -6px color-mix(in srgb, var(--dpk-danger) 65%, transparent);
  }

  ${iconButtonCss()}

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

  /*
   * The non-native select (src/core/select): a trigger button that looks
   * like .dpk-select and a listbox popover beside it. Shared by the public
   * dpk-select element and the shell's own pickers.
   */
  .dpk-rich-select {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: var(--dpk-control-h);
    padding: 6px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    cursor: pointer;
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease);
  }

  .dpk-rich-select:hover {
    border-color: var(--dpk-rule-hover);
  }

  .dpk-rich-select:focus-visible {
    outline: none;
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
  }

  .dpk-rich-select[disabled] {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .dpk-rich-select-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  .dpk-rich-select-chevron {
    flex: none;
    display: inline-flex;
    color: var(--dpk-ink-faint);
    transition: transform 160ms var(--dpk-ease);
  }

  .dpk-rich-select-chevron[data-open='true'] {
    transform: rotate(180deg);
  }

  .dpk-rich-select-chevron svg {
    display: block;
    width: 12px;
    height: 12px;
  }

  .dpk-rich-select-listbox {
    box-sizing: border-box;
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 4px 0;
    overflow-y: auto;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    color: var(--dpk-ink);
    font-size: 12.5px;
    animation: dpk-rich-select-pop-in 140ms var(--dpk-ease);
  }

  @keyframes dpk-rich-select-pop-in {
    from {
      opacity: 0;
      transform: translateY(4px) scale(0.98);
    }
  }

  .dpk-rich-select-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
  }

  .dpk-rich-select-option:hover,
  .dpk-rich-select-option[data-active='true'] {
    background: var(--dpk-paper-sunken);
  }

  .dpk-rich-select-option-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dpk-rich-select-check {
    flex: none;
    display: flex;
    color: var(--dpk-blue);
  }

  .dpk-rich-select-check svg {
    display: block;
    width: 14px;
    height: 14px;
  }

  .dpk-textarea {
    resize: vertical;
    min-height: 64px;
    line-height: 1.55;
  }

  /*
   * A floating control bar lifted into the top layer (\`popover="manual"\`), so
   * no ancestor's overflow, transform or stacking context can clip it — a
   * selection toolbar over a pan/zoom canvas, say. Resets the popover's UA
   * box; the caller still places it (\`left\` / \`right\` / \`top\` / \`bottom\`).
   */
  .dpk-floatbar {
    position: fixed;
    inset: auto;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-glass);
    backdrop-filter: blur(12px);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    color: var(--dpk-ink);
    font: inherit;
    animation: dpk-floatbar-in 200ms var(--dpk-ease-spring) backwards;
  }

  @keyframes dpk-floatbar-in {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.98);
    }
  }

  /**
   * A native \`<dialog>\` used as a real modal (\`showModal()\`), not the
   * popover-based surfaces above: for a yes/no prompt that must block input
   * until answered (a confirm dialog), where a dismissable popover would be
   * wrong. The engine's own UA sheet supplies centering and the backdrop;
   * this only restyles the panel and its content.
   */
  .dpk-confirm-dialog {
    box-sizing: border-box;
    width: min(360px, calc(100vw - 32px));
    padding: 0;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    color: var(--dpk-ink);
  }

  .dpk-confirm-dialog::backdrop {
    background: color-mix(in srgb, var(--dpk-shade) 45%, transparent);
  }

  .dpk-confirm-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
  }

  .dpk-confirm-dialog-title {
    margin: 0;
    font-size: 14.5px;
    font-weight: 650;
  }

  .dpk-confirm-dialog-text {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--dpk-ink-soft);
  }

  .dpk-confirm-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
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
    /* One column as wide as the surface: a long label wraps or ellipsizes instead of widening it. */
    grid-template-columns: minmax(0, 1fr);
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

  .comment-pop .comment-target {
    overflow-wrap: anywhere;
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
  }

  .comment-pop .dpk-textarea {
    min-height: 54px;
  }

  /* What kind of comment: a segmented control over native radios. */
  .comment-kinds {
    display: flex;
    gap: 2px;
    min-width: 0;
    margin: 0;
    padding: 2px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }

  .comment-kinds legend {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .comment-kind {
    position: relative;
    flex: 1;
    display: grid;
    place-items: center;
    padding: 4px 8px;
    border-radius: var(--dpk-radius-xs);
    color: var(--dpk-ink-soft);
    font-weight: 550;
    cursor: pointer;
  }

  .comment-kind input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .comment-kind:has(input:checked) {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .comment-kind:has(input:focus-visible) {
    outline: 2px solid var(--dpk-accent);
    outline-offset: 1px;
  }

  .comment-kind-hint {
    margin: -4px 0 0;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    line-height: 1.45;
  }

  .pop-actions {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: flex-end;
  }
`;

/**
 * Formatted text (`lib/markdown`) inside a `.dpk-prose` box: compact enough
 * for a sidebar, with the spacing taken from the surrounding type scale.
 */
export const prose = css`
  .dpk-prose {
    overflow-wrap: anywhere;
  }

  .dpk-prose > :first-child {
    margin-top: 0;
  }

  .dpk-prose > :last-child {
    margin-bottom: 0;
  }

  .dpk-prose :is(p, ul, ol, pre, blockquote, table) {
    margin: 0 0 0.6em;
  }

  .dpk-prose :is(h1, h2, h3, h4, h5, h6) {
    margin: 0.8em 0 0.3em;
    font-size: 1em;
    font-weight: 650;
    line-height: 1.4;
    color: var(--dpk-ink);
  }

  .dpk-prose :is(ul, ol) {
    padding-left: 1.3em;
  }

  .dpk-prose li + li {
    margin-top: 0.15em;
  }

  /* A task list item: its checkbox is the marker, so it has no bullet of its own. */
  .dpk-prose li:has(> input[type='checkbox']:first-child) {
    margin-left: -1.3em;
    list-style: none;
  }

  .dpk-prose li > input[type='checkbox']:first-child {
    margin: 0 0.4em 0 0;
    vertical-align: -0.1em;
  }

  .dpk-prose strong {
    font-weight: 650;
    color: var(--dpk-ink);
  }

  .dpk-prose a {
    color: var(--dpk-blue);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .dpk-prose code {
    padding: 0.05em 0.3em;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-sunken);
    font-family: var(--dpk-mono);
    font-size: 0.9em;
  }

  .dpk-prose pre {
    padding: 8px 10px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-sunken);
    overflow: auto;
  }

  .dpk-prose pre code {
    padding: 0;
    background: none;
  }

  .dpk-prose blockquote {
    padding: 0.5em 0.8em;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
  }

  /* A table wider than its box scrolls on its own instead of being clipped by it. */
  .dpk-prose table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
  }

  /* A cell breaks a word only once it runs out of room: the box's 'anywhere' would
     let the table shrink a column to one letter rather than scroll. */
  .dpk-prose :is(th, td) {
    overflow-wrap: break-word;
    padding: 2px 8px;
    border: 1px solid var(--dpk-rule);
    text-align: left;
  }

  .dpk-prose hr {
    border: none;
    border-top: 1px solid var(--dpk-rule);
  }

  .dpk-prose img {
    max-width: 100%;
  }
`;
