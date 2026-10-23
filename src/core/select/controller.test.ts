import { describe, expect, it, vi } from 'vitest';

import { SelectControllerRegistry } from './controller';

const fakeHost = (): { addController: ReturnType<typeof vi.fn>; requestUpdate: ReturnType<typeof vi.fn> } & Record<
  string,
  unknown
> => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
  renderRoot: document.createElement('div'),
});

describe('SelectControllerRegistry', () => {
  it('returns the same controller for the same key, a different one for a different key', () => {
    const registry = new SelectControllerRegistry(fakeHost() as never);
    const a1 = registry.get('a');
    const a2 = registry.get('a');
    const b = registry.get('b');
    expect(a2).toBe(a1);
    expect(b).not.toBe(a1);
  });
});
