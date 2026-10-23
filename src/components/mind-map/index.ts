export { DpkMindMap } from './element';
export { branchPath, layoutMindMap } from './layout';
export { mindMapMessages } from './messages';
export type { MindMapMessages } from './messages';
export {
  ancestorsOf,
  assignSides,
  descendantCount,
  emptyMindMapData,
  estimateTextWidth,
  parseMindMapData,
  topicSize,
  visibleMindMap,
} from './model';
export type { MindMapData, MindMapEdge, MindMapNode, MindMapSide } from './model';

import { DpkMindMap } from './element';

export const defineMindMap = (): void => {
  if (!customElements.get('dpk-mind-map')) customElements.define('dpk-mind-map', DpkMindMap);
};
