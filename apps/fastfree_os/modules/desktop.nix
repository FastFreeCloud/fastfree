{ config, lib, pkgs, ... }:

let
  isLocal = config.fastfree.deployType == "local";
in {
  config = lib.mkIf config.fastfree.apps.desktop {

    # ── COSMIC desktop (all deployTypes) ────────────────────
    services.displayManager.cosmic-greeter.enable = true;
    services.desktopManager.cosmic.enable = true;

    # No proprietary NVIDIA driver (user decision) — open stack stays.
    # Do NOT re-add videoDrivers/hardware.nvidia without explicit approval.

    services.xserver.xkb = {
      # us+ara, Alt+Shift toggle. Covers greeter, XWayland, TTY.
      # COSMIC reads ~/.config/cosmic/.../xkb_config (deployed below).
      layout = "us,ara";
      variant = ",";
      options = "grp:alt_shift_toggle";
    };
    console.useXkbConfig = true;

    # Wayland fallback for libxkbcommon compositors.
    environment.sessionVariables = {
      XKB_DEFAULT_LAYOUT = "us,ara";
      XKB_DEFAULT_OPTIONS = "grp:alt_shift_toggle";
    };

    # ── Sound ───────────────────────────────────────────────
    services.pulseaudio.enable = false;
    security.rtkit.enable = true;
    services.pipewire = {
      enable = true;
      alsa.enable = true;
      alsa.support32Bit = true;
      pulse.enable = true;
    };

    # ── Printing ────────────────────────────────────────────
    services.printing.enable = true;

    # ── Browser ─────────────────────────────────────────────
    programs.firefox.enable = true;

    # ── Flatpak + Flathub ───────────────────────────────────
    services.flatpak.enable = true;
    systemd.services.flatpak-repo = {
      wantedBy = [ "multi-user.target" ];
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      path = [ pkgs.flatpak ];
      script = ''
        flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
      '';
    };

    # ── Terminal + Files + task manager ────────────────────
    # kitty is shortcut-only (hidden from launcher); htop is the task manager.
    environment.systemPackages = with pkgs; [
      cosmic-term
      cosmic-files
      kitty
      # Remmina GUI + xfreerdp CLI (HopToDesk does not speak RDP).
      remmina
      freerdp
    ];

    # ── COSMIC per-user config (no NixOS options exist for these) ─
    # Backs up existing files once (*.fastfree-bak). GUI changes to Input
    # Sources overwrite xkb_config — re-run switch to restore ours.
    system.activationScripts.cosmic-windows = ''
      for home in /home/*; do
        [ -d "$home" ] || continue
        user=$(basename "$home")
        id "$user" >/dev/null 2>&1 || continue
        cfg="$home/.config/cosmic"

        # 1) us + ara layouts, Alt+Shift toggle
        mkdir -p "$cfg/com.system76.CosmicComp/v1"
        f="$cfg/com.system76.CosmicComp/v1/xkb_config"
        [ -f "$f" ] && [ ! -f "$f.fastfree-bak" ] && cp -a "$f" "$f.fastfree-bak"
        printf '%s\n' \
          '// fastfree-managed: English + Arabic, Alt+Shift toggle.' \
          '(' \
          '    rules: "",' \
          '    model: "",' \
          '    layout: "us,ara",' \
          '    variant: ",",' \
          '    options: Some("grp:alt_shift_toggle"),' \
          ')' > "$f"

        # 2) Windows-like shortcuts (RON map, same format as
        #    cosmic-comp/data/keybindings.ron + Settings > Custom).
        mkdir -p "$cfg/com.system76.CosmicSettings.Shortcuts/v1"
        s="$cfg/com.system76.CosmicSettings.Shortcuts/v1/custom"
        [ -f "$s" ] && [ ! -f "$s.fastfree-bak" ] && cp -a "$s" "$s.fastfree-bak"
        printf '%s\n' \
          '// fastfree-managed: Windows-like shortcuts.' \
          '{' \
          '    (modifiers: [Super], key: "e", description: Some("Files (Win+E)")): System(HomeFolder),' \
          '    (modifiers: [Super], key: "l", description: Some("Lock (Win+L)")): System(LockScreen),' \
          '    (modifiers: [Super], key: "t", description: Some("Terminal kitty (Win+T)")): Spawn("kitty"),' \
          '    (modifiers: [Ctrl, Alt], key: "t", description: Some("Terminal kitty (Ctrl+Alt+T)")): Spawn("kitty"),' \
          '    (modifiers: [Alt], key: "F2", description: Some("Run command")): System(Launcher),' \
          '    (modifiers: [Ctrl, Shift], key: "Escape", description: Some("Task manager (Ctrl+Shift+Esc)")): Spawn("cosmic-term -e htop"),' \
          '    (modifiers: [Ctrl, Alt], key: "Delete", description: Some("Log out (Ctrl+Alt+Del)")): System(LogOut),' \
          '}' > "$s"

        chown -R "$user" "$cfg"

        # 3) kitty: Windows-style copy/paste (Ctrl+C/V).
        # cosmic-term keybindings are hardcoded (Ctrl+Shift+C/V), but kitty
        # supports copy_or_interrupt: copy when text is selected,
        # SIGINT (like Windows terminal) otherwise.
        mkdir -p "$home/.config/kitty"
        k="$home/.config/kitty/kitty.conf"
        [ -f "$k" ] && [ ! -f "$k.fastfree-bak" ] && cp -a "$k" "$k.fastfree-bak"
        printf '%s\n' \
          '# fastfree-managed: Windows-like copy/paste.' \
          'map ctrl+c copy_or_interrupt' \
          'map ctrl+v paste_from_clipboard' \
          'map ctrl+shift+t new_tab' \
          'map ctrl+shift+w close_tab' \
          'map ctrl+tab next_tab' \
          'map ctrl+shift+tab previous_tab' \
          'map ctrl+equal change_font_size all +2.0' \
          'map ctrl+minus change_font_size all -2.0' > "$k"
        chown "$user" "$k"

        # 4) launcher hygiene: hide redundant icons (binaries stay functional;
        # htop runs via Ctrl+Shift+Esc, screenshot via Print key, printing
        # via the Settings panel; cosmic-term is the visible terminal).
        # NoDisplay user overrides shadow system entries (XDG precedence).
        # Created once; deleting one restores its icon until next switch.
        mkdir -p "$home/.local/share/applications"
        for app in kitty htop com.system76.CosmicScreenshot cups; do
          kf="$home/.local/share/applications/$app.desktop"
          if [ ! -f "$kf" ]; then
            printf '%s\n' '[Desktop Entry]' "Name=$app" 'Type=Application' 'NoDisplay=true' > "$kf"
            chown "$user" "$kf"
          fi
        done
      done
    '';
  };
}
