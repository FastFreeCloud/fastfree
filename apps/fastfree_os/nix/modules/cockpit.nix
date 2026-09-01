{ config, lib, pkgs, ... }:

let
  cfg = config.apps.cockpit;
  domain = config.fastfree.identity.domain;
  panelSubdomain = config.fastfree.subdomains.panel;
  panelUrl = "https://${panelSubdomain}.${domain}";
in
{
  options.apps.cockpit = {
    enable = lib.mkEnableOption "Cockpit web-based server management";
    port = lib.mkOption {
      type = lib.types.port;
      default = 9090;
      description = "Port for Cockpit web interface";
    };
  };

  config = lib.mkIf cfg.enable {
    services.cockpit = {
      enable = true;
      port = cfg.port;
      openFirewall = true;
      settings = {
        WebService = {
          Origins = lib.mkForce "${panelUrl} http://localhost:${toString cfg.port}";
        };
      };
    };

    # Cockpit plugins for container and VM management
    environment.systemPackages = with pkgs; [
      cockpit-podman
      cockpit-machines
    ];

    # Allow cockpit-ws to run polkit agent for privilege escalation
    security.polkit.enable = true;

    # Open firewall port
    networking.firewall.allowedTCPPorts = [ cfg.port ];
  };
}
