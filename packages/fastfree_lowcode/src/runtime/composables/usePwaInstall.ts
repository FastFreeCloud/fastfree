import { ref, computed } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const deferredPrompt = ref(false)
  const isInstalled = ref(false)
  const isProcessing = ref(false)
  let deferredPromptEvent: BeforeInstallPromptEvent | null = null

  const canInstall = computed(() => {
    return deferredPrompt.value && !isInstalled.value && !isProcessing.value
  })

  const isStandaloneMode = computed(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as unknown as { standalone?: boolean }).standalone === true
  })

  function handleBeforeInstall(e: Event) {
    e.preventDefault()
    deferredPromptEvent = e as BeforeInstallPromptEvent
    deferredPrompt.value = true
  }

  function handleAppInstalled() {
    isInstalled.value = true
    deferredPrompt.value = false
    deferredPromptEvent = null
  }

  async function install(): Promise<boolean> {
    if (!deferredPromptEvent) return false
    isProcessing.value = true
    try {
      await deferredPromptEvent.prompt()
      const { outcome } = await deferredPromptEvent.userChoice
      if (outcome === 'accepted') {
        isInstalled.value = true
        handleAppInstalled()
      }
      deferredPromptEvent = null
      deferredPrompt.value = false
      return outcome === 'accepted'
    } catch {
      deferredPromptEvent = null
      deferredPrompt.value = false
      return false
    } finally {
      isProcessing.value = false
    }
  }

  function reset() {
    deferredPrompt.value = false
    deferredPromptEvent = null
  }

  const installationSteps = computed(() => [
    { key: 'step1', text: 'Preparing installation...', icon: 'mdi-progress-clock' },
    { key: 'step2', text: 'Installing application...', icon: 'mdi-progress-check' },
    { key: 'step3', text: 'Finalizing...', icon: 'mdi-check-all' },
  ])

  return {
    canInstall,
    isInstalled,
    isProcessing,
    isStandaloneMode,
    deferredPrompt,
    handleBeforeInstall,
    handleAppInstalled,
    install,
    reset,
    installationSteps,
  }
}