import { escapeAttr, escapeHtml } from "../util/escape.js";
import { CSS } from "./css.js";
import type { Block, PageMeta } from "./blocks.js";
import { renderBlocks } from "./renderBlocks.js";
import { injectNav, type NavItem } from "./nav.js";
import { injectSidebar, SIDEBAR_SCRIPT } from "./sidebar.js";

const TOGGLE_SCRIPT = `(function(){
var nodes=document.querySelectorAll('.path');
if(!nodes.length){return;}
for(var i=0;i<nodes.length;i++){
(function(node){
node.addEventListener('click',function(){
var a=document.getElementById(node.getAttribute('data-target-a')||'');
var b=document.getElementById(node.getAttribute('data-target-b')||'');
if(a){a.classList.toggle('hidden');}
if(b){b.classList.toggle('hidden');}
});
})(nodes[i]);
}
})();`;

export function renderPage(
  meta: PageMeta,
  blocks: Block[],
  footer?: string,
  nav?: NavItem[],
  currentHref?: string,
): string {
  const title = escapeHtml(meta.title ?? "FastFree");
  const sub = meta.subtitle ? `<p class="sub">${escapeHtml(meta.subtitle)}</p>` : "";
  const logo = meta.logo ? `<img class="logo" src="${escapeAttr(meta.logo)}" alt="${escapeAttr(meta.logo)}" />` : "";
  const body = renderBlocks(blocks ?? []);
  const foot = footer ? `<footer>${escapeHtml(footer)}</footer>` : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<title>${title}</title>
<style>
${CSS}
</style>
</head>
<body>
<div class="wrap">
<header>${logo}<div class="hgroup"><h1>${title}</h1>${sub}</div></header>
${body}
${foot}
</div>
<script>
${TOGGLE_SCRIPT}
${SIDEBAR_SCRIPT}
</script>
</body>
</html>
`;
}

export function renderPageWithNav(
  meta: PageMeta,
  blocks: Block[],
  footer: string | undefined,
  nav: NavItem[],
  currentHref: string,
): string {
  const html = renderPage(meta, blocks, footer);
  return injectNav(html, nav, currentHref);
}