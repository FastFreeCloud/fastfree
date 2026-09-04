{ config, lib, pkgs, ... }:

let
  sd = config.fastfree.subdomains;
  domain = config.fastfree.identity.domain;
  isLocal = lib.hasSuffix ".local" domain;
  tlsBlock = if isLocal then "tls internal" else ''
    tls admin@fastfree.cloud {
      ca https://acme.zerossl.com/v2/DV90
    }
  '';

  spaServer = name: spaDir: ''
    ${name}.${domain} {
      ${tlsBlock}
      root * ${spaDir}
      @api path /api/*
      handle @api {
        reverse_proxy 127.0.0.1:8080
      }
      @socketio path /socket.io/*
      handle @socketio {
        reverse_proxy 127.0.0.1:8080
      }
      handle {
        try_files {path} /index.html
        file_server
      }
    }
  '';

  caddyfileText = ''
    ${domain} {
      ${tlsBlock}
      ${if config.fastfree.apps.fastfree_website then ''
        reverse_proxy 127.0.0.1:9004
      '' else ''
        redir https://{host}{uri} permanent
      ''}
    }

    backend.${domain} {
      ${tlsBlock}
      reverse_proxy 127.0.0.1:8080
    }

    ${lib.optionalString config.fastfree.apps.fastfree_erp (spaServer "erp" "/srv/fastfree-erp")}
    ${lib.optionalString config.fastfree.apps.fastfree_ledger (spaServer "ledger" "/srv/fastfree-ledger")}
    ${lib.optionalString config.fastfree.apps.fastfree_hr (spaServer "hr" "/srv/fastfree-hr")}
    ${lib.optionalString config.fastfree.apps.fastfree_pos (spaServer "pos" "/srv/fastfree-pos")}

    ${sd.db}.${domain} {
      ${tlsBlock}
      reverse_proxy 127.0.0.1:8082
    }

    ${sd.panel}.${domain} {
      ${tlsBlock}
      reverse_proxy 127.0.0.1:9090
    }
  '';
in {
  config = lib.mkIf config.fastfree.apps.caddy {

    services.caddy.enable = true;

    # Write Caddyfile directly to /etc/caddy
    environment.etc."caddy/Caddyfile".text = caddyfileText;

    # Point Caddy at our Caddyfile
    systemd.services.caddy = {
      serviceConfig = {
        ExecStart = lib.mkForce [
          "" "${pkgs.caddy}/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"
        ];
      };
    };

    networking.firewall.allowedTCPPorts = [ 80 443 ];
  };
}
