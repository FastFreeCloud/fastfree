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
      type = lib.types.enum [ "hostinger" "hyperv" "wsl" ];
      default = "hyperv";
      description = "Deployment type: hostinger (nixos-anywhere), hyperv (VHDX image), or wsl (WSL tarball).";
    };

    flakeConfigName = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Internal: flake attribute name for nixos-rebuild --flake.";
    };

    deployHost = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "hostinger hostname or IP for nixos-anywhere deployment (e.g. fastfree.cloud).";
    };

    deployPassword = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "hostinger root password for nixos-anywhere initial SSH connection.";
    };

    passwords = {
      root = lib.mkOption {
        type = lib.types.str;
        default = "fastfree@2026";
        description = "Root user password.";
      };
      admin = lib.mkOption {
        type = lib.types.str;
        default = "fastfree@2026";
        description = "Admin user password.";
      };
      mariadbRoot = lib.mkOption {
        type = lib.types.str;
        default = "fastfree@2026";
        description = "MariaDB root password.";
      };
      mariadbUser = lib.mkOption {
        type = lib.types.str;
        default = "fastfree@2026";
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
      wireguard    = lib.mkEnableOption "WireGuard VPN";
      avahi        = lib.mkEnableOption "Avahi mDNS/DNS-SD";
    };

    subdomains = {
      db = lib.mkOption {
        type = lib.types.str;
        default = "db";
        description = "phpMyAdmin subdomain prefix.";
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
        default = "eth0";
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

    wsl = {
      defaultUser = lib.mkOption {
        type = lib.types.str;
        default = "root";
        description = "Default user for WSL.";
      };
      useWindowsDriver = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Enable OpenGL/GPU from Windows host.";
      };
      startMenuLaunchers = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Create Start Menu shortcuts for GUI apps.";
      };
      dockerDesktop = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Enable Docker Desktop WSL integration.";
      };
      wrapBinSh = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Wrap /bin/sh with correct env vars for NixOS.";
      };
      interop = {
        includePath = lib.mkOption {
          type = lib.types.bool;
          default = true;
          description = "Include Windows PATH in WSL PATH.";
        };
        register = lib.mkOption {
          type = lib.types.bool;
          default = false;
          description = "Register binfmt_misc handler for Windows executables.";
        };
      };
      wslConf = {
        boot.systemd = lib.mkOption {
          type = lib.types.bool;
          default = true;
          description = "Use systemd as init (required for NixOS).";
        };
        automount = {
          root = lib.mkOption {
            type = lib.types.str;
            default = "/mnt";
            description = "Directory to mount Windows drives.";
          };
          options = lib.mkOption {
            type = lib.types.str;
            default = "metadata,uid=1000,gid=100";
            description = "Default mount options for Windows drives.";
          };
        };
        network = {
          generateResolvConf = lib.mkOption {
            type = lib.types.bool;
            default = true;
            description = "Generate /etc/resolv.conf through WSL.";
          };
        };
      };
      sshAgent = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Enable ssh-agent passthrough to Windows.";
      };
      usbip = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Enable USB/IP integration.";
      };
    };

  };
}
