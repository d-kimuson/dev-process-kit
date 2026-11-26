import { css } from 'lit';

export const architectureStyles = css`
  :host {
    /* Links and their arrowheads share one colour, strong enough to follow across the canvas in both schemes. */
    --arch-line: var(--dpk-ink-faint);
    --arch-frame: color-mix(in srgb, var(--dpk-blue) 55%, var(--dpk-ink-faint));
    --arch-frame-external: var(--dpk-amber);
  }

  .arch-toggle {
    min-height: 26px;
    padding: 0 9px;
    font-size: 11px;
  }

  .arch-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    background: var(--dpk-blue-soft);
    color: color-mix(in srgb, var(--dpk-blue) 78%, var(--dpk-ink));
  }

  .arch-boundary {
    position: absolute;
    box-sizing: border-box;
    border: 1.5px solid var(--arch-frame);
    border-radius: var(--dpk-radius-lg);
    background: color-mix(in srgb, var(--dpk-blue) 4%, transparent);
    pointer-events: none;
  }

  .arch-boundary.is-external {
    border-style: dashed;
    border-color: var(--arch-frame-external);
    background: color-mix(in srgb, var(--dpk-amber) 5%, transparent);
  }

  /* A legend on the frame's top border: the padding inside the frame stays free for links. */
  .arch-boundary-title {
    position: absolute;
    top: -12.5px;
    left: 12.5px;
    box-sizing: border-box;
    height: 22px;
    /* Stays inside its own boundary, eliding a long label, rather than running over its neighbours. */
    max-width: calc(100% - 25px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 9px;
    border: 1px solid var(--arch-frame);
    border-radius: 999px;
    background: color-mix(in srgb, var(--dpk-blue) 9%, var(--dpk-paper-raised));
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 600;
    line-height: 20px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--dpk-ink-soft);
  }

  .is-external > .arch-boundary-title {
    border-color: var(--arch-frame-external);
    background: color-mix(in srgb, var(--dpk-amber) 12%, var(--dpk-paper-raised));
  }

  .arch-service {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 11px;
    align-items: start;
    box-sizing: border-box;
    padding: 13px 13px 12px;
    border: 1px solid var(--dpk-ink-faint);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    color: var(--dpk-ink);
    text-align: left;
    overflow: hidden;
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease);
  }

  .arch-service.is-brief {
    align-items: center;
  }

  .arch-service:hover {
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    transform: translateY(-1px);
  }

  .arch-service.is-selected {
    border-color: var(--dpk-blue);
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow-sm),
      0 0 0 3px color-mix(in srgb, var(--dpk-blue) 28%, transparent);
  }

  .arch-service.is-related {
    border-color: var(--dpk-green);
    background: color-mix(in srgb, var(--dpk-green) 9%, var(--dpk-paper-raised));
  }

  .arch-artwork {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  .arch-symbol {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.02em;
  }

  .arch-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .arch-name {
    font-size: 14px;
    font-weight: 650;
    line-height: 1.35;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arch-description {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--dpk-ink-soft);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .arch-link .d-edge-path {
    stroke: var(--arch-line);
    stroke-width: 1.5;
  }

  .arch-link.is-related .d-edge-path {
    stroke: var(--dpk-green);
    stroke-width: 2;
  }

  .arch-link.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.2;
  }

  .arch-link-chip {
    position: absolute;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    margin: 0;
    padding: 0 7px;
    border: 1px solid color-mix(in srgb, var(--dpk-ink-faint) 55%, transparent);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 11px;
    font-weight: 550;
    line-height: 1;
    cursor: pointer;
    transition:
      opacity var(--dpk-dur-fast) var(--dpk-ease),
      border-color var(--dpk-dur) var(--dpk-ease),
      color var(--dpk-dur) var(--dpk-ease);
  }

  .arch-link-chip > span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arch-link-chip[data-wrapped] {
    border-radius: 10px;
    line-height: 1.25;
    text-align: center;
  }

  .arch-link-chip[data-wrapped] > span {
    display: -webkit-box;
    overflow-wrap: anywhere;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .arch-link-chip.is-related {
    border-color: var(--dpk-green);
    color: var(--dpk-ink);
  }

  .arch-link-chip.is-selected {
    border-color: var(--dpk-blue);
    color: var(--dpk-ink);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--dpk-blue) 28%, transparent);
  }

  .arch-link-chip.is-dimmed {
    opacity: 0.26;
  }

  #arch-neutral .diagram-arrow {
    fill: var(--arch-line);
    stroke: var(--arch-line);
  }

  #arch-related .diagram-arrow {
    fill: var(--dpk-green);
    stroke: var(--dpk-green);
  }

  #arch-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }
`;
