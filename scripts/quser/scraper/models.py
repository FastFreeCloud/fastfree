from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Credentials:
    url: str
    hospital: str
    username: str
    password: str


@dataclass(frozen=True)
class Department:
    name: str
    beds_path: str
    prefix: str


DEPARTMENTS = [
    Department("ICU",    "/icu/bedsoverview",    "icu"),
    Department("CCU",    "/ccu/bedsoverview",    "ccu"),
    Department("NICU",   "/nicu/bedsoverview",   "nicu"),
    Department("NEO",    "/neo/bedsoverview",    "neo"),
    Department("Stroke", "/strokeunit/bedsoverview", "strokeunit"),
]

TRACKING_COLUMNS = [
    "DIAGNOSIS", "COMPLAINTS", "PROCEDURES", "MEDICINE",
    "OXYGEN CHEST", "FEEDING", "APACHE",
    "VITALS", "INITIAL", "DAILY",
    "FLUID BALANCE", "TURNING", "INVASIVE VENTILATION",
]

ARABIC_HEADERS = [
    "التشخيص", "الشكاوى", "الإجراءات", "الأدوية",
    "العلاج بالأكسجين", "التغذية", "أباتشي",
    "العلامات الحيوية", "الأولى عند الدخول", "المتابعة اليومية",
    "التوازن السوائي", "تقليب المريض", "التنفس الصناعي",
]


@dataclass
class PatientData:
    bed: str
    name: str
    status: str = ""
    diagnosis: bool = False
    complaints: bool = False
    procedures: bool = False
    medicine: bool = False
    oxygen: bool = False
    feeding: bool = False
    apache: bool = False
    vitals: bool = False
    initial: bool = False
    daily: bool = False
    fluid: bool = False
    turning: bool = False
    invasive: bool = False

    def to_values(self) -> list[bool]:
        return [
            self.diagnosis, self.complaints, self.procedures, self.medicine,
            self.oxygen, self.feeding, self.apache,
            self.vitals, self.initial, self.daily,
            self.fluid, self.turning, self.invasive,
        ]
