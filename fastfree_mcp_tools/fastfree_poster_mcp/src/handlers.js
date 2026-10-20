/**
 * The handler behind each poster tool.
 *
 * It builds the SVG, writes the exports and returns a plain object. The MCP
 * layer formats it for the caller, and the same handler is what the tests
 * drive, so the tested path and the published path are the same path.
 */
import fs from 'node:fs';
import { APPS } from './brand.js';
import { buildPosterSvg, contactDetails } from './poster.js';
import { checkFonts, exportPoster } from './render.js';
import { dayDir, posterBaseName } from './output.js';

/**
 * Create a poster and write it to disk.
 *
 * @param {string} appKey    App to build for.
 * @param {object} arguments Tool arguments.
 * @returns {object} A plain result object.
 */
export async function createPoster(appKey, arguments_ = {}) {
  const {
    title,
    subtitle = '',
    ctaText = '',
    ctaUrl = '',
    ratio = '1:1',
    logo = true,
    contact = true,
    caption = '',
    png = false,
  } = arguments_;

  const app = APPS[appKey];

  const fonts = checkFonts();
  if (!fonts.ok) {
    return {
      ok: false,
      reason: fonts.reason,
      hint: 'Install Tahoma, Arial or Segoe UI and try again.',
    };
  }

  let svg;
  try {
    svg = buildPosterSvg({
      app: appKey,
      title,
      subtitle,
      ctaText,
      ctaUrl: ctaUrl || app.url,
      ratio,
      logo,
      contact,
    });
  } catch (err) {
    return {
      ok: false,
      reason: err && err.message ? err.message : String(err),
    };
  }

  const dir = dayDir();
  const baseName = posterBaseName(appKey);
  const written = exportPoster({ svg, outputDir: dir, baseName, png });

  return {
    ok: true,
    app: appKey,
    appName: app.name,
    ratio,
    svgFile: written.svgFile,
    jpegFile: written.jpegFile,
    ...(written.pngFile ? { pngFile: written.pngFile } : {}),
    svgBytes: written.svgBytes,
    jpegBytes: written.jpegBytes,
    ...(written.pngBytes ? { pngBytes: written.pngBytes } : {}),
    caption: caption || defaultCaption(app, ctaUrl || app.url),
    contact: contactDetails(),
    note: 'Upload the JPEG directly. Use the SVG as the editable master.',
  };
}

/**
 * A caption to publish alongside the image, when the caller did not supply
 * one. It keeps the Arabic wording from the brand voice: short, direct, no
 * hype.
 */
function defaultCaption(app, url) {
  return `${app.nameAr}\n\n${app.tagline}.\n\n${url}`;
}
