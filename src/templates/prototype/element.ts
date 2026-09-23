import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { PrototypeState } from './model';

import { TemplateElement } from '../../core/element';
import { prototypeDefinition } from './definition';
import { renderNav } from './render/nav';
import { renderStage } from './render/stage';
import { prototypeStyles } from './styles';

/**
 * `<dpk-template-prototype>`.
 *
 * Navigation is a pair of selects (Activity, UserStory) plus the step list of the
 * selected story. A step may declare several previews; they are shown as tabs so
 * one experience state is visible at a time (mobile / desktop / native).
 *
 * Preview markup stays in the light DOM (`slot="preview"` + `data-preview-id`)
 * and is routed into the frame slot of the matching preview metadata. Frames
 * must be rendered by this element (not by a nested custom element) because slot
 * assignment does not cross shadow roots — which is why the stage is a render
 * function, not a child element.
 *
 * The template has no ephemeral UI state of its own: everything it shows is a
 * function of the template state and the navigation hash.
 */
export class DpkTemplatePrototype extends TemplateElement<PrototypeState> {
  static override styles = [TemplateElement.styles, prototypeStyles];

  readonly definition = prototypeDefinition;

  protected override renderRegions(context: TemplateRenderContext<PrototypeState>): ShellRegions {
    return {
      sidebar: renderNav(context),
      main: renderStage(context, { hasPreviewContent: (previewId) => this.#hasPreviewContent(previewId) }),
    };
  }

  #hasPreviewContent(previewId: string): boolean {
    return Array.from(this.querySelectorAll('[data-preview-id]')).some(
      (element) => element.getAttribute('data-preview-id') === previewId,
    );
  }
}

export const definePrototypeElement = (): void => {
  if (!customElements.get('dpk-template-prototype'))
    customElements.define('dpk-template-prototype', DpkTemplatePrototype);
};
