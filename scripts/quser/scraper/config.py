from __future__ import annotations

import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

DEFAULT_CONFIG = {
    "url": "https://manfalout.docuin.com",
    "hospital": "manfalout",
    "username": "operation",
    "password": "hisop@",
    "responsible": {
        "ICU": "محمود محمد",
        "CCU": "محمد ابو النصر",
        "NICU": "ادهم محمد",
        "NEO": "محمود محمد / محمد ابو النصر / ادهم محمد / مريم ميلاد",
        "Stroke": "مريم ميلاد",
    }
}


def load_config(config_path: Path) -> dict:
    if not config_path.exists():
        log.warning("config.json not found - creating with defaults")
        config_path.write_text(
            json.dumps(DEFAULT_CONFIG, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return DEFAULT_CONFIG.copy()
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        log.info("Config loaded from config.json")
        return config
    except json.JSONDecodeError as exc:
        log.warning("config.json is corrupted (%s) - using defaults", exc)
        return DEFAULT_CONFIG.copy()
    except Exception as exc:
        log.warning("Failed to read config.json: %s", exc)
        return DEFAULT_CONFIG.copy()
