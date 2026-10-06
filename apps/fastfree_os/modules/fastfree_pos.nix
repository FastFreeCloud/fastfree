{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  spaDir = "/srv/fastfree-pos";
in {
  config = lib.mkIf config.fastfree.apps.fastfree_pos {

    systemd.services."fastfree-pos-spa" = {
      description = "Extract POS SPA files from container image";
      after = [ "network-online.target" ];
      requires = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      serviceConfig.RemainAfterExit = true;
      path = [ pkgs.podman pkgs.coreutils ];
      script = ''
        # NOTE (2026-10-06): GHCR images contain nix-store SYMLINKS under /srv
        # that resolve ONLY inside the container mount namespace (host-side
        # `podman mount` view cannot read them). `podman cp` is server-side
        # and materializes real files. Verified live on ledger image.
        rm -rf ${spaDir}
        mkdir -p ${spaDir}
        IMAGE="ghcr.io/${ghAccount}/fastfree_pos:latest"
        CID=$(podman create "$IMAGE" 2>/dev/null || true)
        if [ -n "$CID" ]; then
          # Per-file server-side copy: podman cp resolves each symlink
          # through the container namespace (bulk dir copy preserves links
          # as dangling; host-side mount view cannot read them at all).
          MNT=$(podman mount "$CID" 2>/dev/null || true)
          if [ -n "$MNT" ] && [ -d "$MNT/srv" ]; then
            ( cd "$MNT/srv" && find -L . -mindepth 1 | sort | while IFS= read -r rel; do
              rel="''${rel#./}"
              if [ -d "$MNT/srv/$rel" ]; then
                mkdir -p "${spaDir}/$rel"
              else
                podman cp "$CID:/srv/$rel" "${spaDir}/$rel" >/dev/null 2>&1 || echo "WARNING: skip POS $rel"
              fi
            done )
            echo "POS SPA files extracted to ${spaDir}: $(ls ${spaDir})"
          else
            echo "WARNING: Could not mount $IMAGE"
          fi
          podman unmount "$CID" >/dev/null 2>&1 || true
          podman rm "$CID" >/dev/null 2>&1 || true
        else
          echo "WARNING: Could not create container from $IMAGE"
        fi
      '';
    };

    systemd.services.caddy = {
      after = [ "fastfree-pos-spa.service" ];
      requires = [ "fastfree-pos-spa.service" ];
    };
  };
}
