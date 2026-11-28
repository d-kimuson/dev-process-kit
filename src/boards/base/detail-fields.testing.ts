/**
 * Drives a diagram's side panel detail from the diagram's tests: a stand-in
 * for the panel's owner, and the detail drawn the way the panel draws it.
 */
import { render } from 'lit';

import { PANEL_HOST, type DetailReport, type PanelDetail, type PanelHost } from '../../core/panel/host';
import { DpkInternalBaseDetailFields } from './detail-fields';

export type PanelReport = { readonly detail: PanelDetail | null; readonly report: DetailReport };

/** Connects the board inside a stand-in owner and returns what the board reports to it, as it reports it. */
export const connectInPanelOwner = (board: HTMLElement): PanelReport[] => {
  const reports: PanelReport[] = [];
  const host: PanelHost = {
    provideDetail: () => () => undefined,
    showDetail: (_source, detail, report) => reports.push({ detail, report }),
    addSection: () => () => undefined,
    invalidate: () => undefined,
    open: () => undefined,
  };
  const owner = document.createElement('div');
  Object.defineProperty(owner, PANEL_HOST, { value: host });
  owner.append(board);
  document.body.append(owner);
  return reports;
};

type Board = HTMLElement & { readonly updateComplete: Promise<boolean> };

/** Connects a board of `type`, built from `data` and set to `lang`, inside a stand-in owner, once it has drawn. */
export const mountInPanelOwner = async <T extends Board>(
  tag: string,
  type: abstract new () => T,
  data: unknown,
  lang = 'en',
): Promise<{ readonly board: T; readonly reports: PanelReport[] }> => {
  const board = document.createElement(tag);
  if (!(board instanceof type)) throw new Error(`${tag} did not upgrade`);
  board.setAttribute('lang', lang);
  board.innerHTML = `<script type="application/json">${JSON.stringify(data)}</script>`;
  const reports = connectInPanelOwner(board);
  for (let index = 0; index < 3; index++) await board.updateComplete;
  return { board, reports };
};

/** Clicks what `selector` finds in the board, the way a pointer does. */
export const clickIn = async (board: Board, selector: string): Promise<void> => {
  const target = board.shadowRoot?.querySelector(selector);
  if (target === null || target === undefined) throw new Error(`nothing at ${selector}`);
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await board.updateComplete;
};

/** The detail of the last selection the board reported. */
export const selectedDetail = (reports: readonly PanelReport[]): PanelDetail | null => {
  const report = [...reports].reverse().find((candidate) => candidate.report === 'select');
  if (report === undefined) throw new Error('no selection reported');
  return report.detail;
};

export type ShownDetail = {
  readonly kind: string;
  readonly title: string;
  readonly name: string;
  readonly rows: readonly (readonly [string, string])[];
};

/** Draws the detail as the panel does: the heading's kind and title, then the body's name and rows. */
export const shownDetail = async (detail: PanelDetail | null): Promise<ShownDetail> => {
  if (detail === null) throw new Error('no detail');
  const root = document.createElement('div');
  document.body.append(root);
  render(detail.render(), root);
  const view = root.firstElementChild;
  if (!(view instanceof DpkInternalBaseDetailFields) || view.shadowRoot === null) throw new Error('no detail fields');
  await view.updateComplete;
  const text = (node: Element | null): string => node?.textContent?.trim() ?? '';
  return {
    kind: detail.kind,
    title: detail.title,
    name: text(view.shadowRoot.querySelector('h3')),
    rows: [...view.shadowRoot.querySelectorAll('.detail-field')].map(
      (row) => [text(row.querySelector('dt')), text(row.querySelector('dd'))] as const,
    ),
  };
};
