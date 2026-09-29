from __future__ import annotations

from playwright.async_api import Page

from .base import BaseField


class DiagnosisField(BaseField):
    name = "diagnosis"
    column = "DIAGNOSIS"
    arabic = "التشخيص"

    async def extract_from_currentvisit(self, page: Page, target_date: str = "") -> bool:
        return await self._grid_has_data(
            page,
            "ContentPlaceHolder1_ucDiagnose_ucGrid_gvdt2",
            "ContentPlaceHolder1_ucDiagnose_ucGrid_noresult",
        )

    async def extract_from_assessment(self, page: Page, base: str, target_date: str = "") -> bool:
        return False
