---
name: flow-generate
description: How to generate images and video with fastfree_flow_mcp - tool order, comma gotcha, credit cost, file layout, and troubleshooting. Read before the first generation in a session.
---

# Generating with fastfree_flow_mcp

## Order of operations

```
1. flow_brand_read              (optional) confirm the kit is current
2. flow_brand_prompt            turn the request into an on-brand prompt
3. flow_generate_image          generate
4. flow_brand_add_logo          only if the user approved a logo
```

Skip step 2 when the user asks for something deliberately off-brand.

## The comma gotcha

Flow's editor **strips commas**. Typing `a logo, blue and white` sends `a logo blue and white`.

`flow_brand_prompt` already returns comma-free text. If writing a prompt by hand, use spaces or `and`.

## Tool reference

### Session

- `flow_launch` — start the browser. Rarely needed; other tools auto-launch. `restart: true` closes the current browser first.
- `flow_status` — sign-in state, active account, available models. Run first when something fails.
- `flow_screenshot` — capture the Flow page.
- `flow_discover_ui` — list interactive elements. Run when a tool breaks after a Flow UI update.

### Images

- `flow_generate_image(prompt, ratio?)` — 1 credit per run.
- `flow_download_latest()` — grab the newest image from the open project.
- `flow_list_output(limit?)` — previous runs by day.

### Video

- `flow_setup_video(prompt, ratio?, duration?)` — prepares only. It stops before the Generate click on purpose so nobody burns credits by accident. The user confirms and clicks in the browser.
- `flow_create_scene(prompt)` — opens the Scenes panel.

### Characters and Tools

- `flow_list_characters()`, `flow_create_character(name, description)`
- `flow_open_tools_gallery()`, `flow_use_grid_architect(theme, shots?)`

### Brand

- `flow_brand_read()`, `flow_brand_prompt(request, kind, ratio, exclude?)`
- `flow_brand_tokens(group?)`, `flow_brand_add_logo(sourceFile, name?)`

## Credits

50 free per day. One image = 1 credit. Video costs more.

Check with `flow_status` before a large batch. Never start a video generation without the user saying so.

## File layout

```
fastfree_mcp_tools/fastfree_flow_mcp/output/YYYY-MM-DD/
  142310-blue-logo-for-acme-1.jpg
  142310-blue-logo-for-acme-2.jpg
  142310-blue-logo-for-acme-preview.png
```

- Images are named by time and a slug of the prompt
- `-preview.png` is a screenshot of the Flow page after generation
- Absolute paths are returned in the tool response — use those, don't guess

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `No browser on CDP port 9222` | browser not running | `flow_launch`, or `scripts\launch.cmd` |
| `authenticated: false` | Google signed out | sign in through the browser window, then `flow_status` |
| `accountWarning` present | wrong Google account | expected account is in `FLOW_ACCOUNT` |
| `0 image(s)` | prompt sent but nothing generated | read the preview png — may need re-send |
| tools stopped working | Flow UI changed | `flow_discover_ui`, check the preview |
| screenshots skipped | render never idle | harmless — images still saved |

## Boundaries

- Image generation is fine to run without asking.
- **Video and batch generation need explicit confirmation first** — they cost more.
- Never generate in a loop to "try variations" without telling the user each run costs a credit.