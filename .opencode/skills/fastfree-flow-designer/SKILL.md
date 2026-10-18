---
name: fastfree-flow-designer
description: >-
  Visual brand architecture, asset generation, design token retrieval, and automated UI styling
  via the official fastfree_flow_mcp server. Use whenever designing, modifying, or creating UI components,
  dialogs, screens, banners, or visual assets in FastFree Panel, FastFree Website, or Quasar apps.
---

# FastFree Flow Designer Skill

This skill teaches agents how to design on-brand visual interfaces and generate branded assets using `fastfree_flow_mcp`.

## 1. Core Rule: Never Invent Colors or Logos

When creating or refining screens in `apps/fastfree_panel` or packages:
1. **Always query the brand tokens first**:
   Use `flow_brand_tokens(group: "colors")` or `flow_brand_tokens(group: "all")` to retrieve the calibrated color palette, border radii, shadows, and spacing.
2. **Never hardcode arbitrary colors**:
   Use standard CSS variables (`--lc-primary`, `--lc-surface`, `--lc-on-surface`, `--q-primary`, etc.) aligned with the FastFree Brand System.

## 2. Using Brand Prompts for Asset Generation

When the user asks for a logo, banner, illustration, or screenshot:
1. Call `flow_brand_prompt`:
   ```json
   {
     "request": "a modern dark-mode header logo for FastFree Clan OS",
     "kind": "logo",
     "ratio": "16:9"
   }
   ```
2. Feed the output directly into `flow_generate_image` or save the generated asset to `public/assets/` or the appropriate assets folder.

## 3. UI Consistency Checklist

Before concluding any visual change:
- [ ] High contrast maintained in both Dark and Light modes (AAA compliance).
- [ ] No raw English hardcoded strings where Arabic RTL translations are required.
- [ ] Icons use official `mdi-` set (Material Design Icons) via Quasar icon components.
- [ ] Elevation and glassmorphism match `--lc-dock-bg` and backdrop-filter tokens.
