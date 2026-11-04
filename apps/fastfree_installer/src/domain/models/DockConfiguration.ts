/**
 * Domain Model: DockConfiguration
 * Manages the floating 4-way movable dock and its state.
 */

export type DockPosition = 'bottom' | 'top' | 'left' | 'right';

export class DockConfiguration {
  private static readonly STORAGE_KEY = 'fastfree_installer_dock_pos';
  private _position: DockPosition;
  private _isExpanded: boolean;

  constructor(defaultPosition: DockPosition = 'bottom') {
    const saved = localStorage.getItem(DockConfiguration.STORAGE_KEY) as DockPosition | null;
    this._position = (saved && ['bottom', 'top', 'left', 'right'].includes(saved)) ? saved : defaultPosition;
    this._isExpanded = true;
  }

  get position(): DockPosition {
    return this._position;
  }

  get isExpanded(): boolean {
    return this._isExpanded;
  }

  get isVertical(): boolean {
    return this._position === 'left' || this._position === 'right';
  }

  public setPosition(newPos: DockPosition): void {
    this._position = newPos;
    try {
      localStorage.setItem(DockConfiguration.STORAGE_KEY, newPos);
    } catch {
      // Local storage disabled or sandboxed
    }
  }

  public toggleExpanded(): void {
    this._isExpanded = !this._isExpanded;
  }

  public setExpanded(expanded: boolean): void {
    this._isExpanded = expanded;
  }
}
