# Customer Hyper-V appliance.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client11";
  fastfree.identity.domain = lib.mkForce "client11.fastfree.local";
  fastfree.flakeConfigName = "client11";
}
