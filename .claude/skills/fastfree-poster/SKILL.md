---
description: Generate publish-ready FastFree vector SVG and JPEG/PNG social media posters for all 6 apps and 56 registered screens using local SVG rendering without external network or AI tokens.
name: fastfree-poster
# Content-Hash: blake3:4f7832ed70442007771eff1aaeabe60707c85e88313537a60993c7a8cd0c69ad
---

# FastFree Poster & Social Media Generator (`fastfree-poster`)

Use this skill when you need to generate high-fidelity, on-brand social media posters and vector marketing assets for FastFree applications (`pos`, `erp`, `ledger`, `panel`, `hr`, `website`) or specific product screens.

## Why Vector Social Media Generation?
- **Real Arabic Typography**: Text is rendered cleanly with native fonts (Tahoma/Segoe UI) rather than fuzzy AI approximations.
- **Strict Brand Alignment**: Gradients, colors, and the Infinity Logo are extracted directly from the canonical `fastfree-brand` specification.
- **100% Offline & Instant**: Zero external API calls, zero credit consumption, and rendered in < 1 second via `@resvg/resvg-js`.
- **Platform Compliant**: Output includes ready-to-upload JPEG files (Meta/LinkedIn standards) and master vector SVGs.

## Available MCP Tools

When the `fastfree-poster` MCP server is active, the following tools are available:

| Tool | Purpose | Key Arguments |
|---|---|---|
| `pos_social_post` | FastFree POS Point of Sale marketing poster | `title`, `subtitle`, `body`, `ratio`, `ctaText` |
| `erp_social_post` | FastFree ERP enterprise suite marketing poster | `title`, `subtitle`, `body`, `ratio`, `ctaText` |
| `ledger_social_post` | FastFree Ledger accounting & inventory poster | `title`, `subtitle`, `body`, `ratio`, `ctaText` |
| `panel_social_post` | FastFree Panel cluster management poster | `title`, `subtitle`, `body`, `ratio`, `ctaText` |
| `hr_social_post` | FastFree HR human resources & payroll poster | `title`, `subtitle`, `body`, `ratio`, `ctaText` |
| `website_social_post` | FastFree Portal & Sovereign Cloud poster | `title`, `subtitle`, `body`, `ratio`, `ctaText` |
| `screen_social_post` | Feature poster focusing on one specific ERP screen | `app`, `screen`, `title`, `ratio` |
| `social_post_catalogue` | Inspect all supported apps, aspect ratios, and contact details | — |
| `app_screens` | Query the catalogue of 56 registered enterprise screens | — |

## Supported Aspect Ratios
- `4:5` (1080 × 1350): Recommended for Facebook, Instagram, and LinkedIn feeds (best organic engagement).
- `1:1` (1080 × 1080): Safe square default for all feeds.
- `1.91:1` (1200 × 630): Ideal for link previews and Open Graph (`og:image`).
- `9:16` (1080 × 1920): Stories and Reels.
- `16:9` (1920 × 1080): YouTube banners and widescreen presentations.

## Direct CLI Testing & Preview
To run the automated test suite or generate sample posters:
```bash
cd fastfree_mcp_tools/fastfree_poster_mcp
npm test      # Generates a full matrix of sample posters into output/
npm run check # Self-check MCP protocol and tool integrity
```
Outputs are written to `fastfree_mcp_tools/fastfree_poster_mcp/output/<date>/`.
