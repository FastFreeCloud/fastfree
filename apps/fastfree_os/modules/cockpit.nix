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
      # Never expose the root-equivalent panel publicly: loopback only,
      # served to the LAN/internet through Caddy (panel subdomain) with TLS.
      # Container port publishes bypass the firewall, so bind them too.
      openFirewall = false;
      settings = {
        WebService = {
          Origins = lib.mkForce "${panelUrl} http://localhost:9090";
        };
      };
    };

    # Cockpit socket listens on *:9090 by default — restrict to loopback.
    systemd.sockets.cockpit.listenStreams = lib.mkForce [ "127.0.0.1:9090" ];

    # Cockpit plugins for container and VM management
    environment.systemPackages = with pkgs; [
      cockpit-podman
      cockpit-machines
    ];

    # Allow cockpit-ws to run polkit agent for privilege escalation
    security.polkit.enable = true;
  };
}
