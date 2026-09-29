from __future__ import annotations

from playwright.async_api import Page

from .base import BaseField


class InvasiveField(BaseField):
    name = "invasive"
    column = "INVASIVE VENTILATION"
    arabic = "التنفس الصناعي"
    assessment_page = "invasiveline"
    prefix = "ucInvasiveLineE"

    async def extract_from_currentvisit(self, page: Page, target_date: str = "") -> bool:
        return False

    async def extract_from_assessment(self, page: Page, base: str, target_date: str = "") -> bool:
        return await self._check_datatable(page, base, self.assessment_page, self.prefix)
