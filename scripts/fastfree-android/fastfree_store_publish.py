"""Publish listings + images + AAB to Play via androidpublisher edits API.

Usage: uv run fastfree_store_publish.py --package PKG --metadata-dir DIR
  [--locales ar,en-US] [--track internal] [--status draft] [--aab FILE]
  [--version-code N] [--changes-not-sent-for-review true]
Mirrors scripts/play-publisher.mjs. Auth: Application Default Credentials
(WIF GOOGLE_APPLICATION_CREDENTIALS) with the androidpublisher scope.
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import NoReturn

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]
LOG_DIR = Path(__file__).resolve().parent.parent.parent / ".auth" / "logs"


def get_logger() -> logging.Logger:
    """Console + file log: every error lands in .auth/logs with traceback."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("fastfree.store_publish")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(console)
    file_handler = logging.FileHandler(LOG_DIR / "store_publish.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(file_handler)
    return logger


LOG = get_logger()


def fail(message: str) -> NoReturn:
    LOG.error(message)
    raise SystemExit(1)


def read_text(path: Path) -> str | None:
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8").strip()
    return text or None


def main() -> int:

    from google.auth import default as google_auth_default
    from google_auth_httplib2 import AuthorizedHttp
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from httplib2 import Http

    parser = argparse.ArgumentParser()
    parser.add_argument("--package", required=True)
    parser.add_argument("--locales", default="ar")
    parser.add_argument("--metadata-dir", required=True)
    parser.add_argument("--track", default="internal")
    parser.add_argument("--aab", default=None)
    parser.add_argument("--status", default="draft")
    parser.add_argument("--version-code", default=None)
    parser.add_argument("--changes-not-sent-for-review", default="true")
    args = parser.parse_args()

    package = args.package
    locales = [locale.strip() for locale in args.locales.split(",")]
    metadata_dir = Path(args.metadata_dir)
    track = args.track
    status = "completed" if args.status == "completed" else "draft"
    changes_not_sent = args.changes_not_sent_for_review != "false"
    aab_path = Path(args.aab).resolve() if args.aab else None
    version_code = args.version_code

    credentials, _ = google_auth_default(scopes=SCOPES)
    print("Auth: Application Default Credentials with androidpublisher scope")
    # Official guidance: raise HTTP timeout for bundle uploads (2 minutes).
    authed_http = AuthorizedHttp(credentials, http=Http(timeout=120))
    publisher = build("androidpublisher", "v3", http=authed_http)
    edits = publisher.edits()

    edit_id = None
    try:
        print(f"Creating edit for {package}...")
        edit_id = edits.insert(
            body={"changesNotSentForReview": changes_not_sent}, packageName=package
        ).execute()["id"]
        print(f"Edit created: {edit_id}")

        for locale in locales:
            locale_dir = metadata_dir / locale
            title = read_text(locale_dir / "title.txt")
            short = read_text(locale_dir / "short_description.txt")
            full = read_text(locale_dir / "full_description.txt")
            if title or short or full:
                print(f"Updating listing for {locale}...")
                listing: dict = {"language": locale}
                if title:
                    listing["title"] = title
                if short:
                    listing["shortDescription"] = short
                if full:
                    listing["fullDescription"] = full
                edits.listings().update(
                    packageName=package, editId=edit_id, language=locale, body=listing
                ).execute()
                print("Listing updated.")

            images_dir = locale_dir / "images"
            if images_dir.is_dir():
                icon = images_dir / "icon.png"
                if icon.suffix.lower() == ".png" and icon.exists():
                    print(f"Uploading icon for {locale}...")
                    media = MediaFileUpload(str(icon), mimetype="image/png", resumable=True)
                    edits.images().upload(
                        packageName=package,
                        editId=edit_id,
                        imageType="icon",
                        language=locale,
                        media_body=media,
                    ).execute()
                    print("Icon uploaded.")
                feature = images_dir / "feature-graphic.png"
                if feature.exists():
                    print(f"Uploading feature graphic for {locale}...")
                    media = MediaFileUpload(str(feature), mimetype="image/png", resumable=True)
                    edits.images().upload(
                        packageName=package,
                        editId=edit_id,
                        imageType="featureGraphic",
                        language=locale,
                        media_body=media,
                    ).execute()
                    print("Feature graphic uploaded.")
                shots_dir = images_dir / "phone-screenshots"
                if shots_dir.is_dir():
                    shots = sorted(
                        p for p in shots_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
                    )
                    for shot in shots:
                        print(f"Uploading screenshot {shot.name} for {locale}...")
                        media = MediaFileUpload(str(shot), mimetype="image/png", resumable=True)
                        edits.images().upload(
                            packageName=package,
                            editId=edit_id,
                            imageType="phoneScreenshots",
                            language=locale,
                            media_body=media,
                        ).execute()
                    if shots:
                        print(f"{len(shots)} screenshot(s) uploaded.")

        if aab_path:
            if not aab_path.exists():
                fail(f"AAB file not found: {aab_path}")
            print(f"Uploading AAB: {aab_path}...")
            media = MediaFileUpload(str(aab_path), mimetype="application/octet-stream", resumable=True)
            uploaded = edits.bundles().upload(packageName=package, editId=edit_id, media_body=media).execute()
            version_code = str(uploaded["versionCode"])
            print(f"AAB uploaded. versionCode: {version_code}")

        notes = []
        for locale in locales:
            text = read_text(metadata_dir / locale / "changelogs" / f"{version_code}.txt")
            if text:
                notes.append({"language": locale, "text": text})

        if version_code:
            print(f'Updating track "{track}" with release notes...')
            try:
                release: dict = {"versionCodes": [int(version_code)], "status": status}
                if notes:
                    release["releaseNotes"] = notes
                edits.tracks().update(
                    packageName=package,
                    editId=edit_id,
                    track=track,
                    body={"track": track, "releases": [release]},
                ).execute()
                print("Track updated.")
            except Exception as exc:  # keep parity: non-fatal
                print(f"Track update skipped (no release for versionCode yet): {exc}")

        print("Committing edit...")
        edits.commit(
            packageName=package, editId=edit_id, body={"changesNotSentForReview": changes_not_sent}
        ).execute()

        print("\n=== SUCCESS ===")
        print(f"Edit ID:       {edit_id}")
        print(f"Package:       {package}")
        print(f"Track:         {track}")
        print(f"Status:        {status}")
        print(f"Locales:       {', '.join(locales)}")
        print(f"Version Code:  {version_code or 'n/a'}")
        print("===============")
        return 0
    except SystemExit:
        raise
    except Exception as exc:
        LOG.exception("Publication failed: %s", exc)
        if edit_id:
            try:
                LOG.warning("Cleaning up draft edit %s...", edit_id)
                edits.delete(packageName=package, editId=edit_id).execute()
                LOG.info("Draft edit deleted.")
            except Exception as clean_exc:
                LOG.error("Failed to delete draft edit: %s", clean_exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
