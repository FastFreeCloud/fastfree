# FastFree Board — Integration

## What is fastfree_board?
OpenCode plugin (MCP server) providing a Kanban board for task management.

## Configuration
- MCP server: `plugins/fastfree_board/mcp-server.mjs` (enabled in OpenCode)
- OpenCode config: `~/.config/opencode/opencode.json` → `mcp.fastfree_board`
- Timeout: 300s

## How to Use
- Run: `node plugins/fastfree_board/mcp-server.mjs`
- Or via OpenCode (auto-spawned when needed)

## Relation to Obsidian
- Obsidian Kanban plugin installed (mgmeyers/obsidian-kanban v2.0.51)
- Board note: `FastFree Clan Kanban.md`
- Tasks can be synced between Obsidian Kanban and fastfree board via agents

## Status
- Configured and enabled in OpenCode
- Obsidian Kanban plugin installed
- Integration note created

## Links
- Plugin: plugins/fastfree_board
- Obsidian vault: fastfree/obsidian/fastfree
