{ config, lib, pkgs, ... }:

let
  domain = config.fastfree.identity.domain;
  sd = config.fastfree.subdomains;
  hosts = {
    "10.24.0.1" = [ "client1.fastfree.local" ];
    # Loopback app names (same on every machine for local resolution)
    "127.0.0.1" = [
      "backend.${domain}"
      "panel.${domain}"
      "ledger.${domain}"
      "erp.${domain}"
      "hr.${domain}"
      "pos.${domain}"
    ];
  };
  isLocal = config.fastfree.deployType == "local";
in {
  config = lib.mkIf config.fastfree.apps.base {

    # ── Networking ────────────────────────────────────────
    # Local machines keep NetworkManager + firewall.
    # NSS files-first so /etc/hosts wins for .local app names
    # (mdns4_minimal NOTFOUND would otherwise kill them before files).
    networking = {
      hostName                     = config.fastfree.identity.name;
      hosts                        = hosts;
    } // lib.optionalAttrs (!isLocal) {
      firewall.enable              = true;
      useDHCP                      = false;
      useNetworkd                  = true;
    };

    # Duplicate `files` token is harmless (first match wins, miss continues).
    system.nssDatabases.hosts = lib.mkOrder 400 [ "files" ];

    # Hyper-V appliances / systemd-networkd (local uses NetworkManager)
    systemd.network = lib.mkIf (!isLocal) {
      enable = true;

      # Prevent systemd-networkd-wait-online from blocking boot if extra NICs are unplugged
      wait-online = {
        enable = lib.mkDefault true;
        anyInterface = true;
        timeout = 15;
      };

      # DHCP mode (no static IP configured)
      networks."10-wan" = lib.mkIf (config.fastfree.networking.ipv4Address == "") {
        matchConfig = {
          Name = if config.fastfree.networking.interface != ""
            then "${config.fastfree.networking.interface} en* eth*"
            else "en* eth*";
          Type = "ether";
        };
        networkConfig = {
          DHCP = "yes";
          DNS = config.fastfree.networking.nameservers;
        };
        dhcpConfig = {
          UseDNS = true;
        };
      };
      # Universal WAN (Static IP with automatic DHCP fallback)
      networks."10-wan-static" = lib.mkIf (config.fastfree.networking.ipv4Address != "") {
        matchConfig = {
          Name = if config.fastfree.networking.interface != ""
            then "${config.fastfree.networking.interface} en* eth*"
            else "en* eth*";
          Type = "ether";
        };
        networkConfig = {
          DHCP = "yes";
          DNS = config.fastfree.networking.nameservers;
          DNSSEC = "allow-downgrade";
          DNSOverTLS = "opportunistic";
          IPv6AcceptRA = true;
        };
        dhcpConfig = {
          UseRoutes = true;
          RouteMetric = 1024;
        };
        address = [ "${config.fastfree.networking.ipv4Address}/${toString config.fastfree.networking.ipv4Prefix}" ];
        routes = lib.optional (config.fastfree.networking.ipv4Gateway != "") {
          Gateway = config.fastfree.networking.ipv4Gateway;
          GatewayOnLink = true;
          Metric = 100;
        };
      };
    };
  };
}
