from __future__ import annotations

import logging
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Page

from .models import Credentials, Department, PatientData, DEPARTMENTS
from .fields import ALL_FIELDS

log = logging.getLogger(__name__)

GET_BEDS_JS = """() => {
    const cards = document.querySelectorAll('[data-bed-number]');
    return Array.from(cards, card => ({
        bed:  card.getAttribute('data-bed-number'),
        name: card.getAttribute('data-current-patient') || '',
        status: card.getAttribute('data-status') || '',
    }));
}"""

SELECT_PATIENT_JS = """(bedNum) => {
    const cards = document.querySelectorAll('[data-bed-number]');
    for (const card of cards) {
        const attr = card.getAttribute('data-bed-number').replace('Bed ', '').trim();
        if (attr === bedNum) {
            card.click();
            return true;
        }
    }
    return false;
}"""

CLICK_VIEW_PATIENT_JS = """() => {
    const links = document.querySelectorAll('a, button');
    for (const link of links) {
        if (link.textContent.includes('View Patient')) {
            link.click();
            return true;
        }
    }
    return false;
}"""


async def login(page: Page, creds: Credentials, retries: int = 2) -> None:
    for attempt in range(retries):
        try:
            await page.goto(creds.url + "/login", wait_until="domcontentloaded", timeout=30_000)
            await page.fill("#hospital", creds.hospital)
            await page.fill("#uname", creds.username)
            await page.fill("#pass", creds.password)
            await page.click("#Button1")
            await page.wait_for_load_state("networkidle", timeout=15_000)
            log.info("Login successful")
            return
        except Exception as exc:
            if attempt < retries - 1:
                log.warning("Login attempt %d failed, retrying...", attempt + 1)
                await page.wait_for_timeout(1000)
            else:
                log.warning("Login failed after %d attempts: %s", retries, exc)
                raise


async def _ensure_login(page: Page, creds: Credentials) -> None:
    try:
        if "login" in page.url.lower():
            await login(page, creds)
            return
        if await page.query_selector("#Button1"):
            await login(page, creds)
    except Exception as exc:
        log.warning("Re-login check failed: %s", exc)


def _log_evidence(field, bed_num: str, value: bool) -> None:
    """Log date-check evidence for daily/vitals/fluid per bed."""
    if field.name not in ("daily", "vitals", "fluid"):
        return
    ev = getattr(field, "last_evidence", None) or {}
    reason = ev.get("reason", "?")
    rows = ev.get("rows", "?")
    if value:
        log.info("      [%s] %s=True rows=%s matched='%s'",
                 bed_num, field.name, rows, ev.get("matched", ""))
    else:
        samples = " | ".join(ev.get("samples", [])[:3])
        log.info("      [%s] %s=False rows=%s reason=%s samples=[%s]",
                 bed_num, field.name, rows, reason, samples)


async def _goto(page: Page, url: str) -> bool:
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_load_state("networkidle", timeout=10_000)
        return True
    except Exception:
        try:
            await page.goto(url, wait_until="load", timeout=30_000)
            return True
        except Exception:
            return False


