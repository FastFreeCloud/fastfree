/**
 * fastfree_update — update-check composable.
 *
 * Platform gating:
 * - Every public function SSR-guards with `typeof window/document` checks and
 *   bails out silently outside the browser.
 * - Native vs web is decided at runtime via `Capacitor.isNativePlatform()`,
 *   lazy-loaded with a dynamic import so the native stack is never bundled
 *   (or even resolved) on web/SSR.
 *
 * Lazy-loading discipline (also keeps `tsc` green without native deps):
 * - `@capawesome/capacitor-app-update`, `@capacitor/core` and
 *   `@capacitor/browser` are imported through *variable* specifiers, so
 *   TypeScript never tries to resolve them statically and Vite never bundles
 *   them. Every dynamic import is wrapped in try/catch and validated with a
 *   type guard before use.
 * - The web path lazy-loads the HOST app's `@/boot/register-service-worker`
 *   module and only calls `checkForUpdate` / `forceSWUpdate` when they exist
 *   as functions.
 *
 * Update policy:
 * - `checkForUpdate()` only READS state — it never starts an update.
 * - `startUpdate()` (flexible update on native, SW update on web) must only
 *   be called from a user tap (dialog button). The boot file enforces this
 *   by never calling it automatically.
 * - Snooze ("Later") is persisted in plain localStorage under
 *   `ff-update-dismissed-at` (deliberately NOT @capacitor/preferences, to
 *   avoid adding another native dependency).
 * - Failures are silent or surfaced via Quasar Notify — never logged.
 *
 * Locale: resolved from the fastfree_lowcode `lc-locale` localStorage key,
 * then `document.documentElement.lang`; when the store is unreadable we fall
 * back to Arabic-first (`'ar'`).
 */

import { ref } from 'vue';
import type { Ref } from 'vue';
import { Notify } from 'quasar';
import { DEFAULT_UPDATE_CONFIG, DISMISS_STORAGE_KEY } from './types';
import type {
  UpdateConfig,
  UpdateMessages,
  UpdateSource,
  UpdateStatus,
} from './types';
import { updateMessagesAr } from './messages-ar';
import { updateMessagesEn } from './messages-en';

export type UpdateLocale = 'ar' | 'en';

/** fastfree_lowcode i18n persistence key (read-only, best effort). */
const LC_LOCALE_KEY = 'lc-locale';

/** Variable specifiers: never statically resolved/bundled (see header). */
const CAPACITOR_CORE_SPEC = '@capacitor/core';
const NATIVE_UPDATE_SPEC = '@capawesome/capacitor-app-update';
const BROWSER_SPEC = '@capacitor/browser';
const SW_BOOT_SPEC = '@/boot/register-service-worker';

const PLAY_LISTING_BASE = 'https://play.google.com/store/apps/details?id=';

/** Minimal structural shapes for lazily-loaded modules (no `any`). */
interface NativeUpdateInfoShape {
  updateAvailability?: number;
  currentVersionCode?: number;
  availableVersionCode?: number;
}

interface NativeUpdatePlugin {
  getAppUpdateInfo: () => Promise<NativeUpdateInfoShape>;
  startFlexibleUpdate: () => Promise<unknown>;
}

interface HostSwBoot {
  checkForUpdate?: () => unknown;
  forceSWUpdate?: () => unknown;
}

export interface AppUpdateApi {
  readonly config: UpdateConfig;
  readonly locale: UpdateLocale;
  readonly messages: UpdateMessages;
  readonly status: Ref<UpdateStatus>;
  readonly source: Ref<UpdateSource>;
  readonly checking: Ref<boolean>;
  checkForUpdate: () => Promise<UpdateStatus>;
  /** Must only be called from a user tap — never auto-invoked. */
  startUpdate: () => Promise<boolean>;
  openPlayListing: (packageId: string) => Promise<boolean>;
  snooze: () => void;
  isSnoozed: () => boolean;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asFunction(
  value: unknown,
): ((...args: never[]) => unknown) | null {
  return typeof value === 'function'
    ? (value as (...args: never[]) => unknown)
    : null;
}

function isNativePlugin(value: unknown): value is NativeUpdatePlugin {
  const rec = asRecord(value);
  if (!rec) {
    return false;
  }
  return (
    typeof rec.getAppUpdateInfo === 'function' &&
    typeof rec.startFlexibleUpdate === 'function'
  );
}

function isOnline(): boolean {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.onLine === 'boolean'
    ) {
      return navigator.onLine;
    }
    return true;
  } catch {
    return true;
  }
}

