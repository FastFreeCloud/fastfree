"""Play Console dashboard tasks: Data safety + Store listing + App access.

Self-contained Playwright task module for the four FastFree apps
(pos, erp, hr, ledger). At runtime ONE browser tab drives these
sequentially — this module never spawns browsers or threads itself.

Each task is ``def run_X(page, ctx) -> None`` where ``ctx`` is a mapping
with NAME, PACKAGE, APP_ID, DEV_ID (default "7269125617638997236"), KEY.
Dispatch via TASKS keyed by dashboard task label::

    from fastfree_task_groups import group_safety
    group_safety.TASKS["Data safety"](page, ctx)

Helper idioms (step/activate/click_any/try_click/fill_any/pick_one/
check_row_for_text/failshot) mirror fastfree_console_erp_setup.py but take
``ctx`` so the KEY-scoped auth dir and log prefix follow the app under
automation. EN+AR regex lists throughout; every save is verified; any
failure captures a screenshot via failshot and raises.

Secrets are NEVER hardcoded: the demo password is read at RUNTIME from
apps/fastfree_os/nix/clients/client3.nix (``admin = "..."``) and listing
text is read at RUNTIME from the fastfree_<slug> fastlane metadata dirs.
"""

from __future__ import annotations

import logging
import os
import re
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
AUTH_DIR = REPO_ROOT / ".auth" / "play-console"
LOG_DIR = REPO_ROOT / ".auth" / "logs"

DEFAULT_DEV_ID = "7269125617638997236"
PRIVACY_URL = "https://fastfree.cloud/privacy-policy.html"
SUPPORT_EMAIL = "mohamed.fastfree@gmail.com"
BACKEND_URL = "https://backend.fastfree.cloud"
DEMO_USERNAME = "Administrator"
CLIENT3_NIX = REPO_ROOT / "apps" / "fastfree_os" / "nix" / "clients" / "client3.nix"

# Play store-listing hard limits (chars). Over-limit metadata fails loudly
# so a human fixes the fastlane txt instead of us truncating store copy.
TITLE_LIMIT = 30
SHORT_LIMIT = 80
FULL_LIMIT = 4000


