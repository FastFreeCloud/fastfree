<template>
  <Transition name="lc-splash-fade">
    <div v-if="visible" class="lc-splash-screen" @click.self="onBackdropClick">
      <div class="lc-splash-content">
        <div class="lc-splash-logo" :class="{ 'lc-splash-logo--animate': animate }">
          <q-icon
            v-if="icon"
            :name="icon"
            size="64px"
            color="primary"
          />
          <div v-else class="lc-splash-icon-text">FF</div>
        </div>

        <div class="lc-splash-title">{{ title }}</div>

        <q-linear-progress
          v-if="loading"
          indeterminate
          color="primary"
          size="4px"
          class="lc-splash-progress"
        />

        <div v-if="message" class="lc-splash-message text-caption text-grey-6">
          {{ message }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { getSplashCoordinator } from '../composables/useSplashCoordinator'

interface Props {
  visible?: boolean
  title?: string
  message?: string
  icon?: string
  loading?: boolean
  animate?: boolean
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: 'FastFree',
  message: '',
  icon: '',
  loading: true,
  animate: true,
  dismissible: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  dismiss: []
}>()

watch(() => props.visible, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    getSplashCoordinator().hide()
  }
})

onMounted(() => {
  if (props.visible) {
    getSplashCoordinator().show()
  }
})

function onBackdropClick() {
  if (props.dismissible) {
    emit('update:visible', false)
    emit('dismiss')
  }
}
</script>

<style lang="scss" scoped>
.lc-splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.lc-splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: white;
}

.lc-splash-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
}

.lc-splash-logo--animate {
  animation: lc-pulse 2s ease-in-out infinite;
}

.lc-splash-icon-text {
  font-size: 32px;
  font-weight: 900;
  color: white;
  letter-spacing: -2px;
}

.lc-splash-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.lc-splash-progress {
  width: 200px;
  border-radius: 2px;
}

.lc-splash-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

@keyframes lc-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

.lc-splash-fade-enter-active,
.lc-splash-fade-leave-active {
  transition: opacity 0.3s ease;
}

.lc-splash-fade-enter-from,
.lc-splash-fade-leave-to {
  opacity: 0;
}
</style>
