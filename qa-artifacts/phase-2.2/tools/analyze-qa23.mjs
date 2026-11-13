/** Summarize phase-2.3 audit findings: contrast failures by theme + worst offenders. */
import fs from 'node:fs';

const r = JSON.parse(fs.readFileSync(new URL('../../phase-2.3/reports/audit-report.json', import.meta.url), 'utf8'));

const byTheme = {};
const byCategory = {};
const worst = [];
const unresolved = new Set();

for (const res of r.results || []) {
  const theme = res.theme;
  for (const issue of res.issues || []) {
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    if (issue.category === 'contrast') {
      byTheme[theme] = (byTheme[theme] || 0) + 1;
      const m = String(issue.detail || '').match(/worst ([\d.]+)/);
      const t = String(issue.detail || '').match(/"([^"]{0,70})/);
      if (m) worst.push({ theme, step: res.step, contrast: Number(m[1]), text: t ? t[1] : '' });
    }
  }
  for (const s of res.metrics?.textSamples || []) {
    if (s.text && s.text.indexOf('{{') !== -1) unresolved.add(s.text.slice(0, 60));
  }
}

console.log('issues by category:', JSON.stringify(byCategory));
console.log('contrast by theme:', JSON.stringify(byTheme));
console.log('unresolved interpolation samples:', [...unresolved].slice(0, 10));

worst.sort((a, b) => a.contrast - b.contrast);
const seen = new Set();
console.log('\nworst unique contrast offenders:');
for (const w of worst) {
  const key = w.colors + '|' + w.text;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  ${w.contrast}  ${w.colors}  "${w.text}"  [${w.theme} step${w.step}]`);
  if (seen.size >= 18) break;
}
