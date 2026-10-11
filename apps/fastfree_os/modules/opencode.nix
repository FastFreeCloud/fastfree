{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.opencode;
in {
  options.fastfree.opencode = {
    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = "OpenCode package (from nixpkgs-unstable). Null = service disabled.";
    };

    mcpNixos = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Expose the NixOS MCP server (mcp-nixos, in nixpkgs) to OpenCode: authoritative option/package lookup instead of guessing NixOS option shapes.";
    };
  };

  config = lib.mkIf (config.fastfree.apps.opencode && cfg.package != null) {
    # Runs as the logged-in user (needs their API keys); localhost only.
    # `opencode web` blocks serving HTTP (browser open is best-effort).
    systemd.user.services.opencode-web = {
      description = "OpenCode web interface on http://127.0.0.1:4096";
      wantedBy = [ "graphical-session.target" "default.target" ];
      serviceConfig = {
        ExecStart = "${cfg.package}/bin/opencode web --port 4096";
        Restart = "on-failure";
        RestartSec = "5";
      };
    };

    # mcp-nixos ships in nixpkgs (no flake input, no overlay): two tools —
    # `nix` (packages, options, wiki, flake inputs, binary-cache status) and
    # `nix_versions`. Installed system-wide so the store path is stable in the
    # config below.
    environment.systemPackages = lib.mkIf cfg.mcpNixos [ pkgs.mcp-nixos ];

    # Register the MCP server in OpenCode's global config.
    #
    # Managed declaratively, but only until the user writes their own "mcp"
    # section — after that the file is theirs and we never touch it again.
    # Backs up a pre-existing file once (*.fastfree-bak).
    system.activationScripts.opencode-mcp = lib.mkIf cfg.mcpNixos ''
      # Activation PATH is minimal (no grep/sed!): coreutils only.
      export PATH="${pkgs.coreutils}/bin:$PATH"
      for home in /home/*; do
        [ -d "$home" ] || continue
        user=$(basename "$home")
        id "$user" >/dev/null 2>&1 || continue
        dir="$home/.config/opencode"
        mkdir -p "$dir"
        chown "$user" "$dir"
        f="$dir/opencode.jsonc"
        [ -f "$f" ] || : > "$f"
        case $(cat "$f") in
          *'"mcp"'*)
            # User already configures MCP — leave it completely alone.
            ;;
          *)
            [ -s "$f" ] && [ ! -f "$f.fastfree-bak" ] && cp -a "$f" "$f.fastfree-bak"
            cat > "$f" <<EOF
      {
        "\$schema": "https://opencode.ai/config.json",
        "mcp": {
          "nixos": {
            "type": "local",
            "command": [ "${pkgs.mcp-nixos}/bin/mcp-nixos" ],
            "enabled": true
          }
        }
      }
      EOF
            chown "$user" "$f"
            ;;
        esac
      done
    '';
  };
}
