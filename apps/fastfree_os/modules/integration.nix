{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.base {

    # ── Packages ──────────────────────────────────────────
    environment.systemPackages = with pkgs; [
      git
      (pkgs.writeShellScriptBin "fastfree" (builtins.readFile ../cli.sh))
    ];

    # ── Auto-derive githubRepo from githubAccount ──────────
    fastfree.githubRepo = lib.mkDefault
      "https://github.com/${config.fastfree.githubAccount}/fastfree.git";

    # ── GitHub Token via Clan vars (never a Nix option) ─────
    # Token is issued by GitHub, not generatable: sentinel default keeps the
    # feature dormant. Set a real one (stays encrypted, never in store):
    #   clan vars set <machine> github-token/token
    # Later `generate` runs keep it (only --regenerate would replace it).
    clan.core.vars.generators.github-token = {
      files.token.secret = true;
      files.token.neededFor = "activation";
      runtimeInputs = [ pkgs.coreutils ];
      script = ''
        # Token is issued by GitHub (not generatable). Sentinel default =
        # feature dormant (sops cannot store empty secrets). Set a real one:
        #   clan vars set <machine> github-token/token
        # Later `generate` runs keep it (only --regenerate would restore this).
        printf '%s' '__NOT_SET__' > $out/token
      '';
    };

    # ── FastFree Config Files ─────────────────────────────
    environment.etc."fastfree/github-repo".text = config.fastfree.githubRepo;
    environment.etc."fastfree/flake-config".text = config.fastfree.flakeConfigName;
    environment.etc."fastfree/git-origin".text = config.fastfree.gitOrigin;

    # ── GitHub Token file (for private repo access) ─────────
    # Reads the vars secret at RUNTIME (activation timing is guaranteed by
    # neededFor="activation"); empty token = file removed = dormant.
    systemd.services.fastfree-git-token = {
      description = "Write GitHub token to file";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree
        # Tolerant read: secrets may not be deployed yet on first activation;
        # converges on next switch/boot instead of failing the switch.
        TOKEN=$(cat "${config.clan.core.vars.generators.github-token.files.token.path}" 2>/dev/null || true)
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "__NOT_SET__" ]; then
          echo -n "$TOKEN" > /etc/fastfree/github-token
          chmod 600 /etc/fastfree/github-token
          chown root:root /etc/fastfree/github-token
        else
          rm -f /etc/fastfree/github-token
        fi
      '';
    };

    # ── GHCR Authentication (runtime read, after secrets setup) ─
    system.activationScripts.ghcr-auth = lib.stringAfter [ "setupSecrets" ] ''
      SECRET="${config.clan.core.vars.generators.github-token.files.token.path}"
      if [ -s "$SECRET" ] && [ "$(cat "$SECRET")" != "__NOT_SET__" ]; then
        mkdir -p /etc/containers
        AUTH=$(echo -n "${config.fastfree.githubAccount}:$(cat "$SECRET")" | base64 -w0)
        cat > /etc/containers/auth.json <<EOF
{
  "ghcr.io": {
    "auth": "$AUTH"
  }
}
EOF
        chmod 600 /etc/containers/auth.json
      else
        rm -f /etc/containers/auth.json
      fi
    '';
  };
}
