export { DpkBoardArchitectureMap } from './element';
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

import { DpkBoardArchitectureMap } from './element';

export const defineArchitectureMap = (): void => {
  if (!customElements.get('dpk-board-architecture-map'))
    customElements.define('dpk-board-architecture-map', DpkBoardArchitectureMap);
};
