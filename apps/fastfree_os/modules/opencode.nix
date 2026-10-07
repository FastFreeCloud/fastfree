{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.opencode;
in {
  options.fastfree.opencode = {
    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = "OpenCode package (from nixpkgs-unstable). Null = service disabled.";
    };
  };

  config = lib.mkIf (config.fastfree.apps.opencode && cfg.package != null) {
    # Runs as the logged-in user (needs their API keys); localhost only.
    # `opencode web` blocks serving HTTP (browser open is best-effort).
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
