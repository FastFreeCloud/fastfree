<template>
  <div v-if="allNodes.length > 1" class="wg-node-selector">
    <div class="wg-selector-meta">
      <span class="wg-meta-label">{{ t('wireguard.multiNodeNotice') }}</span>
      <span class="wg-current-node wg-font-mono">FastFree-{{ selectedClientId }}</span>
    </div>
    <div class="wg-node-pills">
      <button
        v-for="nodeId in allNodes"
        :key="nodeId"
        type="button"
        class="wg-btn-node"
        :class="{ 'wg-active': nodeId === selectedClientId }"
        :disabled="isLoadingConfig"
        @click="selectTargetNode(nodeId)"
      >
        <span class="wg-pill-dot"></span>
        <span class="wg-pill-text wg-font-mono">FastFree-{{ nodeId }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWireGuardScreen } from '../../composables/useWireGuardScreen';

const { t, allNodes, selectedClientId, isLoadingConfig, selectTargetNode } = useWireGuardScreen();
</script>
