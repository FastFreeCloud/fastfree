import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync('C:/Users/FastFree/Desktop/fastfree/qa-artifacts/phase-2.3/reports/audit-report.json', 'utf8'));

console.log('=== LIGHT THEME step1 (1024x768) glass ===');
const l = report.results.find(r => r.resolution === '1024x768' && r.theme === 'light' && r.step === 1);
for (const g of l.metrics.glass.slice(0, 8)) console.log('  ', g.selector, '| blur:', g.backdropFilter, '| bg:', g.backgroundColor, '| border:', g.borderColor, g.borderWidth);
console.log('text samples with contrast <= 2:');
for (const t of l.metrics.textSamples.filter(t => t.contrast <= 2)) console.log('  ', t.contrast, t.color, '|', JSON.stringify(t.text));

console.log('\n=== SCROLL METRICS FOR FLAGGED STEPS ===');
for (const r of report.results) {
  if (![3, 5, 6].includes(r.step)) continue;
  const m = r.metrics;
  console.log(`${r.resolution} ${r.theme} step${r.step}: inner ${m.innerW}x${m.innerH}, scroll ${m.scrollW}x${m.scrollH}, hOverflow ${m.horizontalOverflow}, overflowingCount ${m.overflowing.length}, overlaps ${m.overlaps.length}`);
}

console.log('\n=== DARK vs LIGHT glass (step1 1280x800) ===');
for (const theme of ['dark', 'light', 'oled-black']) {
  const e = report.results.find(r => r.resolution === '1280x800' && r.theme === theme && r.step === 1);
  const wrap = e.metrics.glass.find(g => g.selector === '.sdui-screen-wrapper');
  const card = e.metrics.glass.find(g => g.selector === '.q-card');
  console.log(theme, '| wrapper bg:', wrap?.backgroundColor, 'blur:', wrap?.backdropFilter, '| card bg:', card?.backgroundColor, 'blur:', card?.backdropFilter);
  const worst = [...e.metrics.textSamples].sort((a, b) => a.contrast - b.contrast)[0];
  console.log('   worst text:', worst?.contrast, worst?.color, JSON.stringify(worst?.text));
}
