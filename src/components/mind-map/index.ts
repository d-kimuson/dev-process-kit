export { ArtifactMindMap } from './element';
export { branchPath, layoutMindMap } from './layout';
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

import { ArtifactMindMap } from './element';

export const MIND_MAP_TAG = 'artifact-mind-map';

export const defineMindMap = (tag = MIND_MAP_TAG): void => {
  if (!customElements.get(tag)) customElements.define(tag, ArtifactMindMap);
};
