/**
 * Domain Service: AppRegistryService
 * Coordinates sovereign applications and portal access.
 */
import { openUrl } from '@tauri-apps/plugin-opener';
import { SovereignApp, type AppCategory } from '../models/SovereignApp';

export class AppRegistryService {
  private static _instance: AppRegistryService;
  private _apps: SovereignApp[];

  private constructor() {
    this._apps = SovereignApp.createDefaultFleet();
  }

  public static getInstance(): AppRegistryService {
    if (!AppRegistryService._instance) {
      AppRegistryService._instance = new AppRegistryService();
    }
    return AppRegistryService._instance;
  }

  public getAllApps(): SovereignApp[] {
    return [...this._apps];
  }

  public getAppsByCategory(category: AppCategory): SovereignApp[] {
    return this._apps.filter(app => app.category === category);
  }

  public getAppById(id: string): SovereignApp | undefined {
    return this._apps.find(app => app.id === id);
  }

  public async launchApp(app: SovereignApp, host: string = 'localhost'): Promise<void> {
    const url = app.getUrl(host);
    try {
      // Tauri native opener routes the link to the OS default browser —
      // never hijack/navigate the installer webview itself.
      await openUrl(url);
    } catch {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        // Deliberately no-op: window.location.href fallback would navigate the
        // installer shell away from the app.
      }
    }
  }
}
