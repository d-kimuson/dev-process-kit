// @vitest-environment jsdom
import { html, type TemplateResult } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';

import type { PanelSectionSpec } from '../../core/panel/host';
import type { DpkViewPlain } from '../../views/plain/element';

import '../../index';
import { BoardChromeBase } from './element';

type Note = { readonly name: string; readonly label: string; readonly badge?: string; readonly hidden?: boolean };

/** A board that adds one panel section per note, each drawing the board's current `body`. */
class SectionBoard extends BoardChromeBase<unknown> {
  notes: readonly Note[] = [];
  body = 'first';

  protected override parseData(input: unknown): unknown {
    return input;
  }

  protected override emptyData(): unknown {
    return null;
  }

  protected override render(): TemplateResult {
    return html`<p>board</p>`;
  }

  protected override panelSections(): readonly PanelSectionSpec[] {
    return this.notes.map((note) => ({
      ...note,
      render: () => html`<p class="note-body">${this.id}:${note.name}:${this.body}</p>`,
    }));
  }

  show(name: string): void {
    this.showPanelSection(name);
  }
}
customElements.define('test-section-board', SectionBoard);

type Updating = HTMLElement & { updateComplete: Promise<boolean> };

const mount = (boards: string, sections = ''): DpkViewPlain => {
  document.body.innerHTML = `
    <dpk-view-plain storage="memory" lang="en">
      <script type="application/json">${JSON.stringify({ title: 'Panel sections' })}</script>
      <section slot="main">${boards}</section>
      ${sections}
    </dpk-view-plain>`;
  const element = document.querySelector('dpk-view-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
};

const board = (element: DpkViewPlain, id: string): SectionBoard => {
  const found = element.querySelector(`#${id}`);
  if (!(found instanceof SectionBoard)) throw new Error(`no board ${id}`);
  return found;
};

const launchers = (element: DpkViewPlain): Updating => {
  const found = element.shadowRoot?.querySelector<Updating>('.dpk-header dpk-internal-layout-panel-launchers');
  if (!found) throw new Error('no launchers');
  return found;
};

const frame = (element: DpkViewPlain): Updating => {
  const found = element.shadowRoot?.querySelector<Updating>('dpk-internal-layout-panel');
  if (!found) throw new Error('no panel frame');
  return found;
};

const settle = async (element: DpkViewPlain): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    for (const child of element.querySelectorAll<Updating>('test-section-board')) await child.updateComplete;
    await element.updateComplete;
    await launchers(element).updateComplete;
    await frame(element).updateComplete;
    await Promise.resolve();
  }
};

/** Puts the notes on the board and lets it draw, as a change of the board's state does. */
const setNotes = async (element: DpkViewPlain, id: string, notes: readonly Note[]): Promise<void> => {
  board(element, id).notes = notes;
  board(element, id).requestUpdate();
  await settle(element);
};

const text = (node: Element): string => node.textContent?.replace(/\s+/g, ' ').trim() ?? '';

const buttons = (element: DpkViewPlain): HTMLButtonElement[] =>
  Array.from(launchers(element).shadowRoot?.querySelectorAll<HTMLButtonElement>('.launcher[data-section]') ?? []);

const button = (element: DpkViewPlain, section: string): HTMLButtonElement => {
  const found = buttons(element).find((candidate) => candidate.dataset['section'] === section);
  if (!found) throw new Error(`no button ${section}`);
  return found;
};

const tabs = (element: DpkViewPlain): string[] =>
  Array.from(frame(element).shadowRoot?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []).map(
    (tab) => tab.dataset['section'] ?? '',
  );

