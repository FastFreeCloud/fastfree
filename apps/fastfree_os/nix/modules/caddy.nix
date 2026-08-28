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

  # SPA config helper: serves static files + proxies API to backend
  spaConfig = spaDir: ''
    root * ${spaDir}

    @api path /api/*
    handle @api {
      reverse_proxy 127.0.0.1:8000
    }

    @socketio path /socket.io/*
    handle @socketio {
      reverse_proxy 127.0.0.1:8000
    }

    handle {
      try_files {path} /index.html
      file_server
    }
  '';
in {
  config = lib.mkIf config.fastfree.apps.caddy {

    services.caddy.enable = true;

    services.caddy.virtualHosts = {
      # ── Main domain ────────────────────────────────────────
      "${domain}" = {
        extraConfig = ''
          ${tlsConfig}
          ${if config.fastfree.apps.fastfree_website then ''
            reverse_proxy 127.0.0.1:9004
          '' else ''
            redir https://{host}{uri} permanent
          ''}
        '';
      };

      # ── Frappe Backend (ERPNext) ──────────────────────────
      "backend.${domain}" = {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy 127.0.0.1:8080
        '';
      };

      # ── ERP Frontend (Full ERP) ───────────────────────────
      "erp.${domain}" = lib.mkIf config.fastfree.apps.fastfree_erp {
        extraConfig = ''
          ${tlsConfig}
          ${spaConfig "/srv/fastfree-erp"}
        '';
      };

      # ── Ledger Frontend ───────────────────────────────────
      "ledger.${domain}" = lib.mkIf config.fastfree.apps.fastfree_ledger {
        extraConfig = ''
          ${tlsConfig}
          ${spaConfig "/srv/fastfree-ledger"}
        '';
      };

      # ── HR Frontend ───────────────────────────────────────
      "hr.${domain}" = lib.mkIf config.fastfree.apps.fastfree_hr {
        extraConfig = ''
          ${tlsConfig}
          ${spaConfig "/srv/fastfree-hr"}
        '';
      };

      # ── POS Frontend ──────────────────────────────────────
      "pos.${domain}" = lib.mkIf config.fastfree.apps.fastfree_pos {
        extraConfig = ''
          ${tlsConfig}
          ${spaConfig "/srv/fastfree-pos"}
        '';
      };

      # ── phpMyAdmin ────────────────────────────────────────
      "${sd.db}.${domain}" = lib.mkIf config.fastfree.apps.phpmyadmin {
        extraConfig = ''
          ${tlsConfig}
          reverse_proxy 127.0.0.1:8082
        '';
      };
    };

    # ── Firewall ──────────────────────────────────────────
    networking.firewall.allowedTCPPorts = [ 80 443 ];
  };
}
