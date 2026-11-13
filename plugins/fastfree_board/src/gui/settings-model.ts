import { Schema } from "effect"

/**
 * The one Board settings document. Both the language hook (lang.ts) and the
 * settings page (settings.tsx) read this same store, so the schema lives here.
 */
export const SettingsSchema = Schema.Struct({
  toolsEnabled: Schema.Boolean,
  /** Interface language. Absent means Arabic (the first-install default). */
  locale: Schema.optional(Schema.Literals(["ar", "en"])),
  columnsSeeded: Schema.optional(Schema.Boolean),
  // Automatic lifecycle: the columns drive execution.
  autoStart: Schema.optional(Schema.Boolean),
  autoReview: Schema.optional(Schema.Boolean),
  autoPromote: Schema.optional(Schema.Boolean),
  maxConcurrent: Schema.optional(Schema.Number),
  autoModel: Schema.optional(Schema.String),
})

export const BOARD_SETTINGS_KEY = "settings-v1"
export const BOARD_SETTINGS_INITIAL = { toolsEnabled: true, locale: "ar" } as never

/** Model used by the automatic lifecycle when the setting has never been edited. */
export const DEFAULT_AUTO_MODEL = "opencode/glm-5.3-flash-free"
