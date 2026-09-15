"""Play Console dashboard declarations — simple task group (self-contained).

Covers 6 Dashboard declaration tasks with FIXED answers (same for all 4 apps):
- Ads -> NO ads.
- Government apps -> No.
- Health -> No health features.
- Financial features -> No regulated financial features (apps only record
  business invoices/sales/payroll locally; zero payment-gateway code).
- Set privacy policy -> https://fastfree.cloud/privacy-policy.html.
- App category + contact -> Business / mohamed.fastfree@gmail.com / +201091999937.

Runtime drives ONE browser tab sequentially. Each entry is
``def run_x(page, ctx) -> None`` where ctx has NAME, PACKAGE, APP_ID,
DEV_ID, KEY. Helpers mirror fastfree_console_erp_setup.py idioms
(step/activate/click_any/try_click/fill_any/pick_one/failshot) but are
redefined here parameterized by ctx["KEY"]. Auth dir: .auth/play-console/.
"""

from __future__ import annotations

import re
import time
from pathlib import Path

PRIVACY_URL = "https://fastfree.cloud/privacy-policy.html"
CONTACT_EMAIL = "mohamed.fastfree@gmail.com"
CONTACT_PHONE = "+201091999937"
CONSOLE = "https://play.google.com/console"
FALLBACK_DEV_ID = "7269125617638997236"

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
AUTH_DIR = REPO_ROOT / ".auth" / "play-console"

NO_PATTERNS = [re.compile(r"^no$", re.I), re.compile(r"^لا$", re.I)]

SAVE_PATTERNS = [
    re.compile(r"^save( changes)?$", re.I),
    re.compile(r"^حفظ( التغييرات)?$", re.I),
]

SAVED_PATTERNS = [
    re.compile(r"saved|changes saved|draft saved", re.I),
    re.compile(r"تم الحفظ|تم حفظ", re.I),
    re.compile(r"complete|مكتمل|مكتملة", re.I),
]

SHOW_MORE_PATTERNS = [
    re.compile(r"show more", re.I),
    re.compile(r"عرض المزيد", re.I),
]


def step(ctx: dict, msg: str) -> None:
    print(f"[{ctx.get('KEY', '?')}] {msg}", flush=True)


def failshot(page, ctx: dict, name: str, err: Exception) -> None:
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        stamp = int(time.time() * 1000)
        shot = AUTH_DIR / f"fail-{ctx.get('KEY', 'app')}-{name}-{stamp}.png"
        page.screenshot(path=str(shot))
        url = page.url
    except Exception:
        shot = "(screenshot failed)"
        url = "(unreadable)"
    raise RuntimeError(f"FAIL[{name}]: {err} url={url} shot={shot}") from err


def activate(page, ctx: dict) -> None:
    try:
        page.bring_to_front()
    except Exception:
        step(ctx, "bring_to_front unavailable, continuing")
    page.wait_for_timeout(1500)
    try:
        if re.search(r"/console/developers/?(?:\?.*)?$", page.url or ""):
            step(ctx, "developer chooser — selecting account")
            click_any(page, ctx, [re.compile(r"fastfree\.cloud", re.I)], "select developer")
            page.wait_for_timeout(5000)
    except Exception:
        step(ctx, "developer chooser check skipped")


def assert_dev(page, ctx: dict) -> None:
    expected = str(ctx.get("DEV_ID") or FALLBACK_DEV_ID)
    found = re.search(r"/developers/(\d+)", page.url or "")
    actual = found.group(1) if found else None
    if actual != expected:
        failshot(
            page,
            ctx,
            "wrong-developer-id",
            RuntimeError(f"developer is {actual}, expected {expected} (owner fastfree.cloud)"),
        )
    step(ctx, f"developer id confirmed: {expected}")


def dashboard_url(ctx: dict) -> str:
    dev = str(ctx.get("DEV_ID") or FALLBACK_DEV_ID)
    return f"{CONSOLE}/u/0/developers/{dev}/app/{ctx['APP_ID']}/dashboard"


def click_any(page, ctx: dict, patterns: list, desc: str) -> None:
    for pattern in patterns:
        for role in ("link", "button"):
            try:
                loc = page.get_by_role(role, name=pattern)
                loc.first.wait_for(state="visible", timeout=8000)
                loc.first.click()
                step(ctx, f"clicked {role}: {desc}")
                return
            except Exception:
                continue
        try:
            txt = page.get_by_text(pattern)
            txt.first.wait_for(state="visible", timeout=8000)
            txt.first.click()
            step(ctx, f"clicked text: {desc}")
            return
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"nothing clickable matched: {desc}"))


