{ nixpkgs, clients, mkClientModules, system }:

{
  meta = {
    nixpkgs = import nixpkgs { inherit system; };
  };

  defaults = { ... }: {
    deployment.targetUser = "root";
  };

  client1 = { ... }: {
    deployment.targetHost = clients.client1.deployHost or "${clients.client1.hostName}.local";
    imports = mkClientModules "client1" clients.client1;
  };

  client2 = { ... }: {
    deployment.targetHost = clients.client2.deployHost or "${clients.client2.hostName}.local";
    imports = mkClientModules "client2" clients.client2;
  };

  client3 = { ... }: {
    deployment.targetHost = clients.client3.deployHost or "${clients.client3.hostName}.local";
    imports = mkClientModules "client3" clients.client3;
  };
}
