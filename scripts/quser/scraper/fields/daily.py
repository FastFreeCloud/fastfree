from __future__ import annotations

from playwright.async_api import Page

from .base import BaseField


class DailyField(BaseField):
    name = "daily"
    column = "DAILY"
    arabic = "المتابعة اليومية"
    assessment_page = "dailyassessment"
    prefix = "ucDailyAssessment"

    async def extract_from_currentvisit(self, page: Page) -> bool:
        return False

    async def extract_from_assessment(self, page: Page, base: str, target_date: str = "") -> bool:
        return await self._has_today_data(page, base, self.assessment_page, target_date)
