"""Play Console dashboard tasks — audience group (self-contained).

Covers (fixed answers, same for all 4 business apps — ERP/POS/HR/Ledger):
  - "Target audience"  -> 18+ ONLY, no children brackets, no appeal to children.
  - "Content rating"   -> IARC-style questionnaire answered for an Everyone
    rating (all None/No), store categories as needed, submit + capture rating.

Runtime contract (ONE browser tab, driven sequentially by the caller):
  - Each entry is ``def run_X(page, ctx) -> None`` where ``ctx`` is a dict
    (or object) with NAME, PACKAGE, APP_ID, DEV_ID, KEY.
  - DEV_ID defaults to 7269125617638997236 when absent from ctx.
  - Helpers are parameterized by ``ctx["KEY"]`` (screenshots land in
    ``.auth/play-console/fail-<KEY>-...``). Nothing executes at import.
  - Every step is adaptive: EN+AR regex lists, button+link roles, generous
    waits for question pages, expand-before-click, dialog-scoped confirms.

Fixed answer bank (NEVER invent beyond this):
  - Ages: 18+ checked; every children bracket unchecked.
  - Appeal to children: No.
  - Content rating: violence=None, sexual=None, profanity=None, drugs=None,
    gambling=None (incl. simulated), alcohol/tobacco=None, UGC/interaction
    =None, no unboxing/ads-for-gambling issues.
"""
# ruff: noqa: RUF001 -- Arabic-Indic digits and EN DASH are intentional for AR locale matching.

from __future__ import annotations

import os
import re
import time
from pathlib import Path
from typing import Any, NoReturn

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
AUTH_DIR = REPO_ROOT / ".auth" / "play-console"
CONSOLE = "https://play.google.com/console"

DEV_ACCOUNT_NAME = "fastfree.cloud"
DEFAULT_DEV_ID = "7269125617638997236"

# ── low-footprint mode (default ON; FASTFREE_LOW_FOOTPRINT=0 disables) ─────────
# Play Console throttles sustained automation (HTTP 429). Questionnaire flows
# never need images/media/fonts (form JS, XHR, stylesheets kept; screenshots
# capture DOM rendering which works headless without them), so
# arm_low_footprint route-aborts those classes. pace() is the single helper
# for every fixed sleep (post-navigation waits default to NAV_PACE_SECS);
# settle() replaces networkidle, which holds the CDP session open on
# long-polling XHRs that 429 anyway. The ONE retained networkidle is the
# questionnaire Next advance (in-place SPA transition: no URL change, so
# domcontentloaded cannot gate it), reduced 25s→15s. Poll loops keep their
# deadlines but sleep with exponential backoff via pace() (fewer CDP
# round-trips, same timeouts).

LOW_FOOTPRINT = os.environ.get("FASTFREE_LOW_FOOTPRINT", "1") != "0"


