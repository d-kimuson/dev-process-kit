import { css, html, svg, type TemplateResult } from 'lit';

import type { LinkKind } from '../../../lib/link-label';

import { iconLink } from '../../../core/icons';

/** Each service's mark in one color (`currentColor`), in a 16 × 16 box. */
const MARKS: Record<Exclude<LinkKind, 'web'>, TemplateResult> = {
  // Octicons `mark-github` (MIT).
  github: svg`<path fill-rule="evenodd" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>`,
  gitlab: svg`<path d="M8 15 1.2 9.9a.7.7 0 0 1-.25-.78L2.7 2.6a.35.35 0 0 1 .66 0L5.1 7.6h5.8l1.74-5a.35.35 0 0 1 .66 0l1.75 6.52a.7.7 0 0 1-.25.78z"></path>`,
  jira: svg`<path d="M14.6 7.4 8.6 1.4 8 .8 3.5 5.3 1.4 7.4a.85.85 0 0 0 0 1.2l4.1 4.1L8 15.2l4.5-4.5.07-.07 2.03-2.03a.85.85 0 0 0 0-1.2zM8 9.9 5.9 8 8 5.9 10.1 8z"></path>`,
  linear: svg`<path d="M1.2 9.4a6.9 6.9 0 0 0 5.4 5.4zM1 7.3l7.7 7.7a7 7 0 0 0 1.9-.5L1.5 5.4a7 7 0 0 0-.5 1.9zm1.2-3.1 9.6 9.6a7 7 0 0 0 1.2-1.1L3.3 3a7 7 0 0 0-1.1 1.2zM4.3 2.3a7 7 0 1 1 9.4 9.4z"></path>`,
  figma: svg`<path d="M5.5 1h2.3v4.6H5.5a2.3 2.3 0 1 1 0-4.6zm2.3 0h2.3a2.3 2.3 0 1 1 0 4.6H7.8zm2.3 4.6a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6zM5.5 5.6h2.3v4.6H5.5a2.3 2.3 0 1 1 0-4.6zm0 4.6h2.3v2.3a2.3 2.3 0 1 1-2.3-2.3z"></path>`,
  notion: svg`<path fill-rule="evenodd" d="M2.5 1.6 11 1c1 0 1.3.1 2 .6l2.1 1.5c.4.3.5.4.5.7v9.6c0 .7-.3 1.1-1.1 1.2l-9.4.6c-.6 0-.9-.1-1.2-.5L1.9 12c-.3-.5-.5-.8-.5-1.3V2.8c0-.6.3-1.1 1.1-1.2zM5 4.4v8.9l8.6-.5V4zm1 1.2 2.9-.2 3 4.7V5.6l-.8-.1v-.5l2-.1v.6l-.6.1v6.1l-.9.1-3.5-5.4v4.9l.8.2v.5l-2.3.1v-.5l.6-.2V6.4l-.8-.1z"></path>`,
};

/** The service's mark for a link, or a plain link glyph for any other site. */
export const linkIcon = (kind: LinkKind): TemplateResult => {
  if (kind === 'web') return iconLink();
  return html`<svg class="link-mark" viewBox="0 0 16 16" aria-hidden="true">${MARKS[kind]}</svg>`;
};

/** A link chip: the service's mark and the short label, shared by the cards and the story panel. */
export const linkStyles = css`
  .link-mark {
    fill: currentColor;
  }
  .link-chip {
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
      color 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }
  .link-chip:hover {
    border-color: var(--dpk-ink-faint);
    color: var(--dpk-ink);
  }
  .link-chip:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .link-chip svg {
    flex: none;
    width: 12px;
    height: 12px;
  }
  .link-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
