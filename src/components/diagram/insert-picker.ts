/**
 * The floating "Add diagram" picker a board's context menu opens: a combobox
 * seeded from the diagram registry (`./registry`), positioned at the press.
 * It is a one-shot, self-removing widget — picking an option or dismissing
 * the picker either way tears it down; it keeps no state once it is gone.
 */
import * as v from 'valibot';

import type { Locale } from '../../core/i18n';

import { closePopover, openPopover, pointAnchor } from '../../lib/dom/popover';
import { defineCombobox } from '../combobox';
import { listDiagrams, type DiagramCatalogEntry } from './registry';

/** The combobox is never put in `multiple` mode here, so its change detail is always a single value. */
const changeDetailSchema = v.looseObject({ value: v.string() });

export type DiagramPickerMessages = { readonly searchDiagram: string };

/** Opens the picker at `(x, y)` (viewport coordinates); calls `onPick` once, iff the reader picks an entry. */
export const openDiagramPicker = (
  x: number,
  y: number,
  locale: Locale,
  m: DiagramPickerMessages,
  onPick: (entry: DiagramCatalogEntry) => void,
): void => {
  const entries = listDiagrams();
  if (entries.length === 0) return;
  defineCombobox();

  const host = document.createElement('div');
  host.setAttribute('popover', 'manual');
  host.style.cssText = 'position:fixed;margin:0;padding:0;border:0;background:transparent';

  const combo = document.createElement('dpk-combobox');
  combo.setAttribute('placeholder', m.searchDiagram);
  const data = document.createElement('script');
  data.type = 'application/json';
  data.textContent = JSON.stringify({
    options: entries.map((entry) => ({ value: entry.tag, label: entry.label(locale) })),
  });
  combo.append(data);
  host.append(combo);
  document.body.append(host);

  let closed = false;
  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    disposePopover();
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    closePopover(host);
    host.remove();
  };

  combo.addEventListener('dpk-combobox-change', (event) => {
    if (!(event instanceof CustomEvent)) return;
    const parsed = v.safeParse(changeDetailSchema, event.detail);
    const picked = parsed.success ? entries.find((entry) => entry.tag === parsed.output.value) : undefined;
    cleanup();
    if (picked !== undefined) onPick(picked);
  });

  // Capture phase: the combobox's own listbox (a nested popover) may stop
  // propagation on its options, but never escapes `host`'s composed path.
  const onPointerDown = (event: PointerEvent): void => {
    if (!event.composedPath().includes(host)) cleanup();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') cleanup();
  };
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);

  const disposePopover = openPopover(
    host,
    pointAnchor(x, y),
    { width: 280, height: 320 },
    { placement: 'bottom-start' },
  );

  // Focus the field once connected, so its own listbox opens right away.
  queueMicrotask(() => combo.shadowRoot?.querySelector<HTMLInputElement>('input')?.focus());
};
