#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./capabilities/tools.js";
import { registerNavTools } from "./capabilities/navTools.js";
import { registerResources } from "./capabilities/resources.js";
import { registerPrompts } from "./capabilities/prompts.js";

import { fileURLToPath } from "node:url";
import path from "node:path";

// build/index.js → package root → tools/fastfree-html-writer → tools → repo root
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

const DEFAULT_DOCS_DIR =
  process.env.FASTFREE_DOCS_DIR ?? path.join(REPO_ROOT, "apps", "fastfree_os", "docs");

const server = new McpServer({
  name: "fastfree-html-writer",
  version: "1.0.0",
});

registerTools(server, DEFAULT_DOCS_DIR);
registerNavTools(server, DEFAULT_DOCS_DIR);
registerResources(server, DEFAULT_DOCS_DIR);
registerPrompts(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`fastfree-html-writer on stdio; docs dir = ${DEFAULT_DOCS_DIR}`);
}

main().catch((err: unknown) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});