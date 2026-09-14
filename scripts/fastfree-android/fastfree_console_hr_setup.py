"""Play Console bootstrap for FastFree HR — self-contained stage runner.

Stages 0-6: env -> session -> create -> invite SA -> AAB -> first upload -> report.
Usage: uv run fastfree_console_hr_setup.py [--from N] [--only N]
Progress persists in .auth/play-console/hr.progress.json (resume-safe).
Fully independent: shares nothing with the other app files.
"""

import argparse
import json
import logging
import re
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

# ── app config (edit these 6 lines to clone for another app) ──────────────
KEY = "hr"
NAME = "FastFree HR"
PACKAGE = "com.fastfree.hr"
ARTIFACT = "com.fastfree.hr-aab"
WORKFLOW = "11-build-hr-android.yaml"
CONTACT_EMAIL = "sales@fastfree.cloud"
SERVICE_ACCOUNT = "fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com"

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AUTH_DIR = REPO_ROOT / ".auth" / "play-console"
PROFILE_DIR = AUTH_DIR / "profile"
CENT_PROFILE = AUTH_DIR / "profile-cent"
PROGRESS_FILE = AUTH_DIR / f"{KEY}.progress.json"
AAB_PATH = REPO_ROOT / ".auth" / "aabs" / KEY / "app-release.aab"
CONSOLE = "https://play.google.com/console"
LOG_DIR = REPO_ROOT / ".auth" / "logs"


