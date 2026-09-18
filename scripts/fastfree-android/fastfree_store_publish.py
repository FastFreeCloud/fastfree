"""Publish listings + images + AAB to Play via androidpublisher edits API.

Usage: uv run fastfree_store_publish.py --package PKG --metadata-dir DIR
  [--locales ar,en-US] [--track internal] [--status draft] [--aab FILE]
  [--version-code N]
  (No changesNotSentForReview flag — edits.insert takes an empty body;
  the field was rejected with 400 Unknown field.)
Port of the retired Node publisher. Auth: Application Default Credentials
(WIF GOOGLE_APPLICATION_CREDENTIALS) with the androidpublisher scope.
"""

import argparse
import logging
import sys
import time
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


def _mime_for_image(path: Path) -> str:
    return "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"


def _execute(factory, desc: str, tries: int = 3):
    """Execute a googleapiclient request factory with backoff on 429/5xx.

    Retries rebuild the request (single-use), so callers pass a lambda.
    Safe within one edit (same versionCode); never retry across runs.
    """
    try:
        from googleapiclient.errors import HttpError
    except Exception:
        HttpError = None  # type: ignore[assignment]
    last_exc: Exception | None = None
    for attempt in range(tries):
        try:
            return factory().execute()
        except Exception as exc:
            status = getattr(getattr(exc, "resp", None), "status", None)
            retryable = (
                HttpError is not None
                and isinstance(exc, HttpError)
                and status in (429, 500, 502, 503)
            )
            last_exc = exc
            if retryable and attempt < tries - 1:
                wait = 2.0 * (2.0**attempt)
                LOG.warning(
                    "%s failed with HTTP %s, retrying in %.0fs (attempt %d/%d)",
                    desc, status, wait, attempt + 1, tries,
                )
                time.sleep(wait)
                continue
            raise
    assert last_exc is not None
    raise last_exc


