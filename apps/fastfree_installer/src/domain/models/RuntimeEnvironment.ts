/**
 * Pure runtime-environment classification for the installer UI.
 *
 * The installer UI normally runs inside a Tauri webview window where the
 * runtime injects the IPC bridge (`__TAURI_INTERNALS__`). The exact same
 * dev-server page also renders in plain browsers (browser preview / vite
 * dev tab), where no bridge exists and every `invoke` has to fail.
 * Classifying the runtime keeps the failure UX honest instead of
 * masquerading as a hardware-discovery error.
 */

export type RuntimeKind = 'tauri' | 'browser-preview';

export type BridgePresenceReader = () => boolean;

export class RuntimeEnvironment {
  /** Global injected by the Tauri runtime into its own webview windows. */
  static readonly TAURI_BRIDGE_GLOBAL = '__TAURI_INTERNALS__';

  /**
   * Classifies the runtime from an injected bridge-presence reader,
   * keeping the model free of any direct window/global access.
   */
  static classify(bridgePresent: BridgePresenceReader): RuntimeKind {
    return bridgePresent() ? 'tauri' : 'browser-preview';
  }

  /**
   * Recognises the failure signature of an `invoke` performed without the
   * Tauri IPC bridge (`@tauri-apps/api` dereferences the missing global).
   */
  static isBridgeMissingError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err ?? '');
    return (
      message.includes(RuntimeEnvironment.TAURI_BRIDGE_GLOBAL) ||
      message.includes("reading 'invoke'")
    );
  }
}
