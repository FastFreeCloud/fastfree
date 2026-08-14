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

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next|api|assets|favicon.ico|fastfree_logo.png|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
