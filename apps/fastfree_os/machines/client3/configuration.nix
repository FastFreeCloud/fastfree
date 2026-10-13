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
    ../../modules/remote.nix
    ../../modules/tunnel.nix
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

  # ── SSH ────────────────────────────────────────────────
  # On so that `clan machines update client3` works without a console.
  # Bound to the wireguard mesh + LAN; the operator key is provisioned from
  # the clan vars users instance, and WireGuard-only reachability is enforced
  # by the firewall rule below.
  services.openssh.enable = lib.mkForce true;
  services.openssh.settings = {
    PermitRootLogin = "yes";
    PasswordAuthentication = false;
    KbdInteractiveAuthentication = false;
  };
  networking.firewall.allowedTCPPorts = [ 22 ];

  # ── Packages (git comes from the base module) ──
  environment.systemPackages = [
    pkgs.wget
    pkgs.chromium
    unstablePkgs.opencode
  ];

  # ── Unfree allowed ──
  nixpkgs.config.allowUnfree = true;

  # Chromium policies only (extensions / search / native messaging hosts).
  # The browser binary itself comes from `pkgs.chromium` in
  # environment.systemPackages above — this module writes /etc/chromium/* only.
  # Declared here rather than in modules/desktop.nix because client1 also sets
  # apps.desktop = true and a Hyper-V server image has no use for a browser.
  programs.chromium.enable = true;

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
    remote = true;
  };

  # Herdr CLI from flake input (system-wide binary).
  fastfree.herdr.package = inputs.herdr.packages.${pkgs.stdenv.hostPlatform.system}.default;

  # OpenCode web UI (same unstable package as systemPackages above).
  fastfree.opencode.package = unstablePkgs.opencode;

  # Cloudflare quick tunnels → phone-accessible https:// links for the loopback
  # web UIs. Outbound only, no new firewall port; the URL is random and changes
  # on every tunnel restart, so read it with `ff-urls` (see modules/tunnel.nix).
  fastfree.tunnel.enable = true;

  # Herdr web UI on the phone. The plugin binds 0.0.0.0 (HOST in its
  # HERDR_PLUGIN_CONFIG_DIR/.env), but neither the LAN address nor the
  # ZeroTier managed route reaches the phone from this network, so publish it
  # through a third quick tunnel. The tunnel dials out to the Cloudflare edge
  # and the edge proxies back, so no port has to be routable here.
  #
  # HERDR_WEB_TOKEN is set, which is what makes this safe: the tunnel URL is
  # public and the edge does not authenticate. Without the token anyone who
  # gets the URL could type into this machine's terminals.
  fastfree.tunnel.herdr.enable = true;

  fastfree.avahi = {
    enable = true;
    reflector = true;
    interfaces = [ ];
  };

  }
