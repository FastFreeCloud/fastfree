from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

from .config import load_config
from .fields.base import parse_target_date
from .models import Credentials, DEPARTMENTS
from .scraper import scrape_all
from .excel_export import generate_excel
from .html_export import generate_html
from .messages_export import generate_messages

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent


def make_timestamp() -> str:
    now = datetime.now()
    ampm = "PM" if now.hour >= 12 else "AM"
    h12 = now.hour % 12 or 12
    return f"{now:%Y_%m_%d}_{h12:02d}_{now.minute:02d}_{ampm}"


def run_once(config: dict, period: str, target_date: str) -> None:
    creds = Credentials(
        url=config.get("url", "https://manfalout.docuin.com"),
        hospital=config.get("hospital", "manfalout"),
        username=config.get("username", "operation"),
        password=config.get("password", "hisop@"),
    )

    try:
        patients = asyncio.run(scrape_all(creds, config, target_date))
    except Exception as exc:
        log.error("Scraping failed: %s", exc)
        return

    ts = make_timestamp()
    output_dir = BASE_DIR / "output" / ts
    output_dir.mkdir(parents=True, exist_ok=True)

    dept_cfg = config.get("departments")
    enabled = [d.name for d in DEPARTMENTS if (dept_cfg.get(d.name, True) if dept_cfg is not None else True)]

    excel_path = generate_excel(patients, output_dir, ts, config, enabled, period)
    html_path = generate_html(patients, output_dir, ts, config, enabled, period)
    try:
        msg_paths = generate_messages(patients, output_dir, ts, config, enabled, period)
        for p in msg_paths:
            log.info("Messages: %s", p.resolve())
    except Exception as exc:
        log.warning("Messages export failed (excel/html already saved): %s", exc)

    log.info("Excel: %s", excel_path.resolve())
    log.info("HTML: %s", html_path.resolve())


def main() -> None:
    if getattr(sys, "frozen", False):
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(BASE_DIR / "browsers")

    config = load_config(BASE_DIR / "config.json")

    log.info("=== FlowUp ===\n")

    while True:
        log.info("Choose period:")
        log.info("  1. Morning")
        log.info("  2. Evening")
        try:
            choice = input("\nEnter 1 or 2: ").strip()
        except (EOFError, KeyboardInterrupt):
            return
        if choice == "1":
            period = "Morning"
            break
        elif choice == "2":
            period = "Evening"
            break
        log.info("Invalid choice, try again.\n")

    today = datetime.now().strftime("%Y-%m-%d")
    log.info("\nDate for vitals/daily/fluid: %s", today)
    log.info("Accepted formats: YYYY-MM-DD or DD/MM/YYYY (e.g. 2026-09-28 or 28/09/2026)")
    target_date = today
    while True:
        try:
            new_date = input("Press Enter to keep, or type new date: ").strip()
        except (EOFError, KeyboardInterrupt):
            return
        if not new_date:
            target_date = today
            break
        parsed = parse_target_date(new_date)
        if parsed is None:
            log.info("Invalid date '%s', try again (YYYY-MM-DD or DD/MM/YYYY).\n", new_date)
            continue
        target_date = parsed.strftime("%Y-%m-%d")
        break
    log.info("Using date: %s\n", target_date)

    run_once(config, period, target_date)
    log.info("\n=== Done! ===")


if __name__ == "__main__":
    main()
