# Customer Hyper-V appliance.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client9";
  fastfree.identity.domain = lib.mkForce "client9.fastfree.local";
  fastfree.flakeConfigName = "client9";
}
