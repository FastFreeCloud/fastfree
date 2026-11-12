# FastFree Clan inventory and service assignments.
{ lib, ... }:
let
  inventory = builtins.fromJSON (builtins.readFile ./inventory.json);
  hypervClients = map (n: "client${toString n}") (lib.range 1 11);
in
{
  meta = inventory.meta;

  modules.fastfree-erp = import ./services/fastfree-erp/default.nix;

  inventory = {
    machines = inventory.machines;
    instances = inventory.instances;
  };

  # All 11 sovereign Hyper-V appliances: import hyperv profile, bind identities, enforce explicit updates
  machines = builtins.listToAttrs (map (client: {
    name = client;
    value = {
      imports = [ ./profiles/hyperv.nix ];
      fastfree.identity.name = client;
      fastfree.identity.domain = "${client}.fastfree.local";
      fastfree.flakeConfigName = client;
      clan.core.deployment.requireExplicitUpdate = true;
    };
  }) hypervClients);
}
