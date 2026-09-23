export { DpkComponentDependencyGraph } from './element';
export { MODULE_SIZE, emptyDependencyData, parseDependencyData } from './model';
export type { DependencyData, DependencyDirection, DependencyLink, DependencyModule } from './model';

import { DpkComponentDependencyGraph } from './element';

export const defineDependencyGraph = (): void => {
  if (!customElements.get('dpk-component-dependency-graph'))
    customElements.define('dpk-component-dependency-graph', DpkComponentDependencyGraph);
};
