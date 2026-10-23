/**
 * The Q badges: the page marks what a question is about with
 * `data-grill-questions="Q1 Q4"`, and the shell lays a badge for each over the
 * main column. Pressing one opens its question.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { GRILL_QUESTIONS_ATTRIBUTE, isAnswered, type Grill, type GrillAnswers, type GrillQuestion } from '../grill';
import { positionBadges as positionBadgesOn } from './badge-dom';

export type BadgeBinding = {
  /** Index into the rendered badges, which is also the render order. */
  readonly index: number;
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
 * Moves each badge where `layoutBadges` puts it: beside the author's own
 * markup in the right gutter, on the corner of a diagram node. `contains`
 * stops at shadow boundaries, so a diagram's nodes are not the author's
 * markup; the sidebar has no gutter, so a badge there sits on its mark's
 * corner regardless.
 */
export const positionBadges = (layer: HTMLElement, bindings: readonly BadgeBinding[]): void => {
  const root = layer.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  positionBadgesOn(layer, bindings, {
    gutterOf: (target) => host?.contains(target) === true && layer.dataset['region'] !== 'sidebar',
  });
};

export type GrillBadgeOptions = {
  /** Whether the page asks anything; without questions nothing is watched. */
  readonly active: () => boolean;
  /** The layers the badges are drawn on: the main column's, and the sidebar's when it has marks. */
  readonly layers: () => readonly HTMLElement[];
  readonly bindings: () => readonly BadgeBinding[];
};

const OBSERVED: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [GRILL_QUESTIONS_ATTRIBUTE],
};

/**
 * Keeps the badges on their marks. Bindings are collected by the render that
 * draws them; this re-renders when marks change, and moves the badges when the
 * page scrolls, resizes, or a diagram pans.
 */
export class GrillBadgeController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #options: GrillBadgeOptions;
  #observer: MutationObserver | null = null;
  #pending = false;
  /** The marks of the host's own shadow root at the last update. */
  #ownMarks = '';
  /** Shadow roots listened to for scrolls: a scroll inside one never reaches the document. */
  readonly #scrollRoots = new Set<ShadowRoot>();

  constructor(host: ReactiveControllerHost & HTMLElement, options: GrillBadgeOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    document.addEventListener('scroll', this.#schedule, true);
    window.addEventListener('resize', this.#schedule);
    // A diagram (or a viewport the author composed) pans and zooms without scrolling, so its badges follow its view.
    this.#host.addEventListener('dpk-diagram-view', this.#schedule);
    this.#host.addEventListener('dpk-canvas-change', this.#schedule);
  }

  hostDisconnected(): void {
    document.removeEventListener('scroll', this.#schedule, true);
    window.removeEventListener('resize', this.#schedule);
    this.#host.removeEventListener('dpk-diagram-view', this.#schedule);
    this.#host.removeEventListener('dpk-canvas-change', this.#schedule);
    this.#observer?.disconnect();
    this.#observer = null;
    for (const root of this.#scrollRoots) root.removeEventListener('scroll', this.#schedule, true);
    this.#scrollRoots.clear();
  }

  hostUpdated(): void {
    this.#observer?.disconnect();
    if (!this.#options.active()) return;
    // Cards a template renders from its data appear in its own shadow root only
    // after the render that collected the bindings, so their marks take one more.
    const ownMarks = this.#ownMarksOf();
    if (ownMarks !== this.#ownMarks) {
      this.#ownMarks = ownMarks;
      this.#host.requestUpdate();
    }
    this.#observer ??= new MutationObserver(() => {
      this.#host.requestUpdate();
      this.#schedule();
    });
    // The light DOM and every shadow root inside it (diagram internals).
    this.#observer.observe(this.#host, OBSERVED);
    for (const element of this.#host.querySelectorAll('*')) {
      if (element.shadowRoot) this.#observer.observe(element.shadowRoot, OBSERVED);
    }
    this.#listenForScrolls();
    this.#schedule();
  }

  /**
   * The host's own shadow root, those of the layouts in it (the sidebar and
   * main column scroll inside `<dpk-internal-layout-sidebar>`) and those of the boards
   * in the light DOM.
   */
  #listenForScrolls(): void {
    const own = this.#host.shadowRoot;
    const roots = [
      own,
      ...Array.from(own?.querySelectorAll('*') ?? [], (element) => element.shadowRoot),
      ...Array.from(this.#host.querySelectorAll('*'), (element) => element.shadowRoot),
    ];
    for (const root of roots) {
      if (root === null || this.#scrollRoots.has(root)) continue;
      root.addEventListener('scroll', this.#schedule, true);
      this.#scrollRoots.add(root);
    }
  }

  #ownMarksOf(): string {
    const marks = this.#host.shadowRoot?.querySelectorAll(`[${GRILL_QUESTIONS_ATTRIBUTE}]`) ?? [];
    return Array.from(marks, (mark) => mark.getAttribute(GRILL_QUESTIONS_ATTRIBUTE) ?? '').join('|');
  }

  #schedule = (): void => {
    if (this.#pending || !this.#options.active()) return;
    this.#pending = true;
    requestAnimationFrame(() => {
      this.#pending = false;
      const bindings = this.#options.bindings();
      for (const layer of this.#options.layers()) positionBadges(layer, bindings);
    });
  };
}
