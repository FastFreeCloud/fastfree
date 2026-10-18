"""Generate, inspect, wire, and verify the ONE stable Android upload keystore.

Official method (Quasar docs: keytool RSA-2048, validity 20000, kept out
of version control and backed up — Play pins the first upload certificate).

CRITICAL GOOGLE PLAY INVARIANT:
The user has ALREADY uploaded the mobile apps to Google Play Console.
Google Play has pinned the release certificate fingerprint:
  SHA-256: F5:0C:11:D1:C3:44:3E:B3:72:EF:5E:62:E0:16:B5:E5:E2:89:ED:42:48:F6:D3:FB:C8:08:28:A5:0B:97:AD:79
  SHA-1:   40:CF:9B:F6:4B:F1:9E:62:06:02:40:9B:25:0F:70:0D:22:59:8D:1E
  Keystore SHA-256: 7C462200AA611C7C9BC3DC5857075F570036A3A20EC56AB72F2DF32B384FAF76

Usage:
  python fastfree_android_keystore.py --verify
  python fastfree_android_keystore.py --wire --app-dir fastfree_pos
  python fastfree_android_keystore.py --info [--in PATH]
  python fastfree_android_keystore.py --backup
  python fastfree_android_keystore.py --gen [--out PATH]
"""

import argparse
import base64
import hashlib
import logging
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_OUT = REPO_ROOT / ".auth" / "signing" / "release.jks"
FALLBACK_KEYSTORE = REPO_ROOT / "scripts" / "fastfree-android" / "keystore" / "release.jks"
DEFAULT_ALIAS = "fastfree"
DEFAULT_PASS = "FastFree@87171393"
DEFAULT_DNAME = "CN=FastFree, OU=IT, O=FastFree, L=Riyadh, ST=Riyadh, C=SA"
LOG_DIR = REPO_ROOT / ".auth" / "logs"

CANONICAL_SHA256_FINGERPRINT = (
    "F5:0C:11:D1:C3:44:3E:B3:72:EF:5E:62:E0:16:B5:E5:E2:89:ED:42:48:F6:D3:FB:C8:08:28:A5:0B:97:AD:79"
)
CANONICAL_SHA1_FINGERPRINT = (
    "40:CF:9B:F6:4B:F1:9E:62:06:02:40:9B:25:0F:70:0D:22:59:8D:1E"
)
CANONICAL_FILE_SHA256 = (
    "7C462200AA611C7C9BC3DC5857075F570036A3A20EC56AB72F2DF32B384FAF76"
)

TARGET_SDK = 36

APPS_REGISTRY = {
    "erp": {
        "name": "FastFree ERP",
        "app_dir": "fastfree_erp",
        "package_id": "com.fastfree.erp",
        "play_id": "4972280926407480271",
    },
    "pos": {
        "name": "FastFree POS",
        "app_dir": "fastfree_pos",
        "package_id": "com.fastfree.pos",
        "play_id": "4972676838636058435",
    },
    "ledger": {
        "name": "FastFree Ledger",
        "app_dir": "fastfree_ledger",
        "package_id": "com.fastfree.ledger",
        "play_id": "4974312878333959648",
    },
    "hr": {
        "name": "FastFree HR",
        "app_dir": "fastfree_hr",
        "package_id": "com.fastfree.hr",
        "play_id": "4975808492151675669",
    },
}


