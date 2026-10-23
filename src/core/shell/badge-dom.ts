/**
 * DOM-touching half of badge placement: measures a binding's target element
 * and its rendered badge buttons, then writes the pure geometry
 * (`./badge-layout`) back as a `transform`. Shared by every badge kind that
 * renders one or more `[data-badge="<index>"]` buttons per target into an
 * absolutely positioned layer — the grill's Q badges (`./grill-badges`) and
 * Check Mode's per-target marks (`./check-mode-badges`) alike.
 */
import { gutterBottom, layoutBadges, type BadgeGroup } from './badge-layout';

export type PositionableBadge = {
  /** Index into the rendered badges; matches the `data-badge` the host drew it with. */
  readonly index: number;
  readonly target: Element;
};

export type PositionBadgesOptions = {
  /** The author's own markup (a gutter down the side) rather than a node a component rendered (its corner). */
  readonly gutterOf: (target: Element) => boolean;
};

/**
 * The area a badge may appear in. A diagram pans its world inside a clipped
 * viewport, so a node that moved out of the viewport keeps a box in the page;
 * without this its badge would float over the diagram's own toolbar. The
 * viewport is the `canvas` part of the `<dpk-dialog-panel canvas>` the
 * target sits in, whether a built-in diagram or the author composed it.
 */
export const visibleAreaOf = (target: Element, layer: HTMLElement): DOMRect => {
  const panel = target.closest('dpk-dialog-panel[canvas]');
  const viewport = panel?.shadowRoot?.querySelector('[part~="canvas"]') ?? panel;
  if (viewport) return viewport.getBoundingClientRect();
  const root = target.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  return host instanceof Element ? host.getBoundingClientRect() : layer.getBoundingClientRect();
};

/**
 * Measures the badges and their targets, and moves each badge where
 * `layoutBadges` puts it: beside the author's own markup in the right gutter,
 * or on the corner of its target. The layer affects layout only by stretching
 * its parent down to its last gutter badge, and a target that is not visible
 * (filtered away, or panned out of a diagram's canvas) takes its badge with it.
 */
export const positionBadges = <Binding extends PositionableBadge>(
  layer: HTMLElement,
  bindings: readonly Binding[],
  options: PositionBadgesOptions,
): void => {
  const box = layer.getBoundingClientRect();
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
        gutter: options.gutterOf(target),
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
