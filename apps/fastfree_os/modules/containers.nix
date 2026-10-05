{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.base {

    # ── Podman (Container Runtime) ─────────────────────────
    virtualisation.containers.enable = true;
    virtualisation.podman = {
      enable = true;
      dockerCompat = lib.mkIf (!config.virtualisation.docker.enable) true;
      defaultNetwork.settings.dns_enabled = true;
    };
    virtualisation.oci-containers.backend = "podman";

    # ── Force Podman rootful mode (bypass rootless subuid requirement) ──
    # Tell Podman that user namespace config is already handled
    environment.variables._CONTAINERS_USERNS_CONFIGURED = "1";
    environment.variables.CONTAINERS_CONF = "/etc/containers/containers.conf";
    environment.variables.CONTAINERS_STORAGE_CONF = "/etc/containers/storage.conf";

    # Create REAL files (not NixOS symlinks) for subuid/subgid
    # Podman can't read Nix store symlinks reliably
    system.activationScripts.podman-subuid = lib.mkAfter ''
      rm -f /etc/subuid /etc/subgid
      printf 'root:100000:65536\nfastfree:100000:65536\n' > /etc/subuid
      printf 'root:100000:65536\nfastfree:100000:65536\n' > /etc/subgid
      chmod 644 /etc/subuid /etc/subgid
    '';

    # ── Pull race fix: containers need network at first start ──
    # Fresh switch pulls GBs of images; without this they fail before
    # NetworkManager is up, hit start-limit, and never recover until
    # reset/reboot. Same ordering the repo already uses for ledger-spa.
    systemd.services = lib.genAttrs [
      "podman-fastfree-redis-cache"
      "podman-fastfree-redis-queue"
      "podman-fastfree-backend-app"
      "podman-fastfree-backend-frontend"
      "podman-fastfree-backend-websocket"
      "podman-fastfree-backend-queue-short"
      "podman-fastfree-backend-queue-long"
      "podman-fastfree-backend-scheduler"
      "podman-fastfree-website-frontend"
      "podman-phpmyadmin"
    ] (_: {
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
    });

    # Override NixOS containers.conf with rootful settings
    environment.etc."containers/containers.conf".text = lib.mkForce ''
      [containers]
      userns = "host"

      [engine]
      cgroup_manager = "systemd"
      events_logger = "journald"
    '';

    environment.etc."containers/storage.conf".text = lib.mkForce ''
      [storage]
      driver = "overlay"
      runroot = "/run/containers/storage"
      graphroot = "/var/lib/containers/storage"
    '';
  };
}
