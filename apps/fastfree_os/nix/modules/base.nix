{ config, lib, pkgs, ... }:

let
  pw = config.fastfree.passwords;
  hosts = {
    "10.100.0.1" = [ "fastfree.local" ];
    "10.100.0.2" = [ "client1.fastfree.local" ];
    "10.100.0.3" = [ "server.fastfree.local" ];
    "10.100.0.6" = [ "client2.fastfree.local" ];
  };
in {
  config = lib.mkIf config.fastfree.apps.base {

    # ── Networking ────────────────────────────────────────
    networking = {
      hostName                     = config.fastfree.identity.name;
      firewall.allowedTCPPorts     = [ 22 443 ];
      useDHCP                      = false;
      useNetworkd                  = true;
      hosts                        = hosts;
    };

    # hostinger: systemd-networkd for all VPS
    systemd.network = {
      enable = true;
      # DHCP mode (no static IP configured)
      networks."10-wan" = lib.mkIf (config.fastfree.networking.ipv4Address == "") {
        matchConfig.Name = config.fastfree.networking.interface;
        networkConfig = {
          DHCP = "yes";
          DNS = config.fastfree.networking.nameservers;
        };
        dhcpConfig = {
          UseDNS = true;
        };
      };
      # Static IP mode
      networks."10-wan-static" = lib.mkIf (config.fastfree.networking.ipv4Address != "") {
        matchConfig.Name = config.fastfree.networking.interface;
        networkConfig = {
          DHCP = "no";
          DNS = config.fastfree.networking.nameservers;
          DNSSEC = "allow-downgrade";
          DNSOverTLS = "opportunistic";
        };
        address = [ "${config.fastfree.networking.ipv4Address}/${toString config.fastfree.networking.ipv4Prefix}" ];
        routes = [
          { routeConfig = {
              Gateway = config.fastfree.networking.ipv4Gateway;
              GatewayOnLink = true;
            };
          }
        ];
      };
    };

    # ── Time & Locale ─────────────────────────────────────
    time.timeZone      = config.fastfree.extra.timezone;
    i18n.defaultLocale = "en_US.UTF-8";

    # ── Boot ──────────────────────────────────────────────
    boot.kernelParams = [
      "console=ttyS0,115200"
    ];

    boot.kernelModules = lib.mkIf config.fastfree.kvm [ "kvm-intel" "kvm-amd" ];

    # ── Initrd (NixOS 26.05 systemd stage 1) ─────────────
    boot.initrd.systemd.emergencyAccess = (config.fastfree.deployType == "hyperv");

    # ── Nix ───────────────────────────────────────────────
    nix.settings.experimental-features = [ "nix-command" "flakes" ];

    # ── System ────────────────────────────────────────────
    environment.defaultPackages                  = [];
    hardware.enableRedistributableFirmware       = lib.mkForce false;
    hardware.firmware                            = lib.mkForce [];
    services.xserver.enable                      = false;
    services.libinput.enable                     = false;
    system.stateVersion = "26.05";

    # ── Size Reduction ────────────────────────────────────
    documentation.enable              = false;
    documentation.nixos.enable        = false;
    documentation.man.enable          = false;
    documentation.doc.enable          = false;
    documentation.info.enable         = false;
    documentation.dev.enable          = false;

    nix.settings.auto-optimise-store = true;
    nix.gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 14d";
    };

    # ── Logging ───────────────────────────────────────────
    services.journald.extraConfig = ''
      Storage=persistent
      SystemMaxUse=500M
      SystemMaxFileSize=50M
      MaxRetentionSec=30day
      Compress=yes
    '';

    # ── Podman (Container Runtime) ─────────────────────────
    virtualisation.containers.enable = true;
    virtualisation.podman = {
      enable = true;
      dockerCompat = lib.mkIf (!config.virtualisation.docker.enable) true;
      defaultNetwork.settings.dns_enabled = true;
    };
    virtualisation.oci-containers.backend = "podman";

    # ── Podman subuid/subgid (required for container creation) ──
    system.activationScripts.subuid-subgid = ''
      if [ ! -f /etc/subuid ]; then
        cat > /etc/subuid << 'SUBEOF'
      root:100000:65536
      admin:100000:65536
      SUBEOF
        chmod 644 /etc/subuid
      fi
      if [ ! -f /etc/subgid ]; then
        cat > /etc/subgid << 'SUBEOF'
      root:100000:65536
      admin:100000:65536
      SUBEOF
        chmod 644 /etc/subgid
      fi
    '';

    # ── Podman Docker-compatible TCP socket (for Windows Docker CLI) ──
    systemd.services.podman-docker-tcp = lib.mkIf (config.fastfree.deployType == "wsl") {
      description = "Podman Docker-compatible API on TCP 127.0.0.1:2375";
      wantedBy = [ "multi-user.target" ];
      after = [ "podman.service" ];
      serviceConfig = {
        ExecStart = "${pkgs.podman}/bin/podman system service --time=0 tcp:127.0.0.1:2375";
        Restart = "always";
        RestartSec = 3;
      };
    };

    # ── SSH ───────────────────────────────────────────────
    services.openssh = {
      enable = true;
      settings = {
        PermitRootLogin = "yes";
        PasswordAuthentication = true;
        MaxAuthTries = 3;
      };
    };

    # ── Users ─────────────────────────────────────────────
    users.users = {
      admin = {
        isNormalUser    = true;
        description     = "System Administrator";
        extraGroups = [ "wheel" "podman" ];
        initialPassword = pw.admin;
      };
    };

    # ── Packages ──────────────────────────────────────────
    environment.systemPackages = with pkgs; [
      git
      (pkgs.writeShellScriptBin "fastfree" (builtins.readFile ../cli.nix))
    ];

    # ── Auto-derive githubRepo from githubAccount ──────────
    fastfree.githubRepo = lib.mkDefault
      "https://github.com/${config.fastfree.githubAccount}/fastfree.git";

    # ── FastFree Config Files ─────────────────────────────
    environment.etc."fastfree/github-repo".text = config.fastfree.githubRepo;
    environment.etc."fastfree/flake-config".text = config.fastfree.flakeConfigName;
    environment.etc."fastfree/git-origin".text = config.fastfree.gitOrigin;
    environment.etc."fastfree/wireguard-address".text = config.fastfree.wireguard.address;

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

    # ── Login Banner (MOTD) ──────────────────────────────────
    services.getty.greetingLine = let
      name = config.fastfree.identity.name;
    in lib.mkForce ''
      +----------------------------------------+
      |               FastFree                 |
      |           https://fastfree.cloud       |
      +----------------------------------------+
    '';
    users.motd = ''
      FastFree Cloud — fastfree.cloud
    '';
  };
}
