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
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastfree_task_groups import group_audience, group_safety, group_simple

# Windows console is cp1252: Arabic log text (patterns, step msgs) crashes
# print/logging with UnicodeEncodeError. Force UTF-8 with replacement.
for _stream in (sys.stdout, sys.stderr):
    _reconf = getattr(_stream, "reconfigure", None)
    if callable(_reconf):
        try:
            _reconf(encoding="utf-8", errors="replace")
        except Exception:
            pass

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AUTH_DIR = REPO_ROOT / ".auth" / "play-console"
DEV_ID = "7269125617638997236"
CDP = "http://127.0.0.1:9222"

# ── low-footprint mode (default ON; FASTFREE_LOW_FOOTPRINT=0 disables) ─────────
# Play Console throttles sustained automation (HTTP 429). Every page load pulls
# images/media/fonts that our questionnaire flows never need (form JS, XHR and
# stylesheets are kept; input[type=file] uploads are DOM ops, unaffected), so we
# route-abort those classes on the single driver page. TASK_PACE_SECS spaces the
# 11 sequential tasks; per-navigation pacing lives in the group modules' pace().

LOW_FOOTPRINT = os.environ.get("FASTFREE_LOW_FOOTPRINT", "1") != "0"


def _env_secs(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


TASK_PACE_SECS = _env_secs("FASTFREE_TASK_PACE_SECS", 8.0)

_BLOCKED_RESOURCE_TYPES = frozenset({"image", "media", "font"})


def arm_low_footprint(page) -> None:
    """Abort heavy subresources only when explicitly enabled.

    Default OFF: a no-image waterfall is itself a bot tell and buys little
    quota (research 2026-09-15). Enable with FASTFREE_BLOCK_RESOURCES=1.
    Pacing/backoff (LOW_FOOTPRINT) stays independent and default-ON.
    """
    if not (LOW_FOOTPRINT and os.environ.get("FASTFREE_BLOCK_RESOURCES", "0") != "0"):
        return
    try:
        if getattr(page, "_fastfree_low_fp", False):
            return

        def _block(route) -> None:
            try:
                if route.request.resource_type in _BLOCKED_RESOURCE_TYPES:
                    route.abort()
                else:
                    route.continue_()
            except Exception:
                try:
                    route.continue_()
                except Exception:
                    pass

        page.route("**/*", _block)
        page._fastfree_low_fp = True
    except Exception:
        pass


def pace(page, secs: float) -> None:
    """Single pacing helper: fixed CDP-side sleep (falls back to time.sleep)."""
    try:
        page.wait_for_timeout(int(secs * 1000))
    except Exception:
        time.sleep(secs)

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

    lock_file = AUTH_DIR / f"{key}.run.lock"
    try:
        other_pid = int(lock_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        other_pid = None
    if other_pid is not None:
        try:
            os.kill(other_pid, 0)
        except Exception:
            other_pid = None  # stale lock (dead/recycled pid)
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
            # Explicit timeout: a wedged browser accepts TCP but never
            # finishes the WS handshake (default would hang 180s).
            browser = playwright.chromium.connect_over_cdp(CDP, timeout=25000)
            context = browser.contexts[0]
            page = context.new_page()
            arm_low_footprint(page)
            ran_any = False
            for tasks, label in ORDER:
                if label in done:
                    print(f"[{key}] task already done — skipping: {label}")
                    continue
                if ran_any:
                    pace(page, TASK_PACE_SECS)  # global gap between tasks (default 8s)
                print(f"[{key}] task: {label}")
                tasks[label](page, ctx)
                ran_any = True
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
