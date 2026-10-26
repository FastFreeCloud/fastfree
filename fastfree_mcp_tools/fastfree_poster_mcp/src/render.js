/**
 * Rasterises the poster SVG into the formats the platforms accept.
 *
 * Meta's Instagram platform reference requires JPEG for feed images, with a
 * maximum width of 1440 px, so JPEG is the primary export. PNG is kept for
 * places that want transparency, such as the website's Open Graph image.
 *
 * Fonts are loaded by explicit file path rather than by scanning the
 * system, so the same SVG produces the same pixels on any machine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';

/**
 * Font files used for rendering, in priority order.
 *
 * Tahoma carries the Arabic and ships with Windows. Segoe UI carries the
 * Latin. Both are listed explicitly so a machine without them fails loudly
 * instead of silently substituting a face that breaks Arabic shaping.
 */
const FONT_FILES = [
  'C:/Windows/Fonts/tahoma.ttf',
  'C:/Windows/Fonts/tahomabd.ttf',
  'C:/Windows/Fonts/segoeui.ttf',
  'C:/Windows/Fonts/segoeuib.ttf',
  'C:/Windows/Fonts/segoeuisl.ttf',
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
];

let cachedFontFiles;

/**
 * The font files that actually exist on this machine.
 */
export function availableFontFiles() {
  if (!cachedFontFiles) {
    cachedFontFiles = FONT_FILES.filter((file) => fs.existsSync(file));
  }
  return cachedFontFiles;
}

/**
 * Check that the fonts the poster needs are present.
 *
 * A missing Arabic face is the single most damaging failure here: the
 * poster still renders, but the Arabic comes out as disconnected letters in
 * the wrong order, which looks like a design mistake rather than an error.
 */
export function checkFonts() {
  const files = availableFontFiles();
  const hasArabic = files.some((file) => /tahoma|arial|segoe/i.test(file));
  return {
    ok: files.length > 0 && hasArabic,
    files,
    reason: hasArabic
      ? null
      : 'No Arabic-capable font was found. Install Tahoma, Arial or Segoe UI.',
  };
}

/**
 * Rasterise SVG markup to a PNG buffer.
 */
export function renderPng(svg, { width } = {}) {
  const fonts = availableFontFiles();
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: {
      loadSystemFonts: false,
      fontFiles: fonts,
      defaultFontFamily: 'Tahoma',
      sansSerifFamily: 'Segoe UI',
    },
    textRendering: 2,
  });
  return resvg.render().asPng();
}

/**
 * Rasterise SVG markup to a JPEG buffer.
 *
 * Meta's Instagram platform reference requires JPEG for feed images, so this
 * is the format used for the publishable export.
 */
export function renderJpeg(svg, { quality = 92, width } = {}) {
  const fonts = availableFontFiles();
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: {
      loadSystemFonts: false,
      fontFiles: fonts,
      defaultFontFamily: 'Tahoma',
      sansSerifFamily: 'Segoe UI',
    },
    textRendering: 2,
  });

  const image = resvg.render();
  const encoded = jpeg.encode(
    { data: Buffer.from(image.pixels), width: image.width, height: image.height },
    quality,
  );
  return encoded.data;
}

/**
 * Write the poster as SVG and JPEG, and return the written paths.
 *
 * @param {object} options
 * @param {string} options.svg       SVG markup.
 * @param {string} options.outputDir Directory for the exports.
 * @param {string} options.baseName  File name without extension.
 * @param {boolean} [options.png]    Also write a PNG.
 * @param {number} [options.jpegQuality]
 */
export function exportPoster({
  svg, outputDir, baseName, png = false, jpegQuality = 92,
}) {
  fs.mkdirSync(outputDir, { recursive: true });

  const svgFile = path.join(outputDir, `${baseName}.svg`);
  fs.writeFileSync(svgFile, svg, 'utf8');

  // JPEG is what Meta accepts for feed images. It is also smaller than PNG
  // for this kind of artwork, which keeps uploads fast.
  const jpegFile = path.join(outputDir, `${baseName}.jpg`);
  fs.writeFileSync(jpegFile, renderJpeg(svg, { quality: jpegQuality }));

  const written = { svgFile, jpegFile };

  if (png) {
    const pngFile = path.join(outputDir, `${baseName}.png`);
    fs.writeFileSync(pngFile, renderPng(svg));
    written.pngFile = pngFile;
  }

  written.svgBytes = fs.statSync(svgFile).size;
  written.jpegBytes = fs.statSync(jpegFile).size;
  if (png) written.pngBytes = fs.statSync(written.pngFile).size;

  return written;
}
