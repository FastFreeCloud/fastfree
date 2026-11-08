#!/usr/bin/env python3
"""FastFree GitHub/CI Manager Bot — Tracks PRs, issues, CI workflows."""
import subprocess, json, sys

def gh(cmd):
    try:
        r = subprocess.run(f"gh {cmd}", shell=True, capture_output=True, text=True, timeout=30)
        return r.stdout.strip() if r.returncode == 0 else f"Error: {r.stderr.strip()}"
    except Exception as e:
        return f"Error: {e}"

def run():
    print("=== FastFree GitHub/CI Manager ===\n")
    
    print("📋 Open PRs:")
    print(gh("pr list --limit 10"))
    
    print("\n📌 Open Issues:")
    print(gh("issue list --limit 10"))
    
    print("\n🔄 Recent CI Runs:")
    print(gh("run list --limit 5"))
    
    print("\n📊 Repo Info:")
    print(gh("repo view --json name,description,defaultBranchRef,visibility"))

if __name__ == "__main__":
    run()
