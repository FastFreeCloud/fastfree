#!/usr/bin/env python3
"""FastFree Development Master Bot — Orchestrates all development tools, skills, and subagents."""
import os, sys, json, subprocess
from pathlib import Path

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"
BOTS = os.path.join(PROJECT, "bots")

def run_bot(name):
    """Run a bot and return its output."""
    bot_path = os.path.join(BOTS, name)
    if not os.path.exists(bot_path):
        return f"❌ Bot not found: {name}"
    try:
        result = subprocess.run(
            [sys.executable, bot_path],
            capture_output=True, text=True, timeout=120,
            cwd=PROJECT
        )
        return result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        return f"❌ Error: {e}"

def list_skills():
    """List available Hermes skills for FastFree."""
    skills = [
        "fastfree-development — Develop FastFree ERP: frontend, backend, tests, deploy.",
        "fastfree-hr-development — Develop FastFree HR module: employees, payroll, leave.",
        "fastfree-subagent-development — Subagent-driven dev for FastFree ERP tasks.",
        "project-cleanup — Scan and clean project: unused files, empty dirs.",
        "codebase-inspection — Inspect codebases w/ pygount: LOC, languages, ratios.",
        "systematic-debugging — 4-phase root cause debugging: understand bugs before fixing.",
        "test-driven-development — TDD: enforce RED-GREEN-REFACTOR, tests before code.",
        "requesting-code-review — Pre-commit review: security scan, quality gates, auto-fix.",
        "simplify-code — Parallel 4-agent cleanup of recent code changes.",
        "github — GitHub via gh CLI: PRs, issues, reviews, repos, auth.",
        "telegram-bot — Telegram bot automation via Bot API.",
    ]
    return skills

def show_status():
    """Show project status."""
    print("=== FastFree Development Master Bot ===\n")
    
    # Bots
    bots = sorted(os.listdir(BOTS)) if os.path.exists(BOTS) else []
    print(f"🤖 Bots ({len(bots)}):")
    for b in bots:
        print(f"  ✅ {b}")
    
    # Skills
    skills = list_skills()
    print(f"\n📚 Skills ({len(skills)}):")
    for s in skills:
        print(f"  ✅ {s}")
    
    # Apps
    apps = [d for d in os.listdir(os.path.join(PROJECT, "apps")) 
            if os.path.isdir(os.path.join(PROJECT, "apps", d))]
    print(f"\n📱 Apps ({len(apps)}):")
    for a in apps:
        print(f"  ✅ {a}")
    
    # Packages
    pkgs = [d for d in os.listdir(os.path.join(PROJECT, "packages"))
            if os.path.isdir(os.path.join(PROJECT, "packages", d))]
    print(f"\n📦 Packages ({len(pkgs)}):")
    for p in pkgs:
        print(f"  ✅ {p}")
    
    # Git status
    try:
        result = subprocess.run(["git", "status", "--short"], capture_output=True, text=True, cwd=PROJECT)
        changes = result.stdout.strip().split("\n") if result.stdout.strip() else []
        print(f"\n📊 Git Status: {len(changes)} changed files")
        for c in changes[:10]:
            print(f"  {c}")
    except:
        print("\n📊 Git Status: N/A")

def run_all_bots():
    """Run all bots in sequence."""
    print("=== Running All Bots ===\n")
    bots = sorted(os.listdir(BOTS)) if os.path.exists(BOTS) else []
    for b in bots:
        print(f"\n{'='*50}")
        print(f"Running: {b}")
        print(f"{'='*50}")
        output = run_bot(b)
        print(output[:500])

def main():
    if len(sys.argv) < 2:
        print("Usage: python dev_master_bot.py [status|run-all|list-skills|run <bot>]")
        print("\nCommands:")
        print("  status      — Show project status")
        print("  run-all     — Run all bots")
        print("  list-skills — List available skills")
        print("  run <name>  — Run specific bot")
        return
    
    cmd = sys.argv[1]
    
    if cmd == "status":
        show_status()
    elif cmd == "run-all":
        run_all_bots()
    elif cmd == "list-skills":
        for s in list_skills():
            print(f"  {s}")
    elif cmd == "run":
        if len(sys.argv) < 3:
            print("Usage: python dev_master_bot.py run <bot_name>")
            return
        name = sys.argv[2]
        output = run_bot(name)
        print(output)
    else:
        print(f"Unknown command: {cmd}")

if __name__ == "__main__":
    main()
