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

import { registerDiagram } from '../diagram/registry';
import { DpkMindMap } from './element';
import { mindMapMessages } from './messages';
import { emptyMindMapData } from './model';

export const defineMindMap = (): void => {
  if (!customElements.get('dpk-mind-map')) customElements.define('dpk-mind-map', DpkMindMap);
  registerDiagram({
    tag: 'dpk-mind-map',
    label: (locale) => mindMapMessages(locale).heading,
    seed: emptyMindMapData,
  });
};