async def fetch_patient_data(page: Page, creds: Credentials, dept: Department, target_date: str = "") -> list[PatientData]:
    if not await _goto(page, creds.url + dept.beds_path):
        log.warning("  Cannot reach %s, skipping", dept.name)
        return []

    await _ensure_login(page, creds)

    beds = await page.evaluate(GET_BEDS_JS)
    occupied = [b for b in beds if b["status"] == "Occupied"]
    log.info("  %-8s %d beds (%d occupied)", dept.name, len(beds), len(occupied))

    results: list[PatientData] = []
    dept_url = creds.url + dept.beds_path

    for bed_info in beds:
        bed_num = bed_info["bed"].replace("Bed ", "").strip()
        bed_name = bed_info["name"]
        bed_status = bed_info["status"]

        if bed_status != "Occupied":
            results.append(PatientData(bed=bed_num, name="", status=bed_status))
            continue

        patient = PatientData(bed=bed_num, name=bed_name, status=bed_status)

        try:
            clicked = await page.evaluate(SELECT_PATIENT_JS, bed_num)
            if not clicked:
                log.warning("    Bed %s not found on page", bed_num)
                results.append(patient)
                continue

            try:
                await page.wait_for_selector(".modal.in, .modal.show", timeout=5_000)
            except Exception:
                await page.wait_for_timeout(500)

            clicked_view = await page.evaluate(CLICK_VIEW_PATIENT_JS)
            if not clicked_view:
                await page.wait_for_timeout(800)
                clicked_view = await page.evaluate(CLICK_VIEW_PATIENT_JS)
            if not clicked_view:
                log.warning("    View Patient link not found for bed %s", bed_num)
                results.append(patient)
                continue

            try:
                await page.wait_for_url("**/currentvisit**", timeout=12_000)
            except Exception:
                await page.wait_for_timeout(800)

            try:
                await page.wait_for_load_state("networkidle", timeout=8_000)
            except Exception:
                pass

            try:
                await page.wait_for_function("""() => {
                    if (typeof jQuery !== 'undefined' && jQuery.active > 0) return false;
                    return document.querySelectorAll(
                        '[id*="ucGrid_gvdt2_wrapper"], [id*="ucGrid_noresult"]'
                    ).length > 0;
                }""", polling=500, timeout=12_000)
            except Exception:
                await page.wait_for_timeout(800)

            current_url = page.url
            segments = [s for s in urlparse(current_url).path.split("/") if s]
            if not segments:
                log.warning("    Cannot determine department from URL for bed %s: %s", bed_num, current_url)
                results.append(patient)
                continue
            dept_slug = segments[0]
            base = f"{creds.url}/{dept_slug}"

            for field in ALL_FIELDS:
                if hasattr(field, "assessment_page"):
                    continue
                try:
                    value = await field.extract_from_currentvisit(page, target_date)
                    setattr(patient, field.name, value)
                    _log_evidence(field, bed_num, value)
                except Exception as exc:
                    log.warning("    Field %s failed for bed %s: %s", field.name, bed_num, exc)
                    continue

            for field in ALL_FIELDS:
                if not hasattr(field, "assessment_page"):
                    continue
                try:
                    value = await field.extract_from_assessment(page, base, target_date)
                    setattr(patient, field.name, value)
                    _log_evidence(field, bed_num, value)
                except Exception as exc:
                    log.warning("    Field %s failed for bed %s: %s", field.name, bed_num, exc)
                    continue

            if not await _goto(page, dept_url):
                log.warning("    Cannot return to beds for %s", bed_num)
            await _ensure_login(page, creds)

            active = sum(patient.to_values())
            log.info("    %s: %d/%d fields", bed_num, active, len(ALL_FIELDS))

        except Exception as exc:
            log.warning("    Error for %s: %s", bed_num, exc)

        results.append(patient)

    return results


async def scrape_all(creds: Credentials, config: dict | None = None, target_date: str = "") -> list[PatientData]:
    config = config or {}
    dept_config = config.get("departments", {})
    active_depts = [
        dept for dept in DEPARTMENTS if dept_config.get(dept.name, True)
    ]
    if not active_depts:
        log.warning("  No departments enabled in config.json, nothing to do")
        return []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
                  "--disable-extensions", "--no-first-run", "--no-default-browser-check",
                  "--disable-default-apps", "--mute-audio", "--disable-sync", "--disable-translate",
                  "--disable-background-timer-throttling",
                  "--disable-backgrounding-occluded-windows",
                  "--disable-renderer-backgrounding"],
        )
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})

        await context.route("**/*", lambda route: (
            route.abort() if route.request.resource_type in ["image", "font", "media"]
            else route.continue_()
        ))

        page = await context.new_page()
        await login(page, creds)

        all_patients: list[PatientData] = []
        for dept in active_depts:
            patients = await fetch_patient_data(page, creds, dept, target_date)
            all_patients.extend(patients)

        await browser.close()

    log.info("Total: %d beds\n", len(all_patients))
    return all_patients
