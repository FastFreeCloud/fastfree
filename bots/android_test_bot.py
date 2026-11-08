#!/usr/bin/env python3
"""FastFree Android Test Bot — Uses Google Artemis for Android E2E testing."""
import os, sys, subprocess

PROJECT = r"C:\Users\FastFree\Desktop\fastfree"
ARTEMIS = r"C:\Users\FastFree\artemis"

# Use Python 3.15 for artemis_client
PYTHON_315 = r"C:\Python315\python.exe"

def check_artemis():
    print("=== Google Artemis Status ===\n")
    
    # Check if artemis_client is available
    try:
        r = subprocess.run(f"{PYTHON_315} -c \"import artemis_client; print('OK')\"", shell=True, capture_output=True, text=True, timeout=10)
        print(f"  artemis_client: {'✅' if r.returncode == 0 else '❌'}")
    except:
        print("  artemis_client: ❌ (not installed)")
    
    # Check MCP server
    mcp_path = os.path.join(ARTEMIS, "mcp_server")
    print(f"  MCP server: {'✅' if os.path.exists(mcp_path) else '❌'} {mcp_path}")
    
    # Check Android apps
    android_apps = []
    for root, dirs, files in os.walk(PROJECT):
        if "src-capacitor" in root and "android" in root:
            android_apps.append(os.path.relpath(root, PROJECT))
    print(f"\n  Android apps found: {len(android_apps)}")
    for a in android_apps:
        print(f"    - {a}")
    
    # Check if device/emulator is connected
    try:
        r = subprocess.run("adb devices", shell=True, capture_output=True, text=True, timeout=10)
        devices = [l for l in r.stdout.split("\n") if "device" in l.lower() and "List" not in l]
        print(f"\n  ADB devices: {len(devices)}")
        for d in devices:
            print(f"    - {d.strip()}")
    except:
        print("\n  ADB: ❌ not found")

def run_test(app_name, task):
    """Run an Artemis test on a specific app."""
    print(f"\n🤖 Running Artemis test on {app_name}:")
    print(f"   Task: {task}")
    print("   (Requires: artemis server running + Android device connected)")
    print("   Command: python -c \"from artemis_client import ArtemisClient; ...\"")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        app = sys.argv[2] if len(sys.argv) > 2 else "fastfree_erp"
        task = sys.argv[3] if len(sys.argv) > 3 else "Open app and verify home screen"
        run_test(app, task)
    else:
        check_artemis()
