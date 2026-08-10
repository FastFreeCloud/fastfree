{ config, lib, pkgs, ... }:

let
  sd = config.fastfree.subdomains;
  domain = config.fastfree.identity.domain;
in {
  config = lib.mkIf config.fastfree.apps.caddy {

    services.caddy.enable = true;

    services.caddy.virtualHosts = {
      "${domain}" = {
        extraConfig = ''
          tls admin@fastfree.cloud {
            ca https://acme.zerossl.com/v2/DV90
          }
          redir https://{host}{uri} permanent
        '';
      };

      "${sd.db}.${domain}" = lib.mkIf config.fastfree.apps.phpmyadmin {
        extraConfig = ''
          tls admin@fastfree.cloud {
            ca https://acme.zerossl.com/v2/DV90
          }
          reverse_proxy localhost:8082
        '';
      };
    };

    # ── Firewall ──────────────────────────────────────────
    networking.firewall.allowedTCPPorts = [ 80 443 ];
  };
}