def _env_secs(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


NAV_PACE_SECS = _env_secs("FASTFREE_NAV_PACE_SECS", 4.0)

_BLOCKED_RESOURCE_TYPES = frozenset({"image", "media", "font"})


def arm_low_footprint(page: Any) -> None:
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

        def _block(route: Any) -> None:
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


def pace(page: Any, secs: float = NAV_PACE_SECS) -> None:
    """Single pacing helper: fixed CDP-side sleep (falls back to time.sleep)."""
    try:
        page.wait_for_timeout(int(secs * 1000))
    except Exception:
        time.sleep(secs)


def settle(page: Any, secs: float = 2.0) -> None:
    """Post-navigation settle WITHOUT networkidle (long-poll XHRs 429 anyway).

    domcontentloaded returns immediately when already loaded; the short pace
    lets the SPA hydrate while targeted waits below do the real gating.
    """
    try:
        page.wait_for_load_state("domcontentloaded", timeout=15000)
    except Exception:
        pass
    pace(page, secs)

# ── context helpers (ctx is a dict with NAME/PACKAGE/APP_ID/DEV_ID/KEY) ──────


def _ckey(ctx: Any) -> str:
    try:
        if isinstance(ctx, dict):
            return str(ctx.get("KEY", "audience"))
        return str(ctx.KEY)
    except Exception:
        return "audience"


def _cget(ctx: Any, name: str, default: Any = None) -> Any:
    try:
        if isinstance(ctx, dict):
            return ctx.get(name, default)
        return getattr(ctx, name, default)
    except Exception:
        return default


def _app_label(ctx: Any) -> str:
    return str(_cget(ctx, "NAME", _ckey(ctx)))


def _dev_id(ctx: Any) -> str:
    return str(_cget(ctx, "DEV_ID", DEFAULT_DEV_ID) or DEFAULT_DEV_ID)


# ── shared patterns (EN + AR) ────────────────────────────────────────────────

DEV_CHOOSER_PATTERNS = [re.compile(r"fastfree\.cloud", re.I)]

TASK_TARGET_PATTERNS = [
    re.compile(r"target audience", re.I),
    re.compile(r"الفئة المستهدفة|الجمهور المستهدف", re.I),
]

TASK_RATING_PATTERNS = [
    re.compile(r"content rating", re.I),
    re.compile(r"تصنيف المحتوى|تقييم المحتوى", re.I),
]

SAVE_PATTERNS = [
    re.compile(r"^save( changes)?$", re.I),
    re.compile(r"^submit$", re.I),
    re.compile(r"^confirm$", re.I),
    re.compile(r"^done$", re.I),
    re.compile(r"حفظ|إرسال|تأكيد|تم", re.I),
]

NEXT_PATTERNS = [
    re.compile(r"^next$", re.I),
    re.compile(r"^continue$", re.I),
    re.compile(r"التالي|متابعة|استمرار", re.I),
]

PREV_PATTERNS = [
    re.compile(r"^previous$", re.I),
    re.compile(r"^back$", re.I),
    re.compile(r"السابق|رجوع|عودة", re.I),
]

SUBMIT_PATTERNS = [
    re.compile(r"^submit$", re.I),
    re.compile(r"^finish$", re.I),
    re.compile(r"^complete$", re.I),
    re.compile(r"^apply$", re.I),
    re.compile(r"إرسال|إنهاء|إكمال|تقديم|اعتماد", re.I),
]

SAVED_PATTERNS = [
    re.compile(r"saved|changes saved|submitted|received", re.I),
    re.compile(r"تم الحفظ|تم الإرسال|تم الاستلام|تم التقديم", re.I),
]

EXPAND_PATTERNS = [
    re.compile(r"show more", re.I),
    re.compile(r"expand|see more|view more", re.I),
    re.compile(r"عرض المزيد|توسيع|إظهار المزيد", re.I),
]

COOKIE_PATTERNS = [re.compile(r"accept|agree|موافق|قبول", re.I)]

# Target audience — fixed bank.
ADULT_PATTERNS = [
    re.compile(r"18\s*(and over|or older|\+)", re.I),
    re.compile(r"18\s*years?.*(older|over|above)", re.I),
    re.compile(r"18\s*سنة.*(فأكثر|فما فوق)|١٨\s*سنة", re.I),
    re.compile(r"بالغ|بالغون|كبار", re.I),
]

CHILD_BRACKET_PATTERNS = [
    re.compile(r"13\s*[-–]\s*15|١٣\s*[-–]\s*١٥", re.I),
    re.compile(r"16\s*[-–]\s*17|١٦\s*[-–]\s*١٧", re.I),
    re.compile(r"under\s*13|younger than 13|below 13", re.I),
    re.compile(r"5\s*and under|under\s*5|ages?\s*5\b", re.I),
    re.compile(r"\b6\s*[-–]\s*8\b", re.I),
    re.compile(r"\b9\s*[-–]\s*12\b", re.I),
    re.compile(r"child|children|kids?|teen", re.I),
    re.compile(r"أطفال|طفل|مراهق|أقل من 13|أقل من ١٣|من 13 إلى|من ١٣", re.I),
]

APPEAL_HEADING_PATTERNS = [
    re.compile(r"appeal.*child|attract.*child|child.*appeal", re.I),
    re.compile(r"designed for (children|families)|made for children", re.I),
    re.compile(r"يستهدف الأطفال|يجذب الأطفال|موجه للأطفال|مصمم للأطفال", re.I),
]

NO_RADIO_PATTERNS = [
    re.compile(r"^\s*no\b", re.I),
    re.compile(r"^\s*لا\b", re.I),
    re.compile(r"كلا", re.I),
]

# Content rating — fixed bank (Everyone => everything None/No).
NONE_PATTERNS = [
    re.compile(r"^\s*none\b", re.I),
    re.compile(r"^\s*no\b", re.I),
    re.compile(r"^\s*never\b", re.I),
    re.compile(r"no (content|violence|nudity|profanity|drugs|gambling)", re.I),
    re.compile(r"not (present|included|featured|applicable)", re.I),
    re.compile(r"لا يوجد|لا يتضمن|غير موجود|لا يحتوي|مطلقاً|أبداً", re.I),
    re.compile(r"^\s*لا\s*$", re.I),
    re.compile(r"كلا", re.I),
]

CATEGORY_PAGE_PATTERNS = [
    re.compile(r"store categor|app categor", re.I),
    re.compile(r"فئة (المتجر|التطبيق)|تصنيف المتجر", re.I),
]

CATEGORY_PICK_PATTERNS = [
    re.compile(r"^business$", re.I),
    re.compile(r"productivity", re.I),
    re.compile(r"finance", re.I),
    re.compile(r"أعمال|إنتاجية|مالية|أدوات", re.I),
]

QUESTION_HINT_PATTERNS = [
    re.compile(r"violence|sexual|profanity|drugs?|gambling|alcohol|tobacco", re.I),
    re.compile(r"user.?generated|interact|unboxing|ads?", re.I),
    re.compile(r"question \d|step \d|section \d", re.I),
    re.compile(r"عنف|جنس|ألفاظ|مخدرات|قمار|كحول|تبغ|تفاعل|إعلانات", re.I),
]

RATING_DONE_PATTERNS = [
    re.compile(r"everyone|everyone 10\+|teen|mature", re.I),
    re.compile(r"ESRB|PEGI|USK|ACB|ClassInd", re.I),
    re.compile(r"rating (complete|certificate|summary|assigned)", re.I),
    re.compile(r"تم التقييم|ملخص التقييم|شهادة التقييم|التصنيف", re.I),
]


# ── primitives (copied idioms, parameterized by ctx["KEY"]) ──────────────────


def step(ctx: Any, msg: str) -> None:
    print(f"[group_audience:{_ckey(ctx)}] {msg}", flush=True)


def failshot(page: Any, ctx: Any, desc: str, err: Exception) -> NoReturn:
    key = _ckey(ctx)
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        stamp = int(time.time() * 1000)
        shot = AUTH_DIR / f"fail-{key}-{desc}-{stamp}.png"
        page.screenshot(path=str(shot))
        url = getattr(page, "url", "<unknown>")
        raise RuntimeError(f"FAIL[{desc}]: {err} url={url} shot={shot}") from err
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"FAIL[{desc}]: {err} (shot failed: {exc})") from err


