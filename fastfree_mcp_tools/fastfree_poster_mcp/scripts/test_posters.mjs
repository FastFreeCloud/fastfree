/**
 * Automated checks for the poster generator.
 *
 * The checks are about the things that would otherwise fail silently: a
 * missing Arabic font, a broken logo embed, a contact strip that was
 * dropped, or a JPEG that is not actually a JPEG.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP_KEYS, APPS, RATIOS, SCREENS, getApp } from '../src/brand.js';
import { buildPosterSvg, catalogue } from '../src/poster.js';
import { screensCatalogue } from '../src/handlers.js';
import { availableFontFiles, checkFonts, renderJpeg, renderPng } from '../src/render.js';
import { splitByScript, wrapText } from '../src/utils.js';

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`${status}  ${label}${detail ? ` - ${detail}` : ''}`);
  if (!condition) failures += 1;
}

const TITLE = 'نظام نقاط البيع fastfree';
const CTA = 'ابدأ الآن مجاناً';
const URL = 'https://pos.fastfree.cloud';

// ─── Fonts ──────────────────────────────────────────────────────────────────

const fonts = checkFonts();
check('an Arabic capable font is available', fonts.ok, fonts.reason || `${fonts.files.length} files`);

for (const required of ['tahoma.ttf', 'segoeui.ttf']) {
  check(
    `${required} is present`,
    availableFontFiles().some((file) => file.endsWith(required)),
  );
}

// ─── Text helpers ───────────────────────────────────────────────────────────

const chunks = splitByScript('نظام fastfree البيع');
check('script splitting separates Arabic from Latin', chunks.length === 3, JSON.stringify(chunks.map((c) => c.text)));

const wrapped = wrapText('نظام نقاط البيع fastfree لإدارة محلاتك بسرعة', 300, 40);
check('text wraps into more than one line', wrapped.length > 1, `${wrapped.length} lines`);
check('no wrapped line is empty', wrapped.every((line) => line.trim().length > 0));

// ─── SVG structure ──────────────────────────────────────────────────────────

for (const appKey of APP_KEYS) {
  const svg = buildPosterSvg({
    app: appKey,
    title: TITLE,
    subtitle: 'FastFree',
    ctaText: CTA,
    ctaUrl: URL,
    ratio: '1:1',
  });

  check(`${appKey}: is an svg document`, svg.startsWith('<svg') && svg.endsWith('</svg>'));
  check(`${appKey}: declares its size`, svg.includes('width="1080"') && svg.includes('height="1080"'));
  check(`${appKey}: carries the headline`, svg.includes('نظام'));
  check(`${appKey}: carries the call to action`, svg.includes('ابدأ'));
  check(`${appKey}: carries the link`, svg.includes(URL));
  check(`${appKey}: marks Arabic as right to left`, svg.includes('direction="rtl"'));
  check(`${appKey}: embeds the logo`, svg.includes('ff-') && svg.includes('<g transform='));
  check(`${appKey}: has the contact strip`, svg.includes('واتساب') && svg.includes('sales@fastfree.cloud'));
  check(`${appKey}: uses its brand colour`, svg.includes(getApp(appKey).colors.primary));
  check(`${appKey}: escapes the ampersand`, !svg.match(/&(?!amp;|lt;|gt;|quot;|apos;|#)/));
}

// ─── Ratios ─────────────────────────────────────────────────────────────────

for (const [ratio, size] of Object.entries(RATIOS)) {
  const svg = buildPosterSvg({ app: 'pos', title: TITLE, ratio });
  check(
    `ratio ${ratio} produces ${size.width}x${size.height}`,
    svg.includes(`width="${size.width}"`) && svg.includes(`height="${size.height}"`),
  );
}

// ─── Options ────────────────────────────────────────────────────────────────

const noLogo = buildPosterSvg({ app: 'pos', title: TITLE, ratio: '1:1', logo: false });
check('logo can be turned off', !noLogo.includes('ff-'));

const noContact = buildPosterSvg({ app: 'pos', title: TITLE, ratio: '1:1', contact: false });
check('contact strip can be turned off', !noContact.includes('sales@fastfree.cloud'));

// ─── Errors ─────────────────────────────────────────────────────────────────

let threw = false;
try {
  buildPosterSvg({ app: 'nope', title: TITLE });
} catch {
  threw = true;
}
check('an unknown app is rejected', threw);

threw = false;
try {
  buildPosterSvg({ app: 'pos', title: '   ' });
} catch {
  threw = true;
}
check('a blank title is rejected', threw);

threw = false;
try {
  buildPosterSvg({ app: 'pos', title: TITLE, ratio: '5:5' });
} catch {
  threw = true;
}
check('an unknown ratio is rejected', threw);

// ─── Rendering ──────────────────────────────────────────────────────────────

const svg = buildPosterSvg({
  app: 'pos', title: TITLE, subtitle: 'FastFree', ctaText: CTA, ctaUrl: URL, ratio: '1:1',
});

const png = renderPng(svg);
check('renders a png', png.length > 1000, `${png.length} bytes`);
check('png has the right signature', png.slice(1, 4).toString('ascii') === 'PNG');

const jpg = renderJpeg(svg);
check('renders a jpeg', jpg.length > 1000, `${jpg.length} bytes`);
check('jpeg has the right magic bytes', jpg.slice(0, 3).toString('hex') === 'ffd8ff');
check('jpeg ends correctly', jpg.slice(-2).toString('hex') === 'ffd9');

// The poster is mostly brand colour, so a nearly empty render would mean
// the background or the text failed to draw.
const { data, info } = await import('@resvg/resvg-js').then(async (m) => {
  const { Resvg } = m;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: false, fontFiles: availableFontFiles(), defaultFontFamily: 'Tahoma' },
  });
  const image = resvg.render();
  return image.pixels ? { data: Buffer.from(image.pixels), info: { width: image.width, height: image.height } } : { data: null, info: null };
});

let lit = 0;
for (let i = 0; i < data.length; i += 4) {
  if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) lit += 1;
}
check('the poster renders visible text', lit > 2000, `${lit} white pixels`);

// ─── Layout: nothing may overlap ────────────────────────────────────────────

/**
 * Read the vertical extent of every text element and pill in the SVG.
 *
 * Overlapping text is the failure that a pixel check cannot see: the words
 * are all there, but they sit on top of each other and the poster is
 * unreadable.
 */
