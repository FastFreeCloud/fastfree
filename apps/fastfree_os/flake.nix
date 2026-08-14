{
  description = "FastFree OS — Multi-client NixOS builder";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    colmena = {
      url = "github:zhaofengli/colmena";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nixos-wsl = {
      url = "github:nix-community/NixOS-WSL";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, disko, colmena, nixos-wsl, ... }:
    let
      system  = "x86_64-linux";
      lib     = nixpkgs.lib;
      pkgs    = nixpkgs.legacyPackages.${system};

      # -- Custom pkgs: override vmTools to remove KVM requirement + force KVM accel --
      customPkgs = pkgs: pkgs.extend (final: prev: {
        vmTools = prev.vmTools // {
          runInLinuxVM = drv: lib.overrideDerivation (prev.vmTools.runInLinuxVM drv) (_: {
            requiredSystemFeatures = [];
          });
        };
        qemu-common = prev.qemu-common // {
          qemuBinary = qemuPkg:
            if pkgs.stdenv.hostPlatform.system == "x86_64-linux" then
              "${qemuPkg}/bin/qemu-system-x86_64 -accel kvm -cpu max"
            else
              prev.qemu-common.qemuBinary qemuPkg;
        };
      });

      # -- Client configs (imported from nix/clients/) --
      clients = {
        client1  = import ./nix/clients/client1.nix;
        client2  = import ./nix/clients/client2.nix;
        client3  = import ./nix/clients/client3.nix;
      };

      # -- All NixOS modules --
      commonModules = [
        ./nix/options.nix
        ./nix/modules/base.nix
        ./nix/modules/mariadb.nix
        ./nix/modules/caddy.nix
        ./nix/modules/fastfree_backend.nix
        ./nix/modules/fastfree_ledger.nix
        ./nix/modules/fastfree_erp.nix
        ./nix/modules/fastfree_hr.nix
        ./nix/modules/fastfree_pos.nix
        ./nix/modules/fastfree_website.nix
        ./nix/modules/phpmyadmin.nix
        ./nix/modules/wireguard.nix
        ./nix/modules/avahi-subdomains.nix
      ];

      testDiskSize = { virtualisation.diskSize = 8 * 1024; };

      # -- Default kernelModules per deployType --
      defaultKernelModules = {
        hostinger = [ "virtio_pci" "virtio_scsi" "sd_mod" ];
        hyperv = [ "hv_vmbus" "hv_storvsc" "hv_netvsc" "sd_mod" "sr_mod" ];
      };

      # -- Base NixOS config (shared by all clients) --
      mkBaseConfig = name: cfg: {
        fastfree.identity.name   = lib.mkForce cfg.hostName;
        fastfree.identity.domain = lib.mkForce cfg.domain;
        fastfree.passwords       = cfg.passwords;
        fastfree.apps            = cfg.apps;
        fastfree.extra           = cfg.extra or {};
        fastfree.subdomains      = cfg.subdomains or {};
        fastfree.deployType      = cfg.deployType or "hyperv";
        fastfree.deployHost      = cfg.deployHost or "";
        fastfree.deployPassword  = cfg.deployPassword or "";
        fastfree.githubRepo      = cfg.githubRepo or "";
        fastfree.githubAccount   = lib.mkIf ((cfg.githubAccount or "") != "") cfg.githubAccount;
        fastfree.githubToken     = cfg.githubToken or "";
        fastfree.networking      = cfg.networking or {};
        fastfree.gitOrigin       = cfg.gitOrigin or "";
        fastfree.flakeConfigName = name;
        fastfree.wireguard       = cfg.wireguard or {};
        fastfree.avahi           = cfg.avahi or {};
        fastfree.build           = cfg.build or true;
        fastfree.kvm             = cfg.kvm or ((cfg.deployType or "hyperv") == "hyperv");

        users.users.root.initialPassword = lib.mkIf (cfg.passwords.root != null) (lib.mkForce cfg.passwords.root);
        boot.loader.timeout = lib.mkForce 0;

        # Auto-derive kernelModules from deployType (clients can override via kernelModules option)
        boot.initrd.availableKernelModules = cfg.kernelModules or (defaultKernelModules.${cfg.deployType or "hyperv"} or []);
      };

      # -- Client modules per deployType (single source of truth) --
      mkClientModules = name: cfg:
        commonModules
        # Hyper-V guest (for hyperv clients only)
        ++ lib.optional ((cfg.deployType or "hyperv") == "hyperv") "${nixpkgs}/nixos/modules/virtualisation/hyperv-guest.nix"
        # Disko (for hostinger clients only)
        ++ lib.optionals ((cfg.deployType or "hyperv") == "hostinger") [
          disko.nixosModules.disko
          ./nix/disko.nix
        ]
        # NixOS-WSL (for WSL clients only)
        ++ lib.optionals ((cfg.deployType or "hyperv") == "wsl") [
          nixos-wsl.nixosModules.default
        ]
        # Base config for all clients
        ++ [ (mkBaseConfig name cfg) ]
        # hostinger-specific options
        ++ lib.optionals ((cfg.deployType or "hyperv") == "hostinger") [{
          boot.loader.grub = {
            devices = [ "/dev/sda" ];
            efiSupport = true;
            efiInstallAsRemovable = true;
          };
          services.openssh.enable = true;
        }]
        # Hyper-V-specific options (partition layout from make-disk-image.nix EFI)
        ++ lib.optionals ((cfg.deployType or "hyperv") == "hyperv") [{
          virtualisation.hypervGuest.enable = true;
          fileSystems."/" = {
            device = "/dev/disk/by-label/nixos";
            fsType = "ext4";
          };
          fileSystems."/boot" = {
            device = "/dev/disk/by-label/ESP";
            fsType = "vfat";
          };
          boot.loader.grub = {
            efiSupport = true;
            efiInstallAsRemovable = true;
            device = "nodev";
          };
        }]
        # WSL-specific options
        ++ lib.optionals ((cfg.deployType or "hyperv") == "wsl") [{
          wsl = {
            enable = true;
            defaultUser = cfg.wsl.defaultUser or "root";
            useWindowsDriver = cfg.wsl.useWindowsDriver or true;
            startMenuLaunchers = cfg.wsl.startMenuLaunchers or true;
            docker-desktop.enable = cfg.wsl.dockerDesktop or false;
            ssh-agent.enable = cfg.wsl.sshAgent or false;
            usbip.enable = cfg.wsl.usbip or false;
            wrapBinSh = cfg.wsl.wrapBinSh or true;
            interop = {
              includePath = cfg.wsl.interop.includePath or true;
              register = cfg.wsl.interop.register or false;
            };
            wslConf = {
              boot.systemd = cfg.wsl.wslConf.boot.systemd or true;
              automount = {
                root = cfg.wsl.wslConf.automount.root or "/mnt";
                options = cfg.wsl.wslConf.automount.options or "metadata,uid=1000,gid=100";
              };
              network = {
                generateResolvConf = cfg.wsl.wslConf.network.generateResolvConf or true;
              };
            };
          };
          # WSL does not use a bootloader
          boot.loader.grub.enable = false;
          boot.loader.systemd-boot.enable = false;
        }];

      # -- NixOS system for any client (no VHDX image builder) --
      mkSystemConfig = name: cfg:
        lib.nixosSystem {
          inherit system;
          modules = mkClientModules name cfg;
        };

      # -- VHDX image builder (adds VHDX build on top of mkClientModules) --
      mkVHDX = name: cfg:
        (lib.nixosSystem {
          inherit system;
          modules = mkClientModules name cfg ++ [({ config, pkgs, lib, ... }: {
            virtualisation.diskSize = 40 * 1024;

            system.build.hypervImage = lib.mkForce (
              import "${nixpkgs}/nixos/lib/make-disk-image.nix" {
                name = "nixos-hyperv-${config.system.nixos.label}-fixed";
                baseName = "fastfree_${name}";
                postVM = ''
                  ${pkgs.vmTools.qemu}/bin/qemu-img convert -f raw -o subformat=fixed -O vhdx $diskImage $out/fastfree_${name}.vhdx
                  ${pkgs.p7zip}/bin/7z a -t7z -m0=lzma2 -mx=9 -p"FastOS@2026" -mhe=on $out/fastfree_${name}.vhdx.7z $out/fastfree_${name}.vhdx
                  rm $out/fastfree_${name}.vhdx
                  rm $diskImage
                '';
                format = "raw";
                inherit (config.virtualisation) diskSize;
                partitionTableType = "efi";
                inherit config lib;
                pkgs = customPkgs pkgs;
                memSize = 2048;
              }
            );
          })];
        }).config.system.build.hypervImage;

      # -- WSL tarball builder (wsl clients only, where build=true) --
      # Exposes the tarballBuilder derivation; must be run with sudo
      # Usage: sudo ./result/bin/nixos-wsl-tarball-builder fastfree_client1.wsl
      mkWSL = name: cfg:
        (lib.nixosSystem {
          inherit system;
          modules = mkClientModules name cfg;
        }).config.system.build.tarballBuilder;

    in {
      # -- Colmena (deploy to running machines via SSH) --
      colmena = import ./nix/colmena.nix {
        inherit nixpkgs clients mkClientModules system;
      };

      # -- VHDX packages (hyperv clients only, where build=true) --
      packages.${system} = lib.mapAttrs mkVHDX
        (lib.filterAttrs (name: cfg: (cfg.deployType or "hyperv") == "hyperv" && (cfg.build or true)) clients)
        # -- WSL packages (wsl clients only, where build=true) --
        // lib.mapAttrs mkWSL
          (lib.filterAttrs (name: cfg: (cfg.deployType or "hyperv") == "wsl" && (cfg.build or true)) clients);

      # -- nixosConfigurations (ALL clients) --
      nixosConfigurations = lib.mapAttrs mkSystemConfig clients;

      # -- checks (NixOS tests for CI) --
      checks.${system} = {
        # ── اختبار 1: MariaDB يشتغل ────────────────────────────────
        mariadb-test = pkgs.testers.runNixOSTest {
          name = "mariadb-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              (mkBaseConfig "test" {
                hostName = "test";
                domain = "test.local";
                passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                apps = { base = true; mariadb = true; };
              })
            ];
          };
          testScript = ''
            machine.wait_for_unit("mysql.service")
            machine.wait_for_open_port(3306)
            machine.succeed("mysql -u root -ptest -e 'SELECT 1'")
          '';
        };

        # ── اختبار 3: WireGuard يشتغل ──────────────────────────────
        wireguard-test = pkgs.testers.runNixOSTest {
          name = "wireguard-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              (mkBaseConfig "test" {
                hostName = "test";
                domain = "test.local";
                passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                apps = { base = true; };
                wireguard = {
                  enable = true;
                  address = "10.100.0.1";
                  listenPort = 51820;
                  privateKey = "qCnRIgcAKrgqE/cyOFx2lKBymioGZ/zyXJ+0vHgxa04=";
                  peers = {};
                };
              })
            ];
          };
          testScript = ''
            machine.wait_for_unit("wireguard-wg0.service")
            machine.succeed("ip link show wg0")
          '';
        };

        # ── اختبار 4: SSH يشتغل ────────────────────────────────────
        sshd-test = pkgs.testers.runNixOSTest {
          name = "sshd-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              (mkBaseConfig "test" {
                hostName = "test";
                domain = "test.local";
                passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                apps = { base = true; };
              })
            ];
          };
          testScript = ''
            machine.wait_for_unit("sshd.service")
            machine.wait_for_open_port(22)
          '';
        };

        # ── اختبار 5: Podman يشتغل ─────────────────────────────────
        podman-test = pkgs.testers.runNixOSTest {
          name = "podman-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              (mkBaseConfig "test" {
                hostName = "test";
                domain = "test.local";
                passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                apps = { base = true; };
              })
            ];
          };
          testScript = ''
            machine.wait_for_unit("sockets.target")
            machine.wait_for_open_unix_socket("/run/podman/podman.sock")
            machine.sleep(2)
            machine.wait_until_succeeds("podman info", timeout=30)
            machine.succeed("podman ps")
          '';
        };

        # ── اختبار 9: Avahi يشتغل ───────────────────────────────────
        avahi-test = pkgs.testers.runNixOSTest {
          name = "avahi-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              (mkBaseConfig "test" {
                hostName = "test";
                domain = "test.local";
                passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                apps = { base = true; };
                avahi = {
                  enable = true;
                  reflector = false;
                  interfaces = [];
                };
              })
            ];
          };
          testScript = ''
            machine.wait_for_unit("avahi-daemon.service")
            machine.succeed("avahi-browse -a -t -p || true")
          '';
        };

      };

    };
}
