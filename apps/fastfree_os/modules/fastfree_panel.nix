{ config, lib, pkgs, inputs ? {}, ... }:

let
  spaDir = "/srv/fastfree-panel";
  backendDir = "/var/lib/fastfree-panel/backend";
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
      path = [ pkgs.coreutils ];
      script = ''
        mkdir -p "${spaDir}" "${backendDir}"
        if [ -d "/root/fastfree-source/apps/fastfree_panel/dist/spa" ]; then
          cp -rf /root/fastfree-source/apps/fastfree_panel/dist/spa/* "${spaDir}/" 2>/dev/null || true
        fi
        if [ -d "/root/fastfree-source/apps/fastfree_panel/backend/dist" ]; then
          mkdir -p "${backendDir}/dist"
          cp -rf /root/fastfree-source/apps/fastfree_panel/backend/dist/* "${backendDir}/dist/" 2>/dev/null || true
          cp -f /root/fastfree-source/apps/fastfree_panel/backend/package.json "${backendDir}/" 2>/dev/null || true
        fi
        if [ ! -f "${spaDir}/index.html" ]; then
          cat > "${spaDir}/index.html" << 'EOF'
<!DOCTYPE html><html><head><meta charset="utf-8"><title>FastFree Clan OS</title></head><body><div id="q-app"><h1>FastFree Clan OS</h1><p>Panel is initializing...</p></div></body></html>
EOF
        fi
        chmod -R 755 "${spaDir}" "${backendDir}" 2>/dev/null || true
      '';
    };

    systemd.services.fastfree-panel = {
      description = "FastFree Clan Panel Private API Backend";
      after = [ "network-online.target" "fastfree-panel-setup.service" ];
      wants = [ "network-online.target" "fastfree-panel-setup.service" ];
      wantedBy = [ "multi-user.target" ];
      path = with pkgs; [
        nodejs_22
        inputs.clan-core.packages.${pkgs.stdenv.hostPlatform.system}.clan-cli
        git
        nix
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
