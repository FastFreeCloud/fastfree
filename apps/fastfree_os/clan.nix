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
      deploy.buildHost = "localhost";
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
        # Operator workstation (client3). WITHOUT this the deploy would replace
        # root's key set with client2-deploy alone and lock out every manual
        # `clan machines update` / `clan ssh` run from the workstation.
        "client3-admin" = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGszztIACEpNLDgPR0IH7HdNCU6hEbIP8WG7ssMXKPwg fastfree@client3";
        "windows-operator" = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILvq/DkqsJNIuBkcxc5ttL7N893RU2+xb+ynBTSYYcDR fastfree-panel-windows";
      };
    };
    user-fastfree = {
      module.name = "users";
      roles.default.machines."client3" = { };
      roles.default.settings = {
        user = "fastfree";
        prompt = false;
        groups = [ "networkmanager" "wheel" ];
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
    # Backups & Monitoring: Disabled until Clan vars are re-keyed with current server host key.
    # borgbackup = { ... };
    # monitoring = { ... };
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
