/**
 * Studio Visual Inspector — dev-time overlay for the live SPA.
 *
 * Real DOM inspection, no mocks:
 *  - highlights the element under the pointer with an outline overlay;
 *  - on click, reads the element's real computed styles and walks up the
 *    ancestor chain until a `[data-source-path]` node is found (registered
 *    screens are tagged at their root in boot/clan-screens.ts);
 *  - reports the inferred component source file so the Studio can target it.
 *
 * Nothing from this module ships to production builds.
 */

export interface StudioInspection {
  tagName: string;
  id: string;
  classes: string;
  sourcePath: string | null;
  computed: {
    display: string;
    color: string;
    background: string;
    fontSize: string;
    padding: string;
    borderRadius: string;
  };
}

type SelectCallback = (inspection: StudioInspection) => void;

let lastInspection: StudioInspection | null = null;
let selectCallback: SelectCallback | null = null;
let enabled = false;

const OVERLAY_ID = 'studio-inspect-overlay';
const OVERLAY_Z = 2147483000;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function findSourcePath(element: Element): string | null {
  let node: Element | null = element;
  while (node) {
    const path = node.getAttribute('data-source-path');
    if (path) return path;
    node = node.parentElement;
  }
  return null;
}

function buildInspection(element: Element): StudioInspection {
  const cs = window.getComputedStyle(element);
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || '',
    classes: element.getAttribute('class') || '',
    sourcePath: findSourcePath(element),
    computed: {
      display: cs.display,
      color: cs.color,
      background: cs.backgroundColor,
      fontSize: cs.fontSize,
      padding: cs.padding,
      borderRadius: cs.borderRadius,
    },
  };
}

function ensureOverlay(): HTMLDivElement {
  let highlight = document.getElementById(OVERLAY_ID + '-hl') as HTMLDivElement | null;
  if (!highlight) {
    highlight = document.createElement('div');
    highlight.id = OVERLAY_ID + '-hl';
    highlight.style.cssText = `position:fixed;z-index:${OVERLAY_Z};pointer-events:none;border:2px solid #00E5FF;background:rgba(0,229,255,0.10);display:none;`;
    document.body.appendChild(highlight);
  }
  return highlight;
}

function ensurePanel(): HTMLDivElement {
  let panel = document.getElementById(OVERLAY_ID + '-panel') as HTMLDivElement | null;
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = OVERLAY_ID + '-panel';
  panel.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)',
    `z-index:${OVERLAY_Z + 1}`,
    'max-width:560px', 'width:min(92vw,560px)',
    'background:#0B0F14', 'border:1px solid rgba(0,229,255,0.35)', 'border-radius:12px',
    'box-shadow:0 12px 40px rgba(0,0,0,0.6)', 'padding:12px 14px',
    'font-family:Consolas,Menlo,monospace', 'font-size:11px', 'color:#CFE8F0',
  ].join(';');
  panel.style.display = 'none';
  document.body.appendChild(panel);
  return panel;
}

function renderInspection(inspection: StudioInspection): void {
  const panel = ensurePanel();
  panel.style.display = 'block';
  panel.innerHTML = [
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">',
    '<span style="color:#00E5FF;font-weight:700">Visual Inspector · المفتش البصري</span>',
    '<button data-inspect-close="1" style="background:#1C2833;color:#CFE8F0;border:0;border-radius:6px;padding:2px 10px;cursor:pointer">إغلاق</button>',
    '</div>',
    `<div><span style="color:#7DD3FC">&lt;${escapeHtml(inspection.tagName)}${inspection.id ? ` id="${escapeHtml(inspection.id)}"` : ''}&gt;</span></div>`,
    `<div style="color:#8F98A0;word-break:break-all;margin:2px 0">class: ${escapeHtml(inspection.classes || '—')}</div>`,
    `<div style="color:#8F98A0;word-break:break-all">source: <b style="color:#CFE8F0">${escapeHtml(inspection.sourcePath ?? '(unmapped component)')}</b></div>`,
    '<div style="margin-top:6px;color:#B5DFFF">style: </div>',
    `<div style="direction:ltr;text-align:left">display:${escapeHtml(inspection.computed.display)}<br>`,
    `color:${escapeHtml(inspection.computed.color)}<br>`,
    `background:${escapeHtml(inspection.computed.background)}<br>`,
    `font-size:${escapeHtml(inspection.computed.fontSize)} padding:${escapeHtml(inspection.computed.padding)} radius:${escapeHtml(inspection.computed.borderRadius)}</div>`,
  ].join('');
  panel.querySelector('[data-inspect-close]')?.addEventListener('click', () => disableInspector());
}

function onMouseMove(event: MouseEvent): void {
  if (!enabled) return;
  const target = event.target as Element | null;
  if (!target || target.id.startsWith(OVERLAY_ID)) return;
  const rect = target.getBoundingClientRect();
  const highlight = ensureOverlay();
  highlight.style.display = 'block';
  highlight.style.left = `${rect.left}px`;
  highlight.style.top = `${rect.top}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
}

function onClickCapture(event: MouseEvent): void {
  if (!enabled) return;
  const target = event.target as Element | null;
  if (!target || target.id.startsWith(OVERLAY_ID)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const inspection = buildInspection(target);
  lastInspection = inspection;
  renderInspection(inspection);
  selectCallback?.(inspection);
}

export function enableInspector(onSelect?: SelectCallback): void {
  if (enabled) {
    if (onSelect) selectCallback = onSelect;
    return;
  }
  enabled = true;
  if (onSelect) selectCallback = onSelect;
  ensureOverlay();
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClickCapture, true);
  document.body.style.cursor = 'crosshair';
}

export function disableInspector(): void {
  if (!enabled) return;
  enabled = false;
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('click', onClickCapture, true);
  document.body.style.cursor = '';
  const highlight = document.getElementById(OVERLAY_ID + '-hl');
  if (highlight) highlight.style.display = 'none';
  const panel = document.getElementById(OVERLAY_ID + '-panel');
  if (panel) panel.style.display = 'none';
}

export function getLastInspection(): StudioInspection | null {
  return lastInspection;
}

export function isInspectorEnabled(): boolean {
  return enabled;
}
