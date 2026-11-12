import type { Context } from "@opencode/plugin/gui"
import { Effect } from "effect"
import { Schema } from "effect"
import { boardTranslate, boardPlural, resolveBoardLang, type BoardLang } from "./i18n"

export type BoardTranslate = (key: string, params?: Record<string, string | number>) => string

/** Reads the shared settings-v1 store. Default Arabic if absent. */
export function useBoardLang(ctx: Pick<Context, "storage">) {
  const store = ctx.storage.store("settings-v1", {
    schema: Schema.Struct({
      toolsEnabled: Schema.Boolean,
      locale: Schema.optional(Schema.Literals(["ar", "en"])),
      columnsSeeded: Schema.optional(Schema.Boolean),
    }),
    initial: { toolsEnabled: true, locale: "ar" },
    scope: "global",
  })
  const getValue = (): { toolsEnabled: boolean; locale?: BoardLang } | undefined =>
    store.value as { toolsEnabled: boolean; locale?: BoardLang } | undefined
  const lang = (): BoardLang => resolveBoardLang(getValue())
  const t: BoardTranslate = (key, params) => boardTranslate(lang(), key, params)
  const plural = (key: string, count: number) => boardPlural(lang(), key, count)
  const dir = (): "rtl" | "ltr" => (lang() === "ar" ? "rtl" : "ltr")
  const intlLocale = () => (lang() === "ar" ? "ar-EG" : "en-US")
  return { lang, t, plural, dir, intlLocale, settings: store }
}
