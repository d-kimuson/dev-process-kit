import { css, html, nothing, svg, type TemplateResult } from 'lit';
import {
  Circle,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CirclePlay,
  CircleX,
  Clock,
  Eye,
  Flag,
  Lightbulb,
} from 'lucide';

import type { StatusIcon, StatusTone } from '../model';
import type { StatusSegment } from '../status-view';

import { lucide } from '../../../core/icons';

/**
 * A status's palette token as an inline custom property, read by the cards,
 * the filter and every progress bar. `gray` is the neutral ink, as is a story
 * without a status (`undefined`).
 */
export const statusToneStyle = (tone: StatusTone | null | undefined): string =>
  `--usm-tone: var(--dpk-${tone === undefined || tone === null || tone === 'gray' ? 'ink-faint' : tone})`;

/** What an icon needs to know about its status; `undefined` draws "no status yet". */
export type IconSource = { readonly icon: StatusIcon; readonly progress: number | undefined };

/** Each fixed icon, from Lucide. */
const GLYPHS: Record<Exclude<StatusIcon, 'progress'>, () => TemplateResult> = {
  circle: lucide(Circle),
  lightbulb: lucide(Lightbulb),
  flag: lucide(Flag),
  play: lucide(CirclePlay),
  clock: lucide(Clock),
  eye: lucide(Eye),
  pause: lucide(CirclePause),
  check: lucide(CircleCheck),
  x: lucide(CircleX),
};

const noStatus = lucide(CircleDashed);

/**
 * The ring that fills up with the status's place in the workflow, a check once at the end.
 * Lucide has no such icon, so it is drawn on Lucide's grid and stroke.
 */
const progressGlyph = (progress: number): TemplateResult => {
  if (progress >= 1) return GLYPHS.check();
  const circumference = 2 * Math.PI * 4.5;
  return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10"></circle>
    ${
      progress > 0
        ? svg`<circle
            class="si-pie"
            cx="12"
            cy="12"
            r="4.5"
            stroke-dasharray=${`${progress * circumference} ${circumference}`}
            transform="rotate(-90 12 12)"
          ></circle>`
        : nothing
    }
  </svg>`;
};

/**
 * A status's icon in the color of `--usm-tone`: the one the status chose, or
 * a dashed ring when the story has no status yet.
 */
export const statusIcon = (source: IconSource | undefined): TemplateResult => {
  const glyph =
    source === undefined
      ? noStatus()
      : source.icon === 'progress'
        ? progressGlyph(source.progress ?? 1)
        : GLYPHS[source.icon]();
  return html`<span class="status-icon">${glyph}</span>`;
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
    color: var(--usm-tone);
  }
  .status-icon svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .status-icon .si-pie {
    stroke-width: 9;
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
