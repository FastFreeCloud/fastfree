/**
 * Quasar App Extension uninstall script
 * https://quasar.dev/app-extensions/development-guide/uninstall-api
 */
interface ExtensionApi {
    removeBootFile: (file: string) => void;
    onExitLog: (msg: string) => void;
}
export default function (api: ExtensionApi): void;
export {};
