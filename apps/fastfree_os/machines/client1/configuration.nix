# Clan machine: client1 (Hyper-V image)
# Official autoincludes: machines/<name>/configuration.nix is imported automatically.

# Secrets (passwords/privateKeys) come in phase 2 via `clan vars` — intentionally absent here.
# NOTE: image-only machine. Never `clan machines install` — built as VHDX via CI (09-client1.yaml).
{ config, lib, pkgs, modulesPath, ... }:

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
    ../../modules/mariadb.nix
    ../../modules/caddy.nix
    ../../modules/fastfree_backend.nix
    ../../modules/fastfree_ledger.nix
    ../../modules/fastfree_erp.nix
    ../../modules/fastfree_hr.nix
    ../../modules/fastfree_pos.nix
    ../../modules/fastfree_website.nix
    ../../modules/phpmyadmin.nix
    ../../modules/desktop.nix
    ../../modules/avahi-subdomains.nix
    (modulesPath + "/virtualisation/hyperv-guest.nix")
  ];

  # sops age key for this machine (operator-provisioned, registered via
  # `clan secrets machines add`). Provisioned at first boot/deploy.
  sops.age.keyFile = "/var/lib/sops-nix/key.txt";

  fastfree.identity.name = lib.mkForce "client1";
  fastfree.identity.domain = lib.mkForce "client1.fastfree.local";
  fastfree.deployType = "hyperv";
  fastfree.build = true;
  fastfree.kvm = true;
  fastfree.flakeConfigName = "client1";
  fastfree.githubAccount = "FastFreeCloud";
  fastfree.gitOrigin = "https://github.com/FastFreeCloud/fastfree.git";
  fastfree.extra.timezone = "Africa/Cairo";
  fastfree.subdomains = { db = "db"; };

  fastfree.apps = {
    base = true;
    mariadb = true;
    fastfree_backend = true;
    fastfree_ledger = true;
    fastfree_erp = true;
    fastfree_hr = true;
    fastfree_pos = true;
    fastfree_website = true;
    phpmyadmin = true;
    caddy = true;
    desktop = true;
    avahi = true;
  };

  # Hyper-V guest disk layout (mirrors flake.nix mkClientModules hyperv branch).
  virtualisation.hypervGuest.enable = true;
  fileSystems."/" = {
    device = "/dev/disk/by-label/nixos";
    fsType = "ext4";
  };
  fileSystems."/boot" = {
    device = "/dev/disk/by-label/ESP";
    fsType = "vfat";
  };
  boot.loader.timeout = 0;
  boot.initrd.availableKernelModules = [ "hv_vmbus" "hv_storvsc" "hv_netvsc" "sd_mod" "sr_mod" ];
  boot.loader.grub = {
    efiSupport = true;
    efiInstallAsRemovable = true;
    device = "nodev";
  };

  fastfree.avahi = {
    enable = true;
    reflector = false;
    interfaces = [ "eth0" "wg0" ];
  };
}
