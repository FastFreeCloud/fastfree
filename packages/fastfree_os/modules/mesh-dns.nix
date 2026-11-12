{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.meshDns;
  isController = config.fastfree.identity.name == "client1";
in {
  options.fastfree.meshDns = {
    enable = lib.mkOption {
      type = lib.types.bool;
      default = isController;
      description = "Enable native WireGuard mesh DNS resolver (dnsmasq) on controller (client1).";
    };

    listenAddress = lib.mkOption {
      type = lib.types.str;
      default = "10.24.0.1";
      description = "WireGuard tunnel IP address for the DNS resolver to bind on.";
    };

    wildcardDomains = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "fastfree.local"
        "client1.fastfree.local"
      ];
      description = "Domain suffixes that authoritatively resolve to listenAddress.";
    };

    upstreamNameservers = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ "1.1.1.1" "8.8.8.8" ];
      description = "Upstream recursive public DNS nameservers for external domain resolution.";
    };
  };

  config = lib.mkIf cfg.enable {

    # ── 1. Dnsmasq DNS Engine ─────────────────────────────────────
    services.dnsmasq = {
      enable = true;
      resolveLocalQueries = false; # Preserve host /etc/resolv.conf
      settings = {
        # Bind dynamically to tunnel IP and loopback
        listen-address = [ cfg.listenAddress "127.0.0.1" ];
        bind-dynamic = true;

        # Authoritative Wildcard resolution (*.fastfree.local -> 10.24.0.1)
        address = map (dom: "/.${dom}/${cfg.listenAddress}") cfg.wildcardDomains;

        # Do not forward local domain queries to upstream WAN
        local = map (dom: "/.${dom}/") cfg.wildcardDomains;

        # Upstream public DNS forwarders for internet lookups (google.com, etc.)
        server = cfg.upstreamNameservers;

        # Operational security and query hygiene
        domain-needed = true; # Never forward unqualified domain names (without dots)
        bogus-priv = true;    # Never forward reverse private IP lookups to upstream
        no-resolv = true;     # Ignore /etc/resolv.conf to prevent resolution loops
        no-poll = true;       # Do not poll /etc/resolv.conf for changes
        cache-size = 2000;    # High performance cache

        # Reverse DNS pointer record for controller
        ptr-record = [
          "1.0.24.10.in-addr.arpa,client1.fastfree.local"
        ];
      };
    };

    # ── 2. Avoid Port 53 Conflicts with systemd-resolved ──────────
    services.resolved.settings.Resolve = {
      DNSStubListener = "false";
    };

    # ── 3. Firewall: Allow DNS for WireGuard Mesh Clients ─────────
    networking.firewall.interfaces = {
      "wireguard" = {
        allowedUDPPorts = [ 53 ];
        allowedTCPPorts = [ 53 ];
      };
      "wg0" = {
        allowedUDPPorts = [ 53 ];
        allowedTCPPorts = [ 53 ];
      };
    };

    # ── 4. Service Ordering & Recovery ────────────────────────────
    systemd.services.dnsmasq = {
      after = [ "network.target" ];
      serviceConfig = {
        Restart = "always";
        RestartSec = "3s";
      };
    };
  };
}
