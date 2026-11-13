import type { SduiScreen } from '../../contract/types.ts'

export type ScreenChannel = 'draft' | 'stable' | 'beta'

export interface StoredScreen {
  id: string
  channel: ScreenChannel | string
  version: number
  versionHash: string
  screen: SduiScreen
  targeting?: unknown
  publishedAt: number | null
  createdAt: number
}

export interface CreateDraftInput {
  id: string
  screen: SduiScreen
  channel?: string
  targeting?: unknown
}