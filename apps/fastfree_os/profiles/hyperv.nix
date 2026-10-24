{ modulesPath, ... }:

{
  imports = [
    ./base.nix
    (modulesPath + "/virtualisation/hyperv-guest.nix")
  ];

  fastfree.deployType = "hyperv";
  fastfree.kvm = true;
  fastfree.networking.interface = "eth0";
  fastfree.subdomains.db = "db";
  fastfree.apps = {
    base = true;
  };

  virtualisation.hypervGuest.enable = true;
  fileSystems."/" = {
    device = "/dev/disk/by-label/nixos";
    fsType = "ext4";
    autoResize = true;
  };
  fileSystems."/boot" = {
    device = "/dev/disk/by-label/ESP";
    fsType = "vfat";
  };
  boot.growPartition = true;
  boot.loader.timeout = 0;
  boot.initrd.availableKernelModules = [ "hv_vmbus" "hv_storvsc" "hv_netvsc" "sd_mod" "sr_mod" ];
  boot.loader.grub = {
    efiSupport = true;
    efiInstallAsRemovable = true;
    device = "nodev";
  };
  fastfree.avahi = { enable = true; reflector = false; interfaces = [ "eth0" ]; };
}
