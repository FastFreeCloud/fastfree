import { NextRequest, NextResponse } from 'next/server';
import type { Locale } from './lib/i18n';

const locales: Locale[] = ['ar', 'en'];
const defaultLocale: Locale = 'ar';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const cookieLocale = req.cookies.get('ff_lang')?.value;
  let locale: Locale = defaultLocale;
  if (cookieLocale === 'ar' || cookieLocale === 'en') {
    locale = cookieLocale;
  } else {
    const accept = (req.headers.get('accept-language') || '').toLowerCase();
    if (accept.startsWith('en')) locale = 'en';
  }

  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'fastfree.cloud';
  let host = rawHost;
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    host = 'fastfree.cloud';
  }

  const redirectUrl = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, `${proto}://${host}`);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    '/((?!_next|api|assets|favicon.ico|fastfree_logo.png|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
