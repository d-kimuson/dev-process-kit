export { DpkArchitectureMap } from './element';
export { architectureMapMessages } from './messages';
export type { ArchitectureMapMessages } from './messages';
export { SERVICE_SIZE, boundaryBoxes, emptyArchitectureData, parseArchitectureData } from './model';
export type {
  ArchitectureBoundary,
  ArchitectureData,
  ArchitectureLink,
  ArchitectureService,
  BoundaryBox,
  BoundaryKind,
  ServiceArtwork,
} from './model';

import { registerDiagram } from '../diagram/registry';
import { DpkArchitectureMap } from './element';
import { architectureMapMessages } from './messages';
import { emptyArchitectureData } from './model';

export const defineArchitectureMap = (): void => {
  if (!customElements.get('dpk-architecture-map')) customElements.define('dpk-architecture-map', DpkArchitectureMap);
  registerDiagram({
    tag: 'dpk-architecture-map',
    label: (locale) => architectureMapMessages(locale).heading,
    seed: emptyArchitectureData,
  });
};
