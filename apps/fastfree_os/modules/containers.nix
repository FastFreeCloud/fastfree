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
      printf 'root:100000:65536\nadmin:100000:65536\n' > /etc/subuid
      printf 'root:100000:65536\nadmin:100000:65536\n' > /etc/subgid
      chmod 644 /etc/subuid /etc/subgid
    '';

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
