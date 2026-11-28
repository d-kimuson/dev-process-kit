export { DpkBoardBpmn } from './element';
export { bpmnMessages } from './messages';
export type { BpmnMessages } from './messages';
export { emptyBpmnData, parseBpmnData } from './model';
export type {
  BpmnAnnotationNode,
  BpmnAssociationDirection,
  BpmnData,
  BpmnDataObjectNode,
  BpmnDirection,
  BpmnEventNode,
  BpmnEventType,
  BpmnFlow,
  BpmnFlowKind,
  BpmnGatewayNode,
  BpmnGatewayType,
  BpmnLane,
  BpmnNode,
  BpmnPool,
  BpmnSubprocessNode,
  BpmnTaskNode,
  BpmnTaskType,
  BpmnTrigger,
} from './model';

import { DpkBoardBpmn } from './element';

export const defineBpmn = (): void => {
  if (!customElements.get('dpk-board-bpmn')) customElements.define('dpk-board-bpmn', DpkBoardBpmn);
};
