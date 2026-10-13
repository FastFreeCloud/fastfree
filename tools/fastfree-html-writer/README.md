# fastfree-html-writer

MCP server that turns structured content blocks into styled, self-contained RTL
(Arabic) HTML documentation pages.

Registered in `opencode.json` as `fastfree-html-writer` and launched through
flox, so it always runs on the repo-pinned Node.

## Layout

```
src/
├── index.ts                     server wiring + docs-dir resolution
├── capabilities/
│   ├── tools.ts                 render_page
│   ├── resources.ts             docs-index + docs-page/{slug}
│   └── prompts.ts               doc_page, index_page
├── render/
│   ├── css.ts                   stylesheet (self-contained, no CDN)
│   ├── blocks.ts                the Block union type
│   ├── renderBlocks.ts          Block → HTML
│   └── layout.ts                full document assembly
└── util/
    ├── escape.ts                escapeHtml / escapeAttr / slugify
    └── discover.ts              directory scanning, read/write
```

## Capabilities

**Tool** — `render_page`. Writes an HTML file and returns a short summary
(path, block count, byte count), never the HTML itself, so the caller's context
stays small. Set `open: true` to launch it in the browser.

**Resources** — `fastfree://docs/__index__` lists every page as JSON;
`fastfree://docs/{slug}` reads one. The list callback scans the directory, so
adding a hundred pages does not require a hundred registrations.

**Prompts** — `doc_page` and `index_page` are reusable outlines. `doc_page`
takes an `audience` (`dev` / `ops` / `mixed`) and reorders the outline to match.

## Output

Dark theme, `dir="rtl"` with `direction:ltr` on code blocks, zero external
references. Every text field is escaped before any markup is re-allowed, so
`\`code\``, `**bold**` and `[text](href)` work while raw HTML in content cannot
execute. `href` values are scheme-checked; `javascript:` is dropped and the
card renders without a link.

## Build

```bash
flox activate -- pnpm install
flox activate -- pnpm run build
```

## Test

The official inspector drives the server over stdio:

```bash
flox activate -- npx -y @modelcontextprotocol/inspector --cli node build/index.js \
  --protocol-era legacy --method tools/list

flox activate -- npx -y @modelcontextprotocol/inspector --cli node build/index.js \
  --protocol-era legacy --method tools/call --tool-name render_page \
  --tool-args-json '{"title":"Test","slug":"test","blocks":[{"type":"paragraph","text":"hi"}]}'
```

Use `--protocol-era legacy`. The pinned SDK (1.32.1) implements the 2025-era
handshake; `--protocol-era modern` asks for a pinned `2026-07-28` revision via
`server/discover`, which this SDK does not answer.

## Notes for maintenance

- Nothing may write to stdout. The MCP stdio transport carries JSON-RPC there,
  so a stray `console.log` corrupts the stream. All logging uses
  `console.error`, which goes to stderr.
- `resources/read` re-scans the directory on each call. That is cheap at doc
  scale; add a cache keyed on mtime if the directory ever grows into the
  thousands.
- Keep tools few. A growing tool list usually means a capability belongs in a
  resource or a prompt instead.