import { escapeAttr, escapeHtml } from "../util/escape.js";

export interface NavItem {
  href: string;
  label: string;
  fullTitle?: string;
  /** Creation stamp in epoch ms. Drives the sidebar's number assignment. */
  created?: number;
}

// Navigation needs short labels. A <title> is written for a browser tab or a
// search result and routinely runs to four clauses; putting that in a nav bar
// blows the layout out. Trim on word boundaries and keep the full string in
// the title attribute so nothing is lost on hover.
const MAX_LABEL_CHARS = 26;
const SKIP = /^(the|a|an)\s+/i;

export function shortLabel(full: string): string {
  const s = full
    .split(/[·—|]/)
    .map((p) => p.trim())
    .filter(Boolean)[0];
  if (!s) return full;
  const cleaned = SKIP.test(s) ? s.replace(SKIP, "") : s;
  if (cleaned.length <= MAX_LABEL_CHARS) return cleaned;

  const words = cleaned.split(/\s+/);
  let out = "";
  for (const w of words) {
    if (out && (out + " " + w).length > MAX_LABEL_CHARS) break;
    out = out ? `${out} ${w}` : w;
  }
  return (out || cleaned).replace(/[،,:;]$/, "").trim();
}

/**
 * Nav labels must be unique or the bar becomes a row of identical links.
 * Two pages both titled "installer …" collapse to the same short form, so
 * widen the colliding ones by appending the next clause from the title.
 */
export function uniqueLabels(items: NavItem[]): NavItem[] {
  const groups = new Map<string, NavItem[]>();
  for (const it of items) {
    const base = shortLabel(it.label);
    const g = groups.get(base) ?? [];
    g.push(it);
    groups.set(base, g);
  }

  const out: NavItem[] = [];
  for (const [base, group] of groups) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }

    // Resolve the whole collision set together. Comparing each entry only
    // against its rivals' *short* forms is not enough: two pages can widen to
    // the same label ("installer — formats" and "installer — formats and
    // timing"), so a widened name has to be reserved like any other.
    const reserved = new Set<string>();
    const resolved: NavItem[] = [];

    for (const it of group) {
      const clauses = it.label
        .split(/[·—|]/)
        .map((p) => p.trim())
        .filter(Boolean);

      let chosen = `${base} (${it.href.replace(/\.html$/, "")})`;
      for (let c = 1; c < clauses.length; c++) {
        const words = clauses[c]!.split(/\s+/);
        for (let w = 1; w <= words.length; w++) {
          const candidate = `${base} — ${words.slice(0, w).join(" ")}`;
          if (!reserved.has(candidate)) {
            chosen = candidate;
            break;
          }
        }
        if (chosen !== `${base} (${it.href.replace(/\.html$/, "")})`) break;
      }
      reserved.add(chosen);
      resolved.push({ ...it, label: chosen });
    }

    out.push(...resolved);
  }

  return out;
}

const MARKER_OPEN = "<!-- ff-nav -->";
const MARKER_CLOSE = "<!-- /ff-nav -->";

function renderNav(items: NavItem[], current: string): string {
  if (items.length < 2) return "";
  const links = uniqueLabels(items)
    .map((it) => {
      const active = it.href === current;
      const short = shortLabel(it.label);
      const tip = it.fullTitle ?? it.label;
      const tipAttr = short === tip ? "" : ` title="${escapeAttr(tip)}"`;
      return `<a class="nv${active ? " on" : ""}" href="${escapeAttr(it.href)}"${tipAttr}${active ? ' aria-current="page"' : ""}>${escapeHtml(short)}</a>`;
    })
    .join("\n");
  return `${MARKER_OPEN}\n<nav class="nav">\n${links}\n</nav>\n${MARKER_CLOSE}`;
}

export function pageNameFromHref(href: string): string {
  const base = href.split("/").pop() ?? href;
  return base.toLowerCase().endsWith(".html") ? base : `${base}.html`;
}

export function injectNav(html: string, items: NavItem[], currentHref: string): string {
  const nav = renderNav(items, pageNameFromHref(currentHref));
  if (!nav) return html;

  const existing = html.indexOf(MARKER_OPEN);
  if (existing !== -1) {
    const end = html.indexOf(MARKER_CLOSE);
    if (end !== -1) {
      const stop = end + MARKER_CLOSE.length;
      return html.slice(0, existing) + nav + html.slice(stop);
    }
  }

  if (html.includes('class="wrap"')) {
    return html.replace(
      /<div class="wrap">/,
      `<div class="wrap">\n${nav}`,
    );
  }

  const bodyIdx = html.indexOf("<body>");
  if (bodyIdx !== -1) {
    const at = bodyIdx + "<body>".length;
    return html.slice(0, at) + `\n${nav}` + html.slice(at);
  }

  return nav + html;
}

export function hasNav(html: string): boolean {
  return html.includes(MARKER_OPEN);
}