// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContextMenuGroup, ContextMenuRequest } from '../../core/context-menu/types';
import type { DpkViewUsm } from './element';

import '../../index';

const raw = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1' },
    { id: 'u2', name: 'U2', activityId: 'a1', stepId: 's1' },
  ],
};

// A story with every kind of metadata a copy carries.
const richRaw = {
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  milestones: [{ id: 'mvp', name: 'MVP' }],
  statuses: [
    { id: 'todo', name: 'Todo' },
    { id: 'done', name: 'Done' },
  ],
  labels: [{ id: 'fe', name: 'frontend' }],
  stories: [
    { id: 'u1', name: 'U1', activityId: 'a1', stepId: 's1' },
    {
      id: 'u2',
      name: 'U2',
      activityId: 'a1',
      stepId: 's1',
      milestoneId: 'mvp',
      labelIds: ['fe'],
      description: 'As a user, I can sign in.',
      links: [{ url: 'https://example.com/design', label: 'Design' }],
    },
  ],
};

const richInfo = [
  '### STORY-2 U2',
  '',
  '- Status: Todo',
  '- Step: A1 › S1 (MVP)',
  '- Labels: frontend',
  '- Links: [Design](https://example.com/design)',
  '',
  'As a user, I can sign in.',
  '',
].join('\n');

const settle = async (el: DpkViewUsm): Promise<void> => {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
};

const mountWith = async (base: unknown, hash: string): Promise<DpkViewUsm> => {
  window.location.hash = hash;
  document.body.innerHTML = `
    <dpk-view-usm storage="memory">
      <script type="application/json">${JSON.stringify(base)}</script>
    </dpk-view-usm>`;
  const el = document.querySelector('dpk-view-usm') as DpkViewUsm;
  await el.api.ready;
  await settle(el);
  return el;
};

const mount = (hash: string): Promise<DpkViewUsm> => mountWith(raw, hash);

const card = (el: DpkViewUsm, id: string): HTMLElement =>
  el.shadowRoot!.querySelector(`dpk-internal-usm-story-card[data-story="${id}"]`) as HTMLElement;

const panel = (el: DpkViewUsm): HTMLElement | null => el.shadowRoot!.querySelector('[data-testid="usm-story-panel"]');

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

describe('usm story copy: the panel buttons and the card menu', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  const clipboard = () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    return writeText;
  };

  const copyButton = (el: DpkViewUsm, role: string): HTMLButtonElement =>
    panel(el)!.querySelector(`[data-role="${role}"]`) as HTMLButtonElement;

  it('copies the story’s id and title from the panel and says so on that button alone', async () => {
    const writeText = clipboard();
    const el = await mountWith(richRaw, '#story=u2');
    const button = copyButton(el, 'copy-id-title');
    expect(button.getAttribute('aria-label')).toBe('Copy ID + title');
    expect(button.getAttribute('data-copied')).toBe('false');
    button.click();
    await settle(el);
    expect(writeText).toHaveBeenCalledWith('STORY-2 U2');
    const copied = copyButton(el, 'copy-id-title');
    expect(copied.getAttribute('data-copied')).toBe('true');
    expect(copied.getAttribute('aria-label')).toBe('Copied');
    // The other copy buttons are still the ones they were.
    expect(copyButton(el, 'copy-info').getAttribute('data-copied')).toBe('false');
    expect(copyButton(el, 'copy-key').getAttribute('data-copied')).toBe('false');
  });

  it('copies the card as Markdown from the panel', async () => {
    const writeText = clipboard();
    const el = await mountWith(richRaw, '#story=u2');
    const button = copyButton(el, 'copy-info');
    expect(button.getAttribute('aria-label')).toBe('Copy card as Markdown');
    button.click();
    await settle(el);
    expect(writeText).toHaveBeenCalledWith(richInfo);
    expect(copyButton(el, 'copy-info').getAttribute('data-copied')).toBe('true');
  });

  it('offers the id, the id and title, and the card as Markdown on a card’s right-click menu', async () => {
    const writeText = clipboard();
    const el = await mountWith(richRaw, '#story=u2');
    const u2 = card(el, 'u2') as HTMLElement & {
      getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null;
    };
    const groups = u2.getContextMenuItems({ clientX: 0, clientY: 0, target: null });
    expect(groups?.map((group) => group.id)).toEqual(['usm-story-card']);
    const entries = groups!.flatMap((group) => group.entries);
    expect(entries.map((entry) => entry.id)).toEqual(['copy-story-id', 'copy-story-id-title', 'copy-story-info']);
    expect(entries.map((entry) => entry.label)).toEqual(['Copy ID', 'Copy ID + title', 'Copy card as Markdown']);
    for (const entry of entries) {
      if (entry.kind === 'item') entry.run();
    }
    await settle(el);
    expect(writeText.mock.calls.map(([text]) => text)).toEqual(['STORY-2', 'STORY-2 U2', richInfo]);
  });
});
