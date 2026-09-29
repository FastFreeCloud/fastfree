from __future__ import annotations

from .diagnosis import DiagnosisField
from .complaints import ComplaintsField
from .procedures import ProceduresField
from .medicine import MedicineField
from .oxygen import OxygenField
from .feeding import FeedingField
from .apache import ApacheField
from .vitals import VitalsField
from .initial import InitialField
from .daily import DailyField
from .fluid import FluidField
from .turning import TurningField
from .invasive import InvasiveField

ALL_FIELDS = [
    DiagnosisField(),
    ComplaintsField(),
    ProceduresField(),
    MedicineField(),
    OxygenField(),
    FeedingField(),
    ApacheField(),
    VitalsField(),
    InitialField(),
    DailyField(),
    FluidField(),
    TurningField(),
    InvasiveField(),
]

__all__ = ["ALL_FIELDS"]
