{ ... }:

{
  imports = [
    ../options.nix
    ../modules/networking.nix
    ../modules/locale.nix
    ../modules/boot.nix
    ../modules/nix-settings.nix
    ../modules/system.nix
    ../modules/integration.nix
    ../modules/shell.nix
    ../modules/mariadb.nix
    ../modules/caddy.nix
    ../modules/fastfree_backend.nix
    ../modules/fastfree_panel.nix
    ../modules/fastfree_ledger.nix
    ../modules/fastfree_erp.nix
    ../modules/fastfree_hr.nix
    ../modules/fastfree_pos.nix
    ../modules/fastfree_website.nix
    ../modules/dbgate.nix
    ../modules/cockpit.nix
    ../modules/avahi-subdomains.nix
  ];

  nixpkgs.hostPlatform = "x86_64-linux";
  fastfree.githubAccount = "FastFreeCloud";
  fastfree.gitOrigin = "https://github.com/FastFreeCloud/fastfree.git";
  fastfree.extra.timezone = "Africa/Cairo";
}
