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

    # herdr completion (from https://herdr.dev/docs/cli-reference/#shell-completions)
    # generates _herdr on every shell start if herdr is on PATH
    programs.zsh.interactiveShellInit = ''
      if command -v herdr >/dev/null 2>&1; then
        fpath=(~/.zfunc $fpath)
        mkdir -p ~/.zfunc
        herdr completion zsh > ~/.zfunc/_herdr 2>/dev/null || true
      fi
      autoload -Uz compinit 2>/dev/null || true
    '';

    # ── Deep-search CLI tools (rg + fd + ugrep) ─────────────
    environment.systemPackages = with pkgs; [
      zsh
      ripgrep   # 1) fastest content search
      fd        # 2) fastest file-name search
      ugrep     # 3) deep regex search
      fzf
      bat
      eza
      zoxide
      starship
      jq
    ];

    programs.fzf.keybindings = true;
    programs.starship.enable = true;

    # ── Aliases: deep search with 3+ tools ─────────────────
    environment.shellAliases = {
      ff-rg = "rg -n --hidden --glob '!.git'";
      ff-fd = "fd -H -I";
      ff-ug = "ugrep -r --hidden -n";
      ff-deep = "rg -n --hidden --glob '!.git'";
    };
  };
}
