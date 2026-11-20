# OmniRoute — OpenCode Integration

## Two Official Paths
1. **CLI generator:** `omniroute config opencode --base-url http://127.0.0.1:20128 --api-key $KEY`
2. **npm package:** `@omniroute/opencode-provider` or `@omniroute/opencode-plugin-v2`

## Resulting Config (provider.omniroute)
```jsonc
{
  "npm": "@ai-sdk/openai-compatible",
  "options": { "baseURL": "http://127.0.0.1:20128/v1", "apiKey": "<key>" },
  "models": { "auto": { "name": "Auto-Combo" }, ... }
}
```

## URL Normalisation
baseURL must end with /v1 exactly once (no /v1/v1).

## Auth
- REQUIRE_API_KEY=true → use real key from dashboard
- REQUIRE_API_KEY=false → use literal "sk_omniroute"

## OpenCode v2 Plugin
- Package: @omniroute/opencode-plugin-v2
- Options: providerId, baseURL, apiKey, managementReadToken
- Models appear as omniroute/<provider>/<model>

## Verified
- `opencode run -m omniroute/auto` → OK
