import { css } from 'lit';

export const bpmnStyles = css`
  :host {
    /* One line colour per flow kind is set on the flow group; the glyphs read the same. */
    --bpmn-line: var(--dpk-ink-soft);
    --bpmn-paper: var(--dpk-paper-raised);
  }

  /* ---- pools and lanes (drawn behind the graph) ---- */

  .bpmn-frames {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .bpmn-pool {
    position: absolute;
    left: 0;
    box-sizing: border-box;
    border: 1.5px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
  }

  .bpmn-lane {
    position: absolute;
    left: 0;
    right: 0;
    box-sizing: border-box;
    border: 1px solid var(--dpk-rule);
  }

  .bpmn-lane:nth-child(2n) {
    background: color-mix(in srgb, var(--dpk-paper-sunken) 55%, transparent);
  }

  .bpmn-pool-head,
  .bpmn-lane-head {
    position: absolute;
    left: 0;
    top: 0;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--dpk-rule-strong);
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
    pointer-events: auto;
    overflow: hidden;
  }

  .bpmn-pool-head {
    z-index: 2;
    width: 32px;
    height: 100%;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.02em;
  }

  .bpmn-lane-head {
    z-index: 2;
    left: 32px;
    width: 28px;
    height: 100%;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 11px;
    color: var(--dpk-ink-soft);
    border-color: var(--dpk-rule);
  }

  /* ---- nodes ---- */

  .bpmn-node {
    position: absolute;
    display: grid;
    place-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--dpk-ink);
    cursor: pointer;
  }

  .bpmn-node .bpmn-shape {
    position: absolute;
    inset: 0;
    overflow: visible;
  }

  .bpmn-shape .surface {
    fill: var(--dpk-paper-raised);
    stroke: var(--dpk-ink-soft);
    stroke-width: 1.6;
  }

  .bpmn-shape .line {
    fill: none;
    stroke: var(--dpk-ink-soft);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .bpmn-shape .strong {
    stroke-width: 3.5;
  }

  .bpmn-shape .filled {
    fill: var(--dpk-ink-soft);
    stroke: none;
  }

  .bpmn-node:focus-visible {
    outline: none;
  }

  .bpmn-node:focus-visible .bpmn-shape .surface,
  .bpmn-node:focus-visible .bpmn-shape .line {
    stroke: var(--dpk-blue);
    stroke-width: 2.6;
  }

  .bpmn-node:focus-visible .bpmn-shape .filled {
    fill: var(--dpk-blue);
  }

  .bpmn-node.is-related .bpmn-shape .surface,
  .bpmn-node.is-related .bpmn-shape .line {
    stroke: var(--dpk-green);
  }

  .bpmn-node.is-related .bpmn-shape .filled {
    fill: var(--dpk-green);
  }

  .bpmn-node.is-selected .bpmn-shape .surface,
  .bpmn-node.is-selected .bpmn-shape .line {
    stroke: var(--dpk-blue);
    stroke-width: 2.4;
  }

  .bpmn-node.is-selected .bpmn-shape .filled {
    fill: var(--dpk-blue);
  }

  .bpmn-task-label {
    position: relative;
    z-index: 1;
    max-width: 104px;
    font-size: 11.5px;
    line-height: 16px;
    font-weight: 560;
    text-align: center;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    overflow: hidden;
  }

  .bpmn-annotation-text {
    position: relative;
    z-index: 1;
    align-self: stretch;
    padding: 4px 8px 4px 22px;
    font-size: 11.5px;
    line-height: 16px;
    text-align: left;
    color: var(--dpk-ink-soft);
  }

  .bpmn-node-label {
    position: absolute;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--dpk-ink);
    font-size: 14px;
    line-height: 16px;
    text-align: center;
    cursor: pointer;
    overflow: hidden;
  }

  .bpmn-node-label > span {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bpmn-node-label:hover,
  .bpmn-node-label:focus-visible {
    color: var(--dpk-blue);
    outline: none;
  }

  /* ---- flows ---- */

  .bpmn-flow {
    --d-edge-line: var(--bpmn-line);
    --d-edge-paper: var(--dpk-paper-raised);
  }

  .bpmn-flow.is-message {
    --d-edge-line: var(--dpk-ink-soft);
  }

  .bpmn-flow.is-association {
    --d-edge-line: var(--dpk-ink-soft);
  }

  .bpmn-flow.is-message .d-edge-path {
    stroke-dasharray: 6 5;
  }

  .bpmn-flow.is-association .d-edge-path {
    stroke-dasharray: 0.1 4;
    stroke-linecap: round;
  }

  .bpmn-flow-label-slot {
    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%);
  }

  .bpmn-flow-label {
    margin: 0;
    padding: 1px 7px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 11px;
    line-height: 1.45;
    white-space: nowrap;
    cursor: pointer;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bpmn-flow-label:hover,
  .bpmn-flow-label:focus-visible {
    border-color: var(--dpk-blue);
    color: var(--dpk-blue);
    outline: none;
  }

  .bpmn-flow-label.is-related {
    border-color: var(--dpk-green);
    color: var(--dpk-green);
  }

  .bpmn-flow-label.is-selected {
    border-color: var(--dpk-blue);
    color: var(--dpk-blue);
    box-shadow: 0 0 0 2px var(--dpk-blue-soft);
  }
`;
