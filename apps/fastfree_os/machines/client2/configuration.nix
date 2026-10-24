# Customer Hyper-V appliance. Secrets and network membership are managed by Clan inventory/Vars.
{ lib, ... }:
{
  imports = [ ../../profiles/hyperv.nix ];
  fastfree.identity.name = lib.mkForce "client2";
  fastfree.identity.domain = lib.mkForce "client2.fastfree.local";
  fastfree.flakeConfigName = "client2";
}
