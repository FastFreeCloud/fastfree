"""Build Play listings from website products.ts + git log + icons.

Usage: uv run fastfree_store_metadata.py [--app <name|slug-prefix>]
Mirrors scripts/generate-metadata.mjs: title<=30, short<=80,
full<=4000 (privacy line reserved), changelogs/<VERSION_CODE>.txt,
icon copy, feature-graphic reuse when present.
"""

import argparse
import logging
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PRODUCTS_TS = REPO_ROOT / "apps" / "fastfree_website" / "src" / "data" / "products.ts"
PRIVACY_URL = "https://fastfree.cloud/privacy-policy.html"
LOG_DIR = REPO_ROOT / ".auth" / "logs"


def get_logger() -> logging.Logger:
    """Console + file log: every error lands in .auth/logs with traceback."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("fastfree.store_metadata")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(console)
    file_handler = logging.FileHandler(LOG_DIR / "store_metadata.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(file_handler)
    return logger


LOG = get_logger()

APPS = [
    {"name": "fastfree_pos", "slug": "fastfree-pos-app", "color": "#22c55e"},
    {"name": "fastfree_erp", "slug": "fastfree-erp-app", "color": "#3b82f6"},
    {"name": "fastfree_hr", "slug": "fastfree-hr-app", "color": "#a855f7"},
    {"name": "fastfree_ledger", "slug": "fastfree-ledger-app", "color": "#f59e0b"},
]
LOCALES = ["ar", "en-US"]
FIELDS = [
    "name_ar",
    "name_en",
    "short_description_ar",
    "short_description_en",
    "description_ar",
    "description_en",
]


def truncate(text: str, maximum: int) -> str:
    if len(text) <= maximum:
        return text
    return text[: maximum - 1] + "…"


def unquote(raw: str) -> str:
    raw = raw.strip()
    if raw == "null":
        return ""
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "'\"":
        return raw[1:-1].replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
    return raw


def parse_products(source: str) -> list[dict]:
    """Extract product objects without executing TS (safe subset parser)."""
    products: list[dict] = []
    for match in re.finditer(r"\{\s*id:\s*'(?P<id>[^']*)',(?P<body>.*?)\n\s*\},?", source, re.S):
        body = match.group("body")
        product = {"id": match.group("id")}
        for field in [*FIELDS, "slug"]:
            m = re.search(rf"{field}:\s*('(?:[^'\\]|\\.)*'|null)", body)
            product[field] = unquote(m.group(1)) if m else ""
        products.append(product)
    return products


def git_log() -> str:
    try:
        out = subprocess.run(
            ["git", "log", "--oneline", "-8"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        ).stdout.strip()
        return out or "Bug fixes and improvements"
    except OSError:
        return "Bug fixes and improvements"


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", default=None)
    args = parser.parse_args()

    if args.app:
        selected = [a for a in APPS if a["name"] == args.app or a["slug"].startswith(args.app)]
        if not selected:
            LOG.error("No app matched --app=%s", args.app)
            return 1
    else:
        selected = APPS
    print(f"Processing {len(selected)} app(s): {', '.join(a['name'] for a in selected)}")

    try:
        products = parse_products(PRODUCTS_TS.read_text(encoding="utf-8"))
    except OSError as exc:
        LOG.error("Cannot read products.ts: %s", exc)
        return 1
    by_slug = {p.get("slug", ""): p for p in products}
    changelog = git_log()
    version_code = os.environ.get("VERSION_CODE", "1")

    for app in selected:
        product = by_slug.get(app["slug"])
        app_dir = REPO_ROOT / "apps" / app["name"]
        out_root = app_dir / "fastlane" / "metadata" / "android"
        for locale in LOCALES:
            arabic = locale == "ar"
            out_dir = out_root / locale
            if product:
                title = product["name_ar" if arabic else "name_en"]
                short = product["short_description_ar" if arabic else "short_description_en"]
                full = product["description_ar" if arabic else "description_en"]
                privacy = (
                    f"\n\nسياسة الخصوصية: {PRIVACY_URL}"  # noqa: RUF001 (legitimate Arabic)
                    if arabic
                    else f"\n\nPrivacy Policy: {PRIVACY_URL}"
                )
                write_text(out_dir / "title.txt", truncate(title, 30))
                write_text(out_dir / "short_description.txt", truncate(short, 80))
                write_text(out_dir / "full_description.txt", truncate(full, 4000 - len(privacy)) + privacy)
                print(f"[{app['name']}/{locale}] title: {truncate(title, 30)}")
            else:
                print(f"[{app['name']}/{locale}] slug {app['slug']} not found, skipping text.")
            write_text(out_dir / "changelogs" / f"{version_code}.txt", changelog)
            print(f"[{app['name']}/{locale}] changelogs/{version_code}.txt written.")
            icon_src = app_dir / "public" / "icons" / "icon-512x512.png"
            if icon_src.exists():
                dest = out_dir / "images" / "icon.png"
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(icon_src, dest)
                print(f"[{app['name']}/{locale}] icon.png copied.")
            else:
                print(f"[{app['name']}/{locale}] icon-512x512.png not found, skipping.")
            fg_src = app_dir / "src" / "assets" / f"feature-graphic-{locale}.png"
            if fg_src.exists():
                shutil.copyfile(fg_src, out_dir / "images" / "feature-graphic.png")
                print(f"[{app['name']}/{locale}] feature-graphic.png reused from assets.")
        print(f"--- {app['name']} done ---")
    print(f"\nAll metadata generated (versionCode={version_code}).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception:
        LOG.exception("Metadata generation failed")
        raise SystemExit(1) from None
