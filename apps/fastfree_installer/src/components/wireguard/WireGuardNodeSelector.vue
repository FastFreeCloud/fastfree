<template>
  <div v-if="allNodes.length > 1" class="node-selector-bar">
    <div class="selector-meta">
      <span class="meta-label">{{ t('wireguard.multiNodeNotice') }}</span>
      <span class="current-node-badge font-mono">FastFree-{{ selectedClientId }}</span>
    </div>
    <div class="node-pill-buttons">
      <button
        v-for="nodeId in allNodes"
        :key="nodeId"
        type="button"
        class="btn-node-pill"
        :class="{ active: nodeId === selectedClientId }"
        :disabled="isLoadingConfig"
        @click="selectTargetNode(nodeId)"
      >
        <span class="pill-dot"></span>
        <span class="pill-text font-mono">FastFree-{{ nodeId }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWireGuardScreen } from '../../composables/useWireGuardScreen';

const { t, allNodes, selectedClientId, isLoadingConfig, selectTargetNode } = useWireGuardScreen();
</script>
