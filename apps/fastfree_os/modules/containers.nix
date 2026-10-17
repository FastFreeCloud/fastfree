{ config, lib, ... }:

{
  config = lib.mkIf config.fastfree.apps.base {
    # ── Zero Podman: All applications run as native NixOS services ──
    virtualisation.podman.enable = false;
  };
}
