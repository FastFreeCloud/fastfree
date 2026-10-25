<template>
  <div class="installer-app">
    <!-- Custom Draggable Titlebar -->
    <header data-tauri-drag-region class="titlebar">
      <div class="brand">
        <span class="logo-dot"></span>
        <span class="title">FastFree Sovereign Node Setup</span>
      </div>
      <div class="window-controls">
        <button class="win-btn" @click="minimizeWindow">−</button>
        <button class="win-btn close" @click="closeWindow">✕</button>
      </div>
    </header>

    <!-- Main Stepper Body -->
    <main class="content">
      <!-- Step 1: Host Discovery -->
      <section v-if="currentStep === 1" class="step-pane">
        <div class="header-box">
          <h2>Host Discovery & Diagnostics</h2>
          <p class="subtitle">Inspecting host machine architecture and hypervisor capabilities.</p>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>Probing system telemetry...</span>
        </div>

        <div v-else-if="report" class="cards-grid">
          <!-- Identity Card -->
          <div class="card">
            <div class="card-label">Machine & User Identity</div>
            <div class="card-val primary">{{ report.host_name }}</div>
            <div class="card-sub">User: {{ report.user_name }} (Administrator)</div>
          </div>

          <!-- CPU Card -->
          <div class="card">
            <div class="card-label">Processor Topology</div>
            <div class="card-val">{{ report.cpu_count }} Cores</div>
            <div class="card-sub">{{ report.cpu_brand }}</div>
          </div>

          <!-- RAM Card -->
          <div class="card">
            <div class="card-label">Physical Memory</div>
            <div class="card-val">{{ Math.round(report.total_memory_mb / 1024) }} GB Installed</div>
            <div class="card-sub">{{ Math.round(report.available_memory_mb / 1024) }} GB Available Headroom</div>
          </div>

          <!-- Hyper-V Status Card -->
          <div class="card" :class="{ 'status-ok': report.hyperv.ready_for_hyperv }">
            <div class="card-label">Hyper-V Engine</div>
            <div class="card-val status-text">
              {{ report.hyperv.ready_for_hyperv ? 'Ready' : 'Setup Required' }}
            </div>
            <div class="card-sub">{{ report.hyperv.status_reason }}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" :disabled="loading" @click="currentStep = 2">
            Configure Node →
          </button>
        </div>
      </section>

      <!-- Step 2: Node Specifications -->
      <section v-else-if="currentStep === 2" class="step-pane">
        <div class="header-box">
          <h2>Node Specifications & Sizing</h2>
          <p class="subtitle">Select your client node and review recommended resources.</p>
        </div>

        <div class="form-container">
          <!-- Client Selector -->
          <div class="form-group">
            <label>Target Node Identity:</label>
            <select v-model="selectedClient" class="input-select">
              <option v-for="n in 10" :key="n" :value="`client${n + 1}`">
                client{{ n + 1 }} (Hyper-V Sovereign Appliance)
              </option>
            </select>
          </div>

          <!-- Cores -->
          <div class="form-group">
            <label>Assigned CPU Cores: <strong>{{ assignedCores }} Cores</strong></label>
            <input type="range" v-model.number="assignedCores" min="2" :max="report?.cpu_count || 8" class="slider" />
          </div>

          <!-- RAM -->
          <div class="form-group">
            <label>Assigned RAM: <strong>{{ Math.round(assignedRamMb / 1024) }} GB</strong></label>
            <input type="range" v-model.number="assignedRamMb" min="2048" :max="report?.recommendation.max_ram_mb || 16384" step="1024" class="slider" />
          </div>

          <!-- Destination Drive -->
          <div class="form-group">
            <label>Target Drive: <strong>{{ report?.recommendation.target_disk_drive }}</strong> (Selected automatically for maximum space)</label>
          </div>
        </div>

        <div class="actions space-between">
          <button class="btn btn-secondary" @click="currentStep = 1">← Back</button>
          <button class="btn btn-primary" @click="startInstall">Deploy Sovereign Node 🚀</button>
        </div>
      </section>

      <!-- Step 3: Provisioning -->
      <section v-else-if="currentStep === 3" class="step-pane centered">
        <div class="spinner large"></div>
        <h2>Provisioning {{ selectedClient }}...</h2>
        <p class="subtitle">Extracting VHDX disk image and registering Hyper-V virtual machine.</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <span class="progress-txt">{{ progress }}% Completed</span>
      </section>

      <!-- Step 4: Finish -->
      <section v-else-if="currentStep === 4" class="step-pane centered">
        <div class="success-icon">✓</div>
        <h2>{{ selectedClient }} Deployed Successfully!</h2>
        <p class="subtitle">Your FastFree ERP node is running and connected via WireGuard.</p>
        <div class="actions">
          <button class="btn btn-primary btn-large" @click="launchPortal">
            Open FastFree ERP Portal 🌐
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { fetchSystemDiscovery, dismissSplash, type SystemDiscoveryReport } from './composables/useDiscovery.ts';

