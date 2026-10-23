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

import { DpkArchitectureMap } from './element';

export const defineArchitectureMap = (): void => {
  if (!customElements.get('dpk-architecture-map')) customElements.define('dpk-architecture-map', DpkArchitectureMap);
};
