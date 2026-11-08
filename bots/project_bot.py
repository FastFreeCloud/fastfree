#!/usr/bin/env python3
"""FastFree Project Bot — Understands and explains the project."""
import json, os, sys

KB_PATH = os.path.join(os.path.dirname(__file__), "PROJECT_KNOWLEDGE_BASE.md")

def load_kb():
    with open(KB_PATH, "r", encoding="utf-8") as f:
        return f.read()

def answer(question):
    kb = load_kb()
    q = question.lower()
    
    if "تطبيق" in q or "app" in q:
        return """FastFree has 9 applications:
1. fastfree_erp — Full ERP (Vue+TS, Quasar)
2. fastfree_hr — HR + CRM
3. fastfree_ledger — Accounting + Sales + Inventory
4. fastfree_pos — Point of Sale
5. fastfree_panel — Quasar SPA + Node backend (Clan CLI)
6. fastfree_installer — Tauri desktop installer
7. fastfree_website — Next.js website
8. fastfree_backend — Frappe (Python) backend
9. fastfree_os — NixOS deployment config"""
    
    elif "حزمة" in q or "package" in q:
        return """FastFree has 9 reusable packages:
1. fastfree_accounting — Chart of Accounts, Journal Entries, Payments, Ledger
2. fastfree_auth — Authentication, permissions, license
3. fastfree_crm — CRM module
4. fastfree_hr — HR module
5. fastfree_inventory — Products, Warehouses, Stock Entries
6. fastfree_lowcode — Low-code engine (Window Manager, CRUD Table, Dynamic Form)
7. fastfree_purchase — Purchase Management
8. fastfree_sales — Sales module
9. fastfree_update — Quasar App Extension"""
    
    elif "مرحلة" in q or "phase" in q:
        return """8 Development Phases:
1. Codebase Inspection (pygount → LOC, languages)
2. Design Audit (tokens, colors, fonts, RTL → fix score 3/10)
3. Delegation (OpenCode workers for parallel tasks)
4. GitHub Integration (PRs, issues, CI monitoring)
5. Testing (Playwright E2E + Vitest unit)
6. Notifications (Telegram for build/PR/design status)
7. Research (Frappe/Quasar/Vue documentation)
8. Memory (store architecture conventions)"""
    
    elif "bot" in q or "بوت" in q:
        return """5 Bots for Project Understanding:
1. Code Inspector — LOC, languages, file counts
2. Design Auditor — colors, fonts, RTL, borders (score 3/10)
3. Architecture Mapper — dependency graph
4. GitHub/CI Manager — PRs, issues, workflows
5. Test Runner — Playwright E2E + Vitest"""
    
    elif "هدف" in q or "goal" in q:
        return """Goal: Develop FastFree ERP — Full Enterprise Resource Planning system.
- Frontend: Quasar (Vue 3 + TypeScript)
- Backend: Frappe (Python)
- Packages: 9 reusable modules
- Apps: 9 applications
- Tools: MCP servers, GitHub CI, Playwright testing"""
    
    elif "مسار" in q or "path" in q:
        return "Project path: C:\\Users\\FastFree\\Desktop\\fastfree"
    
    else:
        return f"Knowledge base loaded ({len(kb)} chars). Ask about: apps, packages, phases, bots, goal, or path."

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(answer(" ".join(sys.argv[1:])))
    else:
        print("Usage: python project_bot.py <question>")
        print("Example: python project_bot.py 'كم تطبيق'")
        print("\nAvailable topics: apps, packages, phases, bots, goal, path")
