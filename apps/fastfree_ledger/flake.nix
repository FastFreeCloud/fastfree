{
  description = "FastFree Ledger — Container image for frontend SPA";

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
        description = "FastFree Ledger — Nix-built container image";
        platforms = [ "x86_64-linux" ];
      };

      spa-app = pkgs.stdenv.mkDerivation {
        pname = "fastfree-ledger-spa";
        version = "1.0.0";
        src = ../../.;

        nativeBuildInputs = [
          nodejs
          pnpm
          pkgs.pnpmConfigHook
        ];

        # NOTE: On first build, nix will fail and show the correct hash.
        # Copy it here and rebuild. Example: sha256-abc123...
        pnpmDeps = pkgs.fetchPnpmDeps {
          inherit (spa-app) pname version src;
          inherit pnpm;
          fetcherVersion = 3;
          hash = pkgs.lib.fakeHash;
        };

        buildInputs = [ pkgs.glibc ];

        preBuild = ''
          chmod +x node_modules/.pnpm/sass-embedded-*/node_modules/sass-embedded-linux-x64/*.dart 2>/dev/null || true
          chmod +x node_modules/.pnpm/sass-embedded-*/node_modules/sass-embedded-linux-arm64/*.dart 2>/dev/null || true
        '';

        pnpmRoot = ".";

        buildPhase = ''
          runHook preBuild
          cd apps/fastfree_ledger
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
        :9000 {
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
        name = "fastfree_ledger";
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
            "org.opencontainers.image.description" = "FastFree Ledger";
            "org.opencontainers.image.title" = "fastfree_ledger";
          };
          Cmd = [ "${pkgs.caddy}/bin/caddy" "run" "--config" "/etc/caddy/Caddyfile" ];
          ExposedPorts = { "9000/tcp" = {}; };
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
