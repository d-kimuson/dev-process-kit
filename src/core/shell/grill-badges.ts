/**
 * The Q badges: the page marks what a question is about with
 * `data-grill-questions="Q1 Q4"`, and the shell lays a badge for each beside
 * the mark — in the right-hand gutter for the author's own markup, on the
 * corner of a board node or of a card a view renders. Pressing one opens its
 * question.
 *
 * The badges are drawn through the shared relative portal
 * (`./badge-portal`): a badge is a child of its mark's own positioned parent,
 * so it stays on the mark through a scroll, a pan, a zoom or a maximized panel
 * instead of being measured against the viewport.
 */
import type { ReactiveControllerHost } from 'lit';

import { GRILL_QUESTIONS_ATTRIBUTE, isAnswered, type Grill, type GrillAnswers, type GrillQuestion } from '../grill';
import { BadgePortalController, type PortalBadgeBinding } from './badge-portal';

export type BadgeBinding = PortalBadgeBinding & {
  readonly target: Element;
  readonly questionId: string;
  readonly ref: string;
  readonly title: string;
  readonly answered: boolean;
  readonly open: boolean;
};

/**
 * Where marks can be: the page's own light DOM (the author's markup), the
 * template's own shadow root (cards it renders from its data), plus the
 * shadow roots of the components inside it — a diagram component renders its
 * nodes itself, so its marks are one boundary down.
 */
const scopesOf = (host: HTMLElement): readonly ParentNode[] => {
  const roots: ParentNode[] = [host];
  if (host.shadowRoot) roots.push(host.shadowRoot);
  for (const element of host.querySelectorAll('*')) {
    if (element.shadowRoot) roots.push(element.shadowRoot);
  }
  return roots;
};

export const collectBadges = (
  host: HTMLElement,
  grill: Grill,
  answers: GrillAnswers,
  openId: string | null,
  /** The refs a token on `mark` may name, tried in order; by default the token itself. */
  refsOf: (mark: Element, token: string) => readonly string[] = (_mark, token) => [token],
): readonly BadgeBinding[] => {
  if (grill.questions.length === 0) return [];
  const byRef = new Map<string, GrillQuestion>(grill.questions.map((question) => [question.ref, question]));
  const bindings: BadgeBinding[] = [];
  for (const root of scopesOf(host)) {
    for (const target of root.querySelectorAll(`[${GRILL_QUESTIONS_ATTRIBUTE}]`)) {
      const value = target.getAttribute(GRILL_QUESTIONS_ATTRIBUTE) ?? '';
      for (const token of value.split(/\s+/)) {
        const question = refsOf(target, token)
          .map((ref) => byRef.get(ref))
          .find((entry) => entry !== undefined);
        if (!question) continue;
        bindings.push({
          index: bindings.length,
          target,
          questionId: question.id,
          ref: question.ref,
          title: question.title,
          answered: isAnswered(question, answers[question.id]),
          open: question.id === openId,
        });
      }
    }
  }
  return bindings;
};

/**
 * The Q badge's own look: the same accent pill the shell always drew, now
 * carried with its badge into whichever box owns the mark. `--dpk-zoom-inverse`
 * counter-scales a badge on a zoomed-out canvas so it stays legible, anchored
 * at its top-right corner — the corner it points at its mark with.
 */
const BADGE_CSS = `
  .dpk-grill-badge {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 22px;
    padding: 0 7px;
    border: 2px solid var(--dpk-paper-raised);
    border-radius: 999px;
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent));
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 2px 6px -2px color-mix(in srgb, var(--dpk-accent) 55%, transparent);
    cursor: pointer;
    pointer-events: auto;
    transform: scale(var(--dpk-zoom-inverse, 1));
    transform-origin: 100% 0;
    transition:
      transform 160ms var(--dpk-ease-spring),
      box-shadow 160ms var(--dpk-ease),
      background 160ms var(--dpk-ease);
  }

  .dpk-grill-badge:hover {
    transform: scale(calc(var(--dpk-zoom-inverse, 1) * 1.06));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 4px 10px -2px color-mix(in srgb, var(--dpk-accent) 60%, transparent);
  }

  .dpk-grill-badge[data-answered='true'] {
    background: linear-gradient(180deg, color-mix(in srgb, var(--dpk-green) 85%, white), var(--dpk-green));
  }

  .dpk-grill-badge[aria-pressed='true'] {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--dpk-accent) 45%, transparent),
      var(--dpk-shadow-sm);
  }

  .dpk-grill-badge:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  @media (prefers-reduced-motion: reduce) {
    .dpk-grill-badge {
      transition: none;
    }
  }
`;

