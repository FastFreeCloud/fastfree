<template>
  <div class="step-progress-bar" :class="{ 'is-rtl': isRtl }">
    <div
      v-for="step in steps"
      :key="step.number"
      class="step-item"
      :class="{
        active: currentStep === step.number,
        completed: currentStep > step.number,
      }"
      @click="navigateIfAllowed(step.number)"
    >
      <div class="step-badge">
        <span v-if="currentStep > step.number" class="check">✓</span>
        <span v-else>{{ step.number }}</span>
      </div>
      <div class="step-info">
        <span class="step-title">{{ t(step.titleKey) }}</span>
        <span class="step-subtitle">{{ t(step.subtitleKey) }}</span>
      </div>
      <div v-if="step.number < steps.length" class="step-line"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { currentStep } from '../composables/useDiscovery';
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

function navigateIfAllowed(target: number) {
  // Allow jumping backwards to already visited steps prior to provisioning
  if (target < currentStep.value && currentStep.value < 5) {
    currentStep.value = target;
  }
}
</script>

<style scoped>
.step-progress-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-card, #18181B);
  border-bottom: 1px solid var(--border-color, #27272A);
  user-select: none;
  transition: background-color 0.2s, border-color 0.2s;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  flex: 1;
  opacity: 0.55;
  transition: all 0.25s ease;
}

.step-item:last-child {
  flex: 0 1 auto;
}

.step-item.active {
  opacity: 1;
}

.step-item.completed {
  opacity: 0.9;
  cursor: pointer;
}

.step-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-sub, #27272A);
  color: var(--text-muted, #A1A1AA);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--border-color, #3F3F46);
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.step-item.active .step-badge {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
  border-color: var(--accent-sky, #38BDF8);
  box-shadow: 0 0 10px rgba(25, 118, 210, 0.5);
}

.step-item.completed .step-badge {
  background: #059669;
  color: #FFFFFF;
  border-color: #10B981;
}

.check {
  font-size: 13px;
}

.step-info {
  display: flex;
  flex-direction: column;
}

.step-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #F4F4F5);
  white-space: nowrap;
}

.step-subtitle {
  font-size: 10px;
  color: var(--text-muted, #A1A1AA);
  white-space: nowrap;
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border-color, #27272A);
  margin: 0 12px;
  min-width: 14px;
}

.step-item.completed .step-line {
  background: #059669;
}
</style>
