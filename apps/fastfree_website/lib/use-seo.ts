'use client';

import { useEffect } from 'react';
import {
  SITE,
  SITE_URL,
  OG_IMAGE,
  resolvePath,
  resolveDescription,
  resolveTitle,
} from './seo-data';

type Lang = 'ar' | 'en';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, extraAttr: 'hreflang' | null, extraVal: string | null, href: string) {
  let selector = `link[rel="${rel}"]`;
  if (extraAttr && extraVal) selector += `[${extraAttr}="${extraVal}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (extraAttr && extraVal) el.setAttribute(extraAttr, extraVal);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSEOMeta(
  entity_type: 'page' | 'post' | 'product',
  entity_id: string,
  lang: Lang,
  title?: string,
  ogImage?: string,
) {
  useEffect(() => {
    const label = resolveTitle(entity_type, entity_id, lang, title);
    const fullTitle = `${label} | ${SITE}`;
    document.title = fullTitle;

    // Keep the document language attribute in sync with the active locale.
    document.documentElement.lang = lang;

    const path = resolvePath(entity_type, entity_id);
    const canonical = `${SITE_URL}${path}`;
    const description = resolveDescription(entity_type, entity_id, lang, title);
    const ogType = entity_type === 'post' ? 'article' : 'website';
    const ogLocale = lang === 'ar' ? 'ar_SA' : 'en_US';
    const image = ogImage ?? OG_IMAGE;

    // Primary meta
    upsertMeta('name', 'description', description);

    // Canonical (kept for client-side navigations; server sets the
    // locale-prefixed canonical via Next Metadata API).
    upsertLink('canonical', null, null, canonical);

    // Open Graph
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:locale', ogLocale);
    upsertMeta('property', 'og:site_name', SITE);

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    // Best-effort hreflang (server Metadata API emits the authoritative,
    // locale-prefixed alternates for crawler indexing).
    upsertLink('alternate', 'hreflang', 'ar', canonical);
    upsertLink('alternate', 'hreflang', 'en', canonical);
    upsertLink('alternate', 'hreflang', 'x-default', canonical);
  }, [entity_type, entity_id, lang, title, ogImage]);
}
