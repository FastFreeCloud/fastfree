#!/usr/bin/env python3
"""FastFree Architecture Mapper Bot — Maps dependencies between apps and packages."""
import os, re, json, sys

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"

def find_imports():
    """Find package imports across apps."""
    imports = {}
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist", "public")]
        for f in files:
            if f.endswith((".vue", ".ts", ".js")):
                path = os.path.join(root, f)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                    for m in re.finditer(r"from\s+['\"](@fastfree/[\w-]+|fastfree-[\w-]+)['\"]", content):
                        pkg = m.group(1)
                        app = os.path.relpath(root, PROJECT).split(os.sep)[1] if "apps" in root else "root"
                        imports.setdefault(pkg, set()).add(app)
                except: pass
    return imports

def find_apps():
    """List all apps and their type."""
    apps = []
    apps_dir = os.path.join(PROJECT, "apps")
    if os.path.exists(apps_dir):
        for d in os.listdir(apps_dir):
            p = os.path.join(apps_dir, d)
            if os.path.isdir(p):
                has_pkg = os.path.exists(os.path.join(p, "package.json"))
                has_py = os.path.exists(os.path.join(p, "pyproject.toml"))
                apps.append({"name": d, "has_pkg": has_pkg, "has_py": has_py})
    return apps

def find_packages():
    """List all packages."""
    pkgs = []
    pkg_dir = os.path.join(PROJECT, "packages")
    if os.path.exists(pkg_dir):
        for d in os.listdir(pkg_dir):
            p = os.path.join(pkg_dir, d)
            if os.path.isdir(p):
                pkgs.append(d)
    return pkgs

def run_mapper():
    print("=== FastFree Architecture Map ===\n")
    
    apps = find_apps()
    print(f"📱 Apps ({len(apps)}):")
    for a in apps:
        t = "Node" if a["has_pkg"] else ("Python" if a["has_py"] else "Other")
        print(f"  - {a['name']} ({t})")
    
    pkgs = find_packages()
    print(f"\n📦 Packages ({len(pkgs)}):")
    for p in pkgs:
        print(f"  - {p}")
    
    imports = find_imports()
    print(f"\n🔗 Cross-package imports ({len(imports)}):")
    for pkg, apps_set in sorted(imports.items()):
        print(f"  {pkg} → {', '.join(sorted(apps_set))}")

if __name__ == "__main__":
    run_mapper()
