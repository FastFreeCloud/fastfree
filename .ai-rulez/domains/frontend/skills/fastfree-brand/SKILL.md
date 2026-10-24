---
name: fastfree-brand
description: Master brand identity, color palettes, vector assets, logos, and Google Play Store specifications for FastFree apps.
targets:
  - antigravity
  - opencode
  - claude
---

# FastFree Brand Identity & Asset System

This skill serves as the single authoritative source of truth for the FastFree visual identity across all web and mobile apps.

## Master Brand Palette
- **Primary Cyber Blue**: `#2563EB`
- **Secondary Neon Cyan**: `#00F0FF`
- **Accent Radiant Amber**: `#F59E0B`
- **Dark Void Slate**: `#0B0F19`
- **Surface Elevation**: `#111827`
- **Text Main**: `#F8FAFC`
- **Text Muted**: `#94A3B8`

## Files & References
- `brand.json`: Machine-readable metadata, color tokens, and screen catalogues for all 6 FastFree apps (`website`, `panel`, `ledger`, `erp`, `hr`, `pos`).
- `BRAND_VISUAL_SPEC.md`: In-depth visual style guide, gradients, typography, and elevation layers.
- `ANDROID_PLAY_STORE_SPEC.md`: Google Play Console listing metadata, short descriptions, and graphic asset dimensions.
- `assets/`: Master vector SVG definitions for Infinity Logo, adaptive icons, and splash screens.
- `loader.mjs`: Node.js module to programmatically query brand data and application screens.
