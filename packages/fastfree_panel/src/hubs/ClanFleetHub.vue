<template>
  <div class="clan-fleet-hub fit column">
    <!-- Hub Top Navigation Bar -->
    <div class="hub-header q-px-md q-py-sm bg-grey-10 text-white row items-center justify-between no-wrap">
      <div class="row items-center q-gutter-x-sm no-wrap">
        <q-icon name="mdi-server-network" size="24px" color="primary" />
        <div>
          <div class="text-subtitle1 text-weight-bold">
            Fleet & Machines Hub · أسطول الأجهزة
          </div>
          <div class="text-caption text-grey-5 gt-xs">
            Orchestration, Image Building & WireGuard Mesh Network
          </div>
        </div>
      </div>

      <!-- Responsive Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        no-caps
        active-color="primary"
        indicator-color="primary"
        class="text-grey-4"
        :mobile-arrows="true"
      >
        <q-tab name="machines" icon="mdi-server" label="Machines · الأجهزة" />
        <q-tab name="builder" icon="mdi-disc" label="Image Builder · بناء الصور" />
        <q-tab name="network" icon="mdi-lan" label="Network Mesh · الشبكة" />
      </q-tabs>
    </div>

    <!-- Hub Tab Panels -->
    <div class="col overflow-hidden">
      <q-tab-panels v-model="activeTab" animated keep-alive class="fit bg-transparent">
        <q-tab-panel name="machines" class="q-pa-none fit">
          <ClanMachinesScreen />
        </q-tab-panel>

        <q-tab-panel name="builder" class="q-pa-none fit">
          <ClanImageBuilderScreen />
        </q-tab-panel>

        <q-tab-panel name="network" class="q-pa-none fit">
          <ClanNetworkScreen />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClanMachinesScreen from '../screens/ClanMachinesScreen.vue';
import ClanImageBuilderScreen from '../screens/ClanImageBuilderScreen.vue';
import ClanNetworkScreen from '../screens/ClanNetworkScreen.vue';

const activeTab = ref<'machines' | 'builder' | 'network'>('machines');
</script>

<style scoped lang="scss">
.clan-fleet-hub {
  height: 100%;
  overflow: hidden;
}

.hub-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