def try_click(page, ctx: dict, patterns: list, desc: str) -> bool:
    for pattern in patterns:
        for role in ("link", "button"):
            try:
                loc = page.get_by_role(role, name=pattern)
                loc.first.wait_for(state="visible", timeout=4000)
                loc.first.click()
                step(ctx, f"clicked (optional) {role}: {desc}")
                return True
            except Exception:
                continue
    return False


def fill_any(page, ctx: dict, patterns: list, value: str, desc: str) -> None:
    for pattern in patterns:
        for method in ("label", "placeholder"):
            try:
                field = (
                    page.get_by_label(pattern)
                    if method == "label"
                    else page.get_by_placeholder(pattern)
                )
                field.first.wait_for(state="visible", timeout=8000)
                field.first.fill(value)
                step(ctx, f"filled ({method}): {desc}")
                return
            except Exception:
                continue
    failshot(page, ctx, desc, RuntimeError(f"no input matched: {desc}"))


def pick_one(page, ctx: dict, role: str, patterns: list, desc: str, action: str = "check") -> None:
    for pattern in patterns:
        try:
            loc = page.get_by_role(role, name=pattern)
            loc.first.wait_for(state="visible", timeout=8000)
            if action == "check":
                loc.first.check()
            else:
                loc.first.click()
            step(ctx, f"{'checked' if action == 'check' else 'clicked'} {role}: {desc}")
            return
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"no {role} matched: {desc}"))


def expand_all(page, ctx: dict) -> None:
    """Expand collapsed sections BEFORE clicking save (§5 expand-before-click)."""
    try:
        for item in page.get_by_text(SHOW_MORE_PATTERNS[0]).all():
            try:
                item.click(timeout=3000)
                page.wait_for_timeout(800)
            except Exception:
                continue
        step(ctx, "expanded collapsed sections")
    except Exception:
        step(ctx, "expand-all skipped")


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


