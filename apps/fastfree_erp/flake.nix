{
  description = "FastFree ERP — Container image for full ERP frontend SPA";

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
        description = "FastFree ERP — Nix-built container image";
        platforms = [ "x86_64-linux" ];
      };

      # Quasar (pnpm) is built with the official pnpmConfigHook +
      # fetchPnpmDeps. `buildNpmPackage` is npm-only and does NOT support
      # pnpm, so stdenv.mkDerivation + pnpmConfigHook is the canonical
      # Nix way for this SPA.
      spa-app = pkgs.stdenv.mkDerivation {
        pname = "fastfree-erp-spa";
        version = "1.0.0";
        src = ../../.;

        nativeBuildInputs = [
          nodejs
          pnpm
          pkgs.pnpmConfigHook
          pkgs.autoPatchelfHook
          pkgs.patchelf
        ];

        # Same root pnpm-lock.yaml for all 4 apps → identical FOD hash.
        pnpmDeps = pkgs.fetchPnpmDeps {
          inherit (spa-app) pname version src;
          inherit pnpm;
          fetcherVersion = 3;
          hash = "sha256-RPNJibYIAvAmp/VHMMIijZyPKdn6zWKy4BnxZtxdDnE=";
        };

        buildInputs = [ pkgs.glibc pkgs.zlib ];

        # sass-embedded ships a prebuilt dart binary that must be patched
        # against the Nix glibc. Find it (version-agnostic) and patch it
        # loudly — never swallow the error.
        preBuild = ''
          DART=$(find node_modules/.pnpm -path '*sass-embedded-linux-x64*/dart-sass/src/dart' 2>/dev/null | head -1)
          if [ -n "$DART" ]; then
            patchelf --set-interpreter ${pkgs.glibc}/lib/ld-linux-x86-64.so.2 \
                     --set-rpath "${pkgs.lib.makeLibraryPath [ pkgs.glibc pkgs.zlib ]}" \
                     "$DART"
          fi
        '';

        pnpmRoot = ".";

        buildPhase = ''
          runHook preBuild
          cd apps/fastfree_erp
          mkdir -p .quasar
          [ -f .quasar/tsconfig.json ] || echo '{"compilerOptions":{}}' > .quasar/tsconfig.json
          pnpm exec quasar prepare
          pnpm exec quasar build -m spa
          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p $out/srv
          cp -r $src/apps/fastfree_erp/dist/spa/. $out/srv/
          runHook postInstall
        '';

        inherit meta;
      };

      # Static-only Caddyfile. API / socket.io proxying is handled by the
      # host's single edge Caddy (services.caddy), not inside the container.
      caddyfile = pkgs.writeText "Caddyfile" ''
        :9001 {
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
        name = "fastfree_erp";
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
          Cmd = [ "${pkgs.caddy}/bin/caddy" "run" "--config" "/etc/caddy/Caddyfile" ];
          ExposedPorts = { "9001/tcp" = {}; };
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
