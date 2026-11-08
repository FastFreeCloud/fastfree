#!/usr/bin/env python3
"""FastFree Project Cleanup Bot — Identifies unused files, folders, and unnecessary artifacts."""
import os, sys, json

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"

# Categories of unnecessary files
UNNECESSARY_DIRS = [
    "node_modules", "dist", "build", ".next", "target", ".cache",
    ".turbo", ".nuxt", ".output", "coverage", ".pytest_cache",
    "__pycache__", ".mypy_cache", ".ruff_cache", ".tox",
    "midscene_run", ".worktrees",
]

UNNECESSARY_FILES = [
    "*.log", "*.tmp", "*.bak", "*.old", "*.orig", "*.swp",
    "Thumbs.db", ".DS_Store", "desktop.ini",
]

def scan_unnecessary():
    """Scan for unnecessary directories and files."""
    results = {"dirs": [], "files": [], "large_files": []}
    
    for root, dirs, files in os.walk(PROJECT):
        # Skip .git
        if ".git" in root.split(os.sep):
            continue
        
        # Check for unnecessary directories
        for d in list(dirs):
            if d in UNNECESSARY_DIRS:
                full = os.path.join(root, d)
                # Calculate size
                size = 0
                for r, _, fs in os.walk(full):
                    for f in fs:
                        try:
                            size += os.path.getsize(os.path.join(r, f))
                        except:
                            pass
                results["dirs"].append({
                    "path": os.path.relpath(full, PROJECT),
                    "size_mb": round(size / 1024 / 1024, 1),
                    "reason": f"Build artifact / dependency cache ({d})"
                })
                dirs.remove(d)  # Don't walk into it
        
        # Check for unnecessary files
        for f in files:
            if any(f.endswith(ext.replace("*", "")) for ext in UNNECESSARY_FILES if "*" in ext) or f in UNNECESSARY_FILES:
                full = os.path.join(root, f)
                try:
                    size = os.path.getsize(full)
                    results["files"].append({
                        "path": os.path.relpath(full, PROJECT),
                        "size_kb": round(size / 1024, 1),
                        "reason": "Temporary/backup file"
                    })
                except:
                    pass
            
            # Check for large files (> 5MB) that might be unnecessary
            full = os.path.join(root, f)
            try:
                size = os.path.getsize(full)
                if size > 5 * 1024 * 1024:
                    results["large_files"].append({
                        "path": os.path.relpath(full, PROJECT),
                        "size_mb": round(size / 1024 / 1024, 1),
                        "reason": "Large file (>5MB)"
                    })
            except:
                pass
    
    return results

def find_empty_dirs():
    """Find empty directories."""
    empty = []
    for root, dirs, files in os.walk(PROJECT):
        if ".git" in root.split(os.sep):
            continue
        if not dirs and not files:
            empty.append(os.path.relpath(root, PROJECT))
    return empty

def find_duplicate_files():
    """Find files with same name in multiple locations."""
    from collections import defaultdict
    names = defaultdict(list)
    for root, dirs, files in os.walk(PROJECT):
        if ".git" in root.split(os.sep) or "node_modules" in root.split(os.sep):
            continue
        for f in files:
            names[f].append(os.path.relpath(os.path.join(root, f), PROJECT))
    return {k: v for k, v in names.items() if len(v) > 3}

def run():
    print("=== FastFree Project Cleanup Bot ===\n")
    
    results = scan_unnecessary()
    
    print("🗑️ Unnecessary Directories:")
    total_size = 0
    for d in sorted(results["dirs"], key=lambda x: -x["size_mb"]):
        print(f"  [{d['size_mb']} MB] {d['path']}")
        print(f"    Reason: {d['reason']}")
        total_size += d["size_mb"]
    print(f"\n  Total: {len(results['dirs'])} dirs, {total_size:.1f} MB")
    
    print(f"\n📄 Unnecessary Files: {len(results['files'])}")
    for f in results["files"][:10]:
        print(f"  [{f['size_kb']} KB] {f['path']}")
    
    print(f"\n📦 Large Files (>5MB): {len(results['large_files'])}")
    for f in results["large_files"][:10]:
        print(f"  [{f['size_mb']} MB] {f['path']}")
    
    empty = find_empty_dirs()
    print(f"\n📂 Empty Directories: {len(empty)}")
    for e in empty[:10]:
        print(f"  {e}")
    
    dupes = find_duplicate_files()
    print(f"\n🔄 Duplicate File Names (>3 copies): {len(dupes)}")
    for name, paths in list(dupes.items())[:5]:
        print(f"  {name}: {len(paths)} copies")
    
    print(f"\n📊 Summary:")
    print(f"  Unnecessary dirs: {len(results['dirs'])} ({total_size:.1f} MB)")
    print(f"  Unnecessary files: {len(results['files'])}")
    print(f"  Large files: {len(results['large_files'])}")
    print(f"  Empty dirs: {len(empty)}")
    print(f"  Duplicate names: {len(dupes)}")
    
    # Save results
    with open(os.path.join(PROJECT, "CLEANUP_REPORT.json"), "w", encoding="utf-8") as f:
        json.dump({"dirs": results["dirs"], "files": results["files"], 
                   "large_files": results["large_files"], "empty_dirs": empty,
                   "duplicates": {k: v for k, v in list(dupes.items())[:20]}}, f, indent=2)
    print("\n  Report saved: CLEANUP_REPORT.json")

if __name__ == "__main__":
    run()
