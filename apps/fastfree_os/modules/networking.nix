{ config, lib, pkgs, ... }:

let
  domain = config.fastfree.identity.domain;
  sd = config.fastfree.subdomains;
  hosts = {
    "10.100.0.1" = [ "fastfree.local" ];
    "10.100.0.3" = [ "server.fastfree.local" ];
    "10.100.0.6" = [ "client1.fastfree.local" ];
    "10.100.0.7" = [ "client2.fastfree.local" ];
    "10.100.0.8" = [ "nixos.fastfree.local" ];
    # Loopback app names (same on every machine). MUST NOT duplicate
    # legacy lines above; website root keeps its direct :9004 shortcut.
    "127.0.0.1" = [
      "erp.${domain}"
      "ledger.${domain}"
      "hr.${domain}"
      "pos.${domain}"
      "${sd.db}.${domain}"
      "${sd.panel}.${domain}"
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
      firewall.enable              = false;
      useDHCP                      = false;
      useNetworkd                  = true;
    };

    # Duplicate `files` token is harmless (first match wins, miss continues).
    system.nssDatabases.hosts = lib.mkOrder 400 [ "files" ];

    # VPS/systemd-networkd for servers only (local uses NetworkManager)
    systemd.network = lib.mkIf (!isLocal) {
      enable = true;
      # DHCP mode (no static IP configured)
      networks."10-wan" = lib.mkIf (config.fastfree.networking.ipv4Address == "") {
        matchConfig.Name = config.fastfree.networking.interface;
        networkConfig = {
          DHCP = "yes";
          DNS = config.fastfree.networking.nameservers;
        };
        dhcpConfig = {
          UseDNS = true;
        };
      };
      # Static IP mode
      networks."10-wan-static" = lib.mkIf (config.fastfree.networking.ipv4Address != "") {
        matchConfig.Name = config.fastfree.networking.interface;
        networkConfig = {
          DHCP = "no";
          DNS = config.fastfree.networking.nameservers;
          DNSSEC = "allow-downgrade";
          DNSOverTLS = "opportunistic";
        };
        address = [ "${config.fastfree.networking.ipv4Address}/${toString config.fastfree.networking.ipv4Prefix}" ];
        routes = [
          {
            Gateway = config.fastfree.networking.ipv4Gateway;
            GatewayOnLink = true;
          }
        ];
      };
    };
  };
}
