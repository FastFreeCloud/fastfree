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

    # ── FastFree Config Files ─────────────────────────────
    environment.etc."fastfree/github-repo".text = config.fastfree.githubRepo;
    environment.etc."fastfree/flake-config".text = config.fastfree.flakeConfigName;
    environment.etc."fastfree/git-origin".text = config.fastfree.gitOrigin;

    # ── GitHub Token (for private repo access) ──────────────
    systemd.services.fastfree-git-token = lib.mkIf (config.fastfree.githubToken != "") {
      description = "Write GitHub token to file";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree
        echo -n "${config.fastfree.githubToken}" > /etc/fastfree/github-token
        chmod 600 /etc/fastfree/github-token
        chown root:root /etc/fastfree/github-token
      '';
    };

    # ── GHCR Authentication ─────────────────────────────────
    system.activationScripts.ghcr-auth = let
      token = config.fastfree.githubToken;
    in pkgs.lib.optionalString (token != "") ''
      mkdir -p /etc/containers
      AUTH=$(echo -n "${config.fastfree.githubAccount}:${token}" | base64 -w0)
      cat > /etc/containers/auth.json <<EOF
{
  "ghcr.io": {
    "auth": "$AUTH"
  }
}
EOF
      chmod 600 /etc/containers/auth.json
    '';
  };
}
