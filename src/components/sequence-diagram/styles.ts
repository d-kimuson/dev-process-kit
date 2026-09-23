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
    border-bottom: 1px solid var(--dpk-rule);
    background: var(--dpk-paper);
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
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    text-align: left;
    cursor: pointer;
  }

  .sequence-participant.is-external {
    border-style: dashed;
  }

  .sequence-participant[aria-pressed='true'] {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .sequence-participant.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 60%, transparent);
  }

  .sequence-symbol {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
  }

  .sequence-participant.is-external .sequence-symbol {
    background: var(--dpk-amber-soft);
    color: var(--dpk-amber);
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
    color: var(--dpk-ink-faint);
  }

  .sequence-lifeline {
    stroke: var(--dpk-rule-strong);
    stroke-width: 1;
    stroke-dasharray: 4 6;
  }

  .sequence-divider {
    stroke: var(--dpk-rule-strong);
    stroke-dasharray: 4 4;
  }

  .sequence-message {
    fill: none;
    stroke: var(--dpk-ink-faint);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  .sequence-message.is-response {
    stroke-dasharray: 5 4;
  }

  .sequence-message.is-async {
    stroke: var(--dpk-blue);
  }

  .sequence-message-row.is-related .sequence-message {
    stroke: var(--dpk-green);
    stroke-width: 2;
  }

  .sequence-message-row.is-selected .sequence-message {
    stroke: var(--dpk-ink);
    stroke-width: 2.4;
  }

  .sequence-message-row.is-dimmed,
  .sequence-label.is-dimmed {
    opacity: 0.24;
  }

  .sequence-frame {
    position: absolute;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
    background: color-mix(in srgb, var(--dpk-blue-soft) 50%, transparent);
    pointer-events: none;
  }

  .sequence-frame-header {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 9px;
    border: 1px solid var(--dpk-rule-strong);
    border-bottom: 0;
    border-radius: var(--dpk-radius-xs) var(--dpk-radius-xs) 0 0;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-frame-header:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  .sequence-operator {
    min-width: 26px;
    font-family: var(--dpk-mono);
    font-weight: 700;
    color: var(--dpk-blue);
  }

  .sequence-frame-count {
    margin-left: auto;
    font-family: var(--dpk-mono);
    font-size: 9px;
    color: var(--dpk-ink-faint);
  }

  .sequence-branch {
    position: absolute;
    font-size: 9.5px;
    color: var(--dpk-ink-faint);
  }

  .sequence-fold {
    position: absolute;
    font-size: 10px;
    color: var(--dpk-ink-faint);
  }

  .sequence-label {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
    max-height: 27px;
    padding: 3px 5px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 10px;
    text-align: left;
    cursor: pointer;
  }

  .sequence-label:hover {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    color: var(--dpk-blue);
  }

  .sequence-label.is-selected {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
  }

  .sequence-number {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 19px;
    height: 17px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 3px;
    font-family: var(--dpk-mono);
    font-size: 8px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .sequence-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #seq-request .diagram-arrow,
  #seq-response .diagram-arrow {
    fill: var(--dpk-ink-faint);
    stroke: var(--dpk-ink-faint);
  }

  #seq-async .diagram-arrow {
    stroke: var(--dpk-blue);
  }

  #seq-related .diagram-arrow {
    fill: var(--dpk-green);
    stroke: var(--dpk-green);
  }

  #seq-selected .diagram-arrow {
    fill: var(--dpk-ink);
    stroke: var(--dpk-ink);
  }
`;
