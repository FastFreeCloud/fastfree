# Customer Hyper-V appliance.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client6";
  fastfree.identity.domain = lib.mkForce "client6.fastfree.local";
  fastfree.flakeConfigName = "client6";
}
