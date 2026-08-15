{
  description = "FastFree Website — Container image for the Next.js (standalone) marketing site";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      nodejs = pkgs.nodejs_22;

      meta = {
        description = "FastFree Website — Nix-built container image (Next.js standalone)";
        platforms = [ "x86_64-linux" ];
      };

      # ── Next.js standalone build ──────────────────────
      # `output: 'standalone'` in next.config.ts emits a traced Node
      # server under .next/standalone plus the static assets and public
      # dir. We copy those into the image and run the traced server.
      #
      # __noChroot lets `npm ci` fetch dependencies at build time so we
      # don't need a precomputed npmDeps hash.
      website-app = pkgs.stdenv.mkDerivation {
        pname = "fastfree-website";
        version = "1.0.0";
        src = ../../.;

        nativeBuildInputs = [ nodejs ];

        __noChroot = true;

        env = {
          NODE_OPTIONS = "--max-old-space-size=4096";
          NEXT_TELEMETRY_DISABLED = "1";
        };

        buildPhase = ''
          runHook preBuild
          cd apps/fastfree_website
          npm ci --legacy-peer-deps --no-audit --no-fund
          npm run build
          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p $out
          cp -r apps/fastfree_website/.next/standalone/. $out/
          mkdir -p $out/apps/fastfree_website/.next
          cp -r apps/fastfree_website/.next/static $out/apps/fastfree_website/.next/static
          cp -r apps/fastfree_website/public $out/apps/fastfree_website/public
          runHook postInstall
        '';

        inherit meta;
      };

      frontend-image = pkgs.dockerTools.streamLayeredImage {
        name = "fastfree_website";
        tag = "latest";

        created = "2026-01-01T00:00:00Z";

        contents = [
          nodejs
          website-app
          pkgs.dockerTools.usrBinEnv
          pkgs.dockerTools.binSh
          pkgs.dockerTools.caCertificates
          pkgs.dockerTools.fakeNss
        ];

        maxLayers = 50;

        config = {
          WorkingDir = "${website-app}";
          Cmd = [ "${nodejs}/bin/node" "${website-app}/apps/fastfree_website/server.js" ];
          ExposedPorts = { "3000/tcp" = {}; };
        };
      };

    in {
      packages.${system} = {
        frontendImage = frontend-image;
        default = frontend-image;
      };

      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [ nodejs ];
      };
    };
}
