type CompatFn = (pkg: string, range: string) => void
type ExtendQuasarConfFn = (fn: (conf: QuasarConf) => void) => void

interface QuasarConf {
  boot?: string[]
  css?: string[]
  extras?: string[]
  framework?: {
    plugins?: string[]
  }
  [key: string]: unknown
}

interface ExtensionApi {
  compatibleWith: CompatFn
  extendQuasarConf: ExtendQuasarConfFn
}

export default function (api: ExtensionApi) {
  api.compatibleWith('quasar', '^2.0.0')
  api.compatibleWith('@quasar/app-vite', '^3.0.0')

  api.extendQuasarConf((conf: QuasarConf) => {
    conf.boot ??= []
    conf.boot.push(
      '~quasar-app-extension-fastfree-lowcode/src/runtime/boot.register.ts'
    )

    conf.css ??= []
    conf.css.push(
      '~quasar-app-extension-fastfree-lowcode/src/runtime/styles/lowcode.scss'
    )

    if (!conf.extras) conf.extras = []
    if (!conf.extras.includes('material-icons')) {
      conf.extras.push('material-icons')
    }
    if (!conf.extras.includes('mdi-v7')) {
      conf.extras.push('mdi-v7')
    }

    conf.framework ??= {}
    conf.framework.plugins ??= []
    if (!conf.framework.plugins.includes('Notify')) {
      conf.framework.plugins.push('Notify')
    }
    if (!conf.framework.plugins.includes('Dialog')) {
      conf.framework.plugins.push('Dialog')
    }
    if (!conf.framework.plugins.includes('Loading')) {
      conf.framework.plugins.push('Loading')
    }
  })
}
