/**
 * Quasar App Extension install script
 * https://quasar.dev/app-extensions/development-guide/install-api
 */
interface ExtensionApi {
    hasPackage: (pkg: string) => boolean;
    getPackageVersion: (pkg: string) => string;
    extendPackageJson: (pkg: Record<string, unknown>) => void;
    render: (template: string, data: Record<string, unknown>) => string;
    onExitLog: (msg: string) => void;
}
export default function (api: ExtensionApi): void;
export {};
