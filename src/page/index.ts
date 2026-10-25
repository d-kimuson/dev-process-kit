/**
 * `<dpk-page>`: one switchable subject of an app.
 *
 * The behaviour is the core's `PageElement`; this module gives it its tag.
 * A page holds exactly one view (`dpk-view-*`) or board (`dpk-board-*`).
 */
import { PageElement } from '../core/page/element';

export class DpkPage extends PageElement {}

export const definePageElement = (): void => {
  if (!customElements.get('dpk-page')) customElements.define('dpk-page', DpkPage);
};
