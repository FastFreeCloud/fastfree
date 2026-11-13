import { usePlugin, type Context } from "@opencode/plugin/gui"
import { hindsightSettings, type HindsightStore } from "./hindsight"
import { boardTranslate, resolveBoardLang, type BoardLang } from "./i18n"
import { BoardViewSchema } from "./kanban-model"
import { BOARD_SETTINGS_KEY, BOARD_SETTINGS_INITIAL, DEFAULT_AUTO_MODEL, SettingsSchema } from "./settings-model"

export const boardSettingsPage = "board"

export function boardSettings(ctx: Pick<Context, "storage">) {
  return ctx.storage.store(BOARD_SETTINGS_KEY, { schema: SettingsSchema, initial: BOARD_SETTINGS_INITIAL, scope: "global" })
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
      <section class="settings-section" aria-label={t("lifecycleTitle")}>
        <div data-component="settings-list">
          <div data-component="settings-row" data-action="lifecycle-header">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("lifecycleTitle")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("lifecycleDescription")}</div>
            </div>
          </div>
          <div data-component="settings-row" data-action="auto-start">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("autoStart")}</div>
              <div data-slot="settings-row-description">{t("autoStartDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.Switch label={t("autoStart")} hideLabel
                checked={props.settings.value?.autoStart !== false} disabled={!props.settings.ready()}
                onChange={(autoStart) => props.settings.update((draft) => { draft.autoStart = autoStart })} />
            </div>
          </div>
          <div data-component="settings-row" data-action="auto-review">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("autoReview")}</div>
              <div data-slot="settings-row-description">{t("autoReviewDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.Switch label={t("autoReview")} hideLabel
                checked={props.settings.value?.autoReview !== false} disabled={!props.settings.ready()}
                onChange={(autoReview) => props.settings.update((draft) => { draft.autoReview = autoReview })} />
            </div>
          </div>
          <div data-component="settings-row" data-action="auto-promote">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("autoPromote")}</div>
              <div data-slot="settings-row-description">{t("autoPromoteDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.Switch label={t("autoPromote")} hideLabel
                checked={props.settings.value?.autoPromote !== false} disabled={!props.settings.ready()}
                onChange={(autoPromote) => props.settings.update((draft) => { draft.autoPromote = autoPromote })} />
            </div>
          </div>
          <div data-component="settings-row" data-action="max-concurrent">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("maxConcurrent")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("maxConcurrentDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.TextInput label={t("maxConcurrent")} class="sc-kanban-input" placeholder="2"
                value={String(props.settings.value?.maxConcurrent ?? 2)}
                onInput={(value: string) => props.settings.update((draft) => { draft.maxConcurrent = value.trim() === "" ? 2 : Math.max(1, Number(value)) })} />
            </div>
          </div>
          <div data-component="settings-row" data-action="auto-model">
            <div data-slot="settings-row-copy">
              <div data-slot="settings-row-title">{t("autoModel")}</div>
              <div class="text-11-regular text-v2-text-text-muted">{t("autoModelDescription")}</div>
            </div>
            <div data-slot="settings-row-control">
              <ui.TextInput label={t("autoModel")} class="sc-kanban-input" placeholder={t("autoModelPlaceholder")}
                value={props.settings.value?.autoModel ?? DEFAULT_AUTO_MODEL}
                onInput={(value: string) => props.settings.update((draft) => { draft.autoModel = value.trim() || DEFAULT_AUTO_MODEL })} />
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