const shownBody = (element: DpkViewPlain): string | null => {
  const panels = Array.from(frame(element).shadowRoot?.querySelectorAll<HTMLElement>('[role="tabpanel"]') ?? []);
  const shown = panels.find((panel) => !panel.hidden && panel.querySelector('.note-body') !== null);
  return shown === undefined ? null : text(shown);
};

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe("a board's panel sections", () => {
  it('get a tab and a header button before the author sections, with their badge', async () => {
    const element = mount(
      '<test-section-board id="a"></test-section-board>',
      '<dpk-panel-section slot="panel" name="issues" label="Issues">points</dpk-panel-section>',
    );
    await settle(element);
    await setNotes(element, 'a', [{ name: 'notes', label: 'Notes', badge: '2' }]);
    expect(buttons(element).map(text)).toEqual(['Notes 2', 'Issues']);
    expect(button(element, 'notes').getAttribute('aria-label')).toBe('Notes, 2');

    element.openPanel();
    await settle(element);
    expect(tabs(element)).toEqual(['notes', 'issues', 'settings']);
  });

  it('open the panel on the section from their button, and give the focus back to it on Escape', async () => {
    const element = mount('<test-section-board id="a"></test-section-board>');
    await settle(element);
    await setNotes(element, 'a', [{ name: 'notes', label: 'Notes' }]);
    button(element, 'notes').focus();
    button(element, 'notes').click();
    await settle(element);
    expect(element.panelOpen).toBe(true);
    expect(element.panelSection).toBe('notes');
    expect(button(element, 'notes').getAttribute('aria-pressed')).toBe('true');
    expect(shownBody(element)).toBe('a:notes:first');

    const tab = frame(element).shadowRoot?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    tab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await settle(element);
    expect(element.panelOpen).toBe(false);
    expect(launchers(element).shadowRoot?.activeElement).toBe(button(element, 'notes'));
  });

  it("follow the board's state: content, badge and hidden", async () => {
    const element = mount('<test-section-board id="a"></test-section-board>');
    await settle(element);
    await setNotes(element, 'a', [
      { name: 'notes', label: 'Notes', badge: '1' },
      { name: 'log', label: 'Log' },
    ]);
    element.openPanel('notes');
    await settle(element);

    board(element, 'a').body = 'second';
    await setNotes(element, 'a', [
      { name: 'notes', label: 'Notes', badge: '3' },
      { name: 'log', label: 'Log', hidden: true },
    ]);
    expect(shownBody(element)).toBe('a:notes:second');
    expect(buttons(element).map(text)).toEqual(['Notes 3']);
    expect(tabs(element)).toEqual(['notes', 'settings']);

    await setNotes(element, 'a', [
      { name: 'notes', label: 'Notes', badge: '3' },
      { name: 'log', label: 'Log' },
    ]);
    expect(buttons(element).map(text)).toEqual(['Notes 3', 'Log']);
  });

  it('turn an open panel to the section on showPanelSection, and leave a closed one closed', async () => {
    const element = mount('<test-section-board id="a"></test-section-board>');
    await settle(element);
    await setNotes(element, 'a', [
      { name: 'notes', label: 'Notes' },
      { name: 'log', label: 'Log' },
    ]);
    board(element, 'a').show('log');
    await settle(element);
    expect(element.panelOpen).toBe(false);

    element.openPanel('notes');
    await settle(element);
    board(element, 'a').show('log');
    await settle(element);
    expect(element.panelSection).toBe('log');
    expect(shownBody(element)).toBe('a:log:first');
  });

  it('go away with their board', async () => {
    const element = mount('<test-section-board id="a"></test-section-board>');
    await settle(element);
    await setNotes(element, 'a', [{ name: 'notes', label: 'Notes' }]);
    element.openPanel('notes');
    await settle(element);

    board(element, 'a').remove();
    await settle(element);
    expect(buttons(element)).toEqual([]);
    expect(launchers(element).hasAttribute('data-empty')).toBe(true);
    expect(tabs(element)).toEqual(['settings']);
    expect(shownBody(element)).toBeNull();
  });

  it('of the same name on two boards stay apart, apart from an author section, and keep their names', async () => {
    const element = mount(
      '<test-section-board id="a"></test-section-board><test-section-board id="b"></test-section-board>',
      '<dpk-panel-section slot="panel" name="notes" label="Author notes">points</dpk-panel-section>',
    );
    await settle(element);
    await setNotes(element, 'a', [{ name: 'notes', label: 'A notes' }]);
    await setNotes(element, 'b', [{ name: 'notes', label: 'B notes' }]);
    expect(buttons(element).map((candidate) => [candidate.dataset['section'], text(candidate)])).toEqual([
      ['notes-2', 'A notes'],
      ['notes-3', 'B notes'],
      ['notes', 'Author notes'],
    ]);

    button(element, 'notes-3').click();
    await settle(element);
    expect(shownBody(element)).toBe('b:notes:first');

    element.openPanel('notes-2');
    await settle(element);
    board(element, 'b').show('notes');
    await settle(element);
    expect(element.panelSection).toBe('notes-3');

    board(element, 'a').remove();
    await settle(element);
    expect(buttons(element).map((candidate) => [candidate.dataset['section'], text(candidate)])).toEqual([
      ['notes-3', 'B notes'],
      ['notes', 'Author notes'],
    ]);
    expect(element.panelSection).toBe('notes-3');
    expect(shownBody(element)).toBe('b:notes:first');
  });
});
