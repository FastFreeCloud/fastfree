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
    ../../modules/desktop.nix
    ../../modules/avahi-subdomains.nix
  # NOTE: ./hardware-configuration.nix is auto-imported by Clan autoincludes —
  # do NOT add it here (double import = conflicting definitions).
  ];

  # ── Local preservation (was nix/local-machine.nix, merged here) ──
  # Legacy BIOS GRUB + OS prober (dual-boot), NetworkManager, existing
  # desktop user, open GPU stack, SSH OFF, unfree allowed.

  fastfree.identity.name = lib.mkForce "nixos";
  fastfree.identity.domain = lib.mkForce "fastfree.local";
  fastfree.deployType = "local";
  fastfree.build = false;
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
    useOSProber = true;
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

  # ── Packages (git comes from base.nix) ──
  environment.systemPackages = [
    pkgs.wget
    unstablePkgs.opencode
  ];

  # ── Unfree allowed ──
  nixpkgs.config.allowUnfree = true;

  # SMOKE TEST: server apps stay OFF until first successful switch.
  fastfree.apps = {
    base = true;
    desktop = true;
    avahi = true;
  };

  fastfree.avahi = {
    enable = true;
    reflector = true;
    interfaces = [ ];
  };
}
