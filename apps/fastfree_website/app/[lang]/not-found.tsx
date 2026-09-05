import Link from 'next/link';

export default async function NotFound({
  params,
}: {
  params?: Promise<{ lang: string }>;
}) {
  let lang = 'ar';
  if (params) {
    try {
      const resolved = await params;
      if (resolved?.lang === 'en' || resolved?.lang === 'ar') {
        lang = resolved.lang;
      }
    } catch {
      // keep default locale fallback
    }
  }
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-white/10 mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
          404
        </div>
        <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--ff-font-heading)' }}>
          الصفحة غير موجودة / Page not found
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها. / Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link
          href={`/${lang}`}
          className="inline-block px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--ff-gradient)' }}
        >
          العودة للرئيسية / Home
        </Link>
      </div>
    </div>
  );
}
