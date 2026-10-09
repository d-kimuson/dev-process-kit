/**
 * Whether the reader folded the shell's sidebar away, and the persistence of
 * that choice. Kept beside the width, the same way: one key per template.
 *
 * On a phone-width screen the sidebar is a drawer over the main column
 * instead: closed on load and never stored, so opening it there does not
 * unfold it on a wider screen.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../lib/dom/json-store';
import { parseSidebarCollapsed } from '../sidebar-width';

const storageKey = (template: string): string => `dev-process-kit:sidebar-collapsed:${template}`;

export type SidebarCollapseOptions = {
  /** Read on first connect: `storage="off"` / `"memory"` keeps the choice to this page load. */
  readonly persist: () => boolean;
  /** The template's name, read on first connect. */
  readonly template: () => string;
};

export class SidebarCollapseController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: SidebarCollapseOptions;
  #store: JsonStore<boolean> | null = null;
  #key = '';
  #collapsed = false;
  #drawerOpen = false;

  constructor(host: ReactiveControllerHost, options: SidebarCollapseOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.#store !== null) return;
    this.#store = this.#options.persist()
      ? defaultJsonStore(parseSidebarCollapsed)
      : memoryJsonStore(parseSidebarCollapsed);
    this.#key = storageKey(this.#options.template());
    this.#collapsed = this.#store.read(this.#key) ?? false;
  }

  get collapsed(): boolean {
    return this.#collapsed;
  }

  get drawerOpen(): boolean {
    return this.#drawerOpen;
  }

  toggleDrawer(): void {
    this.#drawerOpen = !this.#drawerOpen;
    this.#host.requestUpdate();
  }

  closeDrawer(): void {
    if (!this.#drawerOpen) return;
    this.#drawerOpen = false;
    this.#host.requestUpdate();
  }

  toggle(): void {
    this.#collapsed = !this.#collapsed;
    // Expanded is the default, so only a folded sidebar leaves a record.
    if (this.#collapsed) this.#store?.write(this.#key, true);
    else this.#store?.remove(this.#key);
    this.#host.requestUpdate();
  }
}
