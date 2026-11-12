{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.base {

    # ── Time & Locale ─────────────────────────────────────
    time.timeZone      = config.fastfree.extra.timezone;
    i18n.defaultLocale = "en_US.UTF-8";

    # Arabic (Egypt) alongside English — makes ar_EG.UTF-8 appear in
    # `localectl list-locales` and desktop language pickers.
    # Default stays en_US so existing services/logs don't break;
    # per-user switch: `localectl set-locale LANG=ar_EG.UTF-8`
    i18n.supportedLocales = [
      "en_US.UTF-8/UTF-8"
      "ar_EG.UTF-8/UTF-8"
    ];

    # ── Arabic fonts (COSMIC + terminal) ────────────────────
    fonts.packages = with pkgs; [
      noto-fonts
      amiri
    ];
  };
}
