/** List every phase-2.3 text sample that failed WCAG AA, grouped by theme. */
import fs from 'node:fs';

const r = JSON.parse(fs.readFileSync(new URL('../../phase-2.3/reports/audit-report.json', import.meta.url), 'utf8'));

for (const theme of ['dark', 'light', 'oled-black']) {
  const rows = [];
  for (const res of r.results || []) {
    if (res.theme !== theme) continue;
    for (const s of res.metrics?.textSamples || []) {
      if (s.passesAA === false) {
        rows.push({ step: res.step, contrast: s.contrast, color: s.color, bg: s.bg, text: (s.text || '').slice(0, 46) });
      }
    }
  }
  rows.sort((a, b) => a.contrast - b.contrast);
  console.log(`\n===== ${theme}: ${rows.length} failing samples =====`);
  const seen = new Set();
  for (const row of rows) {
    const key = row.color + '|' + row.bg + '|' + row.text;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  ${String(row.contrast).padStart(5)}  ${row.color} on ${row.bg}  "${row.text}"  (step ${row.step})`);
    if (seen.size >= 22) break;
  }
}
