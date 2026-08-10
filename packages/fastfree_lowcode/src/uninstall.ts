import { defineUninstallScript } from '#q-app'

export default defineUninstallScript((api) => {
  api.onExitLog('fastfree-lowcode uninstalled.')
})
