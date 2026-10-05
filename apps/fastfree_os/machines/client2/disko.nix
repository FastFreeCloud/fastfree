{ lib, ... }: {
  disko.devices = {
    disk = {
      main = {
        type = "disk";
        device = lib.mkDefault "/dev/sda";
        content = {
          type = "gpt";
          partitions = {
            boot = {
              size = "1M";
              type = "EF02";
            };
            ESP = {
              size = "512M";
              type = "EF00";
              content = {
                type = "filesystem";
                format = "vfat";
                mountpoint = "/boot";
                mountOptions = [ "umask=0077" ];
              };
            };
            root = {
              size = "100%";
              content = {
                type = "luks";
                name = "crypted";
                # Full-disk encryption (disko docs). Takes effect ONLY on
                # fresh install (disko runs at install, never on update).
                # - Install asks for the passphrase interactively twice.
                #   For non-interactive CI: set passwordFile + pass
                #   --disk-encryption-keys to nixos-anywhere instead.
                # - The SAME passphrase is required on EVERY reboot
                #   (VPS console) unless remote-unlock (initrd SSH) is added.
                settings.allowDiscards = true;
                content = {
                  type = "filesystem";
                  format = "ext4";
                  mountpoint = "/";
                };
              };
            };
          };
        };
      };
    };
  };
}
