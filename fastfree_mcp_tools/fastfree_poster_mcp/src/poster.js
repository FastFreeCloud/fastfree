/**
 * Builds the poster SVG.
 *
 * The layout follows the approved FastFree marketing artwork: a strong brand
 * visual on one side, and a text column on the other with the eyebrow, the
 * headline, the tagline, a short feature list and the call to action.
 *
 * Everything is drawn as vectors and live text, so the exported SVG stays
 * sharp at any size and the Arabic remains selectable and editable.
 */
import { APPS, CONTACT, RATIOS, getApp, getRatio } from './brand.js';
import { FONTS, circle, line, pill, rect, rtlText, sparkle } from './svg.js';
import { adaptiveMarkHeight, buildAdaptiveMarkMarkup, buildScreenMarkup } from './logo.js';
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
    <radialGradient id="glow2" cx="90%" cy="8%" r="48%">
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
 * One feature line, with a dot to its right because the list reads right to
 * left. The dot sits close to the text so the line reads as one unit.
 */
function buildFeatureRow(app, feature, { x, y, size }) {
  const dotR = Math.max(3, Math.round(size * 0.14));
  const dotGap = Math.round(size * 0.45);

  return `<g>
    ${circle({
      cx: x - dotR,
      cy: y - size * 0.32,
      r: dotR,
      fill: app.colors.accent,
      opacity: 1,
    })}
    ${rtlText({
      x: x - dotGap - dotR * 2,
      y,
      text: feature,
      size,
      fill: '#E2E8F0',
      weight: 600,
      opacity: 0.95,
    })}
  </g>`;
}

/**
 * The headline.
 *
 * When the title carries the FastFree wordmark it is drawn in two tones,
 * "Fast" in white and "Free" in the accent colour, which is how the
 * approved FastFree artwork sets the name.
 *
 * The wordmark is Latin, so it is laid out from its left edge. Drawing it
 * inside a right-to-left text element clips the first letter, so it gets
 * its own element anchored to the start of the line.
 */
function buildTitle(title, { x, y, size, accent, maxWidth }) {
  const index = title.indexOf('FastFree');

  if (index === -1) {
    return rtlText({ x, y, text: title, size, fill: '#FFFFFF', weight: 700 });
  }

  const before = title.slice(0, index);
  const after = title.slice(index + 'FastFree'.length);

  // The trailing part, for example " POS", is measured so the wordmark can
  // be placed in front of it.
  const tail = after
    ? `<tspan fill="#FFFFFF">${escapeXml(after)}</tspan>`
    : '';

  // The whole line is Latin here, so it is laid out from its left edge and
  // right aligned to the column. The size is reduced when the line is too
  // wide: a Latin headline in a bold face is wider than the general
  // estimate, and would otherwise run into the screen shot.
  //
  // Bold Latin averages wider per glyph than the general text estimate, so
  // the headline is measured with a larger factor.
  const LATIN_DISPLAY_FACTOR = 0.66;
  const measured = title.length * LATIN_DISPLAY_FACTOR * size;
  const scale = maxWidth && measured > maxWidth ? maxWidth / measured : 1;
  const fittedSize = Math.round(size * scale);
  const left = x - title.length * LATIN_DISPLAY_FACTOR * fittedSize;

  return `<text x="${num(left)}" y="${num(y)}" font-family="${FONTS.latin}" font-size="${num(fittedSize)}" font-weight="700" text-anchor="start" direction="ltr">${before ? `<tspan>${escapeXml(before)}</tspan>` : ''}<tspan fill="#FFFFFF">Fast</tspan><tspan fill="${accent}">Free</tspan>${tail}</text>`;
}

/**
 * The text column: eyebrow, headline, rule, tagline, features, call to
 * action and link.
 *
 * The column is built as a list of measured rows rather than drawn straight
 * away, because the available height depends on the ratio. A landscape
 * poster has room for fewer feature lines than a portrait one, and a column
 * that runs past the contact strip would push the button off the canvas.
 */
