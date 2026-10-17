<template>
  <div class="clan-deploy-screen q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold">
          <span>NixOS Deploy & Rollback</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">النشر والتراجع الفوري</span>
        </div>
        <div class="text-caption text-grey-6">
          Atomic generation switching & zero-downtime fleet deployment
        </div>
      </div>
    </div>

    <!-- Active Deployment Warning / Progress -->
    <q-banner
      v-if="clanStore.isDeploying"
      rounded
      class="bg-primary text-white q-mb-md"
      icon="mdi-rocket-launch"
    >
      <div class="text-weight-bold">Deployment or Fleet Update in Progress...</div>
      <div>{{ formatProgress(clanStore.deployProgress) }}</div>
      <q-linear-progress indeterminate color="white" class="q-mt-sm" />
    </q-banner>

    <!-- Quick Action Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center q-mb-sm">
            <q-avatar icon="mdi-cloud-upload" color="primary" text-color="white" size="36px" />
            <div class="q-ml-sm">
              <div class="text-subtitle1 text-weight-bold">Stream Deployment</div>
              <div class="text-caption text-grey-6">Deploy FastFree OS flake changes to client2</div>
            </div>
          </div>
          <p class="text-body2 text-grey-4">
            Compiles the 60KB NixOS stream configuration directly onto the VPS without intermediate Docker builds.
          </p>
          <q-btn
            color="primary"
            icon="mdi-play"
            label="Trigger Fleet Deploy"
            :loading="clanStore.isDeploying"
            @click="triggerDeployAll"
          />
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center q-mb-sm">
            <q-avatar icon="mdi-history" color="negative" text-color="white" size="36px" />
            <div class="q-ml-sm">
              <div class="text-subtitle1 text-weight-bold">Instant Rollback</div>
              <div class="text-caption text-grey-6">Atomic return to previous NixOS generation</div>
            </div>
          </div>
          <p class="text-body2 text-grey-4">
            Instantly rolls back the VPS system state to Generation #1 if any runtime regression is detected.
          </p>
          <q-btn
            color="negative"
            outline
            icon="mdi-undo-variant"
            label="Rollback to Previous Gen"
            :loading="clanStore.isDeploying"
            @click="confirmRollback"
          />
        </q-card>
      </div>
    </div>

    <!-- Generations History -->
    <q-card flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold">
          <q-icon name="mdi-format-list-numbered" color="cyan" class="q-mr-xs" />
          NixOS Generations Log
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-list separator>
          <q-item>
            <q-item-section avatar>
              <q-badge color="positive" label="GEN 2" class="text-weight-bold text-caption q-pa-xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">Generation 2 (Active Current)</q-item-label>
              <q-item-label caption>Built: 2026-10-17 18:05:55 · Kernel: 6.18.38 · Zero Podman</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip dense color="positive" text-color="white" size="sm">ACTIVE</q-chip>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section avatar>
              <q-badge color="grey-7" label="GEN 1" class="text-weight-bold text-caption q-pa-xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">Generation 1 (Initial Provision)</q-item-label>
              <q-item-label caption>Built: 1970-04-29 · Base Hostinger KVM image</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip dense color="grey-7" text-color="white" size="sm">ROLLBACK TARGET</q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { useClanStore, type DeployProgress } from '../stores/clan';
import { useQuasar } from 'quasar';

const clanStore = useClanStore();
const $q = useQuasar();

function formatProgress(prog: number | string | DeployProgress | null): string {
  if (!prog) return 'Processing...';
  if (typeof prog === 'string') return prog;
  if (typeof prog === 'number') return `${prog}%`;
  return prog.message || prog.stage || 'In progress...';
}

async function triggerDeployAll(): Promise<void> {
  await clanStore.triggerMachineUpdate('client2');
}

function confirmRollback(): void {
  $q.dialog({
    title: 'Confirm Rollback · تأكيد التراجع',
    message: 'Are you sure you want to rollback to the previous NixOS generation? The machine will instantly switch system state.',
    cancel: true,
    persistent: true,
    ok: {
      color: 'negative',
      label: 'Rollback Now',
    },
  }).onOk(() => {
    void clanStore.triggerRollback('client2');
  });
}
</script>

<style scoped lang="scss">
.clan-deploy-screen {
  height: 100%;
  overflow-y: auto;
}
</style>
