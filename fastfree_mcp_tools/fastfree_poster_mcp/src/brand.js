/**
 * The brand data used by the poster generator.
 *
 * Everything here comes from brand/brand.json, the single source of truth
 * in the repository. The module keeps the same public shape it always had,
 * so the rest of the server is unaffected by the change of origin.
 */
import { brand } from './brand-source.js';

/** The contact details shown in the contact strip. */
export const CONTACT = brand.contact;

/** The apps, each with its colours, taglines and screens. */
export const APPS = brand.apps;

/** The output sizes the platforms accept. */
export const RATIOS = brand.ratios;

/** The app keys, in the order the tools are advertised. */
export const APP_KEYS = brand.appKeys;

/** Every screen, listed once. */
export const SCREENS = brand.screens;

/**
 * Look up an app, failing with a message that names the valid keys.
 */
export function getApp(appKey) {
  return brand.getApp(appKey);
}

/**
 * Look up an output ratio, failing with a message that names the valid
 * options.
 */
export function getRatio(ratio) {
  const size = RATIOS[ratio];
  if (!size) {
    throw new Error(`Unknown ratio "${ratio}". Valid ratios: ${Object.keys(RATIOS).join(', ')}`);
  }
  return size;
}

/**
 * Look up a screen by its key.
 */
export function getScreen(screenKey) {
  return brand.getScreen(screenKey);
}
