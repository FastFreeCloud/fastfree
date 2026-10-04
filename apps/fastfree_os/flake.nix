{
  description = "FastFree OS — Multi-client NixOS builder";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # Clan 26.05 (official: convert-existing-NixOS-configuration).
    # Read-only in phase 1: inventory + build/check only, no install/switch.
    clan-core = {
      url = "https://git.clan.lol/clan/clan-core/archive/26.05.tar.gz";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # Pinned unstable for opencode (replaces builtins.getFlake impurity in local-machine.nix).
    nixpkgs-unstable = {
      url = "github:NixOS/nixpkgs/nixos-unstable";
    };
  };

  outputs = { self, nixpkgs, disko, clan-core, ... } @ inputs:
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

      # -- Image client modules (hyperv only) --
      # Canonical machine config lives in Clan: machines/client1/configuration.nix.
      # (Replaces the deleted legacy `clients` map — image client only;
      # client2/client3 live in Clan inventory: clan.nix + machines/<name>/.)
      # Image-only: never `clan machines install` — built as VHDX via CI.
      imageClientModules = [ ./machines/client1/configuration.nix ];

      # -- All NixOS modules --
      commonModules = [
        ./options.nix
        ./modules/networking.nix
        ./modules/locale.nix
        ./modules/boot.nix
        ./modules/nix-settings.nix
        ./modules/system.nix
        ./modules/containers.nix
        ./modules/integration.nix
        ./modules/mariadb.nix
        ./modules/caddy.nix
        ./modules/fastfree_backend.nix
        ./modules/fastfree_ledger.nix
        ./modules/fastfree_erp.nix
        ./modules/fastfree_hr.nix
        ./modules/fastfree_pos.nix
        ./modules/fastfree_website.nix
        ./modules/phpmyadmin.nix
        ./modules/cockpit.nix
        ./modules/desktop.nix
        ./modules/avahi-subdomains.nix
      ];

      testDiskSize = { virtualisation.diskSize = 8 * 1024; };

      # -- VHDX image builder (Clan machine config + image-only module) --
      # Builds from the Clan machine module (imageClientModules above),
      # NOT from the deleted legacy `clients` attrset.
      makeVhdx = machineModules:
        (lib.nixosSystem {
          inherit system;
          specialArgs = { inherit inputs; };
          modules = machineModules ++ [
            # sops options (machines set sops.age.keyFile); provided by Clan
            # for clan machines, imported explicitly here for the image path.
            clan-core.inputs.sops-nix.nixosModules.sops
            ({ config, pkgs, lib, ... }: {
            virtualisation.diskSize = 40 * 1024;

            system.build.hypervImage = lib.mkForce (
              import "${nixpkgs}/nixos/lib/make-disk-image.nix" {
                name = "nixos-hyperv-${config.system.nixos.label}-fixed";
                baseName = "fastfree_client1";
                postVM = ''
                  ${pkgs.vmTools.qemu}/bin/qemu-img convert -f raw -o subformat=fixed -O vhdx $diskImage $out/fastfree_client1.vhdx
                  ${pkgs.p7zip}/bin/7z a -t7z -m0=lzma2 -mx=9 -p"FastOS@2026" -mhe=on $out/fastfree_client1.vhdx.7z $out/fastfree_client1.vhdx
                  rm $out/fastfree_client1.vhdx
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

      # -- Clan 26.05 result (official default template pattern) --
      clanResult = clan-core.lib.clan {
        inherit self;
        imports = [ ./clan.nix ];
        specialArgs = { inherit inputs; };
      };

    in {
      # -- Clan 26.05 (official convert-existing-NixOS-configuration) --
      # clanResult is defined in the let block above; clan.nix (inventory) is
      # imported explicitly (official default template pattern).
      # Phase 1: build/check only. The legacy attrset path (clients map +
      # mkBaseConfig/mkSystemConfig + legacy nixosConfigurations) is deleted —
      # Clan inventory (clan.nix + machines/<name>/) is canonical now.
      clan = clanResult.config;
      clanInternals = clanResult.config.clanInternals;
      # Standard output expected by `nixos-rebuild --flake .#<name>`
      # (official convert template: inherit nixosConfigurations from clan).
      nixosConfigurations = clanResult.config.nixosConfigurations;

      # -- VHDX package (image-only hyperv client1, built from Clan machine config) --
      packages.${system}.client1 = makeVhdx imageClientModules;

      # -- checks (NixOS tests for CI) --
      checks.${system} = {
        # ── اختبار 1: MariaDB يشتغل ────────────────────────────────
        mariadb-test = pkgs.testers.runNixOSTest {
          name = "mariadb-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              {
                fastfree.identity.name = lib.mkForce "test";
                fastfree.identity.domain = lib.mkForce "test.local";
                fastfree.passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                fastfree.apps = { base = true; mariadb = true; };
              }
            ];
          };
          testScript = ''
            machine.wait_for_unit("mysql.service")
            machine.wait_for_open_port(3306)
            machine.succeed("mysql -u root -ptest -e 'SELECT 1'")
          '';
        };

        # ── اختبار 2: SSH يشتغل ────────────────────────────────────
        sshd-test = pkgs.testers.runNixOSTest {
          name = "sshd-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              {
                fastfree.identity.name = lib.mkForce "test";
                fastfree.identity.domain = lib.mkForce "test.local";
                fastfree.passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                fastfree.apps = { base = true; };
              }
            ];
          };
          testScript = ''
            machine.wait_for_unit("sshd.service")
            machine.wait_for_open_port(22)
          '';
        };

        # ── اختبار 3: Podman يشتغل ─────────────────────────────────
        podman-test = pkgs.testers.runNixOSTest {
          name = "podman-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              {
                fastfree.identity.name = lib.mkForce "test";
                fastfree.identity.domain = lib.mkForce "test.local";
                fastfree.passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                fastfree.apps = { base = true; };
              }
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

        # ── اختبار 4: Avahi يشتغل ───────────────────────────────────
        avahi-test = pkgs.testers.runNixOSTest {
          name = "avahi-test";
          nodes.machine = { config, pkgs, ... }: {
            imports = commonModules ++ [
              testDiskSize
              {
                fastfree.identity.name = lib.mkForce "test";
                fastfree.identity.domain = lib.mkForce "test.local";
                fastfree.passwords = { root = null; admin = "test"; mariadbRoot = "test"; mariadbUser = "test"; };
                fastfree.apps = { base = true; };
                fastfree.avahi = {
                  enable = true;
                  reflector = false;
                  interfaces = [];
                };
              }
            ];
          };
          testScript = ''
            machine.wait_for_unit("avahi-daemon.service")
            machine.succeed("avahi-browse -a -t -p || true")
          '';
        };

      };

      # -- Clan CLI synced with clan-core (official convert-existing) --
      devShells.${system}.default = pkgs.mkShell {
        packages = [ clan-core.packages.${system}.clan-cli ];
      };

    };
}
