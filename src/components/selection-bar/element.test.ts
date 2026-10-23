import { afterEach, describe, expect, it } from 'vitest';

import { defineSelectionBar, type DpkSelectionBar } from './index';

defineSelectionBar();

const mount = async (label: string, inner = '<button>Group</button>'): Promise<DpkSelectionBar> => {
  const bar = document.createElement('dpk-selection-bar') as DpkSelectionBar;
  bar.setAttribute('label', label);
  bar.innerHTML = inner;
  document.body.append(bar);
  await bar.updateComplete;
  return bar;
};

const surfaceOf = (bar: DpkSelectionBar): HTMLElement | null | undefined =>
  bar.shadowRoot?.querySelector<HTMLElement>('.dpk-floatbar');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-selection-bar', () => {
  it('renders a labelled toolbar around whatever the host slotted in, unchanged', async () => {
    const bar = await mount('3 selected', '<button class="dpk-btn">Group</button>');
    const surface = surfaceOf(bar);
    expect(surface?.getAttribute('role')).toBe('toolbar');
    expect(surface?.getAttribute('aria-label')).toBe('3 selected');
    expect(bar.querySelector('button.dpk-btn')?.textContent).toBe('Group');
  });

  it('fires dpk-selection-clear when Escape is pressed inside the bar', async () => {
    const bar = await mount('1 selected');
    let cleared = 0;
    bar.addEventListener('dpk-selection-clear', () => {
      cleared += 1;
    });
    surfaceOf(bar)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cleared).toBe(1);
  });

  it('ignores keys other than Escape', async () => {
    const bar = await mount('1 selected');
    let cleared = 0;
    bar.addEventListener('dpk-selection-clear', () => {
      cleared += 1;
    });
    surfaceOf(bar)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(cleared).toBe(0);
  });

  it('is open on mount, and a later bar pre-empts (hides, not clears) an earlier one', async () => {
    const first = await mount('2 selected');
    expect(first.open).toBe(true);

    const second = await mount('1 selected');
    expect(second.open).toBe(true);
    expect(first.open).toBe(false);
    // The pre-empted bar's own slotted content (its host's selection) is untouched.
    expect(first.querySelector('button')).not.toBeNull();
  });

  it('releases its claim on disconnect, so it no longer pre-empts the next one mounted after it', async () => {
    const first = await mount('2 selected');
    first.remove();

    const second = await mount('1 selected');
    expect(second.open).toBe(true);
  });
});
