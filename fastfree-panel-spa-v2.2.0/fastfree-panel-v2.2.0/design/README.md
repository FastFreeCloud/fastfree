# Design reference (17 screens, English + Arabic)

The initial/landing screen is `Main.dc.html` (Machines / الأجهزة). The design canvas order begins with Machines, then Overview.

The Login screen has been deleted by design decision: do not recreate `Login.dc.html`, a Login route, or a token form. This is a UI decision only; protect the API at the server/reverse proxy.

The remaining `*.dc.html` files are visual mockups with sample data. They are references, not application components to copy. Rebuild them with Quasar components (QLayout, QTable, QBtn, QBadge, QBanner, etc.).

- `canvas.json` records the 17 screens and order.
- Labels remain bilingual: English with Arabic beside it.
- Colors: bg #12161B, panel #1A2027, border #2A323B, text #E6EAEE, muted #8B97A3, ok #5CC8A1, error #E5776B, info #6AA9FF, warn #E0B35A.
- Fonts: IBM Plex Sans, IBM Plex Sans Arabic, IBM Plex Mono.
- Do not rely on color alone for status; also show descriptive text.
- Keep each screen verification badge (Documented, Partly verified or App design) until verified against real output.
