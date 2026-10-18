import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const BRAND_DIR = path.join(ROOT_DIR, 'brand');
const ASSETS_DIR = path.join(BRAND_DIR, 'assets');
const LOGO_DIR = path.join(ASSETS_DIR, 'logo');
const ICONS_DIR = path.join(ASSETS_DIR, 'icons');
const ADAPTIVE_DIR = path.join(ASSETS_DIR, 'adaptive-icons');
const SPLASH_DIR = path.join(ASSETS_DIR, 'splash');

[LOGO_DIR, ICONS_DIR, ADAPTIVE_DIR, SPLASH_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * 1. Master FastFree Infinity Mark SVG Defs and Elements
 * Recreating the Facebook Logo:
 * - Left Loop: Bronze / Copper textured metal
 * - Right Loop: Silver / Chrome / Titanium textured metal
 * - Center Nexus: Faceted geometric crystalline core glowing cyan / blue (#00F0FF -> #2563EB)
 */
function getInfinitySvgDefs(idPrefix = 'ff') {
  return `
    <defs>
      <!-- Bronze / Copper Gradients for Left Loop -->
      <linearGradient id="${idPrefix}-bronze-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="25%" stop-color="#D97706" />
        <stop offset="50%" stop-color="#92400E" />
        <stop offset="75%" stop-color="#B45309" />
        <stop offset="100%" stop-color="#78350F" />
      </linearGradient>
      <radialGradient id="${idPrefix}-bronze-specular" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#FDE68A" stop-opacity="0.9" />
        <stop offset="30%" stop-color="#F59E0B" stop-opacity="0.6" />
        <stop offset="70%" stop-color="#B45309" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#78350F" stop-opacity="0" />
      </radialGradient>

      <!-- Silver / Chrome Gradients for Right Loop -->
      <linearGradient id="${idPrefix}-silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="20%" stop-color="#E2E8F0" />
        <stop offset="45%" stop-color="#94A3B8" />
        <stop offset="70%" stop-color="#64748B" />
        <stop offset="100%" stop-color="#334155" />
      </linearGradient>
      <radialGradient id="${idPrefix}-silver-specular" cx="65%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
        <stop offset="35%" stop-color="#CBD5E1" stop-opacity="0.5" />
        <stop offset="75%" stop-color="#64748B" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#1E293B" stop-opacity="0" />
      </radialGradient>

      <!-- Radiant Cyan / Blue Crystalline Glow -->
      <radialGradient id="${idPrefix}-nexus-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
        <stop offset="20%" stop-color="#67E8F9" stop-opacity="0.9" />
        <stop offset="45%" stop-color="#00F0FF" stop-opacity="0.8" />
        <stop offset="70%" stop-color="#2563EB" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="${idPrefix}-facet-a" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#A5F3FC" />
        <stop offset="100%" stop-color="#0284C7" />
      </linearGradient>
      <linearGradient id="${idPrefix}-facet-b" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8" />
        <stop offset="100%" stop-color="#1E40AF" />
      </linearGradient>
      <linearGradient id="${idPrefix}-facet-c" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#E0F2FE" />
        <stop offset="100%" stop-color="#0369A1" />
      </linearGradient>

      <!-- Drop Shadows & Glow Filters -->
      <filter id="${idPrefix}-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.45" />
      </filter>
      <filter id="${idPrefix}-neon-bloom" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;
}

/**
 * Generates the geometry for the Infinity symbol.
 * Center is (256, 256), total span approx 410px wide x 210px high.
 * With layered cybernetic plate segments and inner counters.
 */
function getInfinityGeometry(idPrefix = 'ff', scale = 1, cx = 256, cy = 256, showText = true) {
  return `
  <g id="${idPrefix}-infinity-mark" transform="translate(${cx}, ${cy}) scale(${scale}) translate(-256, -256)" filter="url(#${idPrefix}-drop-shadow)">
    <!-- Ambient Connection Circuit Lines behind mark -->
    <g stroke="#38BDF8" stroke-width="1.2" stroke-opacity="0.3" fill="none" stroke-dasharray="3 3">
      <path d="M 60,256 H 120 M 392,256 H 452 M 256,120 V 170 M 256,342 V 392" />
      <circle cx="60" cy="256" r="3" fill="#38BDF8" fill-opacity="0.5" />
      <circle cx="452" cy="256" r="3" fill="#38BDF8" fill-opacity="0.5" />
    </g>

    <!-- LEFT LOOP: Forged Bronze & Copper Cybernetic Ring -->
    <g id="${idPrefix}-left-loop">
      <!-- Outer torus body -->
      <path d="M 256,256 C 220,165 145,150 95,185 C 45,220 38,290 85,335 C 135,380 215,350 256,256 Z"
            fill="url(#${idPrefix}-bronze-grad)" stroke="#92400E" stroke-width="2.5" />
      
      <!-- Sculpted Segment Louvers / Feather Plates on Left Loop -->
      <path d="M 120,175 C 95,190 70,225 70,256 C 70,287 95,322 120,337" 
            fill="none" stroke="#FDE68A" stroke-width="3" stroke-opacity="0.55" />
      <path d="M 145,162 C 110,180 88,220 88,256 C 88,292 110,332 145,350" 
            fill="none" stroke="#F59E0B" stroke-width="2" stroke-opacity="0.4" />
      <path d="M 175,155 C 130,175 106,215 106,256 C 106,297 130,337 175,357" 
            fill="none" stroke="#78350F" stroke-width="2.5" stroke-opacity="0.6" />
      
      <!-- Left Inner Counter (Hole) -->
      <circle cx="150" cy="256" r="48" fill="#0F172A" stroke="#B45309" stroke-width="3" />
      <!-- Specular Rim Glaze -->
      <ellipse cx="130" cy="225" rx="55" ry="32" fill="url(#${idPrefix}-bronze-specular)" />
      
      ${showText ? `
      <!-- "Fast" Inner Typography -->
      <text x="150" y="264" font-family="'Cairo', 'Segoe UI', 'Roboto', sans-serif" font-size="24" font-weight="800"
            fill="#FDE68A" letter-spacing="1" text-anchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">Fast</text>
      ` : ''}
    </g>

    <!-- RIGHT LOOP: Aerospace Silver & Chrome Cybernetic Ring -->
    <g id="${idPrefix}-right-loop">
      <!-- Outer torus body -->
      <path d="M 256,256 C 292,165 367,150 417,185 C 467,220 474,290 427,335 C 377,380 297,350 256,256 Z"
            fill="url(#${idPrefix}-silver-grad)" stroke="#475569" stroke-width="2.5" />
      
      <!-- Sculpted Segment Louvers / Feather Plates on Right Loop -->
      <path d="M 392,175 C 417,190 442,225 442,256 C 442,287 417,322 392,337" 
            fill="none" stroke="#FFFFFF" stroke-width="3" stroke-opacity="0.7" />
      <path d="M 367,162 C 402,180 424,220 424,256 C 424,292 402,332 367,350" 
            fill="none" stroke="#CBD5E1" stroke-width="2" stroke-opacity="0.5" />
      <path d="M 337,155 C 382,175 406,215 406,256 C 406,297 382,337 337,357" 
            fill="none" stroke="#334155" stroke-width="2.5" stroke-opacity="0.6" />
      
      <!-- Right Inner Counter (Hole) -->
      <circle cx="362" cy="256" r="48" fill="#0F172A" stroke="#94A3B8" stroke-width="3" />
      <!-- Specular Rim Glaze -->
      <ellipse cx="382" cy="225" rx="55" ry="32" fill="url(#${idPrefix}-silver-specular)" />
      
      ${showText ? `
      <!-- "Free" Inner Typography -->
      <text x="362" y="264" font-family="'Cairo', 'Segoe UI', 'Roboto', sans-serif" font-size="24" font-weight="800"
            fill="#FFFFFF" letter-spacing="1" text-anchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">Free</text>
      ` : ''}
    </g>

    <!-- CENTER NEXUS: 3D Faceted Stellated Hex-Crystal Core -->
    <g id="${idPrefix}-crystalline-nexus" filter="url(#${idPrefix}-neon-bloom)">
      <!-- Radiant Background Energy Glow -->
      <circle cx="256" cy="256" r="75" fill="url(#${idPrefix}-nexus-glow)" />

      <!-- Faceted Outer Hexagonal Frame -->
      <polygon points="256,192 312,224 312,288 256,320 200,288 200,224"
               fill="#0A192F" stroke="#38BDF8" stroke-width="3" stroke-linejoin="round" />

      <!-- Interlocking Diamond Facets (Sacred Crystalline Symmetry) -->
      <!-- Top Diamond -->
      <polygon points="256,192 284,236 256,256 228,236" fill="url(#${idPrefix}-facet-a)" opacity="0.9" />
      <!-- Bottom Diamond -->
      <polygon points="256,320 284,276 256,256 228,276" fill="url(#${idPrefix}-facet-b)" opacity="0.9" />
      <!-- Top Right Facet -->
      <polygon points="312,224 284,236 256,256 295,256" fill="url(#${idPrefix}-facet-c)" opacity="0.85" />
      <!-- Bottom Right Facet -->
      <polygon points="312,288 284,276 256,256 295,256" fill="url(#${idPrefix}-facet-a)" opacity="0.85" />
      <!-- Bottom Left Facet -->
      <polygon points="200,288 228,276 256,256 217,256" fill="url(#${idPrefix}-facet-b)" opacity="0.85" />
      <!-- Top Left Facet -->
      <polygon points="200,224 228,236 256,256 217,256" fill="url(#${idPrefix}-facet-c)" opacity="0.85" />

      <!-- Facet Boundary Lines -->
      <g stroke="#E0F2FE" stroke-width="1.5" stroke-opacity="0.8">
        <line x1="256" y1="192" x2="256" y2="320" />
        <line x1="200" y1="224" x2="312" y2="288" />
        <line x1="200" y1="288" x2="312" y2="224" />
      </g>

      <!-- Pulsing Singularity Core Light -->
      <circle cx="256" cy="256" r="14" fill="#FFFFFF" />
      <circle cx="256" cy="256" r="24" fill="#00F0FF" fill-opacity="0.5" />
      <!-- 4-Point Sparkle Star -->
      <path d="M 256,234 Q 256,256 234,256 Q 256,256 256,278 Q 256,256 278,256 Q 256,256 256,234 Z" fill="#FFFFFF" />
    </g>

    <!-- Apex Floating Hex Medallion (from Facebook Logo) -->
    <g id="${idPrefix}-apex-crest" transform="translate(256, 110) scale(0.65) translate(-256, -110)">
      <polygon points="256,80 282,95 282,125 256,140 230,125 230,95"
               fill="#1E293B" stroke="#94A3B8" stroke-width="2.5" />
      <circle cx="256" cy="110" r="14" fill="none" stroke="#38BDF8" stroke-width="2" />
      <path d="M 256,98 V 122 M 244,110 H 268" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" />
    </g>
  </g>
  `;
}

/**
 * 2. MASTER LOGO FILES (Standalone Infinity, Horizontal Light, Horizontal Dark)
 */
function generateMasterLogos() {
  // A. Standalone Infinity Mark (512x512)
  const masterMarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="FastFree Infinity Mark">
  ${getInfinitySvgDefs('master')}
  <!-- Dark high-tech foundation backdrop -->
  <rect width="512" height="512" rx="36" fill="#030712" />
  <!-- Subtle PCB Circuit Background Trace -->
  <g stroke="#1E293B" stroke-width="1.5" fill="none">
    <path d="M 40,80 H 140 L 180,120 V 200" />
    <path d="M 472,80 H 372 L 332,120 V 200" />
    <path d="M 40,432 H 140 L 180,392 V 312" />
    <path d="M 472,432 H 372 L 332,392 V 312" />
  </g>
  ${getInfinityGeometry('master', 1.05, 256, 256, true)}
</svg>
  `.trim();

  fs.writeFileSync(path.join(LOGO_DIR, 'fastfree-infinity-mark.svg'), masterMarkSvg, 'utf8');

  // B. Master Horizontal Logo - Dark Background (800x260)
  const masterHorizontalDarkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 260" width="800" height="260" role="img" aria-label="FastFree Logo">
  ${getInfinitySvgDefs('h-dark')}
  <rect width="800" height="260" rx="20" fill="#030712" />
  <!-- Infinity Mark on Left (scaled) -->
  ${getInfinityGeometry('h-dark', 0.65, 140, 130, false)}

  <!-- Brand Typography -->
  <g transform="translate(300, 115)">
    <!-- Wordmark -->
    <text x="0" y="0" font-family="'Cairo', 'Segoe UI', 'Roboto', sans-serif" font-size="68" font-weight="900" letter-spacing="-1">
      <tspan fill="#F59E0B">Fast</tspan><tspan fill="#F8FAFC">Free</tspan>
    </text>
    <!-- Cyan Dot Accent -->
    <circle cx="280" cy="-14" r="8" fill="#00F0FF" />

    <!-- English Tagline -->
    <text x="4" y="38" font-family="'Roboto', sans-serif" font-size="16" font-weight="600" fill="#94A3B8" letter-spacing="3">
      SOVEREIGN BUSINESS ARCHITECTURE
    </text>
    <!-- Arabic Subtitle -->
    <text x="4" y="74" font-family="'Cairo', 'Segoe UI', sans-serif" font-size="22" font-weight="700" fill="#38BDF8">
      السحابة السيادية والأنظمة المؤسسية الذكية
    </text>
  </g>
</svg>
  `.trim();

  fs.writeFileSync(path.join(LOGO_DIR, 'fastfree-brand-logo-dark.svg'), masterHorizontalDarkSvg, 'utf8');

  // C. Master Horizontal Logo - Light Background (800x260)
  const masterHorizontalLightSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 260" width="800" height="260" role="img" aria-label="FastFree Logo Light">
  ${getInfinitySvgDefs('h-light')}
  <rect width="800" height="260" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />
  ${getInfinityGeometry('h-light', 0.65, 140, 130, false)}

  <g transform="translate(300, 115)">
    <text x="0" y="0" font-family="'Cairo', 'Segoe UI', 'Roboto', sans-serif" font-size="68" font-weight="900" letter-spacing="-1">
      <tspan fill="#D97706">Fast</tspan><tspan fill="#0F172A">Free</tspan>
    </text>
    <circle cx="280" cy="-14" r="8" fill="#0284C7" />

    <text x="4" y="38" font-family="'Roboto', sans-serif" font-size="16" font-weight="600" fill="#64748B" letter-spacing="3">
      SOVEREIGN BUSINESS ARCHITECTURE
    </text>
    <text x="4" y="74" font-family="'Cairo', 'Segoe UI', sans-serif" font-size="22" font-weight="700" fill="#0284C7">
      السحابة السيادية والأنظمة المؤسسية الذكية
    </text>
  </g>
</svg>
  `.trim();

  fs.writeFileSync(path.join(LOGO_DIR, 'fastfree-brand-logo-light.svg'), masterHorizontalLightSvg, 'utf8');
}

/**
 * App Configuration Matrix with Specified High-Converting Colors
 */
const APPS = [
  {
    key: 'website',
    name: 'FastFree Website',
    nameAr: 'موقع فاست فري الرسمي',
    subTitle: 'Marketing & Sovereign SaaS Portal',
    subTitleAr: 'البوابة السحابية الرسمية والتطبيقات المؤسسية',
    primaryColor: '#2563EB',     // Electric Azure
    secondaryColor: '#1D4ED8',   // Royal Blue
    accentColor: '#00F0FF',      // Luminous Cyan
    bgDark: '#0B132B',
    glyphSvg: `
      <!-- Global SaaS Web Globe / Orbital Rings Glyph -->
      <circle cx="256" cy="385" r="32" fill="none" stroke="#60A5FA" stroke-width="3" />
      <ellipse cx="256" cy="385" rx="32" ry="12" fill="none" stroke="#93C5FD" stroke-width="2" />
      <line x1="256" y1="353" x2="256" y2="417" stroke="#93C5FD" stroke-width="2" />
      <circle cx="256" cy="385" r="6" fill="#00F0FF" />
    `,
  },
  {
    key: 'panel',
    name: 'FastFree Panel',
    nameAr: 'لوحة تحكم فاست فري',
    subTitle: 'Clan DevOps & Fleet Operations',
    subTitleAr: 'إدارة خوادم كلان والبنية السحابية المؤتمتة',
    primaryColor: '#4F46E5',     // Cyber Indigo
    secondaryColor: '#3730A3',   // Deep Violet
    accentColor: '#818CF8',      // Neon Iris
    bgDark: '#080816',
    glyphSvg: `
      <!-- Server Node Rack & Clan Telemetry Shield Glyph -->
      <rect x="226" y="360" width="60" height="14" rx="4" fill="#312E81" stroke="#818CF8" stroke-width="2" />
      <rect x="226" y="380" width="60" height="14" rx="4" fill="#312E81" stroke="#818CF8" stroke-width="2" />
      <rect x="226" y="400" width="60" height="14" rx="4" fill="#312E81" stroke="#818CF8" stroke-width="2" />
      <circle cx="236" cy="367" r="2.5" fill="#34D399" />
      <circle cx="244" cy="367" r="2.5" fill="#38BDF8" />
      <circle cx="236" cy="387" r="2.5" fill="#34D399" />
      <circle cx="244" cy="387" r="2.5" fill="#818CF8" />
      <circle cx="236" cy="407" r="2.5" fill="#34D399" />
      <circle cx="244" cy="407" r="2.5" fill="#F43F5E" />
    `,
  },
  {
    key: 'ledger',
    name: 'FastFree Ledger',
    nameAr: 'فاست فري ليدجر',
    subTitle: 'Accounting, Sales & Inventory',
    subTitleAr: 'دفاتر محاسبية معتمدة ومخزون ومبيعات سيادية',
    primaryColor: '#0D9488',     // Emerald Mint
    secondaryColor: '#047857',   // Jade Pine
    accentColor: '#34D399',      // Mint Spark
    bgDark: '#031410',
    glyphSvg: `
      <!-- Double-Entry Scales & Growth Trendline Glyph -->
      <g stroke="#34D399" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 230,405 L 246,380 L 262,392 L 282,365" />
        <polyline points="274,365 282,365 282,373" stroke-width="2.5" fill="none" />
        <line x1="225" y1="412" x2="287" y2="412" stroke="#0D9488" stroke-width="3" />
      </g>
    `,
  },
  {
    key: 'erp',
    name: 'FastFree ERP',
    nameAr: 'فاست فري للمؤسسات',
    subTitle: 'Enterprise Operations & Supply Chain',
    subTitleAr: 'المنظومة المؤسسية الكبرى وسلاسل الإمداد والتصنيع',
    primaryColor: '#D97706',     // Titanium Bronze
    secondaryColor: '#B45309',   // Amber Gold
    accentColor: '#F59E0B',      // Warm Citrine
    bgDark: '#170E05',
    glyphSvg: `
      <!-- Interlocking Enterprise Gears & Apex Hierarchy Glyph -->
      <g stroke="#F59E0B" stroke-width="2.5" fill="none">
        <circle cx="244" cy="385" r="14" stroke-dasharray="6 3" stroke-width="3" />
        <circle cx="268" cy="395" r="11" stroke-dasharray="5 3" stroke-width="2.5" stroke="#FDE68A" />
        <circle cx="244" cy="385" r="4" fill="#F59E0B" />
        <circle cx="268" cy="395" r="3" fill="#FDE68A" />
      </g>
    `,
  },
  {
    key: 'pos',
    name: 'FastFree POS',
    nameAr: 'فاست فري نقطة البيع',
    subTitle: 'Point of Sale & Retail Counter',
    subTitleAr: 'نظام الكاشير السريع والمبيعات والتجزئة اللحظية',
    primaryColor: '#E11D48',     // High-Energy Coral
    secondaryColor: '#9F1239',   // Crimson Blaze
    accentColor: '#FB7185',      // Neon Flash
    bgDark: '#18040A',
    glyphSvg: `
      <!-- High-Speed Barcode Beam & Lightning Checkout Glyph -->
      <g stroke="#FB7185" stroke-width="2" fill="none">
        <line x1="228" y1="372" x2="228" y2="408" stroke-width="3" />
        <line x1="235" y1="372" x2="235" y2="408" stroke-width="1.5" />
        <line x1="240" y1="372" x2="240" y2="408" stroke-width="4" />
        <line x1="248" y1="372" x2="248" y2="408" stroke-width="2" />
        <line x1="255" y1="372" x2="255" y2="408" stroke-width="3.5" />
        <line x1="263" y1="372" x2="263" y2="408" stroke-width="1" />
        <line x1="270" y1="372" x2="270" y2="408" stroke-width="3" />
        <line x1="277" y1="372" x2="277" y2="408" stroke-width="2" />
        <line x1="284" y1="372" x2="284" y2="408" stroke-width="4" />
        <!-- Red Laser Beam Scan Line -->
        <line x1="220" y1="390" x2="292" y2="390" stroke="#FFE4E6" stroke-width="2.5" />
      </g>
    `,
  },
  {
    key: 'hr',
    name: 'FastFree HR',
    nameAr: 'فاست فري الموارد البشرية',
    subTitle: 'Human Resources & Automated Payroll',
    subTitleAr: 'إدارة شؤون الموظفين والرواتب والخدمة الذاتية',
    primaryColor: '#0284C7',     // Sapphire Sky
    secondaryColor: '#7C3AED',   // Royal Amethyst
    accentColor: '#C084FC',      // Radiant Lilac
    bgDark: '#08081A',
    glyphSvg: `
      <!-- Human Capital Keystone & Collaborative Talent Glyph -->
      <g stroke="#C084FC" stroke-width="2" fill="none">
        <circle cx="256" cy="374" r="8" fill="#38BDF8" stroke="none" />
        <path d="M 240,404 C 240,392 248,388 256,388 C 264,388 272,392 272,404" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" />
        <!-- Flanking collaborative nodes -->
        <circle cx="232" cy="382" r="5" fill="#C084FC" stroke="none" opacity="0.8" />
        <path d="M 222,406 C 222,397 227,395 232,395" stroke="#C084FC" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="280" cy="382" r="5" fill="#C084FC" stroke="none" opacity="0.8" />
        <path d="M 290,406 C 290,397 285,395 280,395" stroke="#C084FC" stroke-width="1.8" stroke-linecap="round" />
      </g>
    `,
  },
];

/**
 * 3. APP ICONS (512x512 PNG/SVG Standard)
 */
function generateAppIcons() {
  APPS.forEach((app) => {
    const id = `icon-${app.key}`;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${app.name} Icon">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="${id}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${app.bgDark}" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- App Brand Rim Gradient -->
    <linearGradient id="${id}-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${app.primaryColor}" />
      <stop offset="50%" stop-color="${app.accentColor}" />
      <stop offset="100%" stop-color="${app.secondaryColor}" />
    </linearGradient>

    <radialGradient id="${id}-radial-glow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${app.primaryColor}" stop-opacity="0.25" />
      <stop offset="60%" stop-color="${app.secondaryColor}" stop-opacity="0.08" />
      <stop offset="100%" stop-color="${app.bgDark}" stop-opacity="0" />
    </radialGradient>
  </defs>

  ${getInfinitySvgDefs(id)}

  <!-- Base Rounded Container -->
  <rect x="8" y="8" width="496" height="496" rx="108" fill="url(#${id}-bg)" stroke="url(#${id}-rim)" stroke-width="4" />
  <rect x="8" y="8" width="496" height="496" rx="108" fill="url(#${id}-radial-glow)" />

  <!-- Corner Tech Accents -->
  <g stroke="${app.primaryColor}" stroke-opacity="0.3" stroke-width="2" fill="none">
    <path d="M 40,80 H 70 V 50" />
    <path d="M 472,80 H 442 V 50" />
    <path d="M 40,432 H 70 V 462" />
    <path d="M 472,432 H 442 V 462" />
  </g>

  <!-- Scaled FastFree Infinity Symbol -->
  ${getInfinityGeometry(id, 0.78, 256, 215, true)}

  <!-- App Specific Glyph Container & Icon -->
  <g id="${id}-app-badge">
    <rect x="186" y="342" width="140" height="88" rx="18" fill="#030712" fill-opacity="0.9"
          stroke="url(#${id}-rim)" stroke-width="2.5" />
    ${app.glyphSvg}
  </g>

  <!-- App Title Pill -->
  <text x="256" y="475" font-family="'Cairo', 'Segoe UI', 'Roboto', sans-serif" font-size="20" font-weight="800"
        fill="#F8FAFC" text-anchor="middle" letter-spacing="1">
    ${app.name.toUpperCase()}
  </text>
</svg>
    `.trim();

    fs.writeFileSync(path.join(ICONS_DIR, `icon-${app.key}.svg`), svg, 'utf8');
  });
}

/**
 * 4. ANDROID ADAPTIVE ICONS (432x432 Canvas, Safe Zone 108dp viewport)
 * Layers:
 * - ic_launcher_background.svg (432x432)
 * - ic_launcher_foreground.svg (432x432 with artwork strictly inside central circle r=130)
 */
function generateAdaptiveIcons() {
  APPS.forEach((app) => {
    const id = `adapt-${app.key}`;

    // A. Background Layer
    const bgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" width="432" height="432">
  <defs>
    <linearGradient id="${id}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${app.bgDark}" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="${id}-bg-radial" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="${app.primaryColor}" stop-opacity="0.35" />
      <stop offset="60%" stop-color="${app.secondaryColor}" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <pattern id="${id}-grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${app.primaryColor}" stroke-opacity="0.08" stroke-width="1" />
    </pattern>
  </defs>

  <rect width="432" height="432" fill="url(#${id}-bg)" />
  <rect width="432" height="432" fill="url(#${id}-grid)" />
  <rect width="432" height="432" fill="url(#${id}-bg-radial)" />
</svg>
    `.trim();

    fs.writeFileSync(path.join(ADAPTIVE_DIR, `adaptive-${app.key}-bg.svg`), bgSvg, 'utf8');

    // B. Foreground Layer (Centered within 260px safe circle at 216, 216)
    const fgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" width="432" height="432">
  ${getInfinitySvgDefs(id)}
  <!-- Centered strictly inside Android Adaptive Safe Viewport (center 216, 216) -->
  <g transform="translate(216, 200) scale(0.68) translate(-256, -256)">
    ${getInfinityGeometry(id, 1, 256, 256, false)}
  </g>
  <!-- Dedicated App Glyph centered below infinity nexus inside safe circle -->
  <g transform="translate(216, 290) scale(0.85) translate(-256, -385)">
    <circle cx="256" cy="385" r="28" fill="#030712" stroke="${app.primaryColor}" stroke-width="2.5" />
    ${app.glyphSvg}
  </g>
</svg>
    `.trim();

    fs.writeFileSync(path.join(ADAPTIVE_DIR, `adaptive-${app.key}-fg.svg`), fgSvg, 'utf8');
  });
}

/**
 * 5. FULL HD SPLASH SCREENS (1920x1080 Landscape Desktop/Web & 1080x1920 Portrait Mobile)
 */
function generateSplashScreens() {
  APPS.forEach((app) => {
    const idL = `splash-land-${app.key}`;

    // A. 1920x1080 Landscape
    const splashLandscapeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080" role="img" aria-label="${app.name} Splash Screen">
  <defs>
    <!-- Deep Atmospheric Cosmic Void Background -->
    <linearGradient id="${idL}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="40%" stop-color="${app.bgDark}" />
      <stop offset="100%" stop-color="#010409" />
    </linearGradient>

    <!-- Core App Ambient Glow -->
    <radialGradient id="${idL}-ambient-glow" cx="50%" cy="42%" r="50%">
      <stop offset="0%" stop-color="${app.primaryColor}" stop-opacity="0.32" />
      <stop offset="45%" stop-color="${app.secondaryColor}" stop-opacity="0.12" />
      <stop offset="85%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Tech Grid Pattern -->
    <pattern id="${idL}-grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38BDF8" stroke-opacity="0.04" stroke-width="1.2" />
      <circle cx="60" cy="60" r="1.5" fill="#38BDF8" fill-opacity="0.1" />
    </pattern>

    <!-- Title Gradient -->
    <linearGradient id="${idL}-title-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="60%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="${app.accentColor}" />
    </linearGradient>
  </defs>

  ${getInfinitySvgDefs(idL)}

  <!-- Canvas Background -->
  <rect width="1920" height="1080" fill="url(#${idL}-bg)" />
  <rect width="1920" height="1080" fill="url(#${idL}-grid)" />
  <rect width="1920" height="1080" fill="url(#${idL}-ambient-glow)" />

  <!-- Circuit Constellation Lines -->
  <g stroke="${app.primaryColor}" stroke-opacity="0.2" stroke-width="1.5" fill="none">
    <path d="M 200,540 H 550 L 680,450" />
    <path d="M 1720,540 H 1370 L 1240,450" />
    <circle cx="200" cy="540" r="4" fill="${app.primaryColor}" />
    <circle cx="1720" cy="540" r="4" fill="${app.primaryColor}" />
  </g>

  <!-- Large Central FastFree Infinity Master Mark -->
  ${getInfinityGeometry(idL, 1.45, 960, 420, true)}

  <!-- Content Hierarchy (Bilingual Typography) -->
  <g transform="translate(960, 680)" text-anchor="middle">
    <!-- App Brand English Headline -->
    <text x="0" y="0" font-family="'Cairo', 'Segoe UI', 'Roboto', sans-serif" font-size="64" font-weight="900"
          fill="url(#${idL}-title-grad)" letter-spacing="2">
      ${app.name}
    </text>

    <!-- App Brand Arabic Headline -->
    <text x="0" y="55" font-family="'Cairo', 'Segoe UI', Tahoma, sans-serif" font-size="36" font-weight="700"
          fill="${app.accentColor}">
      ${app.nameAr}
    </text>

    <!-- Subtitle / Tagline Pill -->
    <text x="0" y="105" font-family="'Roboto', sans-serif" font-size="20" font-weight="500" fill="#94A3B8" letter-spacing="4">
      ${app.subTitle.toUpperCase()}
    </text>
    <text x="0" y="138" font-family="'Cairo', sans-serif" font-size="19" font-weight="600" fill="#64748B">
      ${app.subTitleAr}
    </text>

    <!-- Loading Bar Indicator -->
    <g transform="translate(-160, 180)">
      <rect x="0" y="0" width="320" height="6" rx="3" fill="#1E293B" />
      <rect x="0" y="0" width="140" height="6" rx="3" fill="${app.primaryColor}">
        <animate attributeName="x" from="-140" to="320" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  </g>

  <!-- Sovereign Clan Ecosystem Footer -->
  <g transform="translate(960, 1020)" text-anchor="middle">
    <text x="0" y="0" font-family="'Roboto', sans-serif" font-size="15" font-weight="500" fill="#475569" letter-spacing="3">
      FASTFREE.CLOUD · SOVEREIGN CLAN ECOSYSTEM · REPRODUCIBLE NIXOS DEPLOYMENTS
    </text>
  </g>
</svg>
    `.trim();

    fs.writeFileSync(path.join(SPLASH_DIR, `splash-${app.key}-1080p.svg`), splashLandscapeSvg, 'utf8');

    // B. 1080x1920 Mobile Portrait
    const idP = `splash-port-${app.key}`;
    const splashPortraitSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920" role="img" aria-label="${app.name} Mobile Splash Screen">
  <defs>
    <linearGradient id="${idP}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="40%" stop-color="${app.bgDark}" />
      <stop offset="100%" stop-color="#010409" />
    </linearGradient>
    <radialGradient id="${idP}-ambient-glow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${app.primaryColor}" stop-opacity="0.35" />
      <stop offset="50%" stop-color="${app.secondaryColor}" stop-opacity="0.12" />
      <stop offset="90%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <pattern id="${idP}-grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#38BDF8" stroke-opacity="0.04" stroke-width="1.2" />
    </pattern>
    <linearGradient id="${idP}-title-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="60%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="${app.accentColor}" />
    </linearGradient>
  </defs>

  ${getInfinitySvgDefs(idP)}

  <rect width="1080" height="1920" fill="url(#${idP}-bg)" />
  <rect width="1080" height="1920" fill="url(#${idP}-grid)" />
  <rect width="1080" height="1920" fill="url(#${idP}-ambient-glow)" />

  <!-- Infinity Mark Centered for Mobile Viewport -->
  ${getInfinityGeometry(idP, 1.35, 540, 750, true)}

  <!-- Mobile Typography Stack -->
  <g transform="translate(540, 1120)" text-anchor="middle">
    <text x="0" y="0" font-family="'Cairo', 'Segoe UI', 'Roboto', sans-serif" font-size="56" font-weight="900"
          fill="url(#${idP}-title-grad)" letter-spacing="1">
      ${app.name}
    </text>

    <text x="0" y="55" font-family="'Cairo', 'Segoe UI', Tahoma, sans-serif" font-size="34" font-weight="700"
          fill="${app.accentColor}">
      ${app.nameAr}
    </text>

    <text x="0" y="110" font-family="'Roboto', sans-serif" font-size="18" font-weight="500" fill="#94A3B8" letter-spacing="3">
      ${app.subTitle.toUpperCase()}
    </text>

    <text x="0" y="148" font-family="'Cairo', sans-serif" font-size="18" font-weight="600" fill="#64748B">
      ${app.subTitleAr}
    </text>

    <!-- Animated Loading Bar -->
    <g transform="translate(-140, 200)">
      <rect x="0" y="0" width="280" height="6" rx="3" fill="#1E293B" />
      <rect x="0" y="0" width="100" height="6" rx="3" fill="${app.primaryColor}">
        <animate attributeName="x" from="-100" to="280" dur="2s" repeatCount="indefinite" />
      </rect>
    </g>
  </g>

  <!-- Mobile Footer -->
  <g transform="translate(540, 1820)" text-anchor="middle">
    <text x="0" y="0" font-family="'Roboto', sans-serif" font-size="16" font-weight="500" fill="#475569" letter-spacing="2">
      FASTFREE.CLOUD · SOVEREIGN ARCHITECTURE
    </text>
  </g>
</svg>
    `.trim();

    fs.writeFileSync(path.join(SPLASH_DIR, `splash-${app.key}-portrait.svg`), splashPortraitSvg, 'utf8');
  });
}

/**
 * 6. Copy assets to website public folder so they can be immediately served
 */
function syncToWebsite() {
  const webTargetDir = path.join(ROOT_DIR, 'apps', 'fastfree_website', 'public', 'assets', 'brand-system');
  if (!fs.existsSync(webTargetDir)) fs.mkdirSync(webTargetDir, { recursive: true });

  // Copy all generated SVG files
  const allGenerated = [
    ...fs.readdirSync(LOGO_DIR).map((f) => path.join(LOGO_DIR, f)),
    ...fs.readdirSync(ICONS_DIR).map((f) => path.join(ICONS_DIR, f)),
    ...fs.readdirSync(ADAPTIVE_DIR).map((f) => path.join(ADAPTIVE_DIR, f)),
    ...fs.readdirSync(SPLASH_DIR).map((f) => path.join(SPLASH_DIR, f)),
  ];

  allGenerated.forEach((filePath) => {
    const dest = path.join(webTargetDir, path.basename(filePath));
    fs.copyFileSync(filePath, dest);
  });

  console.log(`Successfully synced ${allGenerated.length} brand SVG assets to ${webTargetDir}`);
}

/**
 * 7. Copy individual assets to each app's public folder
 */
function syncToApps() {
  APPS.forEach((app) => {
    const appDir = path.join(ROOT_DIR, 'apps', `fastfree_${app.key}`);
    if (fs.existsSync(appDir)) {
      const publicDir = path.join(appDir, 'public');
      const iconsDir = path.join(publicDir, 'icons');
      if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

      // Copy dedicated icon
      fs.copyFileSync(
        path.join(ICONS_DIR, `icon-${app.key}.svg`),
        path.join(iconsDir, 'app-icon.svg'),
      );
      // Copy adaptive icons
      fs.copyFileSync(
        path.join(ADAPTIVE_DIR, `adaptive-${app.key}-bg.svg`),
        path.join(iconsDir, 'adaptive-icon-bg.svg'),
      );
      fs.copyFileSync(
        path.join(ADAPTIVE_DIR, `adaptive-${app.key}-fg.svg`),
        path.join(iconsDir, 'adaptive-icon-fg.svg'),
      );
      // Copy splash screens
      fs.copyFileSync(
        path.join(SPLASH_DIR, `splash-${app.key}-1080p.svg`),
        path.join(publicDir, 'splash-1080p.svg'),
      );
      fs.copyFileSync(
        path.join(SPLASH_DIR, `splash-${app.key}-portrait.svg`),
        path.join(publicDir, 'splash-portrait.svg'),
      );
      console.log(`Synced dedicated brand assets to apps/fastfree_${app.key}/public`);
    }
  });
}

// Execute Generation Pipeline
console.log('Generating Master Infinity Logos...');
generateMasterLogos();

console.log('Generating App Icons (512x512)...');
generateAppIcons();

console.log('Generating Android Adaptive Icons (432x432)...');
generateAdaptiveIcons();

console.log('Generating Full HD & Mobile Splash Screens...');
generateSplashScreens();

console.log('Syncing assets to apps/fastfree_website/public/assets/brand-system...');
syncToWebsite();

console.log('Syncing dedicated assets to each app...');
syncToApps();

console.log('Brand Asset Pipeline Complete!');
