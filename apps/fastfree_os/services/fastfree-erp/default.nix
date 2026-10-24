# Official Clan 26.05 Service Module for FastFree ERP Stack
{ lib, ... }:
{
  _class = "clan.service";

  manifest = {
    name = "fastfree-erp";
    description = "FastFree Sovereign Monorepo & ERP Engine (MariaDB, Caddy, Backend, Ledger, POS, HR, ERP)";
    categories = [ "ERP" "Business" ];
  };

  roles.default = {
    description = "Hosts the FastFree sovereign ERP stack and web frontends";
    perInstance.nixosModule = { config, lib, pkgs, ... }: {
      fastfree.apps = {
        base = lib.mkDefault true;
        mariadb = lib.mkDefault true;
        caddy = lib.mkDefault true;
        fastfree_backend = lib.mkDefault true;
        fastfree_ledger = lib.mkDefault true;
        fastfree_erp = lib.mkDefault true;
        fastfree_hr = lib.mkDefault true;
        fastfree_pos = lib.mkDefault true;
      };
    };
  };
}