def ensure_dashboard(page, ctx: dict) -> None:
    """Land on the app dashboard; recover via app-list row click on throttle bounce."""
    dev = str(ctx.get("DEV_ID") or FALLBACK_DEV_ID)
    aid = str(ctx.get("APP_ID") or "")
    for _attempt in range(2):
        page.goto(dashboard_url(ctx), wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)
        activate(page, ctx)
        if aid and f"/app/{aid}/" in (page.url or ""):
            assert_dev(page, ctx)
            return
        step(ctx, "dashboard bounced — retrying via app list")
        page.goto(f"{CONSOLE}/u/0/developers/{dev}/app-list", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)
        activate(page, ctx)
        try_click(page, ctx, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
        click_any(page, ctx, [re.compile(f"^{re.escape(ctx.get('NAME', ''))}$")], "open app row")
        page.wait_for_timeout(5000)
        activate(page, ctx)
        if aid and f"/app/{aid}/" in (page.url or ""):
            assert_dev(page, ctx)
            return
    failshot(page, ctx, "dashboard-unreachable", RuntimeError("dashboard bounced twice"))


def open_task(page, ctx: dict, patterns: list, desc: str) -> None:
    ensure_dashboard(page, ctx)
    try:
        page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        step(ctx, "networkidle wait skipped")
    try_click(page, ctx, [re.compile(r"accept|agree|موافق|قبول", re.I)], "cookie banner")
    expand_view_tasks(page, ctx)
    click_any(page, ctx, patterns, f"open task: {desc}")
    page.wait_for_timeout(4000)
    activate(page, ctx)


def confirm_dialog(page, ctx: dict, desc: str) -> None:
    """Confirm a save dialog scoped to the dialog role (§5 dialog scoping)."""
    try:
        dlg = page.get_by_role("dialog").filter(has_text=re.compile(r"save|confirm|حفظ|تأكيد", re.I))
        dlg.wait_for(state="visible", timeout=8000)
        btn = dlg.get_by_role("button", name=re.compile(r"save|confirm|^ok$|حفظ|تأكيد|موافق", re.I))
        btn.first.click(timeout=8000)
        step(ctx, f"confirmed dialog: {desc}")
        page.wait_for_timeout(2000)
    except Exception:
        step(ctx, f"no confirm dialog: {desc}")


def save_and_verify(page, ctx: dict, desc: str) -> None:
    expand_all(page, ctx)
    click_any(page, ctx, SAVE_PATTERNS, f"save {desc}")
    page.wait_for_timeout(3000)
    confirm_dialog(page, ctx, desc)
    page.wait_for_timeout(3000)
    for pattern in SAVED_PATTERNS:
        try:
            page.get_by_text(pattern).first.wait_for(state="visible", timeout=15000)
            step(ctx, f"save verified: {desc}")
            return
        except Exception:
            continue
    failshot(page, ctx, f"{desc}-verify", RuntimeError(f"save confirmation not visible: {desc}"))


def answer_no(page, ctx: dict, question_patterns: list, desc: str, no_labels=None) -> None:
    """Answer No via the label-associated radio (exact, deterministic).

    Never row-walks from body text: banner/question copy routinely contains
    "not a <X>" phrasing that resolves to the WRONG (usually first/Yes) radio.
    Requires exactly one matching label; verifies THAT radio is checked.
    """
    for pattern in question_patterns:
        try:
            page.get_by_text(pattern).first.wait_for(state="visible", timeout=20000)
            step(ctx, f"question visible: {desc}")
            break
        except Exception:
            continue
    else:
        failshot(page, ctx, desc, RuntimeError(f"question text not visible: {desc}"))
    for lab in (no_labels or ["No", "لا"]):
        try:
            box = page.get_by_label(lab, exact=True)
            if box.count() != 1:
                continue
            box.first.wait_for(state="visible", timeout=5000)
            box.first.check()
            page.wait_for_timeout(500)
            if box.first.is_checked():
                step(ctx, f"answered: {desc} = [{lab}]")
                return
        except Exception:
            continue
    failshot(page, ctx, desc, RuntimeError(f"no unique No label (tried {no_labels}): {desc}"))


def run_ads(page, ctx: dict) -> None:
    """Ads declaration -> NO ads."""
    open_task(
        page,
        ctx,
        [re.compile(r"\bads\b", re.I), re.compile(r"الإعلانات|إعلان", re.I)],
        "Ads",
    )
    answer_no(
        page,
        ctx,
        [
            re.compile(r"does your app contain ads", re.I),
            re.compile(r"contain.*ads", re.I),
            re.compile(r"هل يحتوي تطبيقك على إعلانات", re.I),
            re.compile(r"إعلانات", re.I),
        ],
        "ads",
        ["No, my app does not contain ads", "لا"],
    )
    save_and_verify(page, ctx, "ads")


def run_government(page, ctx: dict) -> None:
    """Government apps declaration -> No."""
    open_task(
        page,
        ctx,
        [re.compile(r"government apps?", re.I), re.compile(r"حكومي|الحكومية", re.I)],
        "Government apps",
    )
    answer_no(
        page,
        ctx,
        [
            re.compile(r"government", re.I),
            re.compile(r"حكومي", re.I),
        ],
        "government",
        ["No", "لا"],
    )
    save_and_verify(page, ctx, "government")


def run_health(page, ctx: dict) -> None:
    """Health apps -> NONE apply (checkbox form, NOT Yes/No)."""
    open_task(
        page,
        ctx,
        [re.compile(r"^health", re.I), re.compile(r"الصحة|الصحية", re.I)],
        "Health",
    )
    found = False
    for _attempt in range(2):
        try:
            page.get_by_text(
                re.compile(r"select all that apply|tell us about the health", re.I)
            ).first.wait_for(state="visible", timeout=60000)
            found = True
            break
        except Exception:
            step(ctx, "features form slow — reloading once")
            page.reload(wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(5000)
    if not found:
        failshot(page, ctx, "health", RuntimeError("features form not visible"))
    step(ctx, "question visible: health (none apply)")
    try:
        none_box = page.get_by_label("My app does not have any health features", exact=True)
        if none_box.count() == 1:
            none_box.first.wait_for(state="visible", timeout=8000)
            none_box.first.check()
            page.wait_for_timeout(1000)
            if none_box.first.is_checked():
                step(ctx, "checked: no health features")
            else:
                failshot(page, ctx, "health", RuntimeError("opt-out did not stick"))
        else:
            failshot(page, ctx, "health", RuntimeError("opt-out label not unique"))
    except Exception as exc:
        failshot(page, ctx, "health", RuntimeError(f"opt-out missing: {exc}"))
    for _i in range(4):
        page.wait_for_timeout(2000)
        if try_click(page, ctx, [re.compile(r"^next$|^التالي$", re.I)], "wizard Next"):
            page.wait_for_timeout(3000)
            continue
        break
    save_and_verify(page, ctx, "health")


def run_financial(page, ctx: dict) -> None:
    """Financial features -> NONE apply (checkbox form, NOT Yes/No).

    Justification (same for all 4 apps): the apps only record business
    invoices/sales/payroll locally; zero payment-gateway code (verified by grep).
    """
    open_task(
        page,
        ctx,
        [re.compile(r"financial features", re.I), re.compile(r"المالي|المالية", re.I)],
        "Financial features",
    )
    found = False
    for _attempt in range(2):
        try:
            page.get_by_text(re.compile(r"select all of the financial features", re.I)).first.wait_for(
                state="visible", timeout=60000
            )
            found = True
            break
        except Exception:
            step(ctx, "features form slow — reloading once")
            page.reload(wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(5000)
    if not found:
        failshot(page, ctx, "financial", RuntimeError("features form not visible"))
    step(ctx, "question visible: financial (none apply)")
    # Explicit opt-out checkbox (last in the list) — required to enable Next.
    try:
        none_box = page.get_by_label("My app doesn't provide any financial features", exact=True)
        if none_box.count() == 1:
            none_box.first.wait_for(state="visible", timeout=8000)
            none_box.first.check()
            page.wait_for_timeout(1000)
            if none_box.first.is_checked():
                step(ctx, "checked: no financial features")
            else:
                failshot(page, ctx, "financial", RuntimeError("opt-out did not stick"))
        else:
            failshot(page, ctx, "financial", RuntimeError("opt-out label not unique"))
    except Exception as exc:
        failshot(page, ctx, "financial", RuntimeError(f"opt-out missing: {exc}"))
    # Multi-step wizard: Next through steps, then Save on the last one.
    for _i in range(4):
        page.wait_for_timeout(2000)
        if try_click(page, ctx, [re.compile(r"^next$|^التالي$", re.I)], "wizard Next"):
            page.wait_for_timeout(3000)
            continue
        break
    save_and_verify(page, ctx, "financial")


def run_privacy(page, ctx: dict) -> None:
    """Set privacy policy -> fixed URL + save."""
    open_task(
        page,
        ctx,
        [
            re.compile(r"set privacy policy", re.I),
            re.compile(r"privacy policy", re.I),
            re.compile(r"سياسة الخصوصية", re.I),
        ],
        "privacy policy",
    )
    fill_any(
        page,
        ctx,
        [
            re.compile(r"privacy policy.*url|privacy.*link|url.*privacy", re.I),
            re.compile(r"رابط سياسة الخصوصية|سياسة الخصوصية", re.I),
            re.compile(r"https://|enter url|أدخل الرابط", re.I),
        ],
        PRIVACY_URL,
        "privacy policy URL",
    )
    try:
        field = page.get_by_label(re.compile(r"privacy", re.I)).first
        if PRIVACY_URL not in (field.input_value(timeout=5000) or ""):
            field.fill(PRIVACY_URL)
        step(ctx, "privacy URL fill verified")
    except Exception:
        step(ctx, "privacy URL re-verify skipped (label lookup only)")
    save_and_verify(page, ctx, "privacy-policy")


def _section_edits(page):
    """Visible Edit controls on store-settings (category first, contacts second)."""
    locs = []
    for role in ("link", "button"):
        try:
            for el in page.get_by_role(role, name=re.compile(r"^edit$|^تعديل$", re.I)).all():
                try:
                    if el.is_visible():
                        locs.append(el)
                except Exception:
                    continue
        except Exception:
            continue
    return locs


def select_business_category(page, ctx: dict) -> None:
    edits = _section_edits(page)
    if not edits:
        failshot(page, ctx, "category", RuntimeError("no Edit controls on store settings"))
    edits[0].click()
    page.wait_for_timeout(3000)
    # Work inside the App-category dialog (the select has no usable role).
    try:
        dlg = page.get_by_role("dialog").filter(has_text=re.compile(r"app category", re.I))
        dlg.wait_for(state="visible", timeout=10000)
    except Exception as exc:
        failshot(page, ctx, "category", RuntimeError(f"category dialog missing: {exc}"))
    _need_select = True
    try:
        _ns = dlg.get_by_text("Not selected", exact=True)
        _ns.first.wait_for(state="visible", timeout=5000)
        _ns.first.click()
        step(ctx, "opened category select")
    except Exception:
        _need_select = False
        step(ctx, "category already set — verifying")
    if _need_select:
        page.wait_for_timeout(2000)
        try:
            opt = page.get_by_role("option", name=re.compile(r"^business$", re.I))
            opt.first.wait_for(state="visible", timeout=10000)
            opt.first.click()
            step(ctx, "selected category: Business")
        except Exception:
            click_any(
                page,
                ctx,
                [re.compile(r"^business$", re.I), re.compile(r"^الأعمال$", re.I)],
                "select Business category",
            )
        page.wait_for_timeout(1500)
        confirm_dialog(page, ctx, "category")
        page.wait_for_timeout(2000)
    else:
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass
        page.wait_for_timeout(1500)
    try:
        page.get_by_text(re.compile(r"^business$", re.I)).first.wait_for(
            state="visible", timeout=15000
        )
        step(ctx, "category verified: Business")
    except Exception as exc:
        failshot(page, ctx, "category", RuntimeError(f"Business not shown: {exc}"))


def run_category(page, ctx: dict) -> None:
    """App category + contact -> Business / email / phone + save."""
    open_task(
        page,
        ctx,
        [
            re.compile(r"select an app category", re.I),
            re.compile(r"app categor", re.I),
            re.compile(r"فئة التطبيق|تصنيف التطبيق|بيانات الاتصال", re.I),
        ],
        "app category + contact",
    )
    select_business_category(page, ctx)
    # Contacts editor: re-query Edit controls (DOM changed), second one.
    # A stray dialog scrim can intercept — Escape first, reload as fallback
    # (category is already saved + verified, so reload is safe).
    edits = _section_edits(page)
    if len(edits) < 2:
        failshot(page, ctx, "category", RuntimeError("contacts Edit control missing"))
    try:
        page.keyboard.press("Escape")
    except Exception:
        pass
    page.wait_for_timeout(2000)
    edits = _section_edits(page)
    try:
        edits[1].click(timeout=15000)
    except Exception:
        step(ctx, "contacts Edit blocked — reloading (category saved)")
        page.reload(wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(5000)
        edits = _section_edits(page)
        if len(edits) < 2:
            failshot(page, ctx, "category", RuntimeError("contacts Edit control missing"))
        try:
            edits[1].click(timeout=15000)
        except Exception as exc:
            failshot(page, ctx, "category", RuntimeError(f"contacts Edit blocked: {exc}"))
    page.wait_for_timeout(3000)
    # Contacts dialog: fields have no label association — fill by order
    # (Email, Phone, Website) scoped to the dialog, then verify values.
    try:
        _cdlg = page.get_by_role("dialog").filter(has_text=re.compile(r"contact details", re.I))
        _cdlg.wait_for(state="visible", timeout=10000)
        _vis = [b for b in _cdlg.get_by_role("textbox").all() if b.is_visible()]
    except Exception as exc:
        failshot(page, ctx, "category", RuntimeError(f"contacts dialog missing: {exc}"))
    if len(_vis) < 2:
        failshot(page, ctx, "category", RuntimeError("contacts fields missing"))
    _vis[0].fill(CONTACT_EMAIL)
    _vis[1].fill(CONTACT_PHONE)
    page.wait_for_timeout(1000)
    if CONTACT_EMAIL not in (_vis[0].input_value() or ""):
        failshot(page, ctx, "category", RuntimeError("email fill failed"))
    if CONTACT_PHONE not in (_vis[1].input_value() or ""):
        failshot(page, ctx, "category", RuntimeError("phone fill failed"))
    step(ctx, "contacts filled + verified")
    try:
        _sv = _cdlg.get_by_role("button", name=re.compile(r"^save$", re.I))
        _sv.first.wait_for(state="visible", timeout=8000)
        _sv.first.click()
        step(ctx, "saved contacts dialog")
    except Exception as exc:
        failshot(page, ctx, "category", RuntimeError(f"contacts save missing: {exc}"))
    page.wait_for_timeout(3000)
    try:
        page.get_by_text(re.compile(re.escape(CONTACT_EMAIL))).first.wait_for(
            state="visible", timeout=15000
        )
        step(ctx, "contacts verified on settings")
    except Exception as exc:
        failshot(page, ctx, "category", RuntimeError(f"email not shown: {exc}"))


TASKS = {
    "Ads": run_ads,
    "Government apps": run_government,
    "Health": run_health,
    "Financial features": run_financial,
    "Set privacy policy": run_privacy,
    "Select an app category and provide contact details": run_category,
}
