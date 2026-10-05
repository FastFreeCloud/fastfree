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

    # NOTE: initrd emergency access is owned by the Clan emergency-access
    # service (clan.nix) — do NOT set boot.initrd.systemd.emergencyAccess here
    # (bool vs hash-string merge = eval error).
  };
}
