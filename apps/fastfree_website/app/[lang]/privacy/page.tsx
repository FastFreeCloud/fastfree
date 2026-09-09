import type { Metadata } from 'next';
import { SITE, SITE_URL, OG_IMAGE } from '@/lib/seo-data';
import { localeOG, type Locale } from '@/lib/i18n';

const LAST_UPDATED = 'September 2026';

const TITLES = { ar: 'سياسة الخصوصية', en: 'Privacy Policy' };
const DESCRIPTIONS = {
  ar: 'سياسة الخصوصية لـ FastFree Cloud — كيف نجمع ونستخدم ونحمي بياناتك.',
  en: 'FastFree Cloud Privacy Policy — how we collect, use, and protect your data.',
};

export async function generateStaticParams() {
  return [{ lang: 'ar' }, { lang: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang as Locale;
  const title = `${TITLES[l]} | ${SITE}`;
  const description = DESCRIPTIONS[l];
  const canonical = `${SITE_URL}/${l}/privacy`;
  const languages = { ar: `${SITE_URL}/ar/privacy`, en: `${SITE_URL}/en/privacy`, 'x-default': `${SITE_URL}/ar/privacy` };

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE,
      locale: localeOG(l),
      type: 'website',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE] },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = lang as Locale;
  const isAr = l === 'ar';

  const sections = isAr ? sectionsAr : sectionsEn;

  return (
    <div
      className="min-h-screen bg-[#030712] text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712]"
      style={{ fontFamily: 'var(--ff-font-body)' }}
    >
      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden text-center bg-[#030712]">
        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4"
            style={{ fontFamily: 'var(--ff-font-heading)' }}
          >
            {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isAr ? `آخر تحديث: ${LAST_UPDATED}` : `Last updated: ${LAST_UPDATED}`}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="space-y-10 text-slate-300 leading-relaxed text-sm" dir={isAr ? 'rtl' : 'ltr'}>
          {sections.map((section, i) => (
            <div key={i}>
              <h2
                className="text-lg font-bold text-white mb-3"
                style={{ fontFamily: 'var(--ff-font-heading)' }}
              >
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {section.list && (
                  <ul className="list-disc ps-5 space-y-1 mt-2">
                    {section.list.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}

          <div className="pt-6 border-t border-white/10">
            <p className="text-slate-400 text-xs">
              {isAr
                ? 'لأي استفسارات حول هذه السياسة، يرجى التواصل معنا على admin@fastfree.cloud'
                : 'For any questions about this policy, please contact us at admin@fastfree.cloud'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────── Arabic Content ───────────────────── */

const sectionsAr: { title: string; paragraphs: string[]; list?: string[] }[] = [
  {
    title: '1. مقدمة',
    paragraphs: [
      'مرحباً بك في FastFree Cloud ("الشركة"، "نحن"، "لدينا"). نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. تشرح هذه السياسة كيف نجمع ونستخدم ونخزّن ونحمي معلوماتك عند استخدامك لمواقعنا وخدماتنا.',
      'باستخدامك لخدماتنا، أنت توافق على جمع واستخدام المعلومات وفقاً لسياسة الخصوصية هذه. إذا كنت لا توافق، يرجى التوقف عن استخدام خدماتنا.',
    ],
  },
  {
    title: '2. البيانات التي نجمعها',
    paragraphs: ['قد نجمع أنواعاً مختلفة من البيانات الشخصية:'],
    list: [
      'بيانات التعريف: الاسم، عنوان البريد الإلكتروني، رقم الهاتف، العنوان البريدي، والمعلومات الاحترافية (الشركة، المسمى الوظيفي).',
      'بيانات الحساب: اسم المستخدم وكلمة المرور (مشفّرة)، وتفضيلات الحساب، وإعدادات اللغة.',
      'بيانات المعاملات: تفاصيل الفواتير والاشتراكات، وسجل المعاملات المالية المرتبطة بخدماتنا.',
      'بيانات الاستخدام: عنوان IP، نوع المتصفح، نظام التشغيل، صفحات الموقع التي قمت بزيارتها، مدة الزيارة، وأوقات الوصول.',
      'الكوكيز وتقنيات التتبع: ملفات تعريف الارتباط والتخزين المحلي وتقنيات التتبع المماثلة.',
    ],
  },
  {
    title: '3. كيف نستخدم بياناتك',
    paragraphs: ['نستخدم البيانات المجمّعة للأغراض التالية:'],
    list: [
      'تقديم وتشغيل وصيانة خدماتنا ومنصاتنا البرمجية.',
      'تحسين وتطوير تجربتك وخصائص خدماتنا.',
      'التواصل معك بخصوص حسابك أو تحديثات الخدمات أو العروض الترويجية (بموافقتك مسبقاً حيثما يقتضي القانون).',
      'معالجة المعاملات المالية وإصدار الفواتير والاشتراكات.',
      'ضمان الأمان ومنع الاحتيال وحماية حقوقنا القانونية.',
      'الامتثال للالتزامات القانونية والتنظيمية المعمول بها.',
      'إعداد تقارير وتحليلات مجمّعة لا تحدّد هوية الأفراد لتحسين خدماتنا.',
    ],
  },
  {
    title: '4. مشاركة البيانات مع أطراف ثالثة',
    paragraphs: [
      'لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية:',
    ],
    list: [
      'مزودي الخدمات: شركاء موثوقون يساعدوننا في تشغيل خدماتنا (استضافة السحابة، معالجة الدفع، خدمات البريد الإلكتروني)، وهم ملزمون بعقود سرية.',
      'الالتزامات القانونية: عندما نطلب ذلك بموجب أمر قضائي أو التزام قانوني أو لحماية حقوقنا وسلامة مستخدمينا.',
      'الاندماج أو الاستحواذ: في حال حدث اندماج أو استحواذ أو بيع لأصول الشركة، قد تُنقل البيانات مع الحفاظ على نفس مستوى الحماية.',
      'بموافقتك الصريحة: في أي حالة أخرى نطلب موافقتك المسبقة قبل المشاركة.',
    ],
  },
  {
    title: '5. تخزين البيانات وأمنها',
    paragraphs: [
      'نخزّن بياناتك على خوادم آمنة تستخدم تشفير SSL/TLS أثناء النقل وعند التخزين. نستخدم معايير أمان صناعية تشمل:',
    ],
    list: [
      'تشفير AES-256 للبيانات المخزّنة.',
      'تشفير TLS 1.2+ لجميع اتصالات النقل.',
      'المصادقة متعددة العوامل (MFA) للوصول الإداري.',
      'النسخ الاحتياطي المنتظم مع اختبارات الاستعادة.',
      'المراجعة الأمنية الدورية واختبارات الاختراق.',
    ],
  },
  {
    title: '6. الاحتفاظ بالبيانات',
    paragraphs: [
      'نحتفظ ببياناتك الشخصية طالما كان حسابك نشطاً أو طالما نحتاجها لتوفير الخدمات لك. عند إغلاق الحساب، نحتفظ بالبيانات المطلوبة قانوناً لمدة تصل إلى 5 سنوات، ونحذف الباقي بشكل آمن ودائم.',
      'قد نحتفظ ببيانات مجمّعة غير شخصية بشكل غير محدود لغايات التحليل والتحسين.',
    ],
  },
  {
    title: '7. حقوقك',
    paragraphs: ['لك الحق في:'],
    list: [
      'الوصول إلى بياناتك الشخصية والحصول على نسخة منها.',
      'تصحيح أي بيانات غير دقيقة أو غير مكتملة.',
      'طلب حذف بياناتك الشخصية ("الحق في النسيان").',
      'الاعتراض على معالجة بياناتك أو طلب تقييدها.',
      'نقل بياناتك إلى مزود خدمة آخر بتنسيق منظم وشائع.',
      'سحب الموافقة على معالجة بياناتك في أي وقت.',
      'تقديم شكوى لدى سلطة حماية البيانات المختصة.',
      'لممارسة أي من هذه الحقوق، يرجى التواصل معنا على admin@fastfree.cloud. سنستجيب لطلباتك خلال 30 يوماً.',
    ],
  },
  {
    title: '8. الكوكيز',
    paragraphs: [
      'نستخدم الكوكيز وتقنيات التتبع المماثلة لتحسين تجربتك. تشمل أنواع الكوكيز:',
    ],
    list: [
      'كوكيز ضرورية: مطلوبة لتشغيل الموقع ولا يمكن تعطيلها.',
      'كوكيز الأداء: تساعدنا في فهم كيفية استخدام الزوار للموقع.',
      'كوكيز الوظائف: تحفظ تفضيلاتك مثل اللغة وإعدادات العرض.',
      'كوكيز التسويق: تُستخدم لتوجيه إعلانات ذات صلة (بموافقتك).',
      'يمكنك التحكم في إعدادات الكوكيز من خلال متصفحك. تعطيل بعض الكوكيز قد يؤثر على وظائف الموقع.',
    ],
  },
  {
    title: '9. الخدمات والأطراف الثالثة',
    paragraphs: [
      'قد تستخدم خدماتنا روابط أو أدوات من أطراف ثالثة. لها سياسات خصوصية خاصة بها لا نتحكم فيها. نشجعك على مراجعة سياسات الخصوصية الخاصة بها.',
      'من أطراف الثالثة الرئيسية التي نعمل معها: مزودي استضافة السحابة، بوابات الدفع الإلكترونية، ومزودي خدمات البريد الإلكتروني.',
    ],
  },
  {
    title: '10. الأطفال',
    paragraphs: [
      'خدماتنا موجهة للأفراد البالغين (18 سنة فما فوق). لا نجمع بيانات شخصية من الأطفال عالماً بأنهم أقل من 18 سنة. إذا اكتشفنا ذلك، سنحذف البيانات فوراً.',
    ],
  },
  {
    title: '11. التغييرات على هذه السياسة',
    paragraphs: [
      'قد نحدّث سياسة الخصوصية هذه من وقت لآخر. سننشر أي تغييرات على هذه الصفحة مع تاريخ آخر تحديث. نشجعك على مراجعة هذه السياسة بانتظام. استمرارك في استخدام الخدمات بعد التغييرات يُعد قبولاً لها.',
    ],
  },
  {
    title: '12. التواصل معنا',
    paragraphs: [
      'FastFree Cloud — مصر والمملكة العربية السعودية',
      'البريد الإلكتروني: admin@fastfree.cloud',
      'الموقع الإلكتروني: https://fastfree.cloud',
    ],
  },
];

/* ───────────────────── English Content ───────────────────── */

const sectionsEn: { title: string; paragraphs: string[]; list?: string[] }[] = [
  {
    title: '1. Introduction',
    paragraphs: [
      'Welcome to FastFree Cloud ("the Company", "we", "us"). We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, store, and protect your information when you use our websites and services.',
      'By using our services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree, please stop using our services.',
    ],
  },
  {
    title: '2. Data We Collect',
    paragraphs: ['We may collect several types of personal information:'],
    list: [
      'Identity Data: name, email address, phone number, postal address, and professional information (company, job title).',
      'Account Data: username and password (encrypted), account preferences, and language settings.',
      'Transaction Data: billing and subscription details, financial transaction records related to our services.',
      'Usage Data: IP address, browser type, operating system, pages visited, visit duration, and access times.',
      'Cookies and Tracking: cookies, local storage, and similar tracking technologies.',
    ],
  },
  {
    title: '3. How We Use Your Data',
    paragraphs: ['We use collected data for the following purposes:'],
    list: [
      'Providing, operating, and maintaining our services and software platforms.',
      'Improving and developing your experience and service features.',
      'Communicating with you about your account, service updates, or promotions (with prior consent where required by law).',
      'Processing financial transactions, issuing invoices, and managing subscriptions.',
      'Ensuring security, preventing fraud, and protecting our legal rights.',
      'Complying with applicable legal and regulatory obligations.',
      'Preparing aggregated, non-identifying reports and analytics to improve our services.',
    ],
  },
  {
    title: '4. Sharing Data with Third Parties',
    paragraphs: [
      'We do not sell your personal data to third parties. We may share your information only in the following cases:',
    ],
    list: [
      'Service Providers: trusted partners who help us operate our services (cloud hosting, payment processing, email services), bound by confidentiality agreements.',
      'Legal Requirements: when required by court order, legal obligation, or to protect our rights and the safety of our users.',
      'Mergers or Acquisitions: in the event of a merger, acquisition, or sale of company assets, data may be transferred with the same level of protection.',
      'With Your Explicit Consent: in any other case, we request your prior consent before sharing.',
    ],
  },
  {
    title: '5. Data Storage and Security',
    paragraphs: [
      'We store your data on secure servers using SSL/TLS encryption in transit and at rest. We employ industry-standard security measures including:',
    ],
    list: [
      'AES-256 encryption for stored data.',
      'TLS 1.2+ encryption for all transfer connections.',
      'Multi-factor authentication (MFA) for administrative access.',
      'Regular backups with recovery testing.',
      'Periodic security audits and penetration testing.',
    ],
  },
  {
    title: '6. Data Retention',
    paragraphs: [
      'We retain your personal data for as long as your account is active or as needed to provide our services. Upon account closure, we retain legally required data for up to 5 years and securely and permanently delete the rest.',
      'We may retain aggregated, non-personal data indefinitely for analytics and improvement purposes.',
    ],
  },
  {
    title: '7. Your Rights',
    paragraphs: ['You have the right to:'],
    list: [
      'Access your personal data and obtain a copy.',
      'Correct any inaccurate or incomplete data.',
      'Request deletion of your personal data ("right to be forgotten").',
      'Object to the processing of your data or request restriction.',
      'Transfer your data to another provider in a structured, commonly used format.',
      'Withdraw your consent to data processing at any time.',
      'File a complaint with the competent data protection authority.',
      'To exercise any of these rights, please contact us at admin@fastfree.cloud. We will respond to your requests within 30 days.',
    ],
  },
  {
    title: '8. Cookies',
    paragraphs: [
      'We use cookies and similar tracking technologies to improve your experience. Types of cookies include:',
    ],
    list: [
      'Essential Cookies: required for the site to function and cannot be disabled.',
      'Performance Cookies: help us understand how visitors use the site.',
      'Functional Cookies: save your preferences such as language and display settings.',
      'Marketing Cookies: used to deliver relevant advertisements (with your consent).',
      'You can manage cookie settings through your browser. Disabling certain cookies may affect site functionality.',
    ],
  },
  {
    title: '9. Third-Party Services',
    paragraphs: [
      'Our services may contain links to or tools from third parties. They have their own privacy policies which we do not control. We encourage you to review their privacy policies.',
      'Key third parties we work with include: cloud hosting providers, electronic payment gateways, and email service providers.',
    ],
  },
  {
    title: '10. Children',
    paragraphs: [
      'Our services are intended for adults (18 years and older). We do not knowingly collect personal data from children under 18. If we discover this, we will delete the data immediately.',
    ],
  },
  {
    title: '11. Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will publish any changes on this page with the last updated date. We encourage you to review this policy regularly. Your continued use of the services after changes constitutes acceptance of them.',
    ],
  },
  {
    title: '12. Contact Us',
    paragraphs: [
      'FastFree Cloud — Egypt & Saudi Arabia',
      'Email: admin@fastfree.cloud',
      'Website: https://fastfree.cloud',
    ],
  },
];
