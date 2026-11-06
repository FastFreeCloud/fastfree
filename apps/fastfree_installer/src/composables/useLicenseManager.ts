import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import {
  currentStep,
  licenseState,
  selectedClientId,
  verifyLicense,
  fetchMachineHwid,
  type LicenseVerificationResult,
} from './useDiscovery';
import { useI18n } from './useI18n';
import { LicensePresentationService } from '../domain/services/LicensePresentationService';

// Shared Singleton Reactive State across all decomposed subcomponents
const licenseInput = ref('');
const machineHwid = ref('');
const isVerifying = ref(false);
const isTransferring = ref(false);
const errorMessage = ref('');
const hwidCopied = ref(false);
const isKeyCopied = ref(false);

// Change Key Modal state
const showChangeKeyModal = ref(false);
const newLicenseInput = ref('');
const isVerifyingNewKey = ref(false);
const changeKeyError = ref('');
const newKeyInputRef = ref<HTMLInputElement | null>(null);

// Master Password Modal state
const showPasswordModal = ref(false);
const adminPasswordInput = ref('');
const showPasswordText = ref(false);
const modalError = ref('');
const passwordInputRef = ref<HTMLInputElement | null>(null);
const isErrorCopied = ref(false);
const isModalErrorCopied = ref(false);

// Cloud Sync state
const isSyncingCloud = ref(false);
const syncFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

