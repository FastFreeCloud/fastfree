/**
 * Locates and loads the canonical brand file.
 *
 * The loader lives in the repository's brand folder, which is above this
 * package. It is imported dynamically so the package keeps working when it
 * is copied somewhere else, as long as FASTFREE_BRAND_FILE points at the
 * canonical file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Walk up until the brand folder with the loader is found.
 */
function findBrandDir() {
  if (process.env.FASTFREE_BRAND_DIR && fs.existsSync(path.join(process.env.FASTFREE_BRAND_DIR, 'loader.mjs'))) {
    return process.env.FASTFREE_BRAND_DIR;
  }
  let dir = here;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidates = [
      path.join(dir, '.ai-rulez', 'domains', 'frontend', 'skills', 'fastfree-brand'),
      path.join(dir, '.agents', 'skills', 'fastfree-brand'),
      path.join(dir, 'brand')
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, 'loader.mjs'))) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    'fastfree-brand loader.mjs was not found. Set FASTFREE_BRAND_DIR or ensure .agents/skills/fastfree-brand/ exists.',
  );
}

const brandDir = findBrandDir();
const { loadBrand } = await import(pathToFileURL(path.join(brandDir, 'loader.mjs')).href);

/**
 * The expanded brand data: apps, screens, contact details and ratios.
 */
export const brand = loadBrand(process.env.FASTFREE_BRAND_FILE || undefined);
