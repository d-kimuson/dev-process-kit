/**
 * The layouts: how the shell divides the whole screen
 * (`dpk-internal-layout-*`). They are internal to the shell: a page gets the
 * header, sidebars, rail and footer through the slots of its template or
 * `<dpk-page>`, which draw a region (and its buttons) only when it has content.
 *
 * What lays out a part of the screen (a card, a toolbar, a canvas) is a
 * component or an atom instead.
 */
export { DpkInternalLayoutApp, defineLayoutApp } from './app/index';
export { DpkInternalLayoutSidebar, defineLayoutSidebar } from './sidebar/index';
export type { SidebarLayout, SidebarNarrow, SidebarPane, SidebarSide } from './sidebar/index';

import { defineLayoutApp } from './app/index';
import { defineLayoutSidebar } from './sidebar/index';

/** Registers every layout element (idempotent). */
export const defineLayoutElements = (): void => {
  defineLayoutApp();
  defineLayoutSidebar();
};
