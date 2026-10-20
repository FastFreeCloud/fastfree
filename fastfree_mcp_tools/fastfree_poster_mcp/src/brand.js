/**
 * Brand data for the FastFree apps.
 *
 * This is the single place where an app's name, colours, tagline and public
 * URL live. The poster generator reads from here, so changing a brand colour
 * or a link is a one-line edit that every output inherits.
 */

/** Contact details shown in the poster contact strip. */
export const CONTACT = {
  phone: '+201091999937',
  whatsapp: '+201091999937',
  email: 'sales@fastfree.cloud',
  website: 'fastfree.cloud',
  country: 'مصر',
};

/**
 * One entry per FastFree application.
 *
 * `primary` is the headline colour, `secondary` the deeper shade used for
 * gradients, `accent` the bright highlight used for small details, and
 * `deep` the near-black that anchors the background.
 */
export const APPS = {
  pos: {
    name: 'FastFree POS',
    nameAr: 'فاست فري نقطة البيع',
    tagline: 'نظام الكاشير السريع والمبيعات',
    url: 'https://pos.fastfree.cloud',
    primary: '#E11D48',
    secondary: '#9F1239',
    accent: '#FB7185',
    deep: '#18040A',
  },
  erp: {
    name: 'FastFree ERP',
    nameAr: 'فاست فري للمؤسسات',
    tagline: 'المنظومة المؤسسية وسلاسل الإمداد',
    url: 'https://erp.fastfree.cloud',
    primary: '#D97706',
    secondary: '#B45309',
    accent: '#F59E0B',
    deep: '#170E05',
  },
  ledger: {
    name: 'FastFree Ledger',
    nameAr: 'فاست فري ليدجر',
    tagline: 'محاسبة ومبيعات ومخزون',
    url: 'https://ledger.fastfree.cloud',
    primary: '#0D9488',
    secondary: '#047857',
    accent: '#34D399',
    deep: '#031410',
  },
  panel: {
    name: 'FastFree Panel',
    nameAr: 'لوحة تحكم فاست فري',
    tagline: 'إدارة الخوادم والبنية السحابية',
    url: 'https://panel.fastfree.cloud',
    primary: '#4F46E5',
    secondary: '#3730A3',
    accent: '#818CF8',
    deep: '#080816',
  },
  hr: {
    name: 'FastFree HR',
    nameAr: 'فاست فري الموارد البشرية',
    tagline: 'الموارد البشرية والرواتب',
    url: 'https://hr.fastfree.cloud',
    primary: '#0284C7',
    secondary: '#7C3AED',
    accent: '#C084FC',
    deep: '#08081A',
  },
  website: {
    name: 'FastFree Website',
    nameAr: 'موقع فاست فري',
    tagline: 'بوابتك السحابية الرسمية',
    url: 'https://fastfree.cloud',
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#00F0FF',
    deep: '#0B132B',
  },
};

/**
 * Output sizes for the social formats the platforms actually accept.
 *
 * Sources: Meta's Instagram Platform media reference (4:5 to 1.91:1 range,
 * 320 to 1440 px wide, 8 MB, JPEG) and the 2026 platform size guides for
 * Facebook, LinkedIn and Instagram.
 *
 * The `platforms` list records where each size is safe to publish, so a
 * caller can be told when a chosen size is not a good fit rather than
 * discovering a crop after uploading.
 */
export const RATIOS = {
  '4:5': {
    width: 1080,
    height: 1350,
    label: 'Portrait feed',
    platforms: ['Facebook feed', 'Instagram feed', 'LinkedIn feed', 'Threads'],
    note: 'Best reach in 2026. Takes the most screen space in a mobile feed.',
  },
  '1:1': {
    width: 1080,
    height: 1080,
    label: 'Square',
    platforms: ['Facebook feed', 'Instagram feed', 'LinkedIn feed', 'Instagram carousel'],
    note: 'Safe on every platform. Slightly cropped in the 3:4 profile grid.',
  },
  '1.91:1': {
    width: 1200,
    height: 630,
    label: 'Link preview',
    platforms: ['Facebook link', 'LinkedIn shared link', 'Open Graph', 'X'],
    note: 'Use for link previews. Small in a feed; the Instagram equivalent is 1080x566.',
  },
  '9:16': {
    width: 1080,
    height: 1920,
    label: 'Story',
    platforms: ['Instagram story', 'Facebook story', 'Reels cover'],
    note: 'Keep text clear of the top and bottom 250 px, where the UI overlays sit.',
  },
  '16:9': {
    width: 1920,
    height: 1080,
    label: 'Landscape',
    platforms: ['YouTube', 'X', 'Presentation'],
    note: 'Wide screens. Not an accepted Instagram feed ratio.',
  },
  '3:4': {
    width: 1080,
    height: 1440,
    label: 'Tall feed',
    platforms: ['Instagram feed', 'Facebook feed'],
    note: 'Fills the 3:4 profile grid with no crop.',
  },
};

/** App keys in the order they are advertised. */
export const APP_KEYS = Object.keys(APPS);

/**
 * Look up an app, failing with a message that names the valid options.
 */
export function getApp(appKey) {
  const app = APPS[appKey];
  if (!app) {
    throw new Error(`Unknown app "${appKey}". Valid apps: ${APP_KEYS.join(', ')}`);
  }
  return app;
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
