{
  description = "FastFree Website — Container image for the Next.js (standalone) marketing site";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      lib = pkgs.lib;

      nodejs = pkgs.nodejs_22;

      # ── Official Nix packaging for an npm / Next.js project ──
      # pkgs.buildNpmPackage reproducibly fetches dependencies via an
      # offline fetchNpmDeps derivation (scoped to the website dir, where
      # package-lock.json lives) and runs `npm ci` + `npm run build`.
      # No __noChroot / network hacks and no ad-hoc `find` launcher.
      #
      # npmDepsHash is set to lib.fakeHash: the FIRST `nix build`
      # fails and prints the real hash, which you then paste back here.
      website-app = pkgs.buildNpmPackage {
        pname = "fastfree-website";
        version = "1.0.0";

        src = ../../apps/fastfree_website;

        npmDepsHash = lib.fakeHash;

        npmInstallFlags = [ "--legacy-peer-deps" "--no-audit" "--no-fund" ];
        npmBuildScript = "build";

        nodejs = nodejs;

        env = {
          NODE_OPTIONS = "--max-old-space-size=4096";
          NEXT_TELEMETRY_DISABLED = "1";
        };

        # buildNpmPackage already ran `next build`; the standalone
        # output lives at .next/standalone. Copy the traced server plus
        # static + public assets.
        installPhase = ''
          runHook preInstall

          mkdir -p $out
          cp -r .next/standalone/. $out/

          mkdir -p $out/.next/static $out/public
          cp -r .next/static/. $out/.next/static/
          cp -r public/. $out/public/

          runHook postInstall
        '';
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
          Env = [
            "NODE_ENV=production"
            "NEXT_TELEMETRY_DISABLED=1"
            "PORT=3000"
            "HOSTNAME=0.0.0.0"
          ];
          WorkingDir = "${website-app}";
          Cmd = [ "${nodejs}/bin/node" "${website-app}/server.js" ];
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
