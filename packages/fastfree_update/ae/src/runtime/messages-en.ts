/**
 * fastfree_update — English messages (`update.*` namespace).
 *
 * Key parity with `messages-ar.ts` is enforced at compile time:
 * the Arabic file types its export as `UpdateMessagesEn`.
 */
import type { UpdateMessages } from './types';

export interface UpdateMessagesEn {
  update: UpdateMessages;
}

export const updateMessagesEn: UpdateMessagesEn = {
  update: {
    title: 'Update available',
    body: 'A new version of the app is available. Update now for the latest features and fixes.',
    updateNow: 'Update now',
    later: 'Later',
    checking: 'Checking for updates…',
    noUpdate: 'You are on the latest version.',
    offline: 'You are offline. Please check your connection and try again.',
    openPlay: 'Open in Play Store',
    clearCacheWeb: 'Refresh to apply the latest web version.',
    dismissed: 'Reminder snoozed. We will ask again later.',
  },
};
