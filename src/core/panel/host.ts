/**
 * How a component inside a panel's owner reaches that panel.
 *
 * The owner (`<dpk-page>`, a standalone view or board) publishes its host
 * under `PANEL_HOST`; a board finds the nearest one by walking up the
 * composed tree, the way it finds its page. The lookup is structural, so an
 * owner defined by another entry's copy of the kit still answers.
 */
import type { TemplateResult } from 'lit';

import type { ComponentSection, DetailIntent } from './model';

/** The selected element's detail, as the content hands it to the panel. */
export type PanelDetail = {
  /** The element's identity: the panel keys the detail on it, so a half-typed value never moves to another element. */
  readonly key: string;
  /** What kind of element it is (`Card`), shown in the detail's heading. */
  readonly kind: string;
  /** The element's short name (`TASK-3`), shown after the kind. */
  readonly title: string;
  /**
   * Called in the panel's shadow root, where the content's styles do not
   * reach: return an internal element with its own shadow root.
   */
  render(): TemplateResult;
  /** Puts the focus back on the element on the board, when the panel closes on the detail. */
  focus?(): void;
  /** Opens the review comment composer on the element. */
  comment?(): void;
};

/** A section a component adds to the panel, drawn in the panel's shadow root like a detail. */
export type PanelSectionSpec = ComponentSection & {
  render(): TemplateResult;
};

/** The page's settings, which the element that owns the page's chrome hands the panel. */
export type PanelSettingsSpec = {
  readonly label: string;
  render(): TemplateResult;
};

/**
 * `refresh` re-reads the detail of the element already shown: the content
 * re-rendered, the selection did not change.
 */
export type DetailReport = DetailIntent | 'refresh';

export type PanelHost = {
  /** The content offers a detail: the panel lists the detail section until the returned function runs. */
  provideDetail(source: Element): () => void;
  /** The content's selection changed (or re-rendered, with `refresh`); `null` when nothing is selected. */
  showDetail(source: Element, detail: PanelDetail | null, report: DetailReport): void;
  addSection(source: Element, section: PanelSectionSpec): () => void;
  /** The chrome's owner offers the page's settings: the panel lists them last until the returned function runs. */
  provideSettings(source: Element, settings: PanelSettingsSpec): () => void;
  readonly isOpen: boolean;
  /** The name of the section the panel shows. */
  readonly section: string;
  /** The source's state changed: draw its detail and sections again. */
  invalidate(source: Element): void;
  /** Opens the panel, on `section` when given; `focus` moves the focus to that section's segment. */
  open(section?: string, options?: { readonly focus?: boolean }): void;
  close(): void;
};

export const PANEL_HOST: unique symbol = Symbol.for('dev-process-kit.panel-host');

type PanelHostHolder = Element & { readonly [PANEL_HOST]?: unknown };

const isPanelHost = (value: unknown): value is PanelHost =>
  typeof value === 'object' &&
  value !== null &&
  'provideDetail' in value &&
  typeof value.provideDetail === 'function' &&
  'showDetail' in value &&
  typeof value.showDetail === 'function' &&
  'invalidate' in value &&
  typeof value.invalidate === 'function';

/** The host an element publishes, or `null` (a page's content publishes none: the page owns the panel). */
const holdsPanelHost = (element: Element): element is PanelHostHolder => PANEL_HOST in element;

/** The host an owner element publishes itself (a page, as the app reads it), or `null`. */
export const ownPanelHost = (element: Element): PanelHost | null => {
  if (!holdsPanelHost(element)) return null;
  const host = element[PANEL_HOST];
  return isPanelHost(host) ? host : null;
};

/** The parent across shadow boundaries: an element's parent, or the host of the shadow root it sits in. */
const composedParent = (element: Element): Element | null => {
  if (element.parentElement !== null) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
};

/** The nearest owner above the element, or `null` when it has none. */
export const panelHostOf = (element: Element): PanelHost | null => {
  for (let current = composedParent(element); current !== null; current = composedParent(current)) {
    const host = ownPanelHost(current);
    if (host !== null) return host;
  }
  return null;
};
