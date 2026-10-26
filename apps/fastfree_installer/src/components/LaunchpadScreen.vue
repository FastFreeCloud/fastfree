<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <!-- Header Box -->
    <div class="header-box">
      <div class="step-tag-live">
        <span class="live-dot-pulse"></span>
        <span>{{ isRtl ? 'لوحة التحكم للعقدة — Hyper-V' : 'FastFree Node Control Center — Hyper-V' }}</span>
      </div>
      <h2>{{ t('launchpad.title') }}</h2>
      <p class="subtitle">{{ t('launchpad.subtitle') }}</p>
    </div>

    <div class="content-body">
      <!-- Warning Banner if VM is NOT created in Hyper-V -->
      <div v-if="vmExists === false" class="hero-unprovisioned-card">
        <div class="unprovisioned-icon-badge">⚠️</div>
        <div class="unprovisioned-content">
          <div class="unprovisioned-title-row">
            <h3>{{ isRtl ? `الآلة الافتراضية (FastFree-${selectedClientId}) غير منشأة بعد في Hyper-V` : `Hyper-V VM (FastFree-${selectedClientId}) Not Provisioned Yet` }}</h3>
            <span class="unprovisioned-status-pill">
              <span class="dot-amber"></span>
              <span>{{ isRtl ? 'تثبيت مطلوب' : 'Setup Required' }}</span>
            </span>
          </div>
          <p class="unprovisioned-sub-text">
            {{ isRtl
              ? 'لم يتم العثور على الآلة الافتراضية مسجلة في Hyper-V. يمكنك إنشاء محول الشبكة الداخلي والقرص وتسجيل الآلة وتشغيلها فوراً بنقرة واحدة:'
              : 'The virtual machine is not registered in Hyper-V yet. You can configure the virtual switch, disk, and deploy the appliance now with one click:'
            }}
          </p>
          <div class="unprovisioned-actions-row">
            <button
              class="btn-instant-provision"
              :disabled="isProvisioning"
              @click="handleInstantProvisioning"
            >
              <span v-if="isProvisioning" class="spinner-tiny"></span>
              <span v-else>{{ t('launchpad.createVmNow') }}</span>
            </button>
            <button
              class="btn-revisit-setup"
              :disabled="isProvisioning"
              @click="handleRestartWizard"
            >
              {{ t('launchpad.restartWizard') }}
            </button>
          </div>
          <div v-if="provisioningMessage" class="provisioning-live-text">
            <span class="pulse-icon">⏳</span>
            <span>{{ provisioningMessage }}</span>
          </div>
        </div>
      </div>

      <!-- Master Live Status Hero -->
      <div class="hero-success-card" :class="{ 'is-warning': vmExists === false }">
        <div class="success-icon-badge" :class="{ 'badge-amber': vmExists === false }">
          {{ vmExists === false ? '!' : '✓' }}
        </div>
        <div class="hero-text">
          <div class="node-title-row">
            <h3>{{ selectedClientId }} — {{ licenseState?.company_name || 'FastFree Enterprise Node' }}</h3>
            <span class="live-status-pill" :class="{ 'pill-amber': vmExists === false }">
              <span :class="vmExists === false ? 'dot-amber' : 'dot-live'"></span>
              <span>{{ vmExists === false ? (isRtl ? 'في انتظار التثبيت' : 'Setup Required') : t('launchpad.onlineOperational') }}</span>
            </span>
          </div>
          <p class="node-sub-text">
            {{ vmExists === false
              ? (isRtl ? 'الآلة الافتراضية غير مسجلة حالياً في Hyper-V. اضغط على زر "إنشاء وتثبيت الآلة الافتراضية الآن" أعلاه لتشغيلها.' : 'Virtual machine is not registered in Hyper-V yet. Click "Create & Install Virtual Machine Now" above.')
              : (isRtl ? 'تم اكتمال نشر وتثبيت البيئة بنجاح. تعمل الآلة الافتراضية بنظام NixOS Clan 26.05 مع اتصال دائم بشبكة واير جارد.' : 'Appliance deployed and running smoothly on NixOS Clan 26.05 with persistent WireGuard mesh tunnel.')
            }}
          </p>
        </div>
      </div>

      <!-- Comprehensive Appliance Telemetry Grid (All Information) -->
      <div class="telemetry-grid">
        <!-- 1. License & Entity -->
        <div class="spec-card">
          <div class="spec-header">
            <span class="spec-icon">📜</span>
            <span class="spec-title">{{ isRtl ? 'بيانات الترخيص والمؤسسة' : 'License & Client Entity' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'المنشأة:' : 'Entity:' }}</span>
            <span class="spec-v font-bold">{{ licenseState?.company_name || 'Enterprise Client' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'الفئة:' : 'Tier:' }}</span>
            <span class="spec-v text-accent uppercase font-bold">{{ licenseState?.tier_name || 'Enterprise' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'المفتاح:' : 'Key:' }}</span>
            <span class="spec-v font-mono text-xs">{{ licenseState?.key || 'ACTIVE-KEY' }}</span>
          </div>
        </div>

        <!-- 2. Hardware Allocation -->
        <div class="spec-card">
          <div class="spec-header">
            <span class="spec-icon">⚡</span>
            <span class="spec-title">{{ isRtl ? 'الموارد المخصصة للعتاد' : 'Allocated Hardware Resources' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'الأنوية:' : 'vCPU Cores:' }}</span>
            <span class="spec-v font-bold text-accent">{{ assignedCpuCores }} {{ t('common.cores') }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'الذاكرة (RAM):' : 'Memory (RAM):' }}</span>
            <span class="spec-v font-bold text-emerald">{{ (assignedRamMb / 1024).toFixed(0) }} {{ t('common.gb') }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'القرص:' : 'Storage:' }}</span>
            <span class="spec-v font-mono text-xs truncate" :title="`${targetDiskDrive}FastFree\\VMs\\${selectedClientId}.vhdx`">
              {{ targetDiskDrive }}FastFree\VMs\{{ selectedClientId }}.vhdx
            </span>
          </div>
        </div>

        <!-- 3. Network & WireGuard Mesh -->
        <div class="spec-card">
          <div class="spec-header">
            <span class="spec-icon">🔒</span>
            <span class="spec-title">{{ isRtl ? 'الشبكة والنفق المشفر' : 'WireGuard Mesh Network' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'عنوان النفق:' : 'Tunnel IP:' }}</span>
            <span class="spec-v font-mono text-emerald font-bold">{{ wireGuardConfig?.client_tunnel_ip || '10.24.0.2/32' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'منفذ UDP:' : 'UDP Port:' }}</span>
            <span class="spec-v font-mono text-accent font-bold">{{ wireGuardConfig?.listen_port || 51822 }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'المتحكم:' : 'Controller:' }}</span>
            <span class="spec-v font-mono text-xs">client1.fastfree.cloud</span>
          </div>
        </div>
      </div>

      <!-- Quick Access Endpoints & Web Portals -->
      <div class="endpoints-grid">
        <!-- Local Web Portal Card -->
        <div class="endpoint-card">
          <div class="ep-header">
            <span class="ep-icon">🌐</span>
            <span class="ep-label">{{ t('launchpad.localPortalAddress') }}</span>
          </div>
          <div class="ep-url font-mono">http://{{ selectedClientId }}.fastfree.local</div>
          <div class="ep-actions">
            <button class="btn-copy" @click="copyText(`http://${selectedClientId}.fastfree.local`)">
              {{ copiedText === `http://${selectedClientId}.fastfree.local` ? t('common.copied') : t('common.copy') }}
            </button>
            <button class="btn-launch-sm" @click="launchPortal">{{ t('launchpad.openPortal') }} ↗</button>
          </div>
        </div>

        <!-- WireGuard Gateway Card -->
        <div class="endpoint-card">
          <div class="ep-header">
            <span class="ep-icon">🛡️</span>
            <span class="ep-label">{{ t('launchpad.wgOverlayIp') }}</span>
          </div>
          <div class="ep-url font-mono">{{ wireGuardConfig?.client_tunnel_ip || '10.24.0.2/32' }}</div>
          <div class="ep-actions">
            <button class="btn-copy" @click="copyText(wireGuardConfig?.client_tunnel_ip || '10.24.0.2')">
              {{ copiedText?.startsWith('10.24') ? t('common.copied') : t('common.copy') }}
            </button>
            <span class="ep-note">{{ t('launchpad.udpPort', { port: wireGuardConfig?.listen_port || 51822 }) }}</span>
          </div>
        </div>
      </div>

      <!-- Appliance Power & Operation Center -->
      <div class="companion-card">
        <div class="comp-title-row">
          <div class="comp-title">
            <span class="comp-icon">⚙️</span>
            <span>{{ isRtl ? 'إدارة وتحكم الآلة الافتراضية (Hyper-V Power)' : 'Hyper-V VM Power Management' }}</span>
          </div>
          <div class="vm-power-controls">
            <button
              class="btn-vm-action btn-start"
              :disabled="vmActionBusy"
              title="Start VM"
              @click="handleVmAction('start')"
            >
              ▶ {{ isRtl ? 'تشغيل' : 'Start' }}
            </button>
            <button
              class="btn-vm-action"
              :disabled="vmActionBusy"
              title="Restart Guest VM"
              @click="handleVmAction('restart')"
            >
              🔄 {{ t('launchpad.restartVm') }}
            </button>
            <button
              class="btn-vm-action btn-danger"
              :disabled="vmActionBusy"
              title="Stop Guest VM"
              @click="handleVmAction('stop')"
            >
              ⏹ {{ t('launchpad.stopVm') }}
            </button>
            <button
              class="btn-vm-action btn-restart-wizard"
              :disabled="vmActionBusy"
              :title="t('launchpad.restartWizardHint')"
              @click="handleRestartWizard"
            >
              🔄 {{ isRtl ? 'إعادة تشغيل المعالج' : 'Restart Setup' }}
            </button>
          </div>
        </div>
        <p class="comp-desc">
          {{ t('launchpad.companionDesc') }}
        </p>
      </div>

      <!-- Action Status Notice Pill -->
      <div v-if="actionNotice" class="notice-pill">
        <span>{{ actionNotice }}</span>
      </div>
    </div>

    <!-- Master Action Bar (No Back Button; Locked Post-Provisioning) -->
    <div class="action-bar">
      <div class="action-left">
        <button class="btn btn-secondary" @click="handleMinimizeToTray">
          📥 {{ t('launchpad.minimizeToTray') }}
        </button>
        <button class="btn btn-secondary" :disabled="isCheckingUpdate" @click="handleManualCheckUpdate">
          <span v-if="isCheckingUpdate" class="spinner-tiny"></span>
          <span v-else>🔄 {{ isRtl ? 'فحص التحديثات' : 'Check Updates' }}</span>
        </button>
        <button class="btn btn-secondary" @click="handleRestartWizard" :title="t('launchpad.restartWizardHint')">
          🔄 {{ isRtl ? 'إعادة تشغيل المعالج' : 'Restart Setup' }}
        </button>
      </div>
      <button class="btn btn-primary btn-portal" @click="launchPortal">
        🚀 {{ t('launchpad.openErpPortal') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  currentStep,
  selectedClientId,
  wireGuardConfig,
  licenseState,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  executeVmCommand,
  minimizeToTray,
  checkVmExists,
  provisionNode,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';
import { logInfo, logWarn, logError, logSuccess } from '../composables/useDiagnostics';
import { checkForUpdates, isCheckingUpdate } from '../composables/useAutoUpdater';

const { t, isRtl } = useI18n();

const copiedText = ref<string | null>(null);
const vmActionBusy = ref(false);
const actionNotice = ref('');
const vmExists = ref<boolean | null>(null);
const isCheckingVm = ref(false);
const isProvisioning = ref(false);
const provisioningMessage = ref('');

async function checkVmStatus() {
  isCheckingVm.value = true;
  try {
    const exists = await checkVmExists(selectedClientId.value);
    vmExists.value = exists;
    if (!exists) {
      logWarn('Launchpad', `Hyper-V VM 'FastFree-${selectedClientId.value}' was not found in Hyper-V.`);
    } else {
      logInfo('Launchpad', `Hyper-V VM 'FastFree-${selectedClientId.value}' verified in Hyper-V.`);
      try {
        localStorage.setItem('fastfree_provisioned', 'true');
      } catch {}
    }
  } catch (err) {
    console.warn('Error checking VM existence:', err);
    vmExists.value = false;
  } finally {
    isCheckingVm.value = false;
  }
}

async function handleInstantProvisioning() {
  if (isProvisioning.value) return;
  isProvisioning.value = true;
  provisioningMessage.value = isRtl.value
    ? 'جارٍ تهيئة محول الشبكة وإعداد قرص VHDX وتسجيل الآلة الافتراضية في Hyper-V...'
    : 'Configuring Virtual Switch, allocating VHDX, and deploying VM in Hyper-V...';
  logInfo('Launchpad', `Instant VM provisioning triggered for ${selectedClientId.value}`);

  try {
    const safeRam = Math.round((assignedRamMb.value || 8192) / 1024) * 1024 || 8192;
    const logs = await provisionNode(
      selectedClientId.value,
      assignedCpuCores.value || 4,
      safeRam,
      targetDiskDrive.value || 'C:\\'
    );
    logSuccess('Launchpad', `Instant VM provisioning succeeded: ${logs.length} step(s) completed.`);
    actionNotice.value = isRtl.value
      ? 'تم إنشاء وتثبيت وتشغيل الآلة الافتراضية بنجاح! ✅'
      : 'Virtual machine created, installed and started successfully! ✅';

    await checkVmStatus();
  } catch (err: any) {
    const msg = String(err?.message || err);
    actionNotice.value = isRtl.value
      ? `تعذر إنشاء الآلة في Hyper-V: ${msg}`
      : `Failed to create VM in Hyper-V: ${msg}`;
    logError('Launchpad', 'Instant provisioning error', msg);
  } finally {
    isProvisioning.value = false;
    provisioningMessage.value = '';
    setTimeout(() => {
      actionNotice.value = '';
    }, 6000);
  }
}

function handleRestartWizard() {
  try {
    localStorage.removeItem('fastfree_provisioned');
  } catch (err) {
    console.warn('Storage clear error:', err);
  }
  logInfo('Launchpad', 'Restarting setup wizard from Step 1 on user request.');
  currentStep.value = 1;
}

async function handleManualCheckUpdate() {
  const hasUpdate = await checkForUpdates(false);
  if (!hasUpdate) {
    actionNotice.value = isRtl.value
      ? 'أنت تستخدم أحدث إصدار معتمد من فاست فري ✅'
      : 'FastFree Companion is fully up to date ✅';
    setTimeout(() => {
      actionNotice.value = '';
    }, 4000);
  }
}

onMounted(async () => {
  await checkVmStatus();
});

async function launchPortal() {
  const url = `http://${selectedClientId.value}.fastfree.local`;
  logInfo('Launchpad', `Opening FastFree portal at ${url}`);
  try {
    await openUrl(url);
  } catch (err) {
    console.warn('Fallback window.open:', err);
    window.open(url, '_blank');
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedText.value = text;
    setTimeout(() => {
      copiedText.value = null;
    }, 2000);
  } catch (err) {
    console.error('Clipboard copy error:', err);
  }
}

async function handleVmAction(action: 'start' | 'stop' | 'restart') {
  if (vmExists.value === false) {
    actionNotice.value = isRtl.value
      ? '⚠️ الآلة الافتراضية غير منشأة بعد في Hyper-V. يرجى الضغط على زر "إنشاء وتثبيت الآلة الافتراضية الآن".'
      : '⚠️ Virtual machine is not created yet. Please click "Create & Install Virtual Machine Now".';
    return;
  }

  vmActionBusy.value = true;
  actionNotice.value = action === 'restart'
    ? t('launchpad.vmRestarting', { client: selectedClientId.value })
    : action === 'start'
    ? (isRtl.value ? `جارٍ بدء تشغيل العقدة ${selectedClientId.value}...` : `Starting VM ${selectedClientId.value}...`)
    : t('launchpad.vmStopping', { client: selectedClientId.value });

  try {
    const res = await executeVmCommand(action, selectedClientId.value);
    actionNotice.value = res.message || t('launchpad.vmSuccess');
    logSuccess('VM', `VM ${action} succeeded for ${selectedClientId.value}`);
  } catch (err) {
    const msg = String(err);
    if (msg.includes('VM_NOT_FOUND') || msg.includes('unable to find a virtual machine')) {
      vmExists.value = false;
      actionNotice.value = isRtl.value
        ? 'الآلة الافتراضية غير موجودة في Hyper-V. يمكنك إنشاؤها عبر الزر الظاهر بالأعلى.'
        : 'Virtual machine not found in Hyper-V. You can create it using the button above.';
    } else {
      actionNotice.value = `VM command error: ${msg}`;
    }
    logError('VM', `VM ${action} failed`, msg);
  } finally {
    vmActionBusy.value = false;
    setTimeout(() => {
      actionNotice.value = '';
    }, 5000);
  }
}

async function handleMinimizeToTray() {
  await minimizeToTray();
}
</script>

<style scoped>
.screen-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-box {
  margin-bottom: 12px;
}

.step-tag-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #10B981;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.live-dot-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 8px #10B981;
  animation: pulse-dot 1.8s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 2px;
}

.hero-unprovisioned-card {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(239, 68, 68, 0.1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.45);
  border-radius: var(--radius-hero, 16px);
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: 0 8px 30px -4px rgba(245, 158, 11, 0.22);
  backdrop-filter: blur(12px);
  animation: fadeIn 0.3s ease;
}

.unprovisioned-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.unprovisioned-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unprovisioned-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unprovisioned-title-row h3 {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: #FBBF24;
}

.unprovisioned-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: #FBBF24;
  background: rgba(245, 158, 11, 0.15);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.unprovisioned-sub-text {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-secondary, #E2E8F0);
  line-height: 1.45;
}

.unprovisioned-actions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.btn-instant-provision {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.35);
}

