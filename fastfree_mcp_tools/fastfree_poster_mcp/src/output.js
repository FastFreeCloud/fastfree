/**
 * Where generated posters are written.
 *
 * Output goes to a dated folder so a month's worth of posts stays browsable
 * and a new run never overwrites an earlier one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..');

/**
 * The folder new posters are written to.
 */
export function outputRoot() {
  return process.env.FASTFREE_POSTER_OUTPUT
    || path.join(packageRoot, 'output');
}

/**
 * The dated folder for a given day.
 */
export function dayDir(date = new Date()) {
  const key = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  const dir = path.join(outputRoot(), key);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Build a file name for a poster.
 *
 * The time prefix keeps several posts from the same day apart, and the
 * app key keeps them identifiable.
 */
export function posterBaseName(appKey, date = new Date()) {
  const time = [
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((part) => String(part).padStart(2, '0')).join('');

  return `${appKey}-social-${time}`;
}
