{ lib, ... }:

{
  imports = [ ./base.nix ];

  fastfree.deployType = "vps";
  fastfree.networking = {
    interface = "ens18";
    nameservers = [ "1.1.1.1" "8.8.8.8" ];
    ipv4Address = "76.13.51.10";
    ipv4Gateway = "76.13.51.254";
    ipv4Prefix = 24;
  };
  fastfree.subdomains = { db = "db"; panel = "panel"; cockpit = "cockpit"; };
  fastfree.apps = {
    base = true;
    shell = true;
    mariadb = true;
    caddy = true;
    fastfree_backend = true;
    fastfree_panel = true;
    fastfree_ledger = true;
    fastfree_erp = true;
    fastfree_hr = true;
    fastfree_pos = true;
    fastfree_website = true;
    dbgate = true;
    cockpit = true;
  };

  sops.age.sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];
  sops.age.keyFile = lib.mkForce null;
  services.alloy.enable = lib.mkForce false;
  services.qemuGuest.enable = true;
  services.nginx.enable = lib.mkForce false;
  boot.initrd.availableKernelModules = [ "virtio_pci" "virtio_scsi" "virtio_blk" "sd_mod" ];
  boot.loader.grub = {
    enable = true;
    device = "/dev/sda";
    efiSupport = false;
  };
  fastfree.avahi = { enable = true; reflector = false; interfaces = [ "ens18" ]; };
}
