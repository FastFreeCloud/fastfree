{ config, lib, pkgs, ... }:

let
  isLocal = config.fastfree.deployType == "local";
in {
  config = lib.mkIf config.fastfree.apps.base {

    # ── Boot ──────────────────────────────────────────────
    # Serial console for servers/images only; local keeps its own kernel cmdline.
    boot.kernelParams = lib.mkIf (!isLocal) [
      "console=ttyS0,115200"
    ];

    boot.kernelModules = lib.mkIf config.fastfree.kvm [ "kvm-intel" "kvm-amd" ];

    # ── Initrd (NixOS 26.05 systemd stage 1) ─────────────
    boot.initrd.systemd.emergencyAccess = (config.fastfree.deployType == "hyperv");
  };
}
