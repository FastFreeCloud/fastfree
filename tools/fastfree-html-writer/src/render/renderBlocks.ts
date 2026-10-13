import type { Block } from "./blocks.js";
import { escapeAttr, escapeHtml } from "../util/escape.js";

const SAFE_HREF = /^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i;

function safeHref(raw: string): string | null {
  const href = raw.trim();
  return SAFE_HREF.test(href) ? href : null;
}

function inline(raw: string): string {
  const kv: string[] = [];
  const code: string[] = [];

  let out = String(raw ?? "");
  out = out.replace(/<span class="kv">([\s\S]*?)<\/span>/g, (_m, inner: string) => {
    return `\u0000${kv.push(inner) - 1}\u0000`;
  });
  out = out.replace(/`([^`]+)`/g, (_m, inner: string) => {
    return `\u0001${code.push(inner) - 1}\u0001`;
  });

  out = escapeHtml(out);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]*)\]\(([^)\s]*)\)/g, (m, label: string, href: string) => {
    const safe = safeHref(href);
    return safe ? `<a href="${escapeAttr(safe)}" rel="noopener noreferrer">${label || escapeHtml(safe)}</a>` : label || m;
  });

  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<span class="kv">${escapeHtml(kv[Number(i)] ?? "")}</span>`);
  out = out.replace(/\u0001(\d+)\u0001/g, (_m, i: string) => `<code>${escapeHtml(code[Number(i)] ?? "")}</code>`);
  return out;
}

function renderHeading(b: Extract<Block, { type: "heading" }>): string {
  return `<h${b.level}>${inline(b.text)}</h${b.level}>`;
}

function renderParagraph(b: Extract<Block, { type: "paragraph" }>): string {
  const cls = b.emphasis === "big" ? ` class="big"` : "";
  return `<p${cls}>${inline(b.text)}</p>`;
}

function renderCode(b: Extract<Block, { type: "code" }>): string {
  const pre = `<pre><code>${escapeHtml(b.content)}</code></pre>`;
  const cap = b.caption ? `<div class="tcap">${inline(b.caption)}</div>` : "";
  return `<figure class="fig">${pre}${cap}</figure>`;
}

function renderCard(b: Extract<Block, { type: "card" }>): string {
  const cls = b.variant ? `card ${b.variant}` : "card";
  const title = b.title ? `<div class="ctitle">${inline(b.title)}</div>` : "";
  return `<div class="${cls}">${title}${renderBlocks(b.blocks)}</div>`;
}

function renderTable(b: Extract<Block, { type: "table" }>): string {
  const code = new Set(b.codeColumns ?? []);
  const cell = (tag: "th" | "td", value: string, index: number): string => {
    const cls = code.has(index) ? ` class="code"` : "";
    return `<${tag}${cls}>${inline(value)}</${tag}>`;
  };
  const head = b.head.map((h, i) => cell("th", h, i)).join("");
  const rows = b.rows
    .map((row) => `<tr>${row.map((c, i) => cell("td", c, i)).join("")}</tr>`)
    .join("");
  return `<div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderTags(b: Extract<Block, { type: "tags" }>): string {
  const items = b.items
    .map((it) => `<span class="tag${it.variant ? ` ${it.variant}` : ""}">${escapeHtml(it.label)}</span>`)
    .join("");
  return `<div class="tags">${items}</div>`;
}

function renderQa(b: Extract<Block, { type: "qa" }>): string {
  const items = b.items
    .map((it) => `<div class="q">${inline(it.q)}</div><div class="a">${inline(it.a)}</div>`)
    .join("");
  return `<div class="qa">${items}</div>`;
}

function renderSteps(b: Extract<Block, { type: "steps" }>): string {
  const items = b.items
    .map((it) => {
      const body = it.body ? `<div class="sb">${inline(it.body)}</div>` : "";
      return `<li><div class="st">${inline(it.title)}</div>${body}</li>`;
    })
    .join("");
  return `<ol class="steps">${items}</ol>`;
}

function renderFlow(b: Extract<Block, { type: "flow" }>): string {
  const items = b.items
    .map((it) => {
      const detail = it.detail ? `<span class="fd">${inline(it.detail)}</span>` : "";
      return `<div class="fi"><span class="fn">${escapeHtml(String(it.n))}</span><span class="ft">${inline(it.title)}</span>${detail}</div>`;
    })
    .join("");
  return `<div class="flow">${items}</div>`;
}

function renderTree(b: Extract<Block, { type: "tree" }>): string {
  return `<div class="tree">${escapeHtml(b.content)}</div>`;
}

function renderGrid(b: Extract<Block, { type: "grid" }>): string {
  const cards = b.cards
    .map((c) => {
      const body = `<div class="dt">${inline(c.title)}</div><div class="db">${inline(c.body)}</div>`;
      const href = c.href ? safeHref(c.href) : null;
      return href
        ? `<a class="doc" href="${escapeAttr(href)}" rel="noopener noreferrer">${body}</a>`
        : `<div class="doc">${body}</div>`;
    })
    .join("");
  return `<div class="grid">${cards}</div>`;
}

function renderBarRow(b: Extract<Block, { type: "barrow" }>): string {
  const size = b.size === "m" || b.size === "l" ? b.size : "s";
  return `<div class="barrow"><span class="bl">${inline(b.label)}</span><div class="bar"><span class="${size}"></span></div></div>`;
}

function renderList(b: Extract<Block, { type: "list" }>): string {
  const items = b.items.map((it) => `<li>${inline(it)}</li>`).join("");
  return `<ul>${items}</ul>`;
}

function renderKv(b: Extract<Block, { type: "kv" }>): string {
  return `<span class="kv">${inline(b.text)}</span>`;
}

export function renderBlock(b: Block): string {
  switch (b.type) {
    case "heading":
      return renderHeading(b);
    case "paragraph":
      return renderParagraph(b);
    case "code":
      return renderCode(b);
    case "card":
      return renderCard(b);
    case "table":
      return renderTable(b);
    case "tags":
      return renderTags(b);
    case "qa":
      return renderQa(b);
    case "steps":
      return renderSteps(b);
    case "flow":
      return renderFlow(b);
    case "tree":
      return renderTree(b);
    case "grid":
      return renderGrid(b);
    case "barrow":
      return renderBarRow(b);
    case "list":
      return renderList(b);
    case "kv":
      return renderKv(b);
    default:
      return "";
  }
}

export function renderBlocks(bs: Block[]): string {
  return bs.map(renderBlock).join("");
}