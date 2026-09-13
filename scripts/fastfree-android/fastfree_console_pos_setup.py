"""Play Console bootstrap for FastFree POS — self-contained stage runner.

Stages 0-6: env -> session -> create -> invite SA -> AAB -> first upload -> report.
Usage: uv run fastfree_console_pos_setup.py [--from N] [--only N]
Progress persists in .auth/play-console/pos.progress.json (resume-safe).
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
KEY = "pos"
NAME = "FastFree POS"
PACKAGE = "com.fastfree.pos"
ARTIFACT = "com.fastfree.pos-aab"
WORKFLOW = "09-build-pos-android.yaml"
CONTACT_EMAIL = "sales@fastfree.cloud"
SERVICE_ACCOUNT = "fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com"

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AUTH_DIR = REPO_ROOT / ".auth" / "play-console"
PROFILE_DIR = AUTH_DIR / "profile"
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
DEV_URL = "https://play.google.com/console/u/0/developers/7269125617638997236/app-list"
GOOGLE_OWNER = "mohamed.fastfree@gmail.com"


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
    """The logged-in account must open OUR developer app-list."""
    page.goto(DEV_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)
    try:
        body = page.inner_text("body") or ""
    except Exception:
        body = ""
    if re.search(r"couldn.?t|no access|error|ليس لديك|غير مصرح|404", body, re.I) or (
        "/console" not in page.url
    ):
        failshot(
            page,
            "wrong-account",
            RuntimeError(
                "This Google account cannot open Play developer 7269125617638997236. "
                f"Log in with {GOOGLE_OWNER} (the owner), then re-run. " + page_snapshot(page)
            ),
        )
    step("developer access confirmed: 7269125617638997236")


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


def session_expired(page) -> bool:
    if "accounts.google.com" in page.url:
        return True
    try:
        return page.get_by_role("button", name=re.compile(r"sign in|تسجيل الدخول", re.I)).count() > 0
    except Exception:
        return False


def stage0_env() -> None:
    """Stage 0: verify/install browser deps (playwright chromium + gh CLI)."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        exe = playwright.chromium.executable_path
    if not Path(exe).exists():
        step("chromium missing — installing (one time, ~170MB)…")
        proc = subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            print(proc.stdout[-2000:] + proc.stderr[-2000:], file=sys.stderr)
            raise RuntimeError("playwright chromium install failed")
    else:
        step(f"browser OK: {exe}")
    proc = subprocess.run(["gh", "--version"], capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError("gh CLI not found (needed for AAB download)")
    step("gh CLI OK")


def open_session(headed: bool):
    """Open persistent-profile browser on the console."""
    import os

    from playwright.sync_api import sync_playwright

    headed = headed or os.environ.get("FF_HEADED") == "1"
    try:
        slow_mo = int(os.environ.get("FF_SLOWMO_MS", "0") or 0)
    except ValueError:
        slow_mo = 0
    playwright = sync_playwright().start()
    context = playwright.chromium.launch_persistent_context(
        str(PROFILE_DIR),
        headless=not headed,
        viewport=None,
        locale="en-US",
        slow_mo=slow_mo or None,
    )
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


def console_marker(page) -> bool:
    """True only when a REAL console screen is showing (not homepage/login).

    Strict by design: the Create-app button, or an exact "All apps" text.
    Bare words (لوحة, تطبيق, كونسول) are banned — they false-positive.
    """
    try:
        btn = page.get_by_role("button", name=re.compile(r"create app|إنشاء التطبيق", re.I))
        btn.first.wait_for(state="visible", timeout=5000)
        return True
    except Exception:
        pass
    try:
        txt = page.get_by_text(re.compile(r"all apps|كل التطبيقات", re.I))
        txt.first.wait_for(state="visible", timeout=5000)
        return True
    except Exception:
        return False


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


def enter_console(page, where: str) -> None:
    """Guarantee we are INSIDE play.google.com/console (not the marketing homepage).

    The console URL sometimes lands on the public Play homepage first.
    Click through explicitly, retry with diagnostics, and fail loudly with
    the real page state if the account has no developer access at all.
    """
    for attempt in range(1, 8):
        page.wait_for_timeout(4000)
        url = page.url
        step(f"enter_console attempt {attempt}: {url[:120]}")
        if "console/signup" in url:
            failshot(
                page,
                "no-developer-account",
                RuntimeError(
                    "Google account has NO Play Console developer registration "
                    "($25 one-time). Complete signup first: "
                    "https://play.google.com/console/signup"
                ),
            )
        if "/console" in url and "accounts.google.com" not in url and console_marker(page):
            step("inside Play Console confirmed")
            return
        # Account chooser showing? Surface it instead of clicking blindly.
        try:
            if page.get_by_text(re.compile(r"choose an account|اختر حسابا", re.I)).count() > 0:
                failshot(
                    page,
                    "account-chooser",
                    RuntimeError(
                        "Google shows an account chooser: HUMAN must pick the account "
                        "owning Play developer ID 7269125617638997236 in the open "
                        "browser window, then re-run. " + page_snapshot(page)
                    ),
                )
        except RuntimeError:
            raise
        except Exception:
            pass
        try_click(
            page,
            [re.compile(r"go to play console|وحدة تحكم Google Play", re.I)],
            "Go to Play Console",
        )
    failshot(page, where, RuntimeError(f"could not enter Play Console. {page_snapshot(page)}"))


def stage1_session():
    """Stage 1: reuse saved session; else headed human login (once)."""
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
    """Stage 2: Create app record (skip when already listed)."""
    step(f"create: {NAME}")
    page.goto(CONSOLE, wait_until="domcontentloaded", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=45000)
    except Exception:
        pass
    enter_console(page, "console-load")
    try:
        page.get_by_role("button", name=re.compile(r"create app|إنشاء التطبيق", re.I)).first.wait_for(
            state="visible", timeout=90000
        )
    except Exception as exc:
        failshot(page, "console-load", RuntimeError(f"console did not load in 90s: {exc}"))
    try_click(page, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
    try:
        if page.get_by_text(NAME, exact=True).count() > 0:
            step(f'"{NAME}" already listed — skipping creation')
            return
    except Exception:
        pass

    click_any(page, [re.compile(r"create app|إنشاء التطبيق", re.I)], "open Create app")
    page.wait_for_timeout(2000)
    dialog = page.get_by_role("dialog")

    fill_any(page, [re.compile(r"app name|اسم التطبيق", re.I)], NAME, "app name")
    try:
        lang = page.get_by_label(re.compile(r"default language|اللغة الافتراضية", re.I))
        lang.first.wait_for(state="visible", timeout=6000)
        options = lang.first.locator("option").all_text_contents()
        arabic = next((o for o in options if re.search(r"arabic|العربية", o, re.I)), None)
        if arabic:
            lang.first.select_option(label=arabic)
            step(f"language -> {arabic}")
        else:
            step("language: leaving default")
    except Exception:
        step("language: leaving default")

    pick_one(page, "radio", [re.compile(r"^app$", re.I), re.compile(r"^تطبيق$", re.I)], "type = App")
    pick_one(page, "radio", [re.compile(r"^free$", re.I), re.compile(r"^مجاني$", re.I)], "free")
    fill_any(
        page, [re.compile(r"email|بريد إلكتروني|البريد الإلكتروني", re.I)], CONTACT_EMAIL, "contact email"
    )

    try:
        boxes = dialog.get_by_role("checkbox")
        count = boxes.count()
        for i in range(count):
            try:
                boxes.nth(i).check()
            except Exception:
                pass
        step(f"checked {count} declaration(s)")
    except Exception as exc:
        failshot(page, "declarations", RuntimeError(f"declaration checkboxes not found: {exc}"))

    try:
        submit = dialog.get_by_role("button", name=re.compile(r"create app|إنشاء التطبيق", re.I))
        submit.first.wait_for(state="visible", timeout=10000)
        submit.first.click()
        step("submitted Create app")
    except Exception as exc:
        failshot(page, "submit", RuntimeError(f"submit button not found: {exc}"))
    page.wait_for_url(re.compile(r"play\.google\.com/console"), timeout=60000)
    page.wait_for_timeout(4000)
    check_blockers(page, "create")
    try:
        from playwright.sync_api import expect

        expect(page.get_by_text(NAME, exact=True)).to_be_visible(timeout=30000)
    except Exception as exc:
        failshot(page, "create-verify", RuntimeError(f"app row not visible after submit: {exc}"))
    step(f"created: {NAME}")


def stage3_invite(page) -> None:
    """Stage 3: invite publisher service account (per-app, least privilege)."""
    step(f"invite SA on {NAME}")
    page.goto(f"{CONSOLE}/users-and-permissions", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(3000)
    try_click(page, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
    click_any(page, [re.compile(r"invite new users?|دعوة مستخدمين", re.I)], "Invite new users")
    page.wait_for_timeout(2000)
    fill_any(page, [re.compile(r"email|بريد إلكتروني|البريد الإلكتروني", re.I)], SERVICE_ACCOUNT, "SA email")
    click_any(page, [re.compile(r"app permissions|أذونات التطبيق", re.I)], "App permissions tab")
    page.wait_for_timeout(1000)
    click_any(page, [re.compile(r"add app|إضافة تطبيق", re.I)], "Add app")
    page.wait_for_timeout(2000)
    pick_one(page, "checkbox", [re.compile(re.escape(NAME), re.I)], f"select {NAME}")
    click_any(page, [re.compile(r"^apply$|^تطبيق$", re.I)], "Apply app selection")
    page.wait_for_timeout(1500)
    pick_one(
        page, "checkbox", [re.compile(r"release apps to testing tracks", re.I)], "testing-tracks permission"
    )
    pick_one(
        page,
        "checkbox",
        [re.compile(r"release to production, exclude devices", re.I)],
        "production permission",
    )
    click_any(page, [re.compile(r"^invite users?$|^دعوة المستخدم$|إرسال الدعوة", re.I)], "Invite user")
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
    try_click(page, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
    click_any(page, [re.compile(f"^{re.escape(NAME)}$")], f"open {NAME}")
    page.wait_for_timeout(3000)
    click_any(page, [re.compile(r"test and release|الاختبار والإصدار", re.I)], "Test and release")
    page.wait_for_timeout(1500)
    click_any(page, [re.compile(r"internal testing|الاختبار الداخلي", re.I)], "Internal testing")
    page.wait_for_timeout(3000)
    click_any(page, [re.compile(r"create new release|إنشاء إصدار", re.I)], "Create new release")
    page.wait_for_timeout(2500)
    if try_click(
        page, [re.compile(r"continue|متابعة|accept|قبول|let google manage", re.I)], "Play App Signing"
    ):
        page.wait_for_timeout(2000)
        try_click(page, [re.compile(r"continue|متابعة|accept|قبول|save|حفظ", re.I)], "signing confirm")
        page.wait_for_timeout(2000)
    try:
        page.locator('input[type="file"]').first.wait_for(state="attached", timeout=30000)
    except Exception as exc:
        failshot(page, "upload", RuntimeError(f"file input never attached: {exc}"))
    inputs = page.locator('input[type="file"]')
    if inputs.count() == 0:
        failshot(page, "upload", RuntimeError("no file input on release page"))
    inputs.first.set_input_files(str(aab))
    step("AAB attached — waiting up to 5 min…")
    review = page.get_by_role("button", name=re.compile(r"review release|مراجعة الإصدار", re.I))
    try:
        review.first.wait_for(state="visible", timeout=300000)
    except Exception as exc:
        failshot(page, "upload-wait", RuntimeError(f"upload unfinished in 5 min: {exc}"))
    page.wait_for_timeout(2000)
    review.first.click()
    step("review opened")
    check_blockers(page, "upload")
    page.wait_for_timeout(2500)
    click_any(page, [re.compile(r"start rollout to internal|بدء الطرح", re.I)], "Start rollout to Internal")
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
                stage5_upload(page, aab)
            elif number == 6:
                stage6_report()
            mark_done(progress, number)
    finally:
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
