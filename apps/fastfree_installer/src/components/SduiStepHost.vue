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
      <div class="text-caption text-muted q-mt-sm">
        {{ locale === 'ar' ? 'جاري تحميل واجهة SDUI للشاشة' : 'Loading SDUI screen for step' }} {{ step }}...
      </div>
    </div>
    <div v-else-if="currentSchema" class="sdui-screen-wrapper">
      <SduiNode
        :node="currentSchema.root"
        :state="sharedState"
        @action="handleSduiAction"
      />
    </div>
    <div v-else class="text-negative text-center q-pa-lg">
      {{ locale === 'ar' ? 'تعذر تحميل شاشة SDUI للخطوة' : 'Failed to load SDUI screen for step' }} {{ step }}
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
  STEP_SCHEMAS,
  NAMED_SDUI_SCREENS,
  ALL_SDUI_SCREENS,
  getStepSchema,
  getNamedScreen,
} from '../schemas/screens';
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

const props = defineProps<{
  step: number;
}>();

const emit = defineEmits<{
  (e: 'open-hub', tab?: 'audit' | 'logs' | 'telemetry' | 'sdui'): void;
}>();

const { locale } = useI18n();
const { theme } = useTheme();

const loading = ref(false);
const activeNamedScreen = ref<string | null>(null);
const currentSchema = ref<SduiScreen | null>(null);
const cache = SduiCacheManager.getInstance();

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
  const target = getStepSchema(stepNumber);
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
      if (screenId && getNamedScreen(screenId)) {
        activeNamedScreen.value = screenId;
        currentSchema.value = getNamedScreen(screenId);
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
  // Test / MCP bridge: expose the reactive shared state and cache manager so
  // headless verification can inspect locale + theme without a page reload.
  (window as any).__FASTFREE_SDUI_SHARED_STATE__ = sharedState;
  (window as any).__FASTFREE_SDUI_CACHE__ = cache;

  // Phase 2.2: prefetch every registered SDUI schema into the Dexie cache.
  void cache.prefetch(ALL_SDUI_SCREENS);
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
  background: var(--surface-overlay);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-card);
}

:deep(.q-card) {
  background: var(--bg-card);
  border: 1px solid var(--border-color) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.q-card:hover) {
  border-color: rgba(var(--accent-sky-rgb, 56, 189, 248), 0.45) !important;
  box-shadow: 0 8px 24px rgba(var(--accent-sky-rgb, 56, 189, 248), 0.12);
}

:deep(.q-banner) {
  border: 1px solid rgba(var(--accent-sky-rgb, 56, 189, 248), 0.3) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 20px rgba(var(--accent-sky-rgb, 56, 189, 248), 0.15);
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
