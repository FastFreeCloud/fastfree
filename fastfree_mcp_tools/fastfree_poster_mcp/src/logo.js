/**
 * Brand logo inlining.
 *
 * The poster has to be a single self-contained file: a designer opening the
 * SVG, or a platform ingesting it, should not need the repository around it.
 * So the logo markup is embedded directly and its element ids are
 * prefixed, which keeps the gradients and filters valid and stops them
 * colliding with anything else in the document.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const LOGO_RELATIVE = path.join('brand', 'assets', 'logo', 'fastfree-brand-logo-dark.svg');

let cachedLogo;

/**
 * Locate the brand logo.
 *
 * The search walks upward from this file so the package works both from
 * inside the repository and from a standalone copy of the package.
 */
export function findLogoFile() {
  if (cachedLogo !== undefined) return cachedLogo;

  let dir = here;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, LOGO_RELATIVE);
    if (fs.existsSync(candidate)) {
      cachedLogo = candidate;
      return cachedLogo;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  cachedLogo = null;
  return cachedLogo;
}

/**
 * Strip the XML declaration, doctype and outer svg element, leaving the
 * drawable content, with every id namespaced.
 */
function extractDrawableContent(raw) {
  let content = raw
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    // Comments are stripped: they carry no rendering meaning, they add
    // weight to every exported poster, and a stray ampersand inside one
    // makes the file harder to validate.
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');

  const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  for (const id of ids) {
    content = content.split(`id="${id}"`).join(`id="ff-${id}"`);
    content = content.split(`url(#${id})`).join(`url(#ff-${id})`);
    content = content.split(`href="#${id}"`).join(`href="#ff-${id}"`);
  }

  return content;
}

/**
 * Build the markup for the brand logo, placed inside the poster.
 *
 * @param {object} options
 * @param {number} options.x      Left edge.
 * @param {number} options.y      Top edge.
 * @param {number} options.width  Target width on the canvas.
 * @returns {string} SVG markup, or an empty string when the logo is missing.
 */
export function buildLogoMarkup({ x, y, width }) {
  const file = findLogoFile();
  if (!file) return '';

  const content = extractDrawableContent(fs.readFileSync(file, 'utf8'));
  // The source artwork is an 800x260 canvas.
  const scale = width / 800;

  return `<g transform="translate(${x},${y}) scale(${scale.toFixed(4)})">${content}</g>`;
}
