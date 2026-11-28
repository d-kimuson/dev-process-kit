import { css } from 'lit';

/** The figure's own surface: the scaled canvas, group frames and the lines drawn under the nodes. */
export const diagramStyles = css`
  :host {
    display: block;
    min-width: 0;
    margin-block: 12px;
  }
  .scroller {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }
  .sizer {
    max-width: 100%;
    height: 0;
  }
  .stage {
    position: relative;
    margin-inline: auto;
  }
  .canvas {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
  }
  .canvas.is-measuring {
    visibility: hidden;
  }
  .lines {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: visible;
    pointer-events: none;
  }
  .lines .d-edge-hit {
    pointer-events: stroke;
  }

  .frame {
    position: absolute;
    z-index: 0;
    box-sizing: border-box;
    cursor: pointer;
    background: color-mix(in srgb, var(--_tone) 4%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--_tone) 34%, transparent);
    border-radius: var(--dpk-radius-lg);
    transition:
      opacity var(--dpk-dur) var(--dpk-ease),
      border-color var(--dpk-dur) var(--dpk-ease),
      box-shadow var(--dpk-dur) var(--dpk-ease);
    --_tone: var(--dpk-ink-faint);
  }
  .frame:hover {
    border-color: color-mix(in srgb, var(--_tone) 60%, transparent);
  }
  .frame:focus-visible {
    outline: 2px solid var(--dpk-blue);
    outline-offset: 2px;
  }
  .frame.is-selected {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--dpk-blue) 20%, transparent);
  }
  .frame-title {
    position: absolute;
    top: 0;
    left: 14px;
    max-width: calc(100% - 28px);
    padding: 2px 9px;
    overflow: hidden;
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 1.5;
    color: color-mix(in srgb, var(--_tone) 70%, var(--dpk-ink));
    text-overflow: ellipsis;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    background: var(--dpk-paper-raised);
    border: 1px solid color-mix(in srgb, var(--_tone) 34%, transparent);
    border-radius: 999px;
    translate: 0 -50%;
  }

  .tone-accent {
    --_tone: var(--dpk-accent);
  }
  .tone-blue {
    --_tone: var(--dpk-blue);
  }
  .tone-green {
    --_tone: var(--dpk-green);
  }
  .tone-amber {
    --_tone: var(--dpk-amber);
  }
  .tone-violet {
    --_tone: var(--dpk-violet);
  }
  .tone-danger {
    --_tone: var(--dpk-danger);
  }

  .d-edge {
    outline: none;
    transition: opacity var(--dpk-dur) var(--dpk-ease);
    --d-edge-line: var(--dpk-diagram-edge-line, color-mix(in srgb, var(--dpk-ink-faint) 78%, transparent));
    --d-edge-paper: var(--dpk-paper-raised);
  }
  .d-edge:not(.tone-neutral) {
    --d-edge-line: var(--dpk-diagram-edge-line, var(--_tone));
  }
  .d-edge.is-dimmed {
    opacity: 0.26;
  }
  .d-edge-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 16;
    cursor: pointer;
    outline: none;
  }
  .d-edge-path {
    fill: none;
    stroke: var(--d-edge-line);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition:
      stroke var(--dpk-dur) var(--dpk-ease),
      stroke-width var(--dpk-dur) var(--dpk-ease);
  }
  .d-edge.is-lit {
    --d-edge-line: var(--dpk-blue);
  }
  .d-edge.is-selected,
  .d-edge:has(.d-edge-hit:focus-visible) {
    --d-edge-line: var(--dpk-ink);
  }
  .d-edge:is(.is-selected, .is-lit) .d-edge-path,
  .d-edge:has(.d-edge-hit:focus-visible) .d-edge-path {
    stroke-width: 2.2;
  }
  .d-edge:has(.d-edge-hit:focus-visible) .d-edge-hit {
    stroke: var(--dpk-blue-soft);
  }

  .error {
    padding: 12px 14px;
    font-size: var(--dpk-text-xs);
    color: var(--dpk-danger);
    background: var(--dpk-danger-soft);
    border: 1px solid color-mix(in srgb, var(--dpk-danger) 30%, transparent);
    border-radius: var(--dpk-radius);
  }
  .error p {
    margin: 0 0 4px;
    font-weight: 600;
  }
  .error ul {
    margin: 0;
    padding-left: 18px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  .comment-error {
    margin: 0;
    font-size: 11px;
    color: var(--dpk-accent);
  }
`;
