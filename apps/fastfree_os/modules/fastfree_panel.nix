{ config, lib, pkgs, inputs ? {}, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  spaDir = "/srv/fastfree-panel";
  backendDir = "/var/lib/fastfree-panel/backend";
  assetName = "fastfree-panel.tar.gz";
  tarball = "/tmp/${assetName}";
  staging = "/tmp/fastfree-panel-bundle.new";
  stagingRoot = "/srv/.fastfree-panel-staging";
  sourceDir = "/root/fastfree-source/apps/fastfree_panel";
in
{
  config = lib.mkIf config.fastfree.apps.fastfree_panel {
    environment.etc."clan/clan.nix".source = ../clan.nix;
    environment.etc."clan/flake.nix".source = ../flake.nix;

    environment.systemPackages = [
      inputs.clan-core.packages.${pkgs.stdenv.hostPlatform.system}.clan-cli
    ];

    systemd.tmpfiles.rules = [
      "d ${spaDir} 0755 root root -"
      "d ${backendDir} 0755 root root -"
    ];

    systemd.services."fastfree-panel-setup" = {
      description = "Ensure Panel SPA and backend assets are synced";
      wantedBy = [ "multi-user.target" ];
      before = [ "fastfree-panel.service" "caddy.service" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.coreutils pkgs.curl pkgs.gnutar pkgs.gzip pkgs.jq ];
      script = ''
        mkdir -p "${spaDir}" "${backendDir}"

        # Remove any leftover staging/swap dirs from a previous interrupted run.
        rm -rf "${spaDir}.new" "${spaDir}.old" "${backendDir}.new" "${backendDir}.old" "${staging}"

        rm -f "${tarball}"
        RELEASE_TAG=""
        ASSET_NAME="${assetName}"
        AUTH_HEADER=""
        if [ -s /etc/fastfree/github-token ]; then
          AUTH_HEADER="Authorization: Bearer $(cat /etc/fastfree/github-token)"
        fi

        if RELEASE_JSON=$(curl -fsSL -H "User-Agent: FastFree" ''${AUTH_HEADER:+-H "$AUTH_HEADER"} --max-time 30 "https://api.github.com/repos/${ghAccount}/fastfree/releases?per_page=100" 2>/dev/null); then
          RELEASE_TAG=$(printf '%s' "''${RELEASE_JSON}" | ${pkgs.jq}/bin/jq -r --arg a "''${ASSET_NAME}" '[.[] | select(any(.assets[]?; .name == $a))] | sort_by(.published_at // .created_at // "") | last | .tag_name // ""' 2>/dev/null || true)
        fi

        download_ok=0
        if [ -n "''${RELEASE_TAG}" ]; then
          TARBALL_URL="https://github.com/${ghAccount}/fastfree/releases/download/''${RELEASE_TAG}/''${ASSET_NAME}"
          echo "[fastfree-panel] Downloading release ''${RELEASE_TAG} ..."
          if curl -fsSL -H "User-Agent: FastFree" ''${AUTH_HEADER:+-H "$AUTH_HEADER"} --max-time 180 "''${TARBALL_URL}" -o "${tarball}"; then
            download_ok=1
          else
            echo "[fastfree-panel] Download failed for tag ''${RELEASE_TAG}"
            rm -f "${tarball}"
          fi
        else
          echo "[fastfree-panel] No release carrying ''${ASSET_NAME} found via GitHub API"
        fi

        # Direct fallback (works reliably even if GitHub API is rate-limited)
        if [ "''${download_ok}" -eq 0 ]; then
          FALLBACK_URL="https://github.com/${ghAccount}/fastfree/releases/latest/download/''${ASSET_NAME}"
          echo "[fastfree-panel] Falling back to latest download URL: ''${FALLBACK_URL} ..."
          if curl -fsSL -H "User-Agent: FastFree" ''${AUTH_HEADER:+-H "$AUTH_HEADER"} --max-time 180 "''${FALLBACK_URL}" -o "${tarball}"; then
            download_ok=1
          else
            echo "[fastfree-panel] Direct download fallback failed."
            rm -f "${tarball}"
          fi
        fi

        # A working previous version always beats a placeholder.
        valid_local=0
        if [ -d "${spaDir}" ] && [ -f "${spaDir}/index.html" ] && [ -d "${backendDir}/dist" ] && [ -f "${backendDir}/dist/server.js" ]; then
          valid_local=1
        fi

        if [ "''${download_ok}" -eq 1 ]; then
          # Extract into /tmp staging, validate, then move the new content to .new dirs
          # ADJACENT to the live dirs (same filesystem) while the old dirs are still intact.
          # Only then do the atomic same-filesystem rename swap. On any failure the live
          # copy stays untouched and no live directory is left missing.
          rm -rf "${staging}"; mkdir -p "${staging}"
          if tar -xzf "${tarball}" -C "${staging}"; then
            if [ -d "${staging}/spa" ] && [ -f "${staging}/spa/index.html" ] && [ -d "${staging}/backend/dist" ] && [ -f "${staging}/backend/dist/server.js" ]; then
              rm -f "${tarball}"
              # Stage the extracted tree inside /srv FIRST (same filesystem as the live
              # dirs) so the final swap is a real rename, not a cross-device copy.
              # The live dirs stay fully intact while we copy.
              rm -rf "${stagingRoot}"
              mkdir -p "${stagingRoot}"
              cp -a "${staging}/." "${stagingRoot}/"
              rm -rf "${staging}"
              # Swap each directory with a rollback guard: if a promote fails we restore
              # the previous copy instead of leaving the service with nothing.
              swap_dir() {
                # $1 = live dir, $2 = staged dir
                rm -rf "$1.old"
                mv "$1" "$1.old" 2>/dev/null || true
                if mv "$2" "$1" 2>/dev/null; then
                  rm -rf "$1.old"
                  return 0
                fi
                mv "$1.old" "$1" 2>/dev/null || true
                return 1
              }
              swap_ok=1
              swap_dir "${spaDir}" "${stagingRoot}/spa" || swap_ok=0
              swap_dir "${backendDir}" "${stagingRoot}/backend" || swap_ok=0
              rm -rf "${stagingRoot}"
              if [ "''${swap_ok}" -eq 1 ]; then
                echo "[fastfree-panel] Swapped in release tarball (atomically)."
                valid_local=1
              else
                echo "[fastfree-panel] Swap failed; previous copy restored."
                if [ -d "${spaDir}" ] && [ -f "${spaDir}/index.html" ] && [ -d "${backendDir}/dist" ] && [ -f "${backendDir}/dist/server.js" ]; then
                  valid_local=1
                fi
              fi
            else
              echo "[fastfree-panel] Tarball validation failed; keeping live copy"
              rm -rf "${staging}"
            fi
          else
            echo "[fastfree-panel] Tar extraction failed; keeping live copy"
            rm -rf "${staging}"
          fi
        fi

        if [ "''${valid_local}" -eq 0 ]; then
          # Fallback to local source copy.
          echo "[fastfree-panel] No valid local copy. Checking local build source..."
          if [ -d "${sourceDir}/dist/spa" ]; then
            cp -rf "${sourceDir}/dist/spa/"* "${spaDir}/" 2>/dev/null || true
          fi
          if [ -d "${sourceDir}/backend/dist" ]; then
            mkdir -p "${backendDir}/dist"
            cp -rf "${sourceDir}/backend/dist/"* "${backendDir}/dist/" 2>/dev/null || true
            cp -f "${sourceDir}/backend/package.json" "${backendDir}/" 2>/dev/null || true
          fi
          if [ -d "${spaDir}" ] && [ -f "${spaDir}/index.html" ] && [ -d "${backendDir}/dist" ] && [ -f "${backendDir}/dist/server.js" ]; then
            valid_local=1
            echo "[fastfree-panel] Restored from local source."
          fi
        fi

        if [ "''${valid_local}" -eq 0 ]; then
          echo "[fastfree-panel] Writing placeholder (no release, no local source)."
          if [ ! -f "${spaDir}/index.html" ]; then
            printf '%s\n' '<!DOCTYPE html>' '<html><head><meta charset="utf-8"><title>FastFree Clan OS</title></head>' '<body><div id="q-app"><h1>FastFree Clan OS</h1><p>Panel is initializing...</p></div></body></html>' > "${spaDir}/index.html"
          fi
        fi

        # Ensure dependencies exist for panel backend as safety fallback
        if [ -f "${backendDir}/package.json" ] && [ ! -d "${backendDir}/node_modules/hono" ]; then
          echo "[fastfree-panel] Installing production dependencies for Panel Backend..."
          cd "${backendDir}"
          timeout 300 ${pkgs.nodejs_22}/bin/npm install --omit=dev --legacy-peer-deps --no-audit --no-fund 2>&1 || true
        fi

        chmod -R 755 "${spaDir}" "${backendDir}" 2>/dev/null || true
      '';
    };

    systemd.services.fastfree-panel = {
      description = "FastFree Clan Panel Private API Backend";
      after = [ "network-online.target" "fastfree-panel-setup.service" ];
      wants = [ "network-online.target" ];
      requires = [ "fastfree-panel-setup.service" ];
      wantedBy = [ "multi-user.target" ];
      path = with pkgs; [
        nodejs_22
        inputs.clan-core.packages.${pkgs.stdenv.hostPlatform.system}.clan-cli
        git
        nix
        jq
      ];
      environment = {
        NODE_ENV = "production";
        CLAN_PANEL_API_HOST = "127.0.0.1";
        CLAN_PANEL_API_PORT = "9099";
        CLAN_DIR = "/root/fastfree-source/apps/fastfree_os";
      };
      serviceConfig = {
        Restart = "on-failure";
        RestartSec = "5s";
        WorkingDirectory = backendDir;
        ExecStart = "${pkgs.nodejs_22}/bin/node ${backendDir}/dist/server.js";
      };
    };
  };
}
