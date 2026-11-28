// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import type { DpkViewPlain } from '../views/plain/element';

import '../index';

type Updating = HTMLElement & { updateComplete: Promise<boolean> };

const mount = (sections: string): DpkViewPlain => {
  document.body.innerHTML = `
    <dpk-view-plain storage="memory" lang="en">
      <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
      <section slot="main"><p>Body</p></section>
      ${sections}
    </dpk-view-plain>`;
  const element = document.querySelector('dpk-view-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkViewPlain;
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
    await element.updateComplete;
    await launchers(element).updateComplete;
    await frame(element).updateComplete;
    await Promise.resolve();
  }
};

const buttons = (element: DpkViewPlain): HTMLButtonElement[] =>
  Array.from(launchers(element).shadowRoot?.querySelectorAll<HTMLButtonElement>('.launcher[data-section]') ?? []);

const button = (element: DpkViewPlain, label: string): HTMLButtonElement => {
  const found = buttons(element).find((candidate) => candidate.textContent?.trim().startsWith(label));
  if (!found) throw new Error(`no button ${label}`);
  return found;
};

const SECTIONS = `
  <dpk-panel-section slot="panel" name="issues" label="Issues" badge="2">points</dpk-panel-section>
  <dpk-panel-section slot="panel" name="drafts" label="Drafts" hidden>drafts</dpk-panel-section>
  <section slot="supplement" data-name="ERD">erd</section>`;

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe("the header's section buttons", () => {
  it('start with the panel closed and offer one button per shown section, with its badge', async () => {
    const element = mount(SECTIONS);
    await settle(element);
    expect(element.panelOpen).toBe(false);
    expect(buttons(element).map((candidate) => candidate.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Issues 2',
      'ERD',
    ]);
    expect(button(element, 'Issues').getAttribute('aria-label')).toBe('Issues, 2');
    expect(buttons(element).map((candidate) => candidate.getAttribute('aria-pressed'))).toEqual(['false', 'false']);
  });

  it('open the panel on their section, and close it while it shows that section', async () => {
    const element = mount(SECTIONS);
    await settle(element);
    button(element, 'ERD').click();
    await settle(element);
    expect(element.panelOpen).toBe(true);
    expect(element.panelSection).toBe('section-3');
    expect(button(element, 'ERD').getAttribute('aria-pressed')).toBe('true');

    button(element, 'Issues').click();
    await settle(element);
    expect(element.panelOpen).toBe(true);
    expect(element.panelSection).toBe('issues');
    expect(buttons(element).map((candidate) => candidate.getAttribute('aria-pressed'))).toEqual(['true', 'false']);

    button(element, 'Issues').click();
    await settle(element);
    expect(element.panelOpen).toBe(false);
    expect(button(element, 'Issues').getAttribute('aria-pressed')).toBe('false');
  });

  it('give the focus back to the button pressed when Escape closes the panel', async () => {
    const element = mount(SECTIONS);
    await settle(element);
    button(element, 'ERD').focus();
    button(element, 'ERD').click();
    await settle(element);
    button(element, 'Issues').focus();
    button(element, 'Issues').click();
    await settle(element);
    const tab = frame(element).shadowRoot?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    expect(tab?.dataset['section']).toBe('issues');
    tab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await settle(element);
    expect(element.panelOpen).toBe(false);
    expect(launchers(element).shadowRoot?.activeElement).toBe(button(element, 'Issues'));
  });

  it('follow a badge the author changes', async () => {
    const element = mount(SECTIONS);
    await settle(element);
    element.querySelector('[name="issues"]')?.setAttribute('badge', '5');
    await settle(element);
    expect(button(element, 'Issues').textContent?.replace(/\s+/g, ' ').trim()).toBe('Issues 5');
  });

  it('take no room on a page without sections', async () => {
    const element = mount('');
    await settle(element);
    expect(buttons(element)).toEqual([]);
    expect(launchers(element).hasAttribute('data-empty')).toBe(true);
  });
});
