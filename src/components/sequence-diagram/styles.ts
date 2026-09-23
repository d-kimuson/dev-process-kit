import { css } from 'lit';

export const sequenceStyles = css`
  .sequence .diagram-canvas {
    background-image: none;
  }

  .sequence-rail {
    position: relative;
    height: 62px;
    flex-shrink: 0;
    overflow: hidden;
    border-bottom: 1px solid var(--af-rule);
    background: var(--af-paper);
  }

  .sequence-rail-world {
    position: absolute;
    top: 0;
    left: 0;
    height: 62px;
    transform-origin: 0 0;
  }

  .sequence-participant {
    position: absolute;
    top: 9px;
    width: 190px;
    height: 44px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 10px;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-sm);
    background: var(--af-paper-raised);
    box-shadow: var(--af-shadow-xs);
    text-align: left;
    cursor: pointer;
  }

  .sequence-participant.is-external {
    border-style: dashed;
  }

  .sequence-participant[aria-pressed='true'] {
    border-color: var(--af-blue);
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .sequence-participant.is-related {
    border-color: color-mix(in srgb, var(--af-green) 60%, transparent);
  }

  .sequence-symbol {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-inset);
    color: var(--af-ink-faint);
    font-family: var(--af-mono);
    font-size: 9.5px;
  }

  .sequence-participant.is-external .sequence-symbol {
    background: var(--af-amber-soft);
    color: var(--af-amber);
  }

  .sequence-name {
    display: block;
    font-size: 11.5px;
    font-weight: 640;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sequence-role {
    display: block;
    margin-top: 2px;
    font-size: 9px;
    color: var(--af-ink-faint);
  }

  .sequence-lifeline {
    stroke: var(--af-rule-strong);
    stroke-width: 1;
    stroke-dasharray: 4 6;
  }

  .sequence-divider {
    stroke: var(--af-rule-strong);
    stroke-dasharray: 4 4;
  }

  .sequence-message {
    fill: none;
    stroke: var(--af-ink-faint);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  .sequence-message.is-response {
    stroke-dasharray: 5 4;
  }

  .sequence-message.is-async {
    stroke: var(--af-blue);
  }

  .sequence-message-row.is-related .sequence-message {
    stroke: var(--af-green);
    stroke-width: 2;
  }

  .sequence-message-row.is-selected .sequence-message {
    stroke: var(--af-ink);
    stroke-width: 2.4;
  }

  .sequence-message-row.is-dimmed,
  .sequence-label.is-dimmed {
    opacity: 0.24;
  }

  .sequence-frame {
    position: absolute;
    border: 1px solid var(--af-rule-strong);
    border-radius: var(--af-radius-xs);
    background: color-mix(in srgb, var(--af-blue-soft) 50%, transparent);
    pointer-events: none;
  }

  .sequence-frame-header {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 9px;
    border: 1px solid var(--af-rule-strong);
    border-bottom: 0;
    border-radius: var(--af-radius-xs) var(--af-radius-xs) 0 0;
    background: var(--af-paper-sunken);
    color: var(--af-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-frame-header:hover {
    background: var(--af-paper-inset);
    color: var(--af-ink);
  }

  .sequence-operator {
    min-width: 26px;
    font-family: var(--af-mono);
    font-weight: 700;
    color: var(--af-blue);
  }

  .sequence-frame-count {
    margin-left: auto;
    font-family: var(--af-mono);
    font-size: 9px;
    color: var(--af-ink-faint);
  }

  .sequence-branch {
    position: absolute;
    font-size: 9.5px;
    color: var(--af-ink-faint);
  }

  .sequence-fold {
    position: absolute;
    font-size: 10px;
    color: var(--af-ink-faint);
  }

  .sequence-label {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
    max-height: 27px;
    padding: 3px 5px;
    border: 1px solid transparent;
    border-radius: var(--af-radius-xs);
    background: var(--af-paper-raised);
    color: var(--af-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-label:hover {
    border-color: color-mix(in srgb, var(--af-blue) 40%, transparent);
    color: var(--af-blue);
  }

  .sequence-label.is-selected {
    border-color: color-mix(in srgb, var(--af-blue) 55%, transparent);
    background: var(--af-blue-soft);
    color: var(--af-blue);
  }

  .sequence-number {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 19px;
    height: 17px;
    border: 1px solid var(--af-rule-strong);
    border-radius: 3px;
    font-family: var(--af-mono);
    font-size: 8px;
    font-variant-numeric: tabular-nums;
    color: var(--af-ink-faint);
  }

  .sequence-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #seq-request .diagram-arrow,
  #seq-response .diagram-arrow {
    fill: var(--af-ink-faint);
    stroke: var(--af-ink-faint);
  }

  #seq-async .diagram-arrow {
    stroke: var(--af-blue);
  }

  #seq-related .diagram-arrow {
    fill: var(--af-green);
    stroke: var(--af-green);
  }

  #seq-selected .diagram-arrow {
    fill: var(--af-ink);
    stroke: var(--af-ink);
  }
`;
