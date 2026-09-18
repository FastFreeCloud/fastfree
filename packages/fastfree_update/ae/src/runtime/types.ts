/**
 * fastfree_update — shared runtime types.
 *
 * No `any` anywhere in this file by contract.
 */

/** Runtime configuration for the update checker (mirrors AE prompts). */
export interface UpdateConfig {
  /** Days the dialog stays snoozed after the user taps "Later". Must be > 0. */
  dismissCooldownDays: number;
  /** Whether the web/PWA (service-worker) update path is active. */
  enableWebUpdate: boolean;
}

/** Result of an update-availability check. */
export interface UpdateStatus {
  /** True when a newer version is known to be available. */
  available: boolean;
  /** Native version code of the available update, when known. */
  versionCode?: number;
}

/** Where an update would come from. */
export type UpdateSource = 'play' | 'web' | 'none';

/** Shape of the `update.*` message namespace (EN and AR must match). */
export interface UpdateMessages {
  title: string;
  body: string;
  updateNow: string;
  later: string;
  checking: string;
  noUpdate: string;
  offline: string;
  openPlay: string;
  clearCacheWeb: string;
  dismissed: string;
}

/** Defaults applied when prompts/config are missing or invalid. */
export const DEFAULT_UPDATE_CONFIG: UpdateConfig = {
  dismissCooldownDays: 3,
  enableWebUpdate: true,
};

/** localStorage key for the "Later" snooze timestamp (ms since epoch). */
export const DISMISS_STORAGE_KEY = 'ff-update-dismissed-at';

/** Injection key under which the boot file provides the update API. */
export const APP_UPDATE_KEY = 'appUpdate';