function buildHeadline(app, {
  title, subtitle, body, ctaText, ctaUrl, features = [], width, height, ratio, right, topOffset = 0, bottomLimit, columnWidth: columnWidthArg,
}) {
  const portrait = height > width * 1.1;

  // A landscape poster is only 628 pixels tall, so the type is smaller
  // there. The portrait sizes are used as they are.
  const titleSize = Math.round(width * (portrait ? 0.08 : 0.052));
  const taglineSize = Math.round(width * (portrait ? 0.026 : 0.023));
  const eyebrowSize = Math.round(width * (portrait ? 0.019 : 0.017));
  const ctaSize = Math.round(width * (portrait ? 0.024 : 0.022));
  const featureSize = Math.round(width * (portrait ? 0.021 : 0.019));

  // The text column is measured against the space it actually has. In a
  // landscape poster the screen shot takes the left half, so the column
  // only gets what is left of the right side.
  const columnWidth = columnWidthArg ?? Math.round(width * (portrait ? 0.86 : 0.4));

  // The cursor starts at the top of the column.
  const y = Math.round(height * (portrait ? 0.14 : 0.08)) + topOffset;

  // The call to action block is measured here but drawn later, because the
  // button may be dropped. The link is not drawn: the contact strip already
  // carries the website, and a second copy under the button is noise.
  const buttonGap = Math.round(ctaSize * 1.1);
  const buttonHeight = Math.round(ctaSize * 2.3);

  // The column is built as a list of blocks. Each block draws itself at a
  // given cursor position and declares exactly how far the cursor moves
  // afterwards, so the measured height is always the drawn height. Keeping
  // the two in step is what stops the button landing in the contact strip.
  const blocks = [];

  const pushText = (text, size, fill, weight, opacity, extraAdvance) => {
    blocks.push({
      advance: extraAdvance,
      tagline: false,
      draw: (cursor) => rtlText({
        x: right,
        y: cursor + size * 0.82,
        text,
        size,
        fill,
        weight,
        opacity,
      }),
    });
  };

  // The tagline is pushed separately so the fit pass can drop it when the
  // column does not fit.
  const pushTagline = (text, size) => {
    blocks.push({
      advance: Math.round(size * 1.35),
      tagline: true,
      draw: (cursor) => rtlText({
        x: right,
        y: cursor + size * 0.82,
        text,
        size,
        fill: '#E2E8F0',
        weight: 600,
        opacity: 0.95,
      }),
    });
  };

  // Eyebrow.
  const eyebrowText = subtitle || app.nameAr;
  const eyebrowWidth = Math.round(estimateWidth(eyebrowText, eyebrowSize) + eyebrowSize * 2.2);
  const eyebrowHeight = Math.round(eyebrowSize * 2.2);
  blocks.push({
    advance: eyebrowHeight + Math.round(titleSize * 0.42),
    draw: (cursor) => pill({
      x: right - eyebrowWidth,
      y: cursor,
      width: eyebrowWidth,
      height: eyebrowHeight,
      // The eyebrow is white on the app colour, which keeps it readable.
      // The accent colour is too close to the primary to carry text here.
      fill: app.colors.primary,
      text: eyebrowText,
      size: eyebrowSize,
      textFill: '#FFFFFF',
      stroke: app.colors.accent,
      strokeWidth: 1.5,
    }),
  });

  // Headline.
  const titleLines = wrapText(title, columnWidth, titleSize);
  for (const text of titleLines) {
    blocks.push({
      advance: Math.round(titleSize * 1.28),
      draw: (cursor) => buildTitle(text, {
        x: right,
        y: cursor + Math.round(titleSize * 0.86),
        size: titleSize,
        accent: app.colors.accent,
        maxWidth: columnWidth,
      }),
    });
  }

  // Accent rule.
  const ruleWidth = Math.round(width * 0.1);
  const ruleHeight = Math.max(4, Math.round(width * 0.005));
  blocks.push({
    advance: ruleHeight + Math.round(taglineSize * 0.75),
    draw: (cursor) => rect({
      x: right - ruleWidth,
      y: cursor,
      width: ruleWidth,
      height: ruleHeight,
      fill: app.colors.primary,
      radius: ruleHeight / 2,
    }),
  });

  // Tagline. A screen poster passes its own capability line here, so the app
  // tagline stays the default. It is set at the same weight and colour as
  // the feature lines, so the Arabic reads as one block rather than as
  // several different styles.
  const taglineText = body || app.taglineAr;
  const taglineLines = wrapText(taglineText, columnWidth, taglineSize);
  for (const text of taglineLines) {
    pushTagline(text, taglineSize);
  }

  // The feature lines are the first thing dropped when the column is too
  // tall, because the headline and the call to action matter more.
  const featureBlocks = features.map((feature) => ({
    advance: Math.round(featureSize * 1.5),
    draw: (cursor) => buildFeatureRow(app, feature, {
      x: right,
      y: cursor + Math.round(featureSize * 1.1),
      size: featureSize,
    }),
  }));

  // The link and the button. The advance of each block is exactly the
  // distance from the cursor to the block's bottom edge, which is what the
  // fit pass measures.
  const buttonBlock = ctaText
    ? {
      advance: buttonGap + buttonHeight,
      draw: (cursor) => {
        const buttonWidth = Math.round(estimateWidth(ctaText, ctaSize) + ctaSize * 3);
        return pill({
          x: right - buttonWidth,
          y: cursor + buttonGap,
          width: buttonWidth,
          height: buttonHeight,
          gradientId: 'cta',
          text: ctaText,
          size: ctaSize,
          textFill: '#FFFFFF',
        });
      },
    }
    : null;

  // Fit the column: the content is dropped one piece at a time until it
  // ends above the contact strip. The order is what matters. The feature
  // lines go first, then the tagline, and the button is the last thing to
  // go, because a poster without a call to action is not a poster.
  //
  // The limit is an absolute canvas coordinate, the same space the column
  // cursor moves in.
  const limit = bottomLimit ?? height;

  // The tagline is the block right before the feature lines, so it can be
  // dropped when the column does not fit.
  const taglineIndex = blocks.findIndex((block) => block.tagline);

  const columnBottom = (featureList_, buttonBlock_, dropTagline) => {
    let cursor = y;
    blocks.forEach((block, index) => {
      if (dropTagline && index === taglineIndex) return;
      cursor += block.advance;
    });
    for (const block of featureList_) cursor += block.advance;
    if (buttonBlock_) cursor += buttonBlock_.advance;
    return cursor;
  };

  let keptFeatures = featureBlocks;
  let keptButton = buttonBlock;
  let dropTagline = false;

  while (columnBottom(keptFeatures, keptButton, dropTagline) > limit) {
    if (keptFeatures.length) {
      keptFeatures = keptFeatures.slice(0, -1);
    } else if (!dropTagline && taglineIndex >= 0) {
      dropTagline = true;
    } else if (keptButton) {
      keptButton = null;
    } else {
      break;
    }
  }

  // Draw the column from its final position.
  const markup = [];
  let cursor = y;
  blocks.forEach((block, index) => {
    if (dropTagline && index === taglineIndex) return;
    markup.push(block.draw(cursor));
    cursor += block.advance;
  });
  for (const block of keptFeatures) {
    markup.push(block.draw(cursor));
    cursor += block.advance;
  }
  if (keptButton) {
    markup.push(keptButton.draw(cursor));
    cursor += keptButton.advance;
  }

  if (process.env.FASTFREE_POSTER_DEBUG) {
    // eslint-disable-next-line no-console
    console.error(
      `[poster] app=${app.key} ratio=${ratio} start=${y} end=${cursor} limit=${limit} `
      + `features=${keptFeatures.length} button=${Boolean(keptButton)}`,
    );
  }

  return markup.join('');
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
 * @param {boolean} [options.logo]    Draw the brand wordmark.
 * @param {boolean} [options.contact] Draw the contact strip.
 * @param {number} [options.features]  How many feature lines to show.
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
  features = 3,
}) {
  const app = getApp(appKey);
  const size = getRatio(ratio);

  if (!title || !String(title).trim()) {
    throw new Error('title is required');
  }

  const { width, height } = size;
  const padding = Math.round(width * 0.055);
  const contactHeight = contact ? Math.round(height * 0.11) : 0;
  const portrait = height > width * 1.1;

  // The area the content may use, ending above the contact strip.
  const contentBottom = height - contactHeight;

  // The brand visual is the adaptive application artwork: the infinity
  // mark with the application glyph underneath it. It carries no lettering,
  // so it never competes with the headline.
  //
  // The mark is centred at the top in every ratio, so it always reads as the
  // first thing on the poster.
  const markWidth = Math.round(width * (portrait ? 0.26 : 0.17));
  const markHeight = Math.round(adaptiveMarkHeight(markWidth));

  const markX = Math.round((width - markWidth) / 2);
  const markY = portrait
    ? Math.round(height * 0.04)
    : Math.round(height * 0.05);

  const markMarkup = logo
    ? buildAdaptiveMarkMarkup({
      appKey,
      x: markX,
      y: markY,
      width: markWidth,
    })
    : '';

  // The screen shot of the application.
  //
  // A landscape poster splits in two: the screen shot on the left, the text
  // column on the right. A portrait poster stacks them, with the screen
  // under the mark and the text under that.
  const screenWidth = portrait
    ? Math.round(width * 0.76)
    : Math.round(width * 0.34);
  const screenLeft = portrait
    ? Math.round((width - screenWidth) / 2)
    : padding;
  const screenHeight = Math.round(screenWidth * 0.62);

  let screenTop;
  let textTop;
  let right;

  if (portrait) {
    screenTop = markY + markHeight + Math.round(height * 0.025);
    textTop = screenTop + screenHeight + Math.round(height * 0.03);
    right = width - padding;
  } else {
    // The mark is centred at the top. The screen shot goes below it on
    // the left, and the text column starts at the top on the right, so the
    // short landscape poster uses its height well.
    screenTop = markY + markHeight + Math.round(height * 0.035);
    textTop = Math.round(height * 0.09);
    right = width - padding;
  }

  const screenMarkup = buildScreenMarkup({
    appKey,
    x: screenLeft,
    y: screenTop,
    width: screenWidth,
    height: screenHeight,
  });

  // A landscape poster has a short text column, so it carries fewer feature
  // lines. The fit pass drops the rest if they still do not fit.
  const featureLimit = portrait ? features : Math.min(features, 2);
  const featureList = (app.featuresAr ?? app.features ?? []).slice(0, Math.max(0, featureLimit));

  const headline = buildHeadline(app, {
    title,
    subtitle,
    body,
    ctaText,
    ctaUrl,
    features: featureList,
    width,
    height,
    ratio,
    right,
    topOffset: textTop,
    bottomLimit: height - contactHeight - Math.round(height * 0.02),
    // The text column is bounded by the screen shot on the left.
    columnWidth: portrait
      ? Math.round(width * 0.86)
      : Math.round(width - padding - (screenLeft + screenWidth) - Math.round(width * 0.045)),
  });

  const contactBar = contact
    ? buildContactBar(app, width, height - contactHeight, contactHeight)
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(`${app.name} — ${title}`)}">
${buildBackground(app, width, height)}
${markMarkup}
${screenMarkup}
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
