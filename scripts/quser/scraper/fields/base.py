from __future__ import annotations

import re
from abc import ABC, abstractmethod
from datetime import datetime

from playwright.async_api import Page


def parse_target_date(s: str = "") -> datetime | None:
    """Parse a user/supplied date in any common format.

    Accepts: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, DD/MM/YYYY,
    DD-MM-YYYY, DD.MM.YYYY (and 2-digit years). For ambiguous
    numeric dates (both parts <= 12) assumes DMY (Egyptian
    convention); unambiguous parts (> 12) decide automatically.

    Returns a datetime or None if unparseable.
    """
    s = (s or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass
    m = re.match(r"^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$", s)
    if not m:
        return None
    a, b = int(m.group(1)), int(m.group(2))
    y = m.group(3)
    year = int(y) if len(y) == 4 else (2000 + int(y) if int(y) < 70 else 1900 + int(y))
    if a > 12 and b <= 12:
        d, mo = a, b
    elif b > 12 and a <= 12:
        mo, d = a, b
    else:
        d, mo = a, b  # ambiguous -> DMY (Egypt)
    try:
        return datetime(year, mo, d)
    except ValueError:
        return None


def _target_date_candidates(target_date: str = "") -> list[str]:
    """All plausible grid renderings of a YYYY-MM-DD target date.

    Covers DMY + MDY + YMD orders, '/', '-', '.' separators, month/day
    with and without leading zeros, and 4/2-digit years. JS matches by
    substring, so trailing times (HH:mm, AM/PM) need no enumeration.

    Returns [] on empty/malformed input -> caller falls back to the
    legacy any-data-row behavior instead of failing closed.
    """
    dt = parse_target_date(target_date)
    if dt is None:
        return []
    y = f"{dt.year:04d}"
    yy = y[2:]
    m2, d2 = f"{dt.month:02d}", f"{dt.day:02d}"
    m1, d1 = str(dt.month), str(dt.day)
    cands: list[str] = []
    for sep in ("/", "-", "."):
        # DMY (Egyptian HIS grids), MDY (US-style), YMD (ISO)
        cands += [
            f"{d2}{sep}{m2}{sep}{y}", f"{d1}{sep}{m1}{sep}{y}",
            f"{d2}{sep}{m2}{sep}{yy}", f"{d1}{sep}{m1}{sep}{yy}",
            f"{m2}{sep}{d2}{sep}{y}", f"{m1}{sep}{d1}{sep}{y}",
            f"{y}{sep}{m2}{sep}{d2}", f"{y}{sep}{m1}{sep}{d1}",
        ]
    cands.append(f"{y}-{m2}-{d2}")  # canonical ISO, dup-safe
    seen: dict[str, None] = {}
    for c in cands:
        seen[c] = None
    return sorted(seen.keys(), key=len, reverse=True)


class BaseField(ABC):
    name: str = ""
    column: str = ""
    arabic: str = ""

    @abstractmethod
    async def extract_from_currentvisit(self, page: Page, target_date: str = "") -> bool:
        ...

    @abstractmethod
    async def extract_from_assessment(self, page: Page, base: str, target_date: str = "") -> bool:
        ...

    async def _grid_has_data(self, page: Page, grid_id: str, noresult_id: str) -> bool:
        try:
            await page.wait_for_function("""([gid, nid]) => {
                return !!document.getElementById(gid)
                    || !!document.getElementById(nid);
            }""", [grid_id, noresult_id], polling=500, timeout=2_500)
        except Exception:
            pass
        return await page.evaluate("""([gridId, noresultId]) => {
            if (!document || !document.body) return false;
            const EMPTY_RE = /no data (found|available)|no matching records|your data will appear here/i;
            const isPlaceholderRow = (tr) => {
                if (tr.querySelector('td.dataTables_empty')) return true;
                const tds = tr.querySelectorAll('td');
                const txt = (tr.textContent || '').trim();
                if (txt !== '' && EMPTY_RE.test(txt)) return true;
                if (tds.length === 1 && tds[0].hasAttribute('colspan')) {
                    const c = (tds[0].textContent || '').trim();
                    if (c === '' || c.length < 60 || EMPTY_RE.test(c)) return true;
                }
                return false;
            };
            const countDataRows = (table) => {
                if (!table) return 0;
                let n = 0;
                for (const r of table.querySelectorAll('tbody tr')) {
                    if (!isPlaceholderRow(r)) n++;
                }
                return n;
            };
            const isVisible = (el) => {
                if (!el) return false;
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden'
                    && el.getAttribute('aria-hidden') !== 'true';
            };
            const table = gridId ? document.getElementById(gridId) : null;
            const nr = noresultId ? document.getElementById(noresultId) : null;
            if (isVisible(nr)) return false;
            if (table && countDataRows(table) > 0) return true;
            if (table) {
                try {
                    if (typeof jQuery !== 'undefined' && jQuery.fn && jQuery.fn.DataTable
                        && jQuery(table).hasClass('dataTable')) {
                        const dt = jQuery(table).DataTable();
                        if (dt.rows({ search: 'applied' }).count() > 0) return true;
                    }
                } catch (e) { /* fall through */ }
            }
            return false;
        }""", [grid_id, noresult_id])

    async def _check_datatable(self, page: Page, base: str, page_name: str, prefix: str) -> bool:
        url = f"{base}/{page_name}"
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=10_000)
        except Exception:
            return False
        try:
            await page.wait_for_load_state("networkidle", timeout=3_000)
        except Exception:
            pass

        grid_id = f"ContentPlaceHolder1_{prefix}_ucGrid_gvdt2"
        noresult_id = f"ContentPlaceHolder1_{prefix}_ucGrid_noresult"

        try:
            await page.wait_for_function(f"""(ids) => {{
                const [gridId, noresultId] = ids;
                const isVisible = (el) => {{
                    if (!el) return false;
                    const s = window.getComputedStyle(el);
                    return s.display !== 'none' && s.visibility !== 'hidden'
                        && el.getAttribute('aria-hidden') !== 'true';
                }};
                if (isVisible(document.getElementById(noresultId))) return true;
                const table = document.getElementById(gridId);
                if (!table) return false;
                if (table.querySelector('td.dataTables_empty')) return true;
                if (typeof jQuery !== 'undefined' && jQuery.fn.DataTable) {{
                    try {{
                        const dt = jQuery('#' + gridId).DataTable();
                        if (dt.data().any() || dt.rows().count() > 0) return true;
                        if (jQuery(table).hasClass('dataTable')) return true;
                    }} catch(e) {{
                        return table.querySelectorAll('tbody tr').length > 0;
                    }}
                }}
                return table.querySelectorAll('tbody tr').length > 0;
            }}""", [grid_id, noresult_id], polling=500, timeout=5000)
        except Exception:
            pass

        return await page.evaluate("""(ids) => {
            const [gridId, noresultId] = ids;
            if (!document || !document.body) return false;
            const EMPTY_RE = /no data (found|available)|no matching records|your data will appear here/i;
            const isVisible = (el) => {
                if (!el) return false;
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden'
                    && el.getAttribute('aria-hidden') !== 'true';
            };
            if (isVisible(document.getElementById(noresultId))) return false;
            const table = document.getElementById(gridId);
            if (!table) return false;
            for (const r of table.querySelectorAll('tbody tr')) {
                if (r.querySelector('td.dataTables_empty')) continue;
                const txt = (r.textContent || '').trim();
                if (txt !== '' && EMPTY_RE.test(txt)) continue;
                if (txt.length > 0) return true;
            }
            try {
                if (typeof jQuery !== 'undefined' && jQuery.fn && jQuery.fn.DataTable
                    && jQuery(table).hasClass('dataTable')) {
                    const dt = jQuery(table).DataTable();
                    if (dt.rows({ search: 'applied' }).count() > 0) return true;
                }
            } catch (e) { /* fall through */ }
            return false;
        }""", [grid_id, noresult_id])

    async def _has_today_data(self, page: Page, base: str, page_name: str, target_date: str = "") -> bool:
        url = f"{base}/{page_name}"
        self.last_evidence: dict = {"page": page_name, "target": target_date,
                                    "found": False, "reason": "nav-failed",
                                    "matched": "", "rows": 0, "samples": []}
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=10_000)
        except Exception:
            return False
        try:
            await page.wait_for_load_state("networkidle", timeout=3_000)
        except Exception:
            pass

        grid_id = "ContentPlaceHolder1_ucGrid_gvdt2"
        noresult_id = "ContentPlaceHolder1_ucGrid_noresult"
        candidates = _target_date_candidates(target_date)

        try:
            res = await page.evaluate("""([gridId, noresultId, cands]) => {
            const EMPTY_RE = /no data (found|available)|no matching records|your data will appear here/i;
            const out = {found: false, reason: "no-match", matched: "", rows: 0, samples: []};
            const snip = (s) => (s || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
            // Arabic-Indic ٠-٩ (U+0660-69) + Extended/Persian ۰-۹ (U+06F0-F9) -> ASCII 0-9
            const norm = (s) => (s || '')
                .replace(/[\\u0660-\\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
                .replace(/[\\u06F0-\\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06F0));
            const isPlaceholderRow = (tr) => {
                if (tr.querySelector('td.dataTables_empty')) return true;
                const txt = (tr.textContent || '').trim();
                if (txt !== '' && EMPTY_RE.test(txt)) return true;
                const tds = tr.querySelectorAll('td');
                if (tds.length === 1 && tds[0].hasAttribute('colspan')) {
                    const c = (tds[0].textContent || '').trim();
                    if (c === '' || c.length < 60 || EMPTY_RE.test(c)) return true;
                }
                return false;
            };
            const isVisible = (el) => {
                if (!el) return false;
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden'
                    && el.getAttribute('aria-hidden') !== 'true';
            };
            // Empty-grid marker visible -> definitely no data for any date.
            if (isVisible(document.getElementById(noresultId))) {
                out.reason = 'empty-grid';
                return out;
            }
            const rowMatches = (tr) => {
                if (isPlaceholderRow(tr)) return false;
                if (!cands || cands.length === 0) {
                    // No usable target date -> legacy behavior: any substantive row.
                    return (tr.textContent || '').trim().length > 5;
                }
                // Cell-anchored match: a cell STARTING with a full candidate
                // date is a date field even if values are glued to it without
                // spaces (e.g. cell "9/28/2026400200..."). The position-0
                // anchor keeps this safe: "5/1/2026" can never match inside
                // "15/1/2026" because the cell would start with "15".
                try {
                    const cells = tr.querySelectorAll('td, th');
                    for (const cell of cells) {
                        const ct = norm(cell.textContent || '').trim();
                        if (!ct) continue;
                        for (const c of cands) {
                            if (c && ct.startsWith(c)) return true;
                        }
                    }
                } catch (e) { /* fall through to row-level check */ }
                const t = norm(tr.textContent || '');
                if (t.trim().length <= 5) return false;
                // Boundary-aware match: a candidate must not be glued to
                // extra digits on either side (e.g. "5/1/2026" must NOT
                // match inside "15/1/2026", "28/09/26" must NOT match
                // inside "28/09/2026").
                const isDigit = (ch) => ch >= '0' && ch <= '9';
                for (const c of cands) {
                    if (!c) continue;
                    let idx = t.indexOf(c);
                    while (idx !== -1) {
                        const before = idx === 0 ? '' : t[idx - 1];
                        const after = (idx + c.length >= t.length) ? '' : t[idx + c.length];
                        if (!isDigit(before) && !isDigit(after)) return true;
                        idx = t.indexOf(c, idx + 1);
                    }
                }
                return false;
            };
            const scanTable = (table, out) => {
                if (!table) return false;
                for (const r of table.querySelectorAll('tbody tr')) {
                    if (isPlaceholderRow(r)) continue;
                    out.rows += 1;
                    if (out.samples.length < 3) out.samples.push(snip(r.textContent));
                    if (rowMatches(r)) {
                        out.found = true;
                        out.reason = 'date-matched';
                        out.matched = snip(r.textContent);
                        return true;
                    }
                }
                return false;
            };
            if (scanTable(document.getElementById(gridId), out)) return out;
            // Fallback: only scan tables that look like data grids
            // (never page-chrome/layout tables, which may display
            // today's date in a header and cause false True).
            const looksLikeGrid = (t) => {
                if (!t || t.tagName !== 'TABLE') return false;
                const id = (t.id || '').toLowerCase();
                if (id.includes('gvdt2') || id.includes('grid')) return true;
                try {
                    if (t.classList && t.classList.contains('dataTable')) return true;
                } catch (e) { /* ignore */ }
                return false;
            };
            const tables = document.querySelectorAll('table');
            for (const t of tables) {
                if (t.id === gridId) continue;
                if (!looksLikeGrid(t)) continue;
                if (scanTable(t, out)) return out;
            }
            if (out.rows === 0) out.reason = 'no-rows';
            else if (!cands || cands.length === 0) out.reason = 'no-target-date';
            return out;
        }""", [grid_id, noresult_id, candidates])
        except Exception:
            self.last_evidence["reason"] = "evaluate-failed"
            return False
        if isinstance(res, dict):
            self.last_evidence.update({
                "found": bool(res.get("found")),
                "reason": str(res.get("reason", "no-match")),
                "matched": str(res.get("matched", "")),
                "rows": int(res.get("rows", 0) or 0),
                "samples": [str(s) for s in (res.get("samples") or [])[:3]],
            })
            return bool(res.get("found"))
        self.last_evidence["reason"] = "bad-result"
        return False
