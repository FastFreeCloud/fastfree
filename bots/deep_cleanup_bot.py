#!/usr/bin/env python3
"""FastFree Project Deep Cleanup Bot — Finds duplicates, large files, unused deps, empty dirs, and .gitignore violations."""
import os, sys, json, hashlib
from collections import defaultdict

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"

def find_duplicate_content():
    """Find files with identical content."""
    hashes = defaultdict(list)
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        for f in files:
            path = os.path.join(root, f)
            try:
                with open(path, "rb") as fh:
                    h = hashlib.md5(fh.read()).hexdigest()
                hashes[h].append(os.path.relpath(path, PROJECT))
            except:
                pass
    return {h: paths for h, paths in hashes.items() if len(paths) > 1}

def find_large_files(threshold_mb=5):
    """Find files larger than threshold."""
    large = []
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        for f in files:
            path = os.path.join(root, f)
            try:
                size = os.path.getsize(path)
                if size > threshold_mb * 1024 * 1024:
                    large.append({"path": os.path.relpath(path, PROJECT), "size_mb": round(size/1024/1024, 1)})
            except:
                pass
    return sorted(large, key=lambda x: -x["size_mb"])

def find_gitignore_violations():
    """Find files that should be in .gitignore but aren't."""
    violations = []
    patterns = [".env", ".env.local", ".env.production", "*.log", "*.tmp", "*.bak", "*.swp", "Thumbs.db", ".DS_Store"]
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        for f in files:
            if any(f == p or f.endswith(p.replace("*", "")) for p in patterns if "*" in p) or f in patterns:
                violations.append(os.path.relpath(os.path.join(root, f), PROJECT))
    return violations

def find_empty_and_small_dirs():
    """Find empty or near-empty directories."""
    empty = []
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        if not dirs and not files:
            empty.append(os.path.relpath(root, PROJECT))
    return empty

def find_unused_package_json():
    """Find package.json files that might be unused."""
    unused = []
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        if "package.json" in files:
            path = os.path.join(root, "package.json")
            rel = os.path.relpath(path, PROJECT)
            # Check if it's a real package (has name and scripts)
            try:
                with open(path) as f:
                    import json as j
                    data = j.load(f)
                if not data.get("name") and not data.get("scripts"):
                    unused.append(rel)
            except:
                pass
    return unused

def run():
    print("=== FastFree Deep Cleanup Bot ===\n")
    
    # 1. Duplicate content
    dupes = find_duplicate_content()
    print(f"🔄 Duplicate Content Files: {len(dupes)}")
    for h, paths in list(dupes.items())[:5]:
        print(f"  [{len(paths)} copies] {paths[0]}")
        for p in paths[1:]:
            print(f"    → {p}")
    
    # 2. Large files
    large = find_large_files(5)
    print(f"\n📦 Large Files (>5MB): {len(large)}")
    for f in large:
        print(f"  [{f['size_mb']} MB] {f['path']}")
    
    # 3. .gitignore violations
    violations = find_gitignore_violations()
    print(f"\n⚠️ .gitignore Violations: {len(violations)}")
    for v in violations[:10]:
        print(f"  {v}")
    
    # 4. Empty dirs
    empty = find_empty_and_small_dirs()
    print(f"\n📂 Empty Directories: {len(empty)}")
    for e in empty[:10]:
        print(f"  {e}")
    
    # 5. Unused package.json
    unused = find_unused_package_json()
    print(f"\n📦 Suspicious package.json: {len(unused)}")
    for u in unused[:10]:
        print(f"  {u}")
    
    # Save report
    report = {
        "duplicate_content": {h: paths for h, paths in list(dupes.items())[:20]},
        "large_files": large,
        "gitignore_violations": violations,
        "empty_dirs": empty,
        "suspicious_packages": unused,
    }
    with open(os.path.join(PROJECT, "DEEP_CLEANUP_REPORT.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\n📊 Report saved: DEEP_CLEANUP_REPORT.json")

if __name__ == "__main__":
    run()
