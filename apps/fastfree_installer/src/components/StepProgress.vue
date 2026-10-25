<template>
  <div class="step-progress-bar">
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
        <span class="step-title">{{ step.title }}</span>
        <span class="step-subtitle">{{ step.subtitle }}</span>
      </div>
      <div v-if="step.number < steps.length" class="step-line"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { currentStep } from '../composables/useDiscovery';

interface Step {
  number: number;
  title: string;
  subtitle: string;
}

const steps: Step[] = [
  { number: 1, title: 'Discovery', subtitle: 'Host Diagnostics' },
  { number: 2, title: 'License', subtitle: 'Cloud Activation' },
  { number: 3, title: 'Node Sizing', subtitle: 'vCPU & RAM' },
  { number: 4, title: 'WireGuard', subtitle: 'Mesh Peer Config' },
  { number: 5, title: 'Deploy', subtitle: 'VHDX Provisioning' },
  { number: 6, title: 'Launchpad', subtitle: 'Node Companion' },
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
  background: #18181B;
  border-bottom: 1px solid #27272A;
  user-select: none;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  flex: 1;
  opacity: 0.5;
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
  background: #27272A;
  color: #A1A1AA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #3F3F46;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.step-item.active .step-badge {
  background: #1976D2;
  color: #FFFFFF;
  border-color: #38BDF8;
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
  color: #F4F4F5;
  white-space: nowrap;
}

.step-subtitle {
  font-size: 10px;
  color: #A1A1AA;
  white-space: nowrap;
}

.step-line {
  flex: 1;
  height: 2px;
  background: #27272A;
  margin: 0 12px;
  min-width: 14px;
}

.step-item.completed .step-line {
  background: #059669;
}
</style>
