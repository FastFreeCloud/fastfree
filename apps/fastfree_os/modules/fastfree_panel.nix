{ config, lib, pkgs, inputs ? {}, ... }:

{
  config = lib.mkIf config.fastfree.apps.fastfree_panel {
    environment.etc."clan/clan.nix".source = ../clan.nix;
    environment.etc."clan/flake.nix".source = ../flake.nix;

    systemd.services.fastfree-panel = {
      description = "FastFree Clan Panel Private API Backend";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      path = with pkgs; [
        nodejs_22
        inputs.clan-core.packages.${pkgs.stdenv.hostPlatform.system}.clan-cli
        git
      ];
      environment = {
        NODE_ENV = "production";
        CLAN_PANEL_API_HOST = "127.0.0.1";
        CLAN_PANEL_API_PORT = "9099";
        CLAN_DIR = "/etc/clan";
      };
      serviceConfig = {
        DynamicUser = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectControlGroups = true;
        NoNewPrivileges = true;
        MemoryMax = "256M";
        CPUQuota = "50%";
        Restart = "on-failure";
        RestartSec = "3s";
        ExecStart = "${pkgs.nodejs_22}/bin/node /var/lib/fastfree-panel/backend/dist/server.js";
      };
    };
  };
}
