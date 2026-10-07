{ lib, ... }: {
  # FastFree OS — NixOS configuration options
  options.fastfree = {
    identity = {
      name = lib.mkOption {
        type = lib.types.str;
        default = "fastfree";
        description = "System hostname.";
      };
      domain = lib.mkOption {
        type = lib.types.str;
        default = "fastfree.local";
        description = "Base domain for all services.";
      };
    };

    deployType = lib.mkOption {
      type = lib.types.enum [ "vps" "hyperv" "local" ];
      default = "hyperv";
      description = "Deployment type: vps (fresh server via disko + nixos-anywhere), hyperv (VHDX image), or local (existing physical machine, preserves disk + desktop).";
    };

    flakeConfigName = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Internal: flake attribute name for nixos-rebuild --flake.";
    };

    # NOTE: deploy target lives in Clan inventory (clan.nix deploy.targetHost),
    # not in a fastfree.* option.

    # App secrets (DB root/user, Frappe admin) live in Clan vars generators
    # (modules/mariadb.nix: mariadb-root, modules/fastfree_backend.nix:
    # fastfree-backend) — never as Nix options (values would bake into /nix/store).

    apps = {
      base         = lib.mkEnableOption "Base NixOS system";
      shell        = lib.mkEnableOption "zsh + deep-search CLI tools (rg/fd/ugrep/fzf)";
      herdr        = lib.mkEnableOption "Herdr CLI + socket API helpers";
      opencode     = lib.mkEnableOption "OpenCode web UI autostart";
      mariadb      = lib.mkEnableOption "MariaDB database server";
      caddy        = lib.mkEnableOption "Caddy reverse proxy";
      fastfree_backend = lib.mkEnableOption "FastFree Backend (Frappe/ERPNext)";
      fastfree_ledger  = lib.mkEnableOption "FastFree Ledger (Accounting + Inventory)";
      fastfree_erp     = lib.mkEnableOption "FastFree ERP (Full Enterprise Resource Planning)";
      fastfree_hr      = lib.mkEnableOption "FastFree HR (Human Resources + CRM)";
      fastfree_pos     = lib.mkEnableOption "FastFree POS (Point of Sale)";
      fastfree_website = lib.mkEnableOption "FastFree Website (Next.js public website)";
      phpmyadmin   = lib.mkEnableOption "phpMyAdmin";
      cockpit      = lib.mkEnableOption "Cockpit web-based server management";
      desktop      = lib.mkEnableOption "COSMIC desktop environment (all machines)";
    };

    subdomains = {
      db = lib.mkOption {
        type = lib.types.str;
        default = "db";
        description = "phpMyAdmin subdomain prefix.";
      };
      panel = lib.mkOption {
        type = lib.types.str;
        default = "panel";
        description = "Cockpit panel subdomain prefix.";
      };
    };

    githubAccount = lib.mkOption {
      type = lib.types.str;
      default = "FastFreeCloud";
      description = "GitHub account/organization name.";
    };

    githubRepo = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "GitHub repo URL (auto-derived from githubAccount if empty).";
    };

    # GitHub token lives in Clan vars (modules/integration.nix: github-token
    # generator) — never as a Nix option (values would bake into /nix/store).
    # Set with: clan vars set <machine> github-token/token

    gitOrigin = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Git remote URL for updates (e.g. git://fastdev/fastfree_os).";
    };

    networking = {
      interface = lib.mkOption {
        type = lib.types.str;
        default = "ens18";
        description = "Network interface name for static IP configuration.";
      };
      ipv4Address = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = "Static IPv4 address (empty = use DHCP).";
      };
      ipv4Gateway = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = "Default gateway.";
      };
      ipv4Prefix = lib.mkOption {
        type = lib.types.int;
        default = 24;
        description = "IPv4 prefix length.";
      };
      nameservers = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ "1.1.1.1" "8.8.8.8" ];
        description = "DNS nameservers.";
      };
    };



    kvm = lib.mkEnableOption "KVM hardware acceleration for QEMU builds";

    avahi = {
      enable = lib.mkEnableOption "Avahi mDNS/DNS-SD for .local domain resolution";

      reflector = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Reflect mDNS between network interfaces (LAN <-> WireGuard).";
      };

      interfaces = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        description = "Network interfaces for Avahi (empty = all non-loopback). NOTE: the Clan wireguard interface is literally named `wireguard` (instance name); legacy manual mesh is `wg0` — list both where both exist.";
      };
    };

    extra = {
      timezone = lib.mkOption {
        type = lib.types.str;
        default = "Africa/Cairo";
        description = "System timezone.";
      };
    };

  };
}