.btn-instant-provision:hover:not(:disabled) {
  background: linear-gradient(135deg, #D97706, #B45309);
  transform: translateY(-1px);
}

.btn-instant-provision:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-revisit-setup {
  background: transparent;
  color: var(--text-muted, #94A3B8);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-revisit-setup:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main, #FFFFFF);
}

.provisioning-live-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #FCD34D;
  margin-top: 4px;
}

.pulse-icon {
  animation: pulse-dot 1.5s infinite;
}

.hero-success-card.is-warning {
  background: rgba(245, 158, 11, 0.05);
  border-color: rgba(245, 158, 11, 0.2);
}

.success-icon-badge.badge-amber {
  background: #F59E0B;
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.3);
}

.live-status-pill.pill-amber {
  color: #FBBF24;
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
}

.dot-amber {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F59E0B;
}

.hero-success-card {
  background: var(--card-glass-bg, linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(25, 118, 210, 0.08)));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-card, 14px);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
}

.success-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #10B981;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
}

.hero-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.node-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-title-row h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #FFFFFF);
}

.node-sub-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary, #CBD5E1);
  line-height: 1.4;
}

.live-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: #34D399;
  background: rgba(16, 185, 129, 0.15);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.dot-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10B981;
}

/* 3-Column Specifications Grid */
.telemetry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.spec-card {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.spec-card:hover {
  transform: translateY(-2px);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: var(--card-hover-shadow, 0 8px 25px -4px rgba(0, 0, 0, 0.45));
}

.spec-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #E4E4E7);
  margin-bottom: 2px;
}

