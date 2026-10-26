# fastfree_social_mcp

Creates publish-ready FastFree social media images.

Every poster is built as a real **vector SVG** with live Arabic text, the
FastFree logo and a contact strip, then exported as a **JPEG** that Meta and
LinkedIn accept for direct upload.

Nothing here needs a network connection, an API key or a browser. The drawing
is done locally by the resvg renderer, so a poster is produced in well under
a second.

## Where the data comes from

Everything is read from **`brand/brand.json`** in the repository root, which
is the single source of truth for the app metadata, the contact details and
the screen catalogue. `brand/loader.mjs` loads it and expands it, so an app
gets the screens of the packages it ships.

The catalogue is generated from the code, not written by hand:

```bash
node scripts/extract-screens.mjs   # read the screen registrations
node scripts/build-brand.mjs        # rebuild brand/brand.json
node scripts/check-brand.mjs        # validate it and detect drift
```

`check-brand.mjs` fails when a colour in an app no longer matches the
canonical file, when a screen is registered in a package but missing from
the catalogue, or when a screen label no longer matches its locale file.

## Tools

| Tool | Purpose |
|---|---|
| `pos_social_post` | Poster for FastFree POS |
| `erp_social_post` | Poster for FastFree ERP |
| `ledger_social_post` | Poster for FastFree Ledger |
| `panel_social_post` | Poster for FastFree Panel |
| `hr_social_post` | Poster for FastFree HR |
| `website_social_post` | Poster for FastFree Website |
| `social_post_catalogue` | Apps, ratios and contact details |
| `app_screens` | The screen catalogue, with the apps that ship each screen |
| `screen_social_post` | A poster about one specific screen |

## Arguments

Only `title` is required for the six app tools.

| Argument | Type | Default | Purpose |
|---|---|---|---|
| `title` | string | — | The Arabic headline |
| `subtitle` | string | the app name in Arabic | Short label above the headline |
| `body` | string | the app tagline | Line under the headline |
| `ctaText` | string | — | Call to action button label |
| `ctaUrl` | string | the app URL | Link shown under the button |
| `ratio` | string | `1:1` | Output size, see below |
| `logo` | boolean | `true` | Draw the brand logo |
| `contact` | boolean | `true` | Draw the contact strip |
| `caption` | string | generated | Caption to publish with the image |
| `png` | boolean | `false` | Also write a PNG |

`screen_social_post` takes `app` and `screen` instead, and every other
argument is optional: the headline defaults to the screen label in Arabic
and the body line to the app tagline.

## Ratios

| Ratio | Size | Fits |
|---|---|---|
| `4:5` | 1080 × 1350 | Facebook feed, Instagram feed, LinkedIn feed. Best reach in 2026. |
| `1:1` | 1080 × 1080 | Every feed, uncropped. |
| `1.91:1` | 1200 × 630 | Link previews and Open Graph images. |
| `9:16` | 1080 × 1920 | Stories and Reels. Keep text clear of the top and bottom 250 px. |
| `16:9` | 1920 × 1080 | YouTube and wide screens. |
| `3:4` | 1080 × 1440 | Instagram feed, fills the 3:4 profile grid. |

`1:1` and `4:5` sit inside the 3:1 to 4:5 band that LinkedIn renders
uncropped, and inside the 4:5 to 1.91:1 range Instagram accepts. They are
the safe defaults for a feed post.

## Output

Each call writes to `output/<date>/`:

| File | Purpose |
|---|---|
| `<app>-social-<time>.svg` | Editable master. Vector, live text, a few kilobytes. |
| `<app>-social-<time>.jpg` | Ready to upload. Meta requires JPEG for feed images. |
| `<app>-social-<time>.png` | Only when `png` is true. Useful for the website's `og:image`. |

## Notes on the platforms

- **LinkedIn does not accept SVG.** It takes JPG, GIF and PNG only, so the
  raster export is what gets uploaded and the SVG stays as the master.
- **Instagram requires JPEG**, 320 to 1440 px wide, within a 4:5 to 1.91:1
  aspect ratio.
- **A hand-built vector needs no AI label.** Meta's disclosure requirement
  covers photorealistic video and realistic audio, and the label is applied
  to images only when AI signals are detected. When publishing through the
  API, send `is_gen_ai=false` and `provenance_type=NONE`.
- **Text stays selectable.** The Arabic is real text in the SVG, so it can
  be edited in any vector editor and it renders correctly at any size.

## Development

```bash
npm install
npm test         # 98 checks over the generator, the renderer and the layout
npm run check    # starts the server, lists the tools and builds a poster
```

## Layout

```
src/
  index.js         MCP server: tool registration and the request handler
  tools.js         Tool definitions and their input schemas
  handlers.js      What a tool actually does
  poster.js        The layout: background, headline block, contact strip
  brand.js         Re-exports the canonical brand data
  brand-source.js  Locates and loads brand/brand.json
  svg.js           Reusable SVG primitives
  utils.js         Text measuring, wrapping, script splitting, XML escaping
  render.js        SVG to PNG and JPEG through resvg
  logo.js          Inlines the brand logo
  output.js        Where files are written
```

The repository holds the shared parts:

```
brand/
  brand.json       The single source of truth
  loader.mjs       Loads and expands it
scripts/
  extract-screens.mjs  Reads the screen registrations from the packages
  build-brand.mjs      Rebuilds brand.json
  check-brand.mjs      Validates it and detects drift
```

## Fonts

Arabic is rendered with **Tahoma** and Latin with **Segoe UI**, both loaded by
explicit file path so the output is identical on any machine.

Cairo is deliberately not used: it is not installed by default, and the
fallback face renders Arabic as disconnected letters in the wrong order,
which looks like a design mistake rather than a missing font. The server
checks for an Arabic-capable face and refuses to render without one.
