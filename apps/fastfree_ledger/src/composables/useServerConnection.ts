import { ref } from 'vue'
import { useAppStore } from '../stores/useAppStore'

export function useServerConnection() {
  const appStore = useAppStore()
  const testing = ref(false)
  const error = ref<string | null>(null)

  async function testConnection(url: string): Promise<boolean> {
    testing.value = true
    error.value = null
    try {
      const response = await fetch(`${url}/api/method/ping`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (response.ok) {
        appStore.setServerUrl(url)
        appStore.setConnected(true)
        return true
      }
      error.value = 'Connection failed'
      return false
    } catch {
      error.value = 'Unable to connect to server'
      return false
    } finally {
      testing.value = false
    }
  }

  function disconnect() {
    appStore.clearServerUrl()
    appStore.setConnected(false)
  }

  return {
    testing,
    error,
    testConnection,
    disconnect,
    serverUrl: appStore.serverUrl,
    isConnected: appStore.isConnected,
  }
}
