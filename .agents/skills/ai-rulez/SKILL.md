---
name: ai-rulez
description: "Use AI-Rulez correctly in user projects, including CLI, MCP, configuration, and generation workflows"
# Content-Hash: blake3:1f14347f9bd2db1bcc9653864b0f1902854dcb7dc2b5d6410b0f2f8cfc33a4dc
---

# AI-Rulez

Use this skill when working in a project that is managed by AI-Rulez.

## Responsibilities

- Detect whether the project uses AI-Rulez (.ai-rulez/config.toml).
- Edit source files in .ai-rulez/ instead of patching generated assistant files directly
- Prefer the AI-Rulez MCP server for safe reads and CRUD operations when it is available
- Use the CLI to validate, generate, and inspect configuration changes
- Keep generated outputs in sync with configuration changes

## Workflow

1. Check for .ai-rulez/config.toml, .ai-rulez/skills/, domain folders.
2. If MCP is configured in the config, prefer the MCP server for reading and modifying AI-Rulez content.
3. Update the relevant source files under .ai-rulez/: rules, context, skills, agents, domains, or config.
4. Run ai-rulez validate when changing configuration structure.
5. Run ai-rulez generate after source changes so assistant-specific outputs stay current.
6. If MCP is available, start it with npx -y ai-rulez@latest mcp (or the repo’s helper) and use it for CRUD instead of manual edits when possible.

## Core Commands

- ai-rulez init — scaffold .ai-rulez/ for a project.
- ai-rulez add|remove|list rule|context|skill|agent — manage content files.
- ai-rulez validate — ensure config and tree structure are sound.
- ai-rulez generate [--profile <name>] — render tool presets after edits.
- ai-rulez migrate v5 — rewrite a 4.x configuration for v5.

## Guidelines

- Treat .ai-rulez/ as the source of truth.
- Generated files such as AGENTS.md, CLAUDE.md, or .cursor/ outputs should only change via generation.
- Use ai-rulez init to bootstrap, generate to render outputs, validate to check structure, and migrate v5 to upgrade a 4.x configuration.
- Remember that root content is always included, while domains are controlled by profiles.
- MCP can expose read, CRUD, generate, and validate operations for assistants.
- When changing presets, profiles, or domains in config.toml, rerun validate then generate so downstream files stay in sync.
