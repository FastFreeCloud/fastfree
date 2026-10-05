# Clan machine: client2 (production VPS)
# Official autoincludes: machines/<name>/configuration.nix is imported automatically.

# Secrets (passwords/privateKey/deployPassword) come in phase 2 via `clan vars`.
# Deployed via `clan machines update client2`; first install via
# `clan machines install client2 --target-host root@<IP>` (wipes disk — fresh only).
{ config, lib, pkgs, inputs, ... }:

{
  # Official convert-existing pattern: declare the platform in the machine module.
  nixpkgs.hostPlatform = "x86_64-linux";

  imports = [
    ../../options.nix
    ../../modules/networking.nix
    ../../modules/locale.nix
    ../../modules/boot.nix
    ../../modules/nix-settings.nix
    ../../modules/system.nix
    ../../modules/containers.nix
    ../../modules/integration.nix
    ../../modules/shell.nix
    ../../modules/herdr.nix
    ../../modules/mariadb.nix
    ../../modules/caddy.nix
    ../../modules/fastfree_backend.nix
    ../../modules/fastfree_ledger.nix
    ../../modules/fastfree_erp.nix
    ../../modules/fastfree_hr.nix
    ../../modules/fastfree_pos.nix
    ../../modules/fastfree_website.nix
    ../../modules/phpmyadmin.nix
    ../../modules/cockpit.nix
    ../../modules/opencode.nix
    ../../modules/shortcuts.nix
    ../../modules/desktop.nix
    ../../modules/avahi-subdomains.nix
  # NOTE: ./disko.nix is auto-imported by Clan autoincludes — do NOT add it here
  # (double import = conflicting definitions).
  ];

  # sops age key for this machine (operator-provisioned, registered via
  # `clan secrets machines add`). Provisioned at deploy time.
  sops.age.keyFile = "/var/lib/sops-nix/key.txt";

  fastfree.identity.name = lib.mkForce "client2";
  fastfree.identity.domain = lib.mkForce "fastfree.cloud";
  fastfree.deployType = "vps";
  fastfree.deployHost = "fastfree.cloud";
  fastfree.flakeConfigName = "client2";
  fastfree.githubAccount = "FastFreeCloud";
  fastfree.gitOrigin = "https://github.com/FastFreeCloud/fastfree.git";
  fastfree.extra.timezone = "Africa/Cairo";
  fastfree.subdomains = {
    db = "db";
    panel = "panel";
  };

  fastfree.apps = {
    base = true;
    shell = true;
    herdr = true;
    mariadb = true;
    caddy = true;
    phpmyadmin = true;
    cockpit = true;
    fastfree_backend = true;
    fastfree_ledger = true;
    fastfree_erp = true;
    fastfree_hr = true;
    fastfree_pos = true;
    fastfree_website = true;
    desktop = true;
    avahi = true;
  };

  # Herdr CLI from flake input (system-wide binary).
  fastfree.herdr.package = inputs.herdr.packages.${pkgs.stdenv.hostPlatform.system}.default;

  fastfree.networking = {
    nameservers = [ "1.1.1.1" "8.8.8.8" ];
    ipv4Address = "76.13.51.10";
    ipv4Gateway = "76.13.51.254";
    ipv4Prefix = 32;
  };

  # VPS boot (mirrors flake.nix mkClientModules vps branch).
  boot.initrd.availableKernelModules = [ "virtio_pci" "virtio_scsi" "sd_mod" ];
  boot.loader.grub = {
    devices = [ "/dev/sda" ];
    efiSupport = true;
    efiInstallAsRemovable = true;
  };
  services.openssh.enable = true;

  # ── Password SSH (explicit user preference) ───────────────
  # Clan sshd hardcodes PasswordAuthentication=false; override with HIGHER
  # priority so password logins + password-based tooling keep working.
  # PermitRootLogin is prohibit-password by NixOS default — open it too.
  # fail2ban (default sshd jail, auto VERBOSE) absorbs brute-force bots.
  services.openssh.settings.PasswordAuthentication = lib.mkForce true;
  services.openssh.settings.PermitRootLogin = "yes";
  services.fail2ban.enable = true;

  fastfree.avahi = {
    enable = true;
    reflector = false;
    interfaces = [ "ens18" "wg0" ];
  };

  # MariaDB state lives in modules/mariadb.nix (all mariadb machines).
}
