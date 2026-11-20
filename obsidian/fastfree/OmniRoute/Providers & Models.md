# OmniRoute — Providers & Models

## Supported Providers
- opencode-go (API key, passthroughModels)
- opencode-zen (API key)
- opencode-server (local v1 only — not compatible with v2.2.6)
- antigravity (OAuth)
- And many more (OpenAI, Anthropic, Gemini, etc.)

## Adding Models
- **Custom models:** POST /api/provider-models {provider, modelId, modelName}
- **Strict validation:** POST /api/provider-models/validate-and-add (runs proofs)
- **Passthrough:** providerSpecificData.passthroughModels=true
- **Sync:** POST /api/providers/{id}/sync-models
- **Combos:** Create in dashboard; use model: "auto" for Auto-Combo
- **Aliases:** modelAliases per provider
- **Hide/Show:** hiddenModelsByProvider

## Current Catalog
- 379+ models (auto/*, opencode-go/*, etc.)
- Custom model added: deepseek-v4.1-flash (DeepSeek V4.1 Flash Custom)
