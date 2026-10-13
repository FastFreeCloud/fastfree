/** Shared block vocabulary for the FastFree HTML writer: the renderer consumes `Block[]` plus `PageMeta` to produce a standalone, self-contained document. */

export type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string; emphasis?: "normal" | "big" }
  | { type: "code"; content: string; caption?: string }
  | { type: "card"; variant?: "ok" | "acc" | "warn" | "bad"; title?: string; blocks: Block[] }
  | { type: "table"; head: string[]; rows: string[][]; codeColumns?: number[] }
  | { type: "tags"; items: { label: string; variant?: "ok" | "no" | "acc" | "warn" }[] }
  | { type: "qa"; items: { q: string; a: string }[] }
  | { type: "steps"; items: { title: string; body?: string }[] }
  | { type: "flow"; items: { n: number; title: string; detail?: string }[] }
  | { type: "tree"; content: string }
  | { type: "grid"; cards: { title: string; body: string; href?: string }[] }
  | { type: "barrow"; label: string; size: "s" | "m" | "l" }
  | { type: "list"; items: string[] }
  | { type: "kv"; text: string };

export interface PageMeta {
  title: string;
  subtitle?: string;
  logo?: string;
}