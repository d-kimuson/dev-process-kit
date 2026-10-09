import { css, html, nothing, svg, type TemplateResult } from 'lit';

import type { StatusIcon, StatusTone } from '../model';
import type { StatusSegment } from '../status-view';

/**
 * A status's palette token as an inline custom property, read by the cards,
 * the filter and every progress bar. `gray` is the neutral ink, as is a story
 * without a status (`undefined`).
 */
export const statusToneStyle = (tone: StatusTone | null | undefined): string =>
  `--usm-tone: var(--dpk-${tone === undefined || tone === null || tone === 'gray' ? 'ink-faint' : tone})`;

/** What an icon needs to know about its status; `undefined` draws "no status yet". */
export type IconSource = { readonly icon: StatusIcon; readonly progress: number | undefined };

const CHECK = 'M5 8.3l2 2 4-4.3';

/** The marks of each fixed icon, in a 16 × 16 box. */
const GLYPHS: Record<Exclude<StatusIcon, 'progress'>, () => TemplateResult> = {
  circle: () => svg`<circle class="si-line" cx="8" cy="8" r="6"></circle>`,
  lightbulb: () => svg`
    <path class="si-tint" d="M8 1.8a4.4 4.4 0 0 0-2.6 7.9c.5.4.8.9.8 1.5v.5h3.6v-.5c0-.6.3-1.1.8-1.5A4.4 4.4 0 0 0 8 1.8z"></path>
    <path class="si-line" d="M8 1.8a4.4 4.4 0 0 0-2.6 7.9c.5.4.8.9.8 1.5v.5h3.6v-.5c0-.6.3-1.1.8-1.5A4.4 4.4 0 0 0 8 1.8zM6.5 14.4h3"></path>`,
  flag: () => svg`
    <path class="si-solid" d="M4 2.2h8.3l-2 3.2 2 3.2H4z"></path>
    <path class="si-line" d="M4 14.5V1.8"></path>`,
  play: () => svg`
    <circle class="si-solid" cx="8" cy="8" r="7"></circle>
    <path class="si-knock-solid" d="M6.4 4.9v6.2L11.2 8z"></path>`,
  clock: () => svg`
    <circle class="si-tint" cx="8" cy="8" r="6.2"></circle>
    <circle class="si-line" cx="8" cy="8" r="6.2"></circle>
    <path class="si-line" d="M8 4.6V8l2.3 1.5"></path>`,
  eye: () => svg`
    <path class="si-tint si-line" d="M1.3 8S3.8 3.4 8 3.4 14.7 8 14.7 8 12.2 12.6 8 12.6 1.3 8 1.3 8z"></path>
    <circle class="si-solid" cx="8" cy="8" r="2.1"></circle>`,
  pause: () => svg`
    <circle class="si-solid" cx="8" cy="8" r="7"></circle>
    <path class="si-knock-solid" d="M5.8 5h1.5v6H5.8zM8.7 5h1.5v6H8.7z"></path>`,
  check: () => svg`
    <circle class="si-solid" cx="8" cy="8" r="7"></circle>
    <path class="si-knock" d=${CHECK}></path>`,
  x: () => svg`
    <circle class="si-solid" cx="8" cy="8" r="7"></circle>
    <path class="si-knock" d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"></path>`,
};

/** The ring that fills up with the status's place in the workflow, a check once at the end. */
const progressGlyph = (progress: number): TemplateResult => {
  if (progress >= 1) return GLYPHS.check();
  const circumference = 2 * Math.PI * 3;
  return svg`
    <circle class="si-line" cx="8" cy="8" r="6"></circle>
    ${
      progress > 0
        ? svg`<circle
            class="si-pie"
            cx="8"
            cy="8"
            r="3"
            stroke-dasharray=${`${progress * circumference} ${circumference}`}
            transform="rotate(-90 8 8)"
          ></circle>`
        : nothing
    }`;
};

/**
 * A status's icon in the color of `--usm-tone`: the one the status chose, or
 * a dashed ring when the story has no status yet.
 */
export const statusIcon = (source: IconSource | undefined): TemplateResult => {
  const glyph =
    source === undefined
      ? svg`<circle class="si-line si-dashed" cx="8" cy="8" r="6"></circle>`
      : source.icon === 'progress'
        ? progressGlyph(source.progress ?? 1)
        : GLYPHS[source.icon]();
  return html`<svg class="status-icon" viewBox="0 0 16 16" aria-hidden="true">${glyph}</svg>`;
};

/** A stacked bar of how stories spread over the statuses, in status colors. */
export const statusBar = (segments: readonly StatusSegment[], label: string): TemplateResult | typeof nothing => {
  if (segments.length === 0) return nothing;
  return html`<span class="status-bar" role="img" aria-label=${label}>
    ${segments.map(
      (segment) =>
        html`<span
          class="status-bar-part"
          data-status=${segment.id}
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
  .status-icon .si-line,
  .status-icon .si-pie,
  .status-icon .si-knock {
    fill: none;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .status-icon .si-line {
    stroke: var(--usm-tone);
  }
  .status-icon .si-dashed {
    stroke-dasharray: 2.4 2.2;
  }
  .status-icon .si-pie {
    stroke: var(--usm-tone);
    stroke-width: 6;
    stroke-linecap: butt;
  }
  .status-icon .si-solid {
    fill: var(--usm-tone);
  }
  .status-icon .si-tint {
    fill: color-mix(in oklch, var(--usm-tone) 22%, transparent);
  }
  .status-icon .si-knock {
    stroke: var(--dpk-paper-raised);
    stroke-width: 1.7;
  }
  .status-icon .si-knock-solid {
    fill: var(--dpk-paper-raised);
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
