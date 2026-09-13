"""Render Play feature graphics + screenshot placeholders (Pillow).

Usage: uv run fastfree_store_graphics.py [--app <key|name-prefix>]
Mirrors scripts/generate-feature-graphics.mjs: 1024x500 gradient banner
with logo + app name, and 2 black 1080x1920 placeholder screenshots
per app per locale.
"""

import argparse
import logging
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
LOGO_PATH = REPO_ROOT / "apps" / "fastfree_website" / "public" / "fastfree_logo.png"
LOG_DIR = REPO_ROOT / ".auth" / "logs"


def get_logger() -> logging.Logger:
    """Console + file log: every error lands in .auth/logs with traceback."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("fastfree.store_graphics")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(console)
    file_handler = logging.FileHandler(LOG_DIR / "store_graphics.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(file_handler)
    return logger


LOG = get_logger()

APPS = [
    {"key": "pos", "name": "FastFree POS", "color": "#22c55e"},
    {"key": "erp", "name": "FastFree ERP", "color": "#3b82f6"},
    {"key": "hr", "name": "FastFree HR", "color": "#a855f7"},
    {"key": "ledger", "name": "FastFree Ledger", "color": "#f59e0b"},
]
LOCALES = ["ar", "en-US"]


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def darken(rgb: tuple[int, int, int], factor: float = 0.5) -> tuple[int, int, int]:
    r, g, b = rgb
    return (round(r * factor), round(g * factor), round(b * factor))


def font(size: int, bold: bool = True):
    for candidate in (
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        "arialbd.ttf" if bold else "arial.ttf",
    ):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def vertical_gradient(
    size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]
) -> Image.Image:
    _width, height = size
    base = Image.new("RGB", (1, height))
    px = base.load()
    for y in range(height):
        t = y / max(height - 1, 1)
        assert px is not None
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return base.resize(size)


def centered_text(draw: ImageDraw.ImageDraw, cx: int, y: int, text: str, fnt, fill) -> None:
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((cx - (box[2] - box[0]) / 2, y), text, font=fnt, fill=fill)


def feature_graphic(app: dict, logo: Image.Image, dest: Path) -> None:
    color = hex_rgb(app["color"])
    bg = vertical_gradient((1024, 500), color, darken(color))
    if logo is not None:
        bg.paste(logo, ((1024 - logo.width) // 2, 40), logo if "A" in logo.getbands() else None)
    draw = ImageDraw.Draw(bg)
    centered_text(draw, 512, 440, app["name"], font(46), (255, 255, 255))
    dest.parent.mkdir(parents=True, exist_ok=True)
    bg.save(dest)
    print(f"[OK] {dest}")


def placeholder(app: dict, index: int, dest: Path) -> None:
    img = Image.new("RGB", (1080, 1920), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    label = f"FastFree {app['name'].split()[-1]}" if index == 2 else app["name"]
    centered_text(draw, 540, 880, label, font(76), (255, 255, 255))
    centered_text(draw, 540, 990, f"Screenshot placeholder {index}", font(38), (138, 138, 138))
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    print(f"[OK] {dest}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", default=None)
    args = parser.parse_args()

    if args.app:
        selected = [a for a in APPS if a["key"] == args.app or a["name"].lower().startswith(args.app.lower())]
        if not selected:
            LOG.error("No app matched --app=%s", args.app)
            return 1
    else:
        selected = APPS
    print(f"Processing {len(selected)} app(s): {', '.join(a['name'] for a in selected)}")

    logo = None
    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo.thumbnail((350, 350), Image.LANCZOS)
    else:
        print(f"logo not found at {LOGO_PATH}, continuing without it.")

    for app in selected:
        root = REPO_ROOT / "apps" / f"fastfree_{app['key']}"
        for locale in LOCALES:
            images = root / "fastlane" / "metadata" / "android" / locale / "images"
            feature_graphic(app, logo, images / "feature-graphic.png")
            shots = images / "phone-screenshots"
            for i in (1, 2):
                placeholder(app, i, shots / f"{i}.png")
    print(f"Done. Feature graphics + placeholders for {len(selected)} app(s).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception:
        LOG.exception("Graphics generation failed")
        raise SystemExit(1) from None
