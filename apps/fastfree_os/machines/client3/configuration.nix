# Customer Hyper-V appliance. Its former local-machine role has moved to the fleet model.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client3";
  fastfree.identity.domain = lib.mkForce "client3.fastfree.local";
  fastfree.flakeConfigName = "client3";
}
