// ============================================================
// Bundled privacy-policy content (AR + EN).
// Mirrors https://fastfree.cloud/{ar|en}/privacy so the policy is
// always readable INSIDE the app — offline, with no external browser.
// ============================================================

export interface PrivacySection {
  heading: string
  paragraphs: string[]
  list?: string[]
  closing?: string[]
}

export interface PrivacyContent {
  updated: string
  sections: PrivacySection[]
}

export const PRIVACY_CONTENT_AR: PrivacyContent = {
  updated: 'آخر تحديث: سبتمبر 2026',
  sections: [
    {
      heading: '1. مقدمة',
      paragraphs: [
        'مرحباً بك في FastFree Cloud ("الشركة"، "نحن"، "لدينا"). نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. تشرح هذه السياسة كيف نجمع ونستخدم ونخزّن ونحمي معلوماتك عند استخدامك لمواقعنا وخدماتنا.',
        'باستخدامك لخدماتنا، أنت توافق على جمع واستخدام المعلومات وفقاً لسياسة الخصوصية هذه. إذا كنت لا توافق، يرجى التوقف عن استخدام خدماتنا.',
      ],
    },
    {
      heading: '2. البيانات التي نجمعها',
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
      heading: '3. كيف نستخدم بياناتك',
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
      heading: '4. مشاركة البيانات مع أطراف ثالثة',
      paragraphs: ['لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية:'],
      list: [
        'مزودي الخدمات: شركاء موثوقون يساعدوننا في تشغيل خدماتنا (استضافة السحابة، معالجة الدفع، خدمات البريد الإلكتروني)، وهم ملزمون بعقود سرية.',
        'الالتزامات القانونية: عندما نطلب ذلك بموجب أمر قضائي أو التزام قانوني أو لحماية حقوقنا وسلامة مستخدمينا.',
        'الاندماج أو الاستحواذ: في حال حدث اندماج أو استحواذ أو بيع لأصول الشركة، قد تُنقل البيانات مع الحفاظ على نفس مستوى الحماية.',
        'بموافقتك الصريحة: في أي حالة أخرى نطلب موافقتك المسبقة قبل المشاركة.',
      ],
    },
    {
      heading: '5. تخزين البيانات وأمنها',
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
      heading: '6. الاحتفاظ بالبيانات',
      paragraphs: [
        'نحتفظ ببياناتك الشخصية طالما كان حسابك نشطاً أو طالما نحتاجها لتوفير الخدمات لك. عند إغلاق الحساب، نحتفظ بالبيانات المطلوبة قانوناً لمدة تصل إلى 5 سنوات، ونحذف الباقي بشكل آمن ودائم.',
        'قد نحتفظ ببيانات مجمّعة غير شخصية بشكل غير محدود لغايات التحليل والتحسين.',
      ],
    },
    {
      heading: '7. حقوقك',
      paragraphs: ['لك الحق في:'],
      list: [
        'الوصول إلى بياناتك الشخصية والحصول على نسخة منها.',
        'تصحيح أي بيانات غير دقيقة أو غير مكتملة.',
        'طلب حذف بياناتك الشخصية ("الحق في النسيان").',
        'الاعتراض على معالجة بياناتك أو طلب تقييدها.',
        'نقل بياناتك إلى مزود خدمة آخر بتنسيق منظم وشائع.',
        'سحب الموافقة على معالجة بياناتك في أي وقت.',
        'تقديم شكوى لدى سلطة حماية البيانات المختصة.',
      ],
      closing: [
        'لممارسة أي من هذه الحقوق، يرجى التواصل معنا على sales@fastfree.cloud. سنستجيب لطلباتك خلال 30 يوماً.',
      ],
    },
    {
      heading: '8. الكوكيز',
      paragraphs: [
        'نستخدم الكوكيز وتقنيات التتبع المماثلة لتحسين تجربتك. تشمل أنواع الكوكيز:',
      ],
      list: [
        'كوكيز ضرورية: مطلوبة لتشغيل الموقع ولا يمكن تعطيلها.',
        'كوكيز الأداء: تساعدنا في فهم كيفية استخدام الزوار للموقع.',
        'كوكيز الوظائف: تحفظ تفضيلاتك مثل اللغة وإعدادات العرض.',
        'كوكيز التسويق: تُستخدم لتوجيه إعلانات ذات صلة (بموافقتك).',
      ],
    },
    {
      heading: '9. الخدمات والأطراف الثالثة',
      paragraphs: [
        'قد تستخدم خدماتنا روابط أو أدوات من أطراف ثالثة. لها سياسات خصوصية خاصة بها لا نتحكم فيها. نشجعك على مراجعة سياسات الخصوصية الخاصة بها.',
        'من أطراف الثالثة الرئيسية التي نعمل معها: مزودي استضافة السحابة، بوابات الدفع الإلكترونية، ومزودي خدمات البريد الإلكتروني.',
      ],
    },
    {
      heading: '10. الأطفال',
      paragraphs: [
        'خدماتنا موجهة للأفراد البالغين (18 سنة فما فوق). لا نجمع بيانات شخصية من الأطفال عالماً بأنهم أقل من 18 سنة.',
        'إذا اكتشفنا ذلك، سنحذف البيانات فوراً.',
      ],
    },
    {
      heading: '11. التغييرات على هذه السياسة',
      paragraphs: [
        'قد نحدّث سياسة الخصوصية هذه من وقت لآخر. سننشر أي تغييرات على هذه الصفحة مع تاريخ آخر تحديث.',
        'نشجعك على مراجعة هذه السياسة بانتظام. استمرارك في استخدام الخدمات بعد التغييرات يُعد قبولاً لها.',
      ],
    },
    {
      heading: '12. التواصل معنا',
      paragraphs: [
        'FastFree Cloud — مصر والمملكة العربية السعودية',
        'البريد الإلكتروني: sales@fastfree.cloud',
        'الموقع الإلكتروني: https://fastfree.cloud',
        'لأي استفسارات حول هذه السياسة، يرجى التواصل معنا على sales@fastfree.cloud',
      ],
    },
  ],
}