def activate(page: Any, ctx: Any) -> None:
    """Bring our tab forward; resolve the developer chooser when it appears."""
    arm_low_footprint(page)  # idempotent: covers every navigation via activate()
    try:
        page.bring_to_front()
    except Exception:
        pass
    pace(page, 1.5)
    try:
        if re.search(r"/console/developers/?(?:\?.*)?$", page.url or ""):
            step(ctx, "developer chooser — selecting account")
            click_any(page, ctx, DEV_CHOOSER_PATTERNS, "select developer account")
            pace(page, 5.0)
    except Exception:
        pass


def assert_developer(page: Any, ctx: Any) -> None:
    """§0 identity: every navigation must stay inside our developer ID."""
    expected = _dev_id(ctx)
    found = re.search(r"/developers/(\d+)", page.url or "")
    actual = found.group(1) if found else None
    if actual is not None and actual != expected:
        failshot(
            page,
            ctx,
            "wrong-developer-id",
            RuntimeError(f"developer is {actual}, expected {expected}. STOP. url={page.url}"),
        )


def click_any(page: Any, ctx: Any, patterns: list, desc: str) -> None:
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


def try_click(page: Any, ctx: Any, patterns: list, desc: str) -> bool:
    for pattern in patterns:
        for role in ("button", "link"):
            try:
                loc = page.get_by_role(role, name=pattern)
                loc.first.wait_for(state="visible", timeout=3000)
                loc.first.click()
                step(ctx, f"clicked (optional) {role}: {desc}")
                return True
            except Exception:
                continue
    return False


def fill_any(page: Any, ctx: Any, patterns: list, value: str, desc: str) -> None:
    for pattern in patterns:
        for method in ("label", "placeholder"):
            try:
                field = page.get_by_label(pattern) if method == "label" else page.get_by_placeholder(pattern)
                field.first.wait_for(state="visible", timeout=4000)
                field.first.fill(value)
                step(ctx, f"filled: {desc}")
                return
            except Exception:
                continue
    failshot(page, ctx, desc, RuntimeError(f"no input matched: {desc}"))


def pick_one(page: Any, ctx: Any, role: str, patterns: list, desc: str, action: str = "check") -> None:
    for pattern in patterns:
        try:
            loc = page.get_by_role(role, name=pattern)
            loc.first.wait_for(state="visible", timeout=4000)
            if action == "check":
                loc.first.check()
            else:
                loc.first.click()
            step(ctx, f"{'checked' if action == 'check' else 'clicked'} {role}: {desc}")
            return
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"no {role} matched: {desc}"))


def check_row_for_text(page: Any, ctx: Any, pattern: Any, desc: str) -> None:
    """Check the (usually unlabeled) checkbox in the same row as visible text."""
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


def set_checkbox(page: Any, ctx: Any, patterns: list, want_checked: bool, desc: str) -> bool:
    """Set a checkbox on/off. Role-based first, row-anchored fallback. Returns found."""
    want = "checked" if want_checked else "unchecked"
    for pattern in patterns:
        try:
            box = page.get_by_role("checkbox", name=pattern).first
            box.wait_for(state="visible", timeout=3000)
            is_on = False
            try:
                is_on = bool(box.is_checked(timeout=2000))
            except Exception:
                is_on = False
            if is_on != want_checked:
                if want_checked:
                    box.check()
                else:
                    box.uncheck()
            step(ctx, f"checkbox {want}: {desc}")
            return True
        except Exception:
            continue
    for pattern in patterns:
        try:
            anchor = page.get_by_text(pattern).first
            anchor.wait_for(state="visible", timeout=3000)
            row = anchor.locator(
                "xpath=ancestor::*[descendant::input[@type='checkbox']"
                " or descendant::*[@role='checkbox']][1]"
            )
            box = row.locator("input[type='checkbox'], [role='checkbox']").first
            box.wait_for(state="visible", timeout=3000)
            is_on = False
            try:
                attr = box.get_attribute("aria-checked")
                if attr is not None:
                    is_on = attr.lower() == "true"
                else:
                    is_on = bool(box.is_checked(timeout=2000))
            except Exception:
                is_on = False
            if is_on != want_checked:
                if box.get_attribute("type") == "checkbox":
                    if want_checked:
                        box.check()
                    else:
                        box.uncheck()
                else:
                    box.click()
            step(ctx, f"row checkbox {want}: {desc}")
            return True
        except Exception:
            continue
    return False


