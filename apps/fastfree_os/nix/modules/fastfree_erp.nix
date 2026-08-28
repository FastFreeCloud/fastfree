{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  spaDir = "/srv/fastfree-erp";
in {
  config = lib.mkIf config.fastfree.apps.fastfree_erp {

    # ── 1. Extract SPA files from GHCR image to host ──────
    systemd.services."fastfree-erp-spa" = {
      description = "Extract ERP SPA files from container image";
      after = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      serviceConfig.RemainAfterExit = true;
      path = [ pkgs.podman pkgs.coreutils ];
      script = ''
        mkdir -p ${spaDir}
        IMAGE="ghcr.io/${ghAccount}/fastfree_erp:latest"
        CID=$(podman create "$IMAGE" 2>/dev/null || true)
        if [ -n "$CID" ]; then
          podman cp "$CID:/srv/." "${spaDir}/"
          podman rm "$CID" >/dev/null 2>&1 || true
          echo "ERP SPA files extracted to ${spaDir}"
        else
          echo "WARNING: Could not create container from $IMAGE"
        fi
      '';
    };

    # ── 2. Ensure directory exists before Caddy starts ────
    systemd.services.caddy = {
      after = [ "fastfree-erp-spa.service" ];
      requires = [ "fastfree-erp-spa.service" ];
    };
  };
}
