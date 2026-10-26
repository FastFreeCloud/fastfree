/**
 * The FastFree brand loader.
 *
 * brand/brand.json is the single source of truth for the app metadata, the
 * contact details and the screen catalogue. Everything else in the repo
 * reads through here, so a change in one place reaches every consumer.
 *
 * The stored shape is normalised: each screen is listed once, and an app
 * names the packages it ships. The shape handed out is denormalised per
 * app, so a consumer gets the screens of that app without having to join
 * the two lists itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The default location of the canonical file. */
export const defaultBrandFile = path.join(here, 'brand.json');

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Find brand.json: the explicit path, then the environment override, then
 * a walk up from this file.
 */
export function resolveBrandFile(explicit) {
  if (explicit && fs.existsSync(explicit)) return path.resolve(explicit);

  const env = process.env.FASTFREE_BRAND_FILE;
  if (env) {
    if (!fs.existsSync(env)) {
      throw new Error(`FASTFREE_BRAND_FILE does not exist: ${env}`);
    }
    return path.resolve(env);
  }

  const localCandidate = path.join(here, 'brand.json');
  if (fs.existsSync(localCandidate)) return localCandidate;

  let dir = here;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(dir, 'brand', 'brand.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    'brand/brand.json was not found. Set FASTFREE_BRAND_FILE to its absolute path.',
  );
}

/**
 * Check the handful of invariants every consumer depends on.
 *
 * A missing or malformed value fails here with a message that names the
 * field, rather than producing a poster with an empty headline or an
 * invisible colour.
 */
function validate(raw) {
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    throw new Error('brand.json is not an object');
  }

  for (const key of ['version', 'brand', 'ratios', 'contact', 'screens', 'apps']) {
    if (!raw[key]) errors.push(`missing top-level "${key}"`);
  }

  const appKeys = new Set();
  for (const app of raw.apps ?? []) {
    if (appKeys.has(app.key)) errors.push(`duplicate app key "${app.key}"`);
    appKeys.add(app.key);

    for (const role of ['primary', 'secondary', 'accent', 'deep']) {
      if (!HEX.test(app.colors?.[role] ?? '')) {
        errors.push(`app "${app.key}" colour "${role}" is not a 6 digit hex value`);
      }
    }

    for (const field of ['name', 'nameAr', 'tagline', 'taglineAr', 'subtitle', 'subtitleAr', 'url']) {
      if (!app[field]) errors.push(`app "${app.key}" is missing "${field}"`);
    }
  }

  const screenKeys = new Set();
  for (const screen of raw.screens ?? []) {
    if (screenKeys.has(screen.key)) errors.push(`duplicate screen key "${screen.key}"`);
    screenKeys.add(screen.key);
    if (!screen.component) errors.push(`screen "${screen.key}" has no component path`);
  }

  for (const [key, size] of Object.entries(raw.ratios ?? {})) {
    if (!Number.isInteger(size.width) || !Number.isInteger(size.height)) {
      errors.push(`ratio "${key}" must have an integer width and height`);
    }
  }

  for (const field of ['phone', 'email', 'website']) {
    if (!raw.contact?.[field]) errors.push(`contact is missing "${field}"`);
  }

  if (errors.length) {
    throw new Error(`brand.json is invalid:\n  - ${errors.join('\n  - ')}`);
  }
}

/**
 * Load the canonical brand file and expand it.
 *
 * @param {string} [file] Explicit path to brand.json.
 * @returns {object} The expanded brand object.
 */
export function loadBrand(file) {
  const brandFile = resolveBrandFile(file);
  const raw = JSON.parse(fs.readFileSync(brandFile, 'utf8'));
  validate(raw);

  const screensByPackage = new Map();
  for (const screen of raw.screens) {
    if (!screensByPackage.has(screen.package)) {
      screensByPackage.set(screen.package, []);
    }
    screensByPackage.get(screen.package).push(screen);
  }

  const apps = raw.apps.map((app) => ({
    ...app,
    screens: app.packages.flatMap((pkg) => screensByPackage.get(pkg) ?? []),
  }));

  return {
    version: raw.version,
    updatedAt: raw.updatedAt ?? null,
    sourceFile: brandFile,
    brand: raw.brand,
    ratios: raw.ratios,
    contact: raw.contact,
    screens: raw.screens,
    apps,
    appKeys: apps.map((app) => app.key),

    /**
     * Look up an app, failing with a message that names the valid keys.
     */
    getApp(key) {
      const app = apps.find((candidate) => candidate.key === key);
      if (!app) {
        throw new Error(`Unknown app "${key}". Valid apps: ${this.appKeys.join(', ')}`);
      }
      return app;
    },

    /**
     * Look up a screen by its key.
     */
    getScreen(key) {
      const screen = raw.screens.find((candidate) => candidate.key === key);
      if (!screen) {
        throw new Error(`Unknown screen "${key}".`);
      }
      return screen;
    },

    /**
     * The apps that ship a given screen.
     */
    appsForScreen(key) {
      const screen = this.getScreen(key);
      return apps.filter((app) => app.packages.includes(screen.package));
    },
  };
}
