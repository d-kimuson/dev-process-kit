/**
 * The element's side of `dpk-sync-request`: asks once, before the draft is
 * restored, whether a host shares it. A host that answers in another shape is
 * no host: the draft stays in localStorage.
 */
import * as v from 'valibot';

import { SYNC_PROTOCOL, SYNC_REQUEST_EVENT, type SyncHost, type SyncRequestDetail } from './protocol';

const hostSchema = v.object({
  protocol: v.literal(SYNC_PROTOCOL),
  self: v.object({ id: v.string(), name: v.exactOptional(v.string()) }),
  open: v.function(),
});

export const requestDraftSync = (
  element: EventTarget,
  draft: { readonly storageKey: string; readonly template: string },
): SyncHost | undefined => {
  let host: SyncHost | undefined;
  const detail: SyncRequestDetail = {
    protocol: SYNC_PROTOCOL,
    storageKey: draft.storageKey,
    template: draft.template,
    connect: (candidate) => {
      if (host !== undefined) return;
      const parsed = v.safeParse(hostSchema, candidate);
      if (!parsed.success) {
        console.warn('[dev-process-kit] dpk-sync-request: ignored a host that is not protocol 1', candidate);
        return;
      }
      host = { protocol: SYNC_PROTOCOL, self: parsed.output.self, open: (sink) => candidate.open(sink) };
    },
  };
  element.dispatchEvent(new CustomEvent(SYNC_REQUEST_EVENT, { detail, bubbles: true, composed: true }));
  return host;
};
