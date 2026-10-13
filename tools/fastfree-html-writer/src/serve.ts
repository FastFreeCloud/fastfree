#!/usr/bin/env node
// Static file server for the FastFree documentation hub.
// Serves apps/fastfree_os/docs so every generated page is reachable at a
// stable URL instead of a file:// path.
//
//   http://127.0.0.1:8787/            -> index.html
//   http://127.0.0.1:8787/docs.json   -> machine-readable page index
//   http://127.0.0.1:8787/health      -> liveness JSON for monitoring
//
// Binds to loopback only. This is a local viewer, not a public site.

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(TOOL_ROOT, "..", "..");
const DOCS_DIR = process.env.FASTFREE_DOCS_DIR ?? path.join(REPO_ROOT, "apps", "fastfree_os", "docs");
const PORT = Number(process.env.FASTFREE_DOCS_PORT ?? 8787);
const HOST = process.env.FASTFREE_DOCS_HOST ?? "127.0.0.1";

// Read once at startup so /health never reports a stale hardcoded version.
function readVersion(): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path.join(TOOL_ROOT, "package.json"), "utf8"));
    const v = (parsed as { version?: unknown }).version;
    return typeof v === "string" ? v : "unknown";
  } catch {
    return "unknown";
  }
}
const VERSION = readVersion();

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

interface PageInfo {
  slug: string;
  file: string;
  title: string;
  size: number;
  mtime: number;
}

// null means "directory could not be stat'ed" and is itself a valid cache key,
// so a missing docs dir does not force a rescan on every request.
let pageCache: { key: string; pages: PageInfo[] } | null = null;

// The cache key must change whenever any page's *content* could differ, not
// just when entries appear. A directory's mtime only moves when files are
// added, removed or renamed, so regenerating a page in place — which is the
// tool's main workflow — would otherwise keep serving a stale title and size.
// Folding the newest page mtime into the key costs one statSync per page but
// skips the readFileSync, which is where the real I/O cost sits.
function docsDirKey(): string {
  let newest = 0;
  let entries: string[] = [];
  try {
    entries = readdirSync(DOCS_DIR);
  } catch {
    return "missing";
  }
  let dirMtime = 0;
  try {
    dirMtime = statSync(DOCS_DIR).mtimeMs;
  } catch {
    /* directory vanished between calls */
  }
  for (const f of entries) {
    if (!f.toLowerCase().endsWith(".html")) continue;
    try {
      const st = statSync(path.join(DOCS_DIR, f));
      if (st.mtimeMs > newest) newest = st.mtimeMs;
    } catch {
      /* skip unreadable entry */
    }
  }
  return `${dirMtime}:${newest}:${entries.length}`;
}

function readPages(): PageInfo[] {
  let entries = [];
  try {
    entries = readdirSync(DOCS_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((f) => !f.startsWith(".") && f.toLowerCase().endsWith(".html"))
    .map((f) => {
      const full = path.join(DOCS_DIR, f);
      let title = f;
      try {
        const html = readFileSync(full, "utf8");
        const m = /<title>([^<]*)<\/title>/i.exec(html);
        if (m?.[1]) {
          title = m[1].trim();
          title = title
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"');
        }
      } catch {
        /* unreadable page still gets listed by filename */
      }
      let size = 0;
      let mtime = 0;
      try {
        const st = statSync(full);
        size = st.size;
        mtime = Math.round(st.mtimeMs);
      } catch {
        /* keep defaults */
      }
      return { slug: f.replace(/\.html$/i, ""), file: f, title, size, mtime };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

// Extracting <title> means reading every page, so the result is memoised
// against the directory mtime instead of being rebuilt per HTTP request.
function listPages(): PageInfo[] {
  const key = docsDirKey();
  if (pageCache && pageCache.key === key) return pageCache.pages;
  const pages = readPages();
  pageCache = { key, pages };
  return pages;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/health" || pathname === "/healthz") {
    const body = JSON.stringify({
      ok: true,
      pages: listPages().length,
      dir: DOCS_DIR,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      version: VERSION,
    });
    res.writeHead(200, { "content-type": TYPES[".json"], "cache-control": "no-store" });
    res.end(body);
    return;
  }

  if (pathname === "/docs.json") {
    const pages = listPages();
    const body = JSON.stringify({ dir: DOCS_DIR, count: pages.length, pages }, null, 2);
    res.writeHead(200, { "content-type": TYPES[".json"], "cache-control": "no-store" });
    res.end(body);
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  // Resolve inside DOCS_DIR only; anything that escapes is rejected.
  const target = path.resolve(DOCS_DIR, "." + pathname);
  const rel = path.relative(DOCS_DIR, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("403 forbidden\n");
    return;
  }

  if (!existsSync(target) || !statSync(target).isFile()) {
    const pages = listPages();
    const links = pages
      .map((p) => `<li><a href="/${encodeURIComponent(p.file)}">${p.title}</a> <span class="muted">(${p.file})</span></li>`)
      .join("\n");
    const body = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 — FastFree docs</title><style>
body{background:#0e1117;color:#e6edf3;font-family:"Segoe UI",Tahoma,sans-serif;padding:40px;line-height:1.9}
a{color:#4c9aff}.muted{color:#8b949e;font-size:.85em}
</style></head><body>
<h1>404</h1><p>${pathname} مش موجود.</p>
<p>الصفحات المتاحة (${pages.length}):</p><ul>${links}</ul>
</body></html>`;
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(body);
    return;
  }

  const body = readFileSync(target);
  res.writeHead(200, {
    "content-type": TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(body);
});

server.on("error", (err) => {
  if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
    console.error(
      `fastfree-docs: cannot bind ${HOST}:${PORT}, address already in use. ` +
        `Stop the other instance or pick another port, e.g. FASTFREE_DOCS_PORT=8791. ` +
        `Find the holder with: ss -ltnp | grep ${PORT}`,
    );
    process.exit(1);
  }
  throw err;
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.error(`fastfree-docs: ${signal} received, shutting down`);
    server.close();
    process.exit(0);
  });
}

server.listen(PORT, HOST, () => {
  console.error(`fastfree-docs serving ${DOCS_DIR}`);
  console.error(`  → http://${HOST}:${PORT}/`);
});