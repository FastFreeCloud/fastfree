{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.opencode;
in {
  options.fastfree.opencode = {
    enable = lib.mkEnableOption "OpenCode web UI autostart (no terminal needed)";
    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = "OpenCode package (from nixpkgs-unstable). Null = service disabled.";
    };
  };

  config = lib.mkIf (config.fastfree.apps.opencode && cfg.package != null) {
    # Runs as the logged-in user (needs their API keys in ~/.config/opencode).
    # `opencode web` blocks serving HTTP 200 (verified) and tries to open the
    # browser; without a display the server keeps running (verified headless).
    # Localhost only (127.0.0.1) — no LAN exposure.
    systemd.user.services.opencode-web = {
      description = "OpenCode web interface on http://127.0.0.1:4096";
      wantedBy = [ "graphical-session.target" "default.target" ];
      serviceConfig = {
        ExecStart = "${cfg.package}/bin/opencode web --port 4096";
        Restart = "on-failure";
        RestartSec = "5";
      };
    };
  };
}
