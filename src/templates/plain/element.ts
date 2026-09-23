import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { PlainState } from './model';

import { ArtifactElement } from '../../core/element';
import { plainDefinition } from './definition';

/**
 * `<artifact-plain>` — the shell and the review pipeline, and nothing else.
 *
 * For a page no other template fits: the author owns every region
 * (`slot="header"`, `slot="main"`, `slot="footer"`, …), and the template only
 * brings the header chrome, the review rail, persistence and the hand-off.
 * Diagram elements placed inside register their own comment targets, and
 * `sections` in the base data make prose commentable too.
 */
export class PlainElement extends ArtifactElement<PlainState> {
  readonly definition = plainDefinition;

  protected override renderRegions(_context: TemplateRenderContext<PlainState>): ShellRegions {
    return {};
  }
}

export const definePlainElement = (tag = 'artifact-plain'): void => {
  if (!customElements.get(tag)) customElements.define(tag, PlainElement);
};
