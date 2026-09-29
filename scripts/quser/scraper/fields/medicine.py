from __future__ import annotations

from playwright.async_api import Page

from .base import BaseField


class MedicineField(BaseField):
    name = "medicine"
    column = "MEDICINE"
    arabic = "الأدوية"

    async def extract_from_currentvisit(self, page: Page, target_date: str = "") -> bool:
        return await self._grid_has_data(
            page,
            "ContentPlaceHolder1_ucDrugadmin_ucGrid_gvdt2",
            "ContentPlaceHolder1_ucDrugadmin_ucGrid_noresult",
        )

    async def extract_from_assessment(self, page: Page, base: str, target_date: str = "") -> bool:
        return False
