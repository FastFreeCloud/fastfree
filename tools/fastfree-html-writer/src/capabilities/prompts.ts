import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "doc_page",
    {
      title: "Documentation page template",
      description:
        "A reusable outline for a documentation page: state the audience, list the facts, then show the commands and the caveats. Returns the outline as markdown to fill in before calling render_page.",
      argsSchema: {
        topic: z.string().describe("What the page documents"),
        audience: z
          .enum(["dev", "ops", "mixed"])
          .optional()
          .describe("Who reads it. Defaults to mixed."),
      },
    },
    ({ topic, audience }) => {
      const who = audience ?? "mixed";
      const lens =
        who === "dev"
          ? "Lead with the exact commands and the file paths, not the prose."
          : who === "ops"
            ? "Lead with risk and recovery: what breaks, what to run, how to undo."
            : "Lead with the short answer, then the commands, then the caveats.";

      const text = [
        `# ${topic}`,
        "",
        lens,
        "",
        "## Short answer",
        "<one or two sentences — the conclusion the reader came for>",
        "",
        "## Facts",
        "<table: item / value / how it was verified>",
        "",
        "## Commands",
        "<code block: exact, copy-pasteable, with the working directory stated>",
        "",
        "## Caveats",
        "<card variant=warn: destructive operations, version-specific behaviour, assumptions>",
        "",
        "## Verify",
        "<code block: the command that proves the claim above>",
        "",
        "---",
        `Then call render_page with title="${topic}" and these blocks.`,
      ].join("\n");

      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "index_page",
    {
      title: "Documentation index template",
      description:
        "Outline for a hub page that links to every generated page. The grid block takes { title, body, href } per card.",
      argsSchema: {
        project: z.string().describe("Project or subsystem name"),
      },
    },
    ({ project }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `# ${project} — documentation index`,
              "",
              "## Status",
              "<tags block: what is verified vs pending>",
              "",
              "## Pages",
              "<grid block: one card per page, href = the page filename>",
              "",
              "## Reading order",
              "<paragraph: which page answers which question>",
              "",
              "## Commands",
              "<code block: the daily-use commands, working directory stated>",
              "",
              "Then call render_page with slug=\"index\" and open=true.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}