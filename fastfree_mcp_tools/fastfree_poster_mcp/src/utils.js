/**
 * Small XML and text helpers shared by the poster builder.
 */

/**
 * Escape a value for use in XML text or attribute content.
 */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * The Arabic Unicode block, used to pick the right face for each run.
 */
const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Report whether a character belongs to an Arabic script block.
 */
export function isArabic(char) {
  return ARABIC_PATTERN.test(char);
}

/**
 * Split a string into runs of Arabic and non-Arabic text.
 *
 * A renderer that is given one font for a mixed string will shape the
 * Arabic with the Latin face or the Latin with the Arabic face, and one of
 * them degrades. Splitting lets each run be drawn with a face that suits
 * it.
 */
export function splitByScript(text) {
  const chunks = [];
  let current = null;

  for (const char of String(text)) {
    const arabic = isArabic(char);
    if (!current || current.arabic !== arabic) {
      current = { arabic, text: '' };
      chunks.push(current);
    }
    current.text += char;
  }

  return chunks.filter((chunk) => chunk.text.trim().length > 0);
}

/**
 * Estimate the rendered width of a string, in arbitrary font-size units.
 *
 * A vector renderer measures text when it draws, not when it builds, so the
 * layout has to be estimated. Arabic glyphs are narrower on average than
 * Latin ones, so the two are counted with different factors.
 */
export function estimateWidth(text, fontSize) {
  let units = 0;
  for (const char of String(text)) {
    units += isArabic(char) ? 0.52 : 0.56;
  }
  return units * fontSize;
}

/**
 * Wrap a string into lines that fit a given width.
 */
export function wrapText(text, maxWidth, fontSize) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && estimateWidth(candidate, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines;
}

/**
 * Round a number for use in markup, so the output stays compact and stable.
 */
export function num(value) {
  return Number(value.toFixed(1));
}
