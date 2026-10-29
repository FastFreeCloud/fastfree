<template>
  <div class="clan-agents-hub fit column">
    <!-- Hub Top Navigation Bar -->
    <div class="hub-header q-px-md q-py-sm bg-grey-10 text-white row items-center justify-between no-wrap">
      <div class="row items-center q-gutter-x-sm no-wrap">
        <q-icon name="mdi-robot-outline" size="24px" color="cyan" />
        <div>
          <div class="text-subtitle1 text-weight-bold">
            Paseo AI Agents Hub · منظومة الوكلاء والطرفيات
          </div>
          <div class="text-caption text-grey-5 gt-xs">
            17 Multi-Agent Terminals, MCP Orchestration & Prompt Command Dispatch
          </div>
        </div>
      </div>

      <!-- Responsive Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        no-caps
        active-color="cyan"
        indicator-color="cyan"
        class="text-grey-4"
        :mobile-arrows="true"
      >
        <q-tab name="ecosystem" icon="mdi-robot-outline" label="Active Agents · الوكلاء النشطون" />
      </q-tabs>
    </div>

    <!-- Hub Tab Panels with State Persistence -->
    <div class="col overflow-hidden">
      <q-tab-panels v-model="activeTab" animated keep-alive class="fit bg-transparent">
        <q-tab-panel name="ecosystem" class="q-pa-none fit">
          <ClanPaseoScreen />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClanPaseoScreen from '../screens/ClanPaseoScreen.vue';

const activeTab = ref<'ecosystem'>('ecosystem');
</script>

<style scoped lang="scss">
.clan-agents-hub {
  height: 100%;
  overflow: hidden;
}

.hub-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
