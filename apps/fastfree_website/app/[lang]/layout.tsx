import type { Metadata } from 'next';
import { El_Messiri, Tajawal } from 'next/font/google';
import '../globals.css';
import { LanguageProvider } from '@/lib/language-provider';
import { ThemeProvider } from '@/lib/theme-provider';
import SharedNavbar from '@/components/SharedNavbar';
import SharedFooter from '@/components/SharedFooter';
import { getLocaleStaticParams, localeDirection, type Locale } from '@/lib/i18n';
import { SITE, SITE_URL, DEFAULT_DESCRIPTION } from '@/lib/seo-data';

const elMessiri = El_Messiri({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--ff-font-heading',
  weight: ['400', '500', '600', '700'],
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--ff-font-body',
  weight: ['200', '300', '400', '500', '700', '800', '900'],
});

export function generateStaticParams() {
  return getLocaleStaticParams();
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'FastFree',
  description: DEFAULT_DESCRIPTION.ar,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/fastfree_logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/fastfree_logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/fastfree_logo.png',
    shortcut: '/fastfree_logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: { 'theme-color': '#030712' },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: langParam } = await params;
  const lang = langParam as Locale;
  const dir = localeDirection(lang);

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={`${elMessiri.variable} ${tajawal.variable}`}
    >
      <head>
        <link rel="preconnect" href={SITE_URL} />
        <link rel="dns-prefetch" href={SITE_URL} />
        <link rel="preconnect" href="https://picsum.photos" />
        <link rel="dns-prefetch" href="https://picsum.photos" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="icon" href="/fastfree_logo.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/fastfree_logo.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/fastfree_logo.png" />
        <link rel="shortcut icon" href="/fastfree_logo.png" />
        <meta name="msapplication-TileImage" content="/fastfree_logo.png" />
        <meta name="msapplication-TileColor" content="#030712" />
        <meta name="theme-color" content="#030712" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <a href="#main-content" className="skip-link">
          {lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
        </a>
        <ThemeProvider>
          <LanguageProvider initialLang={lang}>
            <SharedNavbar />
            <main id="main-content">{children}</main>
            <SharedFooter />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
