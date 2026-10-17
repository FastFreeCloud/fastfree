{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.fastfree_website {

    # Ensure website root directory exists
    systemd.tmpfiles.rules = [
      "d /srv/fastfree-website 0755 root root -"
    ];

    # Native Systemd service running Next.js standalone server on port 9004 (Zero Podman)
    systemd.services.fastfree-website = {
      description = "FastFree Website (Next.js Standalone)";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        NODE_ENV = "production";
        PORT = "9004";
        HOSTNAME = "127.0.0.1";
      };
      serviceConfig = {
        DynamicUser = true;
        WorkingDirectory = "/srv/fastfree-website";
        Restart = "on-failure";
        RestartSec = "5s";
        ExecStartPre = pkgs.writeShellScript "fastfree-website-prestart" ''
          if [ ! -f /srv/fastfree-website/server.js ]; then
            mkdir -p /srv/fastfree-website
            cat > /srv/fastfree-website/server.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>FastFree Website</h1><p>Website is initializing...</p>');
});
server.listen(9004, '127.0.0.1');
EOF
          fi
        '';
        ExecStart = "${pkgs.nodejs_22}/bin/node /srv/fastfree-website/server.js";
      };
    };
  };
}
