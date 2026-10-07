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
    # Loopback app names: identical on every machine (each serves its own
    # apps locally). Names here MUST NOT duplicate legacy lines above.
    # backend.* has no shortcut (API only); website root keeps its direct
    # :9004 shortcut (root domain is legacy-mapped, avoid dual-mapping).
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
    # Local machines keep NetworkManager + firewall (see local-machine.nix).
    # NSS: `files` FIRST so /etc/hosts wins for our .local app names.
    # mDNS/DNS still resolve everything else (miss → continue down the chain).
    # Without this, mdns4_minimal [NOTFOUND=return] kills .local before files.
    networking = {
      hostName                     = config.fastfree.identity.name;
      hosts                        = hosts;
    } // lib.optionalAttrs (!isLocal) {
      firewall.enable              = false;
      useDHCP                      = false;
      useNetworkd                  = true;
    };

    # nsswitch files-first (see comment above). Duplicate `files` token is
    # harmless: glibc uses the first match and continues on miss.
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
