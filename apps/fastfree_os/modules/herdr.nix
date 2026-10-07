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

  config = lib.mkIf (config.fastfree.apps.herdr || cfg.enable) {

    # ── Optional system-wide herdr package ──────────────────
    # Default null: herdr 0.9.3 is already installed per-user via
    # `nix profile install github:herdrdev/herdr` (/home/fastfree/.nix-profile/bin/herdr).
    # It is NOT in nixpkgs-26.05, so we do not force pkgs.herdr here.
    environment.systemPackages =
      lib.optional (cfg.package != null) cfg.package
      ++ (with pkgs; [ jq ]);

    # ── Local copy of CLI reference inside the project ──────
    # Source: https://herdr.dev/docs/cli-reference/ (v0.9.3, stable)
    # Full cheatsheet lives in docs/herdr-cli.md
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

    # ── zsh integration (needs modules/shell.nix) ───────────
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

    # ── Per-user opencode integration (declarative) ─────────
    # Runs `herdr integration install opencode` for every local user that
    # has BOTH binaries (upstream command merges configs itself, idempotent).
    # $systemConfig = new system (not yet live during activation).
    system.activationScripts.herdr-integrations = ''
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
