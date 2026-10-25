import { LitElement, type TemplateResult, type nothing } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';

import type { ViewDefinition } from '../types';
import type { ContextMenuGroup, ContextMenuRequest } from './types';

import { ContextMenuController } from './controller';
import { contextMenuMessages } from './messages';

/** A minimal context-menu host: no chrome, one provider that records the requests it is asked. */
class ProbeHost extends LitElement {
  static override properties = { definition: { attribute: false } };

  readonly definition = { hasTarget: () => false } as unknown as ViewDefinition<unknown>;
  readonly requestComment = (): void => undefined;
  readonly requests: ContextMenuRequest[] = [];
  readonly menu = new ContextMenuController(this, { state: () => ({}), messages: () => contextMenuMessages('en') });

  getContextMenuItems(request: ContextMenuRequest): readonly ContextMenuGroup[] | null {
    this.requests.push(request);
    return [{ id: 'probe', entries: [{ kind: 'item', id: 'probe-item', label: 'Probe item', run: () => undefined }] }];
  }

  protected override render(): TemplateResult | typeof nothing {
    return this.menu.render();
  }
}

customElements.define('dpk-internal-context-menu-probe', ProbeHost);

const mount = async (): Promise<ProbeHost> => {
  const host = document.createElement('dpk-internal-context-menu-probe');
  if (!(host instanceof ProbeHost)) throw new Error('probe host did not upgrade');
  const child = document.createElement('span');
  child.id = 'clicked';
  host.append(child);
  document.body.append(host);
  for (let index = 0; index < 3; index++) await host.updateComplete;
  return host;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('ContextMenuController', () => {
  it('hands providers the element the click landed on as `origin`', async () => {
    const host = await mount();
    const child = host.querySelector('#clicked');
    if (child === null) throw new Error('probe child missing');
    child.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 4, clientY: 5 }));
    for (let index = 0; index < 3; index++) await host.updateComplete;

    expect(host.requests).toHaveLength(1);
    expect(host.requests[0]?.origin).toBe(child);
    expect(host.requests[0]?.clientX).toBe(4);
    expect(host.shadowRoot?.textContent).toContain('Probe item');
  });

  it('leaves the browser menu alone on Shift+right-click', async () => {
    const host = await mount();
    const child = host.querySelector('#clicked');
    if (child === null) throw new Error('probe child missing');
    const event = new MouseEvent('contextmenu', { bubbles: true, composed: true, shiftKey: true });
    child.dispatchEvent(event);
    for (let index = 0; index < 3; index++) await host.updateComplete;
    expect(event.defaultPrevented).toBe(false);
    expect(host.requests).toHaveLength(0);
  });
});
