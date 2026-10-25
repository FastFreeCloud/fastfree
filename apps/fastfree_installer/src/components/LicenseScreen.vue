<template>
  <div class="screen-container">
    <div class="header-box">
      <div class="step-tag">Step 2 of 6</div>
      <h2>FastFree License Activation & Registry Verification</h2>
      <p class="subtitle">
        Validate your enterprise subscription key against the FastFree Cloud Registry or offline cryptographic signature.
      </p>
    </div>

    <div class="content-body">
      <!-- Input Section -->
      <div class="input-card">
        <label class="input-label" for="license-input">FastFree License Key:</label>
        <div class="input-row">
          <input
            id="license-input"
            v-model="licenseInput"
            type="text"
            placeholder="e.g. FF-ENT-2026-SOVEREIGN-KEY"
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
            <span v-else>Verify Key 🔍</span>
          </button>
        </div>

        <!-- Verification Mode and Test Presets -->
        <div class="presets-row">
          <span class="preset-label">Google Sheets / FastFree Presets:</span>
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
              Verify against Cloud Registry (Google Sheets API Endpoint)
            </span>
          </label>
          <span class="offline-badge">Offline Fallback Enabled</span>
        </div>
      </div>

      <!-- Verification Error -->
      <div v-if="errorMessage" class="error-banner">
        <span class="error-icon">⚠️</span>
        <div class="error-details">
          <strong>License Verification Failed</strong>
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
            <span>Active & Cryptographically Verified</span>
          </div>
        </div>

        <div class="license-details-grid">
          <div class="detail-item">
            <span class="detail-label">License Key</span>
            <span class="detail-val font-mono">{{ licenseState.key }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Licensed Entity</span>
            <span class="detail-val">{{ licenseState.company_name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Node Quota</span>
            <span class="detail-val text-accent">
              Up to {{ licenseState.max_nodes }} Sovereign Node(s)
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Seat Allocation</span>
            <span class="detail-val">
              {{ licenseState.max_users >= 10000 ? 'Unlimited Local Users' : `${licenseState.max_users} Users` }}
            </span>
          </div>
        </div>

        <!-- Unlocked Packages & Capabilities -->
        <div class="unlocked-features-box">
          <div class="features-title">Unlocked Enterprise Modules & Services:</div>
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
        ← Back to Discovery
      </button>
      <button
        class="btn btn-primary"
        :disabled="!licenseState || !licenseState.is_valid"
        @click="currentStep = 3"
      >
        Configure Sovereign Node Sizing →
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
  const map: Record<string, string> = {
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
  margin-bottom: 18px;
}

.step-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #38BDF8;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.header-box h2 {
  font-size: 22px;
  font-weight: 700;
  color: #F8FAFC;
  margin: 0;
}

.subtitle {
  color: #94A3B8;
  font-size: 13px;
  margin-top: 4px;
  margin-bottom: 0;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.input-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-label {
  font-size: 13px;
  font-weight: 600;
  color: #E4E4E7;
}

.input-row {
  display: flex;
  gap: 10px;
}

.text-input {
  flex: 1;
  background: #09090B;
  border: 1px solid #3F3F46;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: #F8FAFC;
  font-family: 'Consolas', 'Courier New', monospace;
  outline: none;
  transition: border-color 0.2s;
}

.text-input:focus {
  border-color: #38BDF8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.btn-action {
  background: #1976D2;
  color: #FFFFFF;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.btn-action:hover:not(:disabled) {
  background: #1565C0;
}

.presets-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 11px;
  color: #71717A;
}

.preset-chip {
  background: #27272A;
  border: 1px solid #3F3F46;
  color: #D4D4D8;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-chip:hover {
  background: #3F3F46;
  color: #FFFFFF;
}

.chip-ent {
  border-color: rgba(56, 189, 248, 0.4);
  color: #38BDF8;
}

.chip-std {
  border-color: rgba(52, 211, 153, 0.4);
  color: #34D399;
}

.chip-trl {
  border-color: rgba(251, 191, 36, 0.4);
  color: #FBBF24;
}

.registry-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid #27272A;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #A1A1AA;
}

.offline-badge {
  font-size: 10px;
  color: #71717A;
  background: #27272A;
  padding: 2px 8px;
  border-radius: 10px;
}

.error-banner {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: #FCA5A5;
  font-size: 12px;
}

.error-icon {
  font-size: 18px;
}

.error-details p {
  margin: 4px 0 0 0;
  color: #F87171;
}

.license-credential-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.license-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-tier {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.tier-enterprise {
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%);
  color: #93C5FD;
  border: 1px solid #3B82F6;
}

.tier-standard {
  background: linear-gradient(135deg, #064E3B 0%, #047857 100%);
  color: #A7F3D0;
  border: 1px solid #10B981;
}

.tier-trial {
  background: linear-gradient(135deg, #78350F 0%, #B45309 100%);
  color: #FDE68A;
  border: 1px solid #F59E0B;
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
  gap: 12px;
  background: #09090B;
  border: 1px solid #27272A;
  border-radius: 8px;
  padding: 12px 14px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #71717A;
}

.detail-val {
  font-size: 13px;
  font-weight: 600;
  color: #E4E4E7;
}

.font-mono {
  font-family: 'Consolas', monospace;
  font-size: 12px;
}

.text-accent {
  color: #38BDF8;
}

.unlocked-features-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.features-title {
  font-size: 11px;
  font-weight: 600;
  color: #A1A1AA;
  text-transform: uppercase;
}

.feature-badges-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.feature-pill {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #E2E8F0;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #FFF;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.action-bar {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #27272A;
}

.btn {
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #1976D2;
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: #1565C0;
  box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #27272A;
  color: #E4E4E7;
}

.btn-secondary:hover {
  background: #3F3F46;
}
</style>
