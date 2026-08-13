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

      # ── Shared metadata ────────────────────────────────────────
      meta = {
        description = "FastFree Ledger — Nix-built container image";
        platforms = [ "x86_64-linux" ];
      };

      # ── Frontend App (Quasar SPA) ─────────────────────────────
      spa-app = pkgs.stdenv.mkDerivation {
        pname = "fastfree-ledger-spa";
        version = "1.0.0";
        src = ../../.;

        nativeBuildInputs = [
          nodejs
          pnpm
          pkgs.pnpmConfigHook
          pkgs.autoPatchelfHook
          pkgs.patchelf
        ];

        pnpmDeps = pkgs.fetchPnpmDeps {
          inherit (spa-app) pname version src;
          inherit pnpm;
          fetcherVersion = 3;
          hash = "";
        };

        buildInputs = [ pkgs.glibc pkgs.zlib ];

        preBuild = ''
          DART_DIR="node_modules/.pnpm/sass-embedded-linux-x64@1.100.0/node_modules/sass-embedded-linux-x64/dart-sass/src"
          if [ -f "$DART_DIR/dart" ]; then
            patchelf --set-interpreter ${pkgs.glibc}/lib/ld-linux-x86-64.so.2 \
                     --set-rpath "${pkgs.lib.makeLibraryPath [ pkgs.glibc pkgs.zlib ]}" \
                     "$DART_DIR/dart" 2>/dev/null || true
          fi
        '';

        pnpmRoot = ".";

        buildPhase = ''
          runHook preBuild
          cd apps/fastfree_ledger
          mkdir -p .quasar
          echo '{"compilerOptions":{}}' > .quasar/tsconfig.json
          rm -rf node_modules
          ln -s ../../node_modules .
          pnpm exec quasar prepare
          pnpm exec quasar build -m spa
          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p $out/srv
          cp -r dist/spa/* $out/srv/
          runHook postInstall
        '';

        inherit meta;
      };

      # ── Caddyfile ─────────────────────────────────────────────
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

            @api path /api/*
            handle @api {
                reverse_proxy fastfree-backend-app:8000
            }

            @websocket path /socket.io/*
            handle @websocket {
                reverse_proxy fastfree-backend-websocket:9000
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

      # ── Frontend Image ────────────────────────────────────────
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
          Cmd = [ "${pkgs.caddy}/bin/caddy" "run" "--config" "/etc/caddy/Caddyfile" ];
          ExposedPorts = { "9000/tcp" = {}; };
        };
      };

    in {
      packages.${system} = {
        frontendImage = frontend-image;
        default = frontend-image;
      };

      # ── Development Environment ─────────────────────────
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          nodejs
          pnpm
        ];
      };
    };
}
