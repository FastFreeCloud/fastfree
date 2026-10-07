{ config, lib, pkgs, ... }:

let
  isLocal = config.fastfree.deployType == "local";
in {
  config = lib.mkIf config.fastfree.apps.desktop {

    # ── COSMIC desktop (all deployTypes) ────────────────────
    services.displayManager.cosmic-greeter.enable = true;
    services.desktopManager.cosmic.enable = true;

    # ── NVIDIA (local physical machine only) ────────────────
    # Copied from the proven /etc/nixos config of this exact hardware.
    # Without it COSMIC/Plymouth fall back to nouveau (broken/slow on
    # modern NVIDIA). Servers/images keep the open stack (no HW present).
#    services.xserver.videoDrivers = lib.mkIf isLocal [ "nvidia" ];
#    hardware.nvidia = lib.mkIf isLocal {
 #     modesetting.enable = true;
  #    powerManagement.enable = true;
   #   powerManagement.finegrained = false;
    #  open = false;
     # nvidiaSettings = true;
#      package = config.boot.kernelPackages.nvidiaPackages.stable;
 #   };

    services.xserver.xkb = {
      # English + Arabic, Alt+Shift toggle (Windows-style).
      # Covers the login greeter, XWayland apps, and TTY (via useXkbConfig).
      # COSMIC itself reads ~/.config/cosmic/.../xkb_config (deployed below).
      layout = "us,ara";
      variant = ",";
      options = "grp:alt_shift_toggle";
    };
    console.useXkbConfig = true;

    # Wayland fallback: compositors using libxkbcommon honor these.
    environment.sessionVariables = {
      XKB_DEFAULT_LAYOUT = "us,ara";
      XKB_DEFAULT_OPTIONS = "grp:alt_shift_toggle";
    };

    # ── Sound (PipeWire, same profile as local machine) ─────
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

    # Google Chrome (unfree): precise allowlist, not blanket allowUnfree.
    # Binary name is google-chrome-stable. NIXOS_OZONE_WL (wiki: Chromium)
    # gives native Wayland to Chrome + most Electron apps.
    nixpkgs.config.allowUnfreePredicate = pkg: builtins.elem (lib.getName pkg) [
      "google-chrome"
    ];
    environment.sessionVariables.NIXOS_OZONE_WL = "1";

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

    # ── HopToDesk remote desktop (Flathub, official ID) ─────
    # Not in nixpkgs → Flatpak (docs: flathub.org/apps/com.hoptodesk.HopToDesk).
    # Guarded install = idempotent. Uses public rendezvous/relay by default,
    # so no inbound firewall ports needed for basic use.
    systemd.services.hoptodesk-install = {
      description = "Install HopToDesk from Flathub";
      wantedBy = [ "multi-user.target" ];
      after = [ "flatpak-repo.service" "network-online.target" ];
      wants = [ "network-online.target" ];
      path = [ pkgs.flatpak ];
      script = ''
        flatpak info --system com.hoptodesk.HopToDesk >/dev/null 2>&1 || \
          flatpak install --system -y flathub com.hoptodesk.HopToDesk
      '';
      serviceConfig.Type = "oneshot";
      serviceConfig.RemainAfterExit = true;
    };

    # ── Terminal + Files + task manager + Chrome ─────────
    # Needed by the Windows-like shortcuts below
    # (Ctrl+Alt+T, Win+E, Ctrl+Shift+Esc). htop (not btop) is the single
    # visible task manager; kitty stays installed for shortcuts but hidden
    # from the launcher (cosmic-term is the visible terminal).
    environment.systemPackages = with pkgs; [
      cosmic-term
      cosmic-files
      kitty
      google-chrome
      # ── RDP clients (HopToDesk does NOT speak RDP — different protocol) ──
      # Remmina: GUI profiles/gateway/shares; freerdp: xfreerdp CLI companion.
      remmina
      freerdp
    ];

    # ── COSMIC per-user config: keyboard + Windows shortcuts ─
    # COSMIC stores these as RON files under ~/.config/cosmic and has
    # no NixOS options for them, so we deploy them via activation.
    # First run backs up existing files to *.fastfree-bak (once only).
    # NOTE: changing Input Sources in COSMIC Settings GUI overwrites
    # xkb_config — re-run nixos-rebuild switch to restore ours.
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

        # 4) launcher hygiene: hide the kitty icon (binary stays for
        # shortcuts; cosmic-term is the visible terminal). A user-level
        # .desktop shadows the system one (XDG precedence). Created once;
        # deleting it restores the icon until next switch.
        mkdir -p "$home/.local/share/applications"
        kf="$home/.local/share/applications/kitty.desktop"
        if [ ! -f "$kf" ]; then
          printf '%s\n' '[Desktop Entry]' 'Name=kitty' 'Type=Application' 'NoDisplay=true' > "$kf"
        fi
        chown "$user" "$kf"
      done
    '';
  };
}
