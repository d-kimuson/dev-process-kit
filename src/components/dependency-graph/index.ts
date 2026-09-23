export { ArtifactDependencyGraph } from './element';
export { MODULE_SIZE, emptyDependencyData, parseDependencyData } from './model';
export type { DependencyData, DependencyDirection, DependencyLink, DependencyModule } from './model';

import { ArtifactDependencyGraph } from './element';

export const DEPENDENCY_GRAPH_TAG = 'artifact-dependency-graph';

export const defineDependencyGraph = (tag = DEPENDENCY_GRAPH_TAG): void => {
  if (!customElements.get(tag)) customElements.define(tag, ArtifactDependencyGraph);
};
