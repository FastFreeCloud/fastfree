{ config, lib, pkgs, ... }:

let
  isLocal = config.fastfree.deployType == "local";
in {
  config = lib.mkIf config.fastfree.apps.base {

    # ── System ────────────────────────────────────────────
    environment.defaultPackages                  = [];
    # Size/appliance hardening for headless images + servers only.
    # Skipped for local machines AND for any host with desktop enabled
    # (COSMIC needs the display stack: xserver + libinput).
    hardware.enableRedistributableFirmware       = lib.mkIf (!isLocal) (lib.mkForce false);
    hardware.firmware                            = lib.mkIf (!isLocal) (lib.mkForce []);
    services.xserver.enable                      = lib.mkIf (!isLocal && !config.fastfree.apps.desktop) false;
    services.libinput.enable                     = lib.mkIf (!isLocal && !config.fastfree.apps.desktop) false;
    system.stateVersion = "26.05";

    # ── Size Reduction ────────────────────────────────────
    documentation.enable              = false;
    documentation.nixos.enable        = false;
    documentation.man.enable          = false;
    documentation.doc.enable          = false;
    documentation.info.enable         = false;
    documentation.dev.enable          = false;

    # ── Logging ───────────────────────────────────────────
    services.journald.extraConfig = ''
      Storage=persistent
      SystemMaxUse=500M
      SystemMaxFileSize=50M
      MaxRetentionSec=30day
      Compress=yes
    '';

    # ── Login Banner (MOTD) ──────────────────────────────────
    services.getty.greetingLine = let
      name = config.fastfree.identity.name;
    in lib.mkForce ''
      +----------------------------------------+
      |               FastFree                 |
      |           https://fastfree.cloud       |
      +----------------------------------------+
    '';
    users.motd = ''
      FastFree Cloud — fastfree.cloud
      Privacy: https://fastfree.cloud/privacy-policy.html
    '';
  };
}
