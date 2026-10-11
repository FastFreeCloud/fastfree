{ config, lib, pkgs, ... }:

let
  isLocal = config.fastfree.deployType == "local";
in {
  config = lib.mkIf config.fastfree.apps.base {

    # ── Boot ──────────────────────────────────────────────
    # Graphical on local desktop, verbose text + serial everywhere else.
    # Quiet params only HIDE console output — logs always survive in
    # journalctl -b/-1 and dmesg (Esc switches splash<->text during boot).
    boot.kernelParams =
      lib.optionals (!isLocal) [
        "console=ttyS0,115200"
      ] ++ lib.optionals isLocal [
        "quiet"
        "rd.systemd.show_status=auto"
        "systemd.show_status=auto"
        "rd.udev.log_level=3"
        "udev.log_priority=3"
      ];

    boot.kernelModules = lib.mkIf config.fastfree.kvm [ "kvm-intel" "kvm-amd" ];

    # ── nouveau: disable atomic modesetting ───────────────
    # cosmic-comp 1.2.0 calls drmModeSetProperty(VRR_ENABLED) on EVERY
    # rendered frame, unconditionally, even when adaptive sync is already
    # Disabled. nouveau on Kepler never exposes that property, so each frame
    # produced:
    #   "Unable to set adaptive VRR state: ... missing VRR_ENABLED"
    # Measured: ~40 messages/s = 259,914 lines = 98% of the user journal,
    # 522 MB in under 2 h, ~13% of a core burned in a pointless ioctl loop.
    # With atomic=0 smithay selects its legacy DrmSurface path, where
    # use_vrr(false) is a documented no-op — the ioctl and the log both stop.
    # Trade-off: explicit sync + overlay scanout instead of atomic flips
    # (already unavailable here, since nouveau lacks the VRR property) and a
    # reboot is required. See modules/desktop.nix for the COSMIC side notes.
    boot.extraModprobeConfig = lib.mkIf isLocal ''
      options nouveau atomic=0
    '';

    # ── GRUB theme (local only; servers stay text for serial) ─
    # sleek-grub-theme is in nixpkgs (no fetchers); BIOS-safe gfxterm.
    boot.loader.grub.theme = lib.mkIf isLocal
      (pkgs.sleek-grub-theme.override { withStyle = "dark"; withBanner = "NixOS"; });

    # ── Plymouth splash (local only) ────────────────────────
    # bgrt works without OEM logo (falls back to spinner+NixOS).
    # No conflict with cosmic-greeter/Wayland (quits before greeter).
    boot.plymouth = lib.mkIf isLocal {
      enable = true;
      theme = "bgrt";
    };
    boot.consoleLogLevel = lib.mkIf isLocal 3;
    boot.initrd.verbose = lib.mkIf isLocal false;

    # ── Boot menu hygiene: max 5 generations (default 100) ────
    # Complements nix.gc --delete-older-than 14d (nix-settings.nix):
    # short menu, pruned store, yet fallback survives (floor, not ceiling —
    # never go below ~5: two bad switches in a row must not eat the rescue).
    boot.loader.grub.configurationLimit = 5;

    # NOTE: initrd emergency access is owned by the Clan emergency-access
    # service (clan.nix) — do NOT set boot.initrd.systemd.emergencyAccess here
    # (bool vs hash-string merge = eval error).
  };
}
