# Central FastFree VPS. Machine-specific values stay here; shared policy is in profiles/vps.nix.
{ lib, ... }:
{
  imports = [ ../../profiles/vps.nix ];
  fastfree.identity.name = lib.mkForce "client1";
  fastfree.identity.domain = lib.mkForce "fastfree.cloud";
  fastfree.flakeConfigName = "client1";
}
