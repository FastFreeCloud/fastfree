# Customer Hyper-V appliance.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client8";
  fastfree.identity.domain = lib.mkForce "client8.fastfree.local";
  fastfree.flakeConfigName = "client8";
}
