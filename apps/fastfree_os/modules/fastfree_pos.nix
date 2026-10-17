{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  spaDir = "/srv/fastfree-pos";
in {
  config = lib.mkIf config.fastfree.apps.fastfree_pos {

    systemd.tmpfiles.rules = [
      "d ${spaDir} 0755 root root -"
    ];

    systemd.services."fastfree-pos-spa" = {
      description = "Ensure POS SPA directory and assets exist";
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
          echo "POS SPA index.html not found in ${spaDir}. Checking for GitHub release tarball..."
          TARBALL_URL="https://github.com/${ghAccount}/fastfree/releases/latest/download/fastfree-pos.tar.gz"
          if curl -fsSL "$TARBALL_URL" -o /tmp/fastfree-pos.tar.gz 2>/dev/null; then
            tar -xzf /tmp/fastfree-pos.tar.gz -C "${spaDir}"
            rm -f /tmp/fastfree-pos.tar.gz
            echo "POS SPA extracted from release tarball."
          else
            echo "Creating placeholder index.html for POS SPA..."
            cat > "${spaDir}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>FastFree POS</title></head>
<body><div id="q-app"><h1>FastFree POS</h1><p>Application is ready for deployment.</p></div></body>
</html>
EOF
          fi
        fi
        echo "POS SPA directory ready at ${spaDir}"
      '';
    };

    systemd.services.caddy = {
      after = [ "fastfree-pos-spa.service" ];
      wants = [ "fastfree-pos-spa.service" ];
    };
  };
}
