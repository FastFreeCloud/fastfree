/**
 * File output helpers.
 *
 * Every generation writes into output/<date>/ so runs never pile up
 * in one flat folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config, slugify } from './config.js';

const FETCH_TIMEOUT_MS = 20000;
const MAX_BYTES = 25 * 1024 * 1024;
const MIN_BYTES = 5000;

/** Control characters, written as escapes so the source stays plain text. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
/** Windows device names: unusable as file names even with an extension. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar day. Must match runBase() so names and folders agree. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayDir() {
  const dir = path.join(config.outputDir, dayKey());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Reduce arbitrary tool input to a plain, usable file name.
 *
 * Tool arguments reach the filesystem, so this drops path separators,
 * reserved characters, leading dots and Windows device names. Without it a
 * name like "../evil" writes outside the output folder, and "CON" hits the
 * DOS device namespace instead of a file.
 */
export function safeFileName(name, fallback = 'file') {
  const cleaned = path
    .basename(String(name ?? ''))
    .replace(CONTROL_CHARS, '')
    .replace(/[<>:"/\\|?*\s]+/g, '-')
    .replace(/^[.\-]+/, '')
    .slice(0, 80)
    .replace(/[.\-]+$/, '')
    .trim();

  if (!cleaned) return fallback;
  return RESERVED.test(cleaned) ? `_${cleaned}` : cleaned;
}

export function runBase(prompt) {
  const d = new Date();
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${slugify(prompt)}`;
}

/**
 * Download media URLs to the current day folder.
 *
 * Returns `skipped` alongside `saved` so a run that downloaded nothing is
 * never reported as a plain success.
 */
export async function saveFromUrls(urls, base, ext = 'jpg') {
  const dir = dayDir();
  const saved = [];
  const skipped = [];
  const seen = new Set();
  let seq = 0;

  for (const raw of urls) {
    const url = String(raw);

    if (seen.has(url)) continue;
    seen.add(url);

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

      if (!res.ok) {
        skipped.push({ url, reason: `HTTP ${res.status}` });
        continue;
      }

      const type = res.headers.get('content-type') || '';
      if (!/^(image|video)\//.test(type)) {
        skipped.push({ url, reason: type ? `unexpected content-type ${type}` : 'no content-type' });
        continue;
      }

      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > MAX_BYTES) {
        skipped.push({ url, reason: `too large (${Math.round(declared / 1024 / 1024)} MB)` });
        continue;
      }

      // Read incrementally: arrayBuffer() would allocate the whole body
      // before the cap could reject it.
      const chunks = [];
      let size = 0;
      let tooBig = false;

      for await (const chunk of res.body) {
        size += chunk.length;
        if (size > MAX_BYTES) {
          tooBig = true;
          break;
        }
        chunks.push(chunk);
      }

      if (tooBig) {
        skipped.push({ url, reason: `exceeded ${Math.round(MAX_BYTES / 1024 / 1024)} MB` });
        continue;
      }

      const buf = Buffer.concat(chunks);

      if (buf.length < MIN_BYTES) {
        skipped.push({ url, reason: `too small (${buf.length} bytes)` });
        continue;
      }

      seq += 1;
      const file = path.join(dir, `${base}-${seq}.${ext}`);
      fs.writeFileSync(file, buf);
      saved.push({ file, kb: Math.round(buf.length / 1024) });
    } catch (err) {
      skipped.push({
        url,
        reason: err.name === 'TimeoutError' ? `timeout after ${FETCH_TIMEOUT_MS}ms` : err.message,
      });
    }
  }

  return { dir, saved, skipped };
}

export function listOutput(limit = 20) {
  if (!fs.existsSync(config.outputDir)) return [];

  // Limit the day folders BEFORE touching any file, so `limit` actually
  // bounds the work instead of only trimming the result.
  const days = fs
    .readdirSync(config.outputDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse()
    .slice(0, limit);

  return days.map((day) => {
    const dir = path.join(config.outputDir, day);
    let entries = [];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return { run: day, images: 0, latest: null, kb: 0 };
    }

    const files = entries
      .filter((e) => e.isFile() && !/-preview\.png$|-video-setup\.png$/.test(e.name))
      .map((e) => e.name)
      .sort();

    let kb = 0;
    for (const f of files) {
      // The file can vanish between readdir and stat; one broken entry must
      // not fail the whole listing.
      try {
        kb += Math.round(fs.statSync(path.join(dir, f)).size / 1024);
      } catch {
        /* skipped */
      }
    }

    return { run: day, images: files.length, latest: files.at(-1) || null, kb };
  });
}