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
    ];

    programs.fzf.keybindings = true;
    programs.starship.enable = true;

    # ── Search aliases ──────────────────────────────────────
    environment.shellAliases = {
      ff-rg = "rg -n --hidden --glob '!.git'";
      ff-fd = "fd -H -I";
      ff-ug = "ugrep -r --hidden -n";
      # Brave fallback for broken GPU presentation (XWayland instead of
      # native Wayland); try when the window looks frozen but pages load.
      brave-x11 = "brave --ozone-platform=x11";
    };
  };
}
