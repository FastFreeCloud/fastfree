#!/usr/bin/env bash
set -euo pipefail

# FastFree MCP Synchronizer
# Syncs MCP servers from opencode.json to Antigravity (~/.gemini/config/mcp_config.json)
# Ensures all AI agents running under the Paseo daemon share the exact same MCP toolset.

REPO_ROOT="/home/fastfree/Desktop/fastfree"
OPENCODE_CONFIG="$REPO_ROOT/opencode.json"
GEMINI_MCP_CONFIG="/home/fastfree/.gemini/config/mcp_config.json"

echo "=========================================================="
echo " [FastFree MCP Sync] Unifying MCP servers across AI Agents"
echo "=========================================================="

if [ ! -f "$OPENCODE_CONFIG" ]; then
  echo "❌ Error: $OPENCODE_CONFIG not found."
  exit 1
fi

node - << 'EOF'
const fs = require('fs');
const path = require('path');

const opencodePath = '/home/fastfree/Desktop/fastfree/opencode.json';
const geminiMcpPath = '/home/fastfree/.gemini/config/mcp_config.json';

const opencode = JSON.parse(fs.readFileSync(opencodePath, 'utf-8'));
const mcpServers = {};

for (const [name, conf] of Object.entries(opencode.mcp || {})) {
  if (conf.type === 'remote' || conf.url) {
    mcpServers[name] = { url: conf.url };
  } else {
    const cmdList = conf.command || [];
    if (cmdList.length === 0) continue;
    const command = cmdList[0];
    const args = cmdList.slice(1);
    const serverEntry = { command, args };
    if (conf.environment) {
      serverEntry.env = conf.environment;
    }
    mcpServers[name] = serverEntry;
  }
}

const output = { mcpServers };

fs.mkdirSync(path.dirname(geminiMcpPath), { recursive: true });
fs.writeFileSync(geminiMcpPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ Synced ${Object.keys(mcpServers).length} MCP servers to ${geminiMcpPath}:`);
for (const s of Object.keys(mcpServers)) {
  console.log(`  - ${s}`);
}
EOF

echo "=========================================================="
echo "🎉 MCP configuration successfully synchronized!"
echo "=========================================================="
