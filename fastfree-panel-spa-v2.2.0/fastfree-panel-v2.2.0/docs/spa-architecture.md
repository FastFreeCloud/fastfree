# Fastfree Panel SPA Architecture

**Status:** proposed architecture for implementation; not yet verified against the user's live application repository.

## Decision

- Package name: `fastfree` (lowercase) in root `package.json`.
- First/default UI route: `/machines`. Machines is the landing screen; Overview is secondary.
- Login screen is deleted and must not be recreated. API authorization remains mandatory on the server or trusted reverse proxy.

Use a Quasar SPA for the browser interface and a separate Node.js API process for privileged Clan CLI access. SPA is a frontend rendering/deployment mode, not a replacement for a backend.

```text
Browser
  | HTTPS, same origin
  v
Reverse proxy / local web server
  |-- /          -> Quasar static files (dist/spa)
  |-- /api/*     -> private Node API (loopback)
                         |-- auth + request validation
                         |-- fixed command allowlist
                         |-- execFile/spawn (no shell)
                         |-- Clan CLI + CLAN_DIR
                         `-- filtered JSON responses
```

## Why not call Clan from the browser?

- Browsers cannot safely execute the local Clan CLI or access server environment variables.
- Shipping `CLAN_DIR`, a bearer token, SSH credentials, or secret values in frontend assets would expose them to every user who can load the app.
- All authentication, machine validation, command allowlisting, output filtering, timeouts, and authorization must be enforced by the backend. Hiding buttons or guarding routes in Vue is not a security boundary.

## Development

Use the root package name `fastfree` (lowercase). The frontend is SPA-only; run the standard `quasar dev` and `quasar build` commands, not SSR commands. The default initial route must be `/machines`.

1. Start the backend on `127.0.0.1` using the existing Flox environment.
2. Start Quasar in SPA mode using the project's installed CLI/version.
3. Configure the Vite dev-server proxy so `/api` forwards to the backend. Keep frontend API calls relative (`/api/v1/...`) to avoid hardcoded hostnames.
4. Keep the bearer token in server-side environment configuration; never put it in `VITE_*` variables or any variable bundled into client code.

Do not copy a configuration snippet blindly: first inspect the existing Quasar config and adapt the supported `devServer.proxy` syntax for the installed `@quasar/app-vite` version.

## Production

- Run `quasar build`; Quasar's default SPA output is `dist/spa` unless `build.distDir` has been changed.
- Serve static assets through a maintained HTTP server/reverse proxy.
- Forward `/api/` to the private backend on loopback. Prefer a same-origin setup so the browser does not need broad CORS permissions.
- Use HTTPS for remote access, restrict network exposure, and configure security headers and rate limits.
- If Vue Router uses history mode, configure the static server to fall back to `index.html` for application routes. Hash mode can avoid that fallback requirement but changes URL shape.
- Never expose the backend port publicly just because the SPA is public.

## API contract (initial read-only scope)

- `GET /api/v1/health` — process health only; must not leak paths or environment values.
- `GET /api/v1/global/show` — filtered output of verified `clan show`.
- `GET /api/v1/machines` — machine identifiers and safe metadata from verified inventory output.

All API endpoints except an explicitly public liveness endpoint must require authentication, supplied by the trusted reverse proxy or server-managed session. No Login route, token form, or browser token storage is part of this UI. Responses use a documented JSON schema, stable error codes, and redacted messages. Machine identifiers must be validated against the current inventory before use in any command.

## Command execution rules

- Fixed command and argument templates only; never accept a command name or arbitrary arguments from the browser.
- Use Node `execFile`/`spawn` with an argument array and no shell.
- Apply execution timeout, output cap, concurrency cap, and safe error handling.
- Parse real command output captured from the exact supported Clan version. Do not guess formats or parse terminal decoration if structured output is available.
- Mask sensitive values on the server before returning data. Never expose raw secret values.
- No state-changing command in the initial read-only API.

## Authentication notes

A bearer token stored in browser storage is exposed to JavaScript running in that origin and can be stolen by an XSS vulnerability. For a strictly local single-operator tool, a manually supplied token may be acceptable as a temporary bootstrap, but production multi-user access should use a reviewed session design (prefer secure, HttpOnly, SameSite cookies), CSRF defenses, identity/authorization, and audit logs. Do not claim token auth alone is a complete production security model.

## Deployment verification checklist

- [ ] `dist/spa` contains no `CLAN_DIR`, `CLAN_PANEL_TOKEN`, private key, or raw secret.
- [ ] Backend binds to loopback unless an explicitly reviewed network design says otherwise.
- [ ] Reverse proxy serves SPA and forwards only `/api/` to backend.
- [ ] Invalid/missing credentials are rejected; logs never include credentials.
- [ ] Arbitrary commands and unvalidated machine names are rejected.
- [ ] API errors do not return raw stderr, stack traces, or sensitive filesystem paths.
- [ ] History-mode fallback is configured if needed.
- [ ] HTTPS, firewall, rate limiting, request-size limits, and service supervision are documented for remote deployments.
