export { ArtifactArchitectureMap } from './element';
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

import { ArtifactArchitectureMap } from './element';

export const ARCHITECTURE_MAP_TAG = 'artifact-architecture-map';

export const defineArchitectureMap = (tag = ARCHITECTURE_MAP_TAG): void => {
  if (!customElements.get(tag)) customElements.define(tag, ArtifactArchitectureMap);
};
