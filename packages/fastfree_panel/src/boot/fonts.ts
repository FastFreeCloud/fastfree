/**
 * Design fonts.
 *
 * design/*.dc.html specifies IBM Plex Sans for the UI, IBM Plex Sans Arabic for
 * Arabic text and IBM Plex Mono for code/values. Only the needed subsets are
 * pulled in: latin for the Latin faces, arabic for the Arabic face.
 *
 * They are imported here rather than through quasar.config `css:` because that
 * array is rewritten to app-relative paths and cannot resolve node_modules
 * packages. This mirrors how fastfree_lowcode loads its own font.
 */
export default async function (): Promise<void> {
  await Promise.all([
    import('@fontsource/ibm-plex-sans/latin-400.css'),
    import('@fontsource/ibm-plex-sans/latin-600.css'),
    import('@fontsource/ibm-plex-sans-arabic/arabic-400.css'),
    import('@fontsource/ibm-plex-sans-arabic/arabic-600.css'),
    import('@fontsource/ibm-plex-mono/latin-400.css'),
  ]);
}