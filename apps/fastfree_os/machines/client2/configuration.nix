# Clan machine: client2 (production VPS)
# Official autoincludes: machines/<name>/configuration.nix is imported automatically.

# Secrets (passwords/privateKeys) come via `clan vars` — intentionally absent here.
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
    ../../modules/fastfree_panel.nix
    ../../modules/fastfree_ledger.nix
    ../../modules/fastfree_erp.nix
    ../../modules/fastfree_hr.nix
    ../../modules/fastfree_pos.nix
    ../../modules/fastfree_website.nix
    ../../modules/dbgate.nix
    ../../modules/cockpit.nix
    ../../modules/opencode.nix
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
  fastfree.flakeConfigName = "client2";
  fastfree.githubAccount = "FastFreeCloud";
  fastfree.gitOrigin = "https://github.com/FastFreeCloud/fastfree.git";
  fastfree.extra.timezone = "Africa/Cairo";
  fastfree.subdomains = {
    db = "db";
    panel = "panel";
    cockpit = "cockpit";
  };

  fastfree.apps = {
    base = true;
    shell = true;
    herdr = true;
    mariadb = true;
    caddy = true;
    dbgate = true;
    cockpit = true;
    fastfree_backend = true;
    fastfree_panel = true;
    fastfree_ledger = true;
    fastfree_erp = true;
    fastfree_hr = true;
    fastfree_pos = true;
    fastfree_website = true;
  };

  # Herdr CLI from flake input (system-wide binary).
  fastfree.herdr.package = inputs.herdr.packages.${pkgs.stdenv.hostPlatform.system}.default or null;

  fastfree.networking = {
    interface = "eth0";
    nameservers = [ "1.1.1.1" "8.8.8.8" ];
    ipv4Address = "76.13.51.10";
    ipv4Gateway = "76.13.51.254";
    ipv4Prefix = 24;
  };

  # VPS boot (Hostinger KVM BIOS GRUB on /dev/sda).
  boot.initrd.availableKernelModules = [ "virtio_pci" "virtio_scsi" "virtio_blk" "sd_mod" ];
  boot.loader.grub = {
    enable = true;
    device = "/dev/sda";
    efiSupport = false;
  };
  services.qemuGuest.enable = true;
  services.openssh.enable = true;

  # ── Password SSH (explicit user preference) ───────────────
  # Clan sshd hardcodes PasswordAuthentication=false; override with HIGHER
  # priority so password logins + password-based tooling keep working.
  # PermitRootLogin is prohibit-password by NixOS default — open it too.
  # fail2ban (default sshd jail, auto VERBOSE) absorbs brute-force bots.
  services.openssh.settings.PasswordAuthentication = lib.mkForce true;
  services.openssh.settings.PermitRootLogin = "yes";
  services.fail2ban = {
    enable = true;
    ignoreIP = [
      "127.0.0.1/8"
      "::1"
      "197.34.19.171"
    ];
  };

  fastfree.avahi = {
    enable = true;
    reflector = false;
    interfaces = [ "eth0" "wg0" "wireguard" ];
  };

  # MariaDB state lives in modules/mariadb.nix (all mariadb machines).
}
