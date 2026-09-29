"""quser CLI — non-interactive runner around the vendored scraper.

Usage (from repo root):
    uv run --project scripts/quser cli.py --period morning
    uv run --project scripts/quser cli.py --period evening --date 28/09/2026
    uv run --project scripts/quser cli.py --period morning --config sites/manfalout.json

Secrets come from the environment and override the config file:
    HIS_URL, HIS_HOSPITAL, HIS_USERNAME, HIS_PASSWORD
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from scraper.config import load_config  # noqa: E402
from scraper.fields.base import parse_target_date  # noqa: E402
from scraper.followup import run_once  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("quser")

ENV_MAP = {
    "HIS_URL": "url",
    "HIS_HOSPITAL": "hospital",
    "HIS_USERNAME": "username",
    "HIS_PASSWORD": "password",
}


def apply_env_overrides(config: dict) -> dict:
    for env_key, cfg_key in ENV_MAP.items():
        val = os.environ.get(env_key)
        if val:
            config[cfg_key] = val
    return config


def resolve_date(date_str: str | None) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    if not date_str:
        return today
    parsed = parse_target_date(date_str)
    if parsed is None:
        raise SystemExit(
            f"Invalid date '{date_str}'. Use YYYY-MM-DD or DD/MM/YYYY."
        )
    return parsed.strftime("%Y-%m-%d")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="quser flow-up runner")
    parser.add_argument("--period", required=True, choices=["morning", "evening"])
    parser.add_argument("--date", default=None,
                        help="Target date: YYYY-MM-DD or DD/MM/YYYY (default: today)")
    parser.add_argument("--config", default="config.example.json",
                        help="Config file path (default: config.example.json next to cli.py)")
    args = parser.parse_args(argv)

    period = "Morning" if args.period == "morning" else "Evening"
    target_date = resolve_date(args.date)
    log.info("Period: %s | Date: %s", period, target_date)

    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = BASE_DIR / config_path
    config = apply_env_overrides(load_config(config_path))

    run_once(config, period, target_date)
    log.info("=== Done! ===")


if __name__ == "__main__":
    main()
