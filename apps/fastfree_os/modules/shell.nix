{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.shell {

    # ── zsh as default shell ────────────────────────────────
    programs.zsh.enable = true;
    users.defaultUserShell = pkgs.zsh;
    environment.shells = with pkgs; [ zsh bashInteractive ];

    programs.zsh.enableCompletion = true;
    programs.zsh.autosuggestions.enable = true;
    programs.zsh.syntaxHighlighting.enable = true;

    # herdr completion (per https://herdr.dev/docs/cli-reference/#shell-completions)
    programs.zsh.interactiveShellInit = ''
      if command -v herdr >/dev/null 2>&1; then
        fpath=(~/.zfunc $fpath)
        mkdir -p ~/.zfunc
        herdr completion zsh > ~/.zfunc/_herdr 2>/dev/null || true
      fi
      autoload -Uz compinit 2>/dev/null || true
    '';

    # ── Search CLI tools ────────────────────────────────────
    environment.systemPackages = with pkgs; [
      zsh
      ripgrep
      fd
      ugrep
      fzf
      bat
      eza
      zoxide
      starship
      jq
      pciutils
      nodejs_22
      nodePackages.pnpm
    ];

    programs.fzf.keybindings = true;
    programs.starship.enable = true;

    # ── Search aliases ──────────────────────────────────────
    environment.shellAliases = {
      ff-rg = "rg -n --hidden --glob '!.git'";
      ff-fd = "fd -H -I";
      ff-ug = "ugrep -r --hidden -n";

      # Cloudflare quick-tunnel URLs (modules/tunnel.nix) — the hostname is
      # random and changes whenever the tunnel service restarts, so always read
      # it from /run instead of typing or remembering one.
      ff-urls = "for n in guacamole opencode; do f=/run/fastfree-tunnel-$n.url; if [ -s $f ]; then printf '%-10s %s\\n' $n \"$(cat $f)\"; else printf '%-10s %s\\n' $n \"not started yet - run: sudo systemctl start cloudflared-$n\"; fi; done";
    };
  };
}
