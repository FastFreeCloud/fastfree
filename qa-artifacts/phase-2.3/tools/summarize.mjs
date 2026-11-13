import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync('C:/Users/FastFree/Desktop/fastfree/qa-artifacts/phase-2.3/reports/audit-report.json', 'utf8'));

console.log('=== META ===');
console.log(JSON.stringify(report.meta.matrix));
console.log('app:', JSON.stringify(report.meta.app));
console.log('windows:', JSON.stringify(report.meta.windows));

console.log('\n=== SAMPLE ENTRY (1024x768 dark step1) ===');
const e = report.results.find(r => r.resolution === '1024x768' && r.theme === 'dark' && r.step === 1);
console.log('window:', JSON.stringify(e.window));
console.log('screenshotDims:', JSON.stringify(e.screenshotDimensions));
console.log('metrics dims:', e.metrics.innerW, e.metrics.innerH, 'dpr', e.metrics.dpr, 'scrollW', e.metrics.scrollW, 'scrollH', e.metrics.scrollH, 'hOverflow', e.metrics.horizontalOverflow);
console.log('glass:');
for (const g of e.metrics.glass.slice(0, 8)) console.log('  ', g.selector, '| blur:', g.backdropFilter, '| bg:', g.backgroundColor, '| border:', g.borderColor, g.borderWidth);
console.log('textSamples (worst 8):');
const sorted = [...e.metrics.textSamples].sort((a, b) => a.contrast - b.contrast);
for (const t of sorted.slice(0, 8)) console.log('  ', t.contrast, 'large=' + t.large, '|', t.color, '|', JSON.stringify(t.text));
console.log('overflowing:', JSON.stringify(e.metrics.overflowing.slice(0, 5)));
console.log('overlaps:', JSON.stringify(e.metrics.overlaps.slice(0, 5)));
console.log('issues:', JSON.stringify(e.issues, null, 1));

console.log('\n=== CLIPPING FLAGED ENTRIES ===');
for (const r of report.results) {
  const clip = (r.issues || []).find(i => i.category === 'clipping');
  if (clip) console.log(`${r.resolution} ${r.theme} step${r.step}: ${clip.detail.slice(0, 200)}`);
}

console.log('\n=== CONTRAST DISTRIBUTION ===');
const all = [];
for (const r of report.results) for (const t of (r.metrics?.textSamples || [])) all.push({ ...t, res: r.resolution, theme: r.theme, step: r.step });
all.sort((a, b) => a.contrast - b.contrast);
console.log('count:', all.length, 'min:', all[0]?.contrast, 'max:', all[all.length - 1]?.contrast);
console.log('worst 15:');
for (const t of all.slice(0, 15)) console.log('  ', t.contrast, t.theme, 'step' + t.step, t.color, '|', JSON.stringify(t.text));
console.log('pass rate AA:', (all.filter(t => t.passesAA).length / all.length * 100).toFixed(1) + '%');
