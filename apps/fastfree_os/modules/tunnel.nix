# Cloudflare quick tunnels (trycloudflare.com): publish the two loopback-only
# web UIs — Guacamole (127.0.0.1:8080) and OpenCode (127.0.0.1:4096) — as plain
# https:// links, so a phone reaches them in its browser with no VPN and no app.
#
# Inbound exposure: none. `cloudflared tunnel --url` DIALS OUT to the Cloudflare
# edge and the edge proxies back down that same connection, so nothing new has
# to be reachable from the internet: networking.firewall is untouched and
# 127.0.0.1 stays the only origin. Quick tunnels are free and need no Cloudflare
# account, which also means nothing is authenticated at the edge — treat the
# link as public and rely on each application's own login for protection.
#
# The hostname is RANDOM and CHANGES on every start (reboot, `systemctl restart`,
# crash + Restart=always). Never hardcode it: read the file this module writes,
# /run/fastfree-tunnel-<name>.url, or run the `ff-urls` alias.
#
# To move to a permanent named tunnel later: create a Cloudflare account, run
# `cloudflared tunnel login` once on the machine (browser approval, writes
# ~/.cloudflared/cert.pem), then swap `--url` for the real thing —
# `cloudflared tunnel create fastfree`, `cloudflared tunnel route dns fastfree
# <hostname>`, `cloudflared tunnel run fastfree` (or the dashboard's token form,
# `cloudflared service install <token>`). Only then does the URL stop moving.
{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.tunnel;

  # Both helpers take every path as an argument, so the store paths appear once
  # (here) instead of once per unit, and the unit files stay readable.
  # Absolute binaries only: systemd runs these with an empty PATH.
  #
  # $1 url file   $2 log file   $3 journal anchor file
  prepare = pkgs.writeShellScript "fastfree-tunnel-prepare" ''
    ${pkgs.coreutils}/bin/rm -f "$1" "$2" "$3"
    ${pkgs.coreutils}/bin/date +%s > "$3"
  '';

  # $1 url file   $2 log file   $3 journal anchor file   $4 timeout seconds
  # $5 unit name
  #
  # Poll instead of reading once: cloudflared only prints the hostname after the
  # edge connection is up (a second or two, longer on a slow link). Two sources:
  # the --logfile written by this run (the prepare step removed it, so it can
  # never contain a previous run's URL), and the journal as a fallback for when
  # the logfile could not be opened at all.
  #
  # Always exits 0: a missing URL must not fail the unit, or Restart=always would
  # turn "no trycloudflare line yet" into a restart loop.
  capture = pkgs.writeShellScript "fastfree-tunnel-capture-url" ''
    url=""
    deadline=$(${pkgs.coreutils}/bin/date +%s)
    deadline=$((deadline + $4))
    while [ "$(${pkgs.coreutils}/bin/date +%s)" -lt "$deadline" ]; do
      url=$(${pkgs.gnugrep}/bin/grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$2" 2>/dev/null | ${pkgs.coreutils}/bin/tail -n 1)
      if [ -z "$url" ] && [ -r "$3" ]; then
        url=$(${pkgs.systemd}/bin/journalctl --quiet --no-pager -o cat -u "$5" --since "@$(${pkgs.coreutils}/bin/cat "$3")" 2>/dev/null \
          | ${pkgs.gnugrep}/bin/grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
          | ${pkgs.coreutils}/bin/tail -n 1)
      fi
      [ -n "$url" ] && break
      ${pkgs.coreutils}/bin/sleep 1
    done
    if [ -n "$url" ]; then
      ${pkgs.coreutils}/bin/printf '%s\n' "$url" > "$1.tmp" \
        && ${pkgs.coreutils}/bin/chmod 0644 "$1.tmp" \
        && ${pkgs.coreutils}/bin/mv "$1.tmp" "$1" \
        && ${pkgs.systemd}/bin/logger -t fastfree-tunnel "$5 -> $url"
    else
      ${pkgs.systemd}/bin/logger -t fastfree-tunnel \
        "$5: no trycloudflare URL after $4s, check: journalctl -u $5"
    fi
    ${pkgs.coreutils}/bin/rm -f "$3"
    exit 0
  '';

  # One unit per endpoint; afterExtra is the extra ordering the endpoint needs.
  unit = name: target: afterExtra:
    let
      service = "cloudflared-${name}";
      urlFile = "/run/fastfree-tunnel-${name}.url";
      logFile = "/run/fastfree-tunnel-${name}.log";
      anchorFile = "/run/fastfree-tunnel-${name}.anchor";
    in {
      description = "Cloudflare quick tunnel for ${name} (${target})";

      after = [ "network-online.target" ] ++ afterExtra;
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      serviceConfig = {
        Type = "exec";
        ExecStartPre = "${prepare} ${urlFile} ${logFile} ${anchorFile}";

        # --no-autoupdate: cloudflared would otherwise replace its own binary in
        #   the read-only Nix store.
        # --protocol: quick tunnels force quic when the flag is unset, and quic
        #   needs UDP 7844 outbound, which is routinely blocked on TE/mobile
        #   links; http2 rides on TCP and goes through with the connection this
        #   module already proved is open.
        # --logfile: the URL this module publishes is parsed out of it.
        ExecStart = "${pkgs.cloudflared}/bin/cloudflared tunnel --no-autoupdate"
          + " --protocol ${cfg.protocol} --logfile ${logFile} --url ${target}";

        ExecStartPost = "${capture} ${urlFile} ${logFile} ${anchorFile}"
          + " ${toString cfg.urlTimeout} ${service}";

        Restart = "always";
        RestartSec = 5;

        NoNewPrivileges = true;
        ProtectSystem = "full";
        PrivateTmp = true;
      };
    };

  # Guacamole is a Tomcat webapp (services.guacamole-client), so wait for
  # tomcat.service — a tunnel up before Tomcat answers would hand the phone a
  # hostname that only ever serves 502. Ordering against a unit that does not
  # exist is ignored by systemd, so this is safe before that module lands.
  guacamoleUnit = unit "guacamole" cfg.guacamole.url [ "tomcat.service" ];
  opencodeUnit = unit "opencode" cfg.opencode.url [ ];
in
{
  # Declared here rather than in options.nix so this module stays self-contained.
  options.fastfree.tunnel = {
    enable = lib.mkEnableOption "Cloudflare quick tunnels for the loopback web UIs (Guacamole, OpenCode)";

    protocol = lib.mkOption {
      type = lib.types.enum [ "http2" "quic" "auto" ];
      default = "http2";
      description = ''
        Transport used to reach the Cloudflare edge. http2 (TCP) is the default
        because quic needs UDP 7844 outbound, which many ISPs and mobile
        networks drop; use quic only where UDP 7844 is known to work.
      '';
    };

    urlTimeout = lib.mkOption {
      type = lib.types.int;
      default = 60;
      description = "Seconds ExecStartPost waits for the random URL to show up in the log before giving up (it never fails the unit).";
    };

    guacamole.url = lib.mkOption {
      type = lib.types.str;
      default = "http://127.0.0.1:8080";
      description = "Loopback origin for the Guacamole tunnel (must be reachable only from this machine).";
    };

    opencode.url = lib.mkOption {
      type = lib.types.str;
      default = "http://127.0.0.1:4096";
      description = "Loopback origin for the OpenCode tunnel (must be reachable only from this machine).";
    };
  };

  config = lib.mkIf cfg.enable {

    # Deliberately no networking.firewall.* anywhere in this file: a quick
    # tunnel is an outbound connection, so opening a port here would only add
    # exposure.
    systemd.services = {
      cloudflared-guacamole = guacamoleUnit;
      cloudflared-opencode = opencodeUnit;
    };

    # Create the URL files empty and world-readable at every boot, so the
    # alias can tell "not started yet" from "started, read it". They live in
    # /run on purpose: gone on reboot, rewritten by ExecStartPost on every
    # service start.
    systemd.tmpfiles.rules = [
      "f /run/fastfree-tunnel-guacamole.url 0644 root root -"
      "f /run/fastfree-tunnel-opencode.url 0644 root root -"
    ];
  };
}