<template>
  <!-- Dimmed backdrop — compact master-password gate that opens the merged hub -->
  <div class="settings-backdrop" :class="{ 'is-rtl': isRtl }" @click.self="emit('close')">
    <div
      class="settings-card gate-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div class="gate-body">
        <div class="gate-shield">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3 class="gate-title" id="settings-title">{{ t('settings.gateTitle') }}</h3>
        <p class="gate-desc">{{ t('settings.gateDesc') }}</p>

        <div class="gate-input-wrap">
          <input
            ref="pwdRef"
            v-model="pwd"
            :type="showPwd ? 'text' : 'password'"
            class="gate-input"
            :placeholder="t('settings.gatePlaceholder')"
            autocomplete="off"
            @keyup.enter="verify"
          />
          <button class="eye-btn" type="button" @click="showPwd = !showPwd" tabindex="-1">
            <svg aria-hidden="true" v-if="showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
            <svg aria-hidden="true" v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>

        <div v-if="gateError" class="gate-error">
          <span>{{ gateError }}</span>
        </div>

        <div class="gate-actions">
          <button class="gate-btn primary" :disabled="busy || !pwd.trim()" @click="verify">
            <span v-if="busy" class="spinner-tiny"></span>
            <span>{{ t('settings.gateOk') }}</span>
          </button>
          <button class="gate-btn ghost" @click="emit('close')">{{ t('settings.gateCancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../composables/useI18n';

/**
 * Production-only master-password gate. On success the merged diagnostic &
 * self-healing hub opens directly — no intermediate settings screen.
 */
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'unlocked'): void;
}>();

const { t, isRtl } = useI18n();

const pwd = ref('');
const showPwd = ref(false);
const busy = ref(false);
const gateError = ref('');
const pwdRef = ref<HTMLInputElement | null>(null);

async function verify() {
  if (busy.value || !pwd.value.trim()) return;
  busy.value = true;
  gateError.value = '';
  try {
    const ok = await invoke<boolean>('verify_admin_password', { password: pwd.value.trim() });
    if (ok) {
      pwd.value = '';
      emit('unlocked');
    } else {
      gateError.value = t('settings.gateWrong');
      pwd.value = '';
    }
  } catch (e) {
    gateError.value = String(e);
  } finally {
    busy.value = false;
  }
}

const focusPwd = () => nextTick(() => pwdRef.value?.focus());

const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close'); };
onMounted(() => {
  window.addEventListener('keydown', onEsc);
  focusPwd();
});
onUnmounted(() => {
  window.removeEventListener('keydown', onEsc);
});
</script>

<style scoped>
/* ── Dimmed backdrop + centered gating dialog ── */
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-scrim);
  backdrop-filter: blur(6px);
  animation: fade-in 0.18s ease-out;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

.settings-card {
  position: relative;
  width: min(420px, 92vw);
  overflow: auto;
  border-radius: 18px;
  border: var(--card-glass-border);
  background: var(--card-glass-bg);
  box-shadow: var(--shadow-modal);
  padding: 22px 24px;
  animation: card-in 0.26s cubic-bezier(0.2, 0.9, 0.3, 1.12);
}
@keyframes card-in {
  from { transform: translateY(14px) scale(0.97); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.gate-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 4px 6px;
}
.gate-shield {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--accent-sky);
  background: var(--accent-sky-soft);
  border: 1px solid var(--accent-sky-border);
  margin-bottom: 13px;
}
.gate-shield svg { width: 25px; height: 25px; }
.gate-title {
  font-size: 16.5px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 6px;
}
.gate-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0 0 16px;
  max-width: 340px;
}
.gate-input-wrap {
  position: relative;
  width: 100%;
  max-width: 360px;
}
.gate-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 42px 12px 13px;
  border-radius: 12px;
  border: var(--card-glass-border);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.settings-card.is-rtl .gate-input {
  padding: 12px 13px 12px 42px;
}
.gate-input:focus {
  border-color: var(--accent-sky-border-strong);
  box-shadow: 0 0 0 3px var(--accent-sky-mid);
}
.eye-btn {
  position: absolute;
  inset-inline-end: 7px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 5px;
  display: grid;
  place-items: center;
  border-radius: 7px;
}
.eye-btn:hover { color: var(--text-main); background: var(--white-06); }
.eye-btn svg { width: 15px; height: 15px; }

.gate-error {
  margin-top: 12px;
  font-size: 12px;
  color: var(--accent-red-bright);
  background: var(--accent-red-soft);
  border: var(--card-glass-border);
  border-color: var(--accent-red-border);
  border-radius: 9px;
  padding: 7px 12px;
  width: 100%;
  max-width: 360px;
  box-sizing: border-box;
}
.gate-actions {
  display: flex;
  gap: 9px;
  margin-top: 16px;
  width: 100%;
  max-width: 360px;
}
.gate-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s, transform 0.1s;
}
.gate-btn:active { transform: scale(0.98); }
.gate-btn.primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
  color: #fff;
}
.gate-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.gate-btn.primary:not(:disabled):hover { filter: brightness(1.12); }
.gate-btn.ghost {
  background: var(--white-08);
  color: var(--text-secondary);
  border: var(--card-glass-border);
}
.gate-btn.ghost:hover { background: var(--accent-sky-faint); }
.spinner-tiny {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: gate-spin 0.7s linear infinite;
}
@keyframes gate-spin { to { transform: rotate(360deg); } }
</style>
