{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.herdr;
in {
  options.fastfree.herdr = {
    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = "Herdr package. Null = do not add to systemPackages (herdr comes from nix profile flake github:herdrdev/herdr). Set to a package to install system-wide.";
    };
  };

  config = lib.mkIf config.fastfree.apps.herdr {

    # herdr comes from the flake input (set per-machine via
    # fastfree.herdr.package); not in nixpkgs, never pkgs.herdr.
    environment.systemPackages =
      lib.optional (cfg.package != null) cfg.package
      ++ (with pkgs; [ jq ]);

    # Local CLI reference (docs/herdr-cli.md) + quick start.
    environment.etc."herdr/cli-reference.md".source = ../docs/herdr-cli.md;
    environment.etc."herdr/README".text = ''
      Herdr CLI 0.9.3 — quick start:
        herdr                         # launch / attach default session
        herdr status                  # client + server status
        herdr workspace list
        herdr pane list
        herdr agent list
      Full reference: /etc/herdr/cli-reference.md
      Upstream docs: https://herdr.dev/docs/cli-reference/
    '';

    # ── zsh integration ─────────────────────────────────────
    programs.zsh.interactiveShellInit = lib.mkAfter ''
      # herdr socket helpers (same local socket API as CLI)
      if command -v herdr >/dev/null 2>&1; then
        alias hs='herdr status'
        alias hw='herdr workspace list'
        alias hp='herdr pane list'
        alias ha='herdr agent list'
        export HERDR_DOCS="/etc/herdr/cli-reference.md"
      fi
    '';

    # ── Per-user opencode integration ───────────────────────
    # Idempotent upstream command; $systemConfig = new (not yet live) system.
    system.activationScripts.herdr-integrations = ''
      # Activation PATH is minimal: add what this script uses.
      export PATH="${pkgs.coreutils}/bin:${pkgs.sudo}/bin:$PATH"
      for home in /home/*; do
        [ -d "$home" ] || continue
        user=$(basename "$home")
        id "$user" >/dev/null 2>&1 || continue
        HERDR_BIN=""
        OPENCODE_BIN=""
        for c in "$systemConfig/sw/bin/herdr" "$home/.nix-profile/bin/herdr"; do
          [ -x "$c" ] && HERDR_BIN="$c" && break
        done
        for c in "$systemConfig/sw/bin/opencode" "$home/.nix-profile/bin/opencode"; do
          [ -x "$c" ] && OPENCODE_BIN="$c" && break
        done
        if [ -n "$HERDR_BIN" ] && [ -n "$OPENCODE_BIN" ]; then
          mkdir -p "$home/.config/opencode"
          chown "$user" "$home/.config/opencode"
          sudo -u "$user" HOME="$home" "$HERDR_BIN" integration install opencode >/dev/null 2>&1 || true
        fi
      done
    '';
  };
}