function notifyUser(message: string): void {
  try {
    if (!isBrowser() || message.length === 0) {
      return;
    }
    Notify.create({ message, position: 'top' });
  } catch {
    // Silent: notifications are best-effort (e.g. plugin missing on SSR).
  }
}

/** Arabic-first locale resolution (see header for the fallback chain). */
export function resolveUpdateLocale(): UpdateLocale {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const saved = window.localStorage.getItem(LC_LOCALE_KEY);
      if (saved === 'ar' || saved === 'en') {
        return saved;
      }
      if (typeof saved === 'string') {
        const base = saved.toLowerCase().split('-')[0] ?? '';
        if (base === 'ar' || base === 'en') {
          return base;
        }
      }
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      const lang = (document.documentElement.lang || '').toLowerCase();
      if (lang.startsWith('en')) {
        return 'en';
      }
      if (lang.startsWith('ar')) {
        return 'ar';
      }
    }
  } catch {
    // Storage may throw (private mode) — fall through to Arabic-first.
  }
  return 'ar';
}

export function resolveUpdateMessages(): UpdateMessages {
  return resolveUpdateLocale() === 'en'
    ? updateMessagesEn.update
    : updateMessagesAr.update;
}

function resolveConfig(input?: Partial<UpdateConfig>): UpdateConfig {
  let injected: Partial<UpdateConfig> = {};
  try {
    if (isBrowser()) {
      // Host apps may inject AE prompt answers via `window.__FF_UPDATE_CONFIG__`.
      const win = window as unknown as Record<string, unknown>;
      const raw = asRecord(win.__FF_UPDATE_CONFIG__);
      if (raw) {
        const partial: Partial<UpdateConfig> = {};
        if (typeof raw.dismissCooldownDays === 'number') {
          partial.dismissCooldownDays = raw.dismissCooldownDays;
        }
        if (typeof raw.enableWebUpdate === 'boolean') {
          partial.enableWebUpdate = raw.enableWebUpdate;
        }
        injected = partial;
      }
    }
  } catch {
    injected = {};
  }
  const merged: UpdateConfig = {
    ...DEFAULT_UPDATE_CONFIG,
    ...injected,
    ...(input ?? {}),
  };
  if (
    !Number.isFinite(merged.dismissCooldownDays) ||
    merged.dismissCooldownDays <= 0
  ) {
    merged.dismissCooldownDays = DEFAULT_UPDATE_CONFIG.dismissCooldownDays;
  }
  return merged;
}

