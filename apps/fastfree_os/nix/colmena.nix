{ nixpkgs, clients, mkClientModules, system }:

{
  meta = {
    nixpkgs = import nixpkgs { inherit system; };
  };

  defaults = { ... }: {
    deployment.targetUser = "root";
  };

  dev = { ... }: {
    deployment.targetHost = clients.dev.deployHost or "${clients.dev.hostName}.local";
    imports = mkClientModules "dev" clients.dev;
  };

  client1 = { ... }: {
    deployment.targetHost = clients.client1.deployHost or "${clients.client1.hostName}.local";
    imports = mkClientModules "client1" clients.client1;
  };

  client2 = { ... }: {
    deployment.targetHost = clients.client2.deployHost or "${clients.client2.hostName}.local";
    imports = mkClientModules "client2" clients.client2;
  };

  server = { ... }: {
    deployment.targetHost = clients.server.deployHost or "fastfree.cloud";
    imports = mkClientModules "server" clients.server;
  };
}
