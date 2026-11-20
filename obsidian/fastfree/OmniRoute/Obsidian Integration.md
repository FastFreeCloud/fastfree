# OmniRoute — Obsidian Integration

## Official Integration: Obsidian Context Source
OmniRoute reads/writes Obsidian vault (Markdown) via Local REST API plugin.

## Setup
1. Install Obsidian + Local REST API plugin (coddingtonbear).
2. Enable HTTP server on port 27123 (NOT 27124).
3. Copy API key.
4. In OmniRoute: Context Sources → Obsidian:
   - Base URL: http://host.docker.internal:27123
   - Token: <obsidian-rest-api-key>
5. Or via API: POST /api/settings/obsidian

## Verified
- connected: true
- obsidian_check_status → OK, authenticated: true
- obsidian_list_vault → ["Welcome to FastFree AI.md"]

## 22 MCP Tools
### Read (13): check_status, list_vault, read_note, search_simple, search_structured, get_document_map, get_note_metadata, get_active_file, get_periodic_note, get_tags, list_commands, sync_status, sync_conflicts
### Write (9): write_note, append_note, patch_note, delete_note, move_note, execute_command, open_file, sync_trigger, sync_resolve_conflict

## Using Obsidian AI Plugins
- Base URL: http://127.0.0.1:20128/v1
- API Key: sk-0957e9d5e10beed4-73a7c1-2dd81e90
- Model: omniroute/auto