def get_logger() -> logging.Logger:
    """Console + file log: every error lands in .auth/logs with traceback."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger(f"fastfree.console_{KEY}")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(console)
    file_handler = logging.FileHandler(LOG_DIR / f"console_{KEY}.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(file_handler)
    return logger


LOG = get_logger()

NETLOG: list = []
AUTH_COOKIES = {"SID", "HSID", "SSID", "APISID", "SAPISID"}
EXPECTED_DEV_ID = "7269125617638997236"
DEV_URL = f"https://play.google.com/console/u/0/developers/{EXPECTED_DEV_ID}/app-list"
APP_CREATE_URL = f"https://play.google.com/console/u/0/developers/{EXPECTED_DEV_ID}/create-new-app"
USERS_URL = f"https://play.google.com/console/u/0/developers/{EXPECTED_DEV_ID}/users-and-permissions"
GOOGLE_OWNER = "mohamed.fastfree@gmail.com"
DEV_ACCOUNT_NAME = "fastfree.cloud"


def _trim_netlog() -> None:
    del NETLOG[:-50]


def _on_dialog(dialog) -> None:
    LOG.warning("JS dialog (%s): %s — auto-accepting", dialog.type, (dialog.message or "")[:300])
    try:
        dialog.accept()
    except Exception as exc:
        LOG.warning("dialog accept failed: %s", exc)


def _watch_page(page) -> None:
    """Attach console/pageerror listeners + dialog policy to a page."""
    try:
        page.on(
            "console",
            lambda msg: (NETLOG.append(f"console.{msg.type}: {msg.text[:300]}"), _trim_netlog()),
        )
    except Exception:
        pass
    try:
        page.on(
            "pageerror",
            lambda err: (NETLOG.append(f"pageerror: {str(err)[:300]}"), _trim_netlog()),
        )
    except Exception:
        pass
    try:
        page.on("dialog", _on_dialog)
    except Exception:
        pass


def real_login_cookies(context) -> bool:
    """True only with real Google auth cookies (tracking cookies don't count)."""
    try:
        names = {c.get("name", "") for c in context.cookies()}
    except Exception:
        return False
    return bool(AUTH_COOKIES & names)


def assert_developer_access(page) -> None:
    """The logged-in account must open OUR developer app-list (ID-verified)."""
    page.goto(DEV_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)
    found = re.search(r"/developers/(\d+)", page.url)
    actual_id = found.group(1) if found else None
    if actual_id != EXPECTED_DEV_ID:
        try:
            body = page.inner_text("body") or ""
        except Exception:
            body = ""
        if re.search(r"couldn.?t|no access|error|ليس لديك|غير مصرح|404", body, re.I):
            failshot(
                page,
                "wrong-account",
                RuntimeError(
                    "This Google account cannot open Play developer "
                    f"{EXPECTED_DEV_ID} (landed on {actual_id}). "
                    f"Log in with {GOOGLE_OWNER} (the owner), then re-run. " + page_snapshot(page)
                ),
            )
        failshot(
            page,
            "wrong-developer-id",
            RuntimeError(
                f"Developer account is {actual_id}, expected {EXPECTED_DEV_ID}. "
                "Confirm which developer ID owns your apps, update EXPECTED_DEV_ID, re-run. "
                + page_snapshot(page)
            ),
        )
    step(f"developer access confirmed: {EXPECTED_DEV_ID}")


def step(msg: str) -> None:
    print(f"[{datetime.now(UTC).strftime('%H:%M:%S')}] [{KEY}] {msg}", flush=True)
    LOG.info(msg)


def load_progress() -> dict:
    try:
        return json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
    except OSError:
        return {"stages": {}}


def mark_done(progress: dict, stage: int) -> None:
    progress.setdefault("stages", {})[str(stage)] = True
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    PROGRESS_FILE.write_text(json.dumps(progress, indent=2), encoding="utf-8")


def failshot(page, name: str, err: Exception) -> None:
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        stamp = int(time.time() * 1000)
        shot = AUTH_DIR / f"fail-{KEY}-{name}-{stamp}.png"
        page.screenshot(path=str(shot))
        LOG.error("FAIL[%s]: %s\n  url=%s\n  shot=%s", name, err, page.url, shot)
        if NETLOG:
            LOG.error("browser log tail:\n  %s", "\n  ".join(NETLOG[-15:]))
        try:
            trace = AUTH_DIR / f"trace-{KEY}-{name}-{stamp}.zip"
            page.context.tracing.stop_chunk(path=str(trace))
            LOG.error("trace saved: %s", trace)
        except Exception as trace_exc:
            LOG.warning("tracing stop failed: %s", trace_exc)
    except Exception:
        LOG.error("FAIL[%s]: %s", name, err)
    raise err if isinstance(err, Exception) else RuntimeError(str(err))


def click_any(page, patterns: list, desc: str):
    for pattern in patterns:
        for role in ("button", "link"):
            try:
                loc = page.get_by_role(role, name=pattern)
                loc.first.wait_for(state="visible", timeout=4000)
                loc.first.click()
                step(f"clicked {role}: {desc}")
                return
            except Exception:
                continue
        try:
            txt = page.get_by_text(pattern)
            txt.first.wait_for(state="visible", timeout=4000)
            txt.first.click()
            step(f"clicked text: {desc}")
            return
        except Exception:
            continue
    failshot(page, desc, RuntimeError(f"nothing clickable matched: {desc}"))


def try_click(page, patterns: list, desc: str) -> bool:
    for pattern in patterns:
        try:
            btn = page.get_by_role("button", name=pattern)
            btn.first.wait_for(state="visible", timeout=3000)
            btn.first.click()
            step(f"clicked (optional): {desc}")
            return True
        except Exception:
            continue
    return False


def fill_any(page, patterns: list, value: str, desc: str) -> None:
    for pattern in patterns:
        for method in ("label", "placeholder"):
            try:
                field = page.get_by_label(pattern) if method == "label" else page.get_by_placeholder(pattern)
                field.first.wait_for(state="visible", timeout=4000)
                field.first.fill(value)
                step(f"filled: {desc}")
                return
            except Exception:
                continue
    failshot(page, desc, RuntimeError(f"no input matched: {desc}"))


def pick_one(page, role: str, patterns: list, desc: str, action: str = "check") -> None:
    for pattern in patterns:
        try:
            loc = page.get_by_role(role, name=pattern)
            loc.first.wait_for(state="visible", timeout=4000)
            loc.first.check() if action == "check" else loc.first.click()
            step(f"{'checked' if action == 'check' else 'clicked'} {role}: {desc}")
            return
        except Exception:
            continue
    failshot(page, desc, RuntimeError(f"no {role} matched: {desc}"))


def check_row_for_text(page, pattern, desc: str) -> None:
    """Check the (usually unlabeled) checkbox in the same row as visible text.

    Play Console renders checkboxes with empty accessible names next to their
    label text, so get_by_role(name=...) never matches. Find the innermost
    element showing the text, walk up to the nearest row owning a checkbox,
    and check it. (Seen 2026-09-14: invite-stage app picker.)
    """
    try:
        exact = page.get_by_text(pattern, exact=True)
        anchor = exact.first if exact.count() > 0 else page.get_by_text(pattern).last
        anchor.wait_for(state="visible", timeout=5000)
        row = anchor.locator(
            "xpath=ancestor::*[descendant::input[@type='checkbox']"
            " or descendant::*[@role='checkbox']][1]"
        )
        box = row.locator("input[type='checkbox'], [role='checkbox']").first
        box.wait_for(state="visible", timeout=5000)
        if box.get_attribute("type") == "checkbox":
            box.check()
        else:
            box.click()
        step(f"checked row checkbox: {desc}")
        return
    except Exception:
        pass
    failshot(page, desc, RuntimeError(f"no row checkbox found for text: {desc}"))


def open_app_editor(page, pattern, desc: str) -> None:
    """On the user-detail page, open an added app's permission editor via its row arrow.

    Used by the extend flow (SA already a user): no Add-app round-trip needed.
    Raises on failure so callers can fall back to the Add-app path.
    """
    try:
        anchor = page.get_by_text(pattern).first
        anchor.wait_for(state="visible", timeout=8000)
        row = anchor.locator("xpath=ancestor::*[descendant::button][1]")
        btns = row.locator("button")
        btns.last.wait_for(state="visible", timeout=5000)
        btns.last.click()
        step(f"opened permission editor: {desc}")
        return
    except Exception:
        pass
    failshot(page, desc, RuntimeError(f"no app row arrow for: {desc}"))


def session_expired(page) -> bool:
    if "accounts.google.com" in page.url:
        return True
    try:
        return page.get_by_role("button", name=re.compile(r"sign in|تسجيل الدخول", re.I)).count() > 0
    except Exception:
        return False


def stage0_env() -> None:
    """Stage 0: verify CentBrowser + gh CLI (nothing to download)."""
    exe = resolve_browser_exe()
    step(f"browser OK: {exe}")
    proc = subprocess.run(["gh", "--version"], capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError("gh CLI not found (needed for AAB download)")
    step("gh CLI OK")


CDP_PORT = 9222
_BROWSER_PROC = None


def resolve_browser_exe() -> str:
    """Cent Browser only (user choice) — no Chromium fallback."""
    import os

    override = os.environ.get("CENTBROWSER_EXE")
    candidates = [Path(override)] if override else []
    candidates.append(Path(r"C:\Users\fastfree\AppData\Local\CentBrowser\Application") / "chrome.exe")
    for candidate in candidates:
        if candidate.exists():
            step(f"browser: CentBrowser ({candidate})")
            return str(candidate)
    raise RuntimeError(
        "CentBrowser not found. Install it or set CENTBROWSER_EXE to chrome.exe. "
        "Chromium fallback is disabled by user choice."
    )


def _kill_browser() -> None:
    global _BROWSER_PROC
    proc, _BROWSER_PROC = _BROWSER_PROC, None
    if proc is None:
        return
    try:
        proc.terminate()
    except Exception:
        pass


def _port_open() -> bool:
    import socket

    try:
        sock = socket.create_connection(("127.0.0.1", CDP_PORT), timeout=2)
        sock.close()
        return True
    except OSError:
        return False


_ATTACHED = False
_OWN_PAGES: list = []


def _open_attached():
    """Attach to the user's RUNNING CentBrowser (already logged in).

    Requires that browser instance started with --remote-debugging-port=9222.
    Uses its live default context: no new window, no new profile.
    """
    import os
    import time

    from playwright.sync_api import sync_playwright

    global _ATTACHED
    endpoint = os.environ.get("CENTBROWSER_CDP", f"http://127.0.0.1:{CDP_PORT}")
    playwright = sync_playwright().start()
    browser = None
    for _ in range(5):
        try:
            browser = playwright.chromium.connect_over_cdp(endpoint)
            break
        except Exception:
            time.sleep(3)
    if browser is None or not browser.contexts:
        raise RuntimeError(
            "Could not attach to your open CentBrowser. Close it fully, relaunch with "
            '"--remote-debugging-port=9222", then re-run with CENTBROWSER_ATTACH=1.'
        )
    context = browser.contexts[0]
    page = context.new_page()
    _OWN_PAGES.append(page)
    _watch_page(page)
    _ATTACHED = True
    step("attached to your open CentBrowser (live session, no new window)")
    return playwright, context, page


def open_session(headed: bool):
    """Launch CentBrowser as a normal process, drive it over CDP.

    Old Chromium forks crash on Playwright's injected launch flags, so the
    browser starts clean (no automation flags) and Playwright attaches via
    Chrome DevTools Protocol. Always headed: one-time bootstrap on your PC.
    """
    import socket
    import time

    from playwright.sync_api import sync_playwright

    global _BROWSER_PROC, _ATTACHED
    import os

    if os.environ.get("CENTBROWSER_ATTACH") == "1":
        return _open_attached()
    _ = headed  # manual launch is always headed
    exe = resolve_browser_exe()
    # NOTE: CentBrowser gets its OWN fresh profile. The old profile dir was
    # created by newer bundled Chromium (v151) and crashes this old fork.
    CENT_PROFILE.mkdir(parents=True, exist_ok=True)
    if _port_open():
        step("WARNING: port 9222 already in use — a stale browser may hold it")
    launched = False
    last_err: Exception | None = None
    for launch_try in range(1, 4):
        _BROWSER_PROC = subprocess.Popen(
            [
                exe,
                f"--remote-debugging-port={CDP_PORT}",
                f"--user-data-dir={CENT_PROFILE}",
                "--no-first-run",
                "--no-default-browser-check",
            ]
        )
        step(f"CentBrowser starting (pid={_BROWSER_PROC.pid}, try {launch_try}/3) — log in by hand")
        try:
            deadline = time.time() + 60
            while time.time() < deadline:
                try:
                    sock = socket.create_connection(("127.0.0.1", CDP_PORT), timeout=2)
                    sock.close()
                    break
                except OSError:
                    if _BROWSER_PROC.poll() is not None:
                        raise RuntimeError(
                            f"CentBrowser exited immediately (code={_BROWSER_PROC.returncode})"
                        ) from None
                    time.sleep(1)
            else:
                raise RuntimeError("CentBrowser did not open its debugging port in 60s")
            launched = True
            break
        except RuntimeError as exc:
            last_err = exc
            _kill_browser()
            step(f"launch try {launch_try}/3 failed ({exc}); retrying in 5s…")
            time.sleep(5)
    if not launched:
        raise RuntimeError(f"CentBrowser would not stay up after 3 tries: {last_err}")
    playwright = sync_playwright().start()
    browser = None
    for _ in range(3):
        try:
            browser = playwright.chromium.connect_over_cdp(f"http://127.0.0.1:{CDP_PORT}")
            break
        except Exception:
            time.sleep(3)
    if browser is None:
        raise RuntimeError("CDP connect refused after port opened — browser died in between")
    context = browser.contexts[0] if browser.contexts else browser.new_context(locale="en-US")
    try:
        context.tracing.start(screenshots=True, snapshots=True)
    except Exception as exc:
        LOG.warning("tracing start failed: %s", exc)
    page = context.pages[0] if context.pages else context.new_page()
    _watch_page(page)
    try:
        context.on("page", _watch_page)
    except Exception:
        pass
    return playwright, context, page


def page_snapshot(page) -> str:
    """Short text dump for remote diagnosis (URL + visible headings)."""
    try:
        body = (page.inner_text("body") or "").strip().replace("\n", " ")
        return f"url={page.url} text={body[:500]!r}"
    except Exception as exc:
        return f"url=<unreadable> ({exc})"


BLOCKERS = [
    (
        re.compile(r"hasn.?t been registered|غير مسجل|not registered", re.I),
        "Package name is not registered to this developer account "
        "(Google 2026 requirement). Register it in Play Console, then re-run.",
    ),
    (
        re.compile(r"already in use|مستخدم بالفعل|taken|duplicate", re.I),
        "Package name already in use — this package belongs to another app.",
    ),
    (
        re.compile(r"testing requirements|متطلبات الاختبار", re.I),
        "Account testing requirements block this step (closed testing for new "
        "personal accounts). Complete them in the Console, then re-run.",
    ),
]


def check_blockers(page, where: str) -> None:
    """Fail loudly on known Google-side blockers instead of hanging."""
    try:
        body = page.inner_text("body") or ""
    except Exception:
        return
    for pattern, message in BLOCKERS:
        if pattern.search(body):
            failshot(page, where, RuntimeError(message + " " + page_snapshot(page)))


def activate(page) -> None:
    """Bring our tab forward: background tabs get throttled and the Console
    SPA stalls on 'Loading...' forever. Called after every navigation."""
    try:
        page.bring_to_front()
    except Exception:
        pass
    page.wait_for_timeout(1500)
    # Developer chooser (URL has no numeric ID)? Pick ours right away.
    try:
        if re.search(r"/console/developers/?(?:\?.*)?$", page.url or ""):
            step("developer chooser — selecting account")
            click_any(page, [re.compile(r"fastfree\.cloud", re.I)], "select developer account")
            page.wait_for_timeout(5000)
    except Exception:
        pass


def stage1_attached():
    """Use the already-open CentBrowser: verify, or wait for human login in it."""
    playwright, context, page = open_session(headed=True)
    for minute in range(1, 31):
        page.goto(CONSOLE, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)
        if "/console" not in page.url:
            try_click(page, [re.compile(r"go to play console", re.I)], "Go to Play Console")
            page.wait_for_timeout(5000)
        if "/console" in page.url and not session_expired(page) and real_login_cookies(context):
            try:
                assert_developer_access(page)
            except RuntimeError as exc:
                if "cannot open Play developer" in str(exc):
                    raise
                step(f"transient error, retrying… ({exc})")
                page.wait_for_timeout(10000)
                continue
            step("auth OK — attached session verified (auth cookies + developer access)")
            return playwright, context, page
        step(f"not logged in yet (try {minute}/30) — log in to Google in your OPEN CentBrowser window…")
        page.wait_for_timeout(15000)
    failshot(
        page,
        "attach-login-timeout",
        RuntimeError("Google login not completed in ~10 min in the open browser window"),
    )


def stage1_session():
    """Stage 1: reuse saved session; else headed human login (once)."""
    import os

    if os.environ.get("CENTBROWSER_ATTACH") == "1":
        return stage1_attached()
    playwright, context, page = open_session(headed=False)
    page.goto(CONSOLE, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)
    if "/console" not in page.url:
        # Possibly the marketing homepage — try entering before judging session.
        try_click(page, [re.compile(r"go to play console", re.I)], "Go to Play Console")
        page.wait_for_timeout(5000)
    if "/console" in page.url and not session_expired(page) and real_login_cookies(context):
        assert_developer_access(page)
        step("auth OK — saved session is valid (auth cookies + developer access)")
        return playwright, context, page
    playwright.stop()
    step("NO valid session — opening headed browser, LOG IN by hand (owner + 2FA)…")
    playwright, context, page = open_session(headed=True)
    page.goto(CONSOLE, timeout=60000)
    step("waiting for YOU to reach the console (no timeout)…")
    page.wait_for_url(re.compile(r"play\.google\.com/console"), timeout=0)
    page.wait_for_timeout(3000)
    if not real_login_cookies(context):
        failshot(
            page,
            "login-incomplete",
            RuntimeError(
                "Login did not persist: no SID/HSID auth cookies found. "
                "Complete the Google login fully in the open window (including 2FA), "
                "then re-run. " + page_snapshot(page)
            ),
        )
    assert_developer_access(page)
    step("login verified (auth cookies + developer access)")
    return playwright, context, page


def stage2_create(page) -> None:
    """Stage 2: Create app record (skip when already listed).

    No entry loop: we go straight to the create-form deep link. The app-list
    SPA often stalls on 'Loading...' (background throttling) while the form
    page loads fine, so waiting on the list was pure waste.
    """
    step(f"create: {NAME}")
    # Best-effort duplicate check (short budget — the list SPA often stalls).
    try:
        page.goto(CONSOLE, wait_until="domcontentloaded", timeout=30000)
        activate(page)
        if page.get_by_text(NAME, exact=True).count() > 0:
            step(f'"{NAME}" already listed — skipping creation')
            return
    except Exception:
        pass

    # Deep link straight to the create form (no dashboard clicking).
    page.goto(APP_CREATE_URL, wait_until="domcontentloaded", timeout=60000)
    activate(page)
    if "accounts.google.com" in page.url:
        failshot(page, "session-lost", RuntimeError("session expired mid-run — re-run to log in again"))
    try:
        page.wait_for_load_state("networkidle", timeout=45000)
    except Exception:
        pass
    try:
        page.get_by_text(re.compile(r"app name|اسم التطبيق", re.I)).first.wait_for(
            state="visible", timeout=60000
        )
    except Exception as exc:
        failshot(page, "create-form", RuntimeError(f"create form did not load: {exc}"))
    try_click(page, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")

    fill_any(page, [re.compile(r"app name|اسم التطبيق", re.I)], NAME, "app name")
    # Default language: leave the en-US default (Material dropdown, fragile to
    # automate). Arabic + English listings ship later via the Play API.
    step("default language: leaving en-US default")

    pick_one(page, "radio", [re.compile(r"^app$", re.I), re.compile(r"^تطبيق$", re.I)], "type = App")
    pick_one(page, "radio", [re.compile(r"^free$", re.I), re.compile(r"^مجاني$", re.I)], "free")

    # Package name (required on the current form) + availability check.
    fill_any(page, [re.compile(r"package name|اسم الحزمة", re.I)], PACKAGE, "package name")
    click_any(page, [re.compile(r"check availability|التحقق", re.I)], "Check availability")
    page.wait_for_timeout(5000)
    try:
        availability_body = page.inner_text("body") or ""
    except Exception:
        availability_body = ""
    if re.search(r"already in use|مستخدم بالفعل|taken|duplicate", availability_body, re.I):
        # 'taken' usually means OUR previous submit already created this app
        # (the list SPA stalls, so the skip-check misses it). Confirm on the
        # app-list deep link: found => stage complete, skip to invite.
        step("package taken — confirming on the app list whether it is ours…")
        try:
            from playwright.sync_api import expect

            page.goto(DEV_URL, wait_until="domcontentloaded", timeout=60000)
            activate(page)
            try:
                expect(page.get_by_text(NAME, exact=True)).to_be_visible(timeout=45000)
            except Exception:
                page.reload(wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(8000)
                activate(page)
                expect(page.get_by_text(NAME, exact=True)).to_be_visible(timeout=45000)
            step(f'"{NAME}" confirmed in app list — already created, continuing to next stage')
            return
        except Exception as exc:
            failshot(
                page,
                "package-taken",
                RuntimeError(f"Package {PACKAGE} taken AND {NAME} not in our list: {exc}"),
            )
    else:
        check_blockers(page, "package-check")

    # Declarations: explicit allow-list (never blind-check page checkboxes).
    # NOTE: the current form has only TWO declarations. Play App Signing is
    # automatic now ("You'll get automatic protection" notice, no checkbox).
    for pattern, desc in [
        (re.compile(r"developer.?program.?polic", re.I), "Developer Program Policies"),
        (re.compile(r"us export|u\.s\. export|قوانين التصدير", re.I), "US export laws"),
    ]:
        pick_one(page, "checkbox", [pattern], desc)

    try:
        from playwright.sync_api import expect

        submit = page.get_by_role("button", name=re.compile(r"^create app$|^إنشاء التطبيق$", re.I))
        submit.first.wait_for(state="visible", timeout=10000)
        # The button stays disabled until async form validation finishes
        # (package availability check). Wait for enabled, never click blindly.
        expect(submit.first).to_be_enabled(timeout=90000)
        submit.first.click()
        step("submitted Create app")
    except Exception as exc:
        failshot(page, "submit", RuntimeError(f"submit button not found: {exc}"))
    page.wait_for_timeout(6000)
    try:
        # Creation is server-side and slow under throttling: poll for leaving
        # the form instead of trusting a single fixed wait.
        page.wait_for_url(lambda u: "create-new-app" not in u, timeout=60000)
    except Exception:
        pass
    if "create-new-app" in page.url:
        # Still on the form: the click did nothing (e.g. disabled over an
        # inline error). Diagnose instead of waiting blindly.
        check_blockers(page, "create")
        failshot(
            page,
            "submit-stuck",
            RuntimeError("still on create form after submit — see snapshot for the inline error"),
        )
    page.wait_for_timeout(4000)
    check_blockers(page, "create")
    # Success = EITHER the app row in a list OR the new app's dashboard
    # (Google lands on ?app=<numeric-id> after creating — no NAME row there).
    created_id: str | None = None
    found = re.search(r"[?&]app=(\d+)", page.url)
    if found:
        created_id = found.group(1)
    else:
        try:
            from playwright.sync_api import expect

            try:
                expect(page.get_by_text(NAME, exact=True)).to_be_visible(timeout=30000)
            except Exception:
                step("NAME row not visible — reloading list once to confirm…")
                page.reload(wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(8000)
                expect(page.get_by_text(NAME, exact=True)).to_be_visible(timeout=30000)
        except Exception as exc:
            failshot(page, "create-verify", RuntimeError(f"app row not visible after submit: {exc}"))
    step(f"created: {NAME}" + (f" (app id {created_id})" if created_id else ""))


def stage3_invite(page) -> None:
    """Stage 3: invite publisher service account (per-app, least privilege)."""
    step(f"invite SA on {NAME}")
    # Deep link with the developer ID: skips the account chooser entirely.
    page.goto(USERS_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(3000)
    activate(page)
    try_click(page, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
    extended = False
    try:
        # Already a developer user (invited for an earlier app)? Open the row
        # and extend its permissions — re-inviting fails "User already exists".
        row = page.get_by_text(re.compile(re.escape(SERVICE_ACCOUNT), re.I)).first
        row.wait_for(state="visible", timeout=8000)
        row.click()
        page.wait_for_timeout(3000)
        activate(page)
        step("SA already a user — extending its app permissions")
        extended = True
    except Exception:
        click_any(page, [re.compile(r"invite new users?|دعوة مستخدمين", re.I)], "Invite new users")
        page.wait_for_timeout(2000)
        fill_any(
            page,
            [
                re.compile(r"email|بريد إلكتروني|البريد الإلكتروني", re.I),
                re.compile(r"user@example", re.I),
            ],
            SERVICE_ACCOUNT,
            "SA email",
        )
    if extended:
        # Detail page: app already added → open its editor via the row arrow.
        # (App not on the user yet → fall back to the Add-app path.)
        try:
            open_app_editor(page, re.compile(re.escape(NAME), re.I), f"edit {NAME}")
            page.wait_for_timeout(1500)
        except Exception:
            step("app not on user yet — using Add app")
            click_any(page, [re.compile(r"add app|إضافة تطبيق", re.I)], "Add app")
            page.wait_for_timeout(2000)
            check_row_for_text(page, re.compile(re.escape(NAME), re.I), f"select {NAME}")
            click_any(page, [re.compile(r"^apply$|^تطبيق$", re.I)], "Apply app selection")
            page.wait_for_timeout(1500)
    else:
        # The tab is often pre-selected — only click when its content is absent.
        try:
            page.get_by_text(re.compile(r"grant permissions for 1 or more apps", re.I)).first.wait_for(
                state="visible", timeout=5000
            )
            step("already on App permissions tab — skipping tab click")
        except Exception:
            click_any(page, [re.compile(r"app permissions|أذونات التطبيق", re.I)], "App permissions tab")
            page.wait_for_timeout(1000)
        click_any(page, [re.compile(r"add app|إضافة تطبيق", re.I)], "Add app")
        page.wait_for_timeout(2000)
        check_row_for_text(page, re.compile(re.escape(NAME), re.I), f"select {NAME}")
        click_any(page, [re.compile(r"^apply$|^تطبيق$", re.I)], "Apply app selection")
        page.wait_for_timeout(1500)
    check_row_for_text(
        page, re.compile(r"release apps to testing tracks", re.I), "testing-tracks permission"
    )
    check_row_for_text(
        page,
        re.compile(r"release to production, exclude devices", re.I),
        "production permission",
    )
    # CI publishes store listings too (titles/descriptions/graphics) — the SA
    # needs this third permission or edit commit 403s (seen 2026-09-14).
    check_row_for_text(
        page,
        re.compile(r"manage store presence", re.I),
        "store presence permission",
    )
    # Checking a permission opens the "Permissions for <app>" dialog — confirm it
    # before looking for the main-form Invite button.
    try_click(page, [re.compile(r"^apply$|^تطبيق$", re.I)], "permissions dialog Apply")
    page.wait_for_timeout(1500)
    if extended:
        # Permission extension saves directly (no invite dialog).
        click_any(
            page,
            [re.compile(r"^save( changes)?$|^حفظ$|^send invite$|^إرسال الدعوة$", re.I)],
            "Save permission changes",
        )
    else:
        click_any(page, [re.compile(r"^invite users?$|^دعوة المستخدم$|إرسال الدعوة", re.I)], "Invite user")
        # "Invite user" opens a "Send invite?" confirmation — confirm it.
        try_click(page, [re.compile(r"^send invite$|^إرسال الدعوة$", re.I)], "Send invite confirm")
    page.wait_for_timeout(4000)
    try:
        from playwright.sync_api import expect

        expect(page.get_by_text(re.compile(r"\bactive\b|نشط", re.I)).first).to_be_visible(timeout=30000)
    except Exception as exc:
        failshot(page, "invite-verify", RuntimeError(f"Active status not visible: {exc}"))
    step(f"invited {SERVICE_ACCOUNT} on {NAME} (Active confirmed)")


def stage4_aab() -> Path | None:
    """Stage 4: resolve AAB locally, else download latest successful CI artifact."""
    if AAB_PATH.exists():
        step(f"AAB local: {AAB_PATH} ({AAB_PATH.stat().st_size} bytes)")
        return AAB_PATH
    step("AAB missing locally — downloading latest successful CI artifact…")
    listed = subprocess.run(
        [
            "gh",
            "run",
            "list",
            f"--workflow={WORKFLOW}",
            "--status",
            "success",
            "--limit",
            "1",
            "--json",
            "databaseId",
            "--jq",
            ".[0].databaseId",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    run_id = (listed.stdout or "").strip()
    if not run_id:
        step("no successful run found — SKIPPING upload (create+invite done)")
        return None
    AAB_PATH.parent.mkdir(parents=True, exist_ok=True)
    downloaded = subprocess.run(
        ["gh", "run", "download", run_id, "-n", ARTIFACT, "-D", str(AAB_PATH.parent)],
        capture_output=True,
        text=True,
        check=False,
    )
    if downloaded.returncode != 0 or not AAB_PATH.exists():
        step(f"download failed — SKIPPING upload: {(downloaded.stderr or '')[-500:]}")
        return None
    step(f"AAB downloaded: {AAB_PATH}")
    return AAB_PATH


def stage5_upload(page, aab: Path | None) -> None:
    """Stage 5: first AAB upload to Internal + rollout."""
    if aab is None:
        return
    step(f"first AAB: {PACKAGE}")
    page.goto(CONSOLE, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(3000)
    activate(page)
    try_click(page, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
    click_any(page, [re.compile(f"^{re.escape(NAME)}$")], f"open {NAME}")
    page.wait_for_timeout(3000)
    try:
        # Persist the numeric app id + deep-link straight to Internal testing
        # (the side nav is a collapsed hamburger — menu clicking is fragile).
        import json as _json

        _m = re.search(r"/app/(\d+)", page.url or "")
        _app_id = _m.group(1) if _m else None
        if not _app_id:
            raise ValueError("no app id in dashboard URL")
        _ids_file = AUTH_DIR / "app-ids.json"
        try:
            _ids = _json.loads(_ids_file.read_text(encoding="utf-8")) if _ids_file.exists() else {}
        except Exception:
            _ids = {}
        _ids[KEY] = _app_id
        _ids_file.write_text(_json.dumps(_ids, indent=2), encoding="utf-8")
        step(f"app id persisted: {KEY}={_app_id}")
    except Exception:
        pass
    # Side nav starts collapsed (hamburger): open it, then go to Internal testing.
    # (Deep-linking .../internal-testing bounces back to app-list under throttling.)
    page.wait_for_timeout(5000)
    activate(page)
    try_click(page, [re.compile(r"menu|navigation|drawer|القائمة", re.I)], "open side nav")
    page.wait_for_timeout(2000)
    try:
        click_any(page, [re.compile(r"^internal testing$|^الاختبار الداخلي$", re.I)], "Internal testing")
    except Exception:
        click_any(page, [re.compile(r"test and release|الاختبار والإصدار", re.I)], "Test and release")
        page.wait_for_timeout(2000)
        # "Internal testing" nests under the "Testing" subgroup — expand it first.
        click_any(page, [re.compile(r"^testing$|^الاختبار$", re.I)], "Testing subgroup")
        page.wait_for_timeout(2000)
        click_any(page, [re.compile(r"internal testing|الاختبار الداخلي", re.I)], "Internal testing")
    page.wait_for_timeout(5000)
    # Stale drafts (rejected bundles) must go: discard, then create fresh so the
    # release holds ONLY the current AAB.
    for _role in ("link", "button"):
        try:
            _d = page.get_by_role(_role, name=re.compile(r"discard draft", re.I))
            _d.first.wait_for(state="visible", timeout=5000)
            _d.first.click()
            step("discarding stale draft release")
            page.wait_for_timeout(2000)
            for _r2 in ("button", "link"):
                try:
                    _c = page.get_by_role(_r2, name=re.compile(r"^discard$|^confirm$", re.I))
                    _c.first.wait_for(state="visible", timeout=5000)
                    _c.first.click()
                    step("discard confirmed")
                    break
                except Exception:
                    continue
            page.wait_for_timeout(3000)
            break
        except Exception:
            continue
    click_any(page, [re.compile(r"create new release|إنشاء إصدار", re.I)], "Create new release")
    page.wait_for_timeout(2500)
    if try_click(
        page, [re.compile(r"continue|متابعة|accept|قبول|let google manage", re.I)], "Play App Signing"
    ):
        page.wait_for_timeout(2000)
        try_click(page, [re.compile(r"continue|متابعة|accept|قبول|save|حفظ", re.I)], "signing confirm")
        page.wait_for_timeout(2000)
    try:
        page.get_by_text(re.compile(r"app-release\.aab", re.I)).first.wait_for(
            state="visible", timeout=8000
        )
        step("bundle already attached from previous attempt — reusing draft")
    except Exception:
        try:
            page.locator('input[type="file"]').first.wait_for(state="attached", timeout=30000)
        except Exception as exc:
            failshot(page, "upload", RuntimeError(f"file input never attached: {exc}"))
        inputs = page.locator('input[type="file"]')
        if inputs.count() == 0:
            failshot(page, "upload", RuntimeError("no file input on release page"))
        inputs.first.set_input_files(str(aab))
        step("AAB attached — waiting for processing (up to 5 min)…")
        try:
            page.get_by_text(re.compile(r"202\d{3,}", re.I)).first.wait_for(
                state="visible", timeout=300000
            )
        except Exception as exc:
            failshot(page, "upload-wait", RuntimeError(f"upload unfinished in 5 min: {exc}"))
        step("AAB processed")
    page.wait_for_timeout(2000)
    # New flow: step 1 ends with "Next" (older UI: "Review release").
    # Next enables only after server-side bundle processing finishes — wait for it.
    try:
        from playwright.sync_api import expect as _expect

        _next = page.get_by_role("button", name=re.compile(r"next|التالي", re.I))
        _expect(_next.first).to_be_enabled(timeout=180000)
        _next.first.click()
        step("preview opened")
    except Exception:
        review = page.get_by_role("button", name=re.compile(r"review release|مراجعة الإصدار", re.I))
        review.first.wait_for(state="visible", timeout=60000)
        review.first.click()
        step("review opened")
    check_blockers(page, "upload")
    page.wait_for_timeout(2500)
    # First-upload version-code warning ("significantly higher…") blocks Save
    # until acknowledged — bypass via its "Proceed anyway" link when present.
    for _role in ("link", "button"):
        try:
            _pa = page.get_by_role(_role, name=re.compile(r"proceed anyway", re.I))
            _pa.first.wait_for(state="visible", timeout=5000)
            _pa.first.click()
            step("clicked (optional): Proceed anyway (version-code warning)")
            page.wait_for_timeout(1500)
            break
        except Exception:
            continue
    # Step 2 ends with "Save and publish" (disabled while release errors exist).
    if not try_click(
        page, [re.compile(r"save and publish|حفظ ونشر|start rollout|بدء الطرح", re.I)],
        "Save and publish",
    ):
        # Reveal the blocking errors for the report — never guess-fix them.
        try:
            for _sm in page.get_by_text(re.compile(r"show more", re.I)).all():
                try:
                    _sm.click(timeout=3000)
                    page.wait_for_timeout(1000)
                except Exception:
                    continue
        except Exception:
            pass
        page.wait_for_timeout(1000)
        failshot(page, "rollout-blocked", RuntimeError("release blocked by errors (see screenshot)"))
    page.wait_for_timeout(4000)
    try:
        from playwright.sync_api import expect

        expect(page.get_by_text(re.compile(r"rollout|release|طرح|إصدار", re.I)).first).to_be_visible(
            timeout=60000
        )
    except Exception as exc:
        failshot(page, "rollout-verify", RuntimeError(f"rollout confirmation not visible: {exc}"))
    step(f"rolling out to Internal: {NAME}")


def stage6_report() -> None:
    """Stage 6: summary + remaining manual questionnaires."""
    step("=== DONE ===")
    print(f"[{KEY}] app: {NAME} ({PACKAGE})")
    print(f"[{KEY}] remaining manual: Content rating, Data safety, Target audience, Ads, App access")
    print(f"[{KEY}] links: {CONSOLE} -> select {NAME} -> Dashboard")


STAGES = {0: stage0_env, 2: stage2_create, 3: stage3_invite, 4: stage4_aab, 6: stage6_report}


def main() -> int:
    parser = argparse.ArgumentParser(description=f"Play Console bootstrap: {NAME}")
    parser.add_argument("--from", dest="from_stage", type=int, default=0)
    parser.add_argument("--only", dest="only_stage", type=int, default=None)
    args = parser.parse_args()

    progress = load_progress()
    done = set(progress.get("stages", {}))
    step(f"start ({NAME}) from={args.from_stage} only={args.only_stage}")

    import os

    # Single-driver guard: two processes driving one browser tab corrupt
    # every click. Second instance refuses to start.
    lock_file = AUTH_DIR / f"{KEY}.run.lock"
    try:
        other_pid = int(lock_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        other_pid = None
    if other_pid is not None:
        try:
            os.kill(other_pid, 0)
        except OSError:
            other_pid = None  # stale lock
        else:
            step(f"another run is active (pid={other_pid}) — refusing a second driver")
            return 2
    lock_file.write_text(str(os.getpid()), encoding="utf-8")

    playwright = context = page = None
    aab: Path | None = None
    try:
        for number in range(0, 7):
            if number < args.from_stage:
                continue
            if args.only_stage is not None and number != args.only_stage:
                continue
            if str(number) in done and args.only_stage is None and number != 1:
                # Stage 1 ALWAYS re-runs: it builds the LIVE browser session
                # (page/context) that stages 2/3/5 need. Skipping it on resume
                # leaves page=None and crashes stage 2.
                step(f"stage {number} already done — skipping")
                continue
            if number in (2, 3, 5) and page is None:
                raise RuntimeError(
                    f"stage {number} needs a live browser session but stage 1 did not run. "
                    "Re-run without --from/--only so stage 1 opens the session."
                )
            if number == 0:
                stage0_env()
            elif number == 1:
                playwright, context, page = stage1_session()
            elif number == 2:
                stage2_create(page)
            elif number == 3:
                stage3_invite(page)
            elif number == 4:
                aab = stage4_aab()
            elif number == 5:
                if aab is None and AAB_PATH.exists():
                    aab = AAB_PATH
                if aab is not None:
                    stage5_upload(page, aab)
            elif number == 6:
                stage6_report()
            # A skip is not a completion: unmarked stages retry next run.
            if number == 4 and aab is None:
                step("stage 4 SKIPPED (no AAB) — will retry next run")
            elif number == 5 and aab is None:
                step("stage 5 SKIPPED (no AAB) — will retry next run")
            else:
                mark_done(progress, number)
    finally:
        for owned in list(_OWN_PAGES):
            try:
                owned.close()
            except Exception:
                pass
        if _ATTACHED:
            # Shared user browser: only disconnect, never close or kill it.
            try:
                if playwright is not None:
                    playwright.stop()
            except Exception:
                pass
        else:
            try:
                if context is not None:
                    try:
                        context.tracing.stop()
                    except Exception:
                        pass
                    context.close()
            except Exception:
                pass
            try:
                if playwright is not None:
                    playwright.stop()
            except Exception:
                pass
            _kill_browser()
        try:
            if lock_file.read_text(encoding="utf-8").strip() == str(os.getpid()):
                lock_file.unlink()
        except OSError:
            pass
    pending = [str(n) for n in range(7) if str(n) not in progress.get("stages", {})]
    if pending:
        step(f"PENDING stages (re-run to complete): {', '.join(pending)}")
    else:
        step("ALL STAGES DONE")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception:
        LOG.exception("Console bootstrap failed")
        raise SystemExit(1) from None