export type GrillBadgeOptions = {
  /** Whether the page asks anything; without questions nothing is watched. */
  readonly active: () => boolean;
  /** The marks to badge, collected by the render that draws the shell. */
  readonly bindings: () => readonly BadgeBinding[];
  /** Pressing a badge opens its question. */
  readonly open: (questionId: string) => void;
  /** The badge's accessible label and tooltip, in the view's language. */
  readonly labelOf: (binding: BadgeBinding) => string;
  /** Whether the badge stands in the parent's right gutter: the author's own markup, which a corner badge would cover. */
  readonly gutterOf: (target: Element) => boolean;
};

const OBSERVED: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [GRILL_QUESTIONS_ATTRIBUTE],
};

/** The portal a Q badge lives in (`./badge-portal` names its own layer). */
const PORTAL_CLASS = 'dpk-grill-portal';

/**
 * Whether a mutation happened inside a badge portal. A badge brought up to date
 * writes its own label and attributes; the shell watching the page for marks
 * must not read that as a new mark and render again, or every update would
 * schedule the next one.
 */
const inPortal = (node: Node | null): boolean => {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return (element?.closest(`.${PORTAL_CLASS}`) ?? null) !== null;
};

/**
 * Keeps a badge on every mark. Bindings are collected by the render that draws
 * the shell; this re-renders when marks change, and the shared portal keeps
 * each badge where its mark is.
 */
export class GrillBadgeController extends BadgePortalController<BadgeBinding> {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: GrillBadgeOptions;
  #observer: MutationObserver | null = null;
  /** The marks of the host's own shadow root at the last update. */
  #ownMarks = '';

  constructor(host: ReactiveControllerHost & HTMLElement, options: GrillBadgeOptions) {
    super(host, {
      active: options.active,
      bindings: options.bindings,
      spec: {
        portalClass: PORTAL_CLASS,
        styles: BADGE_CSS,
        keyOf: (binding) => `${binding.index}:${binding.ref}`,
        create: (binding) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'dpk-grill-badge';
          button.dataset['badge'] = String(binding.index);
          // The current question is read at press time: a reused badge may have been updated since.
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            options.open(button.dataset['question'] ?? '');
          });
          return button;
        },
        update: (button, binding) => {
          const label = options.labelOf(binding);
          button.dataset['badge'] = String(binding.index);
          button.dataset['question'] = binding.questionId;
          button.dataset['answered'] = String(binding.answered);
          button.setAttribute('aria-pressed', String(binding.open));
          button.setAttribute('aria-label', label);
          button.title = `${binding.ref} · ${binding.title}`;
          // Only when the ref changed: replacing the text node every render would
          // be a DOM change of its own on a badge that already says the right thing.
          if (button.textContent !== binding.ref) button.textContent = binding.ref;
        },
        gutterOf: (binding) => options.gutterOf(binding.target),
      },
    });
    this.#host = host;
    this.#options = options;
  }

  override hostDisconnected(): void {
    super.hostDisconnected();
    this.#observer?.disconnect();
    this.#observer = null;
  }

  override hostUpdated(): void {
    this.#observer?.disconnect();
    if (!this.#options.active()) {
      super.hostUpdated();
      return;
    }
    // Cards a template renders from its data appear in its own shadow root only
    // after the render that collected the bindings, so their marks take one more.
    const ownMarks = this.#ownMarksOf();
    if (ownMarks !== this.#ownMarks) {
      this.#ownMarks = ownMarks;
      this.#host.requestUpdate();
    }
    this.#observer ??= new MutationObserver((records) => {
      if (records.every((record) => inPortal(record.target))) return;
      this.#host.requestUpdate();
      this.refresh();
    });
    // The light DOM and every shadow root inside it (diagram internals).
    this.#observer.observe(this.#host, OBSERVED);
    for (const element of this.#host.querySelectorAll('*')) {
      if (element.shadowRoot) this.#observer.observe(element.shadowRoot, OBSERVED);
    }
    super.hostUpdated();
  }

  #ownMarksOf(): string {
    const marks = this.#host.shadowRoot?.querySelectorAll(`[${GRILL_QUESTIONS_ATTRIBUTE}]`) ?? [];
    return Array.from(marks, (mark) => mark.getAttribute(GRILL_QUESTIONS_ATTRIBUTE) ?? '').join('|');
  }
}
