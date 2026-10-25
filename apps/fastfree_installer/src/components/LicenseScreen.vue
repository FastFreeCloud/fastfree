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
        <label class="input-label" for="license-input">{{ t('license.licenseInputLabel') }}</label>
        <div class="input-row">
          <input
            id="license-input"
            v-model="licenseInput"
            type="text"
            :placeholder="t('license.placeholder')"
            class="text-input"
            :disabled="isVerifying"
            @keyup.enter="handleVerify"
          />
          <button
            class="btn btn-action"
            :disabled="isVerifying || !licenseInput.trim()"
            @click="handleVerify"
          >
            <span v-if="isVerifying" class="spinner-sm"></span>
            <span v-else>{{ t('license.verifyBtn') }}</span>
          </button>
        </div>

        <!-- Verification Mode and Test Presets -->
        <div class="presets-row">
          <span class="preset-label">{{ t('license.presetsLabel') }}</span>
          <button
            type="button"
            class="preset-chip chip-ent"
            @click="fillKey('FF-CL02-7K2M-9P4W-1X88')"
          >
            client2 (Riyadh Sovereign)
          </button>
          <button
            type="button"
            class="preset-chip chip-ent"
            @click="fillKey('FF-ENT-2026-SOVEREIGN-KEY')"
          >
            Master Enterprise
          </button>
          <button
            type="button"
            class="preset-chip chip-std"
            @click="fillKey('FF-STD-2026-BUSINESS-KEY')"
          >
            Commercial Standard
          </button>
          <button
            type="button"
            class="preset-chip chip-trl"
            @click="fillKey('FF-TRL-2026-EVALUATION-KEY')"
          >
            14-Day Trial
          </button>
        </div>

        <div class="registry-mode">
          <label class="checkbox-container">
            <input v-model="onlineVerification" type="checkbox" />
            <span class="checkmark"></span>
            <span class="check-text">
              {{ t('license.onlineCheckLabel') }}
            </span>
          </label>
          <span class="offline-badge">{{ t('license.offlineFallback') }}</span>
        </div>
      </div>

      <!-- Verification Error -->
      <div v-if="errorMessage" class="error-banner">
        <span class="error-icon">⚠️</span>
        <div class="error-details">
          <strong>{{ t('license.verFailed') }}</strong>
          <p>{{ errorMessage }}</p>
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
            <span class="detail-label">{{ t('license.keyLabel') }}</span>
            <span class="detail-val font-mono">{{ licenseState.key }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('license.entityLabel') }}</span>
            <span class="detail-val">{{ licenseState.company_name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('license.quotaLabel') }}</span>
            <span class="detail-val text-accent">
              {{ t('license.nodesQuota', { count: licenseState.max_nodes }) }}
            </span>
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
import {
  currentStep,
  licenseState,
  verifyLicense,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

const licenseInput = ref('FF-ENT-2026-SOVEREIGN-KEY');
const onlineVerification = ref(true);
const isVerifying = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  // If not verified yet, verify the default enterprise key automatically
  if (!licenseState.value) {
    await handleVerify();
  } else {
    licenseInput.value = licenseState.value.key;
  }
});

async function handleVerify() {
  if (!licenseInput.value.trim()) return;
  isVerifying.value = true;
  errorMessage.value = '';

  try {
    await verifyLicense(licenseInput.value.trim(), onlineVerification.value);
  } catch (err: unknown) {
    errorMessage.value = String(err || 'Failed to verify license key');
  } finally {
    isVerifying.value = false;
  }
}

function fillKey(key: string) {
  licenseInput.value = key;
  handleVerify();
}

function formatFeatureName(feature: string): string {
  const mapEn: Record<string, string> = {
    sovereign_hyperv_appliance: 'Hyper-V Sovereign Appliance',
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
    sovereign_hyperv_appliance: 'بيئة العتاد السيادي على Hyper-V',
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
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #E4E4E7);
}

.input-row {
  display: flex;
  gap: 10px;
}

.text-input {
  flex: 1;
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-main, #F8FAFC);
  font-family: 'Consolas', 'Courier New', monospace;
  outline: none;
  transition: border-color 0.2s;
}

.text-input:focus {
  border-color: var(--accent-sky, #38BDF8);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.btn-action {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-action:hover:not(:disabled) {
  background: var(--accent-hover, #1565C0);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.presets-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-label {
  font-size: 11px;
  color: var(--text-muted, #71717A);
  margin-inline-end: 4px;
}

.preset-chip {
  background: var(--bg-sub, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 10px;
  color: var(--text-muted, #A1A1AA);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.preset-chip:hover {
  background: var(--bg-hover, #3F3F46);
  color: var(--text-main, #FFFFFF);
  border-color: #52525B;
}

.chip-ent {
  border-color: rgba(56, 189, 248, 0.3);
  color: var(--accent-sky, #38BDF8);
}

.chip-std {
  border-color: rgba(16, 185, 129, 0.3);
  color: #34D399;
}

.chip-trl {
  border-color: rgba(245, 158, 11, 0.3);
  color: #FBBF24;
}

.registry-mode {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-muted, #A1A1AA);
  user-select: none;
}

.checkbox-container input {
  cursor: pointer;
  accent-color: #1976D2;
}

.offline-badge {
  font-size: 10px;
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.error-icon {
  font-size: 16px;
}

.error-details strong {
  color: #F87171;
  font-size: 12px;
}

.error-details p {
  color: #FCA5A5;
  font-size: 11px;
  margin: 2px 0 0 0;
}

.license-credential-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  padding: 3px 10px;
  border-radius: 6px;
}

.tier-enterprise {
  background: rgba(25, 118, 210, 0.2);
  color: var(--accent-sky, #38BDF8);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.tier-standard {
  background: rgba(16, 185, 129, 0.15);
  color: #34D399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.tier-trial {
  background: rgba(245, 158, 11, 0.15);
  color: #FBBF24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #34D399;
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.license-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
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

.text-accent {
  color: var(--accent-sky, #38BDF8);
}

.font-mono {
  font-family: 'Consolas', 'Courier New', monospace;
}

.unlocked-features-box {
  border-top: 1px solid var(--border-color, #27272A);
  padding-top: 10px;
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
  background: var(--bg-sub, #27272A);
  color: var(--text-secondary, #D4D4D8);
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #3F3F46);
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
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 12px;
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
</style>
