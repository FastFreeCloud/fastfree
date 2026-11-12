<template>
  <div class="clan-config-hub fit column">
    <!-- Hub Top Navigation Bar -->
    <div class="hub-header q-px-md q-py-sm bg-grey-10 text-white row items-center justify-between no-wrap">
      <div class="row items-center q-gutter-x-sm no-wrap">
        <q-icon name="mdi-shield-lock-outline" size="24px" color="amber-5" />
        <div>
          <div class="text-subtitle1 text-weight-bold">
            Config & Security Hub · الأمان والتكوين
          </div>
          <div class="text-caption text-grey-5 gt-xs">
            Clan Variables, Age/Sops Secrets Matrix & Borg Backups
          </div>
        </div>
      </div>

      <!-- Responsive Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        no-caps
        active-color="amber-5"
        indicator-color="amber-5"
        class="text-grey-4"
        :mobile-arrows="true"
      >
        <q-tab name="vars" icon="mdi-code-braces" label="Clan Vars · المتغيرات" />
        <q-tab name="secrets" icon="mdi-shield-key" label="Secrets · الأسرار والتشفير" />
        <q-tab name="backups" icon="mdi-backup-restore" label="Backups · النسخ الاحتياطي" />
      </q-tabs>
    </div>

    <!-- Hub Tab Panels with State Persistence -->
    <div class="col overflow-hidden">
      <q-tab-panels v-model="activeTab" animated keep-alive class="fit bg-transparent">
        <q-tab-panel name="vars" class="q-pa-none fit">
          <ClanVarsScreen />
        </q-tab-panel>

        <q-tab-panel name="secrets" class="q-pa-none fit">
          <ClanSecretsScreen />
        </q-tab-panel>

        <q-tab-panel name="backups" class="q-pa-none fit">
          <ClanBackupsScreen />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClanVarsScreen from '../screens/ClanVarsScreen.vue';
import ClanSecretsScreen from '../screens/ClanSecretsScreen.vue';
import ClanBackupsScreen from '../screens/ClanBackupsScreen.vue';

const activeTab = ref<'vars' | 'secrets' | 'backups'>('vars');
</script>

<style scoped lang="scss">
.clan-config-hub {
  height: 100%;
  overflow: hidden;
}

.hub-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
