# FastFree Clan — inventory (official: clan.lol/docs/26.05/guides/inventory/intro-to-inventory)
# Machines registry + service assignment. Secrets come later via `clan vars` (phase 2).
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
  # - user-root/user-admin: prompt=false = auto-generated (CI-safe, no questions).
  # Secrets land encrypted in vars/ via `clan vars generate` (phase 1b).
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
        prompt = true;
      };
    };
    user-admin = {
      module.name = "users";
      roles.default.tags = [ "all" ];
      roles.default.settings = {
        user = "admin";
        prompt = true;
        groups = [ "wheel" "networkmanager" ];
      };
    };
    # Local desktop user (client3 only) — password auto-generated into vars
    # (replaces the old empty initialPassword). Retrieve with:
    # clan vars get client3 user-fastfree/user-password
    user-fastfree = {
      module.name = "users";
      roles.default.machines."client3" = { };
      roles.default.settings = {
        user = "fastfree";
        prompt = true;
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
