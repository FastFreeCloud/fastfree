import { Schema } from "effect"
import { usePlugin, type Context } from "@opencode/plugin/gui"
import { hindsightSettings, type HindsightStore } from "./hindsight"
import { boardTranslate, resolveBoardLang, type BoardLang } from "./i18n"
import { BoardViewSchema } from "./kanban-model"

export const SettingsSchema = Schema.Struct({
  toolsEnabled: Schema.Boolean,
  // Optional — absent means Arabic (mandatory default for first install).
  locale: Schema.optional(Schema.Literals(["ar", "en"])),
  columnsSeeded: Schema.optional(Schema.Boolean),
})
export const boardSettingsPage = "board"

export function boardSettings(ctx: Pick<Context, "storage">) {
  return ctx.storage.store("settings-v1", { schema: SettingsSchema, initial: { toolsEnabled: true, locale: "ar" } as never, scope: "global" })
}
export type SettingsStore = ReturnType<typeof boardSettings>

export function BoardSettings(props: { settings: SettingsStore; hindsight?: HindsightStore }) {
  const ctx = usePlugin()
  const settingsLocale = () =>
    (props.settings.value as { locale?: string } | undefined)?.locale as BoardLang | undefined
  const lang = () => resolveBoardLang({ locale: settingsLocale() ?? "ar" })
  const t = (key: string, params?: Record<string, string | number>) => boardTranslate(lang(), key, params)
  const ui = ctx.ui
  const hindsight = () => props.hindsight?.value
  // Independent handle over the same document the board reads; OpenCode keeps both in sync.
  const view = ctx.storage.store("kanban-view-v2", {
    schema: BoardViewSchema,
    initial: { collapsed: [], mode: "overlay" },
    scope: "global",
    from: "plugin.opencode-desktop-showcase.kanban-view-v2",
  })
  const layoutModes = () => [
    { mode: "overlay" as const, label: t("layoutOverlay") },
    { mode: "split" as const, label: t("layoutSplit") },
    { mode: "full" as const, label: t("layoutFull") },
    { mode: "list" as const, label: t("layoutList") },
  ]
  const toggleLanguage = () => {
    props.settings.update((draft) => { (draft as Record<string, unknown>).locale = lang() === "ar" ? "en" : "ar" })
  }
  return <>
    <div class="settings-tab-header">
      <div class="settings-tab-header-row">
        <div class="flex flex-col gap-1">
          <h2 class="settings-tab-title">{t("board")}</h2>
          <span class="text-11-regular text-v2-text-text-muted">{t("manageBoardAgents")}</span>
        </div>
      </div>
    </div>
    <div class="settings-tab-body settings-tab-body--sectioned">
      <section class="settings-section" aria-label={t("languageTitle")}>
        <div data-component="settings-list">
          <div data-component="settings-row" data-action="language">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("languageTitle")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("languageDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.Switch label={t("languageArabic")} hideLabel
                checked={lang() === "ar"} disabled={!props.settings.ready()}
                onChange={toggleLanguage} />
            </div>
          </div>
        </div>
      </section>
      <section class="settings-section" aria-label={t("layoutTitle")}>
        <div data-component="settings-list">
          <div data-component="settings-row" data-action="layout-header">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("layoutTitle")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("layoutDescription")}</div>
            </div>
          </div>
          {layoutModes().map((item) => {
            const active = (view.value?.mode ?? "overlay") === item.mode
            return <div data-component="settings-row" data-action={`layout-${item.mode}`}>
              <div data-slot="settings-row-copy">
                <div data-slot="settings-row-title">{item.label}</div>
              </div>
              <div data-slot="settings-row-control">
                <ui.Button variant={active ? "contrast" : "neutral"} size="small" disabled={!view.ready()}
                  onClick={() => view.update((draft) => { draft.mode = item.mode })}>{active ? `✓ ${item.label}` : item.label}</ui.Button>
              </div>
            </div>
          })}
        </div>
      </section>
      <section class="settings-section" aria-label={t("agentTools")}>
        <div data-component="settings-list">
          <div data-component="settings-row" data-action="tools">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("enableAgentTools")}</div>
              <div data-slot="settings-row-description">{t("agentToolsDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.Switch label={t("enableAgentTools")} hideLabel
                checked={props.settings.value?.toolsEnabled ?? true} disabled={!props.settings.ready()}
                onChange={(toolsEnabled) => props.settings.update((draft) => { draft.toolsEnabled = toolsEnabled })} />
            </div>
          </div>
        </div>
      </section>
      {props.hindsight ? <section class="settings-section" aria-label={t("hindsightTitle")}>
        <div data-component="settings-list">
          <div data-component="settings-row" data-action="hindsight">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("hindsightEnable")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("hindsightDescription")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("hindsightEnableDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.Switch label={t("hindsightEnable")} hideLabel
                checked={hindsight()?.enabled ?? false} disabled={!props.hindsight.ready()}
                onChange={(enabled) => props.hindsight!.update((draft) => { draft.enabled = enabled })} />
            </div>
          </div>
          <div data-component="settings-row" data-action="hindsight-bank">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("hindsightBank")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.TextInput label={t("hindsightBank")} class="sc-kanban-input" placeholder={t("hindsightBankPlaceholder")}
                value={hindsight()?.bank ?? "fastfree"}
                onInput={(value: string) => props.hindsight!.update((draft) => { draft.bank = value.trim() || "fastfree" })} />
            </div>
          </div>
          <div data-component="settings-row" data-action="hindsight-endpoint">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("hindsightEndpoint")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("hindsightEndpointDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.TextInput label={t("hindsightEndpoint")} class="sc-kanban-input" placeholder={t("hindsightEndpointPlaceholder")}
                value={(hindsight() as { endpoint?: string })?.endpoint ?? "http://127.0.0.1:9177"}
                onInput={(value: string) => props.hindsight!.update((draft) => { (draft as { endpoint?: string }).endpoint = value.trim().replace(/\/$/, "") || "http://127.0.0.1:9177" })} />
            </div>
          </div>
          <div data-component="settings-row" data-action="hindsight-agent-tools-note">
            <div data-slot="settings-row-copy">
              <div class="text-11-regular text-v2-text-text-muted">{t("hindsightAgentToolsNote")}</div>
            </div>
          </div>
        </div>
      </section> : null}
    </div>
  </>
}
