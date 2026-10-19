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
      path = [ pkgs.coreutils pkgs.curl pkgs.gnutar pkgs.gzip pkgs.jq ];
      script = ''
        mkdir -p "${spaDir}"
        RELEASE_TAG=""
        if RELEASE_JSON=$(curl -fsSL --max-time 30 "https://api.github.com/repos/${ghAccount}/fastfree/releases?per_page=100" 2>/dev/null); then
          RELEASE_TAG=$(printf '%s' "\${RELEASE_JSON}" | jq -r --arg a "fastfree-pos.tar.gz" \
            '[.[] | select(any(.assets[]?; .name == $a))] | sort_by(.published_at // .created_at // "") | last | .tag_name // ""' 2>/dev/null || true)
        fi
        if [ -n "\${RELEASE_TAG}" ]; then
          TARBALL_URL="https://github.com/${ghAccount}/fastfree/releases/download/\${RELEASE_TAG}/fastfree-pos.tar.gz"
          rm -rf "${spaDir}.new"; mkdir -p "${spaDir}.new"
          if curl -fsSL --max-time 30 "\${TARBALL_URL}" -o /tmp/fastfree-pos.tar.gz 2>/dev/null \
             && tar -xzf /tmp/fastfree-pos.tar.gz -C "${spaDir}.new" \
             && [ -f "${spaDir}.new/index.html" ]; then
            rm -f /tmp/fastfree-pos.tar.gz
            mv "${spaDir}" "${spaDir}.old" 2>/dev/null || true
            if mv "${spaDir}.new" "${spaDir}"; then
              rm -rf "${spaDir}.old"
              echo "POS SPA extracted from release tarball \${RELEASE_TAG}."
            else
              mv "${spaDir}.old" "${spaDir}" 2>/dev/null || true
              rm -rf "${spaDir}.new"
              echo "POS SPA swap failed; keeping existing copy."
            fi
          else
            rm -rf "${spaDir}.new"
            rm -f /tmp/fastfree-pos.tar.gz
            echo "POS SPA tarball download or validation failed; keeping existing copy."
          fi
        fi
        if [ ! -f "${spaDir}/index.html" ]; then
          echo "Creating placeholder index.html for POS SPA..."
          cat > "${spaDir}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>FastFree POS</title></head>
<body><div id="q-app"><h1>FastFree POS</h1><p>Application is ready for deployment.</p></div></body>
</html>
EOF
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
