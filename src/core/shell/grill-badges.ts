/**
 * The Q badges: the page marks what a question is about with
 * `data-grill-questions="Q1 Q4"`, and the shell lays a badge for each over the
 * main column. Pressing one opens its question.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { GRILL_QUESTIONS_ATTRIBUTE, isAnswered, type Grill, type GrillAnswers, type GrillQuestion } from '../grill';
import { gutterBottom, layoutBadges, type BadgeGroup } from './badge-layout';

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
 * Where marks can be: the page's own light DOM (the author's markup), plus the
 * shadow roots of the components inside it — a diagram component renders its
 * nodes itself, so its marks are one boundary down.
 */
const scopesOf = (host: HTMLElement): readonly ParentNode[] => {
  const roots: ParentNode[] = [host];
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
): readonly BadgeBinding[] => {
  if (grill.questions.length === 0) return [];
  const byRef = new Map<string, GrillQuestion>(grill.questions.map((question) => [question.ref, question]));
  const bindings: BadgeBinding[] = [];
  for (const root of scopesOf(host)) {
    for (const target of root.querySelectorAll(`[${GRILL_QUESTIONS_ATTRIBUTE}]`)) {
      const value = target.getAttribute(GRILL_QUESTIONS_ATTRIBUTE) ?? '';
      for (const token of value.split(/\s+/)) {
        const question = byRef.get(token);
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
 * The area a badge may appear in. A diagram pans its world inside a clipped
 * canvas, so a node that moved out of the canvas keeps a box in the page; without
 * this its badge would float over the diagram's own toolbar.
 */
const visibleAreaOf = (target: Element, layer: HTMLElement): DOMRect => {
  const root = target.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  const canvas = host?.shadowRoot?.querySelector('.diagram-canvas') ?? null;
  if (canvas instanceof Element) return canvas.getBoundingClientRect();
  return host instanceof Element ? host.getBoundingClientRect() : layer.getBoundingClientRect();
};

/**
 * Measures the badges and their targets, and moves each badge where
 * `layoutBadges` puts it: beside the author's own markup in the right gutter,
 * on the corner of a diagram node. The layer affects layout only by stretching
 * its parent down to its last gutter badge, and a target that is not visible
 * (filtered away, or panned out of a diagram's canvas) takes its badge with it.
 */
export const positionBadges = (layer: HTMLElement, bindings: readonly BadgeBinding[]): void => {
  const box = layer.getBoundingClientRect();
  const root = layer.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  const byTarget = new Map<Element, HTMLButtonElement[]>();
  for (const binding of bindings) {
    const button = layer.querySelector<HTMLButtonElement>(`[data-badge="${binding.index}"]`);
    if (!button) continue;
    const list = byTarget.get(binding.target) ?? [];
    list.push(button);
    byTarget.set(binding.target, list);
  }
  const shown: { readonly buttons: readonly HTMLButtonElement[]; readonly group: BadgeGroup }[] = [];
  for (const [target, buttons] of byTarget) {
    const rect = target.getBoundingClientRect();
    const clip = visibleAreaOf(target, layer);
    const visible =
      (rect.width > 0 || rect.height > 0) &&
      rect.bottom > box.top &&
      rect.top < box.bottom &&
      rect.right > box.left &&
      rect.left < box.right &&
      rect.bottom > clip.top &&
      rect.top < clip.bottom;
    for (const button of buttons) button.dataset['visible'] = String(visible);
    if (!visible) continue;
    shown.push({
      buttons,
      group: {
        target: {
          left: rect.left - box.left,
          top: rect.top - box.top,
          right: rect.right - box.left,
          bottom: rect.bottom - box.top,
        },
        widths: buttons.map((button) => button.offsetWidth),
        // `contains` stops at shadow boundaries: a diagram's nodes are not the author's markup.
        gutter: host?.contains(target) === true,
      },
    });
  }
  const badgeHeight = shown[0]?.buttons[0]?.offsetHeight ?? 0;
  const groups = shown.map(({ group }) => group);
  const bounds = { width: layer.clientWidth, height: layer.clientHeight, badgeHeight };
  // The parent reaches down to its last gutter badge; the layer spans the parent.
  const bottom = gutterBottom(groups, bounds);
  if (layer.parentElement) layer.parentElement.style.minHeight = bottom > 0 ? `${Math.ceil(bottom)}px` : '';
  const placed = layoutBadges(groups, { ...bounds, height: Math.max(bounds.height, bottom) });
  shown.forEach(({ buttons }, index) => {
    buttons.forEach((button, badge) => {
      const point = placed[index]?.[badge];
      if (point) button.style.transform = `translate(${point.x}px, ${point.y}px)`;
    });
  });
};

export type GrillBadgeOptions = {
  /** Whether the page asks anything; without questions nothing is watched. */
  readonly active: () => boolean;
  readonly layer: () => HTMLElement | null;
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

  constructor(host: ReactiveControllerHost & HTMLElement, options: GrillBadgeOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected(): void {
    document.addEventListener('scroll', this.#schedule, true);
    window.addEventListener('resize', this.#schedule);
    // A diagram pans and zooms without scrolling, so its badges follow its view.
    this.#host.addEventListener('dpk-diagram-view', this.#schedule);
  }

  hostDisconnected(): void {
    document.removeEventListener('scroll', this.#schedule, true);
    window.removeEventListener('resize', this.#schedule);
    this.#host.removeEventListener('dpk-diagram-view', this.#schedule);
    this.#observer?.disconnect();
    this.#observer = null;
  }

  hostUpdated(): void {
    this.#observer?.disconnect();
    if (!this.#options.active()) return;
    this.#observer ??= new MutationObserver(() => {
      this.#host.requestUpdate();
      this.#schedule();
    });
    // The light DOM and every shadow root inside it (diagram internals).
    this.#observer.observe(this.#host, OBSERVED);
    for (const element of this.#host.querySelectorAll('*')) {
      if (element.shadowRoot) this.#observer.observe(element.shadowRoot, OBSERVED);
    }
    this.#schedule();
  }

  #schedule = (): void => {
    if (this.#pending || !this.#options.active()) return;
    this.#pending = true;
    requestAnimationFrame(() => {
      this.#pending = false;
      const layer = this.#options.layer();
      if (layer) positionBadges(layer, this.#options.bindings());
    });
  };
}
