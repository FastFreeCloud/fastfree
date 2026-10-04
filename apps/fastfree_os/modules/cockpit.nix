{ config, lib, pkgs, ... }:

let
  domain = config.fastfree.identity.domain;
  panelSubdomain = config.fastfree.subdomains.panel;
  panelUrl = "https://${panelSubdomain}.${domain}";
in
{
  config = lib.mkIf config.fastfree.apps.cockpit {
    services.cockpit = {
      enable = true;
      port = 9090;
      openFirewall = true;
      settings = {
        WebService = {
          Origins = lib.mkForce "${panelUrl} http://localhost:9090";
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
    networking.firewall.allowedTCPPorts = [ 9090 ];
  };
}
