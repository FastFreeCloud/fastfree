import { defineInstallScript } from '#q-app'

export default defineInstallScript(async (api) => {
  api.onExitLog('✅ fastfree-lowcode installed! Components are auto-registered via boot file.')
})
