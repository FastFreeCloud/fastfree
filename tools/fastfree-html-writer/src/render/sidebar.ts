/**
 * Sidebar rendering for the FastFree HTML writer.
 *
 * The sidebar is a numbered `<ol>` of every page, for documents long enough
 * that the top nav bar alone does not show where the reader is. Ordering is
 * deliberately NOT decided here: the caller hands over items already ordered
 * (conventionally home first, then newest first, which is what
 * `discoverPagesByRecency` gives) and this module renders that order verbatim.
 * Sorting inside the renderer would make the layout impossible to steer.
 */

import { escapeAttr, escapeHtml } from "../util/escape.js";
import { pageNameFromHref, shortLabel, uniqueLabels, type NavItem } from "./nav.js";

export const MARKER_OPEN = "<!-- ff-side -->";
const MARKER_CLOSE = "<!-- /ff-side -->";

const SIDE_ID = "ff-side";
const SIDE_BTN_ID = "ff-sidebtn";
const STORAGE_KEY = "ff-side-collapsed";
const HIDDEN_CLASS = "hid";

/** The landing page is the one entry that carries no step number. */
function isHome(href: string): boolean {
  const page = pageNameFromHref(href);
  return page === "index.html" || page === "home.html";
}

/**
 * Label per item, de-duplicated by uniqueLabels() and shortened by
 * shortLabel(). Order matters: uniqueLabels() widens a clashing label with an
 * em-dash separator ("الفورمات — إيه هو"), which shortLabel() would then split
 * straight back off, so the widened form has to be taken as-is.
 */
function displayLabels(items: NavItem[]): string[] {
  const originals = items.map((it) => it.label);
  return uniqueLabels(items).map((it, i) =>
    it.label === originals[i] ? shortLabel(it.label) : it.label,
  );
}

/**
 * Full sidebar markup. Returns "" when there is nothing to list, so callers
 * can inject unconditionally.
 */
export function renderSidebar(items: NavItem[], currentHref: string): string {
  if (items.length === 0) return "";

  const current = pageNameFromHref(currentHref);
  const labels = displayLabels(items);

  // Numbers are assigned oldest-first so they read 1, 2, 3 as pages are
  // authored, and then the list is reversed for display: the newest page keeps
  // the highest number but sits at the top. A page's number never changes once
  // it has one.
  const numbered = items.filter((it) => !isHome(it.href));
  const oldestFirst = [...numbered].sort(
    (a, b) => (a.created ?? 0) - (b.created ?? 0) || a.href.localeCompare(b.href),
  );
  const numberOf = new Map(oldestFirst.map((it, i) => [it.href, i + 1]));

  const rows = items.map((it, i) => {
    const active = pageNameFromHref(it.href) === current;
    const home = isHome(it.href);
    const n = numberOf.get(it.href);
    const num = home || n === undefined ? "" : String(n);
    const label = labels[i] ?? shortLabel(it.label);
    const tip = it.fullTitle ?? it.label;
    const tipAttr = label === tip ? "" : ` title="${escapeAttr(tip)}"`;
    const numSpan = num ? `<span class="n">${escapeHtml(num)}</span>` : `<span class="n"></span>`;
    return (
      `<li class="si"><a class="sl${active ? " on" : ""}" href="${escapeAttr(it.href)}"${tipAttr}` +
      `${active ? ' aria-current="page"' : ""}>${numSpan}<span class="t">${escapeHtml(label)}</span></a></li>`
    );
  });

  return (
    `<aside class="side" id="${SIDE_ID}">\n` +
    `<div class="side-h">` +
    `<button type="button" class="side-btn" id="${SIDE_BTN_ID}" aria-controls="${SIDE_ID}" aria-expanded="true">☰</button>` +
    `<span class="side-t">الصفحات</span>` +
    // Count real pages only. `rows` also contains the home entry, so counting
    // rows reports one more than the number of numbered links below it.
    `<span class="side-c">${escapeHtml(String(numbered.length))}</span>` +
    `</div>\n<ol class="side-l">\n${rows.join("\n")}\n</ol>\n</aside>`
  );
}

/**
 * Put the sidebar into a page. Re-running replaces the marked region instead
 * of stacking a second one, so a page can be re-rendered as it grows without
 * a manual strip step.
 */
export function injectSidebar(html: string, items: NavItem[], currentHref: string): string {
  const side = renderSidebar(items, currentHref);
  if (!side) return html;

  const block = `${MARKER_OPEN}\n${side}\n${MARKER_CLOSE}`;

  const start = html.indexOf(MARKER_OPEN);
  if (start !== -1) {
    const end = html.indexOf(MARKER_CLOSE, start);
    // Unterminated marker (hand-edited page): drop the stale tail rather than
    // append a second sidebar after it.
    if (end === -1) return html.slice(0, start) + block;
    return html.slice(0, start) + block + html.slice(end + MARKER_CLOSE.length);
  }

  const bodyRe = /<body[^>]*>/i;
  const body = bodyRe.exec(html);
  if (body) {
    const at = body.index + body[0].length;
    return html.slice(0, at) + `\n${block}\n` + html.slice(at);
  }

  if (html.includes('class="wrap"')) {
    return html.replace(/<div class="wrap">/, `<div class="wrap">\n${block}`);
  }

  return `${block}\n${html}`;
}

export function hasSidebar(html: string): boolean {
  return html.includes(MARKER_OPEN);
}

// Sidebar order must come from when a page was authored, not from the file's
// mtime: refreshing a page rewrites it, which bumps its mtime and would then
// reshuffle the list on the next pass. A creation stamp embedded at render
// time survives rewrites, so the order is stable across refreshes.
export const CREATED_MARK = "ff:created";
const CREATED_RE = /<meta\s+name=["']ff:created["']\s+content=["'](\d+)["']\s*\/?>/i;

export function readCreated(html: string): number | null {
  const m = CREATED_RE.exec(html);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function stampCreated(html: string, epochMs: number): string {
  if (CREATED_RE.test(html)) return html;
  const meta = `<meta name="ff:created" content="${Math.trunc(epochMs)}" />\n`;
  if (/<meta\s+charset/i.test(html)) {
    return html.replace(/(<meta\s+charset[^>]*>)/i, `$1\n${meta.trim()}`);
  }
  return html.replace(/<head>/i, `<head>\n${meta}`);
}

/**
 * Toggle script for the sidebar. Plain ES5 in a string: no modules, no build
 * step, inlined by the caller. Silent by design — the MCP server forbids
 * console output and a docs page has no operator to read it.
 */
export const SIDEBAR_SCRIPT = `(function(){
function boot(){
var side=document.getElementById('${SIDE_ID}');
if(!side){return;}
var btn=document.getElementById('${SIDE_BTN_ID}');
var KEY='${STORAGE_KEY}';
var HID='${HIDDEN_CLASS}';
function read(){try{return window.localStorage.getItem(KEY)==='1';}catch(e){return false;}}
function write(v){try{window.localStorage.setItem(KEY,v?'1':'0');}catch(e){}}
function apply(collapsed){
if(collapsed){side.classList.add(HID);}else{side.classList.remove(HID);}
if(btn){btn.setAttribute('aria-expanded',collapsed?'false':'true');}
}
apply(read());
if(btn){
btn.addEventListener('click',function(){
var collapsed=!side.classList.contains(HID);
apply(collapsed);
write(collapsed);
});
}
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot);}else{boot();}
})();`;