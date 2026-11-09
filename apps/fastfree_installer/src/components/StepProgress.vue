<template>
  <!-- Wizard Steps Bar: Shown only during initial setup (Steps 1-5) -->
  <div v-if="currentStep < 6" class="step-progress-bar" :class="{ 'is-rtl': isRtl }">
    <div
      v-for="step in steps"
      :key="step.number"
      class="step-item"
      :class="{
        active: currentStep === step.number,
        completed: isStepCompleted(step.number),
        clickable: canClickStep(step.number),
        disabled: !canClickStep(step.number),
      }"
      :title="getStepTooltip(step.number)"
      @click="handleStepClick(step.number)"
    >
      <div class="step-badge">
        <span v-if="isStepCompleted(step.number)" class="check">
          <svg aria-hidden="true" class="check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span v-else>{{ step.number }}</span>
      </div>
      <div class="step-info">
        <span class="step-title">{{ t(step.titleKey) }}</span>
        <span class="step-subtitle">{{ t(step.subtitleKey) }}</span>
      </div>
      <div v-if="step.number < steps.length" class="step-line"></div>
    </div>
  </div>

  <!-- Operational Appliance Status Bar: Shown once node is deployed (Step 6 / Launchpad) -->
  <div v-else class="appliance-status-bar" :class="{ 'is-rtl': isRtl }">
    <div class="status-left">
      <span class="pulse-live-dot"></span>
      <span class="status-title">{{ t('auto.fastfree_node_appliance_fully_operational') }}</span>
      <span class="appliance-tag">Hyper-V Gen 2</span>
    </div>
    <div class="status-right">
      <span class="status-hint">{{ t('auto.configuration_locked_for_system_integrity_live_in_system_tray') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  currentStep,
  loadingDiscovery,
  discoveryReport,
  licenseState,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  wireGuardConfig,
  isProvisioningDone,
  canEnterStep,
  navigateToStep,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

interface StepConfig {
  number: number;
  titleKey: string;
  subtitleKey: string;
}

const steps: StepConfig[] = [
  { number: 1, titleKey: 'steps.step1.title', subtitleKey: 'steps.step1.subtitle' },
  { number: 2, titleKey: 'steps.step2.title', subtitleKey: 'steps.step2.subtitle' },
  { number: 3, titleKey: 'steps.step3.title', subtitleKey: 'steps.step3.subtitle' },
  { number: 4, titleKey: 'steps.step4.title', subtitleKey: 'steps.step4.subtitle' },
  { number: 5, titleKey: 'steps.step5.title', subtitleKey: 'steps.step5.subtitle' },
  { number: 6, titleKey: 'steps.step6.title', subtitleKey: 'steps.step6.subtitle' },
];

function isStepCompleted(stepNum: number): boolean {
  if (currentStep.value > stepNum) return true;
  if (stepNum === 1) return !loadingDiscovery.value && !!discoveryReport.value;
  if (stepNum === 2) return !!licenseState.value && licenseState.value.is_valid;
  if (stepNum === 3) return assignedCpuCores.value >= 1 && assignedRamMb.value >= 1024 && !!targetDiskDrive.value;
  if (stepNum === 4) return !!wireGuardConfig.value && !!wireGuardConfig.value.listen_port;
  if (stepNum === 5) return isProvisioningDone.value;
  return false;
}

function canClickStep(stepNum: number): boolean {
  if (currentStep.value >= 6) return false;
  // Block leaving step 5 while provisioning is in progress
  if (currentStep.value === 5 && !isProvisioningDone.value) return false;
  if (stepNum === currentStep.value) return false;
  // Allow jumping backward to previously visited steps
  if (stepNum < currentStep.value) return true;
  // Forward jumping: only allow next immediate step IF prerequisites are fully met
  if (stepNum === currentStep.value + 1) {
    return canEnterStep(stepNum).allowed;
  }
  // Strictly disallow skipping multiple steps ahead
  return false;
}

function getStepTooltip(stepNum: number): string {
  if (currentStep.value >= 6) {
    return t('auto.wizard_locked_for_system_integrity');
  }
  if (currentStep.value === 5 && !isProvisioningDone.value) {
    return t('auto.provisioning_in_progress');
  }
  if (stepNum === currentStep.value) {
    return t('auto.current_step');
  }
  if (stepNum < currentStep.value) {
    return t('auto.return_to_this_completed_step');
  }
  if (stepNum > currentStep.value + 1) {
    return t('auto.cannot_skip_steps_complete_previous_stages_in_order');
  }
  const check = canEnterStep(stepNum);
  return check.allowed
    ? (t('auto.proceed_to_this_step'))
    : t('auto.blocked', { reason: check.reason || t('auto.prerequisites_required') });
}

function handleStepClick(target: number) {
  if (!canClickStep(target)) return;
  navigateToStep(target);
}
</script>

<style scoped>
.step-progress-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px clamp(14px, 2vw, 24px);
  background: var(--bg-card, #18181B);
  border-bottom: 1px solid var(--border-color, #27272A);
  user-select: none;
  transition: background-color 0.2s, border-color 0.2s;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  flex: 1;
  opacity: 0.4;
  transition: all 0.25s ease;
  cursor: not-allowed;
}

.step-item:last-child {
  flex: 0 1 auto;
}

.step-item.clickable {
  cursor: pointer;
  opacity: 0.85;
}

.step-item.clickable:hover {
  opacity: 1;
}

.step-item.active {
  opacity: 1;
  cursor: default;
}

.step-item.completed {
  opacity: 0.9;
}

.step-item.disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.step-badge {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--bg-sub, #27272A);
  color: var(--text-muted, #A1A1AA);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 700;
  border: 1px solid var(--border-color, #3F3F46);
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.step-item.active .step-badge {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
  border-color: var(--accent-sky, #38BDF8);
  box-shadow: 0 0 12px rgba(25, 118, 210, 0.5);
  transform: scale(1.05);
}

.step-item.completed .step-badge {
  background: #059669;
  color: #FFFFFF;
  border-color: #10B981;
}

.check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-svg {
  width: 13px;
  height: 13px;
  stroke: #FFFFFF;
}

.step-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.step-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main, #F4F4F5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-subtitle {
  font-size: 9.5px;
  color: var(--text-muted, #A1A1AA);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border-color, #27272A);
  margin: 0 8px;
  min-width: 10px;
  border-radius: 2px;
}

.step-item.completed .step-line {
  background: #059669;
}

/* Post-Provisioning Appliance Status Bar */
.appliance-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px clamp(14px, 2vw, 24px);
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.12), rgba(25, 118, 210, 0.08));
  border-bottom: 1px solid rgba(16, 185, 129, 0.3);
  user-select: none;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pulse-live-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 10px #10B981;
  animation: pulse-live 2s infinite ease-in-out;
}

@keyframes pulse-live {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

.status-title {
  font-size: 13px;
  font-weight: 700;
  color: #34D399;
}

.appliance-tag {
  font-size: 10px;
  font-weight: 700;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.15);
  padding: 1px 7px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.status-right {
  display: flex;
  align-items: center;
}

.status-hint {
  font-size: 11px;
  color: var(--text-muted, #94A3B8);
}
</style>
