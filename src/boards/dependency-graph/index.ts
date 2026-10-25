export { DpkBoardDependencyGraph } from './element';
export { dependencyGraphMessages } from './messages';
export type { DependencyGraphMessages } from './messages';
export { MODULE_SIZE, emptyDependencyData, parseDependencyData } from './model';
export type { DependencyData, DependencyDirection, DependencyLink, DependencyModule } from './model';

import { DpkBoardDependencyGraph } from './element';

export const defineDependencyGraph = (): void => {
  if (!customElements.get('dpk-board-dependency-graph'))
    customElements.define('dpk-board-dependency-graph', DpkBoardDependencyGraph);
};
