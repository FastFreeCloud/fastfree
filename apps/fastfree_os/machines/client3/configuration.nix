# Clan machine: client3 (local physical machine "nixos")
# Official autoincludes: machines/<name>/configuration.nix is imported automatically.
# Canonical Clan definition (server apps stay OFF until first successful switch).
# DANGER: never `clan machines install` here and never add disko —
# this disk holds real data. Local updates only.
{ config, lib, pkgs, inputs, ... }:

let
  # Pinned unstable input (locked in flake.lock): opencode from nixos-unstable.
  unstablePkgs = import inputs.nixpkgs-unstable {
    system = pkgs.stdenv.hostPlatform.system;
    config.allowUnfree = true;
  };
in
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
  # NOTE: ./hardware-configuration.nix is auto-imported by Clan autoincludes —
  # do NOT add it here (double import = conflicting definitions).
  ];

  # ── Local preservation: legacy BIOS GRUB + OS prober (dual-boot),
  # NetworkManager, existing desktop user, open GPU stack, SSH OFF.

  fastfree.identity.name = lib.mkForce "client3";
  fastfree.identity.domain = lib.mkForce "fastfree.local";
  fastfree.deployType = "local";
  fastfree.flakeConfigName = "client3";
  fastfree.githubAccount = "FastFreeCloud";
  fastfree.gitOrigin = "https://github.com/FastFreeCloud/fastfree.git";
  fastfree.extra.timezone = "Africa/Cairo";
  fastfree.subdomains = { db = "db"; };

  # sops age key for this machine (official sops-nix: key source).
  # SSH stays OFF on local by design, so host keys can't serve as source —
  # the operator-provisioned age key (registered via `clan secrets machines add`)
  # lives at this path on the machine itself.
  sops.age.keyFile = "/var/lib/sops-nix/key.txt";

  # ── Bootloader (legacy BIOS, dual-boot) ──
  boot.loader.grub = {
    enable = lib.mkForce true;
    device = lib.mkForce "/dev/sda";
    useOSProber = lib.mkForce false;
  };

  # ── Networking (NetworkManager, default firewall) ──
  networking.networkmanager.enable = lib.mkForce true;

  # ── Desktop user (existing account on the machine) ──
  # Password comes from Clan vars (user-fastfree instance), NOT from plaintext:
  # the old initialPassword ("") is removed so vars is the single source.
  users.users."fastfree" = {
    isNormalUser = true;
    description = "mohamed";
    extraGroups = [ "networkmanager" "wheel" "podman" ];
  };

  # ── Locale extras ──
  i18n.extraLocaleSettings = {
    LC_ADDRESS = "en_US.UTF-8";
    LC_IDENTIFICATION = "en_US.UTF-8";
    LC_MEASUREMENT = "en_US.UTF-8";
    LC_MONETARY = "en_US.UTF-8";
    LC_NAME = "en_US.UTF-8";
    LC_NUMERIC = "en_US.UTF-8";
    LC_PAPER = "en_US.UTF-8";
    LC_TELEPHONE = "en_US.UTF-8";
    LC_TIME = "en_US.UTF-8";
  };

  # ── SSH stays OFF (openssh was commented out on this machine) ──
  services.openssh.enable = lib.mkForce false;

  # ── Packages (git comes from the base module) ──
  environment.systemPackages = [
    pkgs.wget
    unstablePkgs.opencode
  ];

  # ── Unfree allowed ──
  nixpkgs.config.allowUnfree = true;

  # All apps enabled (same set as production VPS client2 + shell/herdr).
  fastfree.apps = {
    base = true;
    shell = true;
    herdr = true;
    opencode = true;
    mariadb = true;
    caddy = true;
    fastfree_backend = true;
    fastfree_ledger = true;
    fastfree_erp = true;
    fastfree_hr = true;
    fastfree_pos = true;
    fastfree_website = true;
    phpmyadmin = true;
    cockpit = true;
    desktop = true;
  };

  # Herdr CLI from flake input (system-wide binary).
  fastfree.herdr.package = inputs.herdr.packages.${pkgs.stdenv.hostPlatform.system}.default;

  # OpenCode web UI (same unstable package as systemPackages above).
  fastfree.opencode.package = unstablePkgs.opencode;

  fastfree.avahi = {
    enable = true;
    reflector = true;
    interfaces = [ ];
  };
}
