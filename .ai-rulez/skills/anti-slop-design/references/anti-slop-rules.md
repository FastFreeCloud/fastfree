# FastFree Craft & Anti-Slop Reference

Adapted from OpenDesign (`craft/anti-ai-slop.md`) and calibrated for the FastFree Monorepo.

## 1. Visual Hierarchy & Spacing
- Maintain a strict 4px/8px baseline grid.
- All-caps labels require `letter-spacing >= 0.06em`.
- Accent color (`#38BDF8` or `#2563EB`) must not appear more than 2 times per viewport.
- Avoid multi-layer saturated card shadows; use 1px subtle borders (`rgba(255, 255, 255, 0.08)`) with deep dark Mica (`#0B1120`).

## 2. Motion Discipline
- Transitions must use Windows 11 Fluent 2 cubic-bezier: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Never use perpetual spinning animations for passive badges.
- Loading states must use linear shimmer bars or deterministic progress indicators.

## 3. Localization & RTL Precision
- Arabic typography must use `Cairo` or `Segoe UI Variable`.
- Absolute positioning must never hardcode `left` or `right`.
- Always verify mirrored layout under `dir="rtl"`.
