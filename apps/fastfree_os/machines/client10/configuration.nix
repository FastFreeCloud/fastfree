# Customer Hyper-V appliance.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client10";
  fastfree.identity.domain = lib.mkForce "client10.fastfree.local";
  fastfree.flakeConfigName = "client10";
}
