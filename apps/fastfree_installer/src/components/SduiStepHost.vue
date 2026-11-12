<template>
  <div class="sdui-step-host q-pa-md">
    <!-- Return Bar to CasaOS Launchpad when viewing a package screen -->
    <div v-if="activeNamedScreen" class="row items-center justify-between q-mb-md q-px-sm">
      <q-btn
        flat
        icon="arrow_back"
        color="primary"
        :label="locale === 'ar' ? '← العودة إلى سطح مكتب التطبيقات (CasaOS Launchpad)' : '← Back to CasaOS Launchpad'"
        @click="closeNamedScreen"
      />
      <q-badge color="positive" outline class="q-py-xs q-px-sm">
        {{ locale === 'ar' ? 'موديول سيادي يعمل داخل التطبيق (Native In-App SDUI)' : 'Native In-App Sovereign SDUI' }}
      </q-badge>
    </div>

    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="3rem" />
      <div class="text-caption text-grey-5 q-mt-sm">جاري تحميل واجهة SDUI للشاشة {{ step }}...</div>
    </div>
    <div v-else-if="currentSchema" class="sdui-screen-wrapper">
      <SduiNode
        :node="currentSchema.root"
        :state="sharedState"
        @action="handleSduiAction"
      />
    </div>
    <div v-else class="text-negative text-center q-pa-lg">
      تعذر تحميل شاشة SDUI للخطوة {{ step }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  SduiNode,
  SduiCacheManager,
  SduiActionDispatcher,
  type SduiScreen,
  type SduiAction,
} from 'quasar-app-extension-fastfree-lowcode';
import {
  navigateToStep,
  discoveryReport,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  licenseState,
  wireGuardConfig,
  fetchSystemDiscovery,
  verifyLicense,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';

const { locale } = useI18n();
const { theme } = useTheme();

// Import all 6 SDUI schemas directly from local installer schemas
import step1Schema from '../schemas/step1_discovery.json';
import step2Schema from '../schemas/step2_license.json';
import step3Schema from '../schemas/step3_sizing.json';
import step4Schema from '../schemas/step4_wireguard.json';
import step5Schema from '../schemas/step5_provisioning.json';
import step6Schema from '../schemas/step6_launchpad.json';

// Import Sovereign Package Schemas (ERP, Accounting, Sales POS, Fleet Monitor, Create Client)
import fleetMonitorSchema from '../../../../packages/fastfree_os/src/schemas/fleet_monitor.json';
import clientManagerSchema from '../../../../packages/fastfree_os/src/schemas/client_manager.json';
import posCheckoutSchema from '../../../../packages/fastfree_sales/src/schemas/pos_checkout.json';
import generalLedgerSchema from '../../../../packages/fastfree_accounting/src/schemas/general_ledger.json';

const props = defineProps<{
  step: number;
}>();

const emit = defineEmits<{
  (e: 'open-hub', tab?: 'audit' | 'logs' | 'telemetry' | 'sdui'): void;
}>();

const loading = ref(false);
const activeNamedScreen = ref<string | null>(null);
const currentSchema = ref<SduiScreen | null>(null);
const cache = SduiCacheManager.getInstance();

const schemasMap: Record<number, SduiScreen> = {
  1: step1Schema as unknown as SduiScreen,
  2: step2Schema as unknown as SduiScreen,
  3: step3Schema as unknown as SduiScreen,
  4: step4Schema as unknown as SduiScreen,
  5: step5Schema as unknown as SduiScreen,
  6: step6Schema as unknown as SduiScreen,
};

const namedSchemasMap: Record<string, SduiScreen> = {
  fleet_monitor: fleetMonitorSchema as unknown as SduiScreen,
  client_manager: clientManagerSchema as unknown as SduiScreen,
  create_client: clientManagerSchema as unknown as SduiScreen,
  sales_pos: posCheckoutSchema as unknown as SduiScreen,
  pos_checkout: posCheckoutSchema as unknown as SduiScreen,
  accounting_ledger: generalLedgerSchema as unknown as SduiScreen,
  general_ledger: generalLedgerSchema as unknown as SduiScreen,
};

function closeNamedScreen() {
  activeNamedScreen.value = null;
  void loadStepSchema(props.step);
}

// Two-way reactive shared state connecting SDUI to existing installer state
const sharedState = computed(() => ({
  locale: locale.value,
  theme: theme.value,
  cpuCores: discoveryReport.value?.cpu_count ?? 8,
  totalRamGb: discoveryReport.value ? Math.round(discoveryReport.value.total_memory_mb / 1024) : 16,
  assignedCpu: assignedCpuCores.value,
  assignedRam: assignedRamMb.value,
  targetDisk: targetDiskDrive.value,
  licenseKey: licenseState.value?.key ?? '',
  wgEndpoint: wireGuardConfig.value?.controller_endpoint ?? 'mesh.fastfree.internal',
  wgPort: wireGuardConfig.value?.listen_port ?? 51820,
  wgKillSwitch: true,
  wgHardwareAcceleration: true,
  installPercent: 65,
}));

async function loadStepSchema(stepNumber: number) {
  loading.value = true;
  const target = schemasMap[stepNumber];
  if (target) {
    await cache.set(target);
    const cached = await cache.get(target.id);
    currentSchema.value = cached ?? target;
  }
  loading.value = false;
}

const actionDispatcher = SduiActionDispatcher.getInstance();
actionDispatcher.setNavigator((target: string) => {
  const stepNum = parseInt(target.replace('step', ''), 10);
  if (!isNaN(stepNum)) {
    navigateToStep(stepNum);
  }
});

async function handleSduiAction(payload: { action: SduiAction | SduiAction[]; eventName: string; event: any }) {
  const actions = Array.isArray(payload.action) ? payload.action : [payload.action];
  for (const action of actions) {
    if (action.type === 'navigate' && action.target) {
      const stepNum = parseInt(action.target.replace('step', ''), 10);
      if (!isNaN(stepNum)) {
        navigateToStep(stepNum);
      }
    } else if (action.type === 'tauri:invoke' && action.command === 'run_hardware_discovery') {
      await fetchSystemDiscovery();
    } else if (action.type === 'tauri:invoke' && action.command === 'verify_license_key') {
      await verifyLicense(sharedState.value.licenseKey);
    } else if (action.type === 'tauri:invoke' && action.command === 'open_diagnostic_hub') {
      emit('open-hub', 'audit');
    } else if (action.type === 'tauri:invoke' && action.command === 'restart_fastfree_node') {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('manage_vm', { clientId: 'client1', action: 'restart' });
      } catch (e) {
        console.warn('[SDUI] VM restart invoke fallback:', e);
      }
    } else if (action.type === 'open_sdui_screen' || (action.type === 'tauri:invoke' && action.command === 'open_sdui_screen')) {
      const screenId = (action as any).screen || (action.payload as any)?.screen || (action.payload as any)?.url;
      if (screenId && namedSchemasMap[screenId]) {
        activeNamedScreen.value = screenId;
        currentSchema.value = namedSchemasMap[screenId];
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (action.type === 'back_to_launchpad') {
      closeNamedScreen();
    } else if (action.type === 'tauri:invoke' && action.command === 'open_external_url') {
      const url = (action.payload as any)?.url;
      if (url) {
        try {
          const { openUrl } = await import('@tauri-apps/plugin-opener');
          await openUrl(url);
        } catch {
          window.open(url, '_blank');
        }
      }
    } else {
      await actionDispatcher.dispatch(action, {
        state: sharedState.value,
        event: payload.event,
      });
    }
  }
}

watch(() => props.step, (newStep) => {
  void loadStepSchema(newStep);
});

onMounted(() => {
  void loadStepSchema(props.step);
});
</script>

<style scoped>
.sdui-step-host {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  animation: sduiFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.sdui-screen-wrapper {
  background: rgba(18, 18, 24, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}

:deep(.q-card) {
  background: rgba(26, 26, 34, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.q-card:hover) {
  border-color: rgba(14, 165, 233, 0.45) !important;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.12);
}

:deep(.q-banner) {
  border: 1px solid rgba(14, 165, 233, 0.3) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.15);
}

:deep(.q-btn) {
  border-radius: 8px !important;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

:deep(.q-slider__track-container) {
  height: 6px;
}

:deep(.q-chip) {
  font-weight: 600;
  border-radius: 6px;
}

@keyframes sduiFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