const appWindow = getCurrentWindow();
const currentStep = ref(1);
const loading = ref(true);
const report = ref<SystemDiscoveryReport | null>(null);

const selectedClient = ref('client2');
const assignedCores = ref(4);
const assignedRamMb = ref(4096);
const progress = ref(0);

onMounted(async () => {
  try {
    report.value = await fetchSystemDiscovery();
    if (report.value?.recommendation) {
      assignedCores.value = report.value.recommendation.recommended_cores;
      assignedRamMb.value = report.value.recommendation.recommended_ram_mb;
    }
  } catch (err) {
    console.error('Discovery failed:', err);
  } finally {
    loading.value = false;
    await dismissSplash();
  }
});

function minimizeWindow() {
  appWindow.minimize();
}

function closeWindow() {
  appWindow.close();
}

function startInstall() {
  currentStep.value = 3;
  progress.value = 0;
  const interval = setInterval(() => {
    progress.value += 10;
    if (progress.value >= 100) {
      clearInterval(interval);
      currentStep.value = 4;
    }
  }, 400);
}

async function launchPortal() {
  await openUrl(`http://${selectedClient.value}.fastfree.local`);
}
</script>

<style scoped>
.installer-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #121212;
  color: #F3F4F6;
  border: 1px solid #2D2D2D;
  border-radius: 8px;
  overflow: hidden;
}

.titlebar {
  height: 42px;
  background: #18181B;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #2D2D2D;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1976D2;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: #E4E4E7;
}

.win-btn {
  background: transparent;
  border: none;
  color: #A1A1AA;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 14px;
}

.win-btn:hover {
  background: #27272A;
  color: #FFF;
}

.win-btn.close:hover {
  background: #E11D48;
}

.content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.step-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.step-pane.centered {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.header-box h2 {
  font-size: 22px;
  font-weight: 600;
}

.subtitle {
  color: #9CA3AF;
  font-size: 14px;
  margin-top: 4px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 24px;
}

.card {
  background: #1E1E1E;
  border: 1px solid #2D2D2D;
  border-radius: 8px;
  padding: 16px;
}

.card-label {
  font-size: 12px;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-val {
  font-size: 18px;
  font-weight: 600;
  margin: 6px 0;
}

.card-val.primary {
  color: #1976D2;
}

.card-sub {
  font-size: 12px;
  color: #71717A;
}

.card.status-ok .status-text {
  color: #22C55E;
}

.actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
}

.actions.space-between {
  justify-content: space-between;
}

.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #1976D2;
  color: #FFF;
}

.btn-primary:hover {
  background: #1565C0;
}

.btn-secondary {
  background: #27272A;
  color: #E4E4E7;
}

.btn-large {
  padding: 14px 32px;
  font-size: 16px;
}

.form-container {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  margin-bottom: 8px;
  color: #D4D4D8;
}

.input-select {
  width: 100%;
  padding: 10px;
  background: #1E1E1E;
  border: 1px solid #2D2D2D;
  border-radius: 6px;
  color: #FFF;
}

.slider {
  width: 100%;
  accent-color: #1976D2;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #1976D2;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.spinner.large {
  width: 48px;
  height: 48px;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar {
  width: 320px;
  height: 8px;
  background: #27272A;
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0 8px 0;
}

.progress-fill {
  height: 100%;
  background: #1976D2;
  transition: width 0.3s ease;
}

.progress-txt {
  font-size: 12px;
  color: #A1A1AA;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
</style>
