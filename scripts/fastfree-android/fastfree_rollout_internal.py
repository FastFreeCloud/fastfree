"""Roll out one app's internal-testing DRAFT to Active (attached CentBrowser only).

Usage (repo root):
  uv run --project scripts/fastfree-android scripts/fastfree-android/fastfree_rollout_internal.py --app pos
  uv run --project scripts/fastfree-android scripts/fastfree-android/fastfree_rollout_internal.py --app erp \
    --from preview

Requires CentBrowser open with --remote-debugging-port=9222. Attached via CDP
only -- this script NEVER launches its own browser (no chromium.launch anywhere;
--headless accepts only "no").

Behavioral sources: the working prototype probe22_rollout_app.py (Testers
mat-checkbox + Edit release + Next-x4 + Proceed-anyway as button/link +
dialog-scoped publish confirm + opt-in scrape -- hardened here, not reinvented;
probe22 consolidates the probe20/21 findings), skill play-console-setup §5
rule 6 (VERSION-CODE IRON RULE: a still-disabled "Save and publish" after
Proceed means STOP, never force) and §5.7 (verified-live 2026-09-17 notes:
splash settle, aria-checked mat-checkbox, review URL, async opt-in link).
Keystore handling (§5.4) is OUT OF SCOPE: this script assumes the uploaded
bundle's signing certificate is already correct and never touches keys.
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

# Windows console is cp1252: Arabic log text crashes print with
# UnicodeEncodeError. Force UTF-8 with replacement (repo idiom).
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

APP_IDS = {
    "pos": "4972676838636058435",
    "erp": "4972280926407480271",
    "hr": "4975808492151675669",
    "ledger": "4974312878333959648",
}

TESTERS_LIST = "dev"
OPTIN_RE = re.compile(r"https://play\.google\.com/apps/internaltest/\S+")
ACTIVE_RE = re.compile(r"\bActive\b")
VERSION_WARN_RE = re.compile(r"significantly higher than your previous version code", re.I)
SPLASH_RE = re.compile(r"Loading Google Play Console", re.I)
LATEST_RE = re.compile(r"Latest release:\s*([^·\n]+)")
VERSIONCODE_RE = re.compile(r"version\s*code\s*[:#]?\s*(\d+)", re.I)
EXPAND_RE = re.compile(r"show more|expand|عرض المزيد|توسيع", re.I)

CDP_TIMEOUT_MS = 25000  # a wedged browser hangs forever on the default timeout
STAGE_TIMEOUT_SECS = 12 * 60  # per-stage overall deadline, then STOP
SETTLE_SPLASH_MS = 30000  # splash-hidden cap after every navigation

# Resumable stages (--from). "preview" folds spec §3 Advance + §4
# Proceed-anyway into one unit: they share the same review page and the
# Proceed branch is conditional on the version-code warning being present.
STAGE_ORDER = ["testers", "edit", "preview", "publish", "verify"]

# SAFETY INVARIANT (no destructive clicks): consequential clicks only ever
# target exact allow-listed names; anything matching this pattern is refused
# outright (Discard / Cancel / Production / other tracks / promote / halt).
_FORBIDDEN_CLICK = re.compile(
    r"discard|cancel|delete|production|open testing|closed testing|promot|halt|stop rollout",
    re.I,
)


class _Stop(Exception):
    """Safe halt: screenshot + record, publish nothing further (exit code 2)."""


# ── inlined helper idiom (signatures mirror group_safety: pace/step/ ─────────
# ── failshot/_soft_shot; NOT imported -- this script stays standalone) ───────


def pace(page, secs: float = 4.0) -> None:
    """Single pacing helper: fixed CDP-side sleep (falls back to time.sleep)."""
    try:
        page.wait_for_timeout(int(secs * 1000))
    except Exception:
        time.sleep(secs)


def step(ctx: dict, msg: str) -> None:
    print(f"[{datetime.now(UTC).strftime('%H:%M:%S')}] [{ctx.get('KEY')}] {msg}", flush=True)


def failshot(page, ctx: dict, name: str, err: Exception) -> None:
    """Screenshot-on-fail into .auth/play-console, then raise."""
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        stamp = int(time.time() * 1000)
        safe = re.sub(r"[\\/:*?\"<>|]", "-", str(name))[:80]
        shot = AUTH_DIR / f"fail-{ctx.get('KEY')}-{safe}-{stamp}.png"
        page.screenshot(path=str(shot), timeout=15000)
        step(ctx, f"FAIL[{name}]: {err} url={page.url} shot={shot}")
    except Exception:
        step(ctx, f"FAIL[{name}]: {err}")
    raise err if isinstance(err, Exception) else RuntimeError(str(err))


def _soft_shot(page, ctx: dict, name: str) -> None:
    """Best-effort screenshot for WARNING paths -- never raises."""
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        stamp = int(time.time() * 1000)
        safe = re.sub(r"[\\/:*?\"<>|]", "-", str(name))[:80]
        page.screenshot(path=str(AUTH_DIR / f"soft-{ctx.get('KEY')}-{safe}-{stamp}.png"), timeout=15000)
    except Exception:
        pass


# ── rollout-specific helpers ─────────────────────────────────────────────────


def _exact(name: str) -> "re.Pattern[str]":
    return re.compile(f"^{re.escape(name)}$", re.I)


def _live(el) -> bool:
    """Visible AND enabled probe (immediate query, never a wait)."""
    try:
        return bool(el.is_visible() and el.is_enabled())
    except Exception:
        return False


def _guard(name: str) -> None:
    # SAFETY INVARIANT (no destructive clicks): refuse before matching.
    if _FORBIDDEN_CLICK.search(name):
        raise _Stop(f"refusing forbidden click {name!r} -- never Discard/Cancel/Production")


def _check_deadline(deadline: float, what: str) -> None:
    if time.time() > deadline:
        raise _Stop(f"{what}: 12-min stage deadline exceeded -- STOPPING")


def settle(page, ctx: dict, tag: str = "") -> None:
    """Splash-hidden settle (30s cap) + short pace after every navigation."""
    try:
        page.get_by_text(SPLASH_RE).first.wait_for(state="hidden", timeout=SETTLE_SPLASH_MS)
    except Exception:
        pass
    pace(page, 3.0)
    if tag:
        step(ctx, f"settled {tag}")


def assert_internal_url(page, ctx: dict, aid: str, where: str) -> None:
    """SAFETY INVARIANT (INTERNAL track only): same developer + same app, and
    either the internal-testing tracks page or a releases editor under the
    PINNED numeric track id. The tid pins on the first editor visit, which
    always arrives via same-tab navigation from the asserted tracks page;
    a resume pins with a loud warning (then verify the track manually)."""
    url = page.url or ""
    if f"/developers/{DEV_ID}/" not in url or f"/app/{aid}/" not in url:
        failshot(page, ctx, where, RuntimeError(f"outside developer/app scope: {url}"))
    if "/tracks/internal-testing" in url:
        return
    m = re.search(r"/tracks/(\d+)/releases/", url)
    tid_now = m.group(1) if m else ""
    if not tid_now:
        failshot(page, ctx, where, RuntimeError(f"outside internal track: {url}"))
        raise _Stop(f"outside internal track: {url}")  # unreachable; narrows tid_now
    try:
        pinned = ctx.get("track_tid")
    except Exception:
        pinned = None
    if not pinned:
        try:
            ctx["track_tid"] = tid_now
        except Exception:
            pass
        step(ctx, f"pinned track tid {tid_now} at {where} (confirm track manually on resume)")
        return
    if tid_now != pinned:
        failshot(page, ctx, where, RuntimeError(f"wrong track tid {tid_now} != {pinned}: {url}"))


def click_exact(page, ctx: dict, name: str, timeout: int = 8000) -> None:
    """SAFETY INVARIANT (exactly-1 match): a consequential click needs exactly
    one visible+enabled match -- 0 or 2+ means STOP with screenshot."""
    _guard(name)
    try:
        cands = [b for b in page.get_by_role("button", name=_exact(name)).all() if _live(b)]
    except Exception as exc:
        raise _Stop(f"button scan failed for {name!r}: {exc}") from exc
    if len(cands) != 1:
        raise _Stop(f"expected exactly 1 button {name!r}, found {len(cands)} -- STOPPING")
    cands[0].click(timeout=timeout)
    pace(page, 3.0)
    step(ctx, f"clicked button: {name}")


def click_exact_role(page, ctx: dict, name: str, timeout: int = 8000) -> None:
    """click_exact across roles: button OR link (Console varies the role per
    render -- probe22/skill §5.7). Exactly-1 TOTAL across both roles; 0 or
    2+ (e.g. double-rendered button+link pair) means STOP."""
    _guard(name)
    seen: list = []
    for role in ("button", "link"):
        try:
            cands = [b for b in page.get_by_role(role, name=_exact(name)).all() if _live(b)]
        except Exception:
            continue
        for b in cands:
            seen.append((role, b))
    if len(seen) != 1:
        raise _Stop(f"expected exactly 1 button/link {name!r}, found {len(seen)} -- STOPPING")
    role, target = seen[0]
    target.click(timeout=timeout)
    pace(page, 4.0)
    step(ctx, f"clicked {role}: {name}")


def _confirm_in_dialog(page, ctx: dict, button_name: str, desc: str, timeout: int = 10000) -> None:
    """Confirm INSIDE the dialog scope only (background reuses the labels)."""
    _guard(button_name)
    # SAFETY INVARIANT (stale dialogs): NEVER reuse a stored dialog locator --
    # re-query AFTER each navigation/sleep; the DOM node may be detached.
    dlg = page.get_by_role("dialog")
    dlg.first.wait_for(state="visible", timeout=timeout)
    scope = page.get_by_role("dialog").first
    cands = [b for b in scope.get_by_role("button", name=_exact(button_name)).all() if _live(b)]
    if len(cands) != 1:
        raise _Stop(f"dialog confirm {desc}: expected 1 {button_name!r}, found {len(cands)}")
    cands[0].click(timeout=timeout)
    pace(page, 2.0)
    step(ctx, f"confirmed in dialog: {desc}")


def _button_inventory(page) -> str:
    """Short visible button/link dump for remote diagnosis (best-effort)."""
    try:
        items: list = []
        for role in ("button", "link"):
            for el in page.get_by_role(role).all():
                try:
                    if el.is_visible():
                        txt = (el.inner_text(timeout=1000) or "").strip().replace("\n", " ")
                        if txt:
                            items.append(f"{role}:{txt[:60]}")
                except Exception:
                    continue
        return " | ".join(items[:40]) or "<none>"
    except Exception:
        return "<unreadable>"


def _record_path(key: str) -> Path:
    return AUTH_DIR / f"{key}.rollout.json"


def _save_record(key: str, record: dict) -> None:
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    _record_path(key).write_text(json.dumps(record, indent=1, ensure_ascii=False), encoding="utf-8")


def _stage_shot(page, key: str, stage: str) -> None:
    """Per-stage proof screenshot at the exact spec path (best-effort)."""
    try:
        AUTH_DIR.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(AUTH_DIR / f"rollout-{key}-{stage}.png"), timeout=15000)
    except Exception:
        pass


def _read_body(page, timeout: int = 15000) -> str:
    try:
        return page.locator("body").text_content(timeout=timeout) or ""
    except Exception:
        return ""


# ── stages ───────────────────────────────────────────────────────────────────


def _sweep_content(page) -> None:
    """Scroll every scrollable container to bottom (probed: document.body
    does NOT scroll -- bodySH == viewport; the rows render inside
    DIV.main-content. A body-only sweep is a silent no-op)."""
    try:
        page.evaluate(
            """() => {
                for (const el of document.querySelectorAll('*')) {
                    try {
                        if (el.scrollHeight - el.clientHeight > 150)
                            el.scrollTop = el.scrollHeight;
                    } catch(e) {}
                }
            }"""
        )
        page.wait_for_timeout(1500)
    except Exception:
        pass


def stage_testers(page, ctx: dict, aid: str, deadline: float, record: dict) -> None:
    base = f"https://play.google.com/console/u/0/developers/{DEV_ID}"
    page.goto(f"{base}/app/{aid}/tracks/internal-testing", timeout=60000)
    settle(page, ctx, "tracks")
    assert_internal_url(page, ctx, aid, "testers-track")
    # Read-only track-state observation (skill §5.7 Stage 1 checklist).
    body0 = _read_body(page).replace("\n", " ")
    for marker in ("Select testers", "Create a new release", "Preview and confirm"):
        if marker.lower() in body0.lower():
            step(ctx, f"track checklist shows: {marker}")
    tab = page.get_by_role("tab", name=_exact("testers")).first
    tab.wait_for(state="visible", timeout=15000)
    tab.click(timeout=8000)
    settle(page, ctx, "testers")
    assert_internal_url(page, ctx, aid, "testers-tab")
    # Lists table lazy-loads AFTER the splash settles: wait for its anchor
    # ("Create email list" renders with or without lists), scrolling to
    # trigger render. The dev-row lookup below must not run on a half
    # rendered tab (ledger STOP proved it finds nothing).
    end_lists = time.time() + 90
    saw_lists = False
    while time.time() < end_lists:
        try:
            body_txt = page.locator("body").text_content(timeout=5000) or ""
        except Exception:
            body_txt = ""
        if "Create email list" in body_txt or "List name" in body_txt:
            saw_lists = True
            break
        _sweep_content(page)
        pace(page, 3.0)
    if not saw_lists:
        raise _Stop("testers lists table never rendered -- STOPPING")
    # Rows render AFTER the table header, and only once scrolled into view
    # inside the content container (virtualized list -- body scrolls and
    # static waits never render them). Sweep while waiting; pin the row in
    # view once found so it does not virtualize back out.
    end_row = time.time() + 90
    row_seen = False
    while time.time() < end_row:
        try:
            for el in page.get_by_text(_exact(TESTERS_LIST)).all():
                try:
                    if el.is_visible():
                        try:
                            el.scroll_into_view_if_needed(timeout=3000)
                        except Exception:
                            pass
                        row_seen = True
                        break
                except Exception:
                    continue
        except Exception:
            pass
        if row_seen:
            break
        _sweep_content(page)
        pace(page, 3.0)
    if not row_seen:
        raise _Stop(f"{TESTERS_LIST!r} list row never rendered -- STOPPING")
    # The list checkbox is a mat-checkbox custom element carrying aria-checked;
    # NO input[type=checkbox] exists, so input-walks fail (probe22/skill §5.7).
    anchor = page.get_by_text(_exact(TESTERS_LIST)).first
    try:
        anchor.wait_for(state="visible", timeout=8000)
    except Exception as exc:
        raise _Stop(f"{TESTERS_LIST!r} list row not found -- refusing to guess") from exc
    _check_deadline(deadline, "testers")
    dev_y = (anchor.bounding_box() or {}).get("y", None)
    best = None
    best_dy = 1e9
    for cb in page.locator("mat-checkbox").all():
        try:
            if not cb.is_visible():
                continue
            by = (cb.bounding_box() or {}).get("y", 1e9)
            if dev_y is None or abs(by - dev_y) < best_dy:
                best_dy = abs(by - dev_y) if dev_y is not None else 0
                best = cb
                if dev_y is None:
                    break
        except Exception:
            continue
    if best is None:
        raise _Stop("no visible mat-checkbox near the dev row -- STOPPING")
    checked = best.get_attribute("aria-checked")
    if checked != "true":
        best.evaluate("e => e.click()")
        pace(page, 3.0)
        checked = best.get_attribute("aria-checked")
        step(ctx, f"clicked dev checkbox, aria-checked now={checked}")
    if checked != "true":
        raise _Stop(f"dev checkbox still aria-checked={checked} after DOM click -- STOPPING")
    record["steps"].append(f"dev list checked (aria-checked={checked})")
    step(ctx, f"dev list checked-state: {checked}")
    sv = page.get_by_role("button", name=_exact("save")).first
    try:
        sv.wait_for(state="visible", timeout=8000)
    except Exception as exc:
        raise _Stop(f"testers Save button never visible: {exc}") from exc
    if sv.is_enabled():
        click_exact(page, ctx, "save")
        pace(page, 3.0)
        record["steps"].append("testers saved")
    else:
        step(ctx, "testers Save disabled (nothing to save)")
        record["steps"].append("testers Save disabled (nothing to save)")


def stage_edit(page, ctx: dict, aid: str, deadline: float, record: dict) -> None:
    tab = page.get_by_role("tab", name=_exact("releases")).first
    tab.wait_for(state="visible", timeout=15000)
    tab.click(timeout=8000)
    settle(page, ctx, "releases")
    assert_internal_url(page, ctx, aid, "releases-tab")
    _check_deadline(deadline, "edit")
    click_exact(page, ctx, "Edit release")
    record["steps"].append("clicked Edit release")
    settle(page, ctx, "edit")
    # Editor URL shape: .../app/<aid>/tracks/<tid>/releases/... (same app id).
    url = page.url or ""
    if not re.search(f"/app/{re.escape(aid)}/tracks/[^/]+/releases/", url):
        raise _Stop(f"edit URL unexpected: {url} -- STOPPING")
    assert_internal_url(page, ctx, aid, "edit-release")
    record["steps"].append(f"edit URL ok: {url[:120]}")


def _publish_control_ready(page) -> bool:
    try:
        for b in page.get_by_role("button", name=_exact("save and publish")).all():
            if _live(b):
                return True
    except Exception:
        pass
    return False


def stage_preview(page, ctx: dict, aid: str, deadline: float, record: dict) -> None:
    # Advance: Next (exactly-1) up to 4 with settle; stop at review/preview.
    in_review = False
    for _i in range(4):
        _check_deadline(deadline, "preview-advance")
        settle(page, ctx, f"scan-{_i}")
        assert_internal_url(page, ctx, aid, f"preview-scan-{_i}")
        if "/review" in (page.url or ""):
            step(ctx, "review URL visible, no more Nexts")
            in_review = True
            break
        if _publish_control_ready(page):
            step(ctx, "publish control visible, no more Nexts")
            break
        try:
            click_exact(page, ctx, "Next")
        except _Stop as exc:
            raise _Stop(f"no Next ({_i}): {exc}") from exc
        record["steps"].append(f"clicked Next {_i + 1}")
    settle(page, ctx, "pre-review")
    in_review = in_review or "/review" in (page.url or "")
    if not in_review and not _publish_control_ready(page):
        raise _Stop(f"never reached review ({page.url}) -- STOPPING")
    record["steps"].append(f"review reached: {page.url[:120]}")
    # Best-effort expected-version capture for the verify stage gate.
    rbody = _read_body(page)
    ver = LATEST_RE.search(rbody) or VERSIONCODE_RE.search(rbody)
    if ver:
        record["expected_version"] = ver.group(1).strip()[:80]
        step(ctx, f"expected version captured: {record['expected_version']}")
    # Proceed-anyway (conditional): only when the version-code warning shows.
    if VERSION_WARN_RE.search(rbody.replace("\n", " ")) is None:
        step(ctx, "no version-code warning -- skipping Proceed-anyway")
        return
    step(ctx, "version-code warning present -- Proceed-anyway path")
    # The control hides collapsed: expand "Show more" FIRST (skill §5.7).
    try:
        for expander in page.get_by_text(EXPAND_RE).all():
            try:
                if expander.is_visible():
                    expander.click(timeout=3000)
                    pace(page, 0.8)
            except Exception:
                continue
    except Exception:
        pass
    pace(page, 2.0)
    _check_deadline(deadline, "preview-proceed")
    click_exact_role(page, ctx, "Proceed anyway")
    record["steps"].append("clicked Proceed anyway")
    # "Proceed" confirm dialog (re-queried fresh); absence is noted like probe22.
    try:
        dlg = page.get_by_role("dialog")
        dlg.first.wait_for(state="visible", timeout=10000)
        scope = page.get_by_role("dialog").first
        cands = [b for b in scope.get_by_role("button", name=_exact("proceed")).all() if _live(b)]
        if len(cands) != 1:
            raise _Stop(f"Proceed dialog: expected 1 Proceed, found {len(cands)}")
        cands[0].click(timeout=8000)
        step(ctx, "confirmed Proceed")
        pace(page, 6.0)
        record["steps"].append("confirmed Proceed dialog")
    except _Stop:
        raise
    except Exception:
        step(ctx, "no Proceed dialog appeared")
    # §5 rule 6 gate: enabled "Save and publish" or STOP -- never force.
    pace(page, 2.0)
    if not _publish_control_ready(page):
        raise _Stop("Save and publish still DISABLED after Proceed -- STOPPING (never force)")
    try:
        ignored_visible = False
        for el in page.get_by_text(re.compile(r"ignored for this release", re.I)).all():
            try:
                if el.is_visible():
                    ignored_visible = True
                    break
            except Exception:
                continue
        step(ctx, f"ignored-marker present: {ignored_visible}")
    except Exception:
        pass
    step(ctx, "Save and publish is ENABLED -- preview gate passed")
    record["steps"].append("proceed gate passed (Save and publish enabled)")


def stage_publish(page, ctx: dict, aid: str, deadline: float, record: dict) -> None:
    assert_internal_url(page, ctx, aid, "pre-publish")
    settle(page, ctx, "pre-publish")
    _check_deadline(deadline, "publish")
    try:
        probe = page.get_by_role("button", name=_exact("save and publish")).first
        probe.wait_for(state="visible", timeout=20000)
    except Exception as exc:
        raise _Stop(f"Save and publish never visible: {exc}") from exc
    if not probe.is_enabled():
        raise _Stop("Save and publish DISABLED -- STOPPING (never force, §5 rule 6)")
    click_exact(page, ctx, "Save and publish")
    record["steps"].append("clicked Save and publish")
    # Confirm INSIDE the dialog scope only (fresh re-query, never stale).
    try:
        _confirm_in_dialog(page, ctx, "Save and publish", "publish")
        record["steps"].append("confirmed publish dialog")
    except _Stop:
        raise
    except Exception:
        step(ctx, "no publish dialog appeared -- verifying URL instead")
    # Verify return to ?tab=releases (poll, bounded by the stage deadline).
    end = min(time.time() + 120, deadline)
    while time.time() < end:
        if "tab=releases" in (page.url or ""):
            break
        pace(page, 5.0)
    else:
        if "tab=releases" not in (page.url or ""):
            raise _Stop(f"no return to ?tab=releases after publish: {page.url}")
    if "tab=releases" not in (page.url or ""):
        raise _Stop(f"no return to ?tab=releases after publish: {page.url}")
    assert_internal_url(page, ctx, aid, "post-publish")
    record["steps"].append(f"publish returned to ?tab=releases: {(page.url or '')[:120]}")


def stage_verify(page, ctx: dict, aid: str, deadline: float, record: dict) -> None:
    base = f"https://play.google.com/console/u/0/developers/{DEV_ID}"
    page.goto(f"{base}/app/{aid}/tracks/internal-testing", timeout=60000)
    settle(page, ctx, "verify")
    assert_internal_url(page, ctx, aid, "verify-track")
    _check_deadline(deadline, "verify")
    summary = _read_body(page).replace("\n", " ")
    if ACTIVE_RE.search(summary) is None:
        raise _Stop(f"track summary lacks Active status -- STOPPING [{summary[:300]}]")
    record["steps"].append("track summary contains Active")
    expected = record.get("expected_version")
    if expected:
        digits = re.search(r"\d+", str(expected))
        if str(expected) not in summary and not (digits and digits.group(0) in summary):
            raise _Stop(f"expected version {expected!r} missing from Active summary -- STOPPING")
        record["steps"].append(f"Active summary shows expected version {expected}")
    else:
        ver = LATEST_RE.search(summary) or VERSIONCODE_RE.search(summary)
        if ver:
            record["expected_version"] = ver.group(1).strip()[:80]
            record["steps"].append(f"Active summary version: {record['expected_version']}")
    tab = page.get_by_role("tab", name=_exact("testers")).first
    tab.wait_for(state="visible", timeout=15000)
    tab.click(timeout=8000)
    pace(page, 6.0)
    body2 = _read_body(page)
    found = OPTIN_RE.search(body2)
    if found:
        record["optin_link"] = found.group(0).rstrip(").,;:'\"")
        record["optin_status"] = "ACTIVE_WITH_LINK"
        step(ctx, f"OPTIN LINK: {record['optin_link']}")
    else:
        # Not a failure: Google generates the link async (minutes-hours).
        record["optin_status"] = "OPTIN_PENDING"
        step(ctx, "opt-in link not generated yet (Google async) -- OPTIN_PENDING")


# ── run plumbing ─────────────────────────────────────────────────────────────


def _acquire_lock(key: str) -> Path:
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    lock_file = AUTH_DIR / f"{key}.rollout.lock"
    try:
        other_pid = int(lock_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        other_pid = None
    if other_pid is not None:
        try:
            os.kill(other_pid, 0)
        except Exception:
            other_pid = None  # stale lock (dead pid)
        else:
            print(f"[{key}] another rollout is active (pid={other_pid}) -- refusing second driver")
            raise SystemExit(2)
    lock_file.write_text(str(os.getpid()), encoding="utf-8")
    return lock_file


def _release_lock(lock_file: Path) -> None:
    try:
        if lock_file.read_text(encoding="utf-8").strip() == str(os.getpid()):
            lock_file.unlink()
    except OSError:
        pass


def _run_stage(page, ctx: dict, key: str, aid: str, stage: str, record: dict) -> None:
    funcs = {
        "testers": stage_testers,
        "edit": stage_edit,
        "preview": stage_preview,
        "publish": stage_publish,
        "verify": stage_verify,
    }
    step(ctx, f"STAGE START: {stage}")
    deadline = time.time() + STAGE_TIMEOUT_SECS
    try:
        funcs[stage](page, ctx, aid, deadline, record)
    except _Stop as exc:
        _stage_shot(page, key, stage)
        _soft_shot(page, ctx, f"stop-{stage}")
        record["errors"].append(f"{stage}: {exc}")
        record["errors"].append(f"{stage} controls: {_button_inventory(page)[:500]}")
        record["status"] = f"STOPPED at {stage} (nothing published past this point)"
        _save_record(key, record)
        step(ctx, f"STAGE STOPPED: {stage} -- {exc}")
        raise
    _stage_shot(page, key, stage)
    if stage not in record["stages"]:
        record["stages"].append(stage)
    _save_record(key, record)
    step(ctx, f"STAGE DONE: {stage}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Roll out an internal-testing draft to Active")
    parser.add_argument("--app", required=True, choices=sorted(APP_IDS))
    parser.add_argument(
        "--from",
        dest="from_stage",
        default="testers",
        choices=STAGE_ORDER,
        help="resume from this stage (preflight always runs first)",
    )
    parser.add_argument(
        "--headless",
        default="no",
        choices=["no"],
        help="parity flag: attached-CentBrowser only, launching a browser is refused",
    )
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright

    key = args.app
    aid = APP_IDS[key]
    ctx = {"KEY": key}

    record: dict = {
        "key": key,
        "app_id": aid,
        "stages": [],
        "steps": [],
        "errors": [],
        "expected_version": None,
        "optin_link": None,
        "optin_status": None,
        "status": "started",
    }

    lock_file = _acquire_lock(key)
    try:
        _save_record(key, record)
        step(ctx, "STAGE START: preflight")
        page = None
        try:
            with sync_playwright() as playwright:
                try:
                    browser = playwright.chromium.connect_over_cdp(CDP, timeout=CDP_TIMEOUT_MS)
                except Exception as exc:
                    print(f"[{key}] CDP unreachable at {CDP}: {exc}")
                    print(f"[{key}] open CentBrowser with --remote-debugging-port=9222 first")
                    return 1
                # Reuse the existing Console tab (probe22 behavior); never open
                # tabs on our own -- if none exists, STOP instead of guessing.
                page = None
                for context in browser.contexts:
                    for candidate in context.pages:
                        if "play.google.com/console" in (candidate.url or ""):
                            page = candidate
                            break
                    if page is not None:
                        break
                if page is None:
                    print(f"[{key}] NO_CONSOLE_PAGE -- open Play Console in CentBrowser first")
                    return 1
                try:
                    page.bring_to_front()
                except Exception:
                    pass
                _stage_shot(page, key, "preflight")
                record["stages"].append("preflight")
                record["status"] = "preflight ok"
                _save_record(key, record)
                step(ctx, "STAGE DONE: preflight")
                stages = STAGE_ORDER[STAGE_ORDER.index(args.from_stage):]
                step(ctx, f"running stages: {stages}")
                for stage in stages:
                    try:
                        _run_stage(page, ctx, key, aid, stage, record)
                    except _Stop:
                        print(json.dumps(record, indent=1, ensure_ascii=False)[:2500])
                        return 2
                record["status"] = "done"
                _save_record(key, record)
        except Exception as exc:
            # Unexpected (non-ambiguity) failure: screenshot + record, exit 1.
            if page is not None:
                _stage_shot(page, key, "error")
            record["errors"].append(f"unexpected: {exc}")
            record["status"] = "ERROR (nothing published past the recorded stages)"
            _save_record(key, record)
            print(json.dumps(record, indent=1, ensure_ascii=False)[:2500])
            return 1
    finally:
        _release_lock(lock_file)
    print(json.dumps(record, indent=1, ensure_ascii=False)[:2500])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
