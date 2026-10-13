/** Pure string-sanitising helpers for the FastFree HTML writer: escaping, tag stripping and slug generation. */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const ATTR_ENTITIES: Record<string, string> = {
  ...HTML_ENTITIES,
  "`": "&#96;",
  "=": "&#61;",
};

const HTML_UNESCAPE: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function mapChars(s: string, table: Record<string, string>): string {
  let out = "";
  for (const ch of s) out += table[ch] ?? ch;
  return out;
}

export function escapeHtml(s: string): string {
  return mapChars(s, HTML_ENTITIES);
}

export function escapeAttr(s: string): string {
  return mapChars(s, ATTR_ENTITIES);
}

export function stripTags(s: string): string {
  return s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos);/gi, (m) => HTML_UNESCAPE[m.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : "page";
}