/**
 * Whether the reader folded the sidebar away, and the persistence of that
 * choice. Kept beside the width, the same way: one key per layout.
 *
 * On a phone-width screen the sidebar is a drawer over the main column
 * instead: closed on load and never stored, so opening it there does not
 * unfold it on a wider screen.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { defaultJsonStore, memoryJsonStore, type JsonStore } from '../../../lib/dom/json-store';
import { parseSidebarCollapsed } from './model';

const storageKey = (key: string): string => `dev-process-kit:sidebar-collapsed:${key}`;

export type SidebarCollapseOptions = {
  /** Read on first connect: `null` keeps the choice to this page load. */
  readonly persistKey: () => string | null;
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
    const key = this.#options.persistKey();
    this.#store = key === null ? memoryJsonStore(parseSidebarCollapsed) : defaultJsonStore(parseSidebarCollapsed);
    this.#key = storageKey(key ?? '');
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
    this.set(!this.#collapsed);
  }

  set(collapsed: boolean): void {
    if (collapsed === this.#collapsed) return;
    this.#collapsed = collapsed;
    // Expanded is the default, so only a folded sidebar leaves a record.
    if (this.#collapsed) this.#store?.write(this.#key, true);
    else this.#store?.remove(this.#key);
    this.#host.requestUpdate();
  }
}
