<template>
  <div class="clan-ops-hub fit column">
    <!-- Hub Top Navigation Bar -->
    <div class="hub-header q-px-md q-py-sm bg-grey-10 text-white row items-center justify-between no-wrap">
      <div class="row items-center q-gutter-x-sm no-wrap">
        <q-icon name="mdi-heart-pulse" size="24px" color="positive" />
        <div>
          <div class="text-subtitle1 text-weight-bold">
            Operations & Health Hub · عمليات وسلامة النظام
          </div>
          <div class="text-caption text-grey-5 gt-xs">
            System Telemetry, Native Systemd Units & Atomic Deployments
          </div>
        </div>
      </div>

      <!-- Responsive Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        no-caps
        active-color="positive"
        indicator-color="positive"
        class="text-grey-4"
        :mobile-arrows="true"
      >
        <q-tab name="health" icon="mdi-heart-pulse" label="Health · سلامة النظام" />
        <q-tab name="services" icon="mdi-cogs" label="Services · الخدمات والعمليات" />
        <q-tab name="deploy" icon="mdi-rocket-launch" label="Deploy · النشر والتراجع" />
      </q-tabs>
    </div>

    <!-- Hub Tab Panels with State Persistence -->
    <div class="col overflow-hidden">
      <q-tab-panels v-model="activeTab" animated keep-alive class="fit bg-transparent">
        <q-tab-panel name="health" class="q-pa-none fit">
          <ClanHealthScreen />
        </q-tab-panel>

        <q-tab-panel name="services" class="q-pa-none fit">
          <ClanServicesScreen />
        </q-tab-panel>

        <q-tab-panel name="deploy" class="q-pa-none fit">
          <ClanDeployScreen />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClanHealthScreen from '../screens/ClanHealthScreen.vue';
import ClanServicesScreen from '../screens/ClanServicesScreen.vue';
import ClanDeployScreen from '../screens/ClanDeployScreen.vue';

const activeTab = ref<'health' | 'services' | 'deploy'>('health');
</script>

<style scoped lang="scss">
.clan-ops-hub {
  height: 100%;
  overflow: hidden;
}

.hub-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
