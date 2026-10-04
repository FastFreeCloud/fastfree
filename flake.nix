# FastFree monorepo root — Clan entry shim (official Nix path: input only).
#
# Why: clan CLI 26.05 resolves the flake at the git root and requires
# flake.nix there; the OS flake lives in apps/fastfree_os/ (kept as-is).
# This shim re-exports it, so `clan` works from the repo root while every
# real definition stays in apps/fastfree_os/ (single source of truth).
# No pnpm/CI impact: pnpm ignores flake.nix; workflows use explicit dirs.
{
  description = "FastFree monorepo root — Clan entry shim for apps/fastfree_os";

  inputs.fastfree-os.url = "path:./apps/fastfree_os";

  outputs = { fastfree-os, ... }:
    {
      inherit (fastfree-os)
        clan
        clanInternals
        nixosConfigurations
        checks
        devShells
        packages;
    };
}
