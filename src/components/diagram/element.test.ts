import { afterEach, describe, expect, it } from 'vitest';

import type { ContextMenuRequest } from '../../core/context-menu/types';

import { parseTargetRef } from '../../core/target';
import { registerComponentElements } from '../index';
import { DpkDiagram } from './element';

registerComponentElements();

afterEach(() => {
  document.body.replaceChildren();
});

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const mount = async (markup: string, attributes = 'id="flow" label="Checkout"'): Promise<DpkDiagram> => {
  document.body.innerHTML = `<dpk-diagram ${attributes}>${markup}</dpk-diagram>`;
  const element = document.querySelector('dpk-diagram');
  if (!(element instanceof DpkDiagram)) throw new Error('did not upgrade');
  await element.updateComplete;
  await frame();
  await frame();
  await element.updateComplete;
  return element;
};

const CHAIN = `
  <dpk-diagram-group id="shop" label="Shop">
    <dpk-diagram-node id="cart">Cart</dpk-diagram-node>
    <dpk-diagram-node id="pay" shape="diamond" tone="green">Pay</dpk-diagram-node>
  </dpk-diagram-group>
  <dpk-diagram-node id="ship">Ship</dpk-diagram-node>
  <dpk-diagram-edge id="cart-pay" from="cart" to="pay">checkout</dpk-diagram-edge>
  <dpk-diagram-edge id="pay-ship" from="pay" to="ship" flow></dpk-diagram-edge>
`;

describe('dpk-diagram', () => {
  it('draws one line per edge and a frame per group', async () => {
    const element = await mount(CHAIN);
    const root = element.shadowRoot!;
    expect(root.querySelectorAll('.d-edge')).toHaveLength(2);
    expect(root.querySelectorAll('.d-edge.is-flowing .d-edge-flow')).toHaveLength(1);
    expect(root.querySelector('.frame-title')?.textContent).toBe('Shop');
    expect(root.querySelector('figure')?.getAttribute('aria-label')).toBe('Checkout');
  });

  it('offers every node, line and group as a comment target', async () => {
    const element = await mount(CHAIN);
    expect(element.commentTargets.map((target) => target.value)).toEqual([
      'element:flow/node/cart',
      'element:flow/node/pay',
      'element:flow/node/ship',
      'element:flow/edge/cart-pay',
      'element:flow/edge/pay-ship',
      'element:flow/group/shop',
    ]);
    expect(element.commentTargets[3]?.label).toBe('Line: Cart → Pay (checkout)');
    expect(element.querySelector('#cart')?.getAttribute('data-dpk-target')).toBe('element:flow/node/cart');
    const request: ContextMenuRequest = { clientX: 0, clientY: 0, target: parseTargetRef('element:flow/node/pay') };
    expect(element.getContextMenuItems(request)).not.toBeNull();
  });

  it('selects a clicked node, lights its lines and dims the rest', async () => {
    const element = await mount(CHAIN);
    const events: unknown[] = [];
    element.addEventListener('dpk-diagram-select', (event) => events.push((event as CustomEvent).detail));
    element.querySelector<HTMLElement>('#cart')!.click();
    await element.updateComplete;
    expect(element.selection).toEqual({ kind: 'node', id: 'cart' });
    expect(events).toEqual([{ selection: { kind: 'node', id: 'cart' } }]);
    expect(element.querySelector('#cart')?.getAttribute('data-state')).toBe('selected');
    expect(element.querySelector('#ship')?.getAttribute('data-state')).toBe('dimmed');
    const lines = [...element.shadowRoot!.querySelectorAll('.d-edge')].map((line) => line.classList.contains('is-lit'));
    expect(lines).toEqual([true, false]);
    element.querySelector<HTMLElement>('#cart')!.click();
    await element.updateComplete;
    expect(element.selection).toBeNull();
  });

  it('lists the problems instead of drawing a broken figure', async () => {
    const element = await mount(`
      <dpk-diagram-node id="a">A</dpk-diagram-node>
      <dpk-diagram-edge id="ab" from="a" to="b"></dpk-diagram-edge>
      <dpk-diagram-group id="outer"><dpk-diagram-group id="inner"></dpk-diagram-group></dpk-diagram-group>
    `);
    const alert = element.shadowRoot!.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('"b"');
    expect(alert?.textContent).toContain('"inner"');
    expect(element.shadowRoot!.querySelector('figure')).toBeNull();
  });

  it('redraws when a child changes', async () => {
    const element = await mount(CHAIN);
    element.querySelector('#pay-ship')!.setAttribute('to', 'cart');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;
    expect(element.commentTargets[4]?.label).toBe('Line: Pay → Cart');
  });
});
