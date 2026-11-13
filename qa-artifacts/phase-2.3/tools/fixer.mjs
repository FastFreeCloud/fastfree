import fs from 'node:fs';

const p = 'C:/Users/FastFree/Desktop/fastfree/qa-artifacts/phase-2.3/tools/audit.mjs';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');
const out = [];
let changed = 0;
for (const ln of lines) {
  if (ln.includes('const noBlur = glassPanels.filter')) {
    out.push("    const noBlur = glassPanels.filter((g) => !(g.backdropFilter || '').includes('blur('));");
    changed++;
  } else if (ln.includes('const alpha = (bc.match(')) {
    changed++; // drop unused line
  } else {
    out.push(ln);
  }
}
fs.writeFileSync(p, out.join('\n'), 'utf8');
console.log('changed lines:', changed);
console.log('node --check:');
