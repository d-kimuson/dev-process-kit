import { css } from 'lit';

export const stateDiagramStyles = css`
  .state-node {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 0 15px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
    text-align: left;
    overflow: hidden;
  }

  .state-node:hover {
    border-color: var(--dpk-blue);
  }

  .state-node.is-initial {
    border-left-width: 3px;
  }

  .state-node.is-terminal {
    border: 3px double var(--dpk-rule-strong);
  }

  .state-node.is-compensation {
    border-color: color-mix(in srgb, var(--dpk-amber) 50%, transparent);
    background: var(--dpk-amber-soft);
  }

  .state-node.is-selected {
    border-color: var(--dpk-blue);
    box-shadow: 0 0 0 3px var(--dpk-blue-soft);
  }

  .state-node.is-related {
    border-color: color-mix(in srgb, var(--dpk-green) 60%, transparent);
  }

  .state-code {
    font-family: var(--dpk-mono);
    font-size: 9px;
    letter-spacing: 0.02em;
    color: var(--dpk-ink-faint);
  }

  .state-name {
    font-size: 13.5px;
    font-weight: 640;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The slot centres a label on its route and carries the label's comment icon beside it. */
  .state-label-slot {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
  }

  /* Overlaps the label by a hair so the pointer never crosses a gap that would hide it. */
  .state-label-slot > .diagram-comment-trigger {
    position: absolute;
    left: calc(100% - 2px);
    top: 50%;
    transform: translateY(-50%);
  }

  .state-label {
    max-width: 190px;
    padding: 3px 7px;
    border: 1px solid transparent;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 10px;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .state-label:hover {
    border-color: color-mix(in srgb, var(--dpk-blue) 40%, transparent);
    color: var(--dpk-blue);
  }

  .state-label.is-selected {
    border-color: color-mix(in srgb, var(--dpk-blue) 55%, transparent);
    background: var(--dpk-blue-soft);
    color: var(--dpk-blue);
    font-weight: 600;
  }

  .state-label.is-dimmed {
    opacity: 0.35;
  }

  .state-edge.is-exception .d-edge-path {
    stroke: color-mix(in srgb, var(--dpk-amber) 65%, var(--dpk-rule-strong));
    stroke-dasharray: 5 4;
  }

  .state-edge.is-related .d-edge-path {
    stroke: var(--dpk-green);
  }

  .state-edge.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
  }

  .state-initial-mark {
    fill: var(--dpk-ink-faint);
    stroke: var(--dpk-ink-faint);
  }

  .state-initial-mark.is-dimmed {
    opacity: 0.26;
  }

  #state-arrow .diagram-arrow {
    fill: var(--dpk-ink-faint);
    stroke: var(--dpk-ink-faint);
  }

  #state-arrow-active .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }

  #state-arrow-exception .diagram-arrow {
    fill: var(--dpk-amber);
    stroke: var(--dpk-amber);
  }
`;
