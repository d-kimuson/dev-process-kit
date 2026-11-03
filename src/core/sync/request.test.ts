import { describe, expect, it, vi } from 'vitest';

import { SYNC_REQUEST_EVENT, type SyncHost, type SyncRequestDetail } from './protocol';
import { requestDraftSync } from './request';

const isRequest = (value: unknown): value is SyncRequestDetail =>
  typeof value === 'object' && value !== null && 'connect' in value;

const answering = (answer: (detail: SyncRequestDetail) => void) => {
  const parent = document.createElement('div');
  const element = document.createElement('div');
  parent.append(element);
  parent.addEventListener(SYNC_REQUEST_EVENT, (event) => {
    const detail: unknown = event instanceof CustomEvent ? event.detail : null;
    if (isRequest(detail)) answer(detail);
  });
  return element;
};

const host: SyncHost = {
  protocol: 1,
  self: { id: 'alice' },
  open: () => ({ pending: [], push: () => {}, close: () => {} }),
};

describe('requestDraftSync', () => {
  it('asks with the draft key and the template, and takes the host that connects', () => {
    const seen: SyncRequestDetail[] = [];
    const element = answering((detail) => {
      seen.push(detail);
      detail.connect(host);
    });

    expect(requestDraftSync(element, { storageKey: 'k', template: 'plain' })?.self).toEqual({ id: 'alice' });
    expect(seen).toMatchObject([{ protocol: 1, storageKey: 'k', template: 'plain' }]);
  });

  it('stays without a host when nobody answers', () => {
    expect(
      requestDraftSync(
        answering(() => {}),
        { storageKey: 'k', template: 'plain' },
      ),
    ).toBeUndefined();
  });

  it('ignores a host of another protocol', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = answering((detail) => detail.connect({ ...host, protocol: 2 } as never));

    expect(requestDraftSync(element, { storageKey: 'k', template: 'plain' })).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
