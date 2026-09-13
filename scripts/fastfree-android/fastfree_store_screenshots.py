"""Crop Play phone-screenshots to store spec (in place).

Usage: uv run fastfree_store_screenshots.py <app> <localeDir>
  app:        pos | erp | hr | ledger
  localeDir:  ar | en-US
Port of the retired Node cropper: max 1080x1920, max 2:1 aspect,
24-bit PNG, no alpha, no upscaling, center crop.
"""

import logging
import sys
from pathlib import Path

from PIL import Image

MAX_W, MAX_H = 1080, 1920
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
LOG_DIR = REPO_ROOT / ".auth" / "logs"


def get_logger() -> logging.Logger:
    """Console + rotating file log (professional error record per run)."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("fastfree.store_screenshots")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(console)
    file_handler = logging.FileHandler(LOG_DIR / "store_screenshots.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(file_handler)
    return logger


LOG = get_logger()


def process_file(path: Path) -> None:
    with Image.open(path) as img:
        orig_w, orig_h = img.size
        w, h = orig_w, orig_h
        if w > MAX_W or h > MAX_H:
            scale = min(MAX_W / w, MAX_H / h)
            w, h = round(w * scale), round(h * scale)
        if w > h:
            w = min(w, h * 2)
        else:
            h = min(h, w * 2)
        left = max(0, round((orig_w - w) / 2))
        top = max(0, round((orig_h - h) / 2))
        cropped = img.crop((left, top, left + w, top + h)).convert("RGB")
        cropped.save(path, format="PNG", compress_level=9)
    LOG.info("  %s: %sx%s -> %sx%s", path.name, orig_w, orig_h, w, h)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        LOG.error("Usage: fastfree_store_screenshots.py <app> <localeDir>")
        return 1
    app, locale_dir = argv[1], argv[2]
    shot_dir = (
        REPO_ROOT
        / "apps"
        / f"fastfree_{app}"
        / "fastlane"
        / "metadata"
        / "android"
        / locale_dir
        / "images"
        / "phone-screenshots"
    )
    if not shot_dir.is_dir():
        LOG.error("Cannot read directory: %s", shot_dir)
        return 1
    files = sorted(p for p in shot_dir.iterdir() if p.suffix.lower() == ".png")
    if not files:
        LOG.warning("No PNG files in %s", shot_dir)
        return 0
    LOG.info("Processing %d file(s) in %s", len(files), shot_dir)
    try:
        for f in files:
            process_file(f)
    except Exception:
        LOG.exception("Crop failed")
        return 1
    LOG.info("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
