import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { discoverPages, readPage, type PageInfo } from "../util/discover.js";

function uriFor(slug: string): string {
  return `fastfree://docs/${slug}`;
}

function toContents(slug: string, text: string) {
  return { contents: [{ uri: uriFor(slug), mimeType: "text/html", text }] };
}

export function registerResources(server: McpServer, defaultDocsDir: string): void {
  server.registerResource(
    "docs-index",
    uriFor("__index__"),
    {
      title: "Documentation page index",
      description: "Machine-readable list of every HTML page in the docs directory.",
      mimeType: "application/json",
    },
    async () => {
      const pages = discoverPages(defaultDocsDir);
      return {
        contents: [
          {
            uri: uriFor("__index__"),
            mimeType: "application/json",
            text: JSON.stringify(
              { dir: defaultDocsDir, count: pages.length, pages },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerResource(
    "docs-page",
    new ResourceTemplate("fastfree://docs/{slug}", { list: undefined }),
    {
      title: "Documentation page",
      description:
        "Any generated HTML page, addressed by slug. The list callback enumerates every page, so this scales past a hand-maintained registry.",
      mimeType: "text/html",
    },
    async (uri, variables) => {
      const raw = variables.slug;
      const slug = Array.isArray(raw) ? (raw[0] ?? "") : String(raw ?? "");
      if (!slug || slug.includes("..") || slug.includes("/")) {
        throw new Error(`Invalid slug: ${slug}`);
      }
      const page = discoverPages(defaultDocsDir).find((p: PageInfo) => p.slug === slug);
      if (!page) {
        throw new Error(`Unknown page: ${slug}. Call the docs-index resource for the list.`);
      }
      return toContents(slug, readPage(page.path));
    },
  );
}