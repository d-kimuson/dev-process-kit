import type { Locale } from '../../core/i18n';
import type { ShellRegions, ViewRenderContext } from '../../core/shell/contracts';
import type { PlainState } from './model';

import { ViewElement } from '../../core/element';
import { plainDefinitionFor } from './definition';

/**
 * `<dpk-view-plain>` — the shell and the review pipeline, and nothing else.
 *
 * For a page no other template fits: the author owns every region
 * (`slot="header"`, `slot="main"`, `slot="footer"`, …), and the template
 * only brings the page chrome, the review rail, persistence and the hand-off.
 * Diagram elements placed inside register their own comment targets, and
 * `sections` in the base data make prose commentable too.
 */
export class DpkViewPlain extends ViewElement<PlainState> {
  protected override definitionFor(locale: Locale) {
    return plainDefinitionFor(locale);
  }

  protected override renderRegions(_context: ViewRenderContext<PlainState>): ShellRegions {
    return {};
  }
}

export const definePlainElement = (): void => {
  if (!customElements.get('dpk-view-plain')) customElements.define('dpk-view-plain', DpkViewPlain);
};
