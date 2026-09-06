import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { LanguageProvider } from '@/lib/language-provider';
import { ThemeProvider } from '@/lib/theme-provider';
import SharedNavbar from '@/components/SharedNavbar';
import SharedFooter from '@/components/SharedFooter';
import { getLocaleStaticParams, localeDirection, type Locale } from '@/lib/i18n';
import { SITE, SITE_URL, DEFAULT_DESCRIPTION } from '@/lib/seo-data';

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
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: { 'theme-color': '#030712' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#030712' };

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
    >
      <head>
        <link rel="preconnect" href={SITE_URL} />
        <link rel="dns-prefetch" href={SITE_URL} />
        <link rel="preconnect" href="https://picsum.photos" />
        <link rel="dns-prefetch" href="https://picsum.photos" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
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
