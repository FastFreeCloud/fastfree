/**
 * Builds the poster SVG.
 *
 * The layout is a single composition in the brand's dark palette: a deep
 * brand field with a radial glow, the logo in the top corner, a right
 * aligned Arabic headline block on the right, and a contact strip along the
 * bottom.
 *
 * Everything is drawn as vectors and live text, so the exported SVG stays
 * sharp at any size and the Arabic remains selectable and editable.
 */
import { APPS, CONTACT, RATIOS, getApp, getRatio } from './brand.js';
import { FONTS, circle, line, pill, rect, rtlText, sparkle } from './svg.js';
import { buildLogoMarkup } from './logo.js';
import { escapeXml, estimateWidth, num, wrapText } from './utils.js';

/**
 * The decorative field behind the content: a brand gradient, two glows, a
 * faint grid and a scatter of accent marks.
 */
function buildBackground(app, width, height) {
  const gridStep = 64;
  const grid = [];
  for (let x = 0; x <= width; x += gridStep) {
    grid.push(line({ x1: x, y1: 0, x2: x, y2: height, stroke: app.colors.accent, strokeWidth: 1, opacity: 0.05 }));
  }
  for (let y = 0; y <= height; y += gridStep) {
    grid.push(line({ x1: 0, y1: y, x2: width, y2: y, stroke: app.colors.accent, strokeWidth: 1, opacity: 0.05 }));
  }

  // Marks are placed on a fixed lattice derived from their index, so the
  // same poster always produces the same decoration.
  const marks = [];
  const columns = 7;
  const rows = 5;
  for (let i = 0; i < columns * rows; i += 1) {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const cx = ((column + 0.5) / columns) * width;
    const cy = ((row + 0.5) / rows) * height;
    if (i % 3 === 0) {
      marks.push(sparkle({ cx, cy, size: 18, fill: app.colors.accent, opacity: 0.22 }));
    } else {
      marks.push(circle({ cx, cy, r: 5 + (i % 4) * 3, fill: 'none', stroke: app.colors.accent, strokeWidth: 2, opacity: 0.16 }));
    }
  }

  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${app.colors.deep}"/>
      <stop offset="55%" stop-color="${app.colors.secondary}"/>
      <stop offset="100%" stop-color="${app.colors.deep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="45%" r="60%">
      <stop offset="0" stop-color="${app.colors.primary}" stop-opacity="0.5"/>
      <stop offset="60%" stop-color="${app.colors.primary}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${app.colors.primary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="90%" cy="8%" r="45%">
      <stop offset="0" stop-color="${app.colors.accent}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${app.colors.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${app.colors.primary}"/>
      <stop offset="100%" stop-color="${app.colors.secondary}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <rect width="${width}" height="${height}" fill="url(#glow2)"/>
  <g>${grid.join('')}</g>
  <g>${marks.join('')}</g>`;
}

/**
 * The contact strip along the bottom edge.
 */
function buildContactBar(app, width, top, height) {
  const items = [
    { label: 'واتساب', value: CONTACT.whatsapp },
    { label: 'هاتف', value: CONTACT.phone },
    { label: 'إيميل', value: CONTACT.email },
    { label: 'الموقع', value: CONTACT.website },
  ];

  const padding = Math.round(width * 0.045);
  const slot = (width - padding * 2) / items.length;
  const valueSize = Math.max(15, Math.round(width * 0.0155));
  const labelSize = Math.max(12, Math.round(width * 0.0125));

  // The items are laid out right to left, so the first one sits on the right.
  const cells = items.map((item, index) => {
    const center = width - padding - index * slot - slot / 2;
    return `<g>
      <text x="${num(center)}" y="${num(top + height * 0.36)}" font-family="${FONTS.arabic}" font-size="${labelSize}" fill="${app.colors.accent}" text-anchor="middle" direction="rtl">${escapeXml(item.label)}</text>
      <text x="${num(center)}" y="${num(top + height * 0.72)}" font-family="${FONTS.latin}" font-size="${valueSize}" font-weight="600" fill="#FFFFFF" text-anchor="middle">${escapeXml(item.value)}</text>
    </g>`;
  });

  return `<g>
    ${rect({ x: 0, y: top, width, height, fill: '#030712', opacity: 0.78 })}
    ${line({ x1: 0, y1: top, x2: width, y2: top, stroke: app.colors.primary, strokeWidth: 3 })}
    ${cells.join('')}
  </g>`;
}

/**
 * The headline block: eyebrow pill, title, accent rule, tagline, call to
 * action and link.
 */
function buildHeadline(app, {
  title, subtitle, body, ctaText, ctaUrl, width, height, ratio,
}) {
  const padding = Math.round(width * 0.05);
  const right = width - padding;

  const portrait = height > width * 1.2;
  const titleSize = Math.round(width * (portrait ? 0.085 : 0.068));
  const taglineSize = Math.round(width * 0.03);
  const eyebrowSize = Math.round(width * 0.022);
  const ctaSize = Math.round(width * 0.028);
  const urlSize = Math.round(width * 0.023);

  // In a landscape poster the text occupies the right half, so the title
  // is measured against that column. In a portrait poster it uses the full
  // width.
  const columnWidth = portrait ? width - padding * 2 : Math.round(width * 0.56);

  const elements = [];

  // The block is laid out top down, and every step advances a cursor by
  // the full height of the element it just placed. Advancing by only the
  // font size leaves the next element overlapping the previous one.
  let y = portrait ? Math.round(height * 0.15) : Math.round(height * 0.24);

  // Eyebrow.
  const eyebrowText = subtitle || app.nameAr;
  const eyebrowWidth = Math.round(estimateWidth(eyebrowText, eyebrowSize) + eyebrowSize * 2.2);
  const eyebrowHeight = Math.round(eyebrowSize * 2.2);
  elements.push(pill({
    x: right - eyebrowWidth,
    y,
    width: eyebrowWidth,
    height: eyebrowHeight,
    fill: app.colors.primary,
    text: eyebrowText,
    size: eyebrowSize,
    textFill: app.colors.accent,
    stroke: app.colors.primary,
    strokeWidth: 1.5,
  }));
  y += eyebrowHeight + Math.round(titleSize * 0.5);

  // Title.
  const titleLines = wrapText(title, columnWidth, titleSize);
  const lineHeight = Math.round(titleSize * 1.32);
  for (const text of titleLines) {
    y += Math.round(titleSize * 0.86);
    elements.push(rtlText({
      x: right, y, text, size: titleSize, fill: '#FFFFFF', weight: 700,
    }));
    y += Math.round(titleSize * 0.46);
  }

  // Accent rule.
  const ruleWidth = Math.round(width * 0.11);
  const ruleHeight = Math.max(4, Math.round(width * 0.005));
  y += Math.round(titleSize * 0.3);
  elements.push(rect({
    x: right - ruleWidth, y, width: ruleWidth, height: ruleHeight, fill: app.colors.primary, radius: ruleHeight / 2,
  }));
  y += ruleHeight + Math.round(taglineSize * 0.8);

  // Tagline.
  // Tagline. A screen poster passes its own capability line here, so the
  // app tagline stays the default.
  const taglineText = body || app.taglineAr;
  const taglineLines = wrapText(taglineText, columnWidth, taglineSize);
  for (const text of taglineLines) {
    y += Math.round(taglineSize * 1.1);
    elements.push(rtlText({
      x: right, y, text, size: taglineSize, fill: '#E2E8F0', opacity: 0.92,
    }));
    y += Math.round(taglineSize * 0.35);
  }

  // Call to action.
  if (ctaText) {
    const buttonWidth = Math.round(estimateWidth(ctaText, ctaSize) + ctaSize * 3);
    const buttonHeight = Math.round(ctaSize * 2.3);
    y += Math.round(ctaSize * 1.2);
    elements.push(pill({
      x: right - buttonWidth,
      y,
      width: buttonWidth,
      height: buttonHeight,
      gradientId: 'cta',
      text: ctaText,
      size: ctaSize,
      textFill: '#FFFFFF',
    }));
    y += buttonHeight;
  }

  // Link.
  if (ctaUrl) {
    y += Math.round(urlSize * 1.4);
    elements.push(`<text x="${num(right)}" y="${num(y)}" font-family="${FONTS.latin}" font-size="${urlSize}" font-weight="600" fill="${app.colors.accent}" text-anchor="end">${escapeXml(ctaUrl)}</text>`);
  }

  return elements.join('');
}

/**
 * Build a publish-ready poster as SVG markup.
 *
 * @param {object} options
 * @param {string} options.app        App key, one of the entries in APPS.
 * @param {string} options.title      Arabic headline.
 * @param {string} [options.subtitle] Short label above the headline.
 * @param {string} [options.body]     Line under the headline. Defaults to the
 *                                    app tagline.
 * @param {string} [options.ctaText]  Button label.
 * @param {string} [options.ctaUrl]   Link shown under the button.
 * @param {string} [options.ratio]    Output ratio key.
 * @param {boolean} [options.logo]    Draw the brand logo.
 * @param {boolean} [options.contact] Draw the contact strip.
 * @returns {string} SVG markup.
 */
export function buildPosterSvg({
  app: appKey,
  title,
  subtitle = '',
  body = '',
  ctaText = '',
  ctaUrl = '',
  ratio = '1:1',
  logo = true,
  contact = true,
}) {
  const app = getApp(appKey);
  const size = getRatio(ratio);

  if (!title || !String(title).trim()) {
    throw new Error('title is required');
  }

  const { width, height } = size;
  const padding = Math.round(width * 0.05);
  const contactHeight = contact ? Math.round(height * 0.11) : 0;

  const logoMarkup = logo
    ? buildLogoMarkup({ x: padding, y: padding, width: Math.round(width * 0.19) })
    : '';

  const headline = buildHeadline(app, {
    title,
    subtitle,
    body,
    ctaText,
    ctaUrl,
    width,
    height,
    ratio,
  });

  const contactBar = contact
    ? buildContactBar(app, width, height - contactHeight, contactHeight)
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(`${app.name} — ${title}`)}">
${buildBackground(app, width, height)}
${logoMarkup}
${headline}
${contactBar}
</svg>`;
}

/**
 * The contact details shown in a poster, exposed so a caller can show them
 * alongside the caption.
 */
export function contactDetails() {
  return { ...CONTACT };
}

/**
 * The available apps and ratios, exposed for discovery.
 */
export function catalogue() {
  return {
    apps: APPS.map((app) => ({
      key: app.key,
      name: app.name,
      nameAr: app.nameAr,
      tagline: app.tagline,
      taglineAr: app.taglineAr,
      url: app.url,
      colors: { ...app.colors },
      features: app.features,
      screenCount: app.screens.length,
    })),
    ratios: Object.entries(RATIOS).map(([key, size]) => ({
      key,
      width: size.width,
      height: size.height,
      label: size.label,
      platforms: size.platforms,
      note: size.note,
    })),
    contact: { ...CONTACT },
  };
}
