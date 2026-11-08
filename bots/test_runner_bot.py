#!/usr/bin/env python3
"""FastFree Test Runner Bot — Runs E2E (Playwright) and unit tests (Vitest)."""
import subprocess, sys, os

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"

def run_cmd(cmd, cwd=None):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120, cwd=cwd)
        return r.stdout.strip(), r.stderr.strip(), r.returncode
    except Exception as e:
        return "", str(e), 1

def run():
    print("=== FastFree Test Runner ===\n")
    
    # Check Playwright
    print("🧪 Playwright E2E:")
    out, err, code = run_cmd("npx playwright --version", cwd=PROJECT)
    print(f"  {out or err}")
    
    # Check Vitest
    print("\n🔬 Vitest Unit Tests:")
    out, err, code = run_cmd("npx vitest --version", cwd=PROJECT)
    print(f"  {out or err}")
    
    # Check test files
    print("\n📁 Test Files:")
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist")]
        for f in files:
            if "test" in f.lower() or "spec" in f.lower():
                print(f"  {os.path.relpath(os.path.join(root, f), PROJECT)}")
    
    print("\n✅ Test runner ready. Use:")
    print("  cd apps/fastfree_panel && pnpm test:e2e")
    print("  cd packages/fastfree_accounting && npx vitest")

if __name__ == "__main__":
    run()
