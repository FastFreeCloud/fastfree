{ config, lib, pkgs, ... }:

# FastFree app shortcuts — the professional NixOS way.
# Every enabled app gets: an XDG desktop entry (COSMIC launcher, Super-searchable)
# + a shell alias. URLs are interpolated at BUILD time, so each machine gets
# its own correct domain. Web entries assume Caddy serves them (all app
# machines enable caddy alongside the apps).
# Skipped deliberately: backend (API only, no UI), mariadb (via db entry),
# base/shell/herdr (CLI tools, already have aliases), caddy/avahi (infra).
let
  apps = config.fastfree.apps;
  domain = config.fastfree.identity.domain;
  sd = config.fastfree.subdomains;
  web = apps.caddy;

  webEntry = name: title: url: pkgs.makeDesktopItem {
    name = "fastfree-${name}";
    desktopName = "FastFree ${title}";
    comment = "Open ${title} (${url})";
    exec = "${pkgs.xdg-utils}/bin/xdg-open ${url}";
    categories = [ "Network" "WebBrowser" ];
  };

  openAlias = url: "${pkgs.xdg-utils}/bin/xdg-open ${url} >/dev/null 2>&1 &";
in {
  config = lib.mkIf apps.base {
    environment.systemPackages = [ pkgs.xdg-utils ] ++
      lib.optional (web && apps.fastfree_website)
        (webEntry "website" "Website" "https://${domain}") ++
      lib.optional (web && apps.fastfree_erp)
        (webEntry "erp" "ERP" "https://erp.${domain}") ++
      lib.optional (web && apps.fastfree_ledger)
        (webEntry "ledger" "Ledger" "https://ledger.${domain}") ++
      lib.optional (web && apps.fastfree_hr)
        (webEntry "HR" "HR" "https://hr.${domain}") ++
      lib.optional (web && apps.fastfree_pos)
        (webEntry "pos" "POS" "https://pos.${domain}") ++
      lib.optional (web && apps.phpmyadmin)
        (webEntry "db" "Database" "https://${sd.db}.${domain}") ++
      lib.optional (web && apps.cockpit)
        (webEntry "panel" "Server Panel" "https://${sd.panel}.${domain}") ++
      lib.optional apps.opencode
        (webEntry "opencode" "AI Assistant" "http://127.0.0.1:4096");

    environment.shellAliases = lib.mkMerge [
      (lib.mkIf (web && apps.fastfree_website) { ff-site = openAlias "https://${domain}"; })
      (lib.mkIf (web && apps.fastfree_erp) { ff-erp = openAlias "https://erp.${domain}"; })
      (lib.mkIf (web && apps.fastfree_ledger) { ff-ledger = openAlias "https://ledger.${domain}"; })
      (lib.mkIf (web && apps.fastfree_hr) { ff-hr = openAlias "https://hr.${domain}"; })
      (lib.mkIf (web && apps.fastfree_pos) { ff-pos = openAlias "https://pos.${domain}"; })
      (lib.mkIf (web && apps.phpmyadmin) { ff-db = openAlias "https://${sd.db}.${domain}"; })
      (lib.mkIf (web && apps.cockpit) { ff-panel = openAlias "https://${sd.panel}.${domain}"; })
      (lib.mkIf apps.opencode { ff-opencode = openAlias "http://127.0.0.1:4096"; })
    ];
  };
}
