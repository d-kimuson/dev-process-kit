import { svg, type TemplateResult } from 'lit';

import type { BpmnNode } from './model';

/**
 * The shapes a BPMN node draws, as SVG. Geometry only: paint and state live
 * in `styles.ts`, so a selected or related node restyles its outline without
 * rebuilding it. Every path is the board's own (no icon dependency).
 */

const TASK_ICON = 14;

const envelope = (x: number, y: number, width: number, height: number, filled: boolean): TemplateResult => svg`
  <rect class=${filled ? 'filled' : 'line'} x=${x} y=${y} width=${width} height=${height} rx="1"></rect>
  ${filled ? '' : svg`<path class="line" d="M${x} ${y} L${x + width / 2} ${y + height / 2} L${x + width} ${y}"></path>`}
`;

const taskGlyph = (task: string): TemplateResult | '' => {
  const x = 8;
  const y = 8;
  const s = TASK_ICON;
  const cx = x + s / 2;
  const cy = y + s / 2;
  switch (task) {
    case 'user':
      return svg`<circle class="line" cx=${cx} cy=${y + 4.5} r="2.7"></circle>
        <path class="line" d="M${x + 2} ${y + s} Q${cx} ${y + 7} ${x + s - 2} ${y + s}"></path>`;
    case 'service':
      return svg`<circle class="line" cx=${cx} cy=${cy} r="2.4"></circle>
        <path class="line" d="M${cx} ${y + 1} v2 M${cx} ${y + s - 1} v-2 M${x + 1} ${cy} h2 M${x + s - 1} ${cy} h-2 M${x + 2.2} ${y + 2.2} l1.4 1.4 M${x + s - 2.2} ${y + s - 2.2} l-1.4 -1.4 M${x + s - 2.2} ${y + 2.2} l-1.4 1.4 M${x + 2.2} ${y + s - 2.2} l1.4 -1.4"></path>`;
    case 'manual':
      return svg`<path class="line" d="M${x + 1} ${y + 9} q2 -1 3 0 q2 2 4 0 q2 -2 3 0 v3 h-10 z"></path>`;
    case 'send':
      return envelope(x, y + 2, s, s - 4, true);
    case 'receive':
      return svg`<path class="line" d="M${x} ${y + 3} L${x + s / 2} ${y + 8} L${x + s} ${y + 3} L${x + s} ${y + s - 2} L${x} ${y + s - 2} Z"></path>`;
    case 'script':
      return svg`<path class="line" d="M${x + 1} ${y + 1} H${x + s - 4} L${x + s - 1} ${y + 4} V${y + s - 1} H${x + 1} Z"></path>
        <path class="line" d="M${x + s - 4} ${y + 1} V${y + 4} H${x + s - 1} M${x + 3} ${y + 7} H${x + s - 3} M${x + 3} ${y + 10} H${x + s - 3}"></path>`;
    default:
      return '';
  }
};

/** A task's type icon on a chip in the card's top-left corner, coloured by the type. */
const taskIcon = (task: string): TemplateResult | '' => {
  const glyph = taskGlyph(task);
  if (glyph === '') return '';
  return svg`<g class="task-icon icon-${task}">
    <rect class="chip" x="4" y="4" width="22" height="22" rx="7"></rect>
    ${glyph}
  </g>`;
};

const eventTrigger = (trigger: string, width: number, height: number, thrown: boolean): TemplateResult | '' => {
  const cx = width / 2;
  const cy = height / 2;
  if (trigger === 'message') return envelope(cx - 7, cy - 5, 14, 10, thrown);
  if (trigger === 'timer') {
    return svg`<circle class="line" cx=${cx} cy=${cy} r="5"></circle>
      <path class="line" d="M${cx} ${cy - 3.4} V${cy} L${cx + 2.6} ${cy + 1.8}"></path>`;
  }
  if (trigger === 'error') {
    return svg`<path class=${thrown ? 'filled' : 'line'} d="M${cx + 1} ${cy - 6} L${cx - 4} ${cy + 1} L${cx - 0.5} ${cy + 1} L${cx - 1.5} ${cy + 6} L${cx + 4} ${cy - 1.5} L${cx + 0.5} ${cy - 1.5} Z"></path>`;
  }
  return '';
};

