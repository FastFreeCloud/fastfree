# FastFree Clan 26.05 Reference Implementation
# Demonstrates: Multi-Transport Networking (Internet + WireGuard + ZeroTier) + Garage S3 + BorgBackup
{
  meta.name = "fastfree";
  meta.domain = "fastfree.local";

  inventory.machines = {
    # Hyper-V image (built in CI as VHDX)
    client1 = {
      tags = [ "hyperv" "server" "fastfree" ];
    };

    # Production VPS (Cloud host)
    client2 = {
      tags = [ "vps" "server" "fastfree" ];
    };

    # Local development machine (protected from remote updates)
    client3 = {
      tags = [ "local" "never-install" "fastfree" ];
    };
  };

  inventory.instances = {
    # 1. Clearnet / Direct Public SSH (Highest Priority Transport)
    internet = {
      module.name = "internet";
      roles.default.machines."client2".settings = {
        host = "fastfree.cloud";
        port = 22;
        user = "root";
      };
    };

    # 2. Kernel WireGuard Mesh (IPv6 ULA fd00::/8)
    wireguard = {
      module.name = "wireguard";
      module.input = "clan-core";
      roles.controller.machines."client2".settings = {
        endpoint = "fastfree.cloud";
        port = 51821; # Distinct port to avoid clash with legacy wg0
      };
      roles.peer.machines."client1".settings.port = 51821;
      roles.peer.machines."client3".settings.port = 51821;
    };

    # 3. ZeroTier Mesh (Automatic Failover & NAT-Busting with Self-Hosted Controller)
    zerotier = {
      module.name = "zerotier";
      module.input = "clan-core";
      roles.controller.machines."client2" = { };
      roles.moon.machines."client2".settings = {
        stableEndpoints = [ "fastfree.cloud:9993" ];
      };
      roles.peer.machines."client1" = { };
      roles.peer.machines."client3" = { };
    };

    # 4. Distributed Sovereign S3 Object Storage
    garage = {
      module.name = "garage";
      module.input = "clan-core";
      roles.storage-node.machines."client1" = { };
      roles.storage-node.machines."client2" = { };
    };

    # 5. Client-Server Encrypted Deduplicated Backups
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

    # 6. Centralized Monitoring (Prometheus + Grafana + Loki)
    monitoring = {
      module.name = "monitoring";
      module.input = "clan-core";
      roles.client.tags = [ "all" ];
      roles.client.settings.useSSL = false;
      roles.server.machines."client2".settings = {
        grafana.enable = true;
      };
    };
  };

  machines = {
    client3.clan.core.deployment.requireExplicitUpdate = true;
    client1.clan.core.deployment.requireExplicitUpdate = true;
  };
}