export const PRIVACY_CONTENT_EN: PrivacyContent = {
  updated: 'Last updated: September 2026',
  sections: [
    {
      heading: '1. Introduction',
      paragraphs: [
        'Welcome to FastFree Cloud ("the Company", "we", "us"). We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, store, and protect your information when you use our websites and services.',
        'By using our services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree, please stop using our services.',
      ],
    },
    {
      heading: '2. Data We Collect',
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
      heading: '3. How We Use Your Data',
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
      heading: '4. Sharing Data with Third Parties',
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
      heading: '5. Data Storage and Security',
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
      heading: '6. Data Retention',
      paragraphs: [
        'We retain your personal data for as long as your account is active or as needed to provide our services. Upon account closure, we retain legally required data for up to 5 years and securely and permanently delete the rest.',
        'We may retain aggregated, non-personal data indefinitely for analytics and improvement purposes.',
      ],
    },
    {
      heading: '7. Your Rights',
      paragraphs: ['You have the right to:'],
      list: [
        'Access your personal data and obtain a copy.',
        'Correct any inaccurate or incomplete data.',
        'Request deletion of your personal data ("right to be forgotten").',
        'Object to the processing of your data or request restriction.',
        'Transfer your data to another provider in a structured, commonly used format.',
        'Withdraw your consent to data processing at any time.',
        'File a complaint with the competent data protection authority.',
      ],
      closing: [
        'To exercise any of these rights, please contact us at sales@fastfree.cloud. We will respond to your requests within 30 days.',
      ],
    },
    {
      heading: '8. Cookies',
      paragraphs: [
        'We use cookies and similar tracking technologies to improve your experience. Types of cookies include:',
      ],
      list: [
        'Essential Cookies: required for the site to function and cannot be disabled.',
        'Performance Cookies: help us understand how visitors use the site.',
        'Functional Cookies: save your preferences such as language and display settings.',
        'Marketing Cookies: used to deliver relevant advertisements (with your consent).',
      ],
    },
    {
      heading: '9. Third-Party Services',
      paragraphs: [
        'Our services may contain links to or tools from third parties. They have their own privacy policies which we do not control. We encourage you to review their privacy policies.',
        'Key third parties we work with include: cloud hosting providers, electronic payment gateways, and email service providers.',
      ],
    },
    {
      heading: '10. Children',
      paragraphs: [
        'Our services are intended for adults (18 years and older). We do not knowingly collect personal data from children under 18.',
        'If we discover this, we will delete the data immediately.',
      ],
    },
    {
      heading: '11. Changes to This Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. We will publish any changes on this page with the last updated date.',
        'We encourage you to review this policy regularly. Your continued use of the services after changes constitutes acceptance of them.',
      ],
    },
    {
      heading: '12. Contact Us',
      paragraphs: [
        'FastFree Cloud — Egypt & Saudi Arabia',
        'Email: sales@fastfree.cloud',
        'Website: https://fastfree.cloud',
        'For any questions about this policy, please contact us at sales@fastfree.cloud',
      ],
    },
  ],
}

export const PRIVACY_CONTENT: Record<'ar' | 'en', PrivacyContent> = {
  ar: PRIVACY_CONTENT_AR,
  en: PRIVACY_CONTENT_EN,
}
