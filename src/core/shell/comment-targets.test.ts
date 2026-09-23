// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { PrototypeElement } from '../../templates/prototype/element';
import '../../index';

const mount = async () => {
  const host = document.createElement('artifact-prototype');
  if (!(host instanceof PrototypeElement)) throw new Error('not upgraded');
  host.storage = 'memory';
  host.innerHTML = '<script type="application/json">{"title":"Review","activities":[]}</script>';
  document.body.append(host);
  await host.artifact.ready;
  await host.updateComplete;
  return host;
};
const provider = () =>
  Object.assign(document.createElement('div'), {
    commentTargets: [{ value: 'element:custom/shape/a', label: 'Shape A' }],
  });
afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
});

describe('component targets in the common shell', () => {
  it('acknowledges only valid local submissions without opening the rail', async () => {
    const host = await mount();
    const shape = provider();
    host.append(shape);
    const submit = (detail: unknown, cancelable = true): boolean =>
      shape.dispatchEvent(
        new CustomEvent('artifact-comment-submit', {
          detail,
          bubbles: true,
          composed: true,
          cancelable,
        }),
      );
    expect(submit({ target: 'element:custom/shape/a', body: '  local note  ' })).toBe(false);
    expect(host.artifact.comments).toHaveLength(1);
    expect(host.artifact.comments[0]?.payload).toEqual({ body: 'local note' });
    expect(host.notesOpen).toBe(false);
    expect(submit({ target: 'element:custom/shape/a', body: '   ' })).toBe(true);
    expect(submit({ target: 'element:gone', body: 'note' })).toBe(true);
    expect(submit({ target: 1, body: 'note' })).toBe(true);
    expect(submit({ target: 'element:custom/shape/a', body: 'note' }, false)).toBe(true);
    expect(host.artifact.actions).toHaveLength(1);
  });

  it('never passes a rejected nested submission to the outer artifact', async () => {
    const outer = await mount();
    const inner = await mount();
    outer.append(provider(), inner);
    const first = provider();
    inner.append(first, provider());
    const handled = first.dispatchEvent(
      new CustomEvent('artifact-comment-submit', {
        detail: { target: 'element:custom/shape/a', body: 'must not escape' },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    expect(handled).toBe(true);
    expect(inner.artifact.actions).toEqual([]);
    expect(outer.artifact.actions).toEqual([]);
  });

  it('does not let rejected nested requests escape to an outer target with the same id', async () => {
    const outer = await mount();
    const inner = await mount();
    outer.append(provider(), inner);
    const first = provider();
    inner.append(first, provider());
    await Promise.resolve();
    await inner.updateComplete;
    await outer.updateComplete;
    first.dispatchEvent(
      new CustomEvent('artifact-comment-request', {
        detail: { target: 'element:custom/shape/a' },
        bubbles: true,
        composed: true,
      }),
    );
    await inner.updateComplete;
    await outer.updateComplete;
    expect(inner.notesOpen).toBe(false);
    expect(outer.notesOpen).toBe(false);
  });
  it('uses the standard template rail for a composed request from shadow content', async () => {
    const host = await mount();
    const wrapper = document.createElement('div');
    const root = wrapper.attachShadow({ mode: 'open' });
    const shape = provider();
    root.append(shape);
    host.append(wrapper);
    await Promise.resolve();
    await host.updateComplete;
    shape.dispatchEvent(
      new CustomEvent('artifact-comment-request', {
        detail: { target: 'element:custom/shape/a' },
        bubbles: true,
        composed: true,
      }),
    );
    await host.updateComplete;
    expect(host.notesOpen).toBe(true);
    host.artifact.comment('element:custom/shape/a', 'note');
    expect(host.artifact.comments).toHaveLength(1);
    expect(host.artifact.exportBrief()).toContain('Shape A');
    shape.remove();
    await Promise.resolve();
    await host.updateComplete;
    expect(host.artifact.stale).toHaveLength(1);
  });

  it('rejects malformed providers and requests and keeps nested artifact targets isolated', async () => {
    const outer = await mount();
    const inner = await mount();
    outer.append(inner);
    const shape = provider();
    inner.append(shape);
    const invalid = Object.assign(document.createElement('div'), {
      commentTargets: [{ value: 'step:hijack', label: 'Bad' }],
    });
    outer.append(invalid);
    await Promise.resolve();
    await inner.updateComplete;
    await outer.updateComplete;
    shape.dispatchEvent(
      new CustomEvent('artifact-comment-request', {
        detail: { target: 'element:custom/shape/a' },
        bubbles: true,
        composed: true,
      }),
    );
    await inner.updateComplete;
    await outer.updateComplete;
    expect(inner.notesOpen).toBe(true);
    expect(outer.notesOpen).toBe(false);
    outer.dispatchEvent(new CustomEvent('artifact-comment-request', { detail: { target: 123 } }));
    expect(outer.notesOpen).toBe(false);
    outer.artifact.comment('element:custom/shape/a', 'wrong owner');
    expect(outer.artifact.stale).toHaveLength(1);
    expect(outer.controller.definition.commentTargets(outer.artifact.state, {})).not.toContainEqual({
      value: 'step:hijack',
      label: 'Bad',
    });
  });

  it('records component element actions, hands them back to their owner and lists its results', async () => {
    const host = await mount();
    const received: unknown[][] = [];
    // Accessors, not data: `Object.assign` would snapshot them.
    class Shape extends HTMLElement {
      commentTargets = [{ value: 'element:custom/shape/a', label: 'Shape A' }];
      #actions: readonly { id: string }[] = [];
      get elementActions(): readonly { id: string }[] {
        return this.#actions;
      }
      set elementActions(next: readonly { id: string }[]) {
        this.#actions = next;
        received.push([...next]);
      }
      get elementActionResults() {
        return this.#actions.map((action) => ({ id: action.id, title: 'Grow', tone: 'create' }));
      }
    }
    if (!customElements.get('test-shape')) customElements.define('test-shape', Shape);
    const shape = document.createElement('test-shape');
    if (!(shape instanceof Shape)) throw new Error('not upgraded');
    shape.id = 'custom';
    host.append(shape);
    await Promise.resolve();
    const act = (detail: unknown): boolean =>
      shape.dispatchEvent(
        new CustomEvent('artifact-element-action', { detail, bubbles: true, composed: true, cancelable: true }),
      );
    expect(act({ type: 'GROW', target: 'element:custom/shape/a', payload: { by: 2 } })).toBe(false);
    // Handed back synchronously, before the event returns to the component.
    expect(shape.elementActions.map((action) => action.id)).toEqual(host.artifact.actions.map((action) => action.id));
    expect(act({ type: 'GROW', target: 'element:custom/shape/gone' })).toBe(true);
    expect(act({ type: 'grow', target: 'element:custom/shape/a' })).toBe(true);
    await Promise.resolve();
    await host.updateComplete;
    expect(host.artifact.stale).toEqual([]);
    expect(host.controller.definition.describe(shape.elementActions[0] as never, host.artifact.state).title).toBe(
      'Grow',
    );
    const count = received.length;
    host.artifact.comment('element:custom/shape/a', 'unrelated');
    await Promise.resolve();
    // Comments are not component actions: the list is not reassigned.
    expect(received).toHaveLength(count);
    host.controller.removeAction(host.artifact.actions[0]?.id ?? '');
    expect(shape.elementActions).toEqual([]);
  });
});
