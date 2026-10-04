{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.base {

    # ── Time & Locale ─────────────────────────────────────
    time.timeZone      = config.fastfree.extra.timezone;
    i18n.defaultLocale = "en_US.UTF-8";
  };
}
