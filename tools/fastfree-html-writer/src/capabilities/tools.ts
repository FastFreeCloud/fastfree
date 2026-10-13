import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderPage } from "../render/layout.js";
import { injectSidebar } from "../render/sidebar.js";
import type { NavItem } from "../render/nav.js";
import { discoverPages, ensureDir, writePage, readPage } from "../util/discover.js";
import { slugify } from "../util/escape.js";
import { ensureScript, refreshCss } from "./navTools.js";

// Home first, then newest-first. discoverPages defaults to mtime-descending,
// which is what makes the most recently written page land at position 1.
export function autoNav(docsDir: string, currentHref: string): NavItem[] {
  const pages = discoverPages(docsDir);
  return [
    { href: "index.html", label: "الرئيسية" },
    ...pages
      .filter((p) => p.slug !== "index" && p.href !== currentHref)
      .map((p) => ({
        href: p.href,
        label: p.title || p.slug,
        fullTitle: p.title,
        created: p.created,
      })),
  ];
}

// A newly written page is invisible to every other page's sidebar until those
// pages are rewritten. Without this the new entry shows up on its own page and
// nowhere else, which reads as "it was never added".
function refreshOtherSidebars(docsDir: string): number {
  let touched = 0;
  for (const page of discoverPages(docsDir)) {
    // Each page's sidebar must exclude only itself, so the current page is
    // that page's own href — not the page that was just written.
    const nav = autoNav(docsDir, page.href);
    const before = readPage(page.path);
    if (before === "") continue;
    const after = ensureScript(refreshCss(injectSidebar(before, nav, page.href)));
    if (after !== before) {
      writePage(page.path, after);
      touched++;
    }
  }
  return touched;
}

export function registerTools(server: McpServer, defaultDocsDir: string): void {
const blockSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("heading"),
      level: z.union([z.literal(2), z.literal(3)]),
      text: z.string(),
    }),
    z.object({
      type: z.literal("paragraph"),
      text: z.string(),
      emphasis: z.enum(["normal", "big"]).optional(),
    }),
    z.object({
      type: z.literal("code"),
      content: z.string(),
      caption: z.string().optional(),
    }),
    z.object({
      type: z.literal("card"),
      variant: z.enum(["ok", "acc", "warn", "bad"]).optional(),
      title: z.string().optional(),
      blocks: z.array(blockSchema),
    }),
    z.object({
      type: z.literal("table"),
      head: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      codeColumns: z.array(z.number()).optional(),
    }),
    z.object({
      type: z.literal("tags"),
      items: z.array(
        z.object({
          label: z.string(),
          variant: z.enum(["ok", "no", "acc", "warn"]).optional(),
        }),
      ),
    }),
    z.object({
      type: z.literal("qa"),
      items: z.array(z.object({ q: z.string(), a: z.string() })),
    }),
    z.object({
      type: z.literal("steps"),
      items: z.array(z.object({ title: z.string(), body: z.string().optional() })),
    }),
    z.object({
      type: z.literal("flow"),
      items: z.array(
        z.object({
          n: z.number(),
          title: z.string(),
          detail: z.string().optional(),
        }),
      ),
    }),
    z.object({ type: z.literal("tree"), content: z.string() }),
    z.object({
      type: z.literal("grid"),
      cards: z.array(
        z.object({ title: z.string(), body: z.string(), href: z.string().optional() }),
      ),
    }),
    z.object({
      type: z.literal("barrow"),
      label: z.string(),
      size: z.enum(["s", "m", "l"]),
    }),
    z.object({ type: z.literal("list"), items: z.array(z.string()) }),
    z.object({ type: z.literal("kv"), text: z.string() }),
  ]),
);


  server.registerTool(
    "render_page",
    {
      title: "Render documentation page",
      description:
        "Render structured content blocks into a styled, self-contained RTL (Arabic) HTML page and optionally open it in the default browser. Returns a short summary, never the full HTML, to keep the context small.",
      inputSchema: {
        title: z.string().describe("Page title shown in <title> and the h1"),
        subtitle: z.string().optional().describe("Optional line under the title"),
        logo: z.string().optional().describe("Optional small kicker above the title"),
        slug: z
          .string()
          .optional()
          .describe("File name without extension. Derived from the title when omitted."),
        docsDir: z
          .string()
          .optional()
          .describe(`Directory to write into. Defaults to ${defaultDocsDir}`),
        blocks: z.array(blockSchema).describe("Ordered content blocks for the page"),
        footer: z.string().optional().describe("Optional footer text"),
        open: z
          .boolean()
          .optional()
          .describe("Open the page in the browser once written. Defaults to true."),
        nav: z
          .boolean()
          .optional()
          .describe("Inject the sidebar and refresh it on the other pages. Defaults to true."),
      },
    },
    async ({ title, subtitle, logo, slug, docsDir, blocks, footer, open, nav }) => {
      const dir = docsDir ?? defaultDocsDir;
      const name = slugify(slug ?? title);
      const href = `${name}.html`;
      const shouldOpen = open !== false;

      try {
        ensureDir(dir);
        let html = renderPage(
          { title, ...(subtitle !== undefined ? { subtitle } : {}), ...(logo !== undefined ? { logo } : {}) },
          blocks as never[],
          footer,
        );
        if (nav !== false) {
          html = injectSidebar(html, autoNav(dir, href), href);
        }
        const bytes = writePage(`${dir}/${href}`, html);

        const refreshed = nav === false ? 0 : refreshOtherSidebars(dir);

        if (shouldOpen) {
          const { spawn } = await import("node:child_process");
          const child = spawn("xdg-open", [`${dir}/${href}`], { stdio: "ignore", detached: true });
          child.on("error", () => undefined);
          child.unref();
        }

        return {
          content: [
            {
              type: "text",
              text: [
                `✅ ${href} — ${blocks.length} block(s), ${bytes} bytes`,
                `📂 ${dir}/${href}`,
                refreshed > 0
                  ? `🧭 sidebar refreshed on ${refreshed} other page(s)`
                  : "🧭 sidebar already current on other pages",
                shouldOpen ? "🌐 opened in browser" : "🌐 not opened (open=false)",
              ].join("\n"),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `❌ render_page failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "open_page",
    {
      title: "Open a page in the browser",
      description:
        "Launch an already-rendered page in the default browser. Accepts the file name or an absolute path; refuses to open anything outside the docs directory.",
      inputSchema: {
        page: z.string().describe("File name (e.g. index.html) or absolute path"),
        docsDir: z.string().optional().describe("Docs directory. Defaults to the server's."),
      },
    },
    async ({ page, docsDir }) => {
      const dir = docsDir ?? defaultDocsDir;
      const base = page.split("/").pop() ?? page;
      if (!base.toLowerCase().endsWith(".html") || base.includes("..")) {
        return {
          isError: true,
          content: [{ type: "text", text: `❌ Not an html page name: ${page}` }],
        };
      }
      const target = `${dir}/${base}`;
      const { spawn } = await import("node:child_process");
      const child = spawn("xdg-open", [target], { stdio: "ignore", detached: true });
      child.on("error", () => undefined);
      child.unref();
      return {
        content: [{ type: "text", text: `🌐 ${target}` }],
      };
    },
  );
}