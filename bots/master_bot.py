#!/usr/bin/env python3
"""FastFree Master Bot — Orchestrates all tools: JCodeMunch, gstack, ai-rulez, gbrain, Hono, Omnigent."""
import os, sys, subprocess, json

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"
TOOLS = {
    "jcodemunch": r"C:\Users\FastFree\jcm",
    "gstack": r"C:\Users\FastFree\gstack",
    "ai-rulez": r"C:\Users\FastFree\AppData\Local\agy\bin\ai-rulez",
    "gbrain": r"C:\Users\FastFree\.bun\bin\gbrain.exe",
    "omnigent": r"C:\Users\FastFree\.local\bin\omnigent",
}

def check_tool(name, path):
    exists = os.path.exists(path)
    print(f"  {'✅' if exists else '❌'} {name}: {path}")
    return exists

def run_ai_rulez():
    """Run ai-rulez validation."""
    print("\n📋 Running ai-rulez validate...")
    r = subprocess.run(f"{TOOLS['ai-rulez']} validate", shell=True, capture_output=True, text=True, cwd=PROJECT, timeout=60)
    print(r.stdout[:500] if r.stdout else r.stderr[:500])

def run_gbrain_status():
    """Check gbrain status."""
    print("\n🧠 gbrain status...")
    env = os.environ.copy()
    env["PATH"] = r"C:\Users\FastFree\.bun\bin" + os.pathsep + env.get("PATH", "")
    r = subprocess.run(f"{TOOLS['gbrain']} --version", shell=True, capture_output=True, text=True, env=env, timeout=15)
    print(f"  {r.stdout.strip() or r.stderr.strip()}")

def run_omnigent_status():
    """Check omnigent status."""
    print("\n🐝 Omnigent status...")
    r = subprocess.run(f"{TOOLS['omnigent']} --version", shell=True, capture_output=True, text=True, timeout=15)
    print(f"  {r.stdout.strip() or r.stderr.strip()}")

def main():
    print("=== FastFree Master Bot ===\n")
    print("🔧 Tool Status:")
    for name, path in TOOLS.items():
        check_tool(name, path)
    
    run_ai_rulez()
    run_gbrain_status()
    run_omnigent_status()
    
    print("\n✅ Master Bot ready. Available commands:")
    print("  python master_bot.py --validate     # Run ai-rulez validation")
    print("  python master_bot.py --gbrain       # Check gbrain memory")
    print("  python master_bot.py --omnigent     # Check omnigent agents")
    print("  python master_bot.py --all          # Run all checks")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == "--validate":
            run_ai_rulez()
        elif arg == "--gbrain":
            run_gbrain_status()
        elif arg == "--omnigent":
            run_omnigent_status()
        elif arg == "--all":
            run_ai_rulez()
            run_gbrain_status()
            run_omnigent_status()
    else:
        main()
