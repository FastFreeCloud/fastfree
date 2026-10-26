/**
 * Builds a preview of every application poster.
 *
 * The result is a contact sheet and the individual posters, so the set can be
 * reviewed in one look before it is published.
 *
 *   node scripts/preview.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPS } from '../src/brand.js';
import { buildPosterSvg } from '../src/poster.js';
import { renderJpeg } from '../src/render.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'preview');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

/**
 * The copy for each application, written in Egyptian Arabic the way the
 * brand voice asks for: short, direct, no hype.
 */
const POSTS = {
  pos: {
    title: 'FastFree POS',
    eyebrow: 'نظام الكاشير',
    body: 'كاشير سريع وفواتير لحظية ومخزون أول بأول',
    cta: 'جرّبه الآن مجاناً',
  },
  erp: {
    title: 'FastFree ERP',
    eyebrow: 'للشركات',
    body: 'منظومة مؤسسية كاملة لإدارة سلسلة الإمداد والتصنيع',
    cta: 'ابدأ الآن',
  },
  ledger: {
    title: 'FastFree Ledger',
    eyebrow: 'المحاسبة',
    body: 'قيود مزدوجة وتقارير مالية وتتبع للمبيعات',
    cta: 'جرّبه مجاناً',
  },
  panel: {
    title: 'FastFree Panel',
    eyebrow: 'البنية السحابية',
    body: 'إدارة خوادم كلان ومراقبة لحظية لكل عقدة',
    cta: 'ابدأ الآن',
  },
  hr: {
    title: 'FastFree HR',
    eyebrow: 'الموارد البشرية',
    body: 'ملفات الموظفين والرواتب والحضور والإجازات',
    cta: 'ابدأ الآن',
  },
  website: {
    title: 'FastFree Website',
    eyebrow: 'بوابتك السحابية',
    body: 'الموقع الرسمي والتطبيقات المؤسسية في مكان واحد',
    cta: 'زُر الموقع',
  },
};

const FONT_BOLD = 'C:/Windows/Fonts/segoeuib.ttf';

for (const [appKey, post] of Object.entries(POSTS)) {
  const app = APPS.find((candidate) => candidate.key === appKey);

  for (const ratio of ['1.91:1', '1:1']) {
    const svg = buildPosterSvg({
      app: appKey,
      title: post.title,
      subtitle: post.eyebrow,
      body: post.body,
      ctaText: post.cta,
      ctaUrl: app.url,
      ratio,
      features: 3,
    });
    fs.writeFileSync(
      path.join(outDir, `${appKey}-${ratio.replace(':', 'x')}.jpg`),
      renderJpeg(svg, { quality: 92 }),
    );
  }
}

// ── The contact sheet ───────────────────────────────────────────────────────

const ROW = 460;
const GAP = 22;
const LABEL = 150;
const WIDE = 620;
const SQUARE = 400;
const MARGIN = 34;

const keys = Object.keys(POSTS);
const sheetWidth = MARGIN + LABEL + WIDE + GAP + SQUARE + MARGIN;
const sheetHeight = MARGIN + keys.length * ROW + (keys.length - 1) * GAP + MARGIN;

const composites = [];

for (const [rowIndex, appKey] of keys.entries()) {
  const app = APPS.find((candidate) => candidate.key === appKey);
  const top = MARGIN + rowIndex * (ROW + GAP);

  const wide = await sharp(path.join(outDir, `${appKey}-1.91x1.jpg`))
    .resize(WIDE, ROW, { fit: 'contain', background: { r: 22, g: 22, b: 28 } })
    .toBuffer();
  composites.push({ input: wide, left: MARGIN + LABEL, top });

  const square = await sharp(path.join(outDir, `${appKey}-1x1.jpg`))
    .resize(SQUARE, ROW, { fit: 'contain', background: { r: 22, g: 22, b: 28 } })
    .toBuffer();
  composites.push({ input: square, left: MARGIN + LABEL + WIDE + GAP, top });

  // The label marks which application the row belongs to.
  const label = await sharp({
    text: {
      text: app.name,
      fontfile: FONT_BOLD,
      width: LABEL - 20,
      height: 60,
      rgba: false,
    },
    background: { r: 22, g: 22, b: 28 },
  })
    .png()
    .toBuffer();
  composites.push({ input: label, left: MARGIN, top: top + Math.round(ROW / 2) - 30 });
}

const sheet = await sharp({
  create: { width: sheetWidth, height: sheetHeight, channels: 3, background: { r: 14, g: 14, b: 19 } },
})
  .composite(composites)
  .jpeg({ quality: 92 })
  .toBuffer();

fs.writeFileSync(path.join(outDir, 'contact-sheet.jpg'), sheet);
console.log(`preview written to ${outDir}`);
console.log(`${keys.length} applications, ${keys.length * 2} posters`);
