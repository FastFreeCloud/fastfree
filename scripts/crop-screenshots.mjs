#!/usr/bin/env node
/**
 * Crop & normalise screenshots for Google Play Store upload.
 *
 * Usage:
 *   node scripts/crop-screenshots.mjs <app> <localeDir>
 *
 *   app       – pos | erp | hr | ledger
 *   localeDir – ar | en-US
 *
 * Reads every *.png from
 *   apps/<app>/fastlane/metadata/android/<localeDir>/images/phone-screenshots/
 * and overwrites them in-place, ensuring:
 *   • max 2:1 aspect ratio (1080 × 1920)
 *   • 24-bit PNG, no alpha, compression 9
 */

import { readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const MAX_W = 1080
const MAX_H = 1920

async function main() {
  const [, , app, localeDir] = process.argv

  if (!app || !localeDir) {
    console.error('Usage: node scripts/crop-screenshots.mjs <app> <localeDir>')
    process.exit(1)
  }

  const dir = join(
    process.cwd(),
    'apps', app,
    'fastlane', 'metadata', 'android', localeDir,
    'images', 'phone-screenshots',
  )

  let files
  try {
    files = (await readdir(dir)).filter(f => extname(f).toLowerCase() === '.png')
  } catch (err) {
    console.error(`Cannot read directory: ${dir}`)
    console.error(err.message)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log(`No PNG files in ${dir}`)
    return
  }

  console.log(`Processing ${files.length} file(s) in ${dir}`)

  for (const file of files) {
    const filePath = join(dir, file)
    const meta = await sharp(filePath).metadata()
    const origW = meta.width
    const origH = meta.height

    // Start from original size, cap to Play limits
    let w = origW
    let h = origH

    if (w > MAX_W || h > MAX_H) {
      const scale = Math.min(MAX_W / w, MAX_H / h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }

    // Enforce max 2:1 aspect ratio (largest ≤ 2× smallest)
    if (w > h) {
      const maxW = h * 2
      if (w > maxW) w = maxW
    } else {
      const maxH = w * 2
      if (h > maxH) h = maxH
    }

    // Center-crop to the target box (no upscaling)
    const left = Math.max(0, Math.round((origW - w) / 2))
    const top = Math.max(0, Math.round((origH - h) / 2))

    await sharp(filePath)
      .extract({ left, top, width: w, height: h })
      .png({ compressionLevel: 9, palette: false })
      .toFile(filePath)

    const outMeta = await sharp(filePath).metadata()
    console.log(
      `  ${file}: ${origW}×${origH} → ${outMeta.width}×${outMeta.height} (${outMeta.size} bytes)`,
    )
  }

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
