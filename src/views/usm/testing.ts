/**
 * Test helpers for the USM view: where its side panel draws a story's detail.
 * Test-only; no entry imports it.
 */
import type { LitElement } from 'lit';

/** The view's side panel frame, drawn once the view has a panel. */
export const panelFrameOf = (el: Element): LitElement | null =>
  el.shadowRoot?.querySelector<LitElement>('dpk-internal-layout-panel') ?? null;

const detailElementOf = (el: Element): LitElement | null =>
  panelFrameOf(el)?.shadowRoot?.querySelector<LitElement>('dpk-internal-usm-story-detail') ?? null;

/** The story detail the side panel shows, or `null` when it shows none. */
export const storyDetailOf = (el: Element): HTMLElement | null =>
  detailElementOf(el)?.shadowRoot?.querySelector<HTMLElement>('[data-testid="usm-story-detail"]') ?? null;

/** Waits for the panel frame and the detail inside it to draw what the view handed them. */
export const settleDetail = async (el: Element): Promise<HTMLElement | null> => {
  await panelFrameOf(el)?.updateComplete;
  await detailElementOf(el)?.updateComplete;
  return storyDetailOf(el);
};
