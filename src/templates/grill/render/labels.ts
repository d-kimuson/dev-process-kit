import { clamp } from 'es-toolkit/math';

import type { Navigation } from '../../../core/types';

import { isAnswered, type GrillQuestion, type GrillState } from '../model';

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
 * Scopes to search: the artifact's own light DOM (the author's slot content),
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
 * Places each badge on the top-right corner of its target. The layer never
 * affects layout, and a target that is not visible (filtered away, or panned out
 * of a diagram's canvas) takes its badge with it.
 */
export const positionLabels = (layer: HTMLElement, bindings: readonly LabelBinding[]): void => {
  const box = layer.getBoundingClientRect();
  const groups = new Map<Element, HTMLButtonElement[]>();
  bindings.forEach((binding, index) => {
    const button = layer.querySelector<HTMLButtonElement>(`[data-label="${index}"]`);
    if (!button) return;
    const list = groups.get(binding.target) ?? [];
    list.push(button);
    groups.set(binding.target, list);
  });
  const clips = new Map<Element, DOMRect>();
  for (const [target, buttons] of groups) {
    const rect = target.getBoundingClientRect();
    const measured = rect.width > 0 || rect.height > 0;
    const cached = clips.get(target);
    const clip = cached ?? visibleAreaOf(target, layer);
    clips.set(target, clip);
    const inView = rect.bottom > box.top && rect.top < box.bottom && rect.right > box.left && rect.left < box.right;
    const inCanvas = rect.bottom > clip.top && rect.top < clip.bottom;
    buttons.forEach((button, index) => {
      button.dataset['visible'] = String(measured && inView && inCanvas);
      if (!measured || !inView || !inCanvas) return;
      const width = button.offsetWidth;
      const height = button.offsetHeight;
      const right = rect.right - box.left - width + 8 - (buttons.length - 1 - index) * (width + 5);
      const top = rect.top - box.top - height / 2;
      button.style.transform = `translate(${clamp(right, 0, Math.max(0, layer.clientWidth - width))}px, ${clamp(
        top,
        0,
        Math.max(0, layer.clientHeight - height),
      )}px)`;
    });
  }
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
