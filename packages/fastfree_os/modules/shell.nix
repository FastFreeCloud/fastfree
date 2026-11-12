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

    # Paseo (multi-agent orchestration layer replacing Herdr):
    # paseo is NOT packaged in nixpkgs-26.05 and has no upstream flake, so it is
    # not installed declaratively here to keep the flake buildable. Customer
    # appliances (client2..11) install the paseo upstream binary natively
    # (e.g. `npm i -g @getpaseo/cli` in an enrollment step) — do NOT reference a
    # fake nixpkgs package name.

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
      pnpm
    ];

    programs.fzf.keybindings = true;
    programs.starship.enable = true;

    # ── Search aliases ──────────────────────────────────────
    environment.shellAliases = {
      ff-rg = "rg -n --hidden --glob '!.git'";
      ff-fd = "fd -H -I";
      ff-ug = "ugrep -r --hidden -n";
    };
  };
}
