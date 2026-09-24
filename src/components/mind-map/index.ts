export { DpkComponentMindMap } from './element';
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

import { DpkComponentMindMap } from './element';

export const defineMindMap = (): void => {
  if (!customElements.get('dpk-component-mind-map'))
    customElements.define('dpk-component-mind-map', DpkComponentMindMap);
};
