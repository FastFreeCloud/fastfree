# Project Plan �?" FastFree Packages & Clan

## Packages
| Package | Status | Goal |
|---------|--------|------|
| fastfree_clan | In Progress | Clan (Nix) infrastructure management |
| fastfree_hr | Done | HR module (employees, departments, attendance, leave, payroll) |
| fastfree_layout | Done | Layout components |
| fastfree_splash | Done | Splash screen |
| fastfree_accounting | In Progress | Accounting module |
| fastfree_sales | In Progress | Sales module |
| fastfree_purchase | In Progress | Purchase module |
| fastfree_panel | In Progress | Admin panel (Quasar/Vue) |
| fastfree_sdui | In Progress | SDUI (server-driven UI) |

## FastFree Clan �?" Stages
1. **Generate** �?" clan/*.yaml, nix.yaml, flake.nix
2. **Audit** �?" validate YAML
3. **Sync** �?" copy to targets
4. **Run** �?" full workflow
5. **UI** �?" Stac SDUI screens (nodes, users, services, roles)
6. **Testing** �?" unit + integration
7. **Docs** �?" README, architecture

## Agents
- **Hermes:** orchestration, planning, code review
- **OpenCode:** code generation, refactoring
- **OmniRoute:** model routing, cost tracking
- **Obsidian:** knowledge base, notes, Kanban

## How to use
- Agents read/write Obsidian via OmniRoute MCP tools.
- Kanban board tracks tasks (FastFree Clan Kanban.md).
- Git plugin commits/pushes changes to GitHub.