.spec-icon {
  font-size: 13px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.spec-k {
  color: var(--text-muted, #71717A);
}

.spec-v {
  color: var(--text-main, #F8FAFC);
}

.font-bold {
  font-weight: 700;
}

.text-accent {
  color: #38BDF8;
}

.text-emerald {
  color: #34D399;
}

.uppercase {
  text-transform: uppercase;
}

.font-mono {
  font-family: 'Consolas', 'Courier New', monospace;
}

.truncate {
  max-width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-xs {
  font-size: 10px;
}

/* Endpoints Grid */
.endpoints-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (max-width: 900px) {
  .telemetry-grid,
  .endpoints-grid {
    grid-template-columns: 1fr;
  }
}

.endpoint-card {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.endpoint-card:hover {
  transform: translateY(-2px);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: var(--card-hover-shadow, 0 8px 25px -4px rgba(0, 0, 0, 0.45));
}

.ep-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ep-icon {
  font-size: 13px;
}

.ep-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #94A3B8);
}

.ep-url {
  font-size: 13px;
  font-weight: 700;
  color: #38BDF8;
}

.ep-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.btn-copy {
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-secondary, #D4D4D8);
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 10.5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-copy:hover {
  background: var(--border-color, #3F3F46);
  color: #FFFFFF;
}

.btn-launch-sm {
  background: rgba(25, 118, 210, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38BDF8;
  padding: 3px 10px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-launch-sm:hover {
  background: rgba(25, 118, 210, 0.35);
  color: #FFFFFF;
}

.ep-note {
  font-size: 10px;
  color: var(--text-muted, #71717A);
  font-family: 'Consolas', 'Courier New', monospace;
}

/* Companion VM Controls Card */
.companion-card {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
}

.comp-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main, #FFFFFF);
}

.vm-power-controls {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-vm-action {
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-secondary, #D4D4D8);
  padding: 4px 10px;
  border-radius: var(--radius-inner, 8px);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-vm-action:hover:not(:disabled) {
  background: var(--border-color, #3F3F46);
  color: #FFFFFF;
  transform: translateY(-1px);
}

.btn-vm-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-start {
  color: #34D399;
  border-color: rgba(16, 185, 129, 0.3);
}

.btn-start:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.15);
}

.btn-danger {
  color: #F87171;
}

.btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-restart-wizard {
  color: #38BDF8;
  border-color: rgba(56, 189, 248, 0.35);
}

.btn-restart-wizard:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.15);
}

.comp-desc {
  margin: 0;
  font-size: 10.5px;
  color: var(--text-muted, #71717A);
  line-height: 1.4;
}

.notice-pill {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #38BDF8;
  font-size: 11px;
  padding: 6px 12px;
  border-radius: 6px;
  text-align: center;
}

/* Action Bar */
.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
}

.action-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 12.5px;
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
  box-shadow: 0 4px 14px rgba(25, 118, 210, 0.4);
}

.btn-secondary {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #E4E4E7);
}

.btn-secondary:hover {
  background: var(--border-color, #3F3F46);
}
</style>