function readDismissedAt(): number | null {
  try {
    if (!isBrowser()) {
      return null;
    }
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

async function isNative(): Promise<boolean> {
  try {
    if (!isBrowser()) {
      return false;
    }
    const mod: unknown = await import(
      /* @vite-ignore */ CAPACITOR_CORE_SPEC
    );
    const rec = asRecord(mod);
    const cap = rec ? asRecord(rec.Capacitor) : null;
    const fn = asFunction(cap?.isNativePlatform);
    if (!fn) {
      console.warn('[fastfree-update] Capacitor.isNativePlatform not found');
      return false;
    }
    const result = fn() === true;
    console.warn('[fastfree-update] isNative:', result);
    return result;
  } catch (e) {
    console.warn('[fastfree-update] isNative import failed:', e);
    return false;
  }
}

async function loadNativePlugin(): Promise<NativeUpdatePlugin | null> {
  try {
    if (!isBrowser()) {
      return null;
    }
    const mod: unknown = await import(/* @vite-ignore */ NATIVE_UPDATE_SPEC);
    const rec = asRecord(mod);
    // Accept a named export, a default export, or a direct plugin object.
    const candidates: unknown[] = rec
      ? [rec.AppUpdate, rec.default, rec]
      : [];
    for (const candidate of candidates) {
      if (isNativePlugin(candidate)) {
        return candidate;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function loadHostSwBoot(): Promise<HostSwBoot | null> {
  try {
    if (!isBrowser()) {
      return null;
    }
    const mod: unknown = await import(/* @vite-ignore */ SW_BOOT_SPEC);
    const rec = asRecord(mod);
    if (!rec) {
      return null;
    }
    const out: HostSwBoot = {};
    const check = asFunction(rec.checkForUpdate);
    if (check) {
      out.checkForUpdate = check as () => unknown;
    }
    const force = asFunction(rec.forceSWUpdate);
    if (force) {
      out.forceSWUpdate = force as () => unknown;
    }
    return out;
  } catch {
    return null;
  }
}

async function checkNative(): Promise<UpdateStatus> {
  try {
    const plugin = await loadNativePlugin();
    if (!plugin) {
      console.warn('[fastfree-update] native plugin unavailable');
      return { available: false };
    }
    const raw: unknown = await plugin.getAppUpdateInfo();
    const info = asRecord(raw) ?? {};
    const current =
      typeof info.currentVersionCode === 'number'
        ? info.currentVersionCode
        : null;
    const availableCode =
      typeof info.availableVersionCode === 'number'
        ? info.availableVersionCode
        : null;
    // Primary signal = Play availability enum:
    //   2 = UPDATE_AVAILABLE, 3 = DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS (resume)
    // A newer versionCode is the secondary guard.
    const availability = info.updateAvailability;
    const available =
      availability === 2 ||
      availability === 3 ||
      (current !== null && availableCode !== null && availableCode > current);
    const next: UpdateStatus = { available };
    if (availableCode !== null) {
      next.versionCode = availableCode;
    }
    return next;
  } catch {
    return { available: false };
  }
}

async function checkWeb(): Promise<UpdateStatus> {
  try {
    const sw = await loadHostSwBoot();
    if (!sw?.checkForUpdate) {
      return { available: false };
    }
    const result: unknown = await sw.checkForUpdate();
    return { available: result === true };
  } catch {
    return { available: false };
  }
}

export function useAppUpdate(input?: Partial<UpdateConfig>): AppUpdateApi {
  const config = resolveConfig(input);
  const locale = resolveUpdateLocale();
  const messages: UpdateMessages =
    locale === 'en' ? updateMessagesEn.update : updateMessagesAr.update;
  const status = ref<UpdateStatus>({ available: false });
  const source = ref<UpdateSource>('none');
  const checking = ref(false);

  function apply(next: UpdateStatus, nextSource: UpdateSource): UpdateStatus {
    status.value = next;
    source.value = nextSource;
    return next;
  }

  async function checkForUpdate(): Promise<UpdateStatus> {
    if (checking.value) {
      return status.value;
    }
    checking.value = true;
    try {
      if (!isBrowser()) {
        return apply({ available: false }, 'none');
      }
      if (!isOnline()) {
        notifyUser(messages.offline);
        return apply({ available: false }, 'none');
      }
      if (await isNative()) {
        const next = await checkNative();
        return apply(next, next.available ? 'play' : 'none');
      }
      if (!config.enableWebUpdate) {
        return apply({ available: false }, 'none');
      }
      const next = await checkWeb();
      return apply(next, next.available ? 'web' : 'none');
    } finally {
      checking.value = false;
    }
  }

  async function startUpdate(): Promise<boolean> {
    try {
      if (!isBrowser()) {
        return false;
      }
      // Native: flexible update — user tap ONLY (callers must guarantee this).
      if (await isNative()) {
        const plugin = await loadNativePlugin();
        if (!plugin) {
          return false;
        }
        await plugin.startFlexibleUpdate();
        return true;
      }
      // Web: service-worker update — only when the web path is enabled.
      if (!config.enableWebUpdate) {
        return false;
      }
      const sw = await loadHostSwBoot();
      if (!sw?.forceSWUpdate) {
        return false;
      }
      await sw.forceSWUpdate();
      return true;
    } catch {
      return false;
    }
  }

  async function openPlayListing(packageId: string): Promise<boolean> {
    try {
      if (!isBrowser() || packageId.length === 0) {
        return false;
      }
      const mod: unknown = await import(/* @vite-ignore */ BROWSER_SPEC);
      const rec = asRecord(mod);
      const browser = rec ? asRecord(rec.Browser) : null;
      const openFn = browser?.open;
      if (typeof openFn !== 'function') {
        return false;
      }
      await (openFn as (options: { url: string }) => Promise<unknown>)({
        url: `${PLAY_LISTING_BASE}${encodeURIComponent(packageId)}`,
      });
      return true;
    } catch {
      return false;
    }
  }

  function snooze(): void {
    try {
      if (!isBrowser()) {
        return;
      }
      // Plain localStorage on purpose — avoids a new native dependency.
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Silent: private mode etc.
    }
  }

  function isSnoozed(): boolean {
    const at = readDismissedAt();
    if (at === null) {
      return false;
    }
    return Date.now() - at < config.dismissCooldownDays * 86400000;
  }

  return {
    config,
    locale,
    messages,
    status,
    source,
    checking,
    checkForUpdate,
    startUpdate,
    openPlayListing,
    snooze,
    isSnoozed,
  };
}
