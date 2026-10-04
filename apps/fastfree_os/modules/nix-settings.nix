{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.base {

    # ── Nix ───────────────────────────────────────────────
    # Mirrors /etc/nixos/configuration.nix: flakes + trusted-users + flox cache.
    nix.settings = {
      experimental-features = [ "nix-command" "flakes" ];
      trusted-users = [ "root" "fastfree" "admin" ];
      extra-trusted-substituters = [ "https://cache.flox.dev" ];
      extra-trusted-public-keys = [
        "flox-cache-public-1:7F4OyH7ZCnFhcze3fJdfyXYLQw/aV7GEed86nQ7IsOs="
        "floxhub-1:0QOAlcobcEvq1mqEf4qAYCaWnTTOXpyoRv/PmqfSixM="
      ];
    };

    nix.settings.auto-optimise-store = true;
    nix.gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 14d";
    };
  };
}
