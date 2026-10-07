{ config, lib, pkgs, ... }:

let
  isLocal = config.fastfree.deployType == "local";
in {
  config = lib.mkIf config.fastfree.apps.desktop {

    # ── COSMIC desktop (all deployTypes) ────────────────────
    services.displayManager.cosmic-greeter.enable = true;
    services.desktopManager.cosmic.enable = true;

    # Drop the media player (not a core package — verified in nixpkgs
    # cosmic.nix corePkgs). Nothing depends on it.
    environment.cosmic.excludePackages = with pkgs; [
      cosmic-player
    ];

    # System76 scheduler (wiki COSMIC tips): keeps UI responsive under load.
    services.system76-scheduler.enable = true;

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

    # Brave (unfree): full codecs out-of-box + Shields cut heavy pages.
    # Best pick for weak-GPU machines over Firefox/Chrome stock.
    nixpkgs.config.allowUnfreePredicate = pkg: builtins.elem (lib.getName pkg) [
      "brave"
    ];
    environment.sessionVariables.NIXOS_OZONE_WL = "1";

    # ── Flatpak: fully removed (no apps left, store excluded) ──
    # services.flatpak stays disabled; COSMIC portals (needed by browsers)
    # come from xdg-desktop-portal, unaffected. User flatpak data under
    # /var/lib/flatpak and ~/.local/share/flatpak was wiped separately.

    # ── Terminal + Files + task manager ────────────────────
    # cosmic-term is the single visible terminal; top (base system) is the
    # task manager. No kitty/htop/btop packages (launcher stays clean).
    environment.systemPackages = with pkgs; [
      cosmic-term
      cosmic-files
      brave
      # mpv + yt-dlp: YouTube outside the browser (lowest CPU on weak GPUs).
      mpv
      yt-dlp
      # Remmina GUI + xfreerdp CLI (HopToDesk does not speak RDP).
      remmina
      freerdp
    ];

    # ── COSMIC per-user config (no NixOS options exist for these) ─
    # Backs up existing files once (*.fastfree-bak). GUI changes to Input
    # Sources overwrite xkb_config — re-run switch to restore ours.
    system.activationScripts.cosmic-windows = ''
      # Activation PATH is minimal (no sed/grep/awk!): builtins + coreutils
      # only. Keep every command in this script to that set.
      export PATH="${pkgs.coreutils}/bin:$PATH"
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
          '    (modifiers: [Super], key: "t", description: Some("Terminal (Win+T)")): Spawn("cosmic-term"),' \
          '    (modifiers: [Ctrl, Alt], key: "t", description: Some("Terminal (Ctrl+Alt+T)")): Spawn("cosmic-term"),' \
          '    (modifiers: [Alt], key: "F2", description: Some("Run command")): System(Launcher),' \
          '    (modifiers: [Ctrl, Shift], key: "Escape", description: Some("Task manager (Ctrl+Shift+Esc)")): Spawn("cosmic-term -e top"),' \
          '    (modifiers: [Ctrl, Alt], key: "Delete", description: Some("Log out (Ctrl+Alt+Del)")): System(LogOut),' \
          '}' > "$s"

        chown -R "$user" "$cfg"

        # 3) COSMIC → FastFree renames (terminal, files, editor, reader,
        # settings). Same-basename user copy shadows system entry; groups
        # and pins follow the ID so nothing breaks. Only Name/Name[ar] (and
        # Name[en]) change — Exec/Icon/Categories/Keywords stay identical,
        # so old names remain searchable. Created once; delete a file to
        # restore its original name until next switch.
        mkdir -p "$home/.local/share/applications"
        for spec in \
          "com.system76.CosmicTerm.desktop|FastFree Terminal|طرفية FastFree" \
          "com.system76.CosmicFiles.desktop|FastFree Files|ملفات FastFree" \
          "com.system76.CosmicEdit.desktop|FastFree Editor|محرر FastFree" \
          "com.system76.CosmicReader.desktop|FastFree Reader|قارئ FastFree" \
          "com.system76.CosmicSettings.desktop|FastFree Settings|إعدادات FastFree"; do
          id="''${spec%%|*}"; rest="''${spec#*|}"; new="''${rest%%|*}"; ar="''${rest#*|}"
          src="$systemConfig/sw/share/applications/$id"
          dst="$home/.local/share/applications/$id"
          if [ ! -f "$dst" ] && [ -f "$src" ]; then
            # Rename by streaming lines (no sed in activation): only the
            # Name keys change, everything else (Exec/Icon/MimeType/Actions)
            # passes through byte-identical.
            while IFS= read -r line || [ -n "$line" ]; do
              key="''${line%%=*}"
              if [ "$key" = "Name" ]; then
                printf 'Name=%s\n' "$new"
              elif [ "$key" = "Name[en]" ]; then
                printf 'Name[en]=%s\n' "$new"
              elif [ "$key" = "Name[ar]" ]; then
                printf 'Name[ar]=%s\n' "$ar"
              else
                printf '%s\n' "$line"
              fi
            done < "$src" > "$dst"
            chown "$user" "$dst"
          fi
        done
        # kitty is gone: drop its stale NoDisplay override (kitty.conf and
        # .bak stay untouched — possible user data).
        rm -f "$home/.local/share/applications/kitty.desktop"

        # 4) launcher hygiene: hide redundant icons (top runs via shortcut,
        # screenshot via Print key, printing via the Settings panel).
        # NoDisplay user overrides shadow system entries (XDG precedence).
        # Created once; deleting one restores its icon until next switch.
        mkdir -p "$home/.local/share/applications"
        for app in htop com.system76.CosmicScreenshot cups; do
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
