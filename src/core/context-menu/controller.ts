/**
 * Wires the pure model (`./model.ts`) to the DOM: a self-attached
 * `contextmenu` listener on the host (mirroring `DismissController`'s own
 * listen-on-host pattern — no edit to the host's `connectedCallback` needed),
 * floating-ui positioning via the shared popover helper, focus management so
 * arrow keys reach the menu, and outside-click / Escape dismissal composed
 * from `DismissController`.
 *
 * The native context menu stays reachable two ways: Shift+right-click
 * anywhere, and a plain right-click inside a text input, a textarea or a
 * `contenteditable` region (editing needs its own menu — Cut included).
 */
import type { ReactiveController, ReactiveControllerHost, TemplateResult, nothing } from 'lit';

import type { ActionTarget } from '../types';
import type { ContextMenuMessages } from './messages';
import type { ContextMenuEntry, ContextMenuGroup } from './types';

import { DismissController } from '../../lib/dom/dismiss';
import { closePopover, openPopover, pointAnchor } from '../../lib/dom/popover';
import { buildCommonContextMenuGroup, type CommonActionsHost } from './common-actions';
import {
  CLOSED_CONTEXT_MENU,
  activate,
  closeActiveSubmenu,
  moveActive,
  openActiveSubmenu,
  openContextMenu,
  openSubmenuById,
  type ContextMenuState,
} from './model';
import { collectContextMenuGroups, findMarkedElement, findMethodProvider, resolveContextMenuTarget } from './provider';
import { CONTEXT_MENU_ID, renderContextMenu, type ContextMenuIntents } from './render';

const MENU_SIZE = { width: 220, height: 420 } as const;

export type ContextMenuHost = ReactiveControllerHost & HTMLElement & CommonActionsHost;

export type ContextMenuControllerOptions = {
  /** The draft's current state, read fresh on every right-click. */
  readonly state: () => unknown;
  readonly messages: () => ContextMenuMessages;
};

const isTextEditingSurface = (element: Element): boolean =>
  element.closest('input, textarea, [contenteditable=""], [contenteditable="true"]') !== null;

export class ContextMenuController implements ReactiveController {
  readonly #host: ContextMenuHost;
  readonly #options: ContextMenuControllerOptions;
  readonly #intents: ContextMenuIntents;
  #state: ContextMenuState = CLOSED_CONTEXT_MENU;
  #surface: HTMLElement | null = null;
  #positionedAt: { readonly x: number; readonly y: number } | null = null;
  #disposePosition: (() => void) | null = null;

  constructor(host: ContextMenuHost, options: ContextMenuControllerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
    new DismissController(host, {
      open: () => this.#state.open,
      closesOn: (path) => this.#surface === null || !path.includes(this.#surface),
      ownsEscape: () => this.#state.open,
      dismiss: () => this.#close(),
    });
    this.#intents = {
      onHover: (id) => this.#setActive(id),
      onInvoke: (entry) => this.#invoke(entry),
      onKeyDown: (event) => this.#onKeyDown(event),
    };
  }

  hostConnected(): void {
    this.#host.addEventListener('contextmenu', this.#onContextMenu);
  }

  hostDisconnected(): void {
    this.#host.removeEventListener('contextmenu', this.#onContextMenu);
    this.#teardownSurface();
  }

  /** Repositions / mounts the popover surface once Lit has rendered it; a no-op while nothing changed. */
  hostUpdated(): void {
    const surface = this.#host.shadowRoot?.getElementById(CONTEXT_MENU_ID) ?? null;
    if (!this.#state.open || surface === null) {
      this.#teardownSurface();
      return;
    }
    const stale =
      this.#surface !== surface ||
      this.#positionedAt === null ||
      this.#positionedAt.x !== this.#state.x ||
      this.#positionedAt.y !== this.#state.y;
    if (!stale) return;
    this.#disposePosition?.();
    closePopover(surface);
    this.#disposePosition = openPopover(surface, pointAnchor(this.#state.x, this.#state.y), MENU_SIZE, {
      placement: 'right-start',
    });
    this.#surface = surface;
    this.#positionedAt = { x: this.#state.x, y: this.#state.y };
    surface.focus();
  }

  render(): TemplateResult | typeof nothing {
    return renderContextMenu(this.#state, this.#options.messages(), this.#intents);
  }

  #teardownSurface(): void {
    if (this.#surface === null) return;
    closePopover(this.#surface);
    this.#disposePosition?.();
    this.#disposePosition = null;
    this.#surface = null;
    this.#positionedAt = null;
  }

  #close(): void {
    this.#state = CLOSED_CONTEXT_MENU;
    this.#host.requestUpdate();
  }

  #setActive(id: string): void {
    this.#state = { ...this.#state, activeId: id };
    this.#host.requestUpdate();
  }

  #invoke(entry: ContextMenuEntry): void {
    if (entry.kind === 'submenu') {
      this.#state = openSubmenuById(this.#state, entry.id);
      this.#host.requestUpdate();
      return;
    }
    if (entry.disabled === true) return;
    this.#close();
    entry.run();
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.#state = moveActive(this.#state, 1);
        this.#host.requestUpdate();
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.#state = moveActive(this.#state, -1);
        this.#host.requestUpdate();
        return;
      case 'ArrowRight':
        event.preventDefault();
        this.#state = openActiveSubmenu(this.#state);
        this.#host.requestUpdate();
        return;
      case 'ArrowLeft':
        event.preventDefault();
        this.#state = closeActiveSubmenu(this.#state);
        this.#host.requestUpdate();
        return;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const outcome = activate(this.#state);
        this.#state = outcome.state;
        this.#host.requestUpdate();
        outcome.run?.();
        return;
      }
      case 'Escape':
        event.preventDefault();
        this.#close();
        return;
      case 'Tab':
        this.#close();
        return;
      default:
        return;
    }
  };

  #onContextMenu = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.shiftKey) return;
    const path = event.composedPath();
    const origin = path[0];
    if (origin instanceof Element && isTextEditingSurface(origin)) return;
    event.preventDefault();

    const target: ActionTarget | null = resolveContextMenuTarget(path);
    const providerGroups: readonly ContextMenuGroup[] = collectContextMenuGroups(path, {
      clientX: event.clientX,
      clientY: event.clientY,
      target,
    });
    const common = buildCommonContextMenuGroup({
      host: this.#host,
      state: this.#options.state(),
      target,
      targetElement: findMarkedElement(path),
      resetViewElement: findMethodProvider(path, 'resetView'),
      messages: this.#options.messages(),
    });
    const groups = common === null ? providerGroups : [...providerGroups, common];
    this.#state = openContextMenu(event.clientX, event.clientY, groups);
    this.#host.requestUpdate();
  };
}
