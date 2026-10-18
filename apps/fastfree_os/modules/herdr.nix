{ config, lib, pkgs, ... }:

let
  cfg = config.fastfree.herdr;

  # OpenCode CLI wrapper (uses Node.js 22 runtime)
  opencodePkg = pkgs.writeShellScriptBin "opencode" ''
    export PATH="${pkgs.nodejs_22}/bin:${pkgs.git}/bin:${pkgs.coreutils}/bin:$PATH"
    if [ -x "/var/lib/herdr/agents/opencode/node_modules/.bin/opencode" ]; then
      exec /var/lib/herdr/agents/opencode/node_modules/.bin/opencode "$@"
    fi
    exec ${pkgs.nodejs_22}/bin/npx -y @opencode/cli "$@"
  '';

  # Hermes Agent CLI wrapper (uses Python 3.11 runtime)
  hermesPkg = pkgs.writeShellScriptBin "hermes" ''
    export PATH="${pkgs.python311}/bin:${pkgs.git}/bin:${pkgs.curl}/bin:${pkgs.coreutils}/bin:$PATH"
    VENV_DIR="/var/lib/herdr/agents/hermes-venv"
    if [ ! -f "$VENV_DIR/bin/hermes" ]; then
      echo "[hermes] Initializing Hermes Agent environment in $VENV_DIR..."
      mkdir -p "$VENV_DIR"
      ${pkgs.python311}/bin/python3 -m venv "$VENV_DIR"
      "$VENV_DIR/bin/pip" install --upgrade pip setuptools wheel --quiet 2>/dev/null || true
      "$VENV_DIR/bin/pip" install hermes-agent --quiet 2>/dev/null || true
    fi
    if [ -x "$VENV_DIR/bin/hermes" ]; then
      exec "$VENV_DIR/bin/hermes" "$@"
    else
      echo "[hermes] Starting Hermes Agent via python module..."
      exec "$VENV_DIR/bin/python" -m hermes_agent "$@"
    fi
  '';

  # hermas alias for hermes
  hermasAlias = pkgs.writeShellScriptBin "hermas" ''
    exec ${hermesPkg}/bin/hermes "$@"
  '';

