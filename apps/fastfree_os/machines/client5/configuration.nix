# Customer Hyper-V appliance.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client5";
  fastfree.identity.domain = lib.mkForce "client5.fastfree.local";
  fastfree.flakeConfigName = "client5";
}
