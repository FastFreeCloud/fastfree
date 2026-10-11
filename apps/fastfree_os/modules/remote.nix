# Remote access (phone / other machines): xrdp serving a deliberately
# MINIMAL X11 session.
#
# Why there is no desktop environment in the RDP session:
#   * COSMIC is Wayland-only (cosmic-comp / Smithay) and RDP has no Wayland
#     path — xrdp always starts its OWN Xorg through xorgxrdp, so the remote
#     session is X11 by definition and COSMIC cannot run there. COSMIC stays
#     the local desktop (see modules/desktop.nix).
#   * The obvious X11 fallback, Xfce, was removed on purpose: the xfce4-*
#     package set injects 36 .desktop files into the shared XDG applications
#     directory, which the COSMIC launcher also scans. The result was every
#     remote-only app appearing twice in the *local* Wayland launcher.
#   * So the phone session gets a bare window manager (openbox) plus a
#     terminal (alacritty). Neither ships a launcher-visible .desktop entry
#     (openbox's single applications/ entry is NoDisplay=true), so the COSMIC
#     launcher gains zero icons, and the root menu / shell is still enough to
#     start system apps such as Firefox.
# See docs/remote-access.md for the full reasoning.
{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.remote;
in {
  options.fastfree.remote = {
    port = lib.mkOption {
      type = lib.types.port;
      default = 3389;
      description = "RDP port. Change if the router forwards a different external port.";
    };

    openFirewall = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Open the RDP port in the NixOS firewall. Set false when the port is only reachable through a VPN/tunnel.";
    };
  };

  config = lib.mkIf config.fastfree.apps.remote {

    # ── Minimal X11 session for RDP (COSMIC stays enabled separately) ──
    # No X display manager is involved: xrdp starts its own Xorg per session.
    # openbox alone is a window manager, not a desktop, so it contributes no
    # panels/docks and — crucially — no duplicated launcher entries.
    services.xserver.enable = true;
    services.xserver.windowManager.openbox.enable = true;

    # Terminal for the remote session. Alacritty ships no .desktop file.
    environment.systemPackages = [ pkgs.alacritty ];

    # xrdp starts its own Xorg via xorgxrdp, so no display manager is
    # required for the remote session — only the window manager itself.
    services.xrdp = {
      enable = true;
      port = cfg.port;
      inherit (cfg) openFirewall;
      # Store path, not a bare name: the remote session does not source the
      # system profile reliably, so "openbox" alone is not on its PATH.
      defaultWindowManager = "${pkgs.openbox}/bin/openbox";

      # PipeWire has no PulseAudio-compat module for xrdp — audio over RDP
      # stays disabled rather than silently half-working.
      audio.enable = false;

      # nixpkgs ships xrdp.ini with LogFile=/dev/null and EnableSyslog=false,
      # i.e. no auth-failure log at all. xrdp runs as a DynamicUser that cannot
      # create files in /var/log, so logging goes to the journal instead.
      # xrdp emits
      #   AUTHFAIL: user=<u> ip=<ip> time=<t>
      # and security_layer=tls keeps the password off the wire in clear.
      #
      # These commands run inside the confDir *derivation*, i.e. in the Nix
      # sandbox: they must only ever touch $out. Writing to /var (e.g.
      # `mkdir -p /var/log/xrdp`) fails the build with
      # "mkdir: cannot create directory '/var': Permission denied".
      extraConfDirCommands = ''
        substituteInPlace $out/xrdp.ini \
          --replace-fail 'EnableSyslog=false' 'EnableSyslog=true' \
          --replace-fail 'security_layer=negotiate' 'security_layer=tls' \
          --replace-fail 'crypt_level=high' 'crypt_level=high'
        substituteInPlace $out/sesman.ini \
          --replace-fail 'EnableSyslog=false' 'EnableSyslog=true'
      '';
    };

    # xrdp's PAM service defaults to allowNullPassword = true, so a
    # passwordless account would be world-reachable. Fail closed instead.
    security.pam.services.xrdp-sesman.allowNullPassword = lib.mkForce false;

    # pam_faillock on the xrdp service: lock the account out after repeated
    # failed logins. This is per-account, not per-IP, so it stays in place
    # even though fail2ban is not used.
    security.pam.services.xrdp-sesman.logFailures = true;

    # Arabic keyboard layout inside the remote session (same as local).
    environment.sessionVariables = {
      XKB_DEFAULT_LAYOUT = "us,ara";
      XKB_DEFAULT_OPTIONS = "grp:alt_shift_toggle";
    };
  };
}
