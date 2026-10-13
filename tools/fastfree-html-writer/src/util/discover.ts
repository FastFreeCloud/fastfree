/** Filesystem helpers for the FastFree HTML writer: discovering pages in a docs directory and reading/writing UTF-8 HTML. */

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readCreated } from "../render/sidebar.js";

export interface PageInfo {
  slug: string;
  title: string;
  path: string;
  size: number;
  href: string;
  mtime: number;
  created: number;
}

/** How discoverPages orders the result. */
export type PageSort = "mtime" | "slug";

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title\s*>/i;
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

function extractTitle(html: string, slug: string): string {
  const raw = TITLE_RE.exec(html)?.[1];
  if (raw === undefined) return slug;
  const title = decodeEntities(raw).trim();
  return title.length > 0 ? title : slug;
}

function collectPages(docsDir: string): PageInfo[] {
  let entries: string[];
  try {
    entries = readdirSync(docsDir);
  } catch {
    return [];
  }

  const pages: PageInfo[] = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    if (!entry.toLowerCase().endsWith(".html")) continue;

    const path = join(docsDir, entry);
    let size: number;
    let mtime: number;
    try {
      const st = statSync(path);
      if (st.isDirectory()) continue;
      size = st.size;
      mtime = st.mtimeMs;
    } catch {
      continue;
    }

    let html = "";
    try {
      html = readFileSync(path, "utf8");
    } catch {
      html = "";
    }

    const slug = entry.slice(0, -".html".length);
    // Prefer the embedded creation stamp: refreshing a page rewrites it and
    // moves its mtime, so ordering by mtime alone would reshuffle the sidebar
    // every time anything is updated. Hand-written pages have no stamp yet and
    // fall back to mtime until they are stamped once.
    const created = readCreated(html) ?? mtime;
    pages.push({
      slug,
      title: extractTitle(html, slug),
      path: resolve(path),
      size,
      href: entry,
      mtime,
      created,
    });
  }

  return pages;
}

function bySlug(a: PageInfo, b: PageInfo): number {
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

// Newest first by creation stamp, with the slug as a tie-break so a batch
// written in the same millisecond still comes out in a stable order.
function byRecency(a: PageInfo, b: PageInfo): number {
  return b.created - a.created || bySlug(a, b);
}

/**
 * Scan a docs directory. Defaults to newest-first, because the docs change in
 * small batches and the reader cares about what was just written; pass
 * "slug" for the original alphabetical order.
 */
export function discoverPages(docsDir: string, sort: PageSort = "mtime"): PageInfo[] {
  const pages = collectPages(docsDir);
  return pages.sort(sort === "slug" ? bySlug : byRecency);
}

/** Newest-first ordering, for callers (the sidebar) that pin their own layout. */
export function discoverPagesByRecency(docsDir: string): PageInfo[] {
  return discoverPages(docsDir, "mtime");
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function readPage(path: string, maxBytes = 512_000): string {
  try {
    const buf = readFileSync(path);
    if (buf.byteLength <= maxBytes) return buf.toString("utf8");
    return buf.subarray(0, maxBytes).toString("utf8") + "\n<!-- truncated: file exceeds " + maxBytes + " bytes -->";
  } catch {
    return "";
  }
}

export function writePage(path: string, html: string): number {
  const buf = Buffer.from(html, "utf8");
  writeFileSync(path, buf);
  return buf.byteLength;
}