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

      # WireGuard support — point-to-point interfaces
      allowPointToPoint = true;
      openFirewall = true;

      # Reflection between LAN <-> WireGuard
      reflector = avahiCfg.reflector;
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
        };
      };
    };

    # ── WireGuard multicast for mDNS ──────────────
    systemd.services.avahi-wg-multicast = lib.mkIf config.fastfree.wireguard.enable {
      description = "Enable multicast on WireGuard interface for mDNS";
      wantedBy = [ "multi-user.target" ];
      after = [ "wireguard-wg0.service" ];
      serviceConfig.Type = "oneshot";
      script = ''
        ip link set dev wg0 multicast on 2>/dev/null || true
      '';
    };
  };
}
