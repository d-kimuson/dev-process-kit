import { afterEach, describe, expect, it } from 'vitest';

import { defineDialogPanel, type DpkDialogPanel } from './index';

defineDialogPanel();

const mount = async (attributes = ''): Promise<DpkDialogPanel> => {
  document.body.innerHTML = `<dpk-dialog-panel heading="Orders" subject="lifecycle" ${attributes}>
    <button slot="actions" id="action">Search</button>
    <p id="body">Body</p>
  </dpk-dialog-panel>`;
  const panel = document.querySelector('dpk-dialog-panel') as DpkDialogPanel;
  await panel.updateComplete;
  return panel;
};

const maximizeButton = (panel: DpkDialogPanel): HTMLButtonElement | null =>
  panel.shadowRoot?.querySelector<HTMLButtonElement>('.maximize') ?? null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-dialog-panel', () => {
  it('titles the header and slots the actions and the body', async () => {
    const panel = await mount();
    expect(panel.shadowRoot?.querySelector('.title')?.textContent).toBe('Orders');
    expect(panel.shadowRoot?.querySelector('.subject')?.textContent).toBe('lifecycle');
    const actions = panel.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="actions"]');
    expect(actions?.assignedElements().map((element) => element.id)).toEqual(['action']);
  });

  it('offers the maximize button only when maximizable', async () => {
    expect(maximizeButton(await mount())).toBeNull();
    expect(maximizeButton(await mount('maximizable'))).not.toBeNull();
  });

  it('maximizes from its button and announces the change', async () => {
    const panel = await mount('maximizable');
    const changes: boolean[] = [];
    panel.addEventListener('dpk-maximize-change', (event) => {
      changes.push((event as CustomEvent<{ maximized: boolean }>).detail.maximized);
    });
    maximizeButton(panel)?.click();
    await panel.updateComplete;
    expect(panel.maximized).toBe(true);
    expect(panel.hasAttribute('maximized')).toBe(true);
    expect(panel.shadowRoot?.querySelector('.placeholder')).not.toBeNull();
    expect(changes).toEqual([true]);
  });

  it('restores on Escape unless something inside handled the key', async () => {
    const panel = await mount('maximizable maximized');
    const action = document.getElementById('action');
    action?.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
    action?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }),
    );
    await panel.updateComplete;
    expect(panel.maximized).toBe(true);
    action?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }),
    );
    await panel.updateComplete;
    expect(panel.maximized).toBe(false);
  });
});

describe('dpk-dialog-panel control menu', () => {
  const controls = (panel: DpkDialogPanel): HTMLElement | null =>
    panel.shadowRoot?.querySelector<HTMLElement>('[part="controls"]') ?? null;

  it('hides the menu when there is nothing to control', async () => {
    expect(controls(await mount())?.hidden).toBe(true);
  });

  it('puts the maximize button and the resize grip in the menu', async () => {
    const panel = await mount('maximizable resizable');
    expect(controls(panel)?.hidden).toBe(false);
    expect(controls(panel)?.querySelector('.maximize')).not.toBeNull();
    expect(controls(panel)?.querySelector('[role="separator"][aria-orientation="horizontal"]')).not.toBeNull();
  });

  it('slots buttons of its own use into the menu', async () => {
    document.body.innerHTML = `<dpk-dialog-panel heading="Board">
      <button slot="controls" id="extra">Reset</button>
      <p>Body</p>
    </dpk-dialog-panel>`;
    const panel = document.querySelector('dpk-dialog-panel') as DpkDialogPanel;
    await panel.updateComplete;
    const slot = controls(panel)?.querySelector<HTMLSlotElement>('slot[name="controls"]');
    expect(slot?.assignedElements().map((element) => element.id)).toEqual(['extra']);
    expect(controls(panel)?.hidden).toBe(false);
  });

  it('moves the menu under the maximized panel, where it centers at the bottom', async () => {
    const panel = await mount('maximizable resizable');
    const section = () => panel.shadowRoot?.querySelector('.panel');
    expect(controls(panel)?.closest('.panel.is-maximized')).toBeNull();
    maximizeButton(panel)?.click();
    await panel.updateComplete;
    expect(section()?.classList.contains('is-maximized')).toBe(true);
    expect(controls(panel)?.closest('.panel.is-maximized')).not.toBeNull();
  });

  it('resizes from the grip with the arrow keys and restores on a double-click', async () => {
    const panel = await mount('resizable');
    const grip = panel.shadowRoot?.querySelector<HTMLElement>('.grip');
    const section = panel.shadowRoot?.querySelector<HTMLElement>('.panel');
    grip?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await panel.updateComplete;
    // jsdom lays nothing out: the panel starts from 0 and stops at the minimum.
    expect(section?.style.height).toBe('160px');
    grip?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await panel.updateComplete;
    expect(section?.style.height).toBe('');
  });
});

describe('dpk-dialog-panel canvas', () => {
  const mountCanvas = async (attributes = ''): Promise<DpkDialogPanel> => {
    document.body.innerHTML = `<dpk-dialog-panel canvas content-width="800" content-height="400" ${attributes}>
      <div id="content">World</div>
      <p slot="overlay" id="legend">Legend</p>
    </dpk-dialog-panel>`;
    const panel = document.querySelector('dpk-dialog-panel') as DpkDialogPanel;
    await panel.updateComplete;
    return panel;
  };

  it('slots the content into the world and the overlay over the canvas', async () => {
    const panel = await mountCanvas();
    const world = panel.shadowRoot?.querySelector('.world slot') as HTMLSlotElement;
    const overlay = panel.shadowRoot?.querySelector('.canvas slot[name="overlay"]') as HTMLSlotElement;
    expect(world.assignedElements().map((element) => element.id)).toEqual(['content']);
    expect(overlay.assignedElements().map((element) => element.id)).toEqual(['legend']);
  });

  it('sizes the world to the given content box', async () => {
    const panel = await mountCanvas();
    const world = panel.shadowRoot?.querySelector<HTMLElement>('.world');
    expect(world?.style.width).toBe('800px');
    expect(world?.style.height).toBe('400px');
  });

  it('zooms from the control menu and reports the view', async () => {
    const panel = await mountCanvas('initial="actual"');
    const views: number[] = [];
    panel.addEventListener('dpk-canvas-change', (event) => {
      views.push((event as CustomEvent<{ view: { scale: number } }>).detail.view.scale);
    });
    panel.shadowRoot?.querySelector<HTMLButtonElement>('[part="controls"] button[aria-label="Zoom in"]')?.click();
    expect(panel.view.scale).toBeCloseTo(1.1);
    expect(views.at(-1)).toBeCloseTo(1.1);
    expect(panel.shadowRoot?.querySelector('.zoom-value')?.textContent).toBe('110%');
  });

  it('asks before Escape: a cancelled dismiss keeps the key, an ignored one lets it through', async () => {
    const panel = await mountCanvas();
    const canvas = panel.shadowRoot?.querySelector<HTMLElement>('.canvas');
    const escape = (): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true });
      canvas?.dispatchEvent(event);
      return event;
    };
    expect(escape().defaultPrevented).toBe(false);
    panel.addEventListener('dpk-canvas-dismiss', (event) => event.preventDefault());
    expect(escape().defaultPrevented).toBe(true);
  });
});
