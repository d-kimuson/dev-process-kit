import { css } from 'lit';

export const bpmnStyles = css`
  :host {
    /* A colour family per element kind; each reads at 3:1 or more on the canvas in both themes. */
    --bpmn-start: var(--dpk-green);
    --bpmn-intermediate: var(--dpk-amber);
    --bpmn-end: var(--dpk-danger);
    --bpmn-gateway: var(--dpk-violet);
    --bpmn-task: color-mix(in oklab, var(--dpk-blue) 30%, var(--dpk-ink-soft));
    --bpmn-data: color-mix(in oklab, var(--dpk-blue) 18%, var(--dpk-ink-faint));
    --bpmn-message: light-dark(#0a7684, #3cc0cf);
    --bpmn-line: color-mix(in oklab, var(--dpk-ink-soft) 80%, var(--dpk-ink-faint));
    --bpmn-paper: var(--dpk-paper-raised);

    /* Pools take these hues in turn (the element sets --bpmn-hue on each pool). */
    --bpmn-hue-0: var(--dpk-accent);
    --bpmn-hue-1: var(--dpk-amber);
    --bpmn-hue-2: var(--dpk-blue);
    --bpmn-hue-3: var(--dpk-green);
    --bpmn-hue-4: var(--dpk-violet);
  }

  /* ---- pools and lanes (drawn behind the graph) ---- */

  .bpmn-frames {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .bpmn-pool {
    --bpmn-frame: color-mix(in oklab, var(--bpmn-hue) 45%, var(--dpk-ink-faint));
    --bpmn-head: color-mix(in srgb, var(--bpmn-hue) 15%, var(--dpk-paper-raised));
    --bpmn-head-ink: color-mix(in oklab, var(--bpmn-hue) 62%, var(--dpk-ink));
    position: absolute;
    left: 0;
    box-sizing: border-box;
    border: 1px solid var(--bpmn-frame);
    border-radius: var(--dpk-radius-lg);
    background: color-mix(in srgb, var(--bpmn-hue) 3%, var(--dpk-paper-raised));
    box-shadow: var(--dpk-shadow-sm);
    overflow: hidden;
  }

  .bpmn-lane {
    position: absolute;
    left: 0;
    right: 0;
    box-sizing: border-box;
    border: 0;
    color: var(--bpmn-frame);
  }

  .bpmn-lane + .bpmn-lane {
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--bpmn-frame) 55%, transparent);
  }

  .bpmn-lane:nth-child(2n) {
    background: color-mix(in srgb, var(--bpmn-hue) 4%, transparent);
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
    border: 0;
    background: var(--bpmn-head);
    color: var(--bpmn-head-ink);
    pointer-events: auto;
    overflow: hidden;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
    transition: background var(--dpk-dur-fast) var(--dpk-ease);
  }

  .bpmn-pool-head:hover,
  .bpmn-lane-head:hover {
    background: color-mix(in srgb, var(--bpmn-hue) 24%, var(--dpk-paper-raised));
  }

  .bpmn-pool-head:focus-visible,
  .bpmn-lane-head:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--dpk-blue);
  }

  .bpmn-pool-head {
    z-index: 2;
    width: 32px;
    height: 100%;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.14em;
  }

  /* A pool without lanes is a single row: its name reads across, on a header chip at its start. */
  .bpmn-pool.is-black-box .bpmn-pool-head {
    width: auto;
    min-width: 32px;
    padding: 0 18px;
    writing-mode: horizontal-tb;
    letter-spacing: 0.04em;
  }

  .bpmn-lane-head {
    z-index: 2;
    left: 32px;
    width: 28px;
    height: 100%;
    border-left: 1px solid color-mix(in srgb, var(--bpmn-frame) 45%, transparent);
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.12em;
    background: color-mix(in srgb, var(--bpmn-hue) 7%, var(--dpk-paper-raised));
    color: color-mix(in oklab, var(--bpmn-hue) 35%, var(--dpk-ink-soft));
  }

  .bpmn-lane-head:hover {
    background: color-mix(in srgb, var(--bpmn-hue) 14%, var(--dpk-paper-raised));
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

  /* Each node paints from one tone: its outline, its marks and a tint of its fill. */
  .bpmn-shape {
    --bpmn-tone: var(--bpmn-line);
    --bpmn-fill: 8%;
  }

  .bpmn-shape.tone-start {
    --bpmn-tone: var(--bpmn-start);
    --bpmn-fill: 12%;
  }

  .bpmn-shape.tone-intermediate {
    --bpmn-tone: var(--bpmn-intermediate);
    --bpmn-fill: 12%;
  }

  .bpmn-shape.tone-end {
    --bpmn-tone: var(--bpmn-end);
    --bpmn-fill: 12%;
  }

  .bpmn-shape.tone-gateway {
    --bpmn-tone: var(--bpmn-gateway);
    --bpmn-fill: 12%;
  }

  .bpmn-shape.tone-task {
    --bpmn-tone: var(--bpmn-task);
    --bpmn-fill: 3%;
    filter: drop-shadow(0 1px 1px var(--dpk-shade-1)) drop-shadow(0 4px 8px var(--dpk-shade-2));
  }

  .bpmn-shape.tone-data {
    --bpmn-tone: var(--bpmn-data);
    --bpmn-fill: 6%;
    filter: drop-shadow(0 1px 2px var(--dpk-shade-1));
  }

  .bpmn-shape.tone-note {
    --bpmn-tone: var(--dpk-ink-faint);
  }

  .bpmn-shape .surface {
    fill: color-mix(in srgb, var(--bpmn-tone) var(--bpmn-fill), var(--dpk-paper-raised));
    stroke: var(--bpmn-tone);
    stroke-width: 1.6;
    stroke-linejoin: round;
    transition:
      stroke var(--dpk-dur) var(--dpk-ease),
      fill var(--dpk-dur) var(--dpk-ease);
  }

  .bpmn-shape .line {
    fill: none;
    stroke: var(--bpmn-tone);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .bpmn-shape.tone-gateway .line {
    stroke-width: 2.4;
  }

  .bpmn-shape .strong {
    stroke-width: 3.5;
  }

  .bpmn-shape .filled {
    fill: var(--bpmn-tone);
    stroke: none;
  }

  .bpmn-shape .note {
    fill: color-mix(in srgb, var(--dpk-amber) 7%, var(--dpk-paper-raised));
    stroke: none;
  }

  /* A task type icon sits on a chip in the type's own colour. */
  .task-icon {
    --bpmn-tone: var(--dpk-ink-soft);
  }

  .task-icon.icon-user {
    --bpmn-tone: var(--dpk-blue);
  }

  .task-icon.icon-service {
    --bpmn-tone: var(--dpk-violet);
  }

  .task-icon.icon-manual {
    --bpmn-tone: var(--dpk-amber);
  }

  .task-icon:is(.icon-send, .icon-receive) {
    --bpmn-tone: var(--bpmn-message);
  }

  .task-icon .chip {
    fill: color-mix(in srgb, var(--bpmn-tone) 14%, var(--dpk-paper-raised));
    stroke: none;
  }

  .task-icon .line {
    stroke-width: 1.5;
  }

  .bpmn-node:focus-visible {
    outline: none;
  }

  .bpmn-node.is-related .bpmn-shape {
    --bpmn-tone: var(--dpk-green);
  }

  .bpmn-node:focus-visible .bpmn-shape,
  .bpmn-node.is-selected .bpmn-shape {
    --bpmn-tone: var(--dpk-blue);
    --bpmn-fill: 10%;
  }

  .bpmn-node:focus-visible .bpmn-shape :is(.surface, .line),
  .bpmn-node.is-selected .bpmn-shape :is(.surface, .line) {
    stroke-width: 2.4;
  }

  .bpmn-node:focus-visible .bpmn-shape .surface,
  .bpmn-node.is-selected .bpmn-shape .surface {
    filter: drop-shadow(0 0 4px var(--dpk-blue-soft)) drop-shadow(0 0 1px var(--dpk-blue-soft));
  }

  .bpmn-task-label {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    width: 104px;
    font-size: 11.5px;
    line-height: 16px;
    font-weight: 620;
    letter-spacing: 0.01em;
    text-align: center;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    overflow: hidden;
  }

  /* The type icon owns the card's top-left corner; the name starts clear of it. */
  .bpmn-node.has-icon .bpmn-task-label {
    padding-left: 20px;
    padding-right: 4px;
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
    font-weight: 560;
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
    --d-edge-line: var(--bpmn-message);
  }

  .bpmn-flow.is-association {
    --d-edge-line: var(--dpk-ink-faint);
  }

  .bpmn-flow.is-related {
    --d-edge-line: var(--dpk-green);
  }

  /* A selected flow takes the accent in one place: the line must read the
     same variable as its head, or the base selected rule leaves them two
     colours. It comes after the kind colours so a selected message wins too. */
  .bpmn-flow.is-selected {
    --d-edge-line: var(--dpk-blue);
  }

  .bpmn-flow.is-selected .d-edge-path,
  .bpmn-flow:has(.d-edge-hit:focus-visible) .d-edge-path {
    stroke: var(--d-edge-line);
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
    --bpmn-chip: var(--bpmn-line);
    margin: 0;
    padding: 1px 8px;
    border: 1px solid color-mix(in srgb, var(--bpmn-chip) 30%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--bpmn-chip) 7%, var(--dpk-paper-raised));
    box-shadow: var(--dpk-shadow-xs);
    color: color-mix(in oklab, var(--bpmn-chip) 45%, var(--dpk-ink));
    font: inherit;
    font-size: 11px;
    font-weight: 560;
    line-height: 1.45;
    white-space: nowrap;
    cursor: pointer;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bpmn-flow-label.is-message {
    --bpmn-chip: var(--bpmn-message);
  }

  .bpmn-flow-label:hover,
  .bpmn-flow-label:focus-visible {
    border-color: var(--dpk-blue);
    color: var(--dpk-blue);
    outline: none;
  }

  .bpmn-flow-label.is-related {
    border-color: var(--dpk-green);
    color: var(--dpk-ink);
  }

  .bpmn-flow-label.is-selected {
    border-color: var(--dpk-blue);
    color: var(--dpk-blue);
    box-shadow: 0 0 0 2px var(--dpk-blue-soft);
  }
`;
