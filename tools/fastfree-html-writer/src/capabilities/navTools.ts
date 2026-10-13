import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { discoverPages, readPage, writePage, ensureDir } from "../util/discover.js";
import {
  injectSidebar,
  hasSidebar,
  SIDEBAR_SCRIPT,
  readCreated,
  stampCreated,
} from "../render/sidebar.js";
import { CSS } from "../render/css.js";
import type { NavItem } from "../render/nav.js";

// Pages are written once and then hand-edited, so a later CSS change would
// otherwise leave them styled by whatever shipped on the day they were
// generated. Replacing the <style> body on every pass keeps every page on the
// current stylesheet instead of accumulating stragglers.
export const STYLE_RE = /<style>[\s\S]*?<\/style>/;

export function refreshCss(html: string): string {
  if (!STYLE_RE.test(html)) return html;
  return html.replace(STYLE_RE, `<style>\n${CSS}\n</style>`);
}

export const SCRIPT_MARK = "ff-side-collapsed";

export function ensureScript(html: string): string {
  if (html.includes(SCRIPT_MARK)) return html;
  const block = `<script>\n${SIDEBAR_SCRIPT}\n</script>\n`;
  const closeIdx = html.lastIndexOf("</body>");
  if (closeIdx === -1) return html;
  return html.slice(0, closeIdx) + block + html.slice(closeIdx);
}

// Stamped once and then left alone. Using the current time on every pass would
// make a refresh reorder the sidebar, which is exactly what the stamp exists
// to prevent.
function ensureCreated(html: string, fallbackMs: number): string {
  if (readCreated(html) !== null) return html;
  return stampCreated(html, fallbackMs);
}

// Home always first; the rest newest-first, so the page written last sits at
// position 1 in the list.
function buildNav(docsDir: string, indexName: string): NavItem[] {
  const pages = discoverPages(docsDir);
  const items: NavItem[] = [
    { href: indexName, label: "الرئيسية" },
    ...pages
      .filter((p) => p.slug !== "index")
      .map((p) => ({
        href: p.href,
        label: p.title || p.slug,
        fullTitle: p.title,
        created: p.created,
      })),
  ];
  return items;
}



export function registerNavTools(server: McpServer, defaultDocsDir: string): void {
  server.registerTool(
    "inject_sidebar",
    {
      title: "Add the sidebar to existing pages",
      description:
        "Insert (or refresh) the sidebar on every HTML page in the docs directory, so pages can cross-link. Idempotent: re-running replaces the existing nav instead of stacking a second one. Run this after hand-written pages are added to the directory.",
      inputSchema: {
        docsDir: z.string().optional().describe("Docs directory. Defaults to the server's."),
        indexName: z
          .string()
          .optional()
          .describe('Hub page file name, defaults to "index.html"'),
        dryRun: z.boolean().optional().describe("Report what would change without writing"),
      },
    },
    async ({ docsDir, indexName, dryRun }) => {
      const dir = docsDir ?? defaultDocsDir;
      const hub = indexName ?? "index.html";
      const nav = buildNav(dir, hub);
      const pages = discoverPages(dir);

      if (pages.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: `No HTML pages found in ${dir}` }],
        };
      }

      ensureDir(dir);
      const changed: string[] = [];
      const unchanged: string[] = [];

      for (const page of pages) {
        const before = readPage(page.path);
        if (before === "") {
          unchanged.push(page.slug);
          continue;
        }
        const wasMissing = !hasSidebar(before);
        const after = ensureScript(
          refreshCss(injectSidebar(ensureCreated(before, page.mtime), nav, page.href)),
        );
        if (after === before && !wasMissing) {
          unchanged.push(page.slug);
          continue;
        }
        if (!dryRun) writePage(page.path, after);
        changed.push(page.slug);
      }

      const verb = dryRun ? "would update" : "updated";
      return {
        content: [
          {
            type: "text",
            text: [
              `🧭 ${verb} ${changed.length} page(s), ${unchanged.length} already correct`,
              `   sidebar items: ${nav.length}`,
              `   order: index.html, then newest-first by mtime`,
              ...(changed.length ? changed.map((s) => `   + ${s}`) : []),
              `📂 ${dir}`,
            ].join("\n"),
          },
        ],
      };
    },
  );

  server.registerTool(
    "nav_status",
    {
      title: "Report which pages have a sidebar",
      description:
        "List every HTML page in the docs directory in sidebar order — home first, then newest-first — and whether it carries the sidebar, so gaps are visible before rendering.",
      inputSchema: {
        docsDir: z.string().optional().describe("Docs directory. Defaults to the server's."),
      },
    },
    async ({ docsDir }) => {
      const dir = docsDir ?? defaultDocsDir;
      const pages = discoverPages(dir);
      if (pages.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: `No HTML pages found in ${dir}` }],
        };
      }
      const ordered = ["index.html", ...pages.filter((p) => p.slug !== "index").map((p) => p.href)];
      const rows = ordered.map((href, i) => {
        const page = pages.find((p) => p.href === href);
        if (!page) return `${" ".repeat(2)}✗ ${href.padEnd(28)} (missing)`;
        const has = hasSidebar(readPage(page.path));
        const num = href === "index.html" ? " " : String(i).padEnd(2);
        return `${has ? "✓" : "✗"} ${num} ${href.padEnd(28)} ${page.title.slice(0, 42)}`;
      });
      return {
        content: [
          {
            type: "text",
            text: [`📄 ${pages.length} page(s) in ${dir}`, ...rows].join("\n"),
          },
        ],
      };
    },
  );
}