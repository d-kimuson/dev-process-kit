import { afterEach, describe, expect, it } from 'vitest';

import type { SelectionBarAction, SelectionBarActionDetail } from './types';

import { defineSelectionBar, type DpkSelectionBar } from './index';

defineSelectionBar();

const ACTIONS: readonly SelectionBarAction[] = [
  { name: 'delete', label: 'Delete' },
  {
    name: 'move',
    label: 'Move',
    options: [
      { value: 'todo', label: 'To do', disabled: true },
      { value: 'done', label: 'Done' },
    ],
  },
  {
    name: 'tag',
    label: 'Tags',
    options: [
      { value: 'ui', label: 'UI', checked: 'mixed', hint: '1/2' },
      { value: 'api', label: 'API', checked: false, hint: '0/2' },
    ],
    entry: { placeholder: 'New tag' },
  },
];

const mount = async (
  setup: (bar: DpkSelectionBar) => void = (bar) => {
    bar.count = 3;
    bar.actions = ACTIONS;
  },
  lang = 'en',
): Promise<DpkSelectionBar> => {
  const bar = document.createElement('dpk-selection-bar') as DpkSelectionBar;
  setup(bar);
  const holder = document.createElement('div');
  holder.lang = lang;
  holder.append(bar);
  document.body.append(holder);
  await bar.updateComplete;
  return bar;
};

const root = (bar: DpkSelectionBar): ShadowRoot => {
  if (bar.shadowRoot === null) throw new Error('no shadow root');
  return bar.shadowRoot;
};

const surfaceOf = (bar: DpkSelectionBar): HTMLElement | null => root(bar).querySelector<HTMLElement>('.dpk-floatbar');

const button = (bar: DpkSelectionBar, selector: string): HTMLButtonElement => {
  const found = root(bar).querySelector<HTMLButtonElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
};

const recordActions = (bar: DpkSelectionBar): Omit<SelectionBarActionDetail, 'rect'>[] => {
  const seen: Omit<SelectionBarActionDetail, 'rect'>[] = [];
  bar.addEventListener('dpk-selection-action', (event) => {
    const { action, value, entered } = (event as CustomEvent<SelectionBarActionDetail>).detail;
    seen.push({ action, value, entered });
  });
  return seen;
};

const countClears = (bar: DpkSelectionBar): { count: number } => {
  const cleared = { count: 0 };
  bar.addEventListener('dpk-selection-clear', () => {
    cleared.count += 1;
  });
  return cleared;
};

const escape = (target: Element): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }),
  );
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-selection-bar', () => {
  it('shows the count in the locale’s words, as the toolbar’s name too', async () => {
    const en = await mount();
    expect(root(en).querySelector('.count')?.textContent).toBe('3 selected');
    expect(surfaceOf(en)?.getAttribute('role')).toBe('toolbar');
    expect(surfaceOf(en)?.getAttribute('aria-label')).toBe('3 selected');

    const ja = await mount((bar) => {
      bar.count = 2;
    }, 'ja');
    expect(root(ja).querySelector('.count')?.textContent).toBe('2 件選択');
  });

  it('shows the label instead of the count text when one is given', async () => {
    const bar = await mount((element) => {
      element.count = 2;
      element.label = '2 links selected';
    });
    expect(root(bar).querySelector('.count')?.textContent).toBe('2 links selected');
    expect(surfaceOf(bar)?.getAttribute('aria-label')).toBe('2 links selected');
  });

  it('reports a plain action at once', async () => {
    const bar = await mount();
    const seen = recordActions(bar);
    button(bar, '[data-action="delete"]').click();
    expect(seen).toEqual([{ action: 'delete', value: null, entered: false }]);
  });

  it('opens a menu of choices from an action, reports the one chosen and closes', async () => {
    const bar = await mount();
    const seen = recordActions(bar);
    const move = button(bar, '[data-action="move"]');
    expect(move.getAttribute('aria-haspopup')).toBe('menu');
    move.click();
    await bar.updateComplete;
    expect(move.getAttribute('aria-expanded')).toBe('true');
    expect(button(bar, '[data-value="todo"]').disabled).toBe(true);
    button(bar, '[data-value="done"]').click();
    await bar.updateComplete;
    expect(seen).toEqual([{ action: 'move', value: 'done', entered: false }]);
    expect(root(bar).querySelector('.menu')).toBeNull();
  });

  it('keeps an on/off menu open, so several choices can be switched in a row', async () => {
    const bar = await mount();
    const seen = recordActions(bar);
    button(bar, '[data-action="tag"]').click();
    await bar.updateComplete;
    const ui = button(bar, '[data-value="ui"]');
    expect(ui.getAttribute('role')).toBe('menuitemcheckbox');
    expect(ui.getAttribute('aria-checked')).toBe('mixed');
    ui.click();
    button(bar, '[data-value="api"]').click();
    await bar.updateComplete;
    expect(seen.map(({ value }) => value)).toEqual(['ui', 'api']);
    expect(root(bar).querySelector('.menu')).not.toBeNull();
  });

  it('sends the text typed into a menu’s entry on Enter', async () => {
    const bar = await mount();
    const seen = recordActions(bar);
    button(bar, '[data-action="tag"]').click();
    await bar.updateComplete;
    const input = root(bar).querySelector<HTMLInputElement>('.entry');
    if (input === null) throw new Error('no entry');
    input.value = '  payments ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    expect(seen).toEqual([{ action: 'tag', value: 'payments', entered: true }]);
    expect(input.value).toBe('');
  });

  it('asks the host to clear from its close button', async () => {
    const bar = await mount();
    const cleared = countClears(bar);
    button(bar, '[data-role="clear"]').click();
    expect(cleared.count).toBe(1);
  });

  it('closes an open menu on Escape first, and asks to clear on the next one', async () => {
    const bar = await mount();
    const cleared = countClears(bar);
    button(bar, '[data-action="move"]').click();
    await bar.updateComplete;
    escape(button(bar, '[data-value="done"]'));
    await bar.updateComplete;
    expect(root(bar).querySelector('.menu')).toBeNull();
    expect(cleared.count).toBe(0);
    escape(button(bar, '[data-action="move"]'));
    expect(cleared.count).toBe(1);
  });

  it('closes the menu on a press outside the bar', async () => {
    const bar = await mount();
    button(bar, '[data-action="move"]').click();
    await bar.updateComplete;
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await bar.updateComplete;
    expect(root(bar).querySelector('.menu')).toBeNull();
  });

  it('keeps what the host slots in beside the actions', async () => {
    const bar = await mount((element) => {
      element.count = 1;
      element.innerHTML = '<button class="dpk-btn">Extra</button>';
    });
    expect(bar.querySelector('button')?.textContent).toBe('Extra');
    expect(root(bar).querySelector('.actions slot')).not.toBeNull();
  });

  it('is open on mount, and a later bar pre-empts (hides, not clears) an earlier one', async () => {
    const first = await mount();
    expect(first.open).toBe(true);

    const second = await mount();
    expect(second.open).toBe(true);
    expect(first.open).toBe(false);
    expect(first.actions).toBe(ACTIONS);
  });

  it('releases its claim on disconnect, so it no longer pre-empts the next one mounted after it', async () => {
    const first = await mount();
    first.remove();

    const second = await mount();
    expect(second.open).toBe(true);
  });
});
