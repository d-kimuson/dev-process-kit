export { ArtifactErDiagram } from './element';
export { TABLE_WIDTH, emptyErData, fieldOffset, fieldRowHeight, parseErData, tableHeight } from './model';
export type { ErData, ErField, ErFieldDiff, ErKey, ErRelation, ErStatus, ErTableDiff } from './model';

import { ArtifactErDiagram } from './element';

export const ER_DIAGRAM_TAG = 'artifact-er-diagram';

export const defineErDiagram = (tag = ER_DIAGRAM_TAG): void => {
  if (!customElements.get(tag)) customElements.define(tag, ArtifactErDiagram);
};
