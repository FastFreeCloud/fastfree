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

    deployHost = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "VPS hostname or IP for nixos-anywhere deployment (e.g. fastfree.cloud).";
    };

    deployPassword = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "VPS root password for nixos-anywhere initial SSH connection.";
    };

    passwords = {
      # Single source of truth is Clan vars (user-password-root/user-password-admin);
      # empty defaults ensure no burned plaintext password ships in the repo.
      root = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = "Root user password.";
      };
      admin = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = "Admin user password.";
      };
      mariadbRoot = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = "MariaDB root password.";
      };
      mariadbUser = lib.mkOption {
        type = lib.types.str;
        default = "";
        description = "MariaDB fastfree user password.";
      };
    };

    apps = {
      base         = lib.mkEnableOption "Base NixOS system";
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
      avahi        = lib.mkEnableOption "Avahi mDNS/DNS-SD";
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

    githubToken = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "GitHub Personal Access Token for private repo access.";
    };

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

    build = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Whether to build this configuration in CI (set false to skip).";
    };

    kernelModules = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
      description = "Extra kernel modules for boot.initrd.availableKernelModules (auto-derived from deployType when empty).";
    };

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
        description = "Network interfaces for Avahi (empty = all non-loopback).";
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
