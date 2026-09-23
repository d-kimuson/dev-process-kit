import { css } from 'lit';

export const architectureStyles = css`
  .arch-toggle {
    min-height: 26px;
    padding: 0 9px;
    font-size: 10.5px;
  }

  .arch-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .arch-boundary {
    position: absolute;
    border: 1px dashed var(--af-rule-strong);
    border-radius: var(--af-radius-lg);
    background: color-mix(in srgb, var(--af-blue) 3%, transparent);
    pointer-events: none;
  }

  .arch-boundary.is-external {
    border-color: color-mix(in srgb, var(--af-amber) 45%, transparent);
    background: color-mix(in srgb, var(--af-amber) 4%, transparent);
  }

  .arch-boundary span {
    position: absolute;
    top: 9px;
    left: 14px;
    font-family: var(--af-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--af-ink-faint);
  }

  .arch-service {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 14px 13px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .arch-service:hover {
    border-color: var(--af-blue);
  }

  .arch-service.is-selected {
    border-color: var(--af-blue);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .arch-service.is-related {
    border-color: color-mix(in srgb, var(--af-green) 55%, transparent);
    background: var(--af-green-soft);
  }

  .arch-artwork {
    width: 38px;
    height: 38px;
    object-fit: contain;
  }

  .arch-symbol {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-inset);
    color: var(--af-ink-faint);
    font-family: var(--af-mono);
    font-size: 12px;
  }

  .arch-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .arch-name {
    font-size: 13px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arch-description {
    font-size: 10px;
    line-height: 1.6;
    color: var(--af-ink-faint);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .arch-link .d-edge-path {
    stroke: var(--af-rule-strong);
    stroke-width: 1.5;
  }

  .arch-link.is-related .d-edge-path {
    stroke: var(--af-green);
    stroke-width: 2;
  }

  .arch-link.is-selected .d-edge-path {
    stroke: var(--af-blue);
    stroke-width: 2.4;
  }

  .arch-link-label {
    font-size: 9.5px;
    fill: var(--af-ink-faint);
    paint-order: stroke;
    stroke: var(--af-paper-raised);
    stroke-width: 5px;
    stroke-linejoin: round;
  }

  #arch-neutral .diagram-arrow {
    fill: var(--af-rule-strong);
    stroke: var(--af-rule-strong);
  }

  #arch-selected .diagram-arrow {
    fill: var(--af-blue);
    stroke: var(--af-blue);
  }
`;
