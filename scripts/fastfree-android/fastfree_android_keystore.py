"""Generate/inspect the ONE stable Android upload keystore.

Official method (Quasar docs: keytool RSA-2048, validity 20000, kept out
of version control and backed up — Play pins the first upload certificate).

Usage:
  uv run fastfree_android_keystore.py --gen [--out PATH]
  uv run fastfree_android_keystore.py --info [--in PATH]

Default output (git-ignored): .auth/signing/release.jks
Alias/key passwords default to FastFree@2026 to match CI wiring
(override with --storepass/--keypass/--alias).
On Windows without a JDK, Temurin 21 is auto-installed via winget
(disable with --no-auto-jdk).
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
DEFAULT_OUT = REPO_ROOT / ".auth" / "signing" / "release.jks"
DEFAULT_ALIAS = "fastfree"
DEFAULT_PASS = "FastFree@87171393"
DEFAULT_DNAME = "CN=FastFree, OU=IT, O=FastFree, L=Riyadh, ST=Riyadh, C=SA"
LOG_DIR = REPO_ROOT / ".auth" / "logs"


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
    found = shutil.which("keytool")
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
    # winget exits non-zero with "already installed" when the JDK exists
    # but this shell's PATH is stale — always re-resolve before giving up.
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


WIRE_MARKER = "// fastfree-signing (managed by fastfree_android_keystore.py --wire)"


def wire_signing(app_dir: str | None) -> int:
    """Inject release signingConfigs into android/app/build.gradle (idempotent).

    Reads ../keystore.properties written next to the android/ project dir
    (storeFile/storePassword/keyAlias/keyPassword), so bundleRelease signs
    the AAB with the SAME key as the APK instead of a throwaway debug key.
    """
    if not app_dir:
        LOG.error("--wire needs --app-dir (e.g. fastfree_pos)")
        return 1
    gradle = REPO_ROOT / "apps" / app_dir / "src-capacitor" / "android" / "app" / "build.gradle"
    if not gradle.exists():
        LOG.error("build.gradle not found (run cap add android first): %s", gradle)
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gen", action="store_true", help="generate keystore (skip if exists)")
    parser.add_argument("--info", action="store_true", help="show keystore info")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--in", dest="in_path", default=None)
    parser.add_argument("--alias", default=DEFAULT_ALIAS)
    parser.add_argument("--storepass", default=DEFAULT_PASS)
    parser.add_argument("--keypass", default=DEFAULT_PASS)
    parser.add_argument("--force", action="store_true", help="overwrite existing keystore")
    parser.add_argument("--no-auto-jdk", action="store_true", help="never auto-install a JDK")
    parser.add_argument("--wire", action="store_true", help="patch build.gradle to sign with release.jks")
    parser.add_argument("--app-dir", default=None, help="e.g. fastfree_pos (for --wire)")
    args = parser.parse_args()

    if args.wire:
        return wire_signing(args.app_dir)

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
