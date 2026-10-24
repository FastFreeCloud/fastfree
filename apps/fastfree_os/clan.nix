# FastFree Clan inventory and service assignments.
{ lib, ... }:
let
  hypervClients = map (n: "client${toString n}") (lib.range 2 11);
in
{
  meta.name = "fastfree";
  meta.domain = "fastfree.local";

  inventory.machines = {
    client1 = {
      deploy.targetHost = "root@fastfree.cloud";
      deploy.buildHost = "localhost";
      tags = [ "vps" "server" "fastfree" ];
    };
  } // builtins.listToAttrs (map (client: {
    name = client;
    value.tags = [ "hyperv" "server" "fastfree" ];
  }) hypervClients);

  inventory.instances = {
    wireguard = {
      module.name = "wireguard";
      module.input = "clan-core";
      roles.controller = {
        machines."client1" = { };
        settings = {
          endpoint = "fastfree.cloud";
          port = 51820;
        };
      };
      roles.peer.machines = builtins.listToAttrs (
        map (client: { name = client; value = { }; }) hypervClients
      );
    };

    internet = {
      module.name = "internet";
      module.input = "clan-core";
      roles.default.machines."client1".settings = {
        host = "fastfree.cloud";
        port = 22;
        user = "root";
        jumphosts = [ ];
      };
    };

    sshd = {
      module.name = "sshd";
      module.input = "clan-core";
      roles.server.machines."client1".settings.authorizedKeys = {
        "client2-deploy" = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILA5GRXOSiMnQEib+pXSH9CU10ujSc4qX8/GjblJKgM7 client2-deploy";
        "client3-admin" = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGszztIACEpNLDgPR0IH7HdNCU6hEbIP8WG7ssMXKPwg fastfree@client3";
        "windows-operator" = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILvq/DkqsJNIuBkcxc5ttL7N893RU2+xb+ynBTSYYcDR fastfree-panel-windows";
        "fastfree-ci-deploy" = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDVLRiAODxPOXtmU4fVllww02sx6hI21IrLTCAUp+gOk fastfree-ci-deploy";
      };
    };

    user-fastfree = {
      module.name = "users";
      module.input = "clan-core";
      roles.default.machines."client1" = { };
      roles.default.settings = {
        user = "fastfree";
        prompt = false;
        groups = [ "networkmanager" "wheel" ];
      };
    };

    clan-cache = {
      module.name = "trusted-nix-caches";
      module.input = "clan-core";
      roles.default.machines = { client1 = { }; } // builtins.listToAttrs (map (client: {
        name = client;
        value = { };
      }) hypervClients);
    };

    emergency-access = {
      module.name = "emergency-access";
      module.input = "clan-core";
      roles.default.machines.client1 = { };
    };
  };

  # Hyper-V machines and the VPS require explicit selection for updates.
  machines = builtins.listToAttrs (map (client: {
    name = client;
    value.clan.core.deployment.requireExplicitUpdate = true;
  }) ([ "client1" ] ++ hypervClients));
}
