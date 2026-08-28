{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  spaDir = "/srv/fastfree-pos";
in {
  config = lib.mkIf config.fastfree.apps.fastfree_pos {

    # ── 1. Extract SPA files from GHCR image to host ──────
    systemd.services."fastfree-pos-spa" = {
      description = "Extract POS SPA files from container image";
      after = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      serviceConfig.RemainAfterExit = true;
      path = [ pkgs.podman pkgs.coreutils ];
      script = ''
        mkdir -p ${spaDir}
        IMAGE="ghcr.io/${ghAccount}/fastfree_pos:latest"
        CID=$(podman create "$IMAGE" 2>/dev/null || true)
        if [ -n "$CID" ]; then
          podman cp "$CID:/srv/." "${spaDir}/"
          podman rm "$CID" >/dev/null 2>&1 || true
          echo "POS SPA files extracted to ${spaDir}"
        else
          echo "WARNING: Could not create container from $IMAGE"
        fi
      '';
    };

    # ── 2. Ensure directory exists before Caddy starts ────
    systemd.services.caddy = {
      after = [ "fastfree-pos-spa.service" ];
      requires = [ "fastfree-pos-spa.service" ];
    };
  };
}
