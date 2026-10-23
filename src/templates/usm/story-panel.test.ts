// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DpkTemplateUsm } from './element';

import '../../index';

const raw = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1' },
  ],
};

const settle = async (el: DpkTemplateUsm): Promise<void> => {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
};

const mount = async (hash: string): Promise<DpkTemplateUsm> => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-template-usm storage="memory">
      <script type="application/json">${JSON.stringify(raw)}</script>
    </dpk-template-usm>`;
  const el = document.querySelector('dpk-template-usm') as DpkTemplateUsm;
  await el.api.ready;
  await settle(el);
  return el;
};

const card = (el: DpkTemplateUsm, id: string): HTMLElement =>
  el.shadowRoot!.querySelector(`dpk-internal-usm-story-card[data-story="${id}"]`) as HTMLElement;

const panel = (el: DpkTemplateUsm): HTMLElement | null =>
  el.shadowRoot!.querySelector('[data-testid="usm-story-panel"]');

const key = (target: EventTarget, name: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

const pointerDown = (target: EventTarget): void => {
  // jsdom has no PointerEvent; the listener only reads the path and the button.
  target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true, button: 0 }));
};

describe('usm story panel: keyboard and pointer', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('makes a card a button the keyboard reaches and opens', async () => {
    const el = await mount('');
    const u1 = card(el, 'u1');
    expect(u1.getAttribute('tabindex')).toBe('0');
    expect(u1.getAttribute('role')).toBe('button');
    expect(u1.getAttribute('aria-label')).toBe('U1');
    u1.focus();
    expect(key(u1, 'Enter').defaultPrevented).toBe(true);
    await settle(el);
    expect(el.api.navigation['story']).toBe('u1');
    key(card(el, 'u2'), ' ');
    await settle(el);
    expect(el.api.navigation['story']).toBe('u2');
  });

  it('moves focus into the panel it opens and back to the card it closes on', async () => {
    const el = await mount('');
    card(el, 'u1').focus();
    key(card(el, 'u1'), 'Enter');
    await settle(el);
    expect(el.shadowRoot!.activeElement).toBe(panel(el));
    (panel(el)!.querySelector('[data-role="close"]') as HTMLButtonElement).click();
    await settle(el);
    expect(panel(el)).toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(card(el, 'u1'));
  });

  it('closes on Escape wherever the focus is, but leaves a cancelled edit alone', async () => {
    const el = await mount('#story=u1');
    expect(panel(el)).not.toBeNull();
    const handled = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    await settle(el);
    expect(panel(el)).not.toBeNull();
    key(document.body, 'Escape');
    await settle(el);
    expect(panel(el)).toBeNull();
    expect(el.api.navigation['story']).toBeUndefined();
  });

  it('closes on a press outside it, but not on a press inside it or on another card', async () => {
    const el = await mount('#story=u1');
    pointerDown(panel(el)!.querySelector('.sp-body')!);
    await settle(el);
    expect(panel(el)).not.toBeNull();
    pointerDown(card(el, 'u2'));
    await settle(el);
    expect(panel(el)).not.toBeNull();
    pointerDown(el.shadowRoot!.querySelector('[data-testid="usm-map"]')!);
    await settle(el);
    expect(panel(el)).toBeNull();
    expect(el.api.navigation['story']).toBeUndefined();
  });
});

describe('usm story panel: the story key', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('shows each story’s key on its card and opens a story the hash names by its key', async () => {
    const el = await mount('#story=STORY-2');
    expect(card(el, 'u1').shadowRoot!.querySelector('.dpk-card-key')?.textContent).toBe('STORY-1');
    expect(card(el, 'u2').shadowRoot!.querySelector('.dpk-card-key')?.textContent).toBe('STORY-2');
    expect(el.api.navigation['story']).toBe('u2');
    expect(panel(el)?.getAttribute('data-story')).toBe('u2');
  });

  it('copies the key from the panel and says so on the button', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const el = await mount('#story=u2');
    const button = panel(el)!.querySelector('[data-role="copy-key"]') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('STORY-2');
    expect(button.getAttribute('aria-label')).toBe('Copy STORY-2');
    button.click();
    await settle(el);
    expect(writeText).toHaveBeenCalledWith('STORY-2');
    const copied = panel(el)!.querySelector('[data-role="copy-key"]') as HTMLButtonElement;
    expect(copied.getAttribute('data-copied')).toBe('true');
    expect(copied.getAttribute('aria-label')).toBe('Copied');
  });
});
