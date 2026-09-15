"""Setup-tasks runner: 11 Play Console questionnaires per app (attached browser only).

Usage (repo root):
  uv run --project scripts/fastfree-android scripts/fastfree-android/fastfree_setup_tasks.py --app erp

Requires: CentBrowser open with --remote-debugging-port=9222
  (CENTBROWSER_ATTACH=1 semantics — never launches its own browser).
One driver per app: refuses to start if <key>.run.lock is held (same lock
as the fastfree_console_*_setup.py scripts).
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastfree_task_groups import group_audience, group_safety, group_simple

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AUTH_DIR = REPO_ROOT / ".auth" / "play-console"
DEV_ID = "7269125617638997236"
CDP = "http://127.0.0.1:9222"

APPS = {
    "pos": ("FastFree POS", "com.fastfree.pos"),
    "erp": ("FastFree ERP", "com.fastfree.erp"),
    "hr": ("FastFree HR", "com.fastfree.hr"),
    "ledger": ("FastFree Ledger", "com.fastfree.ledger"),
}

ORDER = [
    (group_simple.TASKS, "Ads"),
    (group_simple.TASKS, "Government apps"),
    (group_simple.TASKS, "Financial features"),
    (group_simple.TASKS, "Health"),
    (group_simple.TASKS, "Set privacy policy"),
    (group_simple.TASKS, "Select an app category and provide contact details"),
    # Sign-in gates Target audience (console blocks the questionnaire until done).
    (group_safety.TASKS, "Sign in details"),
    (group_audience.TASKS, "Target audience"),
    (group_audience.TASKS, "Content rating"),
    (group_safety.TASKS, "Data safety"),
    (group_safety.TASKS, "Set up your store listing"),
]


def load_app_ids() -> dict:
    ids_file = AUTH_DIR / "app-ids.json"
    return json.loads(ids_file.read_text(encoding="utf-8")) if ids_file.exists() else {}


def load_progress(key: str) -> dict:
    progress_file = AUTH_DIR / f"{key}.tasks.json"
    if progress_file.exists():
        try:
            return json.loads(progress_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"tasks": {}}


def mark_done(progress: dict, key: str, label: str) -> None:
    progress.setdefault("tasks", {})[label] = True
    (AUTH_DIR / f"{key}.tasks.json").write_text(json.dumps(progress, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Play Console setup questionnaires")
    parser.add_argument("--app", required=True, choices=sorted(APPS))
    args = parser.parse_args()
    key = args.app
    name, package = APPS[key]
    app_id = load_app_ids().get(key)
    if not app_id:
        print(f"[{key}] no app id in app-ids.json — run the console setup first")
        return 1
    ctx = {"KEY": key, "NAME": name, "PACKAGE": package, "APP_ID": app_id, "DEV_ID": DEV_ID}

    import os

    lock_file = AUTH_DIR / f"{key}.run.lock"
    try:
        other_pid = int(lock_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        other_pid = None
    if other_pid is not None:
        try:
            os.kill(other_pid, 0)
        except OSError:
            other_pid = None
        else:
            print(f"[{key}] another run is active (pid={other_pid}) — refusing a second driver")
            return 2
    lock_file.write_text(str(os.getpid()), encoding="utf-8")

    from playwright.sync_api import sync_playwright

    progress = load_progress(key)
    done = set(progress.get("tasks", {}))
    print(f"[{key}] setup tasks for {name} ({len(done)}/{len(ORDER)} done)")
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(CDP)
            context = browser.contexts[0]
            page = context.new_page()
            for tasks, label in ORDER:
                if label in done:
                    print(f"[{key}] task already done — skipping: {label}")
                    continue
                print(f"[{key}] task: {label}")
                tasks[label](page, ctx)
                mark_done(progress, key, label)
                print(f"[{key}] task DONE: {label}")
    finally:
        try:
            if lock_file.read_text(encoding="utf-8").strip() == str(os.getpid()):
                lock_file.unlink()
        except OSError:
            pass
    pending = [label for _, label in ORDER if label not in progress.get("tasks", {})]
    if pending:
        print(f"[{key}] PENDING tasks (re-run to complete): {pending}")
    else:
        print(f"[{key}] ALL 11 TASKS DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
