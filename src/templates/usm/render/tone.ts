import { css, html, nothing, svg, type TemplateResult } from 'lit';

import type { StatusTone } from '../model';
import type { StatusSegment } from '../status-view';

/**
 * A status's palette token as an inline custom property, read by the cards,
 * the filter and every progress bar. `gray` is the neutral ink, as is a story
 * without a status (`undefined`).
 */
export const statusToneStyle = (tone: StatusTone | null | undefined): string =>
  `--usm-tone: var(--dpk-${tone === undefined || tone === null || tone === 'gray' ? 'ink-faint' : tone})`;

/**
 * The status icon: a ring that fills up as the story moves along the workflow
 * (empty for the first status, a check for the last) and a dashed ring when
 * the story has no status. It takes the color of `--usm-tone`.
 */
export const statusIcon = (progress: number | undefined): TemplateResult => {
  const circumference = 2 * Math.PI * 3;
  if (progress === undefined) {
    return html`<svg class="status-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke-width="1.5" stroke-dasharray="2.4 2.2"></circle>
    </svg>`;
  }
  if (progress >= 1) {
    return html`<svg class="status-icon" data-done="true" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7"></circle>
      <path d="M5 8.3l2 2 4-4.3" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`;
  }
  return html`<svg class="status-icon" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" fill="none" stroke-width="1.5"></circle>
    ${
      progress > 0
        ? svg`<circle
            cx="8"
            cy="8"
            r="3"
            fill="none"
            stroke-width="6"
            stroke-dasharray=${`${progress * circumference} ${circumference}`}
            transform="rotate(-90 8 8)"
          ></circle>`
        : nothing
    }
  </svg>`;
};

/** A stacked bar of how stories spread over the statuses, in status colors. */
export const statusBar = (segments: readonly StatusSegment[], label: string): TemplateResult | typeof nothing => {
  if (segments.length === 0) return nothing;
  return html`<span class="status-bar" role="img" aria-label=${label}>
    ${segments.map(
      (segment) =>
        html`<span
          class="status-bar-part"
          data-status=${segment.id ?? ''}
          title=${`${segment.name}: ${segment.count}`}
          style=${`${statusToneStyle(segment.tone)};flex-grow:${segment.count}`}
        ></span>`,
    )}
  </span>`;
};

/** Paint of the status icon and bar; shared by the map and the cards' own shadow roots. */
export const statusStyles = css`
  .status-icon {
    display: block;
    flex: none;
    width: 16px;
    height: 16px;
    overflow: visible;
  }
  .status-icon circle {
    stroke: var(--usm-tone);
  }
  .status-icon[data-done='true'] circle {
    fill: var(--usm-tone);
    stroke: none;
  }
  .status-icon[data-done='true'] path {
    stroke: var(--dpk-paper-raised);
  }
  .status-bar {
    display: flex;
    gap: 2px;
    height: 6px;
    min-width: 0;
  }
  .status-bar-part {
    min-width: 4px;
    border-radius: 3px;
    background: var(--usm-tone);
  }
  .status-bar-part[data-status=''] {
    background: color-mix(in srgb, var(--dpk-ink-faint) 30%, transparent);
  }
`;
