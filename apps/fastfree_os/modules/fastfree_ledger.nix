{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  spaDir = "/srv/fastfree-ledger";
in {
  config = lib.mkIf config.fastfree.apps.fastfree_ledger {

    systemd.tmpfiles.rules = [
      "d ${spaDir} 0755 root root -"
    ];

    systemd.services."fastfree-ledger-spa" = {
      description = "Ensure Ledger SPA directory and assets exist";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.coreutils pkgs.curl pkgs.gnutar pkgs.gzip ];
      script = ''
        mkdir -p "${spaDir}"
        if [ ! -f "${spaDir}/index.html" ]; then
          echo "Ledger SPA index.html not found in ${spaDir}. Checking for GitHub release tarball..."
          TARBALL_URL="https://github.com/${ghAccount}/fastfree/releases/latest/download/fastfree-ledger.tar.gz"
          if curl -fsSL "$TARBALL_URL" -o /tmp/fastfree-ledger.tar.gz 2>/dev/null; then
            tar -xzf /tmp/fastfree-ledger.tar.gz -C "${spaDir}"
            rm -f /tmp/fastfree-ledger.tar.gz
            echo "Ledger SPA extracted from release tarball."
          else
            echo "Creating placeholder index.html for Ledger SPA..."
            cat > "${spaDir}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>FastFree Ledger</title></head>
<body><div id="q-app"><h1>FastFree Ledger</h1><p>Application is ready for deployment.</p></div></body>
</html>
EOF
          fi
        fi
        echo "Ledger SPA directory ready at ${spaDir}"
      '';
    };

    systemd.services.caddy = {
      after = [ "fastfree-ledger-spa.service" ];
      wants = [ "fastfree-ledger-spa.service" ];
    };
  };
}
