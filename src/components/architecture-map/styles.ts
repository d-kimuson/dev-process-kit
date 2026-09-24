import { css } from 'lit';

export const architectureStyles = css`
  .arch-toggle {
    min-height: 26px;
    padding: 0 9px;
    font-size: 10.5px;
  }

  .arch-toggle[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .arch-boundary {
    position: absolute;
    border: 1.5px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: color-mix(in srgb, var(--dpk-blue) 3%, transparent);
    pointer-events: none;
  }

  .arch-boundary.is-external {
    border-color: color-mix(in srgb, var(--dpk-amber) 45%, transparent);
    background: color-mix(in srgb, var(--dpk-amber) 4%, transparent);
  }

  .arch-boundary span {
    position: absolute;
    top: 9px;
    left: 14px;
    padding: 2px 7px;
    border-radius: 999px;
    background: var(--dpk-glass);
    backdrop-filter: blur(8px);
    font-family: var(--dpk-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dpk-ink-faint);
  }

  .arch-service {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 14px 13px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    text-align: left;
    overflow: hidden;
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease);
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
      0 0 0 3px var(--dpk-blue-soft);
  }

  .arch-service.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 55%, transparent);
    background: var(--dpk-green-soft);
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
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 12px;
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
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
    color: var(--dpk-ink-faint);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .arch-link .d-edge-path {
    stroke: var(--dpk-rule-strong);
    stroke-width: 1.5;
  }

  .arch-link.is-related .d-edge-path {
    stroke: var(--dpk-green);
    stroke-width: 2;
  }

  .arch-link.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.4;
  }

  .arch-link-label {
    font-size: 9.5px;
    fill: var(--dpk-ink-faint);
    paint-order: stroke;
    stroke: var(--dpk-paper-raised);
    stroke-width: 5px;
    stroke-linejoin: round;
  }

  #arch-neutral .diagram-arrow {
    fill: var(--dpk-rule-strong);
    stroke: var(--dpk-rule-strong);
  }

  #arch-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }
`;
