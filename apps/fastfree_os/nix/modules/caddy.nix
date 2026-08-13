{ config, lib, pkgs, ... }:

let
  sd = config.fastfree.subdomains;
  domain = config.fastfree.identity.domain;
  isLocal = lib.hasSuffix ".local" domain;
  tlsConfig = if isLocal then "tls internal" else ''
    tls admin@fastfree.cloud {
      ca https://acme.zerossl.com/v2/DV90
    }
  '';
in {
  config = lib.mkIf config.fastfree.apps.caddy {

    services.caddy.enable = true;

    services.caddy.virtualHosts = {
      # ── Main domain redirect ──────────────────────────────
      "${domain}" = {
        extraConfig = ''
          ${tlsConfig}
          redir https://{host}{uri} permanent
        '';
      };

      # ── Frappe Backend (ERPNext) ──────────────────────────
      "backend.${domain}" = {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy localhost:8080
        '';
      };

      # ── ERP Frontend (Full ERP) ───────────────────────────
      "erp.${domain}" = lib.mkIf config.fastfree.apps.fastfree_erp {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy localhost:9001
        '';
      };

      # ── Ledger Frontend ───────────────────────────────────
      "ledger.${domain}" = lib.mkIf config.fastfree.apps.fastfree_ledger {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy localhost:9000
        '';
      };

      # ── HR Frontend ───────────────────────────────────────
      "hr.${domain}" = lib.mkIf config.fastfree.apps.fastfree_hr {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy localhost:9002
        '';
      };

      # ── POS Frontend ──────────────────────────────────────
      "pos.${domain}" = lib.mkIf config.fastfree.apps.fastfree_pos {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy localhost:9003
        '';
      };

      # ── phpMyAdmin ────────────────────────────────────────
      "${sd.db}.${domain}" = lib.mkIf config.fastfree.apps.phpmyadmin {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy localhost:8082
        '';
      };
    };

    # ── Firewall ──────────────────────────────────────────
    networking.firewall.allowedTCPPorts = [ 80 443 ];
  };
}