in {
  options.fastfree.herdr = {
    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = "Herdr package. Null = do not add to systemPackages (herdr comes from nix profile flake github:herdrdev/herdr). Set to a package to install system-wide.";
    };

    enableOpenCode = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Automatically install and integrate OpenCode CLI into Herdr.";
    };

    enableHermes = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Automatically install and integrate Hermes Agent (hermas) into Herdr.";
    };

    headlessServer = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Run Herdr headless server daemon in background as systemd service.";
    };
  };

  config = lib.mkIf config.fastfree.apps.herdr {

    # ── System Packages ─────────────────────────────────────
    environment.systemPackages =
      lib.optional (cfg.package != null) cfg.package
      ++ lib.optional cfg.enableOpenCode opencodePkg
      ++ lib.optional cfg.enableHermes hermesPkg
      ++ lib.optional cfg.enableHermes hermasAlias
      ++ (with pkgs; [
        jq
        nodejs_22
        python311
        curl
        tmux
      ]);

    # ── Ensure Herdr directories exist ──────────────────────
    systemd.tmpfiles.rules = [
      "d /var/lib/herdr 0755 root root -"
      "d /var/lib/herdr/workspaces 0755 root root -"
      "d /var/lib/herdr/agents 0755 root root -"
      "d /root/.config/herdr 0755 root root -"
    ];

    # ── Background Daemon (herdr server) ────────────────────
    systemd.services.herdr = lib.mkIf (cfg.headlessServer && cfg.package != null) {
      description = "Herdr Multi-Agent Terminal Runtime Server";
      after = [ "network.target" ];
      wantedBy = [ "multi-user.target" ];
      path = [
        pkgs.coreutils
        pkgs.bash
        pkgs.git
        pkgs.nodejs_22
        pkgs.python311
        cfg.package
      ] ++ lib.optional cfg.enableOpenCode opencodePkg
        ++ lib.optional cfg.enableHermes hermesPkg;
      environment = {
        HOME = "/root";
        HERDR_ENV = "1";
      };
      serviceConfig = {
        Type = "simple";
        User = "root";
        Restart = "always";
        RestartSec = "5s";
        WorkingDirectory = "/var/lib/herdr";
        ExecStart = "${cfg.package}/bin/herdr server";
      };
    };

    # ── Local CLI reference + quick start ───────────────────
    environment.etc."herdr/cli-reference.md".source = ../docs/herdr-cli.md;
    environment.etc."fastfree/mcp-servers.json".source = ../config/mcp-servers.json;
    environment.etc."herdr/README".text = ''
      FastFree OS — Herdr AI Multi-Agent Environment
      Included Agents:
        - herdr       # Multi-agent terminal multiplexer & workspace manager
        - opencode    # OpenCode AI coding assistant
        - hermes      # Hermes Autonomous AI Agent (also available via `hermas`)

      Quick Start:
        herdr                         # launch / attach default session
        herdr status                  # client + server status
        herdr agent list              # list all active agents
        opencode                      # start OpenCode interactive session
        hermes                        # start Hermes Agent chat
        hermas                        # alias for hermes

      Full reference: /etc/herdr/cli-reference.md
      Upstream docs: https://herdr.dev/docs/cli-reference/
    '';

    # ── Shell integrations (Zsh & Bash) ─────────────────────
    programs.zsh.interactiveShellInit = lib.mkAfter ''
      if command -v herdr >/dev/null 2>&1; then
        alias hs='herdr status'
        alias hw='herdr workspace list'
        alias hp='herdr pane list'
        alias ha='herdr agent list'
        alias her='herdr'
        export HERDR_DOCS="/etc/herdr/cli-reference.md"
        export HERDR_ENV="1"
      fi
    '';

    programs.bash.interactiveShellInit = lib.mkAfter ''
      if command -v herdr >/dev/null 2>&1; then
        alias hs='herdr status'
        alias hw='herdr workspace list'
        alias hp='herdr pane list'
        alias ha='herdr agent list'
        alias her='herdr'
        export HERDR_DOCS="/etc/herdr/cli-reference.md"
        export HERDR_ENV="1"
      fi
    '';

    # ── Auto-integrations for Herdr (OpenCode, Hermes & Official MCP) ──
    system.activationScripts.herdr-integrations = ''
      export PATH="${pkgs.coreutils}/bin:${pkgs.sudo}/bin:${pkgs.git}/bin:${pkgs.python311}/bin:$PATH"
      HERDR_BIN=""
      if [ -x "${cfg.package}/bin/herdr" ]; then
        HERDR_BIN="${cfg.package}/bin/herdr"
      fi

      if [ -n "$HERDR_BIN" ]; then
        # Install integrations for root
        export HOME="/root"
        ${lib.optionalString cfg.enableOpenCode ''
          mkdir -p /root/.config/opencode
          "$HERDR_BIN" integration install opencode >/dev/null 2>&1 || true
        ''}
        ${lib.optionalString cfg.enableHermes ''
          mkdir -p /root/.hermes
          "$HERDR_BIN" integration install hermes >/dev/null 2>&1 || true
        ''}

        # Install official Herdr MCP plugin from herdr.dev marketplace
        "$HERDR_BIN" plugin install thomasfossum/herdr-mcp --ref v0.3.1 --yes >/dev/null 2>&1 || true

        # Distribute shared MCP config to OpenCode
        if [ -f "/etc/fastfree/mcp-servers.json" ]; then
          mkdir -p /root/.config/opencode
          cp -f /etc/fastfree/mcp-servers.json /root/.config/opencode/opencode.json
        fi

        # Install integrations for all human users in /home
        for home in /home/*; do
          [ -d "$home" ] || continue
          user=$(basename "$home")
          id "$user" >/dev/null 2>&1 || continue
          ${lib.optionalString cfg.enableOpenCode ''
            mkdir -p "$home/.config/opencode"
            cp -f /etc/fastfree/mcp-servers.json "$home/.config/opencode/opencode.json" 2>/dev/null || true
            chown -R "$user" "$home/.config/opencode"
            sudo -u "$user" HOME="$home" "$HERDR_BIN" integration install opencode >/dev/null 2>&1 || true
          ''}
          ${lib.optionalString cfg.enableHermes ''
            mkdir -p "$home/.hermes"
            chown -R "$user" "$home/.hermes"
            sudo -u "$user" HOME="$home" "$HERDR_BIN" integration install hermes >/dev/null 2>&1 || true
          ''}
        done
      fi
    '';
  };
}
