export { DpkDependencyGraph } from './element';
export { dependencyGraphMessages } from './messages';
export type { DependencyGraphMessages } from './messages';
export { MODULE_SIZE, emptyDependencyData, parseDependencyData } from './model';
export type { DependencyData, DependencyDirection, DependencyLink, DependencyModule } from './model';

import { registerDiagram } from '../diagram/registry';
import { DpkDependencyGraph } from './element';
import { dependencyGraphMessages } from './messages';
import { emptyDependencyData } from './model';

export const defineDependencyGraph = (): void => {
  if (!customElements.get('dpk-dependency-graph')) customElements.define('dpk-dependency-graph', DpkDependencyGraph);
  registerDiagram({
    tag: 'dpk-dependency-graph',
    label: (locale) => dependencyGraphMessages(locale).heading,
    seed: emptyDependencyData,
  });
};
