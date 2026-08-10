import { getSharedConfig } from '../shared-config'

function updateMeta(name: string, content: string) {
  const existing = document.querySelector(`meta[name="${name}"]`)
  const el = existing || document.createElement('meta')
  if (!existing) {
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function updateLink(rel: string, href: string, sizes?: string) {
  let selector = `link[rel="${rel}"]`
  if (sizes) selector += `[sizes="${sizes}"]`
  const el = document.querySelector(selector)
  if (el) {
    el.setAttribute('href', href)
  }
}

function generateIconAtSize(logoBase64: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(logoBase64); return }
      const padding = Math.round(size * 0.1)
      const radius = Math.round(size * 0.15)
      ctx.fillStyle = '#1565C0'
      ctx.beginPath()
      ctx.moveTo(padding + radius, padding)
      ctx.lineTo(size - padding - radius, padding)
      ctx.quadraticCurveTo(size - padding, padding, size - padding, padding + radius)
      ctx.lineTo(size - padding, size - padding - radius)
      ctx.quadraticCurveTo(size - padding, size - padding, size - padding - radius, size - padding)
      ctx.lineTo(padding + radius, size - padding)
      ctx.quadraticCurveTo(padding, size - padding, padding, size - padding - radius)
      ctx.lineTo(padding, padding + radius)
      ctx.quadraticCurveTo(padding, padding, padding + radius, padding)
      ctx.closePath()
      ctx.fill()
      const imgSize = size - padding * 2
      ctx.drawImage(img, padding, padding, imgSize, imgSize)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(logoBase64)
    img.src = logoBase64
  })
}

async function updatePWAFromSettings(apiBaseUrl: string, settings: { name?: string; logo?: string }) {
  const appName = settings.name || 'FastFree'
  const shortName = settings.name || 'FastFree'

  document.title = appName
  updateMeta('application-name', appName)
  updateMeta('apple-mobile-web-app-title', shortName)
  updateMeta('apple-mobile-web-app-capable', 'yes')
  updateMeta('theme-color', '#1565C0')
  updateLink('icon', 'icons/icon-128x128.png', '128x128')
  updateLink('icon', 'icons/icon-192x192.png', '192x192')
  updateLink('apple-touch-icon', 'icons/apple-touch-icon-180x180.png', '180x180')

  if (!settings.logo) return

  try {
    const icon192 = await generateIconAtSize(settings.logo, 192)
    const icon512 = await generateIconAtSize(settings.logo, 512)

    updateLink('icon', icon192, '192x192')
    updateLink('icon', icon512, '512x512')
    updateLink('apple-touch-icon', icon512, '180x180')

    const manifest = {
      name: appName,
      short_name: shortName,
      display: 'standalone',
      orientation: 'any',
      background_color: '#0a0e27',
      theme_color: '#1565C0',
      start_url: '/',
      scope: '/',
      lang: 'ar',
      dir: 'rtl',
      icons: [
        { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
    const manifestUrl = URL.createObjectURL(blob)
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      manifestLink.setAttribute('href', manifestUrl)
    }
  } catch (e) {
    console.error('Failed to update PWA from settings:', e)
  }
}

export default function () {
  const cfg = getSharedConfig()
  if (!cfg.pwa?.enabled) return

  const apiBaseUrl = cfg.api?.baseUrl || '/api'

  void fetch(`${apiBaseUrl}/settings-print`)
    .then((res) => res.json())
    .then((data: { name?: string; logo?: string }) => {
      void updatePWAFromSettings(apiBaseUrl, data)
    })
    .catch(() => {})
}
