import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync('C:/Users/FastFree/Desktop/fastfree/qa-artifacts/phase-2.3/reports/audit-report.json', 'utf8'));

console.log('=== WORST CONTRAST PER THEME (1280x800 step1) ===');
for (const theme of ['dark', 'light', 'oled-black']) {
  const e = report.results.find(r => r.resolution === '1280x800' && r.theme === theme && r.step === 1);
  const m = e.metrics;
  console.log('\n-- ' + theme + ' -- textSamples: ' + m.textSamples.length + ', failing: ' + m.textSamples.filter(t => !t.passesAA).length);
  const failing = m.textSamples.filter(t => !t.passesAA).sort((a, b) => a.contrast - b.contrast);
  for (const t of failing.slice(0, 10)) {
    console.log('   ' + t.contrast + ' | ' + t.color + ' on ' + t.bg + ' | ' + t.fontSize + '/' + t.fontWeight + ' | rect ' + JSON.stringify(t.rect) + ' | ' + JSON.stringify(t.text));
  }
}

console.log('\n=== CLIPPING DETAIL (1024x768 dark) ===');
for (const step of [3, 5, 6]) {
  const e = report.results.find(r => r.resolution === '1024x768' && r.theme === 'dark' && r.step === step);
  const m = e.metrics;
  console.log('step ' + step + ': innerH ' + m.innerH + ', maxBottom ' + m.maxContentBottom + ', scrollH ' + m.scrollH + ', cwOverflow ' + m.contentWrapperOverflow + ', overflowing ' + m.overflowing.length);
  for (const o of m.overflowing.slice(0, 4)) console.log('   ', o.tag + '.' + o.cls, JSON.stringify(o.rect), 'h=' + o.horizontal, 'v=' + o.vertical);
}

console.log('\n=== GLASSMORPHISM (1280x800 dark step1) ===');
const g = report.results.find(r => r.resolution === '1280x800' && r.theme === 'dark' && r.step === 1).metrics.glass;
for (const x of g.slice(0, 8)) console.log('   ', x.selector, '| blur:', x.backdropFilter, '| bg:', x.backgroundColor, '| border:', x.borderColor, x.borderWidth, x.borderStyle);

console.log('\n=== DIMENSIONS / DPR (all resolutions, dark step1) ===');
for (const res of ['1024x768', '1280x800', '1920x1080']) {
  const e = report.results.find(r => r.resolution === res && r.theme === 'dark' && r.step === 1);
  console.log('   ', res, 'requested', e.requested.width + 'x' + e.requested.height, '| inner', e.metrics.innerW + 'x' + e.metrics.innerH, '| outer', e.metrics.outerW + 'x' + e.metrics.outerH, '| dpr', e.metrics.dpr, '| screen', e.metrics.screenW + 'x' + e.metrics.screenH, '| screenshot', JSON.stringify(e.screenshotDimensions));
}
