import { html, type TemplateResult } from 'lit';

/**
 * Shared icon set — Lucide-inspired, 16×16 grid.
 *
 * Every icon is inline SVG: inherits `currentColor`, scales with the control
 * and stays crisp. Every icon is decorative — the button carries the accessible name.
 */
const A =
  'viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

export const iconClose = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>`;
};

export const iconTrash = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3.5 5h9M5.5 5V3.5a1 1 0 011-1h3a1 1 0 011 1V5" />
    <path d="M5 5l.5 7.5h5L11 5" />
    <path d="M6.8 7.5v3.5M9.2 7.5v3.5" />
  </svg>`;
};

export const iconPencil = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3 13l1.5-1.5M11.3 2.7a1.5 1.5 0 012.1 2.1L5.5 12.7l-3 .8.8-3z" />
  </svg>`;
};

export const iconComment = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3.5 3.5h9a1 1 0 011 1v5a1 1 0 01-1 1H8.2l-2.7 2.2v-2.2H3.5a1 1 0 01-1-1v-5a1 1 0 011-1z" />
  </svg>`;
};

export const iconLink = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6.5 9.5l3-3" />
    <path d="M7 5.5l1-1a2.1 2.1 0 013 3l-1 1" />
    <path d="M9 10.5l-1 1a2.1 2.1 0 01-3-3l1-1" />
  </svg>`;
};

export const iconPlus = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>`;
};

export const iconGrip = (): TemplateResult => {
  return html`<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
    <circle cx="6.5" cy="4.5" r="1" />
    <circle cx="9.5" cy="4.5" r="1" />
    <circle cx="6.5" cy="8" r="1" />
    <circle cx="9.5" cy="8" r="1" />
    <circle cx="6.5" cy="11.5" r="1" />
    <circle cx="9.5" cy="11.5" r="1" />
  </svg>`;
};

export const iconMove = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 2.5v11M8 2.5L5.5 5M8 2.5l2.5 2.5M8 13.5l-2.5-2.5M8 13.5l2.5-2.5M2.5 8h11M2.5 8L5 5.5M2.5 8l2.5 2.5M13.5 8L11 5.5M13.5 8L11 10.5"
    />
  </svg>`;
};

export const iconArrowUp = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 12.5V3.5M4.5 7L8 3.5 11.5 7" />
  </svg>`;
};

export const iconArrowDown = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 3.5v9M4.5 9L8 12.5 11.5 9" />
  </svg>`;
};

export const iconMaximize = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" />
  </svg>`;
};

export const iconMinimize = (): TemplateResult => {
  return html`<svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M13.5 7h-4.5v-4.5M2.5 9h4.5v4.5M9 7l4.5-4.5M7 9l-4.5 4.5" />
  </svg>`;
};

void A;