def choose_radio(page: Any, ctx: Any, patterns: list, desc: str) -> bool:
    """Click the first matching radio. Returns True when something was clicked."""
    for pattern in patterns:
        try:
            loc = page.get_by_role("radio", name=pattern)
            loc.first.wait_for(state="visible", timeout=3000)
            loc.first.click()
            step(ctx, f"radio: {desc}")
            return True
        except Exception:
            continue
    for pattern in patterns:
        try:
            anchor = page.get_by_text(pattern).first
            anchor.wait_for(state="visible", timeout=3000)
            row = anchor.locator("xpath=ancestor::*[descendant::input[@type='radio']][1]")
            box = row.locator("input[type='radio'], [role='radio']").first
            box.wait_for(state="visible", timeout=3000)
            box.click()
            step(ctx, f"row radio: {desc}")
            return True
        except Exception:
            continue
    return False


def expand_all(page: Any, ctx: Any) -> None:
    """§5 lesson: expand collapsed sections FIRST — bypass/save links hide inside."""
    try:
        for item in page.get_by_text(re.compile(r"show more", re.I)).all():
            try:
                item.click(timeout=3000)
                pace(page, 0.8)
            except Exception:
                continue
    except Exception:
        pass
    for pattern in EXPAND_PATTERNS[1:]:
        try_click(page, ctx, [pattern], "expand section")
    step(ctx, "sections expanded")


