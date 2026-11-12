{ config, lib, pkgs, ... }:

let
  avahiCfg = config.fastfree.avahi;
in {
  config = lib.mkIf avahiCfg.enable {

    # ── Avahi Daemon ──────────────────────────────
    services.avahi = {
      enable = true;
      hostName = config.fastfree.identity.name;
      domainName = "local";

      # Physical LAN discovery (mDNS does not traverse Layer 3 WireGuard)
      allowPointToPoint = false;
      openFirewall = true;

      reflector = false;
      allowInterfaces = if avahiCfg.interfaces != [] then avahiCfg.interfaces else null;

      # Publishing
      publish = {
        enable = true;
        addresses = true;        # Publish A/AAAA records for .local
        workstation = true;      # Register _workstation._tcp
        domain = true;           # Announce domain
      };

      # NSS mDNS resolution — .local names
      nssmdns4 = true;
      nssmdns6 = false;
    };

    # ── systemd-resolved (coexistence with Avahi) ──
    services.resolved = {
      enable = true;
      settings = {
        Resolve = {
          LLMNR = "false";            # Avoid conflict with Avahi
          MulticastDNS = "off";       # Avahi handles mDNS
          DNS = "1.1.1.1 8.8.8.8";
          FallbackDNS = "9.9.9.9 149.112.112.112";
        };
      };
    };
  };
}
