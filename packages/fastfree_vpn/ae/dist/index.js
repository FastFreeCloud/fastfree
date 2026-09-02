/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */
module.exports = function (api) {
  api.compatibleWith('quasar', '^2.0.0')
  api.compatibleWith('@quasar/app-vite', '^3.0.0')

  api.extendQuasarConf(conf => {
    const boot = (conf.boot ?? [])
    boot.unshift(
      '~quasar-app-extension-fastfree_vpn/src/runtime/boot.register.ts'
    )
    conf.boot = boot
  })
}
