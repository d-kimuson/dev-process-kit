import { css } from 'lit';

export const stateDiagramStyles = css`
  :host {
    /* One colour for a transition's line and its arrowhead, readable on the canvas in both themes. */
    --state-line: var(--dpk-ink-faint);
    --state-exception: var(--dpk-amber);
  }

  .state-node {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    padding: 0 14px;
    border: 1px solid var(--dpk-ink-faint);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    text-align: left;
    overflow: hidden;
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease);
  }

  .state-node:hover {
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    transform: translateY(-1px);
  }

  .state-node.is-terminal {
    border: 3px double var(--state-line);
  }

  .state-node.is-compensation {
    border-color: var(--state-exception);
    background: color-mix(in srgb, var(--state-exception) 9%, var(--dpk-paper-raised));
  }

  .state-node.is-related {
    border-color: var(--dpk-green);
  }

  .state-node.is-selected {
    border-color: var(--dpk-blue);
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow-sm),
      0 0 0 3px var(--dpk-blue-soft);
  }

  .state-title {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .state-name {
    min-width: 0;
    font-size: 14px;
    font-weight: 620;
    line-height: 1.35;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .state-code {
    font-family: var(--dpk-mono);
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0.01em;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Where the lifecycle starts: the filled dot of a state chart, kept inside the state so no line can run over it. */
  .state-initial-mark {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--dpk-ink-soft);
  }

  /* Where it ends: the ringed dot. */
  .state-terminal-mark {
    flex: none;
    box-sizing: border-box;
    width: 11px;
    height: 11px;
    border: 1.5px solid var(--dpk-ink-soft);
    border-radius: 50%;
    background: radial-gradient(circle, var(--dpk-ink-soft) 0 2.5px, transparent 3px);
  }

  /* The slot centres a label on the point the router chose and carries the label's comment icon beside it. */
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
    box-sizing: border-box;
    height: 22px;
    padding: 0 7px;
    border: 1px solid color-mix(in srgb, var(--dpk-ink-faint) 55%, transparent);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    font-weight: 520;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition:
      border-color 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }

  .state-label.is-exception {
    border-color: color-mix(in srgb, var(--state-exception) 70%, transparent);
  }

  .state-label:hover {
    border-color: var(--dpk-blue);
    color: var(--dpk-ink);
  }

  .state-label.is-related {
    border-color: var(--dpk-green);
    color: var(--dpk-ink);
  }

  .state-label.is-selected {
    border-color: var(--dpk-blue);
    background: color-mix(in srgb, var(--dpk-blue) 12%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-weight: 620;
  }

  .state-label.is-dimmed {
    opacity: 0.35;
  }

  .state-edge .d-edge-path {
    stroke: var(--state-line);
    stroke-width: 1.5px;
    stroke-linejoin: round;
  }

  .state-edge.is-exception .d-edge-path {
    stroke: var(--state-exception);
    stroke-dasharray: 5 4;
  }

  .state-edge.is-related .d-edge-path {
    stroke: var(--dpk-green);
    stroke-width: 2px;
  }

  .state-edge.is-selected .d-edge-path {
    stroke: var(--dpk-blue);
    stroke-width: 2.2px;
  }

  #state-arrow .diagram-arrow {
    fill: var(--state-line);
    stroke: var(--state-line);
  }

  #state-arrow-selected .diagram-arrow {
    fill: var(--dpk-blue);
    stroke: var(--dpk-blue);
  }

  #state-arrow-related .diagram-arrow {
    fill: var(--dpk-green);
    stroke: var(--dpk-green);
  }

  #state-arrow-exception .diagram-arrow {
    fill: var(--state-exception);
    stroke: var(--state-exception);
  }
`;
