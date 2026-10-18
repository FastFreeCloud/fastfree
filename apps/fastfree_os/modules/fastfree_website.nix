{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  siteDir = "/srv/fastfree-website";
in
{
  config = lib.mkIf config.fastfree.apps.fastfree_website {

    # Ensure website root directory exists
    systemd.tmpfiles.rules = [
      "d ${siteDir} 0755 root root -"
    ];

    # Setup service to ensure Next.js production build bundle exists
    systemd.services."fastfree-website-setup" = {
      description = "Ensure FastFree Website bundle exists";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.coreutils pkgs.curl pkgs.gnutar pkgs.gzip pkgs.nodejs_22 ];
      script = ''
        mkdir -p "${siteDir}"

        # Clean up any legacy fallback portal files
        rm -f "${siteDir}/portal.js"

        if [ ! -d "${siteDir}/.next" ]; then
          echo "FastFree Website .next not found in ${siteDir}. Downloading release tarball..."
          TARBALL_URL="https://github.com/${ghAccount}/fastfree/releases/latest/download/fastfree-website.tar.gz"
          if curl -fsSL "$TARBALL_URL" -o /tmp/fastfree-website.tar.gz 2>/dev/null; then
            tar -xzf /tmp/fastfree-website.tar.gz -C "${siteDir}"
            rm -f /tmp/fastfree-website.tar.gz
            echo "FastFree Website extracted from release tarball."
          else
            echo "Checking for local build in source repository..."
            if [ -d "/root/fastfree-source/apps/fastfree_website/.next" ]; then
              cp -rf /root/fastfree-source/apps/fastfree_website/.next "${siteDir}/"
              cp -rf /root/fastfree-source/apps/fastfree_website/public "${siteDir}/"
              cp -f /root/fastfree-source/apps/fastfree_website/package.json "${siteDir}/"
            fi
          fi
        fi

        # Ensure dependencies exist for next start
        if [ -f "${siteDir}/package.json" ] && [ ! -d "${siteDir}/node_modules/next" ]; then
          echo "Installing production dependencies for Next.js website..."
          cd "${siteDir}"
          ${pkgs.nodejs_22}/bin/npm install --omit=dev --legacy-peer-deps --no-audit --no-fund 2>&1 || true
        fi

        chmod -R 755 "${siteDir}" 2>/dev/null || true
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