export function useLicenseManager() {
  const { t, isRtl } = useI18n();
  const presentation = LicensePresentationService.getInstance();

  function openChangeKeyModal() {
    newLicenseInput.value = '';
    changeKeyError.value = '';
    showChangeKeyModal.value = true;
    setTimeout(() => {
      newKeyInputRef.value?.focus();
    }, 100);
  }

  async function handlePasteNewKey() {
    try {
      const text = await invoke<string>('read_clipboard_text');
      if (text) {
        newLicenseInput.value = text.trim();
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  }

  async function handleChangeKeySubmit() {
    const cleanKey = newLicenseInput.value.trim().toUpperCase();
    if (!cleanKey) return;

    isVerifyingNewKey.value = true;
    changeKeyError.value = '';

    try {
      const res = await verifyLicense(cleanKey, true);
      if (!res.is_valid) {
        changeKeyError.value = res.message || t('license.verFailed');
      } else {
        showChangeKeyModal.value = false;
        licenseInput.value = cleanKey;
      }
    } catch (err: unknown) {
      changeKeyError.value = String(err || t('license.verFailed'));
    } finally {
      isVerifyingNewKey.value = false;
    }
  }

  async function copyTextToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback...', err);
    }
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch (err) {
      console.warn('Fallback copy failed:', err);
      return false;
    }
  }

  async function copyKey(key: string) {
    if (!key) return;
    const ok = await copyTextToClipboard(key);
    if (ok) {
      isKeyCopied.value = true;
      setTimeout(() => {
        isKeyCopied.value = false;
      }, 2200);
    }
  }

  const conciseCompanyName = computed(() =>
    presentation.getCompanyView(isRtl.value, licenseState.value?.company_name)
  );

  const localizedTierName = computed(() =>
    presentation.getTierView(isRtl.value, licenseState.value?.tier, licenseState.value?.tier_name)
  );

  const expiryView = computed(() =>
    presentation.getExpiryView(isRtl.value, licenseState.value?.expires_at)
  );

  const formattedExpiryDate = computed(() => expiryView.value.dateLabel);

  const expiryDaysRemaining = computed(() =>
    presentation.getDaysRemaining(licenseState.value?.expires_at)
  );

  const expiryStatusMeta = computed(() => ({
    label: expiryView.value.statusLabel,
    statusClass: expiryView.value.statusClass,
  }));

  async function handleSyncCloud(silent = false) {
    if (!licenseState.value?.key) return;
    if (!silent) {
      isSyncingCloud.value = true;
      syncFeedback.value = null;
    }
    try {
      const res = await verifyLicense(licenseState.value.key, true);
      if (res.is_valid) {
        if (!silent) {
          syncFeedback.value = {
            type: 'success',
            message: isRtl.value
              ? 'تم تحديث ومزامنة بيانات الترخيص والمستخدمين من السجل السحابي بنجاح.'
              : 'License data, seats and expiry synchronized successfully from cloud.',
          };
          setTimeout(() => {
            if (syncFeedback.value?.type === 'success') {
              syncFeedback.value = null;
            }
          }, 4000);
        }
      } else {
        if (!silent) {
          syncFeedback.value = {
            type: 'error',
            message: res.message || (isRtl.value ? 'فشل التحديث من السجل السحابي' : 'Cloud sync failed'),
          };
        }
      }
    } catch (err: unknown) {
      if (!silent) {
        syncFeedback.value = {
          type: 'error',
          message: String(err || (isRtl.value ? 'تعذر الاتصال بالسجل السحابي' : 'Could not contact cloud registry')),
        };
      }
    } finally {
      if (!silent) {
        isSyncingCloud.value = false;
      }
    }
  }

  const displayedFeatures = computed(() => {
    if (!licenseState.value?.unlocked_features) return [];
    return licenseState.value.unlocked_features.filter(
      (f) => f !== 'clan_nixos_self_healing' && !f.includes('clan') && f !== 'unlimited_local_users'
    );
  });

  async function copyError(text: string, isModal = false) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (isModal) {
        isModalErrorCopied.value = true;
        setTimeout(() => { isModalErrorCopied.value = false; }, 2000);
      } else {
        isErrorCopied.value = true;
        setTimeout(() => { isErrorCopied.value = false; }, 2000);
      }
    } catch (e) {
      console.error('Failed to copy error to clipboard', e);
    }
  }

  const isHwidMismatch = computed(() => {
    const msg = errorMessage.value.toLowerCase();
    return (
      msg.includes('hwid') ||
      msg.includes('mismatch') ||
      msg.includes('another hardware') ||
      msg.includes('different user') ||
      msg.includes('جهاز آخر') ||
      msg.includes('مستخدم آخر')
    );
  });

  function openTransferModal() {
    adminPasswordInput.value = '';
    modalError.value = '';
    showPasswordModal.value = true;
    setTimeout(() => {
      passwordInputRef.value?.focus();
    }, 100);
  }

  async function handleConfirmTransfer() {
    const cleanKey = licenseInput.value.trim().toUpperCase();
    if (!cleanKey) return;
    if (!adminPasswordInput.value.trim()) {
      modalError.value = isRtl.value ? 'يرجى إدخال كلمة المرور الإدارية' : 'Please enter master password';
      return;
    }

    isTransferring.value = true;
    modalError.value = '';

    try {
      const res = await invoke<LicenseVerificationResult>('transfer_license_to_current_device', {
        key: cleanKey,
        adminPassword: adminPasswordInput.value.trim(),
      });
      licenseState.value = res;
      if (res.node_id) {
        selectedClientId.value = res.node_id;
      }
      showPasswordModal.value = false;
      errorMessage.value = '';
    } catch (err: unknown) {
      const e = err as { message?: string };
      modalError.value = String(e?.message || err);
    } finally {
      isTransferring.value = false;
    }
  }

  const hasMultipleEligibleNodes = computed(() => {
    return (licenseState.value?.eligible_clients?.length || 0) > 1;
  });

  const availableNodes = computed(() => {
    if (licenseState.value && licenseState.value.eligible_clients && licenseState.value.eligible_clients.length > 0) {
      return licenseState.value.eligible_clients;
    }
    const boundNode = licenseState.value?.node_id || selectedClientId.value;
    return boundNode ? [boundNode] : ['client2'];
  });

  async function handleVerify() {
    const cleanKey = licenseInput.value.trim().toUpperCase();
    if (!cleanKey) return;

    isVerifying.value = true;
    errorMessage.value = '';

    try {
      const res = await verifyLicense(cleanKey, true);
      if (!res.is_valid) {
        errorMessage.value = res.message || t('license.verFailed');
      }
    } catch (err: unknown) {
      errorMessage.value = String(err || t('license.verFailed'));
    } finally {
      isVerifying.value = false;
    }
  }

  async function handlePaste() {
    try {
      const text = await invoke<string>('read_clipboard_text');
      if (text) {
        licenseInput.value = text.trim();
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  }

  async function copyHwid() {
    if (!machineHwid.value) return;
    const ok = await copyTextToClipboard(machineHwid.value);
    if (ok) {
      hwidCopied.value = true;
      setTimeout(() => {
        hwidCopied.value = false;
      }, 2200);
    }
  }

  function formatFeatureName(feature: string): string {
    return presentation.getFeatureName(isRtl.value, feature);
  }

  onMounted(async () => {
    try {
      machineHwid.value = await fetchMachineHwid();
    } catch (e) {
      console.warn('Could not load HWID:', e);
    }

    if (licenseState.value && licenseState.value.is_valid) {
      licenseInput.value = licenseState.value.key;
      handleSyncCloud(true);
    }
  });

  return {
    t,
    isRtl,
    currentStep,
    licenseState,
    selectedClientId,
    licenseInput,
    machineHwid,
    isVerifying,
    isTransferring,
    errorMessage,
    hwidCopied,
    isKeyCopied,
    showChangeKeyModal,
    newLicenseInput,
    isVerifyingNewKey,
    changeKeyError,
    newKeyInputRef,
    showPasswordModal,
    adminPasswordInput,
    showPasswordText,
    modalError,
    passwordInputRef,
    isErrorCopied,
    isModalErrorCopied,
    isSyncingCloud,
    syncFeedback,
    conciseCompanyName,
    localizedTierName,
    formattedExpiryDate,
    expiryDaysRemaining,
    expiryStatusMeta,
    displayedFeatures,
    hasMultipleEligibleNodes,
    availableNodes,
    isHwidMismatch,
    openChangeKeyModal,
    handlePasteNewKey,
    handleChangeKeySubmit,
    copyKey,
    handleSyncCloud,
    copyError,
    openTransferModal,
    handleConfirmTransfer,
    handleVerify,
    handlePaste,
    copyHwid,
    formatFeatureName,
  };
}
