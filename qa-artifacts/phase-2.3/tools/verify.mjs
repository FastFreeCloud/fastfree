import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync('C:/Users/FastFree/Desktop/fastfree/qa-artifacts/phase-2.3/reports/audit-report.json', 'utf8'));
console.log('=== get_window_info (manage_window action=info) per resolution ===');
for (const res of ['1024x768', '1280x800', '1920x1080']) {
  const e = report.results.find(r => r.resolution === res && r.theme === 'dark' && r.step === 1);
  console.log(res, '->', JSON.stringify(e.window), '| screenshot', JSON.stringify(e.screenshotDimensions));
}
console.log('\n=== entry.window null count ===');
console.log('null:', report.results.filter(r => !r.window).length, '/', report.results.length);
console.log('\n=== light theme glass panels (1280x800 step1) ===');
const l = report.results.find(r => r.resolution === '1280x800' && r.theme === 'light' && r.step === 1);
for (const g of l.metrics.glass.slice(0, 6)) console.log('  ', g.selector, '| blur:', g.backdropFilter, '| bg:', g.backgroundColor, '| border:', g.borderColor, g.borderWidth);
console.log('\n=== unrendered template placeholders found ===');
const placeholders = new Set();
for (const r of report.results) {
  for (const t of (r.metrics?.textSamples || [])) {
    if (t.text.includes('{{') || t.text.includes('}}')) placeholders.add(t.text.slice(0, 60));
  }
}
for (const p of placeholders) console.log('  ', JSON.stringify(p));