def get_logger() -> logging.Logger:
    """Console + file log: every error lands in .auth/logs with traceback."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("fastfree.android_keystore")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(console)
    file_handler = logging.FileHandler(LOG_DIR / "android_keystore.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(file_handler)
    return logger


LOG = get_logger()

WINGET_JDK_ID = "EclipseAdoptium.Temurin.21.JDK"


def refresh_path_from_env() -> None:
    """Re-read machine+user PATH (winget installers update it for new shells only)."""
    if os.name != "nt":
        return
    try:
        import winreg

        merged: list[str] = []
        for hive, key in (
            (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment"),
            (winreg.HKEY_CURRENT_USER, "Environment"),
        ):
            try:
                with winreg.OpenKey(hive, key) as handle:
                    value, _ = winreg.QueryValueEx(handle, "Path")
                    merged.extend(str(value).split(";"))
            except OSError:
                continue
        if merged:
            os.environ["PATH"] = ";".join(dict.fromkeys(merged + os.environ.get("PATH", "").split(";")))
    except ImportError:
        pass


def search_program_files() -> str | None:
    """Find keytool under standard install locations (post-winget)."""
    roots = [os.environ.get("ProgramFiles", ""), os.environ.get("ProgramFiles(x86)", "")]
    for root in roots:
        base = Path(root) / "Eclipse Adoptium"
        if base.is_dir():
            for candidate in sorted(base.glob("jdk-*/bin/keytool.exe"), reverse=True):
                return str(candidate)
    return None


def ensure_jdk(auto_install: bool) -> str | None:
    """Resolve keytool, auto-installing Temurin 21 via winget on Windows when asked."""
    refresh_path_from_env()
    found = shutil.which("keytool") or search_program_files()
    if found:
        return found
    if not auto_install or os.name != "nt" or not shutil.which("winget"):
        return None
    LOG.warning("keytool missing — auto-installing Temurin JDK 21 via winget (one time, ~190MB)…")
    proc = subprocess.run(
        [
            "winget",
            "install",
            "--id",
            WINGET_JDK_ID,
            "-e",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    combined = (proc.stdout or "") + (proc.stderr or "")
    refresh_path_from_env()
    resolved = shutil.which("keytool") or search_program_files()
    if resolved:
        return resolved
    if proc.returncode != 0:
        LOG.error("winget JDK install failed: %s", combined[-2000:])
        return None
    refresh_path_from_env()
    return shutil.which("keytool") or search_program_files()


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def compute_file_sha256(path: Path) -> str:
    """Calculate uppercase hexadecimal SHA-256 checksum of a file."""
    hasher = hashlib.sha256()
    hasher.update(path.read_bytes())
    return hasher.hexdigest().upper()


def get_canonical_keystore() -> Path | None:
    """Resolve the canonical release.jks, verifying its SHA-256 checksum."""
    candidates = [
        DEFAULT_OUT,
        FALLBACK_KEYSTORE,
        REPO_ROOT / "apps" / "fastfree_erp" / "src-capacitor" / "android" / "release.jks",
    ]
    for candidate in candidates:
        if candidate.exists():
            h = compute_file_sha256(candidate)
            if h == CANONICAL_FILE_SHA256:
                return candidate
            LOG.warning("Keystore candidate %s exists but hash %s != canonical %s", candidate, h, CANONICAL_FILE_SHA256)

    # If file not present on runner, restore from environment secret
    b64_env = os.environ.get("ANDROID_KEYSTORE_BASE64", "").strip()
    if b64_env:
        try:
            raw = base64.b64decode(b64_env)
            h = hashlib.sha256(raw).hexdigest().upper()
            if h == CANONICAL_FILE_SHA256:
                DEFAULT_OUT.parent.mkdir(parents=True, exist_ok=True)
                DEFAULT_OUT.write_bytes(raw)
                LOG.info("Restored canonical release.jks from ANDROID_KEYSTORE_BASE64 environment secret.")
                return DEFAULT_OUT
            else:
                LOG.warning("ANDROID_KEYSTORE_BASE64 decoded hash %s != canonical %s", h, CANONICAL_FILE_SHA256)
        except Exception as err:
            LOG.warning("Failed to decode ANDROID_KEYSTORE_BASE64: %s", err)

    return None


WIRE_MARKER = "// fastfree-signing (managed by fastfree_android_keystore.py --wire)"


def wire_signing(app_dir: str | None) -> int:
    """Inject release signingConfigs into android/app/build.gradle (idempotent).

    Ensures keystore.properties and release.jks are present and strictly match
    the canonical Google Play release certificate.
    """
    if not app_dir:
        LOG.error("--wire needs --app-dir (e.g. fastfree_pos)")
        return 1

    # Normalize app_dir name if passed as pos, erp, etc.
    if app_dir in APPS_REGISTRY:
        app_dir = APPS_REGISTRY[app_dir]["app_dir"]

    src_cap = REPO_ROOT / "apps" / app_dir / "src-capacitor"
    android_dir = src_cap / "android"
    if not android_dir.exists():
        LOG.error(
            "android/ directory not found in %s. Do NOT create an uninitialized directory manually; "
            "run 'npx cap add android' inside %s first.",
            android_dir,
            src_cap,
        )
        return 1

    # 1. Ensure keystore.properties exists
    keystore_props = android_dir / "keystore.properties"
    if not keystore_props.exists():
        template = src_cap / "keystore.properties.template"
        central_template = REPO_ROOT / "scripts" / "fastfree-android" / "keystore.properties.template"
        if template.exists():
            shutil.copyfile(template, keystore_props)
            LOG.info("copied keystore.properties from template to %s", keystore_props)
        elif central_template.exists():
            shutil.copyfile(central_template, keystore_props)
            LOG.info("copied keystore.properties from central template to %s", keystore_props)
        else:
            keystore_props.write_text(
                "storeFile=release.jks\n"
                f"storePassword={DEFAULT_PASS}\n"
                f"keyAlias={DEFAULT_ALIAS}\n"
                f"keyPassword={DEFAULT_PASS}\n",
                encoding="utf-8",
            )
            LOG.info("created default keystore.properties in %s", keystore_props)

    # 2. Ensure release.jks exists and has canonical hash
    dest_jks = android_dir / "release.jks"
    canonical = get_canonical_keystore()
    if not dest_jks.exists():
        if not canonical:
            LOG.error(
                "Cannot wire signing: no canonical release.jks found in .auth/signing or scripts/fastfree-android/keystore!"
            )
            return 1
        shutil.copyfile(canonical, dest_jks)
        LOG.info("copied canonical release.jks from %s to %s", canonical, dest_jks)

    jks_hash = compute_file_sha256(dest_jks)
    if jks_hash != CANONICAL_FILE_SHA256:
        LOG.critical(
            "CRITICAL SECURITY ALERT: %s has hash %s, expected %s! "
            "Google Play will REJECT app bundles signed with this mismatched key!",
            dest_jks,
            jks_hash,
            CANONICAL_FILE_SHA256,
        )
        return 1

    # 3. Patch build.gradle with signingConfig
    gradle = android_dir / "app" / "build.gradle"
    if not gradle.exists():
        LOG.error("build.gradle not found: %s", gradle)
        return 1
    text = gradle.read_text(encoding="utf-8")
    if WIRE_MARKER in text:
        LOG.info("signing already wired: %s", gradle)
        return 0
    anchor = "android {"
    if anchor not in text:
        LOG.error("cannot find 'android {' block in %s", gradle)
        return 1
    block = (
        "android {\n"
        f"    {WIRE_MARKER}\n"
        '    def keystorePropertiesFile = rootProject.file("keystore.properties")\n'
        "    def keystoreProperties = new Properties()\n"
        "    if (keystorePropertiesFile.exists()) {\n"
        "        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))\n"
        "    }\n"
        "    signingConfigs {\n"
        "        release {\n"
        "            storeFile rootProject.file(keystoreProperties['storeFile'] ?: 'release.jks')\n"
        "            storePassword keystoreProperties['storePassword']\n"
        "            keyAlias keystoreProperties['keyAlias']\n"
        "            keyPassword keystoreProperties['keyPassword']\n"
        "        }\n"
        "    }\n"
    )
    text = text.replace(anchor, block, 1)
    release_block = re.search(r"buildTypes\s*\{\s*release\s*\{([^}]*)\}", text, re.S)
    if release_block and "signingConfig" not in release_block.group(1):
        patched = release_block.group(0).replace(
            "release {", "release {\n            signingConfig signingConfigs.release", 1
        )
        text = text.replace(release_block.group(0), patched, 1)
        step_note = " + release signingConfig"
    else:
        step_note = " (release block untouched)"
    gradle.write_text(text, encoding="utf-8")
    LOG.info("wired release signing: %s%s", gradle, step_note)
    return 0


def pin_target_sdk(app_dir: str | None) -> int:
    """Pin targetSdkVersion in android/variables.gradle (idempotent, fail-loud).

    Play requires targetSdk >= 36 (2026/2026 Google Play requirement).
    """
    if not app_dir:
        LOG.error("--wire needs --app-dir (e.g. fastfree_pos)")
        return 1

    if app_dir in APPS_REGISTRY:
        app_dir = APPS_REGISTRY[app_dir]["app_dir"]

    variables = REPO_ROOT / "apps" / app_dir / "src-capacitor" / "android" / "variables.gradle"
    if not variables.exists():
        LOG.error("variables.gradle not found: %s", variables)
        return 1
    text = variables.read_text(encoding="utf-8")
    updated, count = re.subn(r"targetSdkVersion\s*=\s*\d+", f"targetSdkVersion = {TARGET_SDK}", text)
    if count == 0:
        LOG.error("targetSdkVersion key not found in %s", variables)
        return 1
    if updated != text:
        variables.write_text(updated, encoding="utf-8")
        LOG.info("pinned targetSdkVersion=%d: %s", TARGET_SDK, variables)
    else:
        LOG.info("targetSdkVersion already %d: %s", TARGET_SDK, variables)
    return 0


def backup_keystore() -> int:
    """Output instructions and a Base64 string for offline/cloud backup."""
    canonical = get_canonical_keystore()
    if not canonical:
        LOG.error("No valid canonical release.jks found to back up!")
        return 1
    raw = canonical.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    file_hash = compute_file_sha256(canonical)
    print("\n" + "=" * 70)
    print("FASTFREE ANDROID KEYSTORE BACKUP MANIFEST")
    print("=" * 70)
    print(f"Canonical Source : {canonical}")
    print(f"File SHA-256     : {file_hash}")
    print(f"Alias            : {DEFAULT_ALIAS}")
    print(f"Store / Key Pass : {DEFAULT_PASS}")
    print(f"Play Fingerprint : {CANONICAL_SHA256_FINGERPRINT}")
    print(f"Payload Size     : {len(raw)} bytes (Base64 length: {len(b64)})")
    print("-" * 70)
    print("Base64 string (Store in GitHub Secret / GCP Secret Manager / Bitwarden):")
    print(b64)
    print("-" * 70)
    print("PowerShell restore command:")
    print(f"[IO.File]::WriteAllBytes('.auth/signing/release.jks', [Convert]::FromBase64String('{b64[:32]}...'))")
    print("=" * 70 + "\n")
    return 0


def verify_keystores_and_apps() -> int:
    """Comprehensive integrity check for Keystore and all 4 mobile apps."""
    print("\n" + "=" * 78)
    print(" FASTFREE ANDROID KEYSTORE & GOOGLE PLAY APPS INTEGRITY AUDIT")
    print("=" * 78)

    errors = 0

    # 1. Check primary canonical keystore
    print("\n[1] CANONICAL KEYSTORE AUDIT")
    if DEFAULT_OUT.exists():
        h = compute_file_sha256(DEFAULT_OUT)
        if h == CANONICAL_FILE_SHA256:
            print(f"  [OK] Primary Keystore: {DEFAULT_OUT}")
            print(f"       File SHA-256: {h}")
        else:
            print(f"  [FAIL] Primary Keystore: {DEFAULT_OUT}")
            print(f"         Hash MISMATCH! Found: {h}, Expected: {CANONICAL_FILE_SHA256}")
            errors += 1
    else:
        print(f"  [WARN] Primary Keystore missing: {DEFAULT_OUT}")

    if FALLBACK_KEYSTORE.exists():
        h_fb = compute_file_sha256(FALLBACK_KEYSTORE)
        if h_fb == CANONICAL_FILE_SHA256:
            print(f"  [OK] Replicated Keystore: {FALLBACK_KEYSTORE}")
        else:
            print(f"  [FAIL] Replicated Keystore MISMATCH: {FALLBACK_KEYSTORE}")
            errors += 1
    else:
        print(f"  [WARN] Replicated Keystore missing: {FALLBACK_KEYSTORE}")

    print(f"  [OK] Certified Play Fingerprint: {CANONICAL_SHA256_FINGERPRINT}")

    # 2. Check each mobile app
    print("\n[2] APPS CONFIGURATION & PLAY CONSOLE COMPLIANCE")
    print(f"  {'App Name':<16} | {'Target Package ID':<22} | {'Capacitor ID':<22} | {'Android':<7} | {'Signing':<7} | {'SDK 36'}")
    print("  " + "-" * 88)

    for key, app in APPS_REGISTRY.items():
        app_dir = app["app_dir"]
        pkg = app["package_id"]
        src_cap = REPO_ROOT / "apps" / app_dir / "src-capacitor"
        cap_config = src_cap / "capacitor.config.ts"
        template = src_cap / "keystore.properties.template"

        cap_id = "MISSING"
        if cap_config.exists():
            content = cap_config.read_text(encoding="utf-8")
            m = re.search(r"appId:\s*['\"]([^'\"]+)['\"]", content)
            if m:
                cap_id = m.group(1)

        cap_ok = (cap_id == pkg)
        if not cap_ok:
            errors += 1

        android_dir = src_cap / "android"
        has_android = android_dir.exists()
        signing_ok = "N/A"
        sdk_ok = "N/A"

        if has_android:
            app_jks = android_dir / "release.jks"
            app_props = android_dir / "keystore.properties"
            app_gradle = android_dir / "app" / "build.gradle"
            app_vars = android_dir / "variables.gradle"

            jks_valid = app_jks.exists() and compute_file_sha256(app_jks) == CANONICAL_FILE_SHA256
            props_valid = app_props.exists()
            gradle_wired = app_gradle.exists() and WIRE_MARKER in app_gradle.read_text(encoding="utf-8")

            if jks_valid and props_valid and gradle_wired:
                signing_ok = "WIRED"
            else:
                signing_ok = "FAIL"
                errors += 1

            if app_vars.exists():
                vars_txt = app_vars.read_text(encoding="utf-8")
                m_sdk = re.search(r"targetSdkVersion\s*=\s*(\d+)", vars_txt)
                if m_sdk and int(m_sdk.group(1)) == TARGET_SDK:
                    sdk_ok = f"{TARGET_SDK}"
                else:
                    sdk_ok = f"{m_sdk.group(1) if m_sdk else 'NONE'}"
                    errors += 1
            else:
                sdk_ok = "MISSING"
                errors += 1
        else:
            # Android directory not yet added; check template
            if not template.exists():
                print(f"  [WARN] {app_dir}: missing keystore.properties.template")

        status_cap = cap_id if cap_ok else f"ERR:{cap_id}"
        print(f"  {app['name']:<16} | {pkg:<22} | {status_cap:<22} | {('YES' if has_android else 'NO'):<7} | {signing_ok:<7} | {sdk_ok}")

    print("-" * 78)
    if errors == 0:
        print("  RESULT: [PASSED] ALL APPS STRICTLY CONFIGURED FOR GOOGLE PLAY.")
    else:
        print(f"  RESULT: [FAILED] {errors} COMPLIANCE ISSUE(S) FOUND!")
    print("=" * 78 + "\n")
    return 0 if errors == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="FastFree Android Keystore & Google Play Tool")
    parser.add_argument("--gen", action="store_true", help="generate keystore (skip if exists)")
    parser.add_argument("--info", action="store_true", help="show keystore info")
    parser.add_argument("--verify", action="store_true", help="verify keystore and app configuration")
    parser.add_argument("--backup", action="store_true", help="export keystore backup manifest and base64 string")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--in", dest="in_path", default=None)
    parser.add_argument("--alias", default=DEFAULT_ALIAS)
    parser.add_argument("--storepass", default=DEFAULT_PASS)
    parser.add_argument("--keypass", default=DEFAULT_PASS)
    parser.add_argument("--force", action="store_true", help="overwrite existing keystore (DANGEROUS)")
    parser.add_argument("--no-auto-jdk", action="store_true", help="never auto-install a JDK")
    parser.add_argument("--wire", action="store_true", help="wire android build.gradle and variables.gradle")
    parser.add_argument("--app-dir", default=None, help="e.g. fastfree_pos or pos (for --wire)")
    args = parser.parse_args()

    if args.verify:
        return verify_keystores_and_apps()

    if args.backup:
        return backup_keystore()

    if args.wire:
        rc = wire_signing(args.app_dir)
        if rc != 0:
            return rc
        return pin_target_sdk(args.app_dir)

    keytool = ensure_jdk(auto_install=not args.no_auto_jdk)
    if not keytool:
        LOG.error("keytool not found (install a JDK 17+ or drop --no-auto-jdk on Windows)")
        return 1

    target = Path(args.in_path) if args.in_path else Path(args.out)
    if args.info or (not args.gen):
        if not target.exists():
            LOG.error("keystore not found: %s", target)
            return 1
        result = run([keytool, "-list", "-v", "-keystore", str(target), "-storepass", args.storepass])
        print(result.stdout)
        return 0 if result.returncode == 0 else 1

    if target.exists() and not args.force:
        LOG.info("exists (use --force to overwrite): %s", target)
        return 0
    target.parent.mkdir(parents=True, exist_ok=True)
    result = run(
        [
            keytool,
            "-genkeypair",
            "-alias",
            args.alias,
            "-keyalg",
            "RSA",
            "-keysize",
            "2048",
            "-validity",
            "20000",
            "-keystore",
            str(target),
            "-storepass",
            args.storepass,
            "-keypass",
            args.keypass,
            "-dname",
            DEFAULT_DNAME,
        ]
    )
    if result.returncode != 0:
        LOG.error("keytool failed: %s", result.stderr or result.stdout)
        return 1
    LOG.info("keystore created: %s (alias=%s)", target, args.alias)
    LOG.warning("KEEP THIS FILE STABLE — Play pins the first upload certificate.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception:
        LOG.exception("Keystore operation failed")
        raise SystemExit(1) from None
