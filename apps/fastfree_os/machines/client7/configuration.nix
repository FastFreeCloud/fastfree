# Customer Hyper-V appliance.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client7";
  fastfree.identity.domain = lib.mkForce "client7.fastfree.local";
  fastfree.flakeConfigName = "client7";
}