def main() -> int:

    from google.auth import default as google_auth_default
    from google_auth_httplib2 import AuthorizedHttp
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from httplib2 import Http

    parser = argparse.ArgumentParser()
    parser.add_argument("--package", required=True)
    parser.add_argument("--locales", default="ar,en-US")
    parser.add_argument("--metadata-dir", required=True)
    parser.add_argument("--track", default="internal")
    parser.add_argument("--aab", default=None)
    parser.add_argument("--status", default="draft")
    # --version-code is the changelog key when --aab is omitted; when an AAB
    # uploads, the server-echoed versionCode wins (see bundles upload below).
    parser.add_argument("--version-code", default=None)
    args = parser.parse_args()

    package = args.package
    locales = [locale.strip() for locale in args.locales.split(",")]
    metadata_dir = Path(args.metadata_dir)
    track = args.track
    status = "completed" if args.status == "completed" else "draft"
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
        # NOTE: edits.insert takes no body fields in androidpublisher v3
        # (changesNotSentForReview was rejected with 400 Unknown field).
        edit_id = edits.insert(body={}, packageName=package).execute()["id"]
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
                _execute(
                    lambda locale=locale, listing=listing: edits.listings().update(
                        packageName=package, editId=edit_id, language=locale, body=listing
                    ),
                    f"listings.update {locale}",
                )
                print("Listing updated.")
            else:
                LOG.warning("No listing texts for locale %s (skipped)", locale)

            images_dir = locale_dir / "images"
            if not images_dir.is_dir():
                LOG.warning("No images dir for locale %s (skipped)", locale)
            else:
                icon = images_dir / "icon.png"
                if icon.exists():
                    print(f"Uploading icon for {locale}...")
                    media = MediaFileUpload(str(icon), mimetype=_mime_for_image(icon), resumable=True)
                    _execute(
                        lambda locale=locale, media=media: edits.images().upload(
                            packageName=package,
                            editId=edit_id,
                            imageType="icon",
                            language=locale,
                            media_body=media,
                        ),
                        f"images.upload icon {locale}",
                    )
                    print("Icon uploaded.")
                else:
                    LOG.warning("App icon missing for %s: %s", locale, icon)
                feature = images_dir / "feature-graphic.png"
                if feature.exists():
                    print(f"Uploading feature graphic for {locale}...")
                    media = MediaFileUpload(str(feature), mimetype=_mime_for_image(feature), resumable=True)
                    _execute(
                        lambda locale=locale, media=media: edits.images().upload(
                            packageName=package,
                            editId=edit_id,
                            imageType="featureGraphic",
                            language=locale,
                            media_body=media,
                        ),
                        f"images.upload featureGraphic {locale}",
                    )
                    print("Feature graphic uploaded.")
                else:
                    LOG.warning("Feature graphic missing for %s: %s", locale, feature)
                shots_dir = images_dir / "phone-screenshots"
                if shots_dir.is_dir():
                    shots = sorted(
                        p for p in shots_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
                    )
                    if not shots:
                        LOG.warning("No screenshots in %s", shots_dir)
                    else:
                        # Replace semantics: Play accumulates shots across
                        # uploads, so clear stale ones first.
                        try:
                            existing = (
                                edits.images()
                                .list(
                                    packageName=package,
                                    editId=edit_id,
                                    language=locale,
                                    imageType="phoneScreenshots",
                                )
                                .execute()
                                .get("images", [])
                            )
                            for img in existing:
                                edits.images().delete(
                                    packageName=package,
                                    editId=edit_id,
                                    language=locale,
                                    imageType="phoneScreenshots",
                                    imageId=img["id"],
                                ).execute()
                            if existing:
                                print(f"Cleared {len(existing)} old screenshot(s) for {locale}.")
                        except Exception as exc:
                            LOG.warning("Could not clear old screenshots for %s: %s", locale, exc)
                    for shot in shots:
                        print(f"Uploading screenshot {shot.name} for {locale}...")
                        media = MediaFileUpload(str(shot), mimetype=_mime_for_image(shot), resumable=True)
                        _execute(
                            lambda shot=shot, locale=locale, media=media: edits.images().upload(
                                packageName=package,
                                editId=edit_id,
                                imageType="phoneScreenshots",
                                language=locale,
                                media_body=media,
                            ),
                            f"images.upload phoneScreenshots {locale}/{shot.name}",
                        )
                    if shots:
                        print(f"{len(shots)} screenshot(s) uploaded.")
                else:
                    LOG.warning("No phone-screenshots dir for %s (skipped)", locale)

        aab_uploaded = False
        if aab_path:
            if not aab_path.exists():
                fail(f"AAB file not found: {aab_path}")
            print(f"Uploading AAB: {aab_path}...")
            media = MediaFileUpload(str(aab_path), mimetype="application/octet-stream", resumable=True)
            uploaded = _execute(
                lambda: edits.bundles().upload(packageName=package, editId=edit_id, media_body=media),
                "bundles.upload",
            )
            version_code = str(uploaded["versionCode"])
            aab_uploaded = True
            print(f"AAB uploaded. versionCode: {version_code}")

        notes = []
        for locale in locales:
            text = read_text(metadata_dir / locale / "changelogs" / f"{version_code}.txt")
            if not text:
                text = read_text(metadata_dir / locale / "changelogs" / "default.txt")
                if text:
                    LOG.warning("No changelog %s.txt for %s, using default.txt", version_code, locale)
            if text:
                notes.append({"language": locale, "text": text})
            elif version_code:
                LOG.warning("No changelog for %s (release will have no notes)", locale)

        track_ok = True
        if version_code:
            print(f'Updating track "{track}" with release notes...')
            try:
                release: dict = {"versionCodes": [int(version_code)], "status": status}
                if notes:
                    release["releaseNotes"] = notes
                _execute(
                    lambda release=release: edits.tracks().update(
                        packageName=package,
                        editId=edit_id,
                        track=track,
                        body={"track": track, "releases": [release]},
                    ),
                    f"tracks.update {track}",
                )
                print("Track updated.")
            except Exception as exc:
                # Fail hard when WE uploaded the AAB: committing a trackless
                # edit prints a lying SUCCESS. (Without our own upload the
                # code may reference an already-live bundle, so only warn.)
                if aab_uploaded:
                    track_ok = False
                    LOG.error("Track update FAILED after our own AAB upload: %s", exc)
                else:
                    print(f"Track update skipped (no release for versionCode yet): {exc}")

        if aab_uploaded and not track_ok:
            raise RuntimeError("refusing to commit an edit with no release on track")

        print("Committing edit...")
        edits.commit(packageName=package, editId=edit_id).execute()

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
        if "403" in str(exc) or "forbidden" in str(exc).lower():
            LOG.error(
                "403 on commit: the service account needs all 4 per-app grants on %s "
                "(Release to testing tracks + Release to production/App Signing + "
                "Manage store presence + View app information) with an Active row. "
                "Staged calls passing while commit 403s = View app information missing.",
                package,
            )
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
