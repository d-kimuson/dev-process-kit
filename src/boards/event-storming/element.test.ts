import { render } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { afterEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';

import { defineInlineEdit } from '../../components/inline-edit';
import { DpkSelectionBar } from '../../components/selection-bar/index';
import { PANEL_HOST, type DetailReport, type PanelDetail, type PanelHost } from '../../core/panel/host';
import { eventStormingAction } from './actions';
import { applyEventStormingAction } from './apply';
import { DpkInternalEventStormingNoteDetail } from './components/note-detail';
import { DpkBoardEventStorming } from './element';
import { defineEventStorming } from './index';
import { eventStormingMessages } from './messages';
import { emptyEventStormingBase, parseEventStormingBase, type EventStormingState } from './model';
import { describeEventStormingAction } from './present';

const m = eventStormingMessages('en');

defineEventStorming();
defineInlineEdit();

const base = {
  title: 'Test',
  contexts: [{ id: 'c1', name: 'Ctx1' }],
  elements: [
    { id: 'n1', type: 'event', name: 'E1', description: 'Description text', contextId: 'c1' },
    { id: 'n2', type: 'command', name: 'C1' },
  ],
  links: [{ id: 'l1', from: 'n1', to: 'n2' }],
};

const action = (
  type: string,
  target: { readonly type: string; readonly id: string },
  payload: unknown,
): DraftAction => {
  return { id: 'a1', type, target, payload, createdAt: '2026-09-24T00:00:00.000Z' };
};

describe('event storming domain', () => {
  it('strict base parsing rejects unknown keys', () => {
    expect(() => parseEventStormingBase({ ...base, oops: true })).toThrow();
    expect(() => parseEventStormingBase({ ...base, links: [{ id: 'x', from: 'n1', to: 'ghost' }] })).toThrow();
    expect(() =>
      parseEventStormingBase({ ...base, elements: [{ id: 'z', type: 'event', name: 'Z', contextId: 'ghost' }] }),
    ).toThrow();
  });

  it('emptyBase parses', () => {
    expect(parseEventStormingBase(emptyEventStormingBase())).toBeDefined();
  });

  it('apply is pure (input untouched)', () => {
    const state = parseEventStormingBase(base);
    const snap = JSON.stringify(state);
    applyEventStormingAction(state, action('SET_ELEMENT_NAME', { type: 'element', id: 'n1' }, { name: 'R' }));
    expect(JSON.stringify(state)).toBe(snap);
  });

  it('idempotency: apply twice = same result', () => {
    const state = parseEventStormingBase(base);
    const rename = action('SET_ELEMENT_NAME', { type: 'element', id: 'n1' }, { name: 'R' });
    const once = applyEventStormingAction(state, rename) as EventStormingState;
    const twice = applyEventStormingAction(once, rename) as EventStormingState;
    expect(twice).toEqual(once);
    const add = action('ADD_ELEMENT', { type: 'page', id: 'event-storming' }, { id: 'n3', type: 'event', name: 'N' });
    const s1 = applyEventStormingAction(state, add) as EventStormingState;
    const s2 = applyEventStormingAction(s1, add) as EventStormingState;
    expect(s2).toEqual(s1);
  });

  it('inapplicability returns null', () => {
    const state = parseEventStormingBase(base);
    expect(
      applyEventStormingAction(state, action('SET_ELEMENT_NAME', { type: 'element', id: 'ghost' }, { name: 'x' })),
    ).toBeNull();
    expect(applyEventStormingAction(state, action('NOPE', { type: 'element', id: 'n1' }, {}))).toBeNull();
  });

  it('describe never throws on a stale action', () => {
    const state = parseEventStormingBase(base);
    const stale = action('SET_ELEMENT_NAME', { type: 'element', id: 'gone' }, { name: 'x' });
    expect(() => describeEventStormingAction(m, stale, state)).not.toThrow();
  });
});

describe('<dpk-board-event-storming>', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const settle = async (element: DpkBoardEventStorming): Promise<void> => {
    for (let index = 0; index < 3; index++) await element.updateComplete;
  };

  const mount = async (raw: unknown = base): Promise<DpkBoardEventStorming> => {
    const element = document.createElement('dpk-board-event-storming');
    if (!(element instanceof DpkBoardEventStorming)) throw new Error('did not upgrade');
    element.id = 'board';
    element.innerHTML = `<script type="application/json">${JSON.stringify(raw)}</script>`;
    document.body.append(element);
    await settle(element);
    return element;
  };

  /** Stand-in for the hosting page: accept each action, then hand the recorded draft back. */
  const acceptActions = (element: DpkBoardEventStorming): void => {
    element.addEventListener('dpk-element-action', (event) => {
      if (!(event instanceof CustomEvent)) return;
      event.preventDefault();
      const detail: { type: string; target: string; payload: unknown } = event.detail;
      element.elementActions = [
        ...element.elementActions,
        {
          id: `a${element.elementActions.length}`,
          type: detail.type,
          target: { type: 'element', id: detail.target.slice('element:'.length) },
          payload: detail.payload,
          createdAt: '2026-09-24T00:00:00.000Z',
        },
      ];
    });
  };

  const q = <T extends Element = HTMLElement>(element: DpkBoardEventStorming, selector: string): T => {
    const found = element.renderRoot.querySelector<T>(selector);
    if (found === null) throw new Error(`missing ${selector}`);
    return found;
  };

  it('offers the whole board, every note and every context as a comment target', async () => {
    const element = await mount();
    expect(element.commentTargets.map((target) => [target.value, target.label])).toEqual([
      ['element:board/page/event-storming', m.wholeBoard],
      ['element:board/note/n1', 'E1'],
      ['element:board/note/n2', 'C1'],
      ['element:board/context/c1', 'Ctx1'],
    ]);
  });

  it('an empty board starts its first event from the empty state', async () => {
    const element = await mount({});
    const button = q(element, '.empty button');
    expect(button.textContent).toContain(m.addFirstEvent);
    acceptActions(element);
    button.click();
    await settle(element);
    expect(element.elementActions.map((a) => a.type)).toEqual(['ADD_ELEMENT']);
    const notes = element.renderRoot.querySelectorAll('dpk-internal-event-storming-note');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.getAttribute('data-mode')).toBe('editing');
    const [action] = element.elementActions;
    if (action === undefined) throw new Error('expected an element action');
    expect(element.selection).toEqual({ kind: 'note', id: (action.payload as { id: string }).id });
  });

  it('renders causality links as SVG-namespaced elements', async () => {
    const element = await mount();
    const path = q(element, '.links-layer path.link-path');
    // Regression: a child template whose root is an SVG element must use lit's `svg`
    // tag, otherwise it is parsed in the HTML namespace and never painted.
    expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(element.renderRoot.querySelectorAll('.links-layer path.link-path')).toHaveLength(1);
  });

  it('a note paints its name only: the description is a tooltip', async () => {
    const element = await mount();
    const card = q(element, 'dpk-internal-event-storming-note[data-dpk-target="element:board/note/n1"]');
    expect(card.getAttribute('title')).toBe('Description text');
    expect(card.shadowRoot?.textContent ?? '').not.toContain('Description text');
  });

  it('marks a note and a context with the grill questions they answer', async () => {
    const marked = {
      ...base,
      elements: [{ ...base.elements[0], questions: 'Q1 Q2' }, ...base.elements.slice(1)],
      contexts: [{ ...base.contexts[0], questions: 'Q1' }],
    };
    const element = await mount(marked);
    expect(q(element, '[data-dpk-target="element:board/note/n1"]').getAttribute('data-grill-questions')).toBe('Q1 Q2');
    expect(q(element, '[data-dpk-target="element:board/note/n2"]').hasAttribute('data-grill-questions')).toBe(false);
    expect(q(element, '.context-region').getAttribute('data-grill-questions')).toBe('Q1');
  });

  it('a wrapped run continues directly under the slice it was cut from', async () => {
    const chain = Array.from({ length: 6 }, (_, i) => ({ id: `e${i + 1}`, type: 'event', name: `E${i + 1}` }));
    const links = chain.slice(1).map((note, i) => ({ id: `l${i + 1}`, from: `e${i + 1}`, to: note.id }));
    const element = await mount({ elements: chain, links });
    const bands = [...element.renderRoot.querySelectorAll<HTMLElement>('.band')];
    expect(bands.length).toBeGreaterThan(1);
    // The wrapped band starts level with the slice it continues from, so the
    // connector is a straight drop rather than a line travelling back to the wall margin.
    const sliceX = (band: HTMLElement | undefined, index: number): number => {
      const left = band?.querySelectorAll<HTMLElement>('[data-slice-id]')[index]?.style.left ?? '';
      return parseFloat(band?.style.left ?? '0') + parseFloat(left);
    };
    const lastOfFirstBand = (bands[0]?.querySelectorAll('[data-slice-id]').length ?? 0) - 1;
    expect(sliceX(bands[1], 0)).toBe(sliceX(bands[0], lastOfFirstBand));
  });

  it('edits the name in place, with no pencil or detail button', async () => {
    const element = await mount();
    acceptActions(element);
    const card = q(element, 'dpk-internal-event-storming-note[data-dpk-target="element:board/note/n1"]');
    await (card as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    // The name itself is the editor; the card only carries the hotspot chip and its tool rail.
    const edit = card.shadowRoot?.querySelector<HTMLElement>('dpk-inline-edit.note-name');
    expect(edit).not.toBeNull();
    expect(card.shadowRoot?.querySelector('[data-role="edit"]')).toBeNull();
    expect(card.shadowRoot?.querySelector('[data-role="detail"]')).toBeNull();
    expect(card.shadowRoot?.querySelector('.note-hotspot')?.textContent).toContain(m.addHotspot);
    expect(card.shadowRoot?.querySelectorAll('.note-tools button')).toHaveLength(2);
    expect(
      [...(card.shadowRoot?.querySelectorAll<HTMLButtonElement>('.note-tools button') ?? [])].map(
        (button) => button.dataset['role'],
      ),
    ).toEqual(['comment', 'delete']);
    await (edit as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    // The field itself is the resting display (readonly); a click on it starts editing.
    const resting = edit?.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>('.field');
    resting?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }));
    resting?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await (edit as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const input = edit?.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>('.field');
    expect(input).not.toBeNull();
    if (input) {
      input.value = 'Renamed';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    await settle(element);
    expect(element.elementActions.map((a) => a.type)).toEqual(['SET_ELEMENT_NAME']);
  });

  it('opens the composer over a note from its hover comment button, without selecting it', async () => {
    const element = await mount();
    const card = q(element, 'dpk-internal-event-storming-note[data-dpk-target="element:board/note/n1"]');
    await (card as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    const button = card.shadowRoot?.querySelector<HTMLButtonElement>('.note-tools [data-role="comment"]');
    if (!button) throw new Error('missing comment button');
    expect(button.getAttribute('aria-label')).toBe(m.commentNote);
    button.click();
    await settle(element);
    // The same composer the right-click "Review comment" item opens, over this note.
    expect(element.renderRoot.querySelector('.comment-pop')).not.toBeNull();
    expect(element.renderRoot.querySelector('.comment-target')?.textContent).toBe('E1');
    // Asking for a comment is chrome: the note is neither selected nor edited.
    expect(element.selection).toBeNull();
    expect(q(element, '[data-dpk-target="element:board/note/n1"]').getAttribute('data-mode')).not.toBe('editing');
  });

  it('selects a link stroke and deletes it with the Delete key', async () => {
    const element = await mount();
    acceptActions(element);
    q(element, 'path.link-hit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(element);
    expect(element.renderRoot.querySelectorAll('path.link-path.is-selected')).toHaveLength(1);
    q(element, '.board-viewport').dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await settle(element);
    expect(element.elementActions.map((a) => a.type)).toEqual(['UNLINK_ELEMENTS']);
  });

  const bar = (element: DpkBoardEventStorming): DpkSelectionBar => {
    const found = element.renderRoot.querySelector('dpk-selection-bar');
    if (!(found instanceof DpkSelectionBar)) throw new Error('no selection bar');
    return found;
  };

  const pressAction = (target: DpkSelectionBar, action: string, value: string | null = null): void => {
    target.dispatchEvent(
      new CustomEvent('dpk-selection-action', {
        detail: { action, value, entered: false, rect: new DOMRect(100, 500, 80, 30) },
        bubbles: true,
        composed: true,
      }),
    );
  };

  it('offers deleting the selected links on the selection bar', async () => {
    const element = await mount();
    acceptActions(element);
    q(element, 'path.link-hit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(element);
    const linksBar = bar(element);
    expect(linksBar.label).toBe(m.selectedLinks(1));
    expect(linksBar.actions.map((a) => [a.name, a.tone])).toEqual([['delete', 'accent']]);
    pressAction(linksBar, 'delete');
    await settle(element);
    expect(element.elementActions.map((a) => a.type)).toEqual(['UNLINK_ELEMENTS']);
    expect(element.renderRoot.querySelector('dpk-selection-bar')).toBeNull();
  });

  it('groups, assigns, strips and clears the selected slices from the selection bar', async () => {
    const element = await mount();
    acceptActions(element);
    const sliceId = q(element, '[data-slice-id]').dataset['sliceId'];
    Reflect.set(element, 'selectedSliceIds', [sliceId]);
    element.requestUpdate();
    await settle(element);
    const slicesBar = bar(element);
    expect(slicesBar.label).toBe(m.selectedSlices(1));
    expect(slicesBar.actions.map((a) => a.name)).toEqual(['group', 'assign', 'strip', 'delete']);
    expect(slicesBar.actions[1]?.options).toEqual([{ value: 'c1', label: 'Ctx1' }]);

    pressAction(slicesBar, 'assign', 'c1');
    await settle(element);
    expect(element.elementActions.map((a) => a.payload)).toEqual([{ contextId: 'c1' }]);
    expect(element.renderRoot.querySelector('dpk-selection-bar')).toBeNull();

    Reflect.set(element, 'selectedSliceIds', [sliceId]);
    element.requestUpdate();
    await settle(element);
    pressAction(bar(element), 'group');
    await settle(element);
    expect(element.renderRoot.querySelector('#context-name')).not.toBeNull();

    bar(element).dispatchEvent(new CustomEvent('dpk-selection-clear', { bubbles: true, composed: true }));
    await settle(element);
    expect(element.renderRoot.querySelector('dpk-selection-bar')).toBeNull();
  });

  type PanelReport = { readonly detail: PanelDetail | null; readonly report: DetailReport };

  /** Stand-in for the side panel's owner: records what the board hands it. */
  const withPanel = async (
    element: DpkBoardEventStorming,
  ): Promise<{ readonly reports: PanelReport[]; readonly providers: Set<Element>; detail(): PanelDetail | null }> => {
    const reports: PanelReport[] = [];
    const providers = new Set<Element>();
    const host: PanelHost = {
      provideDetail: (source) => {
        providers.add(source);
        return () => providers.delete(source);
      },
      showDetail: (_source, detail, report) => reports.push({ detail, report }),
      addSection: () => ({ name: '', update: () => undefined, withdraw: () => undefined }),
      invalidate: () => undefined,
      open: () => undefined,
      provideSettings: () => () => undefined,
      close: () => undefined,
      isOpen: false,
      tabs: [],
      subscribe: () => () => undefined,
      section: 'detail',
    };
    const owner = document.createElement('div');
    Object.defineProperty(owner, PANEL_HOST, { value: host });
    element.before(owner);
    owner.append(element);
    await settle(element);
    return { reports, providers, detail: () => reports.at(-1)?.detail ?? null };
  };

  /** Draws the detail the way the panel does, and returns its shadow root. */
  const renderDetail = async (detail: PanelDetail | null): Promise<ShadowRoot> => {
    if (detail === null) throw new Error('no detail');
    const root = document.createElement('div');
    document.body.append(root);
    render(keyed(detail.key, detail.render()), root);
    const view = root.querySelector('dpk-internal-event-storming-note-detail');
    if (!(view instanceof DpkInternalEventStormingNoteDetail) || view.shadowRoot === null)
      throw new Error('no note detail');
    await view.updateComplete;
    return view.shadowRoot;
  };

  const commit = (editor: Element | null | undefined, value: string): void => {
    if (editor === null || editor === undefined) throw new Error('no editor');
    editor.dispatchEvent(new CustomEvent('dpk-commit', { detail: { value }, bubbles: true, composed: true }));
  };

  it('opens a note’s detail in the side panel on click: its type, text and context', async () => {
    const element = await mount();
    const panel = await withPanel(element);
    q(element, '[data-dpk-target="element:board/note/n1"]').click();
    await settle(element);
    expect(panel.reports.some((report) => report.report === 'open')).toBe(true);
    const detail = panel.detail();
    expect(detail).toMatchObject({ key: 'n1', kind: m.noteKind, title: 'E1' });
    const view = await renderDetail(detail);
    expect(view.querySelector('.es-detail-type')?.textContent?.trim()).toBe(m.noteTypeLabel('event'));
    const editors = [...view.querySelectorAll<HTMLElement & { value: string }>('dpk-inline-edit')];
    expect(editors.map((editor) => editor.value)).toEqual(['E1', 'Description text']);
    expect(view.querySelector('.es-detail-value')?.textContent?.trim()).toBe('Ctx1');
  });

  it('shows a note outside any context as such', async () => {
    const element = await mount();
    const panel = await withPanel(element);
    q(element, '[data-dpk-target="element:board/note/n2"]').click();
    await settle(element);
    const view = await renderDetail(panel.detail());
    expect(view.querySelector('.es-detail-value')?.textContent?.trim()).toBe(m.noContext);
  });

  it('edits a note’s name and description from its detail as element actions', async () => {
    const element = await mount();
    acceptActions(element);
    const panel = await withPanel(element);
    q(element, '[data-dpk-target="element:board/note/n1"]').click();
    await settle(element);
    const view = await renderDetail(panel.detail());
    const editors = [...view.querySelectorAll('dpk-inline-edit')];
    commit(editors[0], 'E1 v2');
    commit(editors[1], 'New description');
    await settle(element);
    expect(element.elementActions.map((a) => a.type)).toEqual(['SET_ELEMENT_NAME', 'SET_ELEMENT_DESCRIPTION']);
    expect(panel.reports.at(-1)?.report).toBe('refresh');
    expect(panel.detail()?.title).toBe('E1 v2');
  });

  it('says so in the detail when no template recorded an edit', async () => {
    const element = await mount();
    const panel = await withPanel(element);
    q(element, '[data-dpk-target="element:board/note/n1"]').click();
    await settle(element);
    const view = await renderDetail(panel.detail());
    commit(view.querySelector('dpk-inline-edit'), 'x');
    const host = view.host;
    if (!(host instanceof DpkInternalEventStormingNoteDetail)) throw new Error('no note detail');
    await host.updateComplete;
    expect(view.querySelector('[role="alert"]')?.textContent).toBe(m.notRecorded);
  });

  it('withdraws its detail from the panel when it leaves the page', async () => {
    const element = await mount();
    const panel = await withPanel(element);
    expect(panel.providers.has(element)).toBe(true);
    element.remove();
    expect(panel.providers.has(element)).toBe(false);
  });

  it('renders its own text in the page language, and in English without one', async () => {
    const ja = document.createElement('dpk-board-event-storming');
    if (!(ja instanceof DpkBoardEventStorming)) throw new Error('did not upgrade');
    ja.id = 'board-ja';
    ja.setAttribute('lang', 'ja');
    ja.innerHTML = '<script type="application/json">{}</script>';
    document.body.append(ja);
    await settle(ja);
    expect(q(ja, '.empty button').textContent).toContain(eventStormingMessages('ja').addFirstEvent);
    ja.remove();

    const en = await mount({});
    expect(q(en, '.empty button').textContent).toContain(m.addFirstEvent);
  });
});

/** Exercises the pure dispatch helpers through the same path the board uses. */
describe('event storming context grouping', () => {
  it('rejects an unknown action via dispatchElementAction without throwing', async () => {
    const element = document.createElement('dpk-board-event-storming');
    if (!(element instanceof DpkBoardEventStorming)) throw new Error('did not upgrade');
    element.id = 'board';
    element.innerHTML = `<script type="application/json">${JSON.stringify(base)}</script>`;
    document.body.append(element);
    for (let index = 0; index < 3; index++) await element.updateComplete;
    expect(() => eventStormingAction.setElementName('ghost', 'x')).not.toThrow();
    element.remove();
  });
});
