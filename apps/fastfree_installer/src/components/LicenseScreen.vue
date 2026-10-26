<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('license.stepTag') }}</div>
      <h2>{{ t('license.title') }}</h2>
      <p class="subtitle">{{ t('license.subtitle') }}</p>
    </div>

    <div class="content-body">
      <!-- Input Section -->
      <div class="input-card">
        <div class="input-header-row">
          <label class="input-label" for="license-input">
            <span class="label-icon">🔑</span>
            <span>{{ t('license.licenseInputLabel') }}</span>
          </label>
          <div class="cloud-status-badge">
            <span class="status-dot-pulse"></span>
            <span>{{ t('license.cloudRegistryStatus') }}</span>
          </div>
        </div>

        <div class="input-row">
          <div class="input-wrapper">
            <input
              id="license-input"
              v-model="licenseInput"
              type="text"
              :placeholder="t('license.placeholder')"
              class="text-input"
              :disabled="isVerifying"
              autofocus
              spellcheck="false"
              autocomplete="off"
              @keyup.enter="handleVerify"
            />
            <button
              v-if="!licenseInput"
              type="button"
              class="btn-paste"
              :title="t('license.pasteBtn')"
              @click="handlePaste"
            >
              📋 {{ t('license.pasteBtn') }}
            </button>
            <button
              v-else
              type="button"
              class="btn-clear"
              title="Clear"
              @click="licenseInput = ''"
            >
              ✕
            </button>
          </div>

          <button
            class="btn btn-action"
            :disabled="isVerifying || !licenseInput.trim()"
            @click="handleVerify"
          >
            <span v-if="isVerifying" class="spinner-sm"></span>
            <span v-else>{{ t('license.verifyBtn') }}</span>
          </button>
        </div>

        <!-- Hardware Identity Card (HWID) -->
        <div class="hwid-card">
          <div class="hwid-info">
            <span class="hwid-label">{{ t('license.hwidLabel') }}</span>
            <code class="hwid-val">{{ machineHwid || 'Loading HWID...' }}</code>
          </div>
          <button
            type="button"
            class="btn-copy-hwid"
            :class="{ copied: hwidCopied }"
            @click="copyHwid"
          >
            <span v-if="hwidCopied">✓ {{ t('license.hwidCopied') }}</span>
            <span v-else>📋 {{ t('license.copyHwid') }}</span>
          </button>
        </div>
      </div>

      <!-- Verification Error Banner -->
      <div v-if="errorMessage" class="error-banner">
        <span class="error-icon">⚠️</span>
        <div class="error-details">
          <strong>{{ t('license.verFailed') }}</strong>
          <p>{{ errorMessage }}</p>
          <div class="error-support-tip">
            {{ t('license.supportNotice') }}
          </div>
        </div>
      </div>

      <!-- Verified License Information Card -->
      <div v-if="licenseState && licenseState.is_valid" class="license-credential-card">
        <div class="license-top">
          <div class="badge-tier" :class="`tier-${licenseState.tier}`">
            {{ licenseState.tier_name }}
          </div>
          <div class="status-pill status-active">
            <span class="dot-green"></span>
            <span>{{ t('license.activeVerified') }}</span>
          </div>
        </div>

        <div class="license-details-grid">
          <div class="detail-item">
            <span class="detail-label">{{ t('license.entityLabel') }}</span>
            <span class="detail-val font-semibold">{{ licenseState.company_name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('license.assignedNode') }}</span>
            <span class="detail-val text-accent font-mono">{{ licenseState.eligible_clients[0] || 'client2' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('license.keyLabel') }}</span>
            <span class="detail-val font-mono">{{ licenseState.key }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('license.seatLabel') }}</span>
            <span class="detail-val">
              {{ licenseState.max_users >= 10000 ? t('license.unlimitedUsers') : t('license.usersCount', { count: licenseState.max_users }) }}
            </span>
          </div>
        </div>

        <!-- Unlocked Packages & Capabilities -->
        <div class="unlocked-features-box">
          <div class="features-title">{{ t('license.unlockedModules') }}</div>
          <div class="feature-badges-wrap">
            <span
              v-for="feature in licenseState.unlocked_features"
              :key="feature"
              class="feature-pill"
            >
              ✓ {{ formatFeatureName(feature) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="currentStep = 1">
        {{ t('license.backToDiscovery') }}
      </button>
      <button
        class="btn btn-primary"
        :disabled="!licenseState || !licenseState.is_valid"
        @click="currentStep = 3"
      >
        {{ t('license.configureSizing') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import {
  currentStep,
  licenseState,
  verifyLicense,
  fetchMachineHwid,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

const licenseInput = ref('');
const machineHwid = ref('');
const isVerifying = ref(false);
const errorMessage = ref('');
const hwidCopied = ref(false);

onMounted(async () => {
  // Fetch machine HWID for user display and support reference
  try {
    machineHwid.value = await fetchMachineHwid();
  } catch (e) {
    console.warn('Could not load HWID:', e);
  }

  // Restore already validated license key if present in state
  if (licenseState.value && licenseState.value.is_valid) {
    licenseInput.value = licenseState.value.key;
  }
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
    // Native Win32 API clipboard read via Rust - ZERO browser popups, ZERO mention of tauri.localhost
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
  try {
    await navigator.clipboard.writeText(machineHwid.value);
    hwidCopied.value = true;
    setTimeout(() => {
      hwidCopied.value = false;
    }, 2500);
  } catch (err) {
    console.warn('Clipboard write error:', err);
  }
}

function formatFeatureName(feature: string): string {
  const mapEn: Record<string, string> = {
    sovereign_hyperv_appliance: 'Hyper-V Enterprise Appliance',
    wireguard_mesh_vpn: 'WireGuard Encrypted Mesh',
    accounting_general_ledger: 'General Ledger & Accounts',
    inventory_warehouse_suite: 'Multi-Warehouse Inventory',
    sales_and_crm_engine: 'Sales & CRM Invoicing',
    purchase_and_supply_chain: 'Purchase Orders & Supply Chain',
    hr_payroll_management: 'HR & Biometric Payroll',
    clan_nixos_self_healing: 'Clan 26.05 Self-Healing',
    unlimited_local_users: 'Unlimited Enterprise Seats',
    evaluation_mode: '14-Day Evaluation Sandbox',
  };

  const mapAr: Record<string, string> = {
    sovereign_hyperv_appliance: 'بيئة العتاد المؤسسي على Hyper-V',
    wireguard_mesh_vpn: 'نفق شبكة واير جارد المشفر',
    accounting_general_ledger: 'دفتر الأستاذ العام والمحاسبة',
    inventory_warehouse_suite: 'إدارة المخزون والمستودعات',
    sales_and_crm_engine: 'المبيعات والعملاء والفواتير',
    purchase_and_supply_chain: 'المشتريات وسلاسل الإمداد',
    hr_payroll_management: 'الموارد البشرية والرواتب',
    clan_nixos_self_healing: 'نظام الاستشفاء الذاتي Clan 26.05',
    unlimited_local_users: 'تراخيص مستخدمين غير محدودة',
    evaluation_mode: 'بيئة تجريبية تقييمية (14 يوماً)',
  };

  const map = isRtl.value ? mapAr : mapEn;
  return map[feature] || feature.replace(/_/g, ' ');
}
</script>

<style scoped>
.screen-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-box {
  margin-bottom: 16px;
}

.step-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-sky, #38BDF8);
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.header-box h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main, #F8FAFC);
  margin: 0;
}

.subtitle {
  color: var(--text-muted, #94A3B8);
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 0;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding-right: 4px;
}

.input-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #E4E4E7);
}

.cloud-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.1);
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.status-dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38BDF8;
  box-shadow: 0 0 6px #38BDF8;
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.text-input {
  width: 100%;
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-main, #F8FAFC);
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;
  outline: none;
  transition: all 0.2s ease;
}

.text-input:focus {
  border-color: var(--accent-sky, #38BDF8);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
}

.btn-paste {
  position: absolute;
  inset-inline-end: 8px;
  background: var(--bg-card, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-muted, #A1A1AA);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-paste:hover {
  background: var(--border-color, #3F3F46);
  color: #FFFFFF;
}

.btn-clear {
  position: absolute;
  inset-inline-end: 10px;
  background: none;
  border: none;
  color: var(--text-muted, #71717A);
  font-size: 13px;
  cursor: pointer;
  padding: 4px;
}

.btn-clear:hover {
  color: #FFFFFF;
}

.btn-action {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-action:hover:not(:disabled) {
  background: var(--accent-hover, #1565C0);
  box-shadow: 0 4px 14px rgba(25, 118, 210, 0.35);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hwid-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 2px;
}

.hwid-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.hwid-label {
  font-size: 11px;
  color: var(--text-muted, #71717A);
  white-space: nowrap;
}

.hwid-val {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: var(--text-secondary, #A1A1AA);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-copy-hwid {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-muted, #A1A1AA);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-copy-hwid:hover {
  background: var(--border-color, #3F3F46);
  color: #FFFFFF;
}

.btn-copy-hwid.copied {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #34D399;
}

.error-banner {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.error-icon {
  font-size: 18px;
  line-height: 1;
}

.error-details strong {
  color: #F87171;
  font-size: 13px;
  display: block;
}

.error-details p {
  color: #FCA5A5;
  font-size: 12px;
  margin: 4px 0 0 0;
}

.error-support-tip {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted, #94A3B8);
  border-top: 1px solid rgba(239, 68, 68, 0.15);
  padding-top: 6px;
}

.license-credential-card {
  background: var(--bg-card, #18181B);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.license-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-tier {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 4px 12px;
  border-radius: 6px;
}

.tier-enterprise {
  background: rgba(25, 118, 210, 0.2);
  color: var(--accent-sky, #38BDF8);
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.tier-standard {
  background: rgba(16, 185, 129, 0.15);
  color: #34D399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #34D399;
  background: rgba(16, 185, 129, 0.1);
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 8px #10B981;
}

.license-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted, #71717A);
  letter-spacing: 0.5px;
}

.detail-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #F8FAFC);
}

.font-semibold {
  font-weight: 700;
}

.text-accent {
  color: var(--accent-sky, #38BDF8);
}

.font-mono {
  font-family: 'Consolas', 'Courier New', monospace;
}

.unlocked-features-box {
  border-top: 1px solid var(--border-color, #27272A);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.features-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #D4D4D8);
}

.feature-badges-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.feature-pill {
  background: var(--bg-sub, #09090B);
  color: var(--text-secondary, #D4D4D8);
  font-size: 10px;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #27272A);
}

.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
}

.btn {
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover, #1565C0);
  box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #E4E4E7);
}

.btn-secondary:hover {
  background: var(--border-color, #3F3F46);
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