def get_logger() -> logging.Logger:
    """Console + file log shared by all four apps in this group."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("fastfree.task_groups.safety")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(console)
    file_handler = logging.FileHandler(LOG_DIR / "task_group_safety.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(file_handler)
    return logger


LOG = get_logger()


# ── low-footprint mode (default ON; FASTFREE_LOW_FOOTPRINT=0 disables) ─────────
# Play Console throttles sustained automation (HTTP 429). Questionnaire flows
# never need images/media/fonts (form JS, XHR, stylesheets kept; screenshots
# capture DOM rendering which works headless without them; input[type=file]
# uploads are DOM ops, unaffected), so arm_low_footprint route-aborts those
# classes. pace() is the single helper for every fixed sleep (post-navigation
# waits default to NAV_PACE_SECS); settle() replaces networkidle, which holds
# the CDP session open on long-polling XHRs that 429 anyway. Poll loops keep
# their deadlines but sleep with exponential backoff via pace() (fewer CDP
# round-trips, same timeouts).

LOW_FOOTPRINT = os.environ.get("FASTFREE_LOW_FOOTPRINT", "1") != "0"


def _env_secs(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


NAV_PACE_SECS = _env_secs("FASTFREE_NAV_PACE_SECS", 4.0)

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


def pace(page, secs: float = NAV_PACE_SECS) -> None:
    """Single pacing helper: fixed CDP-side sleep (falls back to time.sleep)."""
    try:
        page.wait_for_timeout(int(secs * 1000))
    except Exception:
        time.sleep(secs)


def settle(page, secs: float = 2.0) -> None:
    """Post-navigation settle WITHOUT networkidle (long-poll XHRs 429 anyway).

    domcontentloaded returns immediately when already loaded; the short pace
    lets the SPA hydrate while targeted waits below do the real gating.
    """
    try:
        page.wait_for_load_state("domcontentloaded", timeout=15000)
    except Exception:
        pass
    pace(page, secs)


# ── ctx access ─────────────────────────────────────────────────────────────


def _get(ctx: dict, name: str, default: str = "") -> str:
    if isinstance(ctx, dict):
        value = ctx.get(name, default)
    else:
        value = getattr(ctx, name, default)
    return str(value) if value is not None else default


def _key(ctx: dict) -> str:
    return _get(ctx, "KEY", "safety") or "safety"


def _dev(ctx: dict) -> str:
    return _get(ctx, "DEV_ID", DEFAULT_DEV_ID) or DEFAULT_DEV_ID


def step(ctx: dict, msg: str) -> None:
    print(f"[{datetime.now(UTC).strftime('%H:%M:%S')}] [{_key(ctx)}] {msg}", flush=True)
    LOG.info("[%s] %s", _key(ctx), msg)


def page_snapshot(page) -> str:
    """Short text dump for remote diagnosis (URL + visible headings)."""
    try:
        body = (page.inner_text("body") or "").strip().replace("\n", " ")
        return f"url={page.url} text={body[:500]!r}"
    except Exception as exc:
        return f"url=<unreadable> ({exc})"


def failshot(page, ctx: dict, name: str, err: Exception) -> None:
    """Screenshot-on-fail into .auth/play-console, then raise."""
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        stamp = int(time.time() * 1000)
        safe = re.sub(r"[\\/:*?\"<>|]", "-", str(name))[:80]
        shot = AUTH_DIR / f"fail-{_key(ctx)}-{safe}-{stamp}.png"
        page.screenshot(path=str(shot))
        LOG.error("FAIL[%s]: %s\n  url=%s\n  shot=%s", name, err, page.url, shot)
    except Exception:
        LOG.error("FAIL[%s]: %s", name, err)
    raise err if isinstance(err, Exception) else RuntimeError(str(err))


def _soft_shot(page, ctx: dict, name: str) -> None:
    """Best-effort screenshot for WARNING paths — never raises."""
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        stamp = int(time.time() * 1000)
        safe = re.sub(r"[\\/:*?\"<>|]", "-", str(name))[:80]
        page.screenshot(path=str(AUTH_DIR / f"soft-{_key(ctx)}-{safe}-{stamp}.png"))
    except Exception:
        pass


def activate(page, ctx: dict) -> None:
    """Bring our tab forward; background tabs stall the Console SPA."""
    arm_low_footprint(page)  # idempotent: covers every navigation via activate()
    try:
        page.bring_to_front()
    except Exception:
        pass
    pace(page, 1.5)
    try:
        if re.search(r"/console/developers/?(?:\?.*)?$", page.url or ""):
            step(ctx, "developer chooser — selecting account")
            click_any(page, ctx, [re.compile(r"fastfree\.cloud", re.I)], "select developer account")
            pace(page, 5.0)
    except Exception:
        pass


def assert_dev(page, ctx: dict, where: str) -> None:
    """Re-assert we are inside OUR developer after every navigation (§0)."""
    found = re.search(r"/developers/(\d+)", page.url or "")
    actual = found.group(1) if found else None
    if actual is None:
        return  # chooser / non-dev URL — activate() already handled the pick
    if actual != _dev(ctx):
        failshot(
            page,
            ctx,
            where,
            RuntimeError(
                f"Developer account is {actual}, expected {_dev(ctx)}. "
                "Never create/invite/upload under the wrong developer. " + page_snapshot(page)
            ),
        )


# ── core interaction helpers (erp_setup idioms, ctx-parameterized) ──────────


def click_any(page, ctx: dict, patterns: list, desc: str):
    for pattern in patterns:
        for role in ("button", "link"):
            try:
                loc = page.get_by_role(role, name=pattern)
                loc.first.wait_for(state="visible", timeout=4000)
                loc.first.click()
                step(ctx, f"clicked {role}: {desc}")
                return
            except Exception:
                continue
        try:
            txt = page.get_by_text(pattern)
            txt.first.wait_for(state="visible", timeout=4000)
            txt.first.click()
            step(ctx, f"clicked text: {desc}")
            return
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"nothing clickable matched: {desc}"))


def try_click(page, ctx: dict, patterns: list, desc: str) -> bool:
    for pattern in patterns:
        try:
            btn = page.get_by_role("button", name=pattern)
            btn.first.wait_for(state="visible", timeout=3000)
            btn.first.click()
            step(ctx, f"clicked (optional): {desc}")
            return True
        except Exception:
            continue
    return False


def fill_any(page, ctx: dict, patterns: list, value: str, desc: str) -> None:
    for pattern in patterns:
        for method in ("label", "placeholder", "textbox", "aria-label"):
            try:
                if method == "label":
                    field = page.get_by_label(pattern)
                elif method == "placeholder":
                    field = page.get_by_placeholder(pattern)
                elif method == "aria-label":
                    field = page.locator(f"textarea[aria-label*='{pattern}'], input[aria-label*='{pattern}']")
                else:
                    field = page.get_by_role("textbox", name=pattern)
                field.first.wait_for(state="visible", timeout=4000)
                field.first.fill(value)
                step(ctx, f"filled: {desc}")
                return
            except Exception:
                continue
    # Last resort: try all visible textboxes and fill the first empty one.
    try:
        for box in page.get_by_role("textbox").all():
            if box.is_visible() and not (box.input_value() or "").strip():
                box.fill(value)
                step(ctx, f"filled (fallback empty box): {desc}")
                return
    except Exception:
        pass
    failshot(page, ctx, desc, RuntimeError(f"no input matched: {desc}"))


def pick_one(page, ctx: dict, role: str, patterns: list, desc: str, action: str = "check") -> None:
    for pattern in patterns:
        try:
            loc = page.get_by_role(role, name=pattern)
            loc.first.wait_for(state="visible", timeout=4000)
            loc.first.check() if action == "check" else loc.first.click()
            step(ctx, f"{'checked' if action == 'check' else 'clicked'} {role}: {desc}")
            return
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"no {role} matched: {desc}"))


def check_row_for_text(page, ctx: dict, pattern, desc: str) -> None:
    """Check the (usually unlabeled) checkbox in the same row as text."""
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
        step(ctx, f"checked row checkbox: {desc}")
        return
    except Exception:
        pass
    failshot(page, ctx, desc, RuntimeError(f"no row checkbox found for text: {desc}"))


def expand_all(page, ctx: dict) -> None:
    """Expand collapsed sections FIRST — action links hide inside them (§5)."""
    try:
        for expander in page.get_by_text(re.compile(r"show more|expand|عرض المزيد|توسيع", re.I)).all():
            try:
                expander.click(timeout=3000)
                pace(page, 0.8)
            except Exception:
                continue
    except Exception:
        pass
    step(ctx, "expanded collapsible sections (best-effort)")


def confirm_in_dialog(page, ctx: dict, dialog_patterns: list, button_patterns: list, desc: str) -> None:
    """Click a button scoped INSIDE its dialog (§5: background reuses labels)."""
    for dpat in dialog_patterns:
        try:
            dlg = page.get_by_role("dialog").filter(has_text=dpat)
            dlg.wait_for(state="visible", timeout=10000)
            for bpat in button_patterns:
                try:
                    btn = dlg.get_by_role("button", name=bpat)
                    btn.first.wait_for(state="visible", timeout=5000)
                    btn.first.click(timeout=10000)
                    step(ctx, f"confirmed in dialog: {desc}")
                    pace(page, 2.0)
                    return
                except Exception:
                    continue
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"dialog confirm failed: {desc}"))


def _radio_label(page, radio) -> str:
    """Best-effort visible label for one radio input."""
    try:
        _id = radio.get_attribute("id")
        if _id:
            _lab = page.locator(f"label[for='{_id}']")
            if _lab.count() > 0:
                return (_lab.first.inner_text() or "").strip()
    except Exception:
        pass
    try:
        _wrap = radio.locator("xpath=ancestor::label[1]")
        if _wrap.count() > 0:
            return (_wrap.first.inner_text() or "").strip()
    except Exception:
        pass
    try:
        return (radio.get_attribute("aria-label") or "").strip()
    except Exception:
        return ""


def _click_label_for(page, radio) -> bool:
    """Click the <label> of a radio/checkbox (fires Angular change; .check() may not)."""
    try:
        _id = radio.get_attribute("id")
        if _id:
            _lab = page.locator(f"label[for='{_id}']")
            if _lab.count() > 0:
                _lab.first.wait_for(state="visible", timeout=4000)
                _lab.first.click(timeout=5000)
                return True
    except Exception:
        pass
    try:
        _wrap = radio.locator("xpath=ancestor::label[1]")
        if _wrap.count() > 0:
            _wrap.first.wait_for(state="visible", timeout=4000)
            _wrap.first.click(timeout=5000)
            return True
    except Exception:
        pass
    return False


def answer_question(page, ctx: dict, qpat, want: str, desc: str) -> None:
    """Answer the question matching qpat with the option labeled `want`.

    Deterministic: takes the radios FOLLOWING the question text (a Yes/No pair
    belongs to its question), resolves each radio's own <label>, clicks the one
    whose label equals `want`, and verifies THAT radio is checked. Shared
    containers can no longer misroute the click to a sibling question.
    """
    try:
        questions = page.get_by_text(qpat).all()
    except Exception as exc:
        failshot(page, ctx, desc, RuntimeError(f"question not found: {exc}"))
        return
    for q in questions:
        try:
            q.wait_for(state="visible", timeout=4000)
        except Exception:
            continue
        try:
            radios = q.locator("xpath=following::input[@type='radio']").all()[:4]
        except Exception:
            continue
        for r in radios:
            try:
                lab = _radio_label(page, r)
                if lab.lower() != want.lower():
                    continue
                r.wait_for(state="visible", timeout=4000)
                # Click the LABEL (fires framework change events); fall back
                # to programmatic check only if no label element resolves.
                if not _click_label_for(page, r):
                    r.check()
                pace(page, 0.5)
                if r.is_checked():
                    step(ctx, f"answered [{lab}]: {desc}")
                    pace(page, 1.0)
                    return
            except Exception:
                continue
    failshot(page, ctx, desc, RuntimeError(f"no '{want}' option after question: {desc}"))


def answer_near(page, ctx: dict, question_patterns: list, answer_patterns: list, desc: str) -> None:
    """Answer a YES/NO radio scoped to the container owning the question text."""
    for qpat in question_patterns:
        try:
            question = page.get_by_text(qpat).first
            question.wait_for(state="visible", timeout=8000)
            scope = question.locator("xpath=ancestor::*[descendant::*[@role='radio']][1]")
            for apat in answer_patterns:
                # 1) label-substring inside the question scope (radios carry
                #    useless accessible names; their <label> text is the key).
                try:
                    opt = scope.get_by_label(apat).first
                    opt.wait_for(state="visible", timeout=4000)
                    opt.check()
                    pace(page, 0.5)
                    if opt.is_checked():
                        step(ctx, f"answered by label: {desc}")
                        pace(page, 1.0)
                        return
                except Exception:
                    pass
                # 2) legacy role+name inside scope.
                try:
                    opt = scope.get_by_role("radio", name=apat)
                    opt.first.wait_for(state="visible", timeout=4000)
                    opt.first.check()
                    step(ctx, f"answered: {desc}")
                    pace(page, 1.0)
                    return
                except Exception:
                    continue
        except Exception:
            continue
    # Fallback: page-wide radio pick when the question has no radio container.
    for apat in answer_patterns:
        try:
            pick_one(page, ctx, "radio", [apat], desc)
            return
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"could not answer: {desc}"))


def save_and_verify(page, ctx: dict, desc: str) -> None:
    """Click Save (EN+AR) then verify the save confirmation text.

    The Data-safety wizard footer labels the control "Save draft"
    (failshot evidence) — bare "^save$" never matches it. The store
    listing footer labels it "Save as draft" — match that too.
    """
    expand_all(page, ctx)
    click_any(
        page,
        ctx,
        [re.compile(r"^save( changes| draft| as draft)?$|^حفظ( التغييرات| كمسودة)?$", re.I)],
        f"Save {desc}",
    )
    pace(page)
    try:
        from playwright.sync_api import expect

        expect(
            page.get_by_text(re.compile(r"saved|تم الحفظ|draft saved|changes saved|published", re.I)).first
        ).to_be_visible(timeout=60000)
    except Exception as exc:
        failshot(page, ctx, f"{desc}-verify", RuntimeError(f"save not confirmed for {desc}: {exc}"))
    step(ctx, f"save verified: {desc}")


# ── navigation ─────────────────────────────────────────────────────────────


def open_dashboard(page, ctx: dict) -> None:
    """Land on this app's dashboard; recover via app-list row click on bounce."""
    dev = _dev(ctx)
    aid = _get(ctx, "APP_ID")
    base = "https://play.google.com/console"
    for _attempt in range(2):
        page.goto(
            f"{base}/u/0/developers/{dev}/app/{aid}/dashboard",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        arm_low_footprint(page)
        pace(page)
        activate(page, ctx)
        if aid and f"/app/{aid}/" in (page.url or ""):
            break
        step(ctx, "dashboard bounced — retrying via app list")
        page.goto(f"{base}/u/0/developers/{dev}/app-list", wait_until="domcontentloaded", timeout=60000)
        arm_low_footprint(page)
        pace(page)
        activate(page, ctx)
        try_click(page, ctx, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
        click_any(page, ctx, [re.compile(f"^{re.escape(_get(ctx, 'NAME'))}$")], "open app row")
        pace(page, 5.0)
        activate(page, ctx)
    if not (aid and f"/app/{aid}/" in (page.url or "")):
        failshot(page, ctx, "dashboard-unreachable", RuntimeError("dashboard bounced twice"))
    assert_dev(page, ctx, "dashboard-id")
    # Was networkidle(45s): redundant with the marker poll below and holds the
    # CDP session on long-polling XHRs that 429 anyway.
    settle(page)
    try:
        # Generic dashboard markers: task rows hide collapsed, and .first can
        # resolve hidden — accept the first VISIBLE match instead.
        deadline = time.time() + 60
        poll = 0
        seen = False
        while time.time() < deadline and not seen:
            try:
                for el in page.get_by_text(
                    re.compile(r"finish setting up|view tasks|إنهاء الإعداد|عرض المهام", re.I)
                ).all():
                    try:
                        if el.is_visible():
                            seen = True
                            break
                    except Exception:
                        continue
            except Exception:
                pass
            if not seen:
                # Backoff (1s→5s cap): same 60s deadline, ~4x fewer CDP round-trips.
                pace(page, min(5.0, 1.0 * (2.0**poll)))
                poll += 1
        if not seen:
            raise RuntimeError("dashboard markers never visible")
    except Exception as exc:
        failshot(page, ctx, "dashboard-load", RuntimeError(f"dashboard tasks did not load: {exc}"))
    step(ctx, f"dashboard open: {_get(ctx, 'NAME')}")


def expand_view_tasks(page, ctx: dict) -> None:
    """Dashboard task rows hide behind collapsed 'View tasks' toggles — expand them."""
    try:
        toggles = page.get_by_role("button", name=re.compile(r"view tasks|عرض المهام", re.I)).all()
    except Exception:
        toggles = []
    for tg in toggles:
        try:
            if (tg.get_attribute("aria-expanded") or "").lower() == "true":
                continue
            tg.click(timeout=3000)
            pace(page, 1.5)
        except Exception:
            continue
    step(ctx, "view-tasks toggles expanded (if any)")


def open_section(page, ctx: dict, slug: str, desc: str) -> None:
    """Go straight to app-content/<slug> (observed slugs only — never guess).

    Falls back to dashboard row-click when the deep link bounces under throttle.
    """
    dev = _dev(ctx)
    aid = _get(ctx, "APP_ID")
    base = "https://play.google.com/console"
    for _attempt in range(2):
        page.goto(
            f"{base}/u/0/developers/{dev}/app/{aid}/app-content/{slug}",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        arm_low_footprint(page)
        pace(page, 5.0)
        activate(page, ctx)
        if f"app-content/{slug}" in (page.url or ""):
            step(ctx, f"section open (direct): {desc}")
            return
        step(ctx, f"section bounced — retrying ({desc})")
    step(ctx, f"direct section failed — dashboard fallback ({desc})")


def open_task(page, ctx: dict, label_patterns: list, desc: str) -> None:
    """From the dashboard, open one policy/store task row by its label."""
    open_dashboard(page, ctx)
    expand_view_tasks(page, ctx)
    # Unhydrated row text clicks do nothing under throttle — verify we LEFT
    # the dashboard (sections live under app-content/* AND store-listings/*).
    for _retry in range(3):
        try:
            click_any(page, ctx, label_patterns, f"open {desc}")
        except Exception:
            pass
        page.wait_for_timeout(4000)
        activate(page, ctx)
        _u = page.url or ""
        if "/app-dashboard" not in _u and not _u.rstrip("/").endswith("app-list"):
            break
        step(ctx, f"still on dashboard — re-expanding (try {_retry + 1})")
        expand_view_tasks(page, ctx)
    _u = page.url or ""
    if "/app-dashboard" in _u or _u.rstrip("/").endswith("app-list"):
        failshot(page, ctx, f"open-{desc}", RuntimeError("task click never navigated"))
    assert_dev(page, ctx, f"{desc}-id")
    # Was networkidle(45s): holds the CDP session on long-polling XHRs that
    # 429 anyway — domcontentloaded + short pace, targeted waits gate below.
    settle(page)


# ── shared EN+AR patterns ──────────────────────────────────────────────────

YES_PATTERNS = [re.compile(r"^yes$", re.I), re.compile(r"^نعم$", re.I)]
NO_PATTERNS = [re.compile(r"^no$", re.I), re.compile(r"^لا$", re.I)]
NEXT_PATTERNS = [re.compile(r"next|continue|التالي|متابعة", re.I)]
ADD_PATTERNS = [re.compile(r"^add$|^add new$|إضافة|إضافة جديد", re.I)]
APPLY_PATTERNS = [re.compile(r"^apply$|^تطبيق$", re.I)]
SUBMIT_PATTERNS = [re.compile(r"submit|send for review|إرسال للمراجعة|تقديم", re.I)]
MANAGE_PATTERNS = [re.compile(r"^manage$|^start$|^review$|إدارة|بدء|مراجعة", re.I)]

DATA_SAFETY_LABELS = [re.compile(r"data safety|سلامة البيانات", re.I)]
STORE_LISTING_LABELS = [re.compile(r"set up your store listing|main store listing|بطاقة بيانات المتجر", re.I)]
APP_ACCESS_LABELS = [re.compile(r"sign in details|app access|الوصول إلى التطبيق|تفاصيل تسجيل الدخول", re.I)]

COLLECT_Q = [
    re.compile(r"collect or share any.*required user data|do you collect.*user data", re.I),
    re.compile(r"جمع.*بيانات المستخدم|مشاركة.*بيانات المستخدم", re.I),
]
ENCRYPT_Q = [
    re.compile(r"encrypted in transit|encrypt.*transit", re.I),
    re.compile(r"تشفير.*أثناء النقل|مشفرة أثناء النقل", re.I),
]
DELETE_Q = [
    re.compile(r"request that their data is deleted|way for users.*delet", re.I),
    re.compile(r"طلب حذف.*بيانات|إمكانية حذف البيانات", re.I),
]
DELETE_CONTACT_PATTERNS = [
    re.compile(r"deletion.*(link|url|email)|where.*request.*delet", re.I),
    re.compile(r"رابط الحذف|بريد الحذف|طلب الحذف", re.I),
]
SHARING_Q = [
    re.compile(r"shar(ed|ing).*(third part|outside|external)|third-part.*shar", re.I),
    re.compile(r"مشاركة.*طرف|أطراف خارجية", re.I),
]
PRIVACY_PATTERNS = [
    re.compile(r"privacy polic", re.I),
    re.compile(r"سياسة الخصوصية", re.I),
]
ADD_TYPE_PATTERNS = [
    re.compile(r"add data type|manage data types|declare.*data|add.*data", re.I),
    re.compile(r"إضافة نوع بيانات|إدارة أنواع البيانات|الإفصاح عن البيانات", re.I),
]
PURPOSE_APP_FUNCTIONALITY = [re.compile(r"app functionality|وظائف التطبيق|وظيفة التطبيق", re.I)]
PURPOSE_ACCOUNT_MANAGEMENT = [re.compile(r"account management|إدارة الحساب", re.I)]
ADD_TYPE_WIDE_PATTERNS = [
    re.compile(r"add data type|manage data types|declare.*data|data.?type|combin", re.I),
    re.compile(r"add|create|new|declare|manage|combin", re.I),
    re.compile(r"إضافة نوع بيانات|إدارة أنواع البيانات|الإفصاح عن البيانات|نوع.*بيانات|مجموعة", re.I),
    re.compile(r"إضافة|إنشاء|جديد|الإفصاح|إدارة", re.I),
]
DATA_TYPES_HEADING = [re.compile(r"data types|أنواع البيانات", re.I)]
PURPOSE_APP_EXACT = ["App functionality", "وظائف التطبيق", "وظيفة التطبيق"]
PURPOSE_ACCOUNT_EXACT = ["Account management", "إدارة الحساب"]
NO_EXACT_LABELS = ["No", "لا"]
# Section/type exact labels (answer_no idiom: get_by_label exact + count==1 +
# is_checked verify; count guard makes extra candidates safe to probe).
SECTION_PERSONAL_EXACT = ["Personal info", "معلومات شخصية"]
SECTION_CONTACT_EXACT = ["Contact", "جهات الاتصال", "معلومات الاتصال"]
SECTION_ACTIVITY_EXACT = ["App activity", "نشاط التطبيق"]
DTYPE_NAME_EXACT = ["Name", "Full name", "الاسم"]
DTYPE_PHONE_EXACT = ["Phone number", "رقم الهاتف"]
DTYPE_CREDENTIALS_EXACT = ["Account credentials", "بيانات الاعتماد"]

# Step-3 arrival gate — exact stepper strings read off the failshots:
# "Overview — 2 Data collection and security — 3 Data types —
#  4 Data usage and handling — 5 Preview".
# DATA_TYPES_HEADING alone is NOT a gate: "data types" also matches step-2
# text ("required user data types" / "View required data types"), which is
# why the driver scoped a "data-types container" while still on step 2.
STEP3_HEADING = [re.compile(r"^data types$", re.I), re.compile(r"^أنواع البيانات$", re.I)]
STEP2_MARKERS = [
    re.compile(r"collect or share any.*required user data", re.I),
    re.compile(r"data collection and security", re.I),
]
# Stepper-current evidence (EN+AR): the stepper item carries "3" together with
# the Data-types label when step 3 is the current step.
STEP3_ACTIVE_PATTERNS = [
    re.compile(r"3\s*data types", re.I),
    re.compile(r"3\s*أنواع البيانات", re.I),
]


def _step3_entry_visible(page) -> bool:
    """Probe only (never click): any add/entry control visible+enabled."""
    _total = _visible = 0
    for pattern in ADD_TYPE_PATTERNS + ADD_TYPE_WIDE_PATTERNS:
        for role in ("button", "link"):
            try:
                cands = page.get_by_role(role, name=pattern).all()
            except Exception:
                continue
            for el in cands:
                _total += 1
                try:
                    if el.is_visible():
                        _visible += 1
                    if el.is_visible() and el.is_enabled():
                        LOG.info("step-3 probe: entry control visible+enabled (%s)", role)
                        return True
                except Exception:
                    continue
    LOG.warning("step-3 probe: no enabled entry control (cands=%d visible=%d)", _total, _visible)
    return False


def _on_data_types_step(page) -> bool:
    """True only when the wizard is really on step 3 (Data types).

    Requires BOTH (a) stepper shows step 3 active — visible exact
    "Data types" heading PLUS current-step evidence (visible "3 Data types"
    stepper text EN+AR, or an aria-current/selected or active-class element
    owning the Data-types label); AND (b) at least one add/entry control
    visible+enabled (probe only). STEP2 markers present → False (still on
    step 2). Caller logs the button inventory + soft shot on False.
    """
    try:
        body = page.inner_text("body") or ""
    except Exception:
        LOG.warning("step-3 gate: body unreadable")
        return False
    if any(p.search(body) for p in STEP2_MARKERS):
        LOG.warning("step-3 gate: STEP2 markers present — still on step 2")
        return False
    _heading_ok = False
    for pat in STEP3_HEADING:
        try:
            page.get_by_text(pat).first.wait_for(state="visible", timeout=3000)
            _heading_ok = True
            break
        except Exception:
            continue
    if not _heading_ok:
        LOG.warning("step-3 gate: Data-types heading not visible")
        return False
    # (a) stepper-current evidence: stepper text first, then aria/class state.
    _active = False
    for pat in STEP3_ACTIVE_PATTERNS:
        try:
            page.get_by_text(pat).first.wait_for(state="visible", timeout=3000)
            _active = True
            break
        except Exception:
            continue
    if not _active:
        try:
            sels = page.locator(
                "[aria-current], [aria-selected='true'], "
                "[class*='active'], [class*='current'], [class*='selected']"
            ).all()
        except Exception:
            sels = []
        for el in sels:
            try:
                if not el.is_visible():
                    continue
                txt = (el.inner_text(timeout=1000) or "").strip()
                if re.search(r"data types|أنواع البيانات", txt, re.I):
                    _active = True
                    break
            except Exception:
                continue
    if not _active:
        LOG.warning("step-3 gate: stepper not showing step 3 active")
        return False
    # (b) at least one add/entry control visible+enabled.
    _entry = _step3_entry_visible(page)
    if not _entry:
        LOG.warning("step-3 gate: heading+stepper OK but no entry control")
    else:
        LOG.info("step-3 gate: PASSED (heading+stepper+entry)")
    return _entry


def _label_exact_check(page, ctx: dict, labels: list, desc: str) -> bool:
    """group_simple.answer_no idiom: exact label, count==1, verify checked."""
    for lab in labels:
        try:
            box = page.get_by_label(lab, exact=True)
            if box.count() != 1:
                continue
            box.first.wait_for(state="visible", timeout=5000)
            box.first.check()
            pace(page, 0.5)
            if box.first.is_checked():
                step(ctx, f"answered by exact label: {desc} = [{lab}]")
                return True
        except Exception:
            continue
    return False


def _purpose_exact_labels(purposes: list) -> list:
    """Map decl['purposes'] regexes to candidate exact EN+AR checkbox labels."""
    try:
        joined = " ".join(getattr(p, "pattern", "") for p in purposes).lower()
    except Exception:
        return list(PURPOSE_APP_EXACT)
    if "account management" in joined:
        return list(PURPOSE_ACCOUNT_EXACT)
    return list(PURPOSE_APP_EXACT)


def fill_deletion_contact(page, ctx: dict) -> None:
    """Fill the deletion contact email; WARNING + continue if no field appears in 30s."""
    # 1) known-label fast path (no failshot — the live label is still unknown).
    for pattern in DELETE_CONTACT_PATTERNS:
        for method in ("label", "placeholder", "textbox"):
            try:
                if method == "label":
                    field = page.get_by_label(pattern)
                elif method == "placeholder":
                    field = page.get_by_placeholder(pattern)
                else:
                    field = page.get_by_role("textbox", name=pattern)
                field.first.wait_for(state="visible", timeout=2000)
                field.first.fill(SUPPORT_EMAIL)
                pace(page, 0.5)
                if SUPPORT_EMAIL in (field.first.input_value() or ""):
                    step(ctx, "filled deletion contact (label match)")
                    return
            except Exception:
                continue
    # 2) generic: wait up to 30s for ANY new textbox in the deletion container,
    #    then fill the first empty visible one. Nearest ancestor must own a
    #    non-radio input/textarea (radios alone must not satisfy the scope).
    deadline = time.time() + 30
    poll = 0
    while time.time() < deadline:
        for qpat in DELETE_Q:
            try:
                question = page.get_by_text(qpat).first
                question.wait_for(state="visible", timeout=2000)
            except Exception:
                continue
            try:
                scope = question.locator(
                    "xpath=ancestor::*[descendant::input"
                    "[not(@type='radio') and not(@type='checkbox')]"
                    " or descendant::textarea][1]"
                )
                boxes = scope.get_by_role("textbox").all()
            except Exception:
                boxes = []
            for box in boxes:
                try:
                    if not box.is_visible():
                        continue
                    if (box.input_value() or "").strip():
                        continue
                    box.fill(SUPPORT_EMAIL)
                    pace(page, 0.5)
                    if SUPPORT_EMAIL in (box.input_value() or ""):
                        step(ctx, "filled deletion contact (container scan)")
                        return
                except Exception:
                    continue
        # Backoff (1s→5s cap): same 30s deadline, fewer CDP round-trips.
        pace(page, min(5.0, 1.0 * (2.0**poll)))
        poll += 1
    step(ctx, "WARNING: deletion contact field never appeared (30s), continuing")


def _log_button_inventory(page, ctx: dict, desc: str) -> None:
    """Dump visible button/link texts so the next iteration can hard-code the entry."""
    try:
        items: list = []
        for role in ("button", "link"):
            try:
                for el in page.get_by_role(role).all():
                    try:
                        if not el.is_visible():
                            continue
                        txt = (el.inner_text(timeout=1000) or "").strip().replace("\n", " ")
                        if txt:
                            items.append(f"{role}:{txt[:80]}")
                    except Exception:
                        continue
            except Exception:
                continue
        LOG.error(
            "[%s] button inventory (%s, %d): %s",
            _key(ctx),
            desc,
            len(items),
            " | ".join(items[:60]) or "<none>",
        )
    except Exception:
        pass


def _click_add_type_entry(page, ctx: dict, desc: str) -> None:
    """Click the step-3 Data-types entry via a wide EN+AR scan in its container."""
    scope = None
    for hpat in DATA_TYPES_HEADING:
        try:
            head = page.get_by_text(hpat).first
            head.wait_for(state="visible", timeout=5000)
            scope = head.locator("xpath=ancestor::*[descendant::button or descendant::a][1]")
            step(ctx, f"data-types container scoped: {desc}")
            break
        except Exception:
            continue
    roots = [scope] if scope is not None else []
    roots.append(page)
    for root in roots:
        for pattern in ADD_TYPE_PATTERNS + ADD_TYPE_WIDE_PATTERNS:
            for role in ("button", "link"):
                try:
                    cands = root.get_by_role(role, name=pattern).all()
                except Exception:
                    continue
                for el in cands:
                    try:
                        if not el.is_visible() or not el.is_enabled():
                            continue
                        el.click(timeout=5000)
                        step(ctx, f"clicked {role} entry: {desc}")
                        return
                    except Exception:
                        continue
    _log_button_inventory(page, ctx, desc)
    failshot(page, ctx, f"add type entry: {desc}", RuntimeError(f"no add-type control matched: {desc}"))

# (section, section_exact, dtype, dtype_exact, purposes, desc) — explicit
# per-item handling: label-EXACT first (answer_no idiom), regex row-walk as
# fallback, flat checkbox picker last. Misses WARNING + continue, never raise.
DATA_DECLARATIONS = (
    {
        "section": [re.compile(r"personal info|معلومات شخصية", re.I)],
        "section_exact": SECTION_PERSONAL_EXACT,
        "dtype": [re.compile(r"^name$|full name|الاسم", re.I)],
        "dtype_exact": DTYPE_NAME_EXACT,
        "purposes": PURPOSE_APP_FUNCTIONALITY,
        "desc": "Personal info / Name (App functionality)",
    },
    {
        "section": [re.compile(r"contact|جهات الاتصال|معلومات الاتصال", re.I)],
        "section_exact": SECTION_CONTACT_EXACT,
        "dtype": [re.compile(r"phone number|رقم الهاتف", re.I)],
        "dtype_exact": DTYPE_PHONE_EXACT,
        "purposes": PURPOSE_APP_FUNCTIONALITY,
        "desc": "Contact / Phone number (App functionality)",
    },
    {
        "section": [re.compile(r"app activity|نشاط التطبيق", re.I)],
        "section_exact": SECTION_ACTIVITY_EXACT,
        "dtype": [
            re.compile(r"account credentials|credentials|login|user.?name|password|بيانات الاعتماد", re.I)
        ],
        "dtype_exact": DTYPE_CREDENTIALS_EXACT,
        "purposes": PURPOSE_ACCOUNT_MANAGEMENT,
        "desc": "App activity / Account credentials (Account management)",
    },
)


def declare_data_type(page, ctx: dict, decl: dict) -> None:
    """Add one collected data type: section → type → purposes → sharing NO.

    Never raises: not on step 3, or any sub-step misses, means WARNING +
    button inventory + soft screenshot, then return so the remaining types
    still get their chance.
    """
    desc = str(decl["desc"])
    if not _on_data_types_step(page):
        _log_button_inventory(page, ctx, desc)
        _soft_shot(page, ctx, f"not-on-step3 {desc}")
        step(ctx, f"WARNING: not on Data-types step, skipping: {desc}")
        return
    try:
        _declare_data_type_inner(page, ctx, decl)
    except Exception as exc:
        _log_button_inventory(page, ctx, desc)
        _soft_shot(page, ctx, f"data-type {desc}")
        step(ctx, f"WARNING: failed declaring {desc} ({exc}), continuing")


def _declare_data_type_inner(page, ctx: dict, decl: dict) -> None:
    """declare_data_type body (raises → caller converts to WARNING+continue)."""
    desc = str(decl["desc"])
    # (a) reuse: a type row for the target already listed → expand it, no add.
    _reused = False
    for _tpat in decl["dtype"]:
        try:
            _row = page.get_by_text(_tpat).first
            _row.wait_for(state="visible", timeout=4000)
            try:
                _row.click(timeout=5000)
            except Exception:
                pass
            step(ctx, f"reusing existing type row: {desc}")
            _reused = True
            break
        except Exception:
            continue
    if not _reused:
        # (b) wide EN+AR button/link scan in the Data-types container;
        # (c) on total miss failshot after dumping the button inventory.
        _click_add_type_entry(page, ctx, desc)
    pace(page, 2.0)
    expand_all(page, ctx)
    # Category then concrete type: label-EXACT FIRST (answer_no idiom:
    # get_by_label exact + count==1 + is_checked verify), regex row-walk
    # second, flat checkbox picker last. A miss is WARNING + continue only.
    for _slot, _what in (("section", "section"), ("dtype", "dtype")):
        _answered = False
        _exact = list(decl.get(f"{_slot}_exact", []) or [])
        if _exact:
            _answered = _label_exact_check(page, ctx, _exact, f"{_what} exact: {desc}")
        if not _answered:
            for _pat in decl[_slot]:
                try:
                    check_row_for_text(page, ctx, _pat, f"{_what}: {desc}")
                    _answered = True
                    break
                except Exception:
                    continue
        if not _answered:
            try:
                pick_one(page, ctx, "checkbox", decl[_slot], f"flat picker {_what}: {desc}")
                _answered = True
            except Exception:
                pass
        if not _answered:
            step(ctx, f"WARNING: {_what} checkbox not found, continuing: {desc}")
        pace(page, 1.5)
    pace(page, 1.5)
    try_click(page, ctx, NEXT_PATTERNS + APPLY_PATTERNS, f"confirm type picker: {desc}")
    pace(page, 2.0)
    expand_all(page, ctx)
    # Purposes: label-exact FIRST (answer_no idiom), then row-walk, then flat picker.
    _p_answered = _label_exact_check(
        page, ctx, _purpose_exact_labels(decl["purposes"]), f"purpose: {desc}"
    )
    if not _p_answered:
        for pattern in decl["purposes"]:
            try:
                check_row_for_text(page, ctx, pattern, f"purpose: {desc}")
                _p_answered = True
                break
            except Exception:
                continue
    if not _p_answered:
        try:
            pick_one(page, ctx, "checkbox", decl["purposes"], f"purpose: {desc}")
        except Exception:
            step(ctx, f"WARNING: purpose checkbox not found, continuing: {desc}")
    # Sharing with third parties NO: label-exact FIRST, then scoped row-walk.
    if not _label_exact_check(page, ctx, NO_EXACT_LABELS, f"sharing NO: {desc}"):
        try:
            answer_near(page, ctx, SHARING_Q, NO_PATTERNS, f"sharing NO: {desc}")
        except Exception:
            step(ctx, f"WARNING: sharing question not found, continuing: {desc}")
    pace(page, 1.0)
    try_click(page, ctx, NEXT_PATTERNS + APPLY_PATTERNS, f"confirm type detail: {desc}")
    save_and_verify(page, ctx, f"data type {desc}")


def run_data_safety(page, ctx: dict) -> None:
    """Dashboard 'Data safety' → collection declaration → sharing NO → submit."""
    step(ctx, "DATA SAFETY: start")
    open_task(page, ctx, DATA_SAFETY_LABELS, "Data safety")
    try_click(page, ctx, MANAGE_PATTERNS + NEXT_PATTERNS, "enter questionnaire")
    pace(page, 2.0)
    expand_all(page, ctx)
    # Intro carousel ("Help users understand..."): advance past it until a
    # real question appears. Only ENABLED Next controls are clicked.
    for _i in range(6):
        try:
            _q = page.get_by_text(
                re.compile(r"does .* collect|do you collect|does your app (collect|share)", re.I)
            ).first
            _q.wait_for(state="visible", timeout=4000)
            break
        except Exception:
            pass
        _clicked = False
        for _role in ("link", "button"):
            try:
                for _el in page.get_by_role(_role, name=re.compile(r"^next$", re.I)).all():
                    try:
                        if _el.is_visible() and _el.is_enabled():
                            _el.click(timeout=5000)
                            _clicked = True
                            break
                    except Exception:
                        continue
                if _clicked:
                    break
            except Exception:
                continue
        pace(page, 2.5)
        if not _clicked:
            break
    # Gate: FULL step-2 CONTROLS rendered. Texts render before controls under
    # throttle, and partial saves can persist partial state — never act partial.
    _needles = [
        re.compile(r"collect or share any.*required user data", re.I),
        re.compile(r"encrypted in transit", re.I),
        re.compile(r"account creation", re.I),
    ]
    _deadline = time.time() + 300
    _poll = 0
    while time.time() < _deadline:
        _nr = _nc = _nx = 0
        _bt = ""
        _ok = False
        try:
            _nr = page.get_by_role("radio").count()
            _nc = page.get_by_role("checkbox").count()
            _nx = page.get_by_role("button", name=re.compile(r"next", re.I)).count()
            _bt = page.inner_text("body") or ""
            _ok = (
                _nr >= 6
                and _nc >= 1
                and _nx >= 1
                and all(p.search(_bt) for p in _needles)
            )
        except Exception:
            _ok = False
        if _ok:
            step(ctx, f"step-2 controls ready (radios={_nr} checks={_nc})")
            break
        # Backoff (5s→10s cap): same 300s deadline, ~half the body reads.
        pace(page, min(10.0, 5.0 * (2.0**_poll)))
        _poll += 1
    else:
        step(ctx, "WARNING: step-2 controls never complete — proceeding anyway")
    # Q1: collects user data → YES (we declare Name / Phone / Credentials).
    answer_question(page, ctx, COLLECT_Q[0], "Yes", "collects user data YES")
    pace(page, 1.5)
    # Security: encrypted in transit YES (https to backend.fastfree.cloud).
    try:
        answer_question(page, ctx, ENCRYPT_Q[0], "Yes", "encrypted in transit YES")
    except Exception:
        step(ctx, "WARNING: encryption question not found, continuing")
    pace(page, 1.5)
    # Deletion: users can request deletion via the support email. The contact
    # field label is unknown — fill_deletion_contact waits 30s for ANY new
    # textbox in the deletion container, else WARNING + continue (Next safe).
    try:
        answer_question(page, ctx, DELETE_Q[0], "Yes", "deletion available YES")
        pace(page, 1.5)
        fill_deletion_contact(page, ctx)
    except Exception:
        step(ctx, "WARNING: deletion question not found, continuing")
    pace(page, 1.5)
    # Account creation methods (Frappe login): Username and password ONLY.
    # Click the LABEL text (fires framework change events like a human tap).
    try:
        _ac = page.get_by_label("Username and password", exact=True)
        if _ac.count() == 1:
            _ac.first.wait_for(state="visible", timeout=8000)
            try:
                _aclab = page.get_by_text("Username and password", exact=True).first
                _aclab.wait_for(state="visible", timeout=5000)
                _aclab.click(timeout=5000)
            except Exception:
                _ac.first.check()
            pace(page, 0.8)
            if _ac.first.is_checked():
                step(ctx, "checked account method: Username and password")
            else:
                failshot(page, ctx, "account-method", RuntimeError("did not stick"))
        else:
            step(ctx, "WARNING: account-method label not unique, skipping")
    except Exception as exc:
        step(ctx, f"WARNING: account-method question not found ({exc}), continuing")
    pace(page, 1.5)
    # Deletion URL (appears after deletion-YES): use the privacy page, which
    # carries the support contact for deletion requests. Flagged to the human.
    try:
        _du = page.get_by_label(re.compile(r"delete account", re.I))
        if _du.count() >= 1:
            _du.first.wait_for(state="visible", timeout=8000)
            _du.first.scroll_into_view_if_needed()
            _du.first.click()
            _du.first.clear()
            _du.first.press_sequentially(PRIVACY_URL, delay=10)
            _du.first.press("Tab")  # blur: touched+dirty so Angular keeps it
            pace(page, 1.0)
            if PRIVACY_URL in (_du.first.input_value() or ""):
                step(ctx, "filled deletion URL (privacy page)")
            else:
                step(ctx, "WARNING: deletion URL fill unverified")
        else:
            step(ctx, "WARNING: deletion URL field absent")
    except Exception:
        step(ctx, "WARNING: deletion URL field not found, continuing")
    pace(page, 1.5)
    # Step-2 Next-gate diagnosis (live: answers stick + draft saves, yet the
    # footer Next stays DISABLED). Suspected gates, likelihood order:
    #  (1) deletion CONTACT email empty — a field DISTINCT from the deletion
    #      URL (fill_deletion_contact probes it separately); Next needs both.
    #  (2) account-method unchecked by a re-render AFTER our check.
    #  (3) a YES answered on a stale render, then reset server-side by Save.
    #  (4) conditionally-revealed follow-up left empty after its parent YES.
    #  (5) badges/opt-out section needing an explicit choice.
    # Guard: re-assert every item in dependency order with per-item verify
    # logging, immediately before each Next attempt. No blind Next retries:
    # Next is clicked ONLY when probed ENABLED; DISABLED -> 10s gap, one
    # retry, then FULL control inventory + soft return (draft saved).
    def _reassert_step2(tag: str) -> None:
        for _pat, _dn in (
            (re.compile(r"collect or share any.*required user data", re.I), "collects"),
            (re.compile(r"encrypted in transit", re.I), "encrypted"),
            (DELETE_Q[0], "deletion"),
        ):
            try:
                _q = page.get_by_text(_pat).first
                _q.wait_for(state="visible", timeout=8000)
                _scope = _q.locator("xpath=ancestor::*[descendant::*[@role='radio']][1]")
                _yes = None
                for _ypat in YES_PATTERNS:
                    try:
                        _cand = _scope.get_by_label(_ypat).first
                        _cand.wait_for(state="visible", timeout=3000)
                        _yes = _cand
                        break
                    except Exception:
                        continue
                if _yes is None:
                    step(ctx, f"WARNING: [{tag}] {_dn} YES option not found")
                    continue
                try:
                    if not _yes.is_checked():
                        if not _click_label_for(page, _yes):
                            _yes.check()
                        pace(page, 0.8)
                except Exception:
                    try:
                        if not _click_label_for(page, _yes):
                            _yes.check()
                        pace(page, 0.8)
                    except Exception:
                        pass
                if _yes.is_checked():
                    step(ctx, f"re-asserted {_dn}=YES [{tag}]")
                else:
                    step(ctx, f"WARNING: [{tag}] {_dn}=YES did not stick")
            except Exception as exc:
                step(ctx, f"WARNING: [{tag}] {_dn} re-assert skipped ({exc})")
        # Gate (1): deletion CONTACT email — distinct from the URL field.
        try:
            _email_ok = False
            try:
                _boxes = page.get_by_role("textbox").all()
            except Exception:
                _boxes = []
            for _box in _boxes:
                try:
                    if not _box.is_visible():
                        continue
                    if SUPPORT_EMAIL in (_box.input_value() or ""):
                        _email_ok = True
                        break
                except Exception:
                    continue
            if _email_ok:
                step(ctx, f"re-asserted deletion contact email [{tag}]")
            else:
                try:
                    fill_deletion_contact(page, ctx)
                    step(ctx, f"WARNING: [{tag}] deletion email empty — refill attempted (see above)")
                except Exception as exc:
                    step(ctx, f"WARNING: [{tag}] deletion email refill failed ({exc})")
        except Exception as exc:
            step(ctx, f"WARNING: [{tag}] deletion-email probe skipped ({exc})")
        # Gate (4): deletion URL refill if a re-render emptied it.
        try:
            _du2 = page.get_by_label(re.compile(r"delete account", re.I))
            if _du2.count() >= 1:
                try:
                    _du2.first.wait_for(state="visible", timeout=5000)
                    if PRIVACY_URL not in (_du2.first.input_value() or ""):
                        _du2.first.click()
                        _du2.first.clear()
                        _du2.first.press_sequentially(PRIVACY_URL, delay=10)
                        _du2.first.press("Tab")
                        pace(page, 0.8)
                    if PRIVACY_URL in (_du2.first.input_value() or ""):
                        step(ctx, f"re-asserted deletion URL [{tag}]")
                    else:
                        step(ctx, f"WARNING: [{tag}] deletion URL refill unverified")
                except Exception as exc:
                    step(ctx, f"WARNING: [{tag}] deletion URL re-assert skipped ({exc})")
            else:
                step(ctx, f"WARNING: [{tag}] deletion URL field absent")
        except Exception as exc:
            step(ctx, f"WARNING: [{tag}] deletion URL probe skipped ({exc})")
        # Gate (2): account-method — a re-render can uncheck AFTER our check.
        try:
            _ac2 = page.get_by_label("Username and password", exact=True)
            if _ac2.count() == 1:
                try:
                    if not _ac2.first.is_checked():
                        try:
                            _aclab2 = page.get_by_text("Username and password", exact=True).first
                            _aclab2.wait_for(state="visible", timeout=5000)
                            _aclab2.click(timeout=5000)
                        except Exception:
                            _ac2.first.check()
                        pace(page, 0.8)
                except Exception:
                    pass
                if _ac2.first.is_checked():
                    step(ctx, f"re-asserted account method [{tag}]")
                else:
                    step(ctx, f"WARNING: [{tag}] account method did not stick")
            else:
                step(ctx, f"WARNING: [{tag}] account-method count={_ac2.count()} (want 1)")
        except Exception as exc:
            step(ctx, f"WARNING: [{tag}] account-method probe skipped ({exc})")
        # Gates (4/5): any visible radio group with nothing checked — a
        # conditionally-revealed or badges/opt-out question blocks Next.
        try:
            try:
                _radios = page.get_by_role("radio").all()
            except Exception:
                _radios = []
            _groups: dict = {}
            _checked_total = 0
            for _r in _radios:
                try:
                    if not _r.is_visible():
                        continue
                    if _r.is_checked():
                        _checked_total += 1
                    _nm = _r.get_attribute("name") or ""
                    _groups.setdefault(_nm, []).append(_r)
                except Exception:
                    continue
            _unanswered: list = []
            for _nm, _members in _groups.items():
                try:
                    if any(_m.is_checked() for _m in _members):
                        continue
                    _qlab = _radio_label(page, _members[0])[:60]
                    _unanswered.append(f"name={_nm or '<noname>'} first={_qlab or '<nolabel>'}")
                except Exception:
                    continue
            step(ctx, f"step-2 unanswered radio groups={len(_unanswered)} [{tag}]")
            for _u in _unanswered[:5]:
                step(ctx, f"WARNING: [{tag}] unanswered radio group: {_u}")
        except Exception as exc:
            step(ctx, f"WARNING: [{tag}] unanswered-scan skipped ({exc})")

    def _next_probe() -> tuple:
        """Footer Next state without clicking (no blind retries)."""
        for _pat in NEXT_PATTERNS:
            try:
                for _el in page.get_by_role("button", name=_pat).all():
                    try:
                        if not _el.is_visible():
                            continue
                        try:
                            _disabled = _el.is_disabled()
                        except Exception:
                            _disabled = not _el.is_enabled()
                        return ("disabled" if _disabled else "enabled", _el)
                    except Exception:
                        continue
            except Exception:
                continue
        return ("absent", None)

    def _log_step2_inventory(desc: str) -> None:
        """FULL step-2 inventory: every visible radio/checkbox/textbox + state."""
        try:
            _rows: list = []
            for _role in ("radio", "checkbox", "textbox"):
                try:
                    _els = page.get_by_role(_role).all()
                except Exception:
                    continue
                for _el in _els:
                    try:
                        if not _el.is_visible():
                            continue
                        if _role == "textbox":
                            _val = (_el.input_value() or "")[:60]
                            _st = f"value={_val!r}"
                        else:
                            try:
                                _st = "checked" if _el.is_checked() else "unchecked"
                            except Exception:
                                _st = "state?"
                            try:
                                _st += ",disabled" if _el.is_disabled() else ",enabled"
                            except Exception:
                                pass
                        _lab = _radio_label(page, _el)[:70]
                        if not _lab:
                            try:
                                _lab = (_el.get_attribute("aria-label") or "")[:70]
                            except Exception:
                                _lab = ""
                        _rows.append(f"{_role}:{_lab or '<nolabel>'} [{_st}]")
                    except Exception:
                        continue
            LOG.error(
                "[%s] step-2 control inventory (%s, %d): %s",
                _key(ctx),
                desc,
                len(_rows),
                " | ".join(_rows[:120]) or "<none>",
            )
            step(ctx, f"step-2 control inventory dumped ({len(_rows)} controls): {desc}")
        except Exception as exc:
            step(ctx, f"WARNING: control inventory failed ({exc})")

    # Reordered pre-Next sequence: re-assert ALL -> Save draft -> wait ->
    # verify toast -> Next (max 2, 10s gap). A stuck step-2 soft-returns.
    _reassert_step2("pre-save")
    if try_click(page, ctx, [re.compile(r"^save draft$", re.I)], "Save draft step 2"):
        pace(page, 4.0)
        try:
            from playwright.sync_api import expect

            expect(
                page.get_by_text(
                    re.compile(r"changes have been saved|draft saved|changes saved|تم الحفظ", re.I)
                ).first
            ).to_be_visible(timeout=30000)
            step(ctx, "step-2 save verified (toast seen)")
        except Exception:
            step(ctx, "WARNING: step-2 save toast never appeared")
    else:
        step(ctx, "WARNING: Save draft button unavailable before Next")
    # Advance to step 3 (Data types). The footer Next stays DISABLED while
    # step-2 requirements are unmet (failshots: grey Next, wizard still on
    # "Data collection and security"), so verify arrival via the stepper gate
    # instead of assuming the click advanced the wizard.
    _on_types = False
    for _attempt in range(2):
        # Deterministic guard immediately before the attempt (dependency
        # order inside); a Save-wait re-render may have reset answers.
        _reassert_step2(f"pre-next-{_attempt + 1}")
        _state, _next_el = _next_probe()
        step(ctx, f"Next state before attempt {_attempt + 1}: {_state}")
        if _state == "enabled" and _next_el is not None:
            try:
                _next_el.click(timeout=5000)
                step(ctx, f"Next clicked (enabled) attempt {_attempt + 1}")
            except Exception as exc:
                step(ctx, f"WARNING: Next click failed ({exc})")
            pace(page, 4.0)
        elif _state == "disabled":
            step(ctx, f"Next DISABLED before attempt {_attempt + 1} — no blind click")
        else:
            step(ctx, f"WARNING: Next {_state} before attempt {_attempt + 1} — no blind click")
        expand_all(page, ctx)
        if _on_data_types_step(page):
            _on_types = True
            step(ctx, "on Data-types step (gate passed)")
            break
        step(ctx, f"still on step 2 after Next (try {_attempt + 1})")
        if _attempt == 0:
            pace(page, 10.0)
    if not _on_types:
        step(ctx, "step-2 STUCK — Next still disabled after 2 attempts (draft saved, soft return)")
        _log_step2_inventory("step-3 arrival")
        _log_button_inventory(page, ctx, "step-3 arrival")
        _soft_shot(page, ctx, "step-3 arrival miss")
        step(ctx, "WARNING: Data-types step never reached — skipping type declarations")
        try_click(page, ctx, [re.compile(r"^save draft$", re.I)], "Save draft (step 3 unreachable)")
        pace(page, 3.0)
        step(ctx, "DATA SAFETY: done (step 3 unreachable — draft saved)")
        open_dashboard(page, ctx)
        return
    # The three declared data types, each with purposes + sharing NO.
    # declare_data_type never raises (WARNING+continue inside); this guard
    # is belt-and-braces so one type can never fail the whole task.
    for decl in DATA_DECLARATIONS:
        try:
            declare_data_type(page, ctx, decl)
        except Exception as exc:
            step(ctx, f"WARNING: failed declaring {decl['desc']} ({exc}), continuing")
        pace(page, 1.5)
    # Privacy policy link for the safety section.
    try:
        fill_any(page, ctx, PRIVACY_PATTERNS, PRIVACY_URL, "privacy policy URL")
    except Exception:
        step(ctx, "WARNING: privacy policy field not on this step (set in store listing)")
    save_and_verify(page, ctx, "data safety answers")
    # Submit for review (dialog-scoped confirm, §5).
    if try_click(page, ctx, SUBMIT_PATTERNS, "submit data safety"):
        pace(page, 2.0)
        try:
            confirm_in_dialog(
                page,
                ctx,
                [re.compile(r"submit|review|إرسال|مراجعة", re.I)],
                SUBMIT_PATTERNS + APPLY_PATTERNS,
                "submit confirm",
            )
        except Exception:
            step(ctx, "no submit confirmation dialog — continuing to verify")
        pace(page)
        try:
            from playwright.sync_api import expect

            expect(
                page.get_by_text(
                    re.compile(r"submitted|in review|under review|no issues|complete|تم الإرسال|قيد المراجعة",
                               re.I)
                ).first
            ).to_be_visible(timeout=60000)
        except Exception as exc:
            failshot(page, ctx, "data-safety-submit", RuntimeError(f"submit not confirmed: {exc}"))
    else:
        step(ctx, "no Submit button (already submitted?) — save verified above")
    step(ctx, "DATA SAFETY: done")
    open_dashboard(page, ctx)


# ── store listing ──────────────────────────────────────────────────────────

TITLE_PATTERNS = [re.compile(r"^app name$|^title$|اسم التطبيق|عنوان التطبيق", re.I)]
SHORT_PATTERNS = [re.compile(r"short description|وصف قصير", re.I)]
FULL_PATTERNS = [re.compile(r"full description|الوصف الكامل", re.I)]
ICON_UPLOAD_PATTERNS = [re.compile(r"app icon|أيقونة التطبيق", re.I)]
FEATURE_UPLOAD_PATTERNS = [re.compile(r"feature graphic|الصورة المميزة|الرسم المميز", re.I)]
SHOTS_UPLOAD_PATTERNS = [re.compile(r"phone screenshots|لقطات.*الهاتف|screenshots", re.I)]
ADD_LANGUAGE_PATTERNS = [re.compile(r"add (a )?language|manage translations|إضافة لغة", re.I)]

LOCALES: tuple = (
    ("en-US", [re.compile(r"english \(united states\)|english.*en-US|الإنجليزية", re.I)]),
    ("ar", [re.compile(r"^arabic$|arabic.*\(ar\)|العربية", re.I)]),
)


def slug_from_package(package: str) -> str:
    """com.fastfree.pos → pos (ledger package com.fastfree.ledger → ledger)."""
    slug = (package or "").strip().lower().split(".")[-1]
    if slug not in ("pos", "erp", "hr", "ledger"):
        raise RuntimeError(f"cannot resolve fastlane slug from PACKAGE={package!r}")
    return slug


def read_locale_texts(slug: str, locale: str) -> dict:
    """Read title/short/full at RUNTIME from the fastlane metadata dirs.

    Hardened: utf-8-sig (BOM-safe), CRLF-normalized, single-line guards
    for title/short; fails loudly with locale-qualified paths so a human
    fixes the fastlane txt instead of us truncating store copy.
    """
    base = REPO_ROOT / "apps" / f"fastfree_{slug}" / "fastlane" / "metadata" / "android" / locale
    texts: dict = {}
    for key, filename in (
        ("title", "title.txt"),
        ("short", "short_description.txt"),
        ("full", "full_description.txt"),
    ):
        path = base / filename
        if not path.is_file():
            raise RuntimeError(f"missing listing asset [{locale}]: {path}")
        raw = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").strip()
        texts[key] = "\n".join(line.rstrip() for line in raw.split("\n")).strip()
        if not texts[key]:
            raise RuntimeError(f"empty listing asset [{locale}]: {path}")
    if "\n" in texts["title"]:
        raise RuntimeError(f"title must be single-line [{locale}] (fix {base}/title.txt)")
    if "\n" in texts["short"]:
        raise RuntimeError(f"short must be single-line [{locale}] (fix {base})")
    if len(texts["title"]) > TITLE_LIMIT:
        raise RuntimeError(f"title {len(texts['title'])} chars > {TITLE_LIMIT} [{locale}]")
    if len(texts["short"]) > SHORT_LIMIT:
        raise RuntimeError(f"short {len(texts['short'])} chars > {SHORT_LIMIT} [{locale}]")
    if len(texts["full"]) > FULL_LIMIT:
        raise RuntimeError(f"full {len(texts['full'])} chars > {FULL_LIMIT} [{locale}]")
    return texts


def resolve_images(slug: str, locale: str) -> dict:
    """Per-locale images dir, falling back to en-US when a file is absent.

    Hardened: rejects empty (0-byte) files, logs fallback usage, sorts
    shots deterministically so uploads are stable across runs.
    """
    want = REPO_ROOT / "apps" / f"fastfree_{slug}" / "fastlane" / "metadata" / "android"
    fallback = want / "en-US" / "images"
    local = want / locale / "images"
    resolved: dict = {}
    shots = sorted(local.glob("phone-screenshots/*.png")) or sorted(fallback.glob("phone-screenshots/*.png"))
    shots = [p for p in shots if p.is_file() and p.stat().st_size > 0]
    for key, filename in (("icon", "icon.png"), ("feature", "feature-graphic.png")):
        candidate = local / filename
        used_fallback = False
        if not candidate.is_file():
            candidate = fallback / filename
            used_fallback = True
        if not candidate.is_file():
            raise RuntimeError(f"missing graphic asset [{locale}/{key}]: {candidate}")
        if candidate.stat().st_size == 0:
            raise RuntimeError(f"empty graphic asset [{locale}/{key}]: {candidate}")
        if used_fallback and locale != "en-US":
            LOG.info("listing image fallback to en-US: [%s] %s", locale, filename)
        resolved[key] = candidate
    if not shots:
        raise RuntimeError(f"no phone screenshots in {local} nor {fallback}")
    resolved["shots"] = shots
    LOG.info("listing images [%s]: shots=%d", locale, len(shots))
    return resolved


def select_locale(page, ctx: dict, locale: str, name_patterns: list) -> None:
    """Switch the store-listing editor to locale via the language dropdown.

    UI model (observed live, .../store-listings/default/edit): header
    "Default store listing" + "Select a language to edit" + ONE dropdown
    button showing e.g. "Default - English (United States) - en-US". There
    are NO locale tabs; sections below are App details / Graphics (icon,
    feature, screenshots) / Chromebook assets / Android XR assets (SKIP
    non-Android sections); footer Discard | Save as draft | Next(enabled).

    Flow: (1) read current dropdown text — match means already active;
    (2) else click dropdown, log every visible option FIRST, then click the
    option loosely matching the locale (en-US ~ "English (United States)",
    ar ~ "Arabic"); dropdown option markup is UNKNOWN (a prior probe hung
    on click) so every wait/click here is timeout-bounded and every miss
    dumps the option inventory to the log; (3) option absent means look for
    an "Add language" control, add, then re-select; (4) verify the dropdown
    text matches the wanted locale, else failshot after the inventory.

    name_patterns is kept for callers and used as fallback matchers.
    """
    want = (locale or "").strip().lower().replace("_", "-")
    if want.startswith("en"):
        tokens = ["english (united states)", "en-us", "english"]
    elif want.startswith("ar"):
        tokens = ["arabic", "العربية", "- ar", "(ar)"]
    else:
        tokens = [want] if want else []

    def _matches(text: str) -> bool:
        low = (text or "").lower()
        for tok in tokens:
            if tok and tok in low:
                return True
        for pat in name_patterns or []:
            try:
                if isinstance(pat, str):
                    if pat.lower() in low:
                        return True
                elif pat.search(text or ""):
                    return True
            except Exception:
                continue
        return False

    def _dropdown_buttons() -> list:
        found: list = []
        for role in ("button", "combobox"):
            try:
                cands = page.get_by_role(role).all()
            except Exception:
                continue
            for el in cands:
                try:
                    if not el.is_visible():
                        continue
                    txt = (el.inner_text(timeout=1000) or "").strip()
                except Exception:
                    continue
                if not txt:
                    continue
                low = txt.lower()
                if (
                    "default" in low
                    or "english" in low
                    or "arabic" in low
                    or "en-us" in low
                    or "العربية" in txt
                    or _matches(txt)
                ):
                    found.append(el)
        return found

    def _read_active() -> str:
        for el in _dropdown_buttons():
            try:
                txt = (el.inner_text(timeout=1000) or "").strip().replace("\n", " ")
                if txt:
                    return txt
            except Exception:
                continue
        return ""

    def _log_option_inventory(desc: str) -> None:
        items: list = []
        for role in ("option", "menuitem"):
            try:
                cands = page.get_by_role(role).all()
            except Exception:
                continue
            for el in cands:
                try:
                    if not el.is_visible():
                        continue
                    txt = (el.inner_text(timeout=1000) or "").strip().replace("\n", " ")
                    if txt:
                        items.append(f"{role}:{txt[:80]}")
                except Exception:
                    continue
        LOG.error(
            "[%s] locale-option inventory (%s, %d): %s",
            _key(ctx),
            desc,
            len(items),
            " | ".join(items[:60]) or "<none>",
        )
        _log_button_inventory(page, ctx, f"locale-options {desc}")

    def _click_matching_option(desc: str) -> bool:
        for role in ("option", "menuitem"):
            try:
                cands = page.get_by_role(role).all()
            except Exception:
                continue
            for el in cands:
                try:
                    if not el.is_visible() or not el.is_enabled():
                        continue
                    txt = (el.inner_text(timeout=1000) or "").strip()
                except Exception:
                    continue
                if txt and _matches(txt):
                    try:
                        el.click(timeout=5000)
                        step(ctx, f"clicked locale option [{desc}]: {txt[:80]}")
                        return True
                    except Exception:
                        continue
        return False

    def _select_via_dropdown(tag: str) -> bool:
        buttons = _dropdown_buttons()
        if not buttons:
            step(ctx, f"locale dropdown button not found [{tag}]")
            return False
        try:
            buttons[0].click(timeout=5000)
        except Exception:
            step(ctx, f"locale dropdown click hung/failed [{tag}]")
            return False
        pace(page, 2.0)
        _log_option_inventory(f"{tag} {locale}")
        if _click_matching_option(tag):
            pace(page, 2.0)
            active = _read_active()
            if active and _matches(active):
                step(ctx, f"locale dropdown verified [{tag}]: {locale} ({active[:80]})")
                return True
            step(ctx, f"option clicked but dropdown unverified [{tag}]: {active[:80]}")
            return False
        step(ctx, f"locale {locale} not among dropdown options [{tag}]")
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass
        pace(page, 1.0)
        return False

    active = _read_active()
    step(ctx, f"locale dropdown current: {active[:100]!r} (want {locale})")
    if active and _matches(active):
        step(ctx, f"locale already active: {locale}")
        return
    if _select_via_dropdown("direct"):
        return
    pace(page, 1.5)
    if _select_via_dropdown("retry"):
        step(ctx, f"locale dropdown selected on retry: {locale}")
        return
    # Option absent → "Manage languages" option in the dropdown opens the manager.
    # NOTE: Play renders the items as role=option OR role=menuitem (varies).
    def _click_manage_languages(tag: str) -> bool:
        mg_pat = re.compile(r"manage languages", re.I)
        for role in ("option", "menuitem"):
            try:
                mg = page.get_by_role(role, name=mg_pat)
                mg.first.wait_for(state="visible", timeout=6000)
                mg.first.click(timeout=5000)
                step(ctx, f"clicked Manage languages [{tag}/{role}]")
                return True
            except Exception:
                continue
        return False

    manage_opened = False
    try:
        _dbs = _dropdown_buttons()
        if _dbs:
            _dbs[0].click(timeout=5000)
            pace(page, 2.0)
            if _click_manage_languages("open"):
                step(ctx, f"opened Manage languages for {locale}")
                pace(page, 3.0)
                manage_opened = True
            else:
                step(ctx, "Manage languages item not found — falling back")
    except Exception as exc:
        step(ctx, f"Manage languages open failed ({exc}) — falling back to Add button")

    if manage_opened:
        # Dialog has a Search box + checkbox list + Apply/Cancel.
        search = page.get_by_placeholder("Search")
        try:
            search.first.wait_for(state="visible", timeout=8000)
            search.first.fill("")
            search.first.press_sequentially(locale, delay=80)
            step(ctx, f"searched language {locale} in Manage languages")
            pace(page, 2.0)
        except Exception:
            pass

        added = False
        for pat in list(name_patterns or []) + tokens:
            try:
                check_row_for_text(page, ctx, pat, f"pick language {locale}")
                added = True
                break
            except Exception:
                continue
        if not added:
            # Fallback: click checkbox near text
            for tok in [locale] + (tokens or []):
                try:
                    row = page.get_by_text(re.compile(re.escape(tok), re.I)).first
                    cb = row.locator("input[type='checkbox'], .mat-mdc-checkbox").first
                    cb.click(timeout=3000)
                    added = True
                    step(ctx, f"checked language checkbox via fallback [{tok}]")
                    break
                except Exception:
                    continue
        if not added:
            _log_option_inventory(f"add-miss {locale}")
            msg = f"language {locale} not offered in Manage languages"
            failshot(page, ctx, f"locale-{locale}", RuntimeError(msg))
        pace(page, 1.0)
        try_click(page, ctx, APPLY_PATTERNS, f"confirm Manage languages for {locale}")
        pace(page, 3.0)

        # After Apply, the page usually navigates straight to the new
        # locale's form, whose locale button reads "Arabic - ar". Detect
        # that FIRST: the generic dropdown re-select below cannot work
        # there (the menu no longer lists the active locale).
        try:
            ab = page.get_by_role("button", name=re.compile(r"arabic", re.I))
            ab.first.wait_for(state="visible", timeout=8000)
            step(ctx, f"locale {locale} form active after Manage languages")
            return
        except Exception:
            pass

        # Check if we're already on the target locale page.
        cur_url = page.url
        if locale.replace("-", "").lower() in cur_url.lower():
            step(ctx, f"navigated to {locale} page directly")
            return

        # Check if dropdown still exists and try selecting.
        _dbs2 = _dropdown_buttons()
        if _dbs2:
            if _select_via_dropdown("after-manage"):
                return
            pace(page, 1.5)
            if _select_via_dropdown("after-manage-retry"):
                return

        # Re-check the locale-form button (navigation may have lagged).
        try:
            ab = page.get_by_role("button", name=re.compile(r"arabic", re.I))
            ab.first.wait_for(state="visible", timeout=8000)
            step(ctx, f"locale {locale} form active after Manage languages")
            return
        except Exception:
            pass

        # Check if "Select language" button appeared (multi-language mode).
        try:
            sel_btn = page.get_by_role("button", name=re.compile(r"select language", re.I))
            sel_btn.first.wait_for(state="visible", timeout=5000)
            sel_btn.first.click(timeout=5000)
            pace(page, 2.0)
            # Try selecting from this alternate dropdown.
            _alt_roles = ("option", "menuitem")
            for _role in _alt_roles:
                _done = False
                try:
                    _opts = page.get_by_role(_role).all()
                except Exception:
                    continue
                for opt in _opts:
                    try:
                        txt = opt.text_content() or ""
                        if not txt or not opt.is_visible():
                            continue
                        if locale.lower() in txt.lower():
                            opt.click(timeout=3000)
                            pace(page, 2.0)
                            step(ctx, f"selected {locale} from Select language menu")
                            _done = True
                            break
                    except Exception:
                        continue
                if _done:
                    return
        except Exception:
            pass

        _log_option_inventory(f"final-after-manage {locale}")
        msg = f"locale dropdown {locale} never active after Manage languages"
        failshot(page, ctx, f"locale-{locale}", RuntimeError(msg))
        return

    # Fallback: try "Add language" button directly (older console layout).
    step(ctx, f"locale {locale} absent — trying Add language")
    add_pats = [*ADD_LANGUAGE_PATTERNS, re.compile(r"add (a )?language", re.I)]
    if not try_click(page, ctx, add_pats, f"add language {locale}"):
        _log_option_inventory(f"no-add-control {locale}")
        failshot(
            page, ctx, f"locale-{locale}", RuntimeError(f"locale {locale} absent, no Add language")
        )
    pace(page, 2.0)
    expand_all(page, ctx)
    added = False
    for pat in list(name_patterns or []) + tokens:
        try:
            check_row_for_text(page, ctx, pat, f"pick language {locale}")
            added = True
            break
        except Exception:
            continue
    if not added:
        _log_option_inventory(f"add-miss {locale}")
        failshot(page, ctx, f"locale-{locale}", RuntimeError(f"language {locale} not offered"))
    try_click(page, ctx, APPLY_PATTERNS + NEXT_PATTERNS, f"confirm add language {locale}")
    pace(page, 2.5)
    if _select_via_dropdown("after-add"):
        return
    pace(page, 1.5)
    if _select_via_dropdown("after-add-retry"):
        return
    _log_option_inventory(f"final {locale}")
    failshot(page, ctx, f"locale-{locale}", RuntimeError(f"locale dropdown {locale} never active"))


_DRAWER_SEL = (
    "material-drawer[end].mat-drawer-expanded, "
    "mat-drawer[end].mat-drawer-expanded, "
    "material-drawer[end][visible], mat-drawer[end][visible]"
)


def _drawer_scope(page):
    """Scope of the open right asset drawer, else None.

    Probed: "Search assets" is a placeholder (get_by_text never matches an
    empty search box), so text-walking misses wide-open drawers. Detect the
    temporary material drawer itself: visible + non-trivial on-screen width
    left of the viewport edge (a closed drawer is hidden or translated
    off-canvas).
    """
    try:
        vp = page.viewport_size or {"width": 1600, "height": 900}
        for d in page.locator(_DRAWER_SEL).all():
            try:
                if not d.is_visible():
                    continue
                box = d.bounding_box() or {}
                w = box.get("width", 0)
                x = box.get("x", 0)
                if w > 100 and x < vp["width"] - 50:
                    return d
            except Exception:
                continue
    except Exception:
        pass
    return None


def _drawer_button(drawer, exact: str):
    """Find a drawer button by exact accessible name, then exact text."""
    try:
        b = drawer.get_by_role(
            "button", name=re.compile(f"^{exact}$", re.I)
        ).first
        b.wait_for(state="visible", timeout=4000)
        return b
    except Exception:
        pass
    try:
        for b in drawer.get_by_role("button").all():
            try:
                if b.is_visible() and (b.text_content() or "").strip() == exact:
                    return b
            except Exception:
                continue
    except Exception:
        pass
    return None


def _ensure_drawer_closed(page, ctx: dict, desc: str) -> None:
    """Close the asset drawer if open; VERIFY it actually closed (retry).

    A leftover drawer covers the form with a drawer-background overlay that
    intercepts pointer events (seen blocking slot buttons, locale dropdown,
    save). Open-detection is the material drawer itself (the "Search assets"
    label is a placeholder get_by_text never matches). Dismissal order per
    attempt: header X (topmost close — lower ones belong to filter chips) →
    backdrop JS-click (coordinate clicks risk the nav rail) → Escape. Each
    attempt logs its method so runs reveal which dismissal actually works.
    """
    if _drawer_scope(page) is None:
        return
    for _attempt in range(3):
        if _drawer_scope(page) is None:
            step(ctx, f"drawer closed: {desc}")
            return
        drawer = _drawer_scope(page)
        # 1. Header X.
        try:
            cands: list = []
            if drawer is not None:
                try:
                    btns = drawer.get_by_role(
                        "button", name=re.compile(r"^close$", re.I)
                    ).all()
                except Exception:
                    btns = []
                for b in btns:
                    try:
                        if b.is_visible():
                            box = b.bounding_box() or {}
                            cands.append((box.get("y", 1e9), b))
                    except Exception:
                        continue
            if cands:
                cands.sort(key=lambda t: t[0])
                cands[0][1].click(timeout=4000)
                step(ctx, f"drawer close attempt: header-X [{desc}]")
                pace(page, 2.0)
                if _drawer_scope(page) is None:
                    step(ctx, f"drawer closed: {desc}")
                    return
        except Exception:
            pass
        # 2. Backdrop JS-click (no coordinates → cannot mis-hit the nav).
        try:
            hit = False
            for b in page.locator("div.drawer-background").all():
                try:
                    if b.is_visible():
                        b.evaluate("e => e.click()")
                        hit = True
                        break
                except Exception:
                    continue
            if hit:
                step(ctx, f"drawer close attempt: backdrop [{desc}]")
                pace(page, 2.0)
                if _drawer_scope(page) is None:
                    step(ctx, f"drawer closed: {desc}")
                    return
        except Exception:
            pass
        # 3. Escape.
        try:
            page.keyboard.press("Escape")
            pace(page, 2.0)
            if _drawer_scope(page) is None:
                step(ctx, f"drawer closed: {desc}")
                return
        except Exception:
            pass
    step(ctx, f"WARNING: drawer may still be open: {desc}")


def upload_near(page, ctx: dict, label_patterns: list, paths: list, desc: str,
                heading_patterns: tuple = ()) -> None:
    """Upload file(s) into the slot owning the label text (never OS picker).

    Probed flow: slot "Add assets" button → right drawer ("Add assets to
    your library") → drawer "Upload" button → OS file chooser → asset row
    appears (auto-selected) → drawer "Add" attaches it to the slot.
    Uploads are verified by file-row text (basename/stem) in the slot.
    """
    tried: list = []
    wanted = [Path(p).name for p in paths]
    # Sweep the page top→bottom once so lazy-rendered upload labels attach.
    try:
        page.evaluate(
            """(async () => {
                const h = document.documentElement.scrollHeight;
                for (let y = 0; y <= h; y += 600) {
                    window.scrollTo(0, y);
                    await new Promise(r => setTimeout(r, 120));
                }
            })()"""
        )
        pace(page, 1.5)
    except Exception:
        pass

    def _row_visible(root, name: str) -> bool:
        try:
            root.get_by_text(re.compile(re.escape(name), re.I)).first.wait_for(
                state="visible", timeout=2000
            )
            return True
        except Exception:
            return False

    def _verify(section, tag: str) -> bool:
        # SECTION-ONLY: the open drawer lists the same basenames, so a page
        # fallback would false-positive on drawer rows instead of the slot.
        deadline = time.time() + 30
        poll = 0
        while time.time() < deadline:
            hit = 0
            for name in wanted:
                stem = Path(name).stem
                if _row_visible(section, name) or _row_visible(section, stem):
                    hit += 1
            if hit >= len(wanted):
                step(ctx, f"upload verified [{tag}]: {desc} ({hit}/{len(wanted)})")
                return True
            # Backoff (1s→5s cap): same 30s deadline, fewer CDP round-trips.
            pace(page, min(5.0, 1.0 * (2.0**poll)))
            poll += 1
        return False

    # Label candidates: short visible text only (skip description paragraphs).
    def _collect():
        cands: list = []
        for pattern in label_patterns:
            try:
                els = page.get_by_text(pattern).all()
            except Exception:
                continue
            for el in els:
                try:
                    if not el.is_visible():
                        continue
                    txt = (el.text_content() or "").strip()
                except Exception:
                    continue
                if not txt or len(txt) > 120:
                    continue
                cands.append(el)
        return cands

    cands = _collect()
    if not cands and heading_patterns:
        for _r in range(3):
            _expand_listing_section(
                page, ctx, list(heading_patterns), f"{desc} section",
                expect="uploads",
            )
            pace(page, 2.0)
            cands = _collect()
            if cands:
                break
    if not cands:
        failshot(page, ctx, desc, RuntimeError(f"no upload label visible: {desc}"))

    def _drawer_attach() -> bool:
        """Upload (if needed) + select + Add inside the open drawer."""
        drawer = _drawer_scope(page)
        if drawer is None:
            tried.append("drawer scope not found")
            return False
        # Clear a stale drawer search: a previous fill may have typed into
        # the drawer search box (seen: privacy URL), filtering library rows
        # out of view for every later slot.
        try:
            for inp in drawer.locator("input").all():
                try:
                    if inp.is_visible() and (inp.input_value() or ""):
                        inp.fill("")
                except Exception:
                    continue
            pace(page, 1.0)
        except Exception:
            pass

        def _rows_present() -> bool:
            try:
                txt = drawer.text_content() or ""
            except Exception:
                return False
            return all(w in txt for w in wanted)

        if not _rows_present():
            up = _drawer_button(drawer, "Upload")
            if up is None:
                tried.append("drawer Upload missing")
                return False
            try:
                with page.expect_file_chooser(timeout=10000) as fc:
                    up.click(timeout=5000)
                fc.value.set_files([str(p) for p in paths])
                step(ctx, f"chose files for {desc} ({len(paths)})")
            except Exception as exc:
                tried.append(f"drawer upload failed: {str(exc)[:100]}")
                return False
            deadline = time.time() + 60
            while time.time() < deadline:
                if _rows_present():
                    break
                pace(page, 2.0)
            if not _rows_present():
                tried.append(f"uploaded rows never appeared: {wanted}")
                return False
            step(ctx, f"drawer rows present: {desc}")
        add_btn = _drawer_button(drawer, "Add")
        try:
            enabled = add_btn.is_enabled() if add_btn is not None else False
        except Exception:
            enabled = add_btn is not None
        if add_btn is None or not enabled:
            # Fresh drawer shows no Add until a tile is selected — click each
            # wanted tile's SELECT button (probed: asset-tile hosts
            # a[debug-id='select-button']; tile/text clicks do not select).
            # Missing Add implies nothing selected, so these clicks cannot
            # toggle a selection off.
            for w in wanted:
                try:
                    t = drawer.get_by_text(
                        re.compile(re.escape(w), re.I)
                    ).first
                    t.wait_for(state="visible", timeout=4000)
                    n = t
                    tile = None
                    for _ in range(10):
                        n = n.locator("xpath=..")
                        try:
                            if n.locator("asset-tile").count() >= 1:
                                tile = n.locator("asset-tile").first
                                break
                        except Exception:
                            break
                    if tile is None:
                        continue
                    sel = None
                    for cand_sel in (
                        "[debug-id='select-button']",
                        "a.select-button",
                    ):
                        try:
                            c = tile.locator(cand_sel).first
                            c.wait_for(state="visible", timeout=3000)
                            sel = c
                            break
                        except Exception:
                            continue
                    if sel is None:
                        tile.click(timeout=4000)
                    else:
                        sel.click(timeout=5000)
                    pace(page, 1.5)
                except Exception:
                    pass
            add_btn = _drawer_button(drawer, "Add")
        if add_btn is None:
            tried.append("drawer Add missing")
            return False
        try:
            enabled = add_btn.is_enabled()
        except Exception:
            enabled = True
        if not enabled:
            tried.append("drawer Add stayed disabled")
            return False
        try:
            add_btn.click(timeout=5000)
        except Exception as exc:
            tried.append(f"drawer Add click failed: {str(exc)[:80]}")
            return False
        try:
            page.get_by_text(re.compile(r"search assets", re.I)).first.wait_for(
                state="hidden", timeout=15000
            )
            step(ctx, f"drawer closed after Add: {desc}")
        except Exception:
            step(ctx, f"WARNING: drawer still open after Add: {desc}")
        return True

    for lab in cands:
        node = lab
        btn = None
        section = None
        for _d in range(14):
            try:
                node = node.locator("xpath=..")
                btns = node.locator("button:has-text('Add assets')").all()
            except Exception:
                break
            vis = []
            for b in btns:
                try:
                    if b.is_visible() and b.is_enabled():
                        vis.append(b)
                except Exception:
                    continue
            if vis:
                btn = vis[0]
                section = node
                break
        if btn is None or section is None:
            tried.append("no Add-assets button near label")
            continue
        # Idempotence: the draft persists server-side, so a slot may already
        # carry the file from an earlier run. Skip the drawer dance if every
        # wanted basename/stem shows in the owning scope. SECTION-ONLY: the
        # asset drawer lists the same filenames, so any page-level fallback
        # would false-positive on drawer rows (seen: shots "attached" while
        # the slot sat empty).
        try:
            scope_txt = section.text_content() or ""
        except Exception:
            scope_txt = ""
        if all((w in scope_txt or Path(w).stem in scope_txt) for w in wanted):
            step(ctx, f"already attached, skipping drawer: {desc}")
            _ensure_drawer_closed(page, ctx, f"{desc} already-attached")
            return
        _ensure_drawer_closed(page, ctx, f"{desc} pre-slot")
        # Retry loop: the page may still be processing the previous slot's
        # upload, and scroll_into_view can park the button under the sticky
        # footer — center-scroll via JS before each attempt.
        opened = False
        last_exc = ""
        for _try in range(3):
            try:
                btn.evaluate("e => e.scrollIntoView({block: 'center'})")
            except Exception:
                try:
                    btn.scroll_into_view_if_needed(timeout=4000)
                except Exception:
                    pass
            pace(page, 1.0)
            try:
                if _try >= 2:
                    # Last resort: overlay-proof DOM click (sticky footer or
                    # drawer remnants can cover the button; a JS click fires
                    # its handlers regardless and is safe here — worst case
                    # the drawer simply does not open).
                    btn.evaluate("e => e.click()")
                else:
                    btn.click(timeout=10000)
                page.get_by_text(
                    re.compile(r"search assets|add assets to your library", re.I)
                ).first.wait_for(state="visible", timeout=10000)
                step(ctx, f"asset drawer opened: {desc}")
                opened = True
                break
            except Exception as exc:
                last_exc = str(exc)[:80]
                pace(page, 2.0)
        if not opened:
            tried.append(f"drawer never opened: {last_exc}")
            continue
        if not _drawer_attach():
            _ensure_drawer_closed(page, ctx, desc)
            continue
        pace(page, 2.0)
        if _verify(section, "direct"):
            _ensure_drawer_closed(page, ctx, desc)
            return
        # Filename row absent — but a thumbnail-only render also means the
        # slot is filled: if its Add-assets button is gone, accept it.
        remaining: list = []
        try:
            for b in section.locator("button:has-text('Add assets')").all():
                try:
                    if b.is_visible():
                        remaining.append(b)
                except Exception:
                    continue
        except Exception:
            remaining = [True]
        if not remaining:
            step(ctx, f"attached (thumbnail render, no file row): {desc}")
            _ensure_drawer_closed(page, ctx, desc)
            return
        tried.append(f"{desc}: file-row never appeared after Add")
    _ensure_drawer_closed(page, ctx, desc)
    failshot(page, ctx, desc, RuntimeError(f"no verified upload near {desc}: {' | '.join(tried)}"))


def _section_container(page, ctx: dict, heading_pat, min_textboxes=0, min_files=0,
                       min_addbtn=0, max_depth=14):
    """Smallest ancestor of the heading with enough attached controls.

    Returns (head, container). Container may be None when the panel content
    is not attached yet (section collapsed or lazy). Upload panels expose
    no file inputs even when open — use min_addbtn for those.
    """
    try:
        head = page.get_by_text(heading_pat).first
        head.wait_for(state="visible", timeout=8000)
    except Exception:
        return None, None
    node = head
    for _depth in range(max_depth):
        try:
            node = node.locator("xpath=..")
            ok = True
            if min_textboxes and node.get_by_role("textbox").count() < min_textboxes:
                ok = False
            if min_files and node.locator("input[type='file']").count() < min_files:
                ok = False
            if min_addbtn:
                try:
                    n_add = node.locator("button:has-text('Add assets')").count()
                except Exception:
                    n_add = 0
                if n_add < min_addbtn:
                    ok = False
            if ok:
                return head, node
        except Exception:
            break
    return head, None


def _visible_in(node, role=None, name_pat=None, input_type=None) -> list:
    found: list = []
    try:
        if input_type:
            cands = node.locator(f"input[type='{input_type}']").all()
        elif name_pat is not None:
            cands = node.get_by_role(role, name=name_pat).all()
        else:
            cands = node.get_by_role(role).all()
    except Exception:
        return found
    for el in cands:
        try:
            if el.is_visible():
                found.append(el)
        except Exception:
            continue
    return found


def _expand_listing_section(
    page, ctx: dict, heading_patterns: list, desc: str, expect: str = "textboxes"
) -> None:
    """Expand a collapsed store-listing section via its chevron state.

    expect="textboxes" → ≥3 visible textboxes in the panel (Common text).
    expect="uploads" → ≥1 visible Add-assets button in the panel (visual).
    Reads the expand_more (collapsed) / expand_less (open) chevron owning
    the heading — never blind-toggles — and re-checks state every attempt.
    """
    add_pat = re.compile(r"add assets", re.I)

    def _chevron(head):
        """(button, is_open) for the chevron owning this heading.

        NOTE: chevron buttons carry no usable accessible name — find them
        by the mat-icon ligature text (expand_more / expand_less).
        """
        node = head
        for _d in range(10):
            try:
                node = node.locator("xpath=..")
            except Exception:
                return None, None
            for lig, is_open in (("expand_less", True), ("expand_more", False)):
                try:
                    btns = node.locator(f"button:has-text('{lig}')").all()
                except Exception:
                    continue
                for b in btns:
                    try:
                        if b.is_visible():
                            return b, is_open
                    except Exception:
                        continue
        return None, None

    def _panel_open(pat) -> bool:
        # Depth-capped for uploads (without a cap the walk balloons to the
        # whole form and borrows other sections' Add buttons as false "open"
        # evidence). Text panels nest deep — full depth, balloon risk is low
        # (min 3 attached textboxes rarely exists outside the open panel).
        _, container = _section_container(
            page,
            ctx,
            pat,
            min_textboxes=3 if expect == "textboxes" else 0,
            min_addbtn=1 if expect == "uploads" else 0,
            max_depth=14 if expect == "textboxes" else 8,
        )
        if container is None:
            return False
        try:
            container.scroll_into_view_if_needed(timeout=3000)
        except Exception:
            pass
        if expect == "textboxes":
            return len(_visible_in(container, role="textbox")) >= 3
        return bool(_visible_in(container, role="button", name_pat=add_pat))

    for pat in heading_patterns:
        for _attempt in range(4):
            if _panel_open(pat):
                step(ctx, f"section open: {desc}")
                return
            try:
                heads = page.get_by_text(pat).all()
            except Exception:
                heads = []
            clicked = False
            for head in heads:
                try:
                    if not head.is_visible():
                        continue
                except Exception:
                    continue
                btn, is_open = _chevron(head)
                if btn is None:
                    continue
                if is_open:
                    # Chevron says open but panel not showing content:
                    # scroll and wait for lazy render.
                    try:
                        head.scroll_into_view_if_needed(timeout=3000)
                    except Exception:
                        pass
                    pace(page, 2.0)
                    clicked = True
                    break
                try:
                    btn.click(timeout=5000)
                    clicked = True
                except Exception:
                    continue
                pace(page, 2.5)
                break
            if not clicked:
                break
        if _panel_open(pat):
            step(ctx, f"expanded section: {desc}")
            return
        step(ctx, f"WARNING: section not expandable: {desc}")
        return
    step(ctx, f"WARNING: section not expandable (maybe open): {desc}")


def fill_locale_listing(page, ctx: dict, slug: str, locale: str) -> None:
    """Fill texts + graphics + privacy URL for one locale, then save+verify.

    Hardened: every text fill is re-read via input_value, uploads verify
    file-row inside upload_near, save uses save_and_verify (Saved-text).
    Raises → run_store_listing converts to WARNING+continue per locale.
    """
    step(ctx, f"STORE LISTING [{locale}]: start")
    # A leftover asset drawer covers the form with an overlay that blocks
    # the locale dropdown — make sure it is closed before starting.
    _ensure_drawer_closed(page, ctx, f"[{locale}] pre-locale")
    select_locale(page, ctx, locale, [p for _, pats in LOCALES if _ == locale for p in pats])
    texts = read_locale_texts(slug, locale)
    images = resolve_images(slug, locale)

    _expand_listing_section(
        page, ctx, [re.compile(r"common text assets", re.I)], "Common text assets"
    )
    # Scroll to top before filling text fields (page may have auto-scrolled).
    try:
        page.evaluate("window.scrollTo(0, 0)")
        pace(page, 1.0)
    except Exception:
        pass
    def _fill_verified(patterns: list, value: str, desc: str) -> None:
        fill_any(page, ctx, patterns, value, desc)
        want = (value or "").strip()
        probe = want[:60]
        deadline = time.time() + 15
        poll = 0
        while time.time() < deadline:
            for pattern in patterns:
                for method in ("label", "placeholder", "textbox"):
                    try:
                        if method == "label":
                            field = page.get_by_label(pattern)
                        elif method == "placeholder":
                            field = page.get_by_placeholder(pattern)
                        else:
                            field = page.get_by_role("textbox", name=pattern)
                        first = field.first
                        first.wait_for(state="visible", timeout=2000)
                        cur = first.input_value() or ""
                        if want in cur or (probe and probe in cur):
                            step(ctx, f"fill verified: {desc}")
                            return
                    except Exception:
                        continue
            try:
                for box in page.get_by_role("textbox").all():
                    try:
                        if not box.is_visible():
                            continue
                        if probe and probe in (box.input_value() or ""):
                            step(ctx, f"fill verified (sweep): {desc}")
                            return
                    except Exception:
                        continue
            except Exception:
                pass
            # Backoff (1s→5s cap): same 15s deadline, fewer CDP round-trips.
            pace(page, min(5.0, 1.0 * (2.0**poll)))
            poll += 1
        _soft_shot(page, ctx, f"fill-verify {desc}")
        raise RuntimeError(f"fill not reflected in input_value: {desc}")

    TEXT_PAT = re.compile(r"common text assets", re.I)

    def _fill_texts_in_order(pairs: list) -> None:
        """Fill Common-text-assets textboxes by DOM order (title, short, full).

        Play's inputs carry no usable accessible names, so match by order
        inside the section panel. Retries ~30s: the full-description
        textarea lazy-renders on scroll.
        """
        head, container = _section_container(page, ctx, TEXT_PAT, min_textboxes=3)
        if head is None or container is None:
            failshot(
                page, ctx, f"[{locale}] text fields",
                RuntimeError("Common text assets panel not attached"),
            )
        boxes: list = []
        deadline = time.time() + 30
        while time.time() < deadline:
            boxes = _visible_in(container, role="textbox")
            if len(boxes) >= len(pairs):
                break
            try:
                container.scroll_into_view_if_needed(timeout=3000)
            except Exception:
                pass
            try:
                head.click(timeout=4000)
            except Exception:
                pass
            pace(page, 2.0)
        if len(boxes) < len(pairs):
            failshot(
                page, ctx, f"[{locale}] text fields",
                RuntimeError(f"found {len(boxes)} textboxes, need {len(pairs)}"),
            )
        for box, item in zip(boxes, pairs, strict=False):
            d, val = item
            try:
                box.scroll_into_view_if_needed(timeout=5000)
            except Exception:
                pass
            pace(page, 0.5)
            try:
                box.click(timeout=3000)
                box.fill("")
            except Exception:
                pass
            box.fill(val)
            pace(page, 1.0)
            try:
                cur = box.input_value() or ""
            except Exception:
                cur = ""
            probe = (val or "").strip()[:60]
            if probe and probe not in cur and (val or "").strip() not in cur:
                failshot(page, ctx, d, RuntimeError(f"ordered fill not reflected: {d}"))
            step(ctx, f"fill verified (ordered): {d}")

    _fill_texts_in_order(
        [
            (f"[{locale}] app name", texts["title"]),
            (f"[{locale}] short description", texts["short"]),
            (f"[{locale}] full description", texts["full"]),
        ]
    )
    pace(page, 1.5)
    vis_headings = (re.compile(r"common visual assets", re.I),)
    phone_headings = (re.compile(r"^phone assets", re.I),)
    _expand_listing_section(
        page, ctx, list(vis_headings), "Common visual assets",
        expect="uploads",
    )
    upload_near(page, ctx, ICON_UPLOAD_PATTERNS, [images["icon"]],
                f"[{locale}] app icon", heading_patterns=vis_headings)
    upload_near(page, ctx, FEATURE_UPLOAD_PATTERNS, [images["feature"]],
                f"[{locale}] feature graphic", heading_patterns=vis_headings)
    _expand_listing_section(
        page, ctx, list(phone_headings), "Phone assets",
        expect="uploads",
    )
    upload_near(page, ctx, SHOTS_UPLOAD_PATTERNS, images["shots"],
                f"[{locale}] phone screenshots", heading_patterns=phone_headings)
    # The drawer must be gone: fill_any's empty-box fallback once typed the
    # privacy URL into the drawer's own search box, and the drawer overlay
    # covers the Save control.
    _ensure_drawer_closed(page, ctx, f"[{locale}] pre-privacy")
    _fill_verified(PRIVACY_PATTERNS, PRIVACY_URL, f"[{locale}] privacy policy URL")
    _ensure_drawer_closed(page, ctx, f"[{locale}] pre-save")
    save_and_verify(page, ctx, f"store listing {locale}")
    step(ctx, f"STORE LISTING [{locale}]: done")


def run_store_listing(page, ctx: dict) -> None:
    """'Set up your store listing' → per-locale (ar + en-US) texts + graphics.

    Hardened: CONTROLS gate after entering the editor (never text alone),
    per-locale isolation (one locale WARNING+continues), final re-visit
    verifies both locales show saved state.
    """
    step(ctx, "STORE LISTING: start")
    slug = slug_from_package(_get(ctx, "PACKAGE"))
    step(ctx, f"resolved slug: {slug}")
    open_task(page, ctx, STORE_LISTING_LABELS, "store listing")
    try_click(page, ctx, MANAGE_PATTERNS, "enter main listing editor")
    pace(page, 2.0)
    expand_all(page, ctx)
    gate_deadline = time.time() + 120
    gate_poll = 0
    while time.time() < gate_deadline:
        try:
            n_box = page.get_by_role("textbox").count()
            n_btn = page.get_by_role("button").count()
            if n_box >= 3 and n_btn >= 1:
                step(ctx, f"listing controls ready (textboxes={n_box} buttons={n_btn})")
                break
        except Exception:
            pass
        # Backoff (5s→10s cap): same 120s deadline, ~half the polls.
        pace(page, min(10.0, 5.0 * (2.0**gate_poll)))
        gate_poll += 1
    else:
        step(ctx, "WARNING: listing controls gate timed out — proceeding anyway")
    failures: dict = {}
    for locale, _pats in LOCALES:
        try:
            fill_locale_listing(page, ctx, slug, locale)
        except Exception as exc:
            _soft_shot(page, ctx, f"store-listing {locale}")
            step(ctx, f"WARNING: store listing [{locale}] failed ({exc}), continuing")
            failures[locale] = str(exc)[:200]
        pace(page, 2.0)
    if len(failures) == len(LOCALES):
        failshot(page, ctx, "store-listing-all-locales", RuntimeError(f"all locales failed: {failures}"))
    if failures:
        step(ctx, f"WARNING: locales failed, final verify will decide: {sorted(failures)}")
    for locale, pats in LOCALES:
        try:
            select_locale(page, ctx, locale, list(pats))
            want_title = read_locale_texts(slug, locale)["title"].strip()
            found_title = False
            title_deadline = time.time() + 20
            title_poll = 0
            while time.time() < title_deadline and not found_title:
                try:
                    for box in page.get_by_role("textbox").all():
                        try:
                            if want_title and want_title in (box.input_value() or ""):
                                found_title = True
                                break
                        except Exception:
                            continue
                except Exception:
                    pass
                if not found_title:
                    # Backoff (1s→5s cap): same 20s deadline, fewer polls.
                    pace(page, min(5.0, 1.0 * (2.0**title_poll)))
                    title_poll += 1
            if not found_title:
                raise RuntimeError(f"saved title not present for {locale}")
            try:
                saved = page.get_by_text(re.compile(r"saved|draft saved|تم الحفظ", re.I)).first
                saved.wait_for(state="visible", timeout=15000)
                step(ctx, f"final verify saved-text [{locale}]")
            except Exception:
                try:
                    save_btn = page.get_by_role(
                        "button", name=re.compile(r"^save( changes| draft)?$|^حفظ", re.I)
                    ).first
                    save_btn.wait_for(state="visible", timeout=8000)
                    if save_btn.is_disabled():
                        step(ctx, f"final verify save-disabled [{locale}]")
                    else:
                        raise RuntimeError(f"unsaved changes remain for {locale}")
                except Exception as exc:
                    raise RuntimeError(f"saved state not shown for {locale}: {exc}") from exc
            step(ctx, f"final verify OK [{locale}]")
        except Exception as exc:
            failshot(page, ctx, f"store-listing-verify-{locale}", exc)
    step(ctx, "STORE LISTING: done")
    open_dashboard(page, ctx)


# ── app access (sign in details) ───────────────────────────────────────────

RESTRICTED_Q = [
    re.compile(r"restricted|requires? sign.?in|login.*required|need.*credentials", re.I),
    re.compile(r"مقيد|يتطلب تسجيل الدخول|بيانات الدخول", re.I),
]
ADD_INSTRUCTIONS_PATTERNS = [
    re.compile(r"add (new )?instructions?|\+ ?add|add access|new instructions", re.I),
    re.compile(r"add details|add sign.?in details", re.I),
    re.compile(r"إضافة تعليمات|تعليمات جديدة|إضافة تفاصيل|تفاصيل الدخول", re.I),
]
INSTRUCTION_NAME_PATTERNS = [
    re.compile(r"instruction.*name|name.*instruction|title|الاسم|العنوان", re.I),
]
USERNAME_PATTERNS = [
    re.compile(r"user.?name|email|البريد|اسم المستخدم", re.I),
]
PASSWORD_PATTERNS = [
    re.compile(r"password|كلمة المرور", re.I),
]
NOTES_PATTERNS = [
    re.compile(r"instructions|notes|details|additional info|تعليمات|ملاحظات|تفاصيل", re.I),
]

NOTE_TEXT = (
    "Frappe backend account with full demo access (https://backend.fastfree.cloud). "
    "Username: Administrator — the password is in the password field. "
    "Use this account to review all app functionality."
)


def read_demo_password() -> str:
    """Read the demo password at RUNTIME from client3.nix (never hardcoded)."""
    if not CLIENT3_NIX.is_file():
        raise RuntimeError(f"demo-password source missing: {CLIENT3_NIX}")
    text = CLIENT3_NIX.read_text(encoding="utf-8")
    block = re.search(r"passwords\s*=\s*\{([^}]*)\}", text, re.S)
    scope = block.group(1) if block else text
    found = re.search(r'admin\s*=\s*"([^"]+)"', scope)
    if not found:
        found = re.search(r'admin\s*=\s*"([^"]+)"', text)
    if not found:
        raise RuntimeError(f"admin password not found in {CLIENT3_NIX} (regex admin\\s*=\\s*\"...\")")
    return found.group(1)


def _verify_app_access_saved(page, ctx: dict) -> None:
    """Credentials row present + page Save state settled (shared tail)."""
    pace(page, 3.0)
    try:
        page.get_by_text(re.compile(r"demo account", re.I)).first.wait_for(
            state="visible", timeout=30000
        )
        step(ctx, "credentials row present")
    except Exception as exc:
        failshot(page, ctx, "app-access-row", RuntimeError(f"credentials row missing: {exc}"))
    # Page-level Save exists only with unsaved changes; disabled = already saved.
    try:
        _save = page.get_by_role("button", name=re.compile(r"^save$", re.I)).first
        _save.wait_for(state="visible", timeout=10000)
        if _save.is_disabled():
            step(ctx, "page Save disabled = nothing pending")
        else:
            _save.click()
            pace(page)
            step(ctx, "clicked page Save")
    except Exception:
        step(ctx, "no page Save control — continuing")
    step(ctx, "APP ACCESS: done")


def run_sign_in_details(page, ctx: dict) -> None:
    """'Sign in details' (App access) → demo instructions + runtime credentials."""
    step(ctx, "APP ACCESS: start")
    password = read_demo_password()  # never logged
    step(ctx, "demo password loaded from client3.nix (value not logged)")
    # Direct section URL first (dashboard row clicks stay unhydrated for this task).
    open_section(page, ctx, "testing-credentials", "app access")
    if "app-content/testing-credentials" not in (page.url or ""):
        open_task(page, ctx, APP_ACCESS_LABELS, "app access")
    # Idempotent: a demo-account row from a previous attempt means the dialog
    # part is done — just verify save state.
    _row_present = False
    try:
        page.get_by_text(re.compile(r"demo account", re.I)).first.wait_for(
            state="visible", timeout=8000
        )
        _row_present = True
    except Exception:
        pass
    if _row_present:
        step(ctx, "demo account row already exists — verifying save state")
        _verify_app_access_saved(page, ctx)
        return
    try_click(page, ctx, MANAGE_PATTERNS, "enter app access editor")
    pace(page, 2.0)
    expand_all(page, ctx)
    # Restricted functionality → YES so the instructions form appears.
    try:
        answer_near(page, ctx, RESTRICTED_Q, YES_PATTERNS, "restricted functionality YES")
    except Exception:
        step(ctx, "WARNING: restricted-access question not found, continuing to add form")
    pace(page, 1.5)
    click_any(page, ctx, ADD_INSTRUCTIONS_PATTERNS, "add instructions")
    pace(page, 2.0)
    # Details dialog: fields lack label association — fill by order
    # (Name, Username, Password, [+Other info]) scoped to the dialog.
    try:
        _adlg = page.get_by_role("dialog").filter(has_text=re.compile(r"add sign in details", re.I))
        _adlg.wait_for(state="visible", timeout=10000)
        _aboxes = [b for b in _adlg.get_by_role("textbox").all() if b.is_visible()]
    except Exception as exc:
        failshot(page, ctx, "app-access-form", RuntimeError(f"details dialog missing: {exc}"))
    if len(_aboxes) < 3:
        failshot(page, ctx, "app-access-form", RuntimeError("details fields missing"))
    _aboxes[0].fill(f"{_get(ctx, 'NAME')} demo account")
    _aboxes[1].fill(DEMO_USERNAME)
    _aboxes[2].fill(password)
    if len(_aboxes) > 3:
        try:
            _aboxes[3].fill(NOTE_TEXT)
        except Exception:
            step(ctx, "WARNING: notes field not fillable")
    pace(page, 1.0)
    if DEMO_USERNAME not in (_aboxes[1].input_value() or ""):
        failshot(page, ctx, "app-access-form", RuntimeError("username fill failed"))
    step(ctx, "details filled + verified")
    # Required: confirm the details give full access (else Add won't save).
    try:
        _full = _adlg.get_by_label(re.compile(r"provide full access", re.I))
        if _full.count() != 1:
            failshot(page, ctx, "app-access-form", RuntimeError("full-access checkbox not unique"))
        _full.first.wait_for(state="visible", timeout=8000)
        _full.first.check()
        pace(page, 1.0)
        if not _full.first.is_checked():
            failshot(page, ctx, "app-access-form", RuntimeError("full-access did not stick"))
        step(ctx, "confirmed full-access checkbox")
    except Exception as exc:
        failshot(page, ctx, "app-access-form", RuntimeError(f"full-access checkbox missing: {exc}"))
    try:
        _add = _adlg.get_by_role("button", name=re.compile(r"^add$", re.I))
        _add.first.wait_for(state="visible", timeout=8000)
        _add.first.click()
        step(ctx, "clicked dialog Add")
    except Exception as exc:
        failshot(page, ctx, "app-access-form", RuntimeError(f"dialog Add missing: {exc}"))
    pace(page, 2.0)
    _verify_app_access_saved(page, ctx)


TASKS = {
    "Data safety": run_data_safety,
    "Set up your store listing": run_store_listing,
    "Sign in details": run_sign_in_details,
}
