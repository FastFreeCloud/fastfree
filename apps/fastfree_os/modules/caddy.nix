{ config, lib, pkgs, ... }:

let
  sd = config.fastfree.subdomains;
  domain = config.fastfree.identity.domain;
  isLocal = lib.hasSuffix ".local" domain;
  tlsBlock = if isLocal then "tls internal" else ''
    tls sales@fastfree.cloud {
      ca https://acme.zerossl.com/v2/DV90
    }
  '';

  # Shared SPA handlers (used by BOTH the https site and the loopback site).
  spaInner = spaDir: ''
    header -Server
    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    header Access-Control-Allow-Credentials "true"
    header Access-Control-Max-Age "86400"
    root * ${spaDir}
    @api path /api/*
    handle @api {
      reverse_proxy 127.0.0.1:8080
    }
    @apiOptions method OPTIONS path /api/*
    handle @apiOptions {
      respond "OK" 204
    }
    @socketio path /socket.io/*
    handle @socketio {
      reverse_proxy 127.0.0.1:8080
    }
    @entryDoc path / /*.html
    header @entryDoc Cache-Control no-cache
    @immutableAssets path /assets/*
    header @immutableAssets Cache-Control "public, max-age=31536000, immutable"
    handle {
      try_files {path} /index.html
      file_server
    }
  '';

  # Each SPA gets TWO sites with identical handlers:
  #   https://<name>.<domain>  (pretty URL, needs working DNS + trusted CA)
  #   http://127.0.0.1:<port>  (always works locally: no DNS, no TLS, no LAN exposure)
  spaServer = name: spaDir: localPort: ''
    ${name}.${domain} {
      ${tlsBlock}
      ${spaInner spaDir}
    }

    http://127.0.0.1:${toString localPort} {
      bind 127.0.0.1
      ${spaInner spaDir}
    }
  '';

  caddyfileText = ''
    ${domain} {
      ${tlsBlock}
      header -Server
      ${if config.fastfree.apps.fastfree_website then ''
        reverse_proxy 127.0.0.1:9004
      '' else ''
        redir https://{host}{uri} permanent
      ''}
    }

    backend.${domain} {
      ${tlsBlock}
      header -Server
      header Access-Control-Allow-Origin "*"
      header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
      header Access-Control-Allow-Credentials "true"
      header Access-Control-Max-Age "86400"
      @api path /api/*
      handle @api {
        reverse_proxy 127.0.0.1:8080
      }
      @apiOptions method OPTIONS path /api/*
      handle @apiOptions {
        respond "OK" 204
      }
    }

    ${lib.optionalString config.fastfree.apps.fastfree_erp (spaServer "erp" "/srv/fastfree-erp" 9101)}
    ${lib.optionalString config.fastfree.apps.fastfree_ledger (spaServer "ledger" "/srv/fastfree-ledger" 9102)}
    ${lib.optionalString config.fastfree.apps.fastfree_hr (spaServer "hr" "/srv/fastfree-hr" 9103)}
    ${lib.optionalString config.fastfree.apps.fastfree_pos (spaServer "pos" "/srv/fastfree-pos" 9104)}

    ${lib.optionalString config.fastfree.apps.phpmyadmin ''
      ${sd.db}.${domain} {
        ${tlsBlock}
        header -Server
        reverse_proxy 127.0.0.1:8082
      }
    ''}

    ${lib.optionalString config.fastfree.apps.cockpit ''
      ${sd.panel}.${domain} {
        ${tlsBlock}
        header -Server
        reverse_proxy 127.0.0.1:9090
      }
    ''}
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
