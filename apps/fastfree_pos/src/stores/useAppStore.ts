import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('fastfree-pos', () => {
  const serverUrl = ref(localStorage.getItem('fastfree_base_url') || '')
  const isConnected = ref(false)
  const appVersion = ref('0.0.1')

  const hasServerUrl = computed(() => !!serverUrl.value)

  function setServerUrl(url: string) {
    serverUrl.value = url
    localStorage.setItem('fastfree_base_url', url)
  }

  function clearServerUrl() {
    serverUrl.value = ''
    localStorage.removeItem('fastfree_base_url')
  }

  function setConnected(val: boolean) {
    isConnected.value = val
  }

  return {
    serverUrl,
    isConnected,
    appVersion,
    hasServerUrl,
    setServerUrl,
    clearServerUrl,
    setConnected,
  }
})
