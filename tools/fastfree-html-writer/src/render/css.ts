export const CSS = `:root{
  --bg:#0e1117;
  --panel:#161b22;
  --panel2:#1c2333;
  --line:#2a3240;
  --fg:#e6edf3;
  --dim:#8b949e;
  --acc:#4c9aff;
  --ok:#3fb950;
  --warn:#d29922;
  --bad:#f85149;
  --code:#0b0f16;
  --sans:"Segoe UI","Noto Sans Arabic","Noto Kufi Arabic","Cairo","Tajawal",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --mono:"JetBrains Mono","Cascadia Code","SF Mono","Fira Code","DejaVu Sans Mono","Noto Sans Mono","Noto Sans Arabic","Noto Naskh Arabic",Menlo,Consolas,"Courier New",monospace;
  --radius:14px;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;
  background:var(--bg);
  color:var(--fg);
  font-family:var(--sans);
  font-size:15px;
  line-height:1.75;
}
.wrap{max-width:1080px;margin:0 auto;padding:32px 20px 64px}
.nav{
  display:flex;flex-wrap:wrap;gap:6px;align-items:center;
  margin:0 0 22px;padding:10px 12px;
  background:var(--panel2);border:1px solid var(--line);border-radius:10px;
}
.nav .nv{
  display:inline-block;padding:5px 12px;border-radius:7px;
  color:var(--dim);text-decoration:none;font-size:.88rem;
  border:1px solid transparent;transition:.15s;
}
.nav .nv:hover{color:var(--fg);background:var(--panel);border-color:var(--line)}
.nav .nv.on{
  color:var(--acc);background:rgba(76,154,255,.10);
  border-color:rgba(76,154,255,.35);font-weight:600;
}
header{
  background:linear-gradient(180deg,var(--panel) 0%,var(--bg) 100%);
  border:1px solid var(--line);
  border-radius:var(--radius);
  padding:24px 22px;
  margin-block-end:28px;
  display:flex;
  gap:18px;
  align-items:center;
  flex-wrap:wrap;
}
header .logo{
  width:52px;height:52px;flex:0 0 auto;border-radius:12px;
  background:var(--panel2);border:1px solid var(--line);
  object-fit:contain;display:block;
}
h1{
  font-size:1.7rem;line-height:1.3;margin:0;font-weight:700;letter-spacing:-.01em;
}
h2{
  font-size:1.2rem;margin:34px 0 12px;padding-block-end:8px;
  border-block-end:1px solid var(--line);font-weight:650;
}
h3{font-size:1rem;margin:22px 0 8px;font-weight:650;color:var(--fg)}
.sub{color:var(--dim);margin:4px 0 0;font-size:.95rem}
p{margin:0 0 12px}
.big{font-size:1.12rem;line-height:1.85;color:var(--fg)}
a{color:var(--acc);text-decoration:none}
a:hover{text-decoration:underline}
strong{color:#fff;font-weight:700}
code{
  font-family:var(--mono);
  font-size:.88em;
  background:var(--code);
  border:1px solid var(--line);
  border-radius:6px;
  padding:1px 6px;
  direction:ltr;
  unicode-bidi:embed;
}
pre{
  background:var(--code);
  border:1px solid var(--line);
  border-radius:var(--radius);
  padding:14px 16px;
  overflow-x:auto;
  direction:ltr;
  text-align:left;
  unicode-bidi:isolate;
  margin:0 0 14px;
}
pre code{
  background:none;border:0;padding:0;
  font-size:.85rem;line-height:1.6;
  display:block;white-space:pre;
}
.tcap{color:var(--dim);font-size:.82rem;margin:-8px 0 14px}
.fig{margin:0 0 14px}
.hgroup{flex:1 1 auto;min-width:0}
.card{
  background:var(--panel);
  border:1px solid var(--line);
  border-inline-start:3px solid var(--acc);
  border-radius:var(--radius);
  padding:16px 18px;
  margin:0 0 16px;
}
.card > :last-child{margin-block-end:0}
.card.ok{border-inline-start-color:var(--ok)}
.card.acc{border-inline-start-color:var(--acc)}
.card.warn{border-inline-start-color:var(--warn)}
.card.bad{border-inline-start-color:var(--bad)}
.ctitle{font-weight:650;margin-block-end:8px}
.tw{overflow-x:auto;margin:0 0 16px}
table{
  width:100%;
  border-collapse:collapse;
  background:var(--panel);
  font-size:.92rem;
}
th,td{
  border:1px solid var(--line);
  padding:9px 12px;
  text-align:start;
  vertical-align:top;
}
th{background:var(--panel2);color:var(--fg);font-weight:650;white-space:nowrap}
tbody tr:nth-child(even){background:rgba(255,255,255,.02)}
td.code,th.code{
  font-family:var(--mono);font-size:.84em;
  direction:ltr;text-align:left;unicode-bidi:isolate;
  white-space:pre-wrap;word-break:break-word;
}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.tag{
  display:inline-block;
  border:1px solid var(--line);
  background:var(--panel2);
  color:var(--fg);
  border-radius:999px;
  padding:3px 12px;
  font-size:.8rem;
  line-height:1.7;
}
.tag.ok{border-color:rgba(63,185,80,.5);background:rgba(63,185,80,.12);color:#7ee787}
.tag.no{border-color:rgba(248,81,73,.5);background:rgba(248,81,73,.12);color:#ff9492}
.tag.acc{border-color:rgba(76,154,255,.5);background:rgba(76,154,255,.12);color:#9ecbff}
.tag.warn{border-color:rgba(210,153,34,.5);background:rgba(210,153,34,.12);color:#e3b341}
.kv{
  font-family:var(--mono);font-size:.82em;
  background:var(--panel2);border:1px dashed var(--line);
  border-radius:6px;padding:1px 7px;direction:ltr;unicode-bidi:embed;
}
.steps{list-style:none;counter-reset:st;margin:0 0 16px;padding:0}
.steps > li{
  counter-increment:st;
  position:relative;
  padding-inline-start:3rem;
  padding-block:2px 2px;
  margin-block-end:12px;
}
.steps > li::before{
  content:counter(st);
  position:absolute;inset-inline-start:0;top:2px;
  width:1.9rem;height:1.9rem;border-radius:50%;
  background:var(--panel2);border:1px solid var(--line);color:var(--acc);
  display:flex;align-items:center;justify-content:center;
  font-size:.85rem;font-weight:700;
}
.steps > li > .st{margin:0 0 4px;font-weight:650}
.docs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:0 0 16px}
.doc{
  background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
  padding:14px 16px;color:inherit;text-decoration:none;display:block;
  transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;
}
.doc:hover{
  transform:translateY(-3px);
  border-color:var(--acc);
  box-shadow:0 8px 22px rgba(0,0,0,.4);
  text-decoration:none;
}
.doc .dt{font-weight:650;margin-block-end:6px;color:var(--acc)}
.doc .db{color:var(--dim);font-size:.9rem;line-height:1.6}
.qa{margin:0 0 16px;display:grid;gap:12px}
.qa .q,.qa .a{
  background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
  padding:12px 16px;
}
.qa .q{font-weight:650;border-inline-start:3px solid var(--acc)}
.qa .a{color:var(--dim);background:var(--panel2)}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 16px}
.fi{
  background:var(--panel);border:1px solid var(--line);border-radius:10px;
  padding:8px 14px;display:flex;flex-direction:column;min-width:0;
}
.fi .fn{color:var(--acc);font-weight:700;font-size:.78rem}
.fi .ft{font-weight:600;font-size:.92rem}
.fi .fd{color:var(--dim);font-size:.78rem}
.fi+.fi::before{
  content:"\\2190";
  color:var(--dim);
  align-self:center;
  margin-inline-end:4px;
  order:-1;
}
.tree{
  font-family:var(--mono);font-size:.84rem;line-height:1.65;
  background:var(--code);border:1px solid var(--line);border-radius:var(--radius);
  padding:14px 16px;overflow-x:auto;
  direction:ltr;text-align:left;unicode-bidi:isolate;
  white-space:pre;margin:0 0 16px;color:#c9d1d9;
}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:0 0 16px}
.barrow{display:flex;align-items:center;gap:12px;margin-block-end:10px}
.barrow .bl{min-width:120px;color:var(--dim);font-size:.86rem}
.bar{
  flex:1 1 auto;height:.7rem;border-radius:999px;
  background:var(--panel2);border:1px solid var(--line);overflow:hidden;
}
.bar .s,.bar .m,.bar .l{
  display:block;height:100%;
  background:linear-gradient(90deg,#2f6fd0,var(--acc));
}
.bar .s{width:33%}
.bar .m{width:66%}
.bar .l{width:100%}
footer{
  margin-block-start:40px;padding-block-start:16px;
  border-block-start:1px solid var(--line);
  color:var(--dim);font-size:.84rem;
}
.hidden{display:none !important}
.path{
  background:var(--panel);border:1px solid var(--line);
  border-radius:var(--radius);
  padding:12px 16px;margin:0 0 12px;
  cursor:pointer;user-select:none;
  display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  transition:border-color .15s ease,background .15s ease;
}
.path:hover{border-color:var(--acc);background:var(--panel2)}
.path .pm{color:var(--acc);font-weight:700}
ul,ol{margin:0 0 12px;padding-inline-start:1.5rem}
li{margin-block-end:4px}
.side{
  position:fixed;
  inset-block:0;
  inset-inline-start:0;
  width:264px;
  z-index:40;
  display:flex;
  flex-direction:column;
  background:var(--panel);
  border-inline-end:1px solid var(--line);
  overflow-y:auto;
  overscroll-behavior:contain;
  padding-block-end:20px;
  visibility:visible;
  transition:transform .26s ease,visibility .26s ease;
  scrollbar-width:thin;
  scrollbar-color:var(--line) transparent;
}
.side::-webkit-scrollbar{width:8px}
.side::-webkit-scrollbar-track{background:transparent}
.side::-webkit-scrollbar-thumb{background:var(--line);border-radius:999px}
.side-h{
  flex:0 0 auto;
  padding-block:20px 12px;
  padding-inline:62px 18px;
  border-block-end:1px solid var(--line);
  color:var(--dim);
  font-size:.78rem;
  font-weight:650;
  line-height:1.6;
  display:flex;
  align-items:center;
  gap:8px;
}
.side-h .side-t{flex:1 1 auto}
.side-h .side-c{
  flex:0 0 auto;
  padding:1px 7px;
  border:1px solid var(--line);
  border-radius:999px;
  background:var(--panel2);
  font-family:Consolas,monospace;
  font-size:.72rem;
  font-weight:600;
}
.side .t{display:inline}
.side-l{
  list-style:none;
  margin:0;
  padding:10px 10px 0;
  display:flex;
  flex-direction:column;
  gap:2px;
}
.side .si{margin:0}
.side .sl{
  position:relative;
  display:block;
  padding:9px 12px;
  border-radius:8px;
  color:var(--dim);
  font-size:.88rem;
  line-height:1.7;
  text-decoration:none;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  transition:background .15s ease,color .15s ease;
}
.side .sl:hover{color:var(--fg);background:var(--panel2);text-decoration:none}
.side .sl:focus-visible{outline:2px solid var(--acc);outline-offset:-2px}
.side .sl.on{
  color:var(--acc);
  background:rgba(76,154,255,.10);
  font-weight:650;
}
.side .sl.on::before{
  content:"";
  position:absolute;
  inset-block:6px;
  inset-inline-start:0;
  width:3px;
  border-radius:999px;
  background:var(--acc);
}
.side .n{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:1.55rem;
  height:1.55rem;
  padding-inline:5px;
  margin-inline-end:8px;
  border:1px solid var(--line);
  border-radius:7px;
  background:var(--panel2);
  color:var(--dim);
  font-family:var(--mono);
  font-size:.72rem;
  line-height:1;
  vertical-align:-4px;
  unicode-bidi:embed;
}
.side .sl.on .n{
  color:var(--acc);
  border-color:rgba(76,154,255,.35);
  background:rgba(76,154,255,.10);
}
.side .n:empty{display:none}
.side .sl.home .n{display:none}
.side.hid{transform:translateX(-100%);visibility:hidden}
[dir="rtl"] .side.hid{transform:translateX(100%);visibility:hidden}
.side-btn{
  position:fixed;
  inset-block-start:14px;
  inset-inline-start:14px;
  z-index:60;
  width:34px;
  height:34px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:0;
  border:1px solid var(--line);
  border-radius:10px;
  background:var(--panel2);
  color:var(--dim);
  font-size:1rem;
  line-height:1;
  text-decoration:none;
  cursor:pointer;
  transition:background .15s ease,border-color .15s ease,color .15s ease;
}
.side-btn:hover{
  color:var(--acc);
  background:var(--panel);
  border-color:rgba(76,154,255,.45);
  text-decoration:none;
}
.side-btn:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
@media (min-width:901px){
  .wrap{max-width:1344px;padding-inline-start:284px}
}
@media (max-width:900px){
  .wrap{padding-inline-start:0}
  .side{
    width:min(86vw,300px);
    transform:translateX(-100%);
    visibility:hidden;
    box-shadow:0 14px 44px rgba(0,0,0,.55);
  }
  [dir="rtl"] .side{transform:translateX(100%)}
  .side:not(.hid){transform:translateX(0);visibility:visible}
  .sidebg{
    position:fixed;
    inset:0;
    z-index:35;
    background:rgba(4,7,13,.62);
    opacity:0;
    visibility:hidden;
    transition:opacity .24s ease,visibility .24s ease;
  }
  .sidebg.on{opacity:1;visibility:visible}
  body.sideopen{overflow:hidden}
  body.sideopen::after{
    content:"";
    position:fixed;
    inset:0;
    z-index:35;
    background:rgba(4,7,13,.62);
  }
}
@media (max-width:760px){
  .wrap{padding:18px 14px 48px}
  header{padding:18px 16px;gap:12px}
  h1{font-size:1.35rem}
  .grid,.docs{grid-template-columns:1fr}
  .flow{flex-direction:column;align-items:stretch}
  .fi+.fi::before{content:"\\2193";align-self:flex-start;order:-1;margin:0 0 0 14px}
  .barrow{flex-direction:column;align-items:stretch;gap:4px}
  .barrow .bl{min-width:0}
  .steps > li{padding-inline-start:2.6rem}
}
`;