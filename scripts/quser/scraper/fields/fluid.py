from __future__ import annotations

from playwright.async_api import Page

from .base import BaseField


class FluidField(BaseField):
    name = "fluid"
    column = "FLUID BALANCE"
    arabic = "التوازن السوائي"
    assessment_page = "fluidbalance"
    prefix = "ucFluidBalance"

    async def extract_from_currentvisit(self, page: Page) -> bool:
        return False

    async def extract_from_assessment(self, page: Page, base: str, target_date: str = "") -> bool:
        return await self._has_today_data(page, base, self.assessment_page, target_date)