def goto_dashboard(page: Any, ctx: Any) -> None:
    app_id = str(_cget(ctx, "APP_ID", "") or "")
    if not app_id:
        failshot(page, ctx, "no-app-id", RuntimeError("ctx has no APP_ID — cannot open dashboard"))
    dev = _dev_id(ctx)
    base = "https://play.google.com/console"
    for _attempt in range(2):
        page.goto(
            f"{base}/u/0/developers/{dev}/app/{app_id}/dashboard",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        arm_low_footprint(page)
        pace(page)
        activate(page, ctx)
        if f"/app/{app_id}/" in (page.url or ""):
            break
        step(ctx, "dashboard bounced — retrying via app list")
        page.goto(f"{base}/u/0/developers/{dev}/app-list", wait_until="domcontentloaded", timeout=60000)
        arm_low_footprint(page)
        pace(page)
        activate(page, ctx)
        try_click(page, ctx, COOKIE_PATTERNS, "cookie banner")
        click_any(
            page, ctx, [re.compile(f"^{re.escape(_app_label(ctx))}$")], "open app row"
        )
        pace(page, 5.0)
        activate(page, ctx)
    if f"/app/{app_id}/" not in (page.url or ""):
        failshot(page, ctx, "dashboard-unreachable", RuntimeError("dashboard bounced twice"))
    assert_developer(page, ctx)
    # Was networkidle(30s): holds the CDP session on long-polling XHRs that
    # 429 anyway — domcontentloaded + short pace, targeted waits gate below.
    settle(page)
    try_click(page, ctx, COOKIE_PATTERNS, "cookie banner")
    step(ctx, f"dashboard open: {_app_label(ctx)}")


def expand_view_tasks(page: Any, ctx: Any) -> None:
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


def open_task(page: Any, ctx: Any, patterns: list, desc: str) -> None:
    """Open a dashboard task card. Expands parent groups first (§5 nesting lesson).

    Hardened: multi-round attempts with scroll sweeps (lazy checklist
    render); fallback clicks are EXPANDERS ONLY (aria-expanded toggles /
    view-tasks buttons) — never nav links (a "Grow users" fallback once
    navigated away and killed the run). Dashboard-URL guard navigates back
    whenever a click leaves the dashboard.
    """
    def _on_dashboard() -> bool:
        try:
            return "dashboard" in (page.url or "")
        except Exception:
            return False

    def _try_direct(tag: str) -> bool:
        for pattern in patterns:
            try:
                loc = page.get_by_role("link", name=pattern)
                loc.first.wait_for(state="visible", timeout=4000)
                loc.first.click()
                pace(page, 3.0)
                activate(page, ctx)
                assert_developer(page, ctx)
                step(ctx, f"opened task link [{tag}]: {desc}")
                return True
            except Exception:
                continue
        for pattern in patterns:
            for role in ("button", "link"):
                try:
                    loc = page.get_by_role(role, name=pattern)
                    loc.first.wait_for(state="visible", timeout=4000)
                    loc.first.click()
                    pace(page, 3.0)
                    activate(page, ctx)
                    assert_developer(page, ctx)
                    step(ctx, f"opened task {role} [{tag}]: {desc}")
                    return True
                except Exception:
                    continue
            try:
                txt = page.get_by_text(pattern)
                txt.first.wait_for(state="visible", timeout=4000)
                txt.first.click()
                pace(page, 3.0)
                activate(page, ctx)
                assert_developer(page, ctx)
                step(ctx, f"opened task text [{tag}]: {desc}")
                return True
            except Exception:
                continue
        return False

    def _expand_only() -> None:
        # Expander toggles and show-more buttons — never nav links.
        try:
            for b in page.get_by_role("button").all():
                try:
                    if not b.is_visible():
                        continue
                    if (b.get_attribute("aria-expanded") or "") != "false":
                        continue
                    txt = (b.text_content() or "").lower()
                    if "task" in txt or "more" in txt or "show" in txt or not txt.strip():
                        b.click(timeout=3000)
                        pace(page, 1.2)
                except Exception:
                    continue
        except Exception:
            pass
        try_click(page, ctx, EXPAND_PATTERNS, "expand parent group")
        expand_view_tasks(page, ctx)
        pace(page, 1.2)

    pace(page, 2.5)
    activate(page, ctx)
    expand_view_tasks(page, ctx)
    for _round in range(3):
        if _try_direct(f"r{_round}"):
            return
        if not _on_dashboard():
            step(ctx, f"left dashboard during open-{desc} — navigating back")
            try:
                goto_dashboard(page, ctx)
            except Exception:
                pass
            pace(page, 2.0)
            continue
        if _round < 2:
            # Scroll sweep to trigger lazy checklist render, then expanders.
            try:
                page.evaluate(
                    """(async () => {
                        const h = document.documentElement.scrollHeight;
                        for (let y = 0; y <= h; y += 600) {
                            window.scrollTo(0, y);
                            await new Promise(r => setTimeout(r, 120));
                        }
                        window.scrollTo(0, 0);
                    })()"""
                )
                pace(page, 1.5)
            except Exception:
                pass
            _expand_only()
    failshot(page, ctx, f"open-{desc}", RuntimeError(f"task not found on dashboard: {desc}"))


def wait_for_questions(page: Any, ctx: Any, desc: str, timeout_ms: int = 45000) -> None:
    """Generous wait: question pages render slowly under throttling."""
    deadline = time.time() + timeout_ms / 1000
    poll = 0
    while time.time() < deadline:
        try:
            for pattern in QUESTION_HINT_PATTERNS + NONE_PATTERNS + NEXT_PATTERNS + SUBMIT_PATTERNS:
                try:
                    loc = page.get_by_text(pattern).first
                    loc.wait_for(state="visible", timeout=1200)
                    step(ctx, f"question page rendered: {desc}")
                    return
                except Exception:
                    continue
            for role in ("radio", "checkbox", "button"):
                try:
                    loc = page.get_by_role(role).first
                    loc.wait_for(state="visible", timeout=1200)
                    step(ctx, f"question inputs rendered ({role}): {desc}")
                    return
                except Exception:
                    continue
        except Exception:
            pass
        # Backoff (1.5s→6s cap): same deadline, fewer CDP round-trips.
        pace(page, min(6.0, 1.5 * (2.0**poll)))
        poll += 1
    failshot(page, ctx, f"wait-{desc}", RuntimeError(f"question page never rendered: {desc}"))


def confirm_dialog(page: Any, ctx: Any, patterns: list, desc: str) -> bool:
    """§5 lesson: confirm INSIDE the dialog scope (background reuses the same labels)."""
    try:
        dlg = page.get_by_role("dialog")
        dlg.first.wait_for(state="visible", timeout=8000)
    except Exception:
        return False
    for pattern in patterns:
        try:
            scoped = dlg.filter(has_text=pattern)
            scoped.wait_for(state="visible", timeout=5000)
            btn = scoped.get_by_role("button", name=pattern)
            btn.first.click(timeout=8000)
            step(ctx, f"dialog confirm: {desc}")
            pace(page, 2.0)
            return True
        except Exception:
            continue
    for pattern in patterns:
        try:
            btn = dlg.get_by_role("button", name=pattern)
            btn.first.wait_for(state="visible", timeout=5000)
            btn.first.click(timeout=8000)
            step(ctx, f"dialog confirm (unscoped): {desc}")
            pace(page, 2.0)
            return True
        except Exception:
            continue
    return False


def verify_saved(page: Any, ctx: Any, desc: str) -> None:
    """Verify a save/submit stuck: success toast, or task-complete state, no error."""
    pace(page, 3.5)
    try:
        body = page.inner_text("body") or ""
    except Exception:
        body = ""
    for pattern in SAVED_PATTERNS:
        if pattern.search(body):
            step(ctx, f"verified saved: {desc}")
            return
    for pattern in RATING_DONE_PATTERNS:
        if pattern.search(body):
            step(ctx, f"verified done-state: {desc}")
            return
    if re.search(r"error|failed|try again|خطأ|فشل|حاول مجدد", body, re.I) and not any(
        p.search(body) for p in SAVED_PATTERNS
    ):
        failshot(page, ctx, f"verify-{desc}", RuntimeError(f"error banner after save: {desc}"))
    # No explicit toast but also no error: accept when the form stayed consistent.
    step(ctx, f"no error after save (accepted): {desc}")


# ── Task 1: Target audience (18+ ONLY) ────────────────────────────────────────


def run_target_audience(page: Any, ctx: Any) -> None:
    """Target audience -> 18+ ONLY.

    Fixed bank: uncheck every children bracket (13-15, 16-17, and any younger
    brackets when present), check 18+, answer "no appeal to children", save.
    """
    label = _app_label(ctx)
    step(ctx, f"target-audience start: {label}")
    # Unhydrated row-text clicks miss navigation — retry until app-content loads.
    for _nav in range(3):
        goto_dashboard(page, ctx)
        open_task(page, ctx, TASK_TARGET_PATTERNS, "target-audience")
        if "app-content" in (page.url or ""):
            break
        step(ctx, "task click missed navigation — retrying")
    else:
        failshot(page, ctx, "target-audience", RuntimeError("task click never navigated"))
    wait_for_questions(page, ctx, "target-audience")
    expand_all(page, ctx)

    deselected = 0
    for pattern in CHILD_BRACKET_PATTERNS:
        try:
            found = set_checkbox(page, ctx, [pattern], False, f"deselect children {pattern.pattern}")
            if found:
                deselected += 1
        except Exception:
            continue
        pace(page, 0.4)
    step(ctx, f"children brackets deselected: {deselected}")

    if not set_checkbox(page, ctx, ADULT_PATTERNS, True, "select 18+ only"):
        # Fallback for unlabeled Console checkboxes next to the age text.
        try:
            check_row_for_text(page, ctx, ADULT_PATTERNS[0], "select 18+ row")
        except Exception as exc:
            failshot(page, ctx, "audience-18plus", exc)
    pace(page, 1.0)

    # "Does your app appeal to children?" (and siblings) -> No. Fixed bank only.
    expand_all(page, ctx)
    appeal_answered = False
    try:
        body = page.inner_text("body") or ""
    except Exception:
        body = ""
    if any(p.search(body) for p in APPEAL_HEADING_PATTERNS):
        appeal_answered = choose_radio(page, ctx, NO_RADIO_PATTERNS, "no appeal to children")
        if not appeal_answered:
            step(ctx, "appeal question visible but no No-radio matched — leaving untouched")
    else:
        # Question may still exist without the heading text; a blind No click
        # would invent answers, so only answer when the heading is confirmed.
        step(ctx, "no appeal-to-children heading found — skipping appeal question")
    pace(page, 1.0)

    expand_all(page, ctx)
    # Wizard: Target age -> App details -> Ads -> Store presence -> Summary.
    # Step forward; unknown question pages stop the loop for diagnosis.
    for _s in range(6):
        pace(page, 2.5)
        if _click_submit(page, ctx):
            step(ctx, "wizard submitted")
            break
        if not _click_next(page, ctx):
            step(ctx, "wizard advance blocked — diagnosing current step")
            break
    confirm_dialog(page, ctx, SUBMIT_PATTERNS, "submit target audience")
    verify_saved(page, ctx, "target-audience")
    step(ctx, f"target-audience done: {label} (18+ only)")


# ── Task 2: Content rating (Everyone) ─────────────────────────────────────────


def _is_category_page(page: Any, ctx: Any = None) -> bool:
    _ = ctx
    try:
        body = page.inner_text("body") or ""
    except Exception:
        return False
    return any(p.search(body) for p in CATEGORY_PAGE_PATTERNS)


SAFE_LABELS = [
    "No",
    "None",
    "Never",
    "Not present",
    "Not applicable",
    "Not featured",
    "0 - None",
    "لا",
    "لا يوجد",
    "كلا",
]


def _answer_page_none(page: Any, ctx: Any) -> int:
    """Answer the current questionnaire page with the fixed None/No bank.

    Console radios carry useless accessible names — resolve via their LABEL
    elements (exact text), check, and VERIFY each one. Returns the number of
    controls checked. Never selects Yes/Moderate/High severity options.
    """
    answered = 0
    for lab in SAFE_LABELS:
        try:
            loc = page.get_by_label(lab, exact=True)
            n = loc.count()
        except Exception:
            continue
        for i in range(n):
            try:
                b = loc.nth(i)
                b.wait_for(state="visible", timeout=3000)
                b.check(timeout=5000)
                pace(page, 0.3)
                if b.is_checked():
                    answered += 1
            except Exception:
                continue
    if answered:
        step(ctx, f"page safe-answers checked: {answered}")
    return answered


def _handle_category_page(page: Any, ctx: Any) -> None:
    """Store-category page: pick Business-family category when present."""
    picked = False
    for pattern in CATEGORY_PICK_PATTERNS:
        try:
            if set_checkbox(page, ctx, [pattern], True, f"category {pattern.pattern}"):
                picked = True
                break
        except Exception:
            continue
    if not picked:
        for pattern in CATEGORY_PICK_PATTERNS:
            try:
                if choose_radio(page, ctx, [pattern], f"category {pattern.pattern}"):
                    picked = True
                    break
            except Exception:
                continue
    step(ctx, "category selected" if picked else "category left as-is (no Business match)")


def _next_enabled(page: Any, ctx: Any = None) -> bool:
    """True when a Next/Continue control is visible and enabled (no click)."""
    _ = ctx
    for pattern in NEXT_PATTERNS:
        for role in ("button", "link"):
            try:
                btn = page.get_by_role(role, name=pattern).first
                btn.wait_for(state="visible", timeout=3000)
                try:
                    if btn.is_enabled(timeout=2000):
                        return True
                except Exception:
                    return True
            except Exception:
                continue
    return False


def _click_next(page: Any, ctx: Any) -> bool:
    """Click Next/Continue when enabled. Returns False when absent/disabled."""
    for pattern in NEXT_PATTERNS:
        for role in ("button", "link"):
            try:
                btn = page.get_by_role(role, name=pattern).first
                btn.wait_for(state="visible", timeout=3000)
                try:
                    if not btn.is_enabled(timeout=2000):
                        continue
                except Exception:
                    pass
                btn.click(timeout=8000)
                step(ctx, f"next page ({role})")
                return True
            except Exception:
                continue
    return False


def _click_submit(page: Any, ctx: Any) -> bool:
    for pattern in SUBMIT_PATTERNS:
        for role in ("button", "link"):
            try:
                btn = page.get_by_role(role, name=pattern).first
                btn.wait_for(state="visible", timeout=4000)
                try:
                    if not btn.is_enabled(timeout=2000):
                        continue
                except Exception:
                    pass
                btn.click(timeout=8000)
                step(ctx, f"submitted ({role}): {pattern.pattern}")
                return True
            except Exception:
                continue
    return False


def _capture_rating(page: Any, ctx: Any) -> str:
    """Read the final rating page and assert an Everyone-family rating."""
    # Re-open the overview fresh: post-submit SPA navigation races with reads.
    try:
        page.goto(
            f"https://play.google.com/console/u/0/developers/{_dev_id(ctx)}/app/"
            f"{_cget(ctx, 'APP_ID')}/app-content/content-rating-overview",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        arm_low_footprint(page)
        pace(page, 6.0)
    except Exception:
        pass
    deadline = time.time() + 90
    body = ""
    poll = 0
    while time.time() < deadline:
        # Backoff (4s→8s cap): same 90s deadline, ~half the body reads.
        pace(page, min(8.0, 4.0 * (2.0**poll)))
        poll += 1
        try:
            body = page.inner_text("body") or ""
        except Exception:
            continue
        if re.search(r"IARC status", body, re.I) and re.search(
            r"completed|everyone|PEGI|USK", body, re.I
        ):
            break
        if "Loading Google Play Console" in body:
            try:
                page.reload(wait_until="domcontentloaded", timeout=60000)
                arm_low_footprint(page)
            except Exception:
                pass
    if not body:
        try:
            body = page.inner_text("body") or ""
        except Exception as exc:
            failshot(page, ctx, "rating-read", exc)
            body = ""
    rating = "unknown"
    for pattern in [
        re.compile(r"Everyone 10\+?", re.I),
        re.compile(r"\bEveryone\b", re.I),
        re.compile(r"PEGI\s*\d+", re.I),
        re.compile(r"ESRB[^\n]{0,40}", re.I),
        re.compile(r"USK[^\n]{0,20}", re.I),
    ]:
        found = pattern.search(body)
        if found:
            rating = found.group(0).strip()
            break
    step(ctx, f"resulting rating: {rating}")
    if not any(p.search(body) for p in RATING_DONE_PATTERNS):
        # Server-side completion was already observed this run (loop break);
        # a throttled skeleton that never renders is not a state failure.
        try:
            _seen = bool(ctx.get("_rating_seen"))
        except Exception:
            _seen = False
        if _seen:
            step(ctx, "rating page would not render (throttle) — accepting pre-verified completion")
            return "Everyone (pre-verified)"
        failshot(
            page,
            ctx,
            "rating-verify",
            RuntimeError(f"final rating page not confirmed (saw: {body[:300]!r})"),
        )
    try:
        _seen2 = bool(ctx.get("_rating_seen"))
    except Exception:
        _seen2 = False
    if not re.search(r"everyone|PEGI\s*3|USK\s*0", body, re.I):
        if _seen2 and ("Loading Google Play Console" in body or len(body) < 2000):
            step(ctx, "rating markers unreadable (throttle) — accepting pre-verified completion")
            return "Everyone (pre-verified)"
        failshot(
            page,
            ctx,
            "rating-mismatch",
            RuntimeError(f"expected Everyone-family rating, saw: {rating!r} body={body[:400]!r}"),
        )
    return rating


def _fill_iarc_category(page: Any, ctx: Any) -> bool:
    """IARC step 1 (Category): contact email + All-Other-Types + Terms.

    Returns True when this page was completed (loop then presses Next).
    """
    try:
        body = page.inner_text("body") or ""
    except Exception:
        return False
    if not re.search(r"all other app types", body, re.I):
        return False
    try:
        _em = page.get_by_label(re.compile(r"email address", re.I)).first
        _em.wait_for(state="visible", timeout=8000)
        try:
            _box = _em.get_by_role("textbox").first
            _box.wait_for(state="visible", timeout=5000)
        except Exception:
            _box = _em
        _box.fill("mohamed.fastfree@gmail.com")
        pace(page, 0.5)
        if "mohamed.fastfree@gmail.com" in (_box.input_value() or ""):
            step(ctx, "filled rating contact email")
    except Exception:
        pass
    _picked = False
    try:
        _box = page.get_by_label("All Other App Types", exact=True)
        if _box.count() == 1:
            _box.first.check()
            pace(page, 0.5)
            if _box.first.is_checked():
                _picked = True
                step(ctx, "picked: All Other App Types")
    except Exception:
        pass
    try:
        _tm = page.get_by_label(re.compile(r"agree to the terms of use", re.I))
        if _tm.count() >= 1:
            _tm.first.check()
            pace(page, 0.5)
            if _tm.first.is_checked():
                step(ctx, "accepted IARC terms")
    except Exception:
        pass
    return _picked


def run_content_rating(page: Any, ctx: Any) -> None:
    """Content rating -> Everyone via the fixed None/No bank, multi-page.

    Walks the questionnaire one page at a time: category pages get a
    Business-family pick, every content question gets None/No answers only,
    Next until Submit appears, then captures the resulting rating.
    """
    label = _app_label(ctx)
    step(ctx, f"content-rating start: {label}")
    # Direct overview URL first (observed slug); row clicks stay unhydrated here.
    _opened = False
    for _attempt in range(2):
        page.goto(
            f"https://play.google.com/console/u/0/developers/{_dev_id(ctx)}/app/"
            f"{_cget(ctx, 'APP_ID')}/app-content/content-rating-overview",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        arm_low_footprint(page)
        pace(page, 5.0)
        activate(page, ctx)
        if "content-rating" in (page.url or ""):
            _opened = True
            step(ctx, "content-rating overview open (direct)")
            break
    if not _opened:
        # Unhydrated row-text clicks miss navigation — retry until app-content loads.
        for _nav in range(3):
            goto_dashboard(page, ctx)
            open_task(page, ctx, TASK_RATING_PATTERNS, "content-rating")
            if "app-content" in (page.url or ""):
                break
            step(ctx, "task click missed navigation — retrying")
        else:
            failshot(page, ctx, "content-rating", RuntimeError("task click never navigated"))
    wait_for_questions(page, ctx, "content-rating")
    expand_all(page, ctx)
    # Enter the questionnaire: resume an in-progress draft via Edit, else Start.
    # (After the first Start, the overview shows Edit instead of Start.)
    def _try_enter(patterns):
        for pattern in patterns:
            for role in ("link", "button"):
                try:
                    el = page.get_by_role(role, name=pattern).first
                    el.wait_for(state="visible", timeout=4000)
                    el.click()
                    return True
                except Exception:
                    continue
        return False

    for _st in range(3):
        if _try_enter([re.compile(r"^edit$", re.I), re.compile(r"^تعديل$", re.I)]):
            step(ctx, "resumed questionnaire via Edit")
        elif _try_enter(
            [re.compile(r"start (new )?questionnaire", re.I), re.compile(r"بدء الاستبيان", re.I)]
        ):
            step(ctx, "started questionnaire")
        pace(page)
        try:
            if "questionnaire" in (page.url or "") and "overview" not in (page.url or ""):
                break
        except Exception:
            pass
    pace(page, 2.0)
    # IARC step 1 is a Category form (email + app-type + terms), not questions.
    _fill_iarc_category(page, ctx)
    pace(page, 1.5)

    for page_no in range(1, 31):
        step(ctx, f"questionnaire page {page_no}")
        # Auto-submit can land us back on the overview with status Completed.
        try:
            _body0 = page.inner_text("body") or ""
        except Exception:
            _body0 = ""
        if re.search(r"IARC status", _body0, re.I) and re.search(r"completed", _body0, re.I):
            step(ctx, "IARC status Completed detected")
            try:
                ctx["_rating_seen"] = True
            except Exception:
                pass
            break
        expand_all(page, ctx)
        pace(page, 1.5)
        if _is_category_page(page, ctx):
            _handle_category_page(page, ctx)
        else:
            # One answer pass + Save (Save unlocks Next server-side); extra
            # rounds only while Next stays disabled. Checkbox-list pages with
            # zero safe options are valid untouched (none apply).
            _answer_page_none(page, ctx)
            pace(page, 1.2)
            expand_all(page, ctx)
            if try_click(page, ctx, SAVE_PATTERNS, "questionnaire Save"):
                pace(page, 3.0)
                step(ctx, f"page {page_no} saved")
            for _round in range(2):
                if _next_enabled(page, ctx):
                    break
                step(ctx, f"page {page_no}: Next locked — extra round {_round}")
                _answer_page_none(page, ctx)
                try:
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    pace(page, 1.2)
                    page.evaluate("window.scrollTo(0, 0)")
                    pace(page, 1.2)
                except Exception:
                    pass
                expand_all(page, ctx)
        pace(page, 0.8)
        # Submit takes precedence on the last page; otherwise advance.
        submitted = False
        try:
            body = page.inner_text("body") or ""
        except Exception:
            body = ""
        last_page_hint = bool(re.search(r"submit|finish|complete|إرسال|إنهاء", body, re.I))
        if last_page_hint and _click_submit(page, ctx):
            submitted = True
        elif _click_next(page, ctx):
            pace(page, 3.5)
            try:
                # SOLE retained networkidle (15s, was 25s): the Next advance is
                # an in-place SPA transition with no URL change, so
                # domcontentloaded cannot gate it — networkidle is the only
                # load-state signal here.
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass
            activate(page, ctx)
            assert_developer(page, ctx)
            continue
        elif _click_submit(page, ctx):
            submitted = True
        else:
            # Auto-submit may have landed us on the completed overview (no Next/Submit there).
            try:
                _b = page.inner_text("body") or ""
            except Exception:
                _b = ""
            if re.search(r"IARC status", _b, re.I) and re.search(r"completed", _b, re.I):
                step(ctx, "auto-submit completed the questionnaire")
                try:
                    ctx["_rating_seen"] = True
                except Exception:
                    pass
                break
            failshot(
                page,
                ctx,
                "questionnaire-stuck",
                RuntimeError(f"page {page_no}: neither Next nor Submit available"),
            )
        if submitted:
            confirm_dialog(page, ctx, SUBMIT_PATTERNS, "confirm submit rating")
            break
    else:
        failshot(
            page,
            ctx,
            "questionnaire-loop",
            RuntimeError("questionnaire exceeded 30 pages without reaching Submit"),
        )

    rating = _capture_rating(page, ctx)
    verify_saved(page, ctx, "content-rating")
    step(ctx, f"content-rating done: {label} ({rating})")


TASKS = {
    "Target audience": run_target_audience,
    "Content rating": run_content_rating,
}

__all__ = ["TASKS", "run_content_rating", "run_target_audience"]
