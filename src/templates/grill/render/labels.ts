import type { Navigation } from '../../../core/types';

import { isAnswered, type GrillQuestion, type GrillState } from '../model';
import { gutterBottom, layoutBadges, type BadgeGroup } from './badge-layout';

/** Attribute on any element inside the main slot: `data-grill-questions="Q1 Q4"`. */
export const GRILL_QUESTIONS_ATTRIBUTE = 'data-grill-questions';

export type LabelBinding = {
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
 * Scopes to search: the template's own light DOM (the author's slot content),
 * plus the shadow roots of the components inside it — a diagram component renders
 * its nodes itself, so its annotations are one boundary down.
 */
const labelScopes = (host: HTMLElement): readonly ParentNode[] => {
  const roots: ParentNode[] = [host];
  for (const element of host.querySelectorAll('*')) {
    if (element.shadowRoot) roots.push(element.shadowRoot);
  }
  return roots;
};

export const collectLabelBindings = (
  host: HTMLElement,
  state: GrillState,
  navigation: Navigation,
): readonly LabelBinding[] => {
  const openId = navigation['question'] ?? state.questions[0]?.id ?? null;
  const byRef = new Map<string, GrillQuestion>(state.questions.map((question) => [question.ref, question]));
  const bindings: LabelBinding[] = [];
  for (const root of labelScopes(host)) {
    for (const target of root.querySelectorAll(`[${GRILL_QUESTIONS_ATTRIBUTE}]`)) {
      const value = target.getAttribute(GRILL_QUESTIONS_ATTRIBUTE) ?? '';
      for (const token of value.split(/\s+/)) {
        if (token === '') continue;
        const question = byRef.get(token);
        if (!question) continue;
        bindings.push({
          index: bindings.length,
          target,
          questionId: question.id,
          ref: question.ref,
          title: question.title,
          answered: isAnswered(question, state.answers[question.id]),
          open: question.id === openId,
        });
      }
    }
  }
  return bindings;
};

/**
 * Measures the badges and their targets, and moves each badge where
 * `layoutBadges` puts it: beside the author's own markup in the stage's right
 * gutter, on the corner of a diagram node. The layer affects layout only by
 * stretching the stage down to its last gutter badge, and a target that is not
 * visible (filtered away, or panned out of a diagram's canvas) takes its badge
 * with it.
 */
export const positionLabels = (layer: HTMLElement, bindings: readonly LabelBinding[]): void => {
  const box = layer.getBoundingClientRect();
  const root = layer.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  const byTarget = new Map<Element, HTMLButtonElement[]>();
  bindings.forEach((binding, index) => {
    const button = layer.querySelector<HTMLButtonElement>(`[data-label="${index}"]`);
    if (!button) return;
    const list = byTarget.get(binding.target) ?? [];
    list.push(button);
    byTarget.set(binding.target, list);
  });
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
  // The stage reaches down to its last gutter badge; the layer spans the stage.
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