const eventShape = (node: Extract<BpmnNode, { kind: 'event' }>): TemplateResult => {
  const { width, height } = node;
  const cx = width / 2;
  const cy = height / 2;
  const radius = width / 2 - 2;
  const thrown = node.event === 'end' || (node.event === 'intermediate' && node.direction === 'throw');
  return svg`
    <circle class=${node.event === 'end' ? 'surface strong' : 'surface'} cx=${cx} cy=${cy} r=${radius}></circle>
    ${node.event === 'intermediate' ? svg`<circle class="line" cx=${cx} cy=${cy} r=${radius - 4}></circle>` : ''}
    ${eventTrigger(node.trigger, width, height, thrown)}
  `;
};

const gatewayShape = (node: Extract<BpmnNode, { kind: 'gateway' }>): TemplateResult => {
  const { width, height } = node;
  const cx = width / 2;
  const cy = height / 2;
  const diamond = `${cx},2 ${width - 2},${cy} ${cx},${height - 2} 2,${cy}`;
  const mark = (() => {
    if (node.gateway === 'exclusive') {
      return svg`<path class="line" d="M${cx - 6} ${cy - 6} L${cx + 6} ${cy + 6} M${cx + 6} ${cy - 6} L${cx - 6} ${cy + 6}"></path>`;
    }
    if (node.gateway === 'parallel') {
      return svg`<path class="line" d="M${cx} ${cy - 7} V${cy + 7} M${cx - 7} ${cy} H${cx + 7}"></path>`;
    }
    if (node.gateway === 'inclusive') {
      return svg`<circle class="line" cx=${cx} cy=${cy} r="7"></circle>`;
    }
    return svg`<circle class="line" cx=${cx} cy=${cy} r="10"></circle>
      <circle class="line" cx=${cx} cy=${cy} r="7.5"></circle>
      <path class="line" d="M${cx - 3.5} ${cy - 3.5} L${cx + 3} ${cy - 4.5} L${cx + 5} ${cy} L${cx + 2.5} ${cy + 4.5} L${cx - 3.5} ${cy + 4} Z"></path>`;
  })();
  return svg`<polygon class="surface" points=${diamond}></polygon>${mark}`;
};

const taskShape = (node: Extract<BpmnNode, { kind: 'task' | 'subprocess' }>): TemplateResult => {
  const { width, height } = node;
  const subprocess = node.kind === 'subprocess';
  return svg`
    <rect class="surface" x="1.5" y="1.5" width=${width - 3} height=${height - 3} rx="12"></rect>
    ${node.kind === 'task' ? taskIcon(node.task) : ''}
    ${
      subprocess
        ? svg`<rect class="line" x=${width / 2 - 7} y=${height - 19} width="14" height="14" rx="2"></rect>
            <path class="line" d="M${width / 2} ${height - 16} V${height - 8} M${width / 2 - 4} ${height - 12} H${width / 2 + 4}"></path>`
        : ''
    }
  `;
};

const dataObjectShape = (node: Extract<BpmnNode, { kind: 'dataObject' }>): TemplateResult => {
  const { width, height } = node;
  const fold = 10;
  return svg`<path class="surface" d="M2 2 H${width - fold} L${width - 2} ${2 + fold} V${height - 2} H2 Z"></path>
    <path class="line" d="M${width - fold} 2 V${2 + fold} H${width - 2}"></path>`;
};

const annotationShape = (width: number, height: number): TemplateResult =>
  svg`<rect class="note" x="4" y="1" width=${width - 4} height=${height - 2} rx="8"></rect>
    <path class="line" d="M18 2 H4 V${height - 2} H18"></path>`;

/** The colour family a node is painted in (see `styles.ts`). */
const tone = (node: BpmnNode): string => {
  if (node.kind === 'event') return `tone-${node.event}`;
  if (node.kind === 'gateway') return 'tone-gateway';
  if (node.kind === 'dataObject') return 'tone-data';
  if (node.kind === 'annotation') return 'tone-note';
  return node.kind === 'task' ? `tone-task task-${node.task}` : 'tone-task';
};

/** The inline SVG for one node. The element positions it over the node's box. */
export const bpmnNodeShape = (node: BpmnNode): TemplateResult => {
  const body =
    node.kind === 'event'
      ? eventShape(node)
      : node.kind === 'gateway'
        ? gatewayShape(node)
        : node.kind === 'task' || node.kind === 'subprocess'
          ? taskShape(node)
          : node.kind === 'dataObject'
            ? dataObjectShape(node)
            : node.kind === 'annotation'
              ? annotationShape(node.width, node.height)
              : '';
  return svg`<svg
    class="bpmn-shape ${tone(node)}"
    width=${node.width}
    height=${node.height}
    viewBox="0 0 ${node.width} ${node.height}"
    aria-hidden="true"
    focusable="false"
  >${body}</svg>`;
};
