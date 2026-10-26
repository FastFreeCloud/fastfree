/**
 * Reusable SVG building blocks for the poster.
 *
 * Every function returns a markup string. Keeping them separate from the
 * layout code means the visual language of a poster can be adjusted here
 * without touching the arrangement.
 */
import { escapeXml, num } from './utils.js';

/**
 * The font faces used for the two scripts.
 *
 * Tahoma ships with Windows and shapes Arabic correctly with joined letters.
 * Cairo is deliberately avoided: it is not installed by default, so it
 * silently falls back to a face that renders Arabic poorly.
 */
export const FONTS = {
  arabic: 'Tahoma',
  latin: 'Segoe UI',
};

/**
 * A text run anchored to its right edge, for right-to-left content.
 */
export function rtlText({ x, y, text, size, fill, weight = 400, opacity, family = FONTS.arabic }) {
  const opacityAttr = opacity === undefined ? '' : ` fill-opacity="${num(opacity)}"`;
  return `<text x="${num(x)}" y="${num(y)}" font-family="${family}" font-size="${num(size)}" font-weight="${weight}" fill="${fill}"${opacityAttr} text-anchor="end" direction="rtl">${escapeXml(text)}</text>`;
}

/**
 * A text run centred on its anchor point.
 */
export function centeredText({ x, y, text, size, fill, weight = 400, opacity, family = FONTS.arabic, rtl = false }) {
  const opacityAttr = opacity === undefined ? '' : ` fill-opacity="${num(opacity)}"`;
  const direction = rtl ? ' direction="rtl"' : '';
  return `<text x="${num(x)}" y="${num(y)}" font-family="${family}" font-size="${num(size)}" font-weight="${weight}" fill="${fill}"${opacityAttr} text-anchor="middle"${direction}>${escapeXml(text)}</text>`;
}

/**
 * A rounded rectangle.
 */
export function rect({ x, y, width, height, fill, radius = 0, stroke, strokeWidth, opacity }) {
  const attrs = [
    `x="${num(x)}"`,
    `y="${num(y)}"`,
    `width="${num(width)}"`,
    `height="${num(height)}"`,
    `rx="${num(radius)}"`,
    `fill="${fill}"`,
  ];
  if (opacity !== undefined) attrs.push(`fill-opacity="${num(opacity)}"`);
  if (stroke) attrs.push(`stroke="${stroke}"`, `stroke-width="${num(strokeWidth || 1)}"`);
  return `<rect ${attrs.join(' ')}/>`;
}

/**
 * A straight line.
 */
export function line({ x1, y1, x2, y2, stroke, strokeWidth = 1, opacity }) {
  const opacityAttr = opacity === undefined ? '' : ` stroke-opacity="${num(opacity)}"`;
  return `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${stroke}" stroke-width="${num(strokeWidth)}"${opacityAttr}/>`;
}

/**
 * A circle.
 */
export function circle({ cx, cy, r, fill, stroke, strokeWidth, opacity }) {
  const attrs = [`cx="${num(cx)}"`, `cy="${num(cy)}"`, `r="${num(r)}"`];
  if (fill) attrs.push(`fill="${fill}"`);
  if (opacity !== undefined) attrs.push(`fill-opacity="${num(opacity)}"`);
  if (stroke) attrs.push(`stroke="${stroke}"`, `stroke-width="${num(strokeWidth || 1)}"`);
  return `<circle ${attrs.join(' ')}/>`;
}

/**
 * A four-point sparkle, used as a decorative accent.
 */
export function sparkle({ cx, cy, size, fill, opacity }) {
  const half = size / 2;
  const waist = size * 0.16;
  const path = [
    `M ${num(cx)},${num(cy - half)}`,
    `Q ${num(cx + waist)},${num(cy - waist)} ${num(cx + half)},${num(cy)}`,
    `Q ${num(cx + waist)},${num(cy + waist)} ${num(cx)},${num(cy + half)}`,
    `Q ${num(cx - waist)},${num(cy + waist)} ${num(cx - half)},${num(cy)}`,
    `Q ${num(cx - waist)},${num(cy - waist)} ${num(cx)},${num(cy - half)}`,
    'Z',
  ].join(' ');
  const opacityAttr = opacity === undefined ? '' : ` opacity="${num(opacity)}"`;
  return `<path d="${path}" fill="${fill}"${opacityAttr}/>`;
}

/**
 * A pill-shaped label with centred text, used for the eyebrow and the
 * call-to-action button.
 */
export function pill({ x, y, width, height, fill, text, size, textFill, stroke, strokeWidth, family = FONTS.arabic, rtl = true, gradientId }) {
  const background = gradientId
    ? `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" rx="${num(height / 2)}" fill="url(#${gradientId})"/>`
    : rect({ x, y, width, height, fill, radius: height / 2, stroke, strokeWidth });

  // The label sits on the vertical centre of the button.
  const label = centeredText({
    x: x + width / 2,
    y: y + height * 0.5 + size * 0.35,
    text,
    size,
    fill: textFill,
    weight: 700,
    family,
    rtl,
  });

  return `<g>${background}${label}</g>`;
}
