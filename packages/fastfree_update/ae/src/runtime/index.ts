// ============================================================
// fastfree_update — public runtime exports
// (mirrors the fastfree_lowcode runtime index pattern)
// ============================================================

// ============================================================
// Components
// ============================================================
export { default as UpdateDialog } from './UpdateDialog.vue';

// ============================================================
// Composables
// ============================================================
export {
  useAppUpdate,
  resolveUpdateLocale,
  resolveUpdateMessages,
} from './useAppUpdate';
export type { AppUpdateApi, UpdateLocale } from './useAppUpdate';

// ============================================================
// Config / Types
// ============================================================
export {
  APP_UPDATE_KEY,
  DEFAULT_UPDATE_CONFIG,
  DISMISS_STORAGE_KEY,
} from './types';
export type {
  UpdateConfig,
  UpdateMessages,
  UpdateSource,
  UpdateStatus,
} from './types';

// ============================================================
// Messages (update.* namespace, EN + AR with key parity)
// ============================================================
export { updateMessagesEn } from './messages-en';
export type { UpdateMessagesEn } from './messages-en';
export { updateMessagesAr } from './messages-ar';
