import type { CoreMessages } from '../messages';
import type { SyncState } from './channel';

/** The header's word for where sharing stands. */
export const syncStatusLabel = (state: SyncState, messages: CoreMessages): string => {
  switch (state.status) {
    case 'connecting':
      return messages.syncConnecting;
    case 'synced':
      return messages.syncSynced;
    case 'pending':
      return messages.syncPending(state.unsent);
    case 'offline':
      return messages.syncOffline;
    case 'error':
      return messages.syncError;
  }
};
