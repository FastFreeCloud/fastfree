{ config, lib, pkgs, ... }:

# FastFree app shortcuts — the professional NixOS way.
# Every enabled app gets: an XDG desktop entry (COSMIC launcher, Super-searchable)
# + a shell alias. URLs point at LOOPBACK ports on purpose:
#   - no DNS needed (.local is unresolvable by design: nsswitch mdns4_minimal
#     NOTFOUND=return + avahi refuses D-Bus publishing here)
#   - no TLS warnings (plain http on loopback, never LAN-exposed)
# The pretty https://<app>.<domain> names keep working wherever real DNS
# exists (VPS/LAN) — served by the same Caddy blocks (see caddy.nix).
# Skipped deliberately: backend (API only, no UI), mariadb (via db entry),
# base/shell/herdr (CLI tools, already have aliases), caddy/avahi (infra).
let
  apps = config.fastfree.apps;

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
      lib.optional apps.fastfree_website
        (webEntry "website" "Website" "http://127.0.0.1:9004") ++
      lib.optional apps.fastfree_erp
        (webEntry "erp" "ERP" "http://127.0.0.1:9101") ++
      lib.optional apps.fastfree_ledger
        (webEntry "ledger" "Ledger" "http://127.0.0.1:9102") ++
      lib.optional apps.fastfree_hr
        (webEntry "HR" "HR" "http://127.0.0.1:9103") ++
      lib.optional apps.fastfree_pos
        (webEntry "pos" "POS" "http://127.0.0.1:9104") ++
      lib.optional apps.phpmyadmin
        (webEntry "db" "Database" "http://127.0.0.1:8082") ++
      lib.optional apps.cockpit
        (webEntry "panel" "Server Panel" "http://127.0.0.1:9090") ++
      lib.optional apps.opencode
        (webEntry "opencode" "AI Assistant" "http://127.0.0.1:4096");

    environment.shellAliases = lib.mkMerge [
      (lib.mkIf apps.fastfree_website { ff-site = openAlias "http://127.0.0.1:9004"; })
      (lib.mkIf apps.fastfree_erp { ff-erp = openAlias "http://127.0.0.1:9101"; })
      (lib.mkIf apps.fastfree_ledger { ff-ledger = openAlias "http://127.0.0.1:9102"; })
      (lib.mkIf apps.fastfree_hr { ff-hr = openAlias "http://127.0.0.1:9103"; })
      (lib.mkIf apps.fastfree_pos { ff-pos = openAlias "http://127.0.0.1:9104"; })
      (lib.mkIf apps.phpmyadmin { ff-db = openAlias "http://127.0.0.1:8082"; })
      (lib.mkIf apps.cockpit { ff-panel = openAlias "http://127.0.0.1:9090"; })
      (lib.mkIf apps.opencode { ff-opencode = openAlias "http://127.0.0.1:4096"; })
    ];

    # ── FastFree group in COSMIC App Library ────────────────
    # Seed-only: created once if absent, never overwritten, so the user's
    # own organization (drag/rename/reorder) always wins over ours.
    # Format per cosmic-app-library app_group.rs: AppIds = .desktop basenames.
    # (No Dock folders exist upstream — dock favorites stay a flat list.)
    system.activationScripts.fastfree-app-group = ''
      for home in /home/*; do
        [ -d "$home" ] || continue
        user=$(basename "$home")
        id "$user" >/dev/null 2>&1 || continue
        gdir="$home/.config/cosmic/com.system76.CosmicAppLibrary/v1"
        mkdir -p "$gdir"
        if [ ! -f "$gdir/groups" ]; then
          printf '%s\n' \
            '// fastfree-managed seed: FastFree app group (safe to edit freely).' \
            '[' \
            '  (' \
            '    name: "FastFree",' \
            '    icon: "folder-symbolic",' \
            '    filter: AppIds([' \
            '      "fastfree-website",' \
            '      "fastfree-erp",' \
            '      "fastfree-ledger",' \
            '      "fastfree-hr",' \
            '      "fastfree-pos",' \
            '      "fastfree-db",' \
            '      "fastfree-panel",' \
            '      "fastfree-opencode",' \
            '    ]),' \
            '  ),' \
            ']' > "$gdir/groups"
          chown "$user" "$gdir/groups"
        fi
      done
    '';
  };
}
