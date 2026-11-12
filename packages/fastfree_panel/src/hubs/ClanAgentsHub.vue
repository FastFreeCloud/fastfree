<template>
  <div class="clan-agents-hub fit column" data-source-path="packages/fastfree_panel/src/hubs/ClanAgentsHub.vue" data-studio-screen="true">
    <!-- Hub Top Navigation Bar -->
    <div class="hub-header q-px-md q-py-sm bg-grey-10 text-white row items-center justify-between no-wrap">
      <div class="row items-center q-gutter-x-sm no-wrap">
        <q-icon name="mdi-sitemap" size="24px" color="cyan" />
        <div>
          <div class="text-subtitle1 text-weight-bold">
            Omnigent Multi-Agent Studio · منظومة الوكلاء المتقدمة
          </div>
          <div class="text-caption text-grey-5 gt-xs">
            Meta-Harness Orchestration, Subagent Worktrees, Hindsight Memory & Approvals Gate
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
        <q-tab name="omnigent" icon="mdi-sitemap" label="Omnigent Studio · استوديو الوكلاء" />
        <q-tab name="design" icon="mdi-creation-outline" label="Design Studio · استوديو التصميم" />
      </q-tabs>
    </div>

    <!-- Hub Tab Panels with State Persistence -->
    <div class="col overflow-hidden">
      <q-tab-panels v-model="activeTab" animated keep-alive class="fit bg-transparent">
        <q-tab-panel name="omnigent" class="q-pa-none fit">
          <ClanOmnigentScreen />
        </q-tab-panel>
        <q-tab-panel name="design" class="q-pa-none fit">
          <ClanStudioScreen />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClanOmnigentScreen from '../screens/ClanOmnigentScreen.vue';
import ClanStudioScreen from '../screens/ClanStudioScreen.vue';

const activeTab = ref<'omnigent' | 'design'>('omnigent');
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
