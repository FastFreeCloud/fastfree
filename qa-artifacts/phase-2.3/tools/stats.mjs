import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync('C:/Users/FastFree/Desktop/fastfree/qa-artifacts/phase-2.3/reports/audit-report.json', 'utf8'));

const stats = { themes: {}, clippingMatrix: {}, worstOverall: [] };
for (const theme of ['dark', 'light', 'oled-black']) {
  const rows = report.results.filter(r => r.theme === theme);
  const all = rows.flatMap(r => r.metrics?.textSamples || []);
  const failing = all.filter(t => !t.passesAA);
  stats.themes[theme] = {
    checkpoints: rows.length,
    checkpointsWithContrastFailures: rows.filter(r => (r.metrics?.textSamples || []).some(t => !t.passesAA)).length,
    textSamples: all.length,
    failingSamples: failing.length,
    minContrast: failing.length ? Math.min(...failing.map(t => t.contrast)) : null,
    worstSample: failing.slice().sort((a, b) => a.contrast - b.contrast)[0] || null,
  };
}
for (const step of [1, 2, 3, 4, 5, 6]) {
  stats.clippingMatrix[step] = {};
  for (const res of ['1024x768', '1280x800', '1920x1080']) {
    const rows = report.results.filter(r => r.step === step && r.resolution === res);
    const clipped = rows.filter(r => (r.metrics?.overflowing || []).some(o => o.vertical)).length;
    const maxBottom = Math.max(...rows.map(r => r.metrics?.maxContentBottom || 0));
    stats.clippingMatrix[step][res] = { clippedCheckpoints: clipped, of: rows.length, maxContentBottom: maxBottom };
  }
}
const allFailing = report.results.flatMap(r => (r.metrics?.textSamples || []).filter(t => !t.passesAA).map(t => ({ ...t, theme: r.theme, step: r.step, resolution: r.resolution })));
stats.worstOverall = allFailing.sort((a, b) => a.contrast - b.contrast).slice(0, 12);
stats.totalTextSamples = report.results.reduce((a, r) => a + (r.metrics?.textSamples?.length || 0), 0);
stats.totalFailingSamples = allFailing.length;
stats.overlapCount = report.results.reduce((a, r) => a + (r.metrics?.overlaps?.length || 0), 0);
stats.glassBlurPass = report.results.every(r => (r.metrics?.glass || []).filter(g => ['.sdui-screen-wrapper', '.q-card', '.q-banner'].includes(g.selector)).every(g => (g.backdropFilter || '').includes('blur(')));

fs.writeFileSync('C:/Users/FastFree/Desktop/fastfree/qa-artifacts/phase-2.3/reports/stats.json', JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats, null, 2));
