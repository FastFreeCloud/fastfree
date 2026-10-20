/**
 * The handler behind each poster tool.
 *
 * It builds the SVG, writes the exports and returns a plain object. The MCP
 * layer formats it for the caller, and the same handler is what the tests
 * drive, so the tested path and the published path are the same path.
 */
import fs from 'node:fs';
import { APPS, CONTACT, SCREENS, getApp, getScreen } from './brand.js';
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
    body = '',
    ctaText = '',
    ctaUrl = '',
    ratio = '1:1',
    logo = true,
    contact = true,
    caption = '',
    png = false,
  } = arguments_;

  const app = getApp(appKey);

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
      body,
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
 * The screen catalogue, grouped by the package that owns each screen.
 *
 * Every screen carries the apps that ship it and a ready argument object
 * for screen_social_post, so a caller can go straight from the catalogue
 * to a poster.
 */
export function screensCatalogue({
  app = null,
  package: packageName = null,
  includeComponents = true,
} = {}) {
  const appRecord = app ? getApp(app) : null;

  const packages = new Map();

  for (const screen of SCREENS) {
    if (packageName && screen.package !== packageName) continue;
    if (appRecord && !appRecord.packages.includes(screen.package)) continue;

    if (!packages.has(screen.package)) packages.set(screen.package, []);
    packages.get(screen.package).push({
      key: screen.key,
      labelAr: screen.labelAr,
      labelEn: screen.labelEn,
      icon: screen.icon,
      group: screen.group,
      ...(includeComponents ? { component: screen.component } : {}),
      apps: APPS
        .filter((candidate) => candidate.packages.includes(screen.package))
        .map((candidate) => candidate.key),
      posterArgs: {
        app: app ?? APPS.find((candidate) => candidate.packages.includes(screen.package))?.key,
        screen: screen.key,
      },
    });
  }

  return {
    ok: true,
    count: SCREENS.filter((screen) => {
      if (packageName && screen.package !== packageName) return false;
      if (appRecord && !appRecord.packages.includes(screen.package)) return false;
      return true;
    }).length,
    packages: [...packages].map(([name, screens]) => ({ package: name, screens })),
    apps: APPS.map((candidate) => ({
      key: candidate.key,
      name: candidate.name,
      nameAr: candidate.nameAr,
      screenCount: candidate.screens.length,
    })),
  };
}

/**
 * Create a poster about one screen inside an app.
 *
 * The headline defaults to the screen label in Arabic and the body line to
 * the app tagline, so a caller only has to name the screen.
 */
export async function createScreenPoster({
  app: appKey,
  screen: screenKey,
  title,
  subtitle,
  body,
  ...rest
} = {}) {
  let app;
  let screen;
  try {
    app = getApp(appKey);
    screen = getScreen(screenKey);
  } catch (err) {
    return { ok: false, reason: err && err.message ? err.message : String(err) };
  }

  if (!app.packages.includes(screen.package)) {
    return {
      ok: false,
      reason: `Screen "${screenKey}" is not shipped by app "${appKey}".`,
      hint: `The apps that ship it: ${APPS.filter((candidate) => candidate.packages.includes(screen.package)).map((candidate) => candidate.key).join(', ')}`,
    };
  }

  return createPoster(appKey, {
    ...rest,
    title: title || screen.labelAr || screen.labelEn,
    subtitle: subtitle || app.nameAr,
    body: body || app.taglineAr,
  });
}

/**
 * A caption to publish alongside the image, when the caller did not supply
 * one. It keeps the Arabic wording from the brand voice: short, direct, no
 * hype.
 */
function defaultCaption(app, url) {
  return `${app.nameAr}\n\n${app.taglineAr}.\n\n${url}`;
}
