import { describe, expect, it, vi } from 'vitest';

import { parseChangeLog, type ChangeLog } from '../changes';
import { CheckModeController } from './check-mode-controller';

const fakeHost = () => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

const setup = (log: ChangeLog | null = null) => {
  const host = fakeHost();
  const controller = new CheckModeController(host as never, {
    persist: () => false,
    storageKey: () => 'page',
    log: () => log,
  });
  controller.hostConnected();
  return { controller, host };
};

const logOf = (input: unknown): ChangeLog => {
  const result = parseChangeLog(input);
  if (!result.ok) throw new Error(result.error);
  return result.log;
};

describe('CheckModeController', () => {
  it('starts disabled, with nothing checked', () => {
    const { controller } = setup();
    expect(controller.enabled).toBe(false);
    expect(controller.statusOf('card:a')).toBe('unchecked');
  });

  it('toggles a target between unchecked and checked', () => {
    const { controller } = setup();
    controller.setEnabled(true);
    controller.toggle('card:a');
    expect(controller.statusOf('card:a')).toBe('checked');
    controller.toggle('card:a');
    expect(controller.statusOf('card:a')).toBe('unchecked');
  });

  it('turning Check Mode off clears every mark', () => {
    const { controller } = setup();
    controller.setEnabled(true);
    controller.toggle('card:a');
    controller.setEnabled(false);
    expect(controller.enabled).toBe(false);
    controller.setEnabled(true);
    expect(controller.statusOf('card:a')).toBe('unchecked');
  });

  it('goes stale once the change log records the ref afterwards, and a click re-affirms it', () => {
    const log = logOf({
      revisions: [
        { revision: 'r1', changes: [] },
        { revision: 'r2', changes: [{ id: 'a', title: 'touched', target: 'card:a' }] },
      ],
    });
    const { controller } = setup(log);
    controller.setEnabled(true);
    controller.toggle('card:a'); // checked at r2 (the log's current revision)
    expect(controller.statusOf('card:a')).toBe('checked');
  });

  it('persists across instances when persistence is on', () => {
    const host = fakeHost();
    const first = new CheckModeController(host as never, {
      persist: () => true,
      storageKey: () => 'p',
      log: () => null,
    });
    first.hostConnected();
    first.setEnabled(true);
    first.toggle('card:a');

    const second = new CheckModeController(host as never, {
      persist: () => true,
      storageKey: () => 'p',
      log: () => null,
    });
    second.hostConnected();
    expect(second.enabled).toBe(true);
    expect(second.statusOf('card:a')).toBe('checked');
    second.setEnabled(false); // cleanup: don't leak into other tests via localStorage
  });
});
