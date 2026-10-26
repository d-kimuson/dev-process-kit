/**
 * Check Mode's badges: every element already marked `data-dpk-target` (the
 * same marker the change notices' "Show" already reveals) gets a badge at its
 * top-right corner while Check Mode is on, showing whether the reader has
 * checked it off, and turning into a "needs another look" mark once the change
 * log records something about it afterwards (`../check-mode`).
 *
 * Each badge is drawn through the shared relative portal
 * (`./badge-portal`), like the grill's Q badges: a child of the mark's own
 * positioned parent, so a canvas pan, a zoom, a scroll and a maximized panel
 * all carry it along with the mark.
 */
import { render, type ReactiveControllerHost } from 'lit';

import type { ChangeLog } from '../changes';

import { queryAllDeep } from '../../lib/dom/deep';
import { statusOf, type CheckState, type CheckStatus } from '../check-mode';
import { iconCheck, iconQuestion } from '../icons';
import { BadgePortalController, type PortalBadgeBinding } from './badge-portal';
import { TARGET_ATTRIBUTE } from './reveal';

/**
 * Opts a subtree out of Check Mode: `data-dpk-check="off"` on, or above, an
 * element that carries `data-dpk-target`. Check Mode tallies the things a
 * reader works through — cards, nodes, participants — so a relation line, a
 * link or a message that is marked for the change log's "Show" must say it is
 * not one of them rather than lose the target marker "Show" depends on. A
 * board's axis heads (a column head, a row head) opt out the same way: they
 * carry a target so "Show" can point at where something is seen, and a check
 * mark pinned to a header that stays on screen says nothing about the work.
 */
export const CHECK_ATTRIBUTE = 'data-dpk-check';

/** The one value `CHECK_ATTRIBUTE` reads: not a checkable target. */
export const CHECK_OFF = 'off';

const isCheckable = (target: Element): boolean => target.closest(`[${CHECK_ATTRIBUTE}="${CHECK_OFF}"]`) === null;

export type CheckBadgeBinding = PortalBadgeBinding & {
  readonly target: Element;
  readonly ref: string;
  readonly status: CheckStatus;
};

/**
 * Every checkable `data-dpk-target` element under `host` (its own light DOM,
 * its shadow root, and any nested shadow roots): part of a subtree opted out
 * with `CHECK_ATTRIBUTE` is skipped.
 */
export const collectCheckBindings = (
  host: HTMLElement,
  state: CheckState,
  log: ChangeLog | null,
): readonly CheckBadgeBinding[] => {
  if (!state.enabled) return [];
  const bindings: CheckBadgeBinding[] = [];
  for (const target of queryAllDeep(host, `[${TARGET_ATTRIBUTE}]`)) {
    const ref = target.getAttribute(TARGET_ATTRIBUTE);
    if (ref === null || ref === '' || !isCheckable(target)) continue;
    bindings.push({ index: bindings.length, target, ref, status: statusOf(state, ref, log) });
  }
  return bindings;
};

const BADGE_CSS = `
  .dpk-check-badge {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    box-shadow: var(--dpk-shadow-sm);
    cursor: pointer;
    pointer-events: auto;
    transform: scale(var(--dpk-zoom-inverse, 1));
    transform-origin: 100% 0;
    transition:
      box-shadow 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease),
      color 160ms var(--dpk-ease);
  }

  .dpk-check-badge svg {
    width: 13px;
    height: 13px;
  }

  .dpk-check-badge:hover {
    box-shadow: var(--dpk-shadow-md);
    background: var(--dpk-paper-inset);
  }

  .dpk-check-badge[data-status='checked'] {
    border-color: var(--dpk-green);
    background: linear-gradient(180deg, color-mix(in srgb, var(--dpk-green) 85%, white), var(--dpk-green));
    color: var(--dpk-accent-ink);
  }

  .dpk-check-badge[data-status='stale'] {
    border-color: var(--dpk-amber);
    background: linear-gradient(180deg, color-mix(in srgb, var(--dpk-amber) 85%, white), var(--dpk-amber));
    color: var(--dpk-accent-ink);
  }

  .dpk-check-badge:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  @media (prefers-reduced-motion: reduce) {
    .dpk-check-badge {
      transition: none;
    }
  }
`;

export type CheckModeBadgeOptions = {
  /** Check Mode is on: without marks there are no badges. */
  readonly active: () => boolean;
  /** The marks, in render order. */
  readonly bindings: () => readonly CheckBadgeBinding[];
  /** One click on a badge. */
  readonly onToggle: (ref: string) => void;
  /** The accessible label for a mark's status, in the view's language. */
  readonly labelOf: (status: CheckStatus) => string;
};

/**
 * Check Mode's badges: one per mark, on the mark's own corner, through the same
 * relative portal the grill's Q badges use.
 */
export class CheckModeBadgeController extends BadgePortalController<CheckBadgeBinding> {
  constructor(host: ReactiveControllerHost & HTMLElement, options: CheckModeBadgeOptions) {
    super(host, {
      active: options.active,
      bindings: options.bindings,
      spec: {
        portalClass: 'dpk-check-portal',
        styles: BADGE_CSS,
        keyOf: (binding) => `${binding.index}:${binding.ref}`,
        create: (binding) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'dpk-check-badge';
          button.dataset['checkKey'] = `${binding.index}:${binding.ref}`;
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            options.onToggle(button.dataset['checkRef'] ?? '');
          });
          return button;
        },
        update: (button, binding) => {
          const label = options.labelOf(binding.status);
          button.dataset['checkKey'] = `${binding.index}:${binding.ref}`;
          button.dataset['checkRef'] = binding.ref;
          button.dataset['status'] = binding.status;
          button.setAttribute('aria-label', label);
          button.title = label;
          render(binding.status === 'stale' ? iconQuestion() : iconCheck(), button);
        },
      },
    });
  }
}