function readTextBoxes(svg) {
  const boxes = [];

  for (const match of svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"[^>]*font-size="([\d.]+)"[^>]*>([^<]*)<\/text>/g)) {
    const [, x, y, size, text] = match;
    boxes.push({
      kind: 'text',
      x: Number(x),
      y: Number(y),
      size: Number(size),
      text: text.trim(),
      top: Number(y) - Number(size) * 0.8,
      bottom: Number(y) + Number(size) * 0.25,
    });
  }

  for (const match of svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)" fill="url\(#cta\)"/g)) {
    const [, x, y, width, height] = match;
    boxes.push({
      kind: 'cta',
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height),
      text: 'CTA button',
      top: Number(y),
      bottom: Number(y) + Number(height),
    });
  }

  return boxes;
}

for (const appKey of APP_KEYS) {
  const layoutSvg = buildPosterSvg({
    app: appKey,
    title: TITLE,
    subtitle: 'FastFree',
    ctaText: CTA,
    ctaUrl: URL,
    ratio: '1:1',
  });

  const boxes = readTextBoxes(layoutSvg);
  let overlaps = 0;
  const offenders = [];

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      // Only the right hand column can collide; the contact strip is a
      // separate band below the headline.
      if (a.bottom <= b.top || b.bottom <= a.top) continue;
      if (Math.abs(a.x - b.x) > a.size + b.size) continue;
      // A label sitting inside its own button is the design, not a clash.
      const insideButton = (text, button) => text.kind === 'text'
        && button.kind === 'cta'
        && text.x >= button.x
        && text.x <= button.x + button.width
        && text.top >= button.top
        && text.bottom <= button.bottom;
      if (insideButton(a, b) || insideButton(b, a)) continue;
      overlaps += 1;
      if (offenders.length < 3) {
        offenders.push(`"${a.text}" x "${b.text}"`);
      }
    }
  }

  check(`${appKey}: no overlapping text`, overlaps === 0, offenders.join('; '));
}

// Every text element has to sit inside the canvas.
for (const appKey of APP_KEYS) {
  const layoutSvg = buildPosterSvg({ app: appKey, title: TITLE, ctaText: CTA, ratio: '1:1' });
  const outside = readTextBoxes(layoutSvg).filter((box) => box.bottom > 1080 || box.x < 0);
  check(`${appKey}: all text stays on the canvas`, outside.length === 0, `${outside.length} outside`);
}

// ─── Screen catalogue ────────────────────────────────────────────────────────

check('the catalogue has screens', SCREENS.length > 40, `${SCREENS.length} screens`);

const screenKeys = new Set(SCREENS.map((screen) => screen.key));
check('screen keys are unique', screenKeys.size === SCREENS.length);

const screensWithoutLabel = SCREENS.filter((screen) => !screen.labelAr && !screen.labelEn);
check('every screen has a label', screensWithoutLabel.length === 0, screensWithoutLabel.map((s) => s.key).join(', '));

const screensWithoutComponent = SCREENS.filter((screen) => !screen.component);
check('every screen has a component', screensWithoutComponent.length === 0, screensWithoutComponent.map((s) => s.key).join(', '));

// The screen keys must be real, so the code and the catalogue agree.
const catalogueResult = screensCatalogue();
check('the screen catalogue builds', catalogueResult.ok === true);
check('the catalogue counts every screen', catalogueResult.count === SCREENS.length, `${catalogueResult.count}`);
check('the catalogue is grouped by package', catalogueResult.packages.length > 0);

// A screen poster must use the screen label as the headline.
const salesInvoice = SCREENS.find((screen) => screen.key === 'sales-invoices');
check('the sales invoice screen exists', Boolean(salesInvoice));

if (salesInvoice) {
  const screenSvg = buildPosterSvg({
    app: 'pos',
    title: salesInvoice.labelAr,
    subtitle: getApp('pos').nameAr,
    body: getApp('pos').taglineAr,
    ratio: '1:1',
  });
  check('a screen poster carries the screen label', screenSvg.includes(salesInvoice.labelAr));
  check('a screen poster carries the app name', screenSvg.includes(getApp('pos').nameAr));
}

// A body line must override the app tagline.
const withBody = buildPosterSvg({
  app: 'pos', title: 'عنوان', body: 'سطر توضيحي خاص', ratio: '1:1',
});
check('a custom body line is used', withBody.includes('سطر توضيحي خاص'));
check('the app tagline is not used when a body is given', !withBody.includes(getApp('pos').taglineAr));

// ─── Catalogue ──────────────────────────────────────────────────────────────

const cat = catalogue();
check('catalogue lists every app', cat.apps.length === APP_KEYS.length);
check('catalogue lists every ratio', cat.ratios.length === Object.keys(RATIOS).length);
check('catalogue exposes the contact details', cat.contact.phone === '+201091999937');

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} of ${checks} CHECKS FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
