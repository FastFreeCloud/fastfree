import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const LOGO_PATH = resolve(REPO_ROOT, 'apps/fastfree_website/public/fastfree_logo.png')

const APPS = [
  { key: 'pos', name: 'FastFree POS', color: '#22c55e' },
  { key: 'erp', name: 'FastFree ERP', color: '#3b82f6' },
  { key: 'hr', name: 'FastFree HR', color: '#a855f7' },
  { key: 'ledger', name: 'FastFree Ledger', color: '#f59e0b' },
]

const LOCALES = ['ar', 'en-US']

function loadSharp() {
  const candidates = [
    resolve(REPO_ROOT, 'apps/fastfree_website/node_modules/sharp'),
    resolve(REPO_ROOT, 'node_modules/sharp'),
    'sharp',
  ]
  for (const candidate of candidates) {
    try {
      return require(candidate)
    } catch {
      /* try next candidate */
    }
  }
  throw new Error(
    'sharp not found. Install it first:\n  cd apps/fastfree_website && npm install\nor run:\n  npm install sharp --no-save --prefix scripts\n'
  )
}

function darken(hex, factor = 0.5) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 0xff) * factor)
  const g = Math.round(((n >> 8) & 0xff) * factor)
  const b = Math.round((n & 0xff) * factor)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function featureGraphicSvg(app) {
  const darker = darken(app.color, 0.5)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${app.color}"/>
      <stop offset="100%" stop-color="${darker}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <text x="512" y="452" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="bold" fill="#ffffff" text-anchor="middle" opacity="0.94">${escapeXml(app.name)}</text>
</svg>`
}

function screenshotSvg(app, index) {
  const label = index === 2 ? 'FastFree ' + app.name.split(' ').pop() : app.name
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#000000"/>
  <text x="540" y="920" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>
  <text x="540" y="1010" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="#8a8a8a" text-anchor="middle" dominant-baseline="middle">Screenshot placeholder ${index}</text>
</svg>`
}

async function main() {
  const sharp = loadSharp()
  const logoBuffer = await sharp(LOGO_PATH).resize(350, 350, { fit: 'contain' }).png().toBuffer()
  const logoLeft = Math.round((1024 - 350) / 2)
  const logoTop = 40

  for (const app of APPS) {
    const appRoot = join(REPO_ROOT, 'apps', `fastfree_${app.key}`)
    for (const locale of LOCALES) {
      const imagesDir = join(appRoot, 'fastlane', 'metadata', 'android', locale, 'images')
      const screenshotsDir = join(imagesDir, 'phone-screenshots')
      await mkdir(screenshotsDir, { recursive: true })

      const featurePath = join(imagesDir, 'feature-graphic.png')
      const bg = await sharp(Buffer.from(featureGraphicSvg(app))).png().toBuffer()
      await sharp(bg)
        .composite([{ input: logoBuffer, left: logoLeft, top: logoTop }])
        .png()
        .toFile(featurePath)
      console.log(`[OK] ${featurePath}`)

      for (let i = 1; i <= 2; i++) {
        const screenshotPath = join(screenshotsDir, `${i}.png`)
        await sharp(Buffer.from(screenshotSvg(app, i))).png().toFile(screenshotPath)
        console.log(`[OK] ${screenshotPath}`)
      }
    }
  }
  console.log('Done. Feature graphics + screenshot placeholders generated for all 4 apps.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})