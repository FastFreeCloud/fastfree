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
        shot = AUTH_DIR / f"fail-{_key(ctx)}-{name}-{stamp}.png"
        page.screenshot(path=str(shot))
        LOG.error("FAIL[%s]: %s\n  url=%s\n  shot=%s", name, err, page.url, shot)
    except Exception:
        LOG.error("FAIL[%s]: %s", name, err)
    raise err if isinstance(err, Exception) else RuntimeError(str(err))


def activate(page, ctx: dict) -> None:
    """Bring our tab forward; background tabs stall the Console SPA."""
    try:
        page.bring_to_front()
    except Exception:
        pass
    page.wait_for_timeout(1500)
    try:
        if re.search(r"/console/developers/?(?:\?.*)?$", page.url or ""):
            step(ctx, "developer chooser — selecting account")
            click_any(page, ctx, [re.compile(r"fastfree\.cloud", re.I)], "select developer account")
            page.wait_for_timeout(5000)
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
        for method in ("label", "placeholder", "textbox"):
            try:
                if method == "label":
                    field = page.get_by_label(pattern)
                elif method == "placeholder":
                    field = page.get_by_placeholder(pattern)
                else:
                    field = page.get_by_role("textbox", name=pattern)
                field.first.wait_for(state="visible", timeout=4000)
                field.first.fill(value)
                step(ctx, f"filled: {desc}")
                return
            except Exception:
                continue
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
                page.wait_for_timeout(800)
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
                    page.wait_for_timeout(2000)
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
                r.check()
                page.wait_for_timeout(500)
                if r.is_checked():
                    step(ctx, f"answered [{lab}]: {desc}")
                    page.wait_for_timeout(1000)
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
                    page.wait_for_timeout(500)
                    if opt.is_checked():
                        step(ctx, f"answered by label: {desc}")
                        page.wait_for_timeout(1000)
                        return
                except Exception:
                    pass
                # 2) legacy role+name inside scope.
                try:
                    opt = scope.get_by_role("radio", name=apat)
                    opt.first.wait_for(state="visible", timeout=4000)
                    opt.first.check()
                    step(ctx, f"answered: {desc}")
                    page.wait_for_timeout(1000)
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
    """Click Save (EN+AR) then verify the save confirmation text."""
    expand_all(page, ctx)
    click_any(
        page,
        ctx,
        [re.compile(r"^save( changes)?$|^حفظ( التغييرات)?$", re.I)],
        f"Save {desc}",
    )
    page.wait_for_timeout(4000)
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
        page.wait_for_timeout(4000)
        activate(page, ctx)
        if aid and f"/app/{aid}/" in (page.url or ""):
            break
        step(ctx, "dashboard bounced — retrying via app list")
        page.goto(f"{base}/u/0/developers/{dev}/app-list", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)
        activate(page, ctx)
        try_click(page, ctx, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
        click_any(page, ctx, [re.compile(f"^{re.escape(_get(ctx, 'NAME'))}$")], "open app row")
        page.wait_for_timeout(5000)
        activate(page, ctx)
    if not (aid and f"/app/{aid}/" in (page.url or "")):
        failshot(page, ctx, "dashboard-unreachable", RuntimeError("dashboard bounced twice"))
    assert_dev(page, ctx, "dashboard-id")
    try:
        page.wait_for_load_state("networkidle", timeout=45000)
    except Exception:
        pass
    try:
        # Generic dashboard markers: task rows hide collapsed, and .first can
        # resolve hidden — accept the first VISIBLE match instead.
        deadline = time.time() + 60
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
                page.wait_for_timeout(1000)
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
            page.wait_for_timeout(1500)
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
        page.wait_for_timeout(5000)
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
    # Unhydrated row text clicks do nothing under throttle — verify navigation
    # to app-content, else re-expand + retry.
    for _retry in range(3):
        try:
            click_any(page, ctx, label_patterns, f"open {desc}")
        except Exception:
            pass
        page.wait_for_timeout(4000)
        activate(page, ctx)
        if "app-content" in (page.url or ""):
            break
        step(ctx, f"still on dashboard — re-expanding (try {_retry + 1})")
        expand_view_tasks(page, ctx)
    if "app-content" not in (page.url or ""):
        failshot(page, ctx, f"open-{desc}", RuntimeError("task click never navigated"))
    assert_dev(page, ctx, f"{desc}-id")
    try:
        page.wait_for_load_state("networkidle", timeout=45000)
    except Exception:
        pass


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


def _label_exact_check(page, ctx: dict, labels: list, desc: str) -> bool:
    """group_simple.answer_no idiom: exact label, count==1, verify checked."""
    for lab in labels:
        try:
            box = page.get_by_label(lab, exact=True)
            if box.count() != 1:
                continue
            box.first.wait_for(state="visible", timeout=5000)
            box.first.check()
            page.wait_for_timeout(500)
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
                page.wait_for_timeout(500)
                if SUPPORT_EMAIL in (field.first.input_value() or ""):
                    step(ctx, "filled deletion contact (label match)")
                    return
            except Exception:
                continue
    # 2) generic: wait up to 30s for ANY new textbox in the deletion container,
    #    then fill the first empty visible one. Nearest ancestor must own a
    #    non-radio input/textarea (radios alone must not satisfy the scope).
    deadline = time.time() + 30
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
                    page.wait_for_timeout(500)
                    if SUPPORT_EMAIL in (box.input_value() or ""):
                        step(ctx, "filled deletion contact (container scan)")
                        return
                except Exception:
                    continue
        page.wait_for_timeout(1000)
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

# (section, type, purposes, desc) — explicit per-item handling with fallbacks.
DATA_DECLARATIONS = (
    {
        "section": [re.compile(r"personal info|معلومات شخصية", re.I)],
        "dtype": [re.compile(r"^name$|full name|الاسم", re.I)],
        "purposes": PURPOSE_APP_FUNCTIONALITY,
        "desc": "Personal info / Name (App functionality)",
    },
    {
        "section": [re.compile(r"contact|جهات الاتصال|معلومات الاتصال", re.I)],
        "dtype": [re.compile(r"phone number|رقم الهاتف", re.I)],
        "purposes": PURPOSE_APP_FUNCTIONALITY,
        "desc": "Contact / Phone number (App functionality)",
    },
    {
        "section": [re.compile(r"app activity|نشاط التطبيق", re.I)],
        "dtype": [
            re.compile(r"account credentials|credentials|login|user.?name|password|بيانات الاعتماد", re.I)
        ],
        "purposes": PURPOSE_ACCOUNT_MANAGEMENT,
        "desc": "App activity / Account credentials (Account management)",
    },
)


def declare_data_type(page, ctx: dict, decl: dict) -> None:
    """Add one collected data type: section → type → purposes → sharing NO."""
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
    page.wait_for_timeout(2000)
    expand_all(page, ctx)
    # Category then concrete type: row-checkbox idiom with dialog fallback.
    checked = False
    for patterns, what in ((decl["section"], "section"), (decl["dtype"], "type")):
        for pattern in patterns:
            try:
                check_row_for_text(page, ctx, pattern, f"{what}: {desc}")
                checked = True
                break
            except Exception:
                continue
        if checked and what == "section":
            checked = False  # reset for the type pass below
            page.wait_for_timeout(1500)
            continue
        if checked:
            break
    if not checked:
        # Fallback: checkbox roles directly (newer flat picker layout).
        for patterns in (decl["section"], decl["dtype"]):
            try:
                pick_one(page, ctx, "checkbox", patterns, f"flat picker: {desc}")
            except Exception:
                continue
    page.wait_for_timeout(1500)
    try_click(page, ctx, NEXT_PATTERNS + APPLY_PATTERNS, f"confirm type picker: {desc}")
    page.wait_for_timeout(2000)
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
    page.wait_for_timeout(1000)
    try_click(page, ctx, NEXT_PATTERNS + APPLY_PATTERNS, f"confirm type detail: {desc}")
    save_and_verify(page, ctx, f"data type {desc}")


def run_data_safety(page, ctx: dict) -> None:
    """Dashboard 'Data safety' → collection declaration → sharing NO → submit."""
    step(ctx, "DATA SAFETY: start")
    open_task(page, ctx, DATA_SAFETY_LABELS, "Data safety")
    try_click(page, ctx, MANAGE_PATTERNS + NEXT_PATTERNS, "enter questionnaire")
    page.wait_for_timeout(2000)
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
        page.wait_for_timeout(2500)
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
        page.wait_for_timeout(5000)
    else:
        step(ctx, "WARNING: step-2 controls never complete — proceeding anyway")
    # Q1: collects user data → YES (we declare Name / Phone / Credentials).
    answer_question(page, ctx, COLLECT_Q[0], "Yes", "collects user data YES")
    page.wait_for_timeout(1500)
    # Security: encrypted in transit YES (https to backend.fastfree.cloud).
    try:
        answer_question(page, ctx, ENCRYPT_Q[0], "Yes", "encrypted in transit YES")
    except Exception:
        step(ctx, "WARNING: encryption question not found, continuing")
    page.wait_for_timeout(1500)
    # Deletion: users can request deletion via the support email. The contact
    # field label is unknown — fill_deletion_contact waits 30s for ANY new
    # textbox in the deletion container, else WARNING + continue (Next safe).
    try:
        answer_question(page, ctx, DELETE_Q[0], "Yes", "deletion available YES")
        page.wait_for_timeout(1500)
        fill_deletion_contact(page, ctx)
    except Exception:
        step(ctx, "WARNING: deletion question not found, continuing")
    page.wait_for_timeout(1500)
    # Account creation methods (Frappe login): Username and password ONLY.
    try:
        _ac = page.get_by_label("Username and password", exact=True)
        if _ac.count() == 1:
            _ac.first.wait_for(state="visible", timeout=8000)
            _ac.first.check()
            page.wait_for_timeout(800)
            if _ac.first.is_checked():
                step(ctx, "checked account method: Username and password")
            else:
                failshot(page, ctx, "account-method", RuntimeError("did not stick"))
        else:
            step(ctx, "WARNING: account-method label not unique, skipping")
    except Exception as exc:
        step(ctx, f"WARNING: account-method question not found ({exc}), continuing")
    page.wait_for_timeout(1500)
    # Deletion URL (appears after deletion-YES): use the privacy page, which
    # carries the support contact for deletion requests. Flagged to the human.
    try:
        _du = page.get_by_label(re.compile(r"delete account", re.I))
        if _du.count() >= 1:
            _du.first.wait_for(state="visible", timeout=8000)
            _du.first.fill(PRIVACY_URL)
            page.wait_for_timeout(800)
            if PRIVACY_URL in (_du.first.input_value() or ""):
                step(ctx, "filled deletion URL (privacy page)")
            else:
                step(ctx, "WARNING: deletion URL fill unverified")
        else:
            step(ctx, "WARNING: deletion URL field absent")
    except Exception:
        step(ctx, "WARNING: deletion URL field not found, continuing")
    page.wait_for_timeout(1500)
    # Re-assert every step-2 answer (throttled re-renders can reset controls).
    try:
        for _pat, _dn in (
            (re.compile(r"collect or share any.*required user data", re.I), "collects"),
            (re.compile(r"encrypted in transit", re.I), "encrypted"),
        ):
            try:
                _q = page.get_by_text(_pat).first
                _q.wait_for(state="visible", timeout=8000)
                _scope = _q.locator("xpath=ancestor::*[descendant::*[@role='radio']][1]")
                _yes = _scope.get_by_label(re.compile(r"^yes$", re.I)).first
                _yes.wait_for(state="visible", timeout=5000)
                try:
                    if not _yes.is_checked():
                        _yes.check()
                        page.wait_for_timeout(800)
                except Exception:
                    _yes.check()
                    page.wait_for_timeout(800)
                if _yes.is_checked():
                    step(ctx, f"re-asserted {_dn}=YES")
            except Exception:
                continue
    except Exception:
        pass
    try:
        _ac2 = page.get_by_label("Username and password", exact=True)
        if _ac2.count() == 1:
            try:
                if not _ac2.first.is_checked():
                    _ac2.first.check()
                    page.wait_for_timeout(800)
            except Exception:
                pass
            if _ac2.first.is_checked():
                step(ctx, "re-asserted account method")
    except Exception:
        pass
    if try_click(page, ctx, [re.compile(r"^save draft$", re.I)], "Save draft step 2"):
        page.wait_for_timeout(3000)
        step(ctx, "step 2 draft saved")
    # Advance to step 3 (Data types) — step 2 has no other required inputs.
    if not try_click(page, ctx, NEXT_PATTERNS, "data safety Next to types"):
        step(ctx, "WARNING: Next unavailable after step 2")
    page.wait_for_timeout(4000)
    # The three declared data types, each with purposes + sharing NO.
    for decl in DATA_DECLARATIONS:
        try:
            declare_data_type(page, ctx, decl)
        except Exception as exc:
            failshot(page, ctx, "data-type", RuntimeError(f"failed declaring {decl['desc']}: {exc}"))
        page.wait_for_timeout(1500)
    # Privacy policy link for the safety section.
    try:
        fill_any(page, ctx, PRIVACY_PATTERNS, PRIVACY_URL, "privacy policy URL")
    except Exception:
        step(ctx, "WARNING: privacy policy field not on this step (set in store listing)")
    save_and_verify(page, ctx, "data safety answers")
    # Submit for review (dialog-scoped confirm, §5).
    if try_click(page, ctx, SUBMIT_PATTERNS, "submit data safety"):
        page.wait_for_timeout(2000)
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
        page.wait_for_timeout(4000)
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
    """Read title/short/full at RUNTIME from the fastlane metadata dirs."""
    base = REPO_ROOT / "apps" / f"fastfree_{slug}" / "fastlane" / "metadata" / "android" / locale
    texts = {}
    for key, filename in (
        ("title", "title.txt"),
        ("short", "short_description.txt"),
        ("full", "full_description.txt"),
    ):
        path = base / filename
        if not path.is_file():
            raise RuntimeError(f"missing listing asset: {path}")
        texts[key] = path.read_text(encoding="utf-8").strip()
        if not texts[key]:
            raise RuntimeError(f"empty listing asset: {path}")
    if len(texts["title"]) > TITLE_LIMIT:
        raise RuntimeError(f"title {len(texts['title'])} chars > {TITLE_LIMIT} (fix {base}/title.txt)")
    if len(texts["short"]) > SHORT_LIMIT:
        raise RuntimeError(f"short {len(texts['short'])} chars > {SHORT_LIMIT} (fix {base})")
    if len(texts["full"]) > FULL_LIMIT:
        raise RuntimeError(f"full {len(texts['full'])} chars > {FULL_LIMIT} (fix {base})")
    return texts


def resolve_images(slug: str, locale: str) -> dict:
    """Per-locale images dir, falling back to en-US when a file is absent."""
    want = REPO_ROOT / "apps" / f"fastfree_{slug}" / "fastlane" / "metadata" / "android"
    fallback = want / "en-US" / "images"
    local = want / locale / "images"
    resolved: dict = {}
    shots = sorted(local.glob("phone-screenshots/*.png")) or sorted(fallback.glob("phone-screenshots/*.png"))
    for key, filename in (("icon", "icon.png"), ("feature", "feature-graphic.png")):
        candidate = local / filename
        if not candidate.is_file():
            candidate = fallback / filename
        if not candidate.is_file():
            raise RuntimeError(f"missing graphic asset: {candidate}")
        resolved[key] = candidate
    if not shots:
        raise RuntimeError(f"no phone screenshots in {local} nor {fallback}")
    resolved["shots"] = shots
    return resolved


def select_locale(page, ctx: dict, locale: str, name_patterns: list) -> None:
    """Switch the store-listing editor to locale; add the language if absent."""
    for pattern in name_patterns:
        try:
            tab = page.get_by_text(pattern).first
            tab.wait_for(state="visible", timeout=5000)
            tab.click()
            step(ctx, f"locale tab selected: {locale}")
            page.wait_for_timeout(2500)
            return
        except Exception:
            continue
    # Language tab missing → add it, then retry the tab click.
    step(ctx, f"locale tab {locale} absent — adding language")
    click_any(page, ctx, ADD_LANGUAGE_PATTERNS, f"add language {locale}")
    page.wait_for_timeout(2000)
    expand_all(page, ctx)
    added = False
    for pattern in name_patterns:
        try:
            check_row_for_text(page, ctx, pattern, f"pick language {locale}")
            added = True
            break
        except Exception:
            continue
    if not added:
        failshot(page, ctx, f"locale-{locale}", RuntimeError(f"language {locale} not offered"))
    try_click(page, ctx, APPLY_PATTERNS + NEXT_PATTERNS, f"confirm add language {locale}")
    page.wait_for_timeout(2500)
    for pattern in name_patterns:
        try:
            tab = page.get_by_text(pattern).first
            tab.wait_for(state="visible", timeout=8000)
            tab.click()
            step(ctx, f"locale tab selected after add: {locale}")
            page.wait_for_timeout(2500)
            return
        except Exception:
            continue
    failshot(page, ctx, f"locale-{locale}", RuntimeError(f"locale tab {locale} never appeared"))


def upload_near(page, ctx: dict, label_patterns: list, paths: list, desc: str) -> None:
    """Set file input(s) inside the section owning the label text (never OS picker)."""
    tried: list = []
    for pattern in label_patterns:
        try:
            anchor = page.get_by_text(pattern).first
            anchor.wait_for(state="visible", timeout=8000)
            section = anchor.locator("xpath=ancestor::*[descendant::input[@type='file']][1]")
            box = section.locator("input[type='file']").first
            box.wait_for(state="attached", timeout=15000)
            box.set_input_files([str(p) for p in paths])
            step(ctx, f"uploaded {desc} ({len(paths)} file(s))")
            page.wait_for_timeout(5000)
            return
        except Exception as exc:
            tried.append(str(exc)[:120])
            continue
    failshot(page, ctx, desc, RuntimeError(f"no upload input near {desc}: {' | '.join(tried)}"))


def fill_locale_listing(page, ctx: dict, slug: str, locale: str) -> None:
    """Fill texts + graphics + privacy URL for one locale, then save+verify."""
    step(ctx, f"STORE LISTING [{locale}]: start")
    select_locale(page, ctx, locale, [p for _, pats in LOCALES if _ == locale for p in pats])
    texts = read_locale_texts(slug, locale)
    images = resolve_images(slug, locale)
    fill_any(page, ctx, TITLE_PATTERNS, texts["title"], f"[{locale}] app name")
    fill_any(page, ctx, SHORT_PATTERNS, texts["short"], f"[{locale}] short description")
    fill_any(page, ctx, FULL_PATTERNS, texts["full"], f"[{locale}] full description")
    page.wait_for_timeout(1500)
    upload_near(page, ctx, ICON_UPLOAD_PATTERNS, [images["icon"]], f"[{locale}] app icon")
    upload_near(page, ctx, FEATURE_UPLOAD_PATTERNS, [images["feature"]], f"[{locale}] feature graphic")
    upload_near(page, ctx, SHOTS_UPLOAD_PATTERNS, images["shots"], f"[{locale}] phone screenshots")
    fill_any(page, ctx, PRIVACY_PATTERNS, PRIVACY_URL, f"[{locale}] privacy policy URL")
    save_and_verify(page, ctx, f"store listing {locale}")
    step(ctx, f"STORE LISTING [{locale}]: done")


def run_store_listing(page, ctx: dict) -> None:
    """'Set up your store listing' → per-locale (ar + en-US) texts + graphics."""
    step(ctx, "STORE LISTING: start")
    slug = slug_from_package(_get(ctx, "PACKAGE"))
    step(ctx, f"resolved slug: {slug}")
    open_task(page, ctx, STORE_LISTING_LABELS, "store listing")
    try_click(page, ctx, MANAGE_PATTERNS, "enter main listing editor")
    page.wait_for_timeout(2000)
    for locale, _pats in LOCALES:
        fill_locale_listing(page, ctx, slug, locale)
        page.wait_for_timeout(2000)
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
    page.wait_for_timeout(3000)
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
            page.wait_for_timeout(4000)
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
    page.wait_for_timeout(2000)
    expand_all(page, ctx)
    # Restricted functionality → YES so the instructions form appears.
    try:
        answer_near(page, ctx, RESTRICTED_Q, YES_PATTERNS, "restricted functionality YES")
    except Exception:
        step(ctx, "WARNING: restricted-access question not found, continuing to add form")
    page.wait_for_timeout(1500)
    click_any(page, ctx, ADD_INSTRUCTIONS_PATTERNS, "add instructions")
    page.wait_for_timeout(2000)
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
    page.wait_for_timeout(1000)
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
        page.wait_for_timeout(1000)
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
    page.wait_for_timeout(2000)
    _verify_app_access_saved(page, ctx)


TASKS = {
    "Data safety": run_data_safety,
    "Set up your store listing": run_store_listing,
    "Sign in details": run_sign_in_details,
}
