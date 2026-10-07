# FastFree Clan — inventory (official: clan.lol/docs/26.05/guides/inventory/intro-to-inventory)
# Machines registry + service assignment.
{
  meta.name = "fastfree";
  meta.domain = "fastfree.local";

  inventory.machines = {
    # Hyper-V image — built in CI as VHDX, never installed via clan.
    # No deploy.targetHost on purpose (image-only).
    client1 = {
      tags = [ "hyperv" "server" "fastfree" ];
    };
    # Production VPS — deployed via `clan machines update client2`.
    client2 = {
      deploy.targetHost = "root@fastfree.cloud";
      tags = [ "vps" "server" "fastfree" ];
    };
    # Local machine (nixos) — local-only updates, never wiped.
    # No remote targetHost on purpose; protected by requireExplicitUpdate below.
    client3 = {
      tags = [ "local" "never-install" "fastfree" ];
    };
  };

  # Phase 1 instances (official: intro-to-vars + services/official/sshd + services/official/users).
  # - sshd: host keys auto-generated, no prompts.
  # - users: prompt=false = auto-generate random password, never asks
  #   (official docs: prompt=true would ask on install/update when var is missing).
  # Secrets land encrypted in vars/ via `clan vars generate`.
  inventory.instances = {
    sshd = {
      roles.server.tags = [ "all" ];
      roles.server.machines."client2".settings.authorizedKeys = {
        "client2-deploy" = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILA5GRXOSiMnQEib+pXSH9CU10ujSc4qX8/GjblJKgM7 client2-deploy";
      };
    };
    user-root = {
      module.name = "users";
      roles.default.tags = [ "all" ];
      roles.default.settings = {
        user = "root";
        prompt = false;
      };
    };
    user-fastfree = {
      module.name = "users";
      roles.default.machines."client3" = { };
      roles.default.settings = {
        user = "fastfree";
        prompt = false;
        groups = [ "networkmanager" "wheel" "podman" ];
      };
    };
    # Official wireguard mesh (docs: services/official/wireguard) — IPv6 ULA,
    # auto keys/hosts. Runs ALONGSIDE the legacy IPv4 wg0 (10.100.0.x) which
    # still serves non-NixOS field devices. Port 51821 (not 51820) to avoid
    # the documented "Address already in use" clash with the legacy interface.
    wireguard = {
      module.name = "wireguard";
      module.input = "clan-core";
      roles.controller.machines."client2".settings = {
        endpoint = "fastfree.cloud";
        port = 51821;
      };
      roles.peer.machines."client1".settings.port = 51821;
      roles.peer.machines."client3".settings.port = 51821;
    };
    # Backups (docs: guides/backups/intro-to-backups + services/official/borgbackup).
    # client2 (always-on VPS, SSH on) is the repo server; client1+client2 push to it
    # (empty client settings = back up to the clan server, keys auto-generated).
    # client3 keeps SSH OFF by design, so it backs up to a LOCAL borg repo (no SSH needed).
    # clan.core.state folders are picked up automatically; default schedule 01:00.
    borgbackup = {
      module.name = "borgbackup";
      module.input = "clan-core";
      roles.server.machines."client2".settings = {
        address = "fastfree.cloud";
        directory = "/var/lib/borgbackup";
      };
      roles.client.machines."client1" = { };
      roles.client.machines."client2" = { };
      roles.client.machines."client3".settings = {
        destinations.local.repo = "/var/lib/backups/client3";
      };
    };
    # Monitoring (docs: services/official/monitoring) — exactly one server.
    # client2 (always-on VPS) stores (Loki+Mimir+Grafana); all push to it.
    monitoring = {
      module.name = "monitoring";
      module.input = "clan-core";
      roles.client.tags = [ "all" ];
      roles.client.settings.useSSL = false;
      roles.server.machines."client2".settings = {
        grafana.enable = true;
      };
    };
    # Trusted binary caches (docs: services/official/trusted-nix-caches).
    # Zero settings, zero secrets — speeds up builds on all machines.
    clan-cache = {
      module.name = "trusted-nix-caches";
      module.input = "clan-core";
      roles.default.machines = {
        client1 = { };
        client2 = { };
        client3 = { };
      };
    };
    # Emergency recovery password (docs: services/official/emergency-access).
    # Auto-set by Clan, used only to debug boot failures. Remote/headless
    # machines only (client3 has physical access); owns
    # boot.initrd.systemd.emergencyAccess, so never set it in modules/.
    emergency-access = {
      module.name = "emergency-access";
      module.input = "clan-core";
      roles.default.machines = {
        client1 = { };
        client2 = { };
      };
    };
  };

  # Protect the local machine (and images) from bare `clan machines update`
  # (official: reference/clan.core/deployment — requireExplicitUpdate).
  machines = {
    client3 = {
      clan.core.deployment.requireExplicitUpdate = true;
    };
    client1 = {
      clan.core.deployment.requireExplicitUpdate = true;
    };
  };
}
