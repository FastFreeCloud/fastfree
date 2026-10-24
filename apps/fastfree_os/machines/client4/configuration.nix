# Customer Hyper-V appliance. Access control is declared centrally through Clan services.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client4";
  fastfree.identity.domain = lib.mkForce "client4.fastfree.local";
  fastfree.flakeConfigName = "client4";
}
