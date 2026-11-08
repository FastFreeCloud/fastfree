#!/usr/bin/env python3
"""FastFree Design Auditor Bot — Checks design tokens, colors, fonts, RTL, borders."""
import os, re, sys

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"

def audit_colors():
    """Find color definitions across apps."""
    colors = {}
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist")]
        for f in files:
            if f.endswith((".css", ".scss", ".vue", ".ts", ".js")):
                path = os.path.join(root, f)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                    for m in re.finditer(r'#[0-9a-fA-F]{3,8}', content):
                        c = m.group(0).lower()
                        colors[c] = colors.get(c, 0) + 1
                except: pass
    return colors

def audit_fonts():
    """Find font families."""
    fonts = set()
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist")]
        for f in files:
            if f.endswith((".css", ".scss", ".vue", ".ts")):
                path = os.path.join(root, f)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                    for m in re.finditer(r'font-family\s*:\s*([^;]+)', content):
                        fonts.add(m.group(1).strip())
                except: pass
    return fonts

def audit_rtl():
    """Count logical vs physical CSS props."""
    logical = 0
    physical = 0
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist")]
        for f in files:
            if f.endswith((".css", ".scss", ".vue")):
                path = os.path.join(root, f)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                    logical += len(re.findall(r'(margin-inline|padding-inline|border-inline|inset-inline|start|end)', content))
                    physical += len(re.findall(r'(margin-left|margin-right|padding-left|padding-right|border-left|border-right)', content))
                except: pass
    return logical, physical

def audit_tokens():
    """Check if tokens.css is imported."""
    imported = False
    for root, dirs, files in os.walk(PROJECT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist")]
        for f in files:
            if f in ("main.ts", "App.vue", "quasar.config.ts"):
                path = os.path.join(root, f)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                    if "tokens" in content.lower():
                        imported = True
                except: pass
    return imported

def run_audit():
    print("=== FastFree Design Audit ===\n")
    
    # Colors
    colors = audit_colors()
    print("🎨 Top Colors:")
    for c, n in sorted(colors.items(), key=lambda x: -x[1])[:10]:
        print(f"  {c}: {n} occurrences")
    
    # Fonts
    fonts = audit_fonts()
    print(f"\n🔤 Fonts found: {len(fonts)}")
    for f in list(fonts)[:5]:
        print(f"  - {f}")
    
    # RTL
    log, phy = audit_rtl()
    print(f"\n📐 RTL: logical={log}, physical={phy}")
    if phy > log:
        print("  ⚠️  More physical props than logical — RTL needs work")
    
    # Tokens
    imported = audit_tokens()
    print(f"\n🎨 tokens.css imported: {'✅ Yes' if imported else '❌ No (score 3/10)'}")
    
    # Score
    score = 3
    if imported: score += 2
    if log > phy: score += 2
    if len(fonts) <= 3: score += 1
    print(f"\n📊 Design Score: {score}/10")

if __name__ == "__main__":
    run_audit()
