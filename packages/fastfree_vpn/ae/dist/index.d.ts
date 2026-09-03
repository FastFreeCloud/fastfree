/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */
interface ExtensionApi {
    compatibleWith: (pkg: string, range: string) => void;
    extendQuasarConf: (fn: (conf: Record<string, unknown>) => void) => void;
}
export default function (api: ExtensionApi): void;
export {};
