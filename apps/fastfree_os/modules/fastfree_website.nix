{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  siteDir = "/srv/fastfree-website";
  assetName = "fastfree-website.tar.gz";
  tarball = "/tmp/${assetName}";
  sourceDir = "/root/fastfree-source/apps/fastfree_website";
in
{
  config = lib.mkIf config.fastfree.apps.fastfree_website {

    # Ensure website root directory exists
    systemd.tmpfiles.rules = [
      "d ${siteDir} 0755 root root -"
    ];

    # Setup service to ensure Next.js production build bundle exists.
    # Preferred path: download the release tarball that actually carries our asset,
    # resolved per-asset via the GitHub releases API (never "releases/latest/download").
    # Fallback: local source copy. Placeholder only as last resort.
    # The download is attempted on every start so a broken or placeholder copy is repaired.
    systemd.services."fastfree-website-setup" = {
      description = "Ensure FastFree Website bundle exists";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.coreutils pkgs.curl pkgs.gnutar pkgs.gzip pkgs.nodejs_22 pkgs.jq ];
      script = ''
        mkdir -p "${siteDir}"

        # Clean up any legacy fallback portal files
        rm -f "${siteDir}/portal.js"

        rm -f "''${tarball}"
        RELEASE_TAG=""
        ASSET_NAME="${assetName}"
        if RELEASE_JSON=$(curl -fsSL --max-time 30 "https://api.github.com/repos/${ghAccount}/fastfree/releases?per_page=100" 2>/dev/null); then
          RELEASE_TAG=$(printf '%s' "''${RELEASE_JSON}" | ${pkgs.jq}/bin/jq -r --arg a "''${ASSET_NAME}" '[.[] | select(any(.assets[]?; .name == $a))] | sort_by(.published_at // .created_at // "") | last | .tag_name // ""' 2>/dev/null || true)
        fi

        download_ok=0
        if [ -n "''${RELEASE_TAG}" ]; then
          TARBALL_URL="https://github.com/${ghAccount}/fastfree/releases/download/''${RELEASE_TAG}/''${ASSET_NAME}"
          echo "[fastfree-website] Downloading release ''${RELEASE_TAG} ..."
          if curl -fsSL --max-time 120 "''${TARBALL_URL}" -o "''${tarball}" 2>/dev/null; then
            download_ok=1
          else
            echo "[fastfree-website] Download failed for tag ''${RELEASE_TAG}"
            rm -f "''${tarball}"
          fi
        else
          echo "[fastfree-website] No release carrying ''${ASSET_NAME} found via GitHub API"
        fi

        # A working previous version always beats a placeholder.
        valid_local=0
        if [ -d "${siteDir}/.next" ] && [ -f "${siteDir}/package.json" ]; then
          valid_local=1
        fi

        if [ "''${download_ok}" -eq 1 ]; then
          # Extract atomically into a staging dir adjacent to the live dir (same filesystem),
          # validate, then swap. On any failure the staging dir is removed and the live copy
          # stays untouched.
          rm -rf "${siteDir}.new"; mkdir -p "${siteDir}.new"
          if tar -xzf "''${tarball}" -C "${siteDir}.new"; then
            if [ -d "${siteDir}.new/.next" ] && [ -f "${siteDir}.new/package.json" ]; then
              rm -f "''${tarball}"
              # Park the live dir, then promote the new one. If the promote fails we put
              # the previous copy back instead of leaving the site with no files.
              rm -rf "${siteDir}.old"
              mv "${siteDir}" "${siteDir}.old" 2>/dev/null || true
              if mv "${siteDir}.new" "${siteDir}" 2>/dev/null; then
                rm -rf "${siteDir}.old"
                echo "[fastfree-website] Swapped in release tarball (atomically)."
                valid_local=1
              else
                mv "${siteDir}.old" "${siteDir}" 2>/dev/null || true
                rm -rf "${siteDir}.new"
                echo "[fastfree-website] Swap failed; previous copy restored."
                if [ -d "${siteDir}/.next" ] && [ -f "${siteDir}/package.json" ]; then
                  valid_local=1
                fi
              fi
            else
              echo "[fastfree-website] Tarball validation failed; keeping live copy"
              rm -rf "${siteDir}.new"
            fi
          else
            echo "[fastfree-website] Tar extraction failed; keeping live copy"
            rm -rf "${siteDir}.new"
          fi
        fi

        if [ "''${valid_local}" -eq 0 ]; then
          # No valid copy: fall back to local source, then placeholder.
          echo "[fastfree-website] No valid local copy. Checking local build source..."
          if [ -d "${sourceDir}/.next" ]; then
            cp -rf "${sourceDir}/.next" "${siteDir}/"
            cp -rf "${sourceDir}/public" "${siteDir}/"
            cp -f "${sourceDir}/package.json" "${siteDir}/"
            if [ -d "${siteDir}/.next" ] && [ -f "${siteDir}/package.json" ]; then
              valid_local=1
              echo "[fastfree-website] Restored from local source."
            fi
          fi
        fi

        if [ "''${valid_local}" -eq 0 ]; then
          echo "[fastfree-website] Writing placeholder (no release, no local source)."
          printf '%s\n' 'const http = require("http");' 'const port = Number(process.env.PORT || 9004);' 'const server = http.createServer((req, res) => {' '  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });' '  res.end("<h1>FastFree Website</h1><p>Initializing... awaiting release bundle.</p>");' '});' 'server.listen(port, "127.0.0.1", () => console.log("[fastfree-website] placeholder server on " + port));' > "${siteDir}/server.js"
        fi

        # Ensure dependencies exist for next start
        if [ -f "${siteDir}/package.json" ] && [ ! -d "${siteDir}/node_modules/next" ]; then
          echo "Installing production dependencies for Next.js website..."
          cd "${siteDir}"
          timeout 600 ${pkgs.nodejs_22}/bin/npm install --omit=dev --legacy-peer-deps --no-audit --no-fund 2>&1 || true
        fi

        chmod -R 755 "${siteDir}/.next" "${siteDir}/public" 2>/dev/null || true
      '';
    };

    # Native Systemd service running Next.js production server on port 9004 (Zero Podman)
    systemd.services.fastfree-website = {
      description = "FastFree Website (Next.js Production Server)";
      after = [ "network-online.target" "fastfree-website-setup.service" ];
      wants = [ "network-online.target" "fastfree-website-setup.service" ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        NODE_ENV = "production";
        PORT = "9004";
        HOSTNAME = "127.0.0.1";
      };
      serviceConfig = {
        DynamicUser = false;
        User = "root";
        Group = "root";
        WorkingDirectory = "${siteDir}";
        Restart = "always";
        RestartSec = "5s";
        ExecStart = pkgs.writeShellScript "fastfree-website-start" ''
          cd "${siteDir}"
          if [ -f "${siteDir}/node_modules/next/dist/bin/next" ]; then
            echo "[fastfree-website] Starting Next.js production server via next binary on 127.0.0.1:9004..."
            exec ${pkgs.nodejs_22}/bin/node "${siteDir}/node_modules/next/dist/bin/next" start -p 9004 -H 127.0.0.1
          elif [ -f "${siteDir}/server.js" ]; then
            echo "[fastfree-website] Starting Next.js server on 127.0.0.1:9004..."
            exec ${pkgs.nodejs_22}/bin/node "${siteDir}/server.js"
          else
            echo "[fastfree-website] Waiting for assets to initialize..."
            sleep 5
            exit 1
          fi
        '';
      };
    };

    systemd.services.caddy = {
      after = [ "fastfree-website.service" ];
      wants = [ "fastfree-website.service" ];
    };
  };
}
