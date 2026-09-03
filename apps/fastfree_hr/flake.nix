{
  description = "FastFree HR — Container image for HR + CRM frontend SPA";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      nodejs = pkgs.nodejs_22;
      pnpm = pkgs.pnpm_10;

      meta = {
        description = "FastFree HR — Nix-built container image";
        platforms = [ "x86_64-linux" ];
      };

      spa-app = pkgs.stdenv.mkDerivation {
        pname = "fastfree-hr-spa";
        version = "1.0.0";
        src = ../../.;

        nativeBuildInputs = [
          nodejs
          pnpm
          pkgs.pnpmConfigHook
        ];

        pnpmDeps = pkgs.fetchPnpmDeps {
          inherit (spa-app) pname version src;
          inherit pnpm;
          fetcherVersion = 3;
          hash = "sha256-XTVGR51YZy1/cadvGGF5qs9I4iCZnHqwnqIo7bZGrGE=";
        };

        buildInputs = [ pkgs.glibc ];

        pnpmRoot = ".";

        pnpmFlags = [ "--config.onlyBuiltDependencies=['esbuild','@parcel/watcher','vue-demi']" ];

        preBuild = ''
          rm -rf node_modules/.pnpm/sass-embedded*
          rm -rf node_modules/sass-embedded*
        '';

        buildPhase = ''
          runHook preBuild
          cd apps/fastfree_hr
          mkdir -p .quasar
          [ -f .quasar/tsconfig.json ] || echo '{"compilerOptions":{}}' > .quasar/tsconfig.json
          pnpm exec quasar prepare
          pnpm exec quasar build -m spa
          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p $out/srv
          cp -r dist/spa/. $out/srv/
          runHook postInstall
        '';

        inherit meta;
      };

      caddyfile = pkgs.writeText "Caddyfile" ''
        {
            admin off
        }
        :9002 {
            root * /srv

            header {
                X-Frame-Options "SAMEORIGIN"
                X-Content-Type-Options "nosniff"
                X-XSS-Protection "1; mode=block"
                Referrer-Policy "strict-origin-when-cross-origin"
                Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http: https: ws:"
            }

            handle {
                try_files {path} /index.html
                file_server
            }

            log {
                output stdout
                format console
                level info
            }
        }
      '';

      frontend-image = pkgs.dockerTools.streamLayeredImage {
        name = "fastfree_hr";
        tag = "latest";

        created = "2026-01-01T00:00:00Z";

        contents = [
          pkgs.caddy
          spa-app
          (pkgs.runCommand "caddy-config" {} ''
            mkdir -p $out/etc/caddy
            cp ${caddyfile} $out/etc/caddy/Caddyfile
          '')
          pkgs.dockerTools.usrBinEnv
          pkgs.dockerTools.binSh
          pkgs.dockerTools.caCertificates
          pkgs.dockerTools.fakeNss
        ];

        maxLayers = 50;

        config = {
          Labels = {
            "org.opencontainers.image.source" = "https://github.com/FastFreeCloud/fastfree";
            "org.opencontainers.image.description" = "FastFree HR";
            "org.opencontainers.image.title" = "fastfree_hr";
          };
          Cmd = [ "${pkgs.caddy}/bin/caddy" "run" "--config" "/etc/caddy/Caddyfile" ];
          ExposedPorts = { "9002/tcp" = {}; };
        };
      };

    in {
      packages.${system} = {
        frontendImage = frontend-image;
        default = frontend-image;
      };

      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          nodejs
          pnpm
        ];
      };
    };
}

