from __future__ import annotations

from playwright.async_api import Page

from .base import BaseField


class VitalsField(BaseField):
    name = "vitals"
    column = "VITALS"
    arabic = "العلامات الحيوية"

    async def extract_from_currentvisit(self, page: Page, target_date: str = "") -> bool:
        current_url = page.url
        base = current_url.split("/currentvisit")[0]
        # Navigation to {base}/vitals happens once inside _has_today_data;
        # do NOT goto vitals here (was navigating twice per bed).
        result = await self._has_today_data(page, base, "vitals", target_date)
        try:
            await page.goto(current_url, wait_until="domcontentloaded", timeout=10_000)
        except Exception:
            pass
        return result

    async def extract_from_assessment(self, page: Page, base: str, target_date: str = "") -> bool:
        return False
