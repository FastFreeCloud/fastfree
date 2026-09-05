import type { BlogPost } from '../blogTypes';

export const blogWeb: BlogPost[] = [
  {
    id: '5',
    title_ar: 'إدارة عدة فروع ومستودعات من نظام واحد',
    title_en: 'Managing Multiple Branches and Warehouses from One System',
    slug: 'multi-branch-management',
    content_ar: `مع نمو الشركة إلى أكثر من فرع أو مستودع، يتحوّل السؤال من "كيف نسجّل" إلى "كيف نرى الكل دون تشتّت". النهج السليم هو أن يكون لكل فرع بيئته المعزولة لبياناته، لكن تحت إدارة موحّدة تتيح لك رؤية مجمل الأداء من مكان واحد.

العزل عبر الشبكة مهم. تشغيل الفروع خلف شبكة خاصة افتراضية (VPN) يؤمّن الحركة بين المكوّنات ويمنع وصول جهات غير مصرّح بها، خصوصاً عند تشغيل الفروع عند العملاء أو في مواقع متباعدة. هذا يقلّل المخاطر دون تعقيد يومي.

النشر المتّسق يسهّل التشغيل. أدوات مثل NixOS تتيح وصف بيئة كل فرع كملف واحد قابل لإعادة الإنتاج، فتتساوى البيئات وتقلّ أخطاء "عندي يشتغل وعندك لا". وإدارة عبر سطر أوامر بسيط (تحديث، إعادة بناء، نسخ احتياطي) تكفي لمعظم المهام.

من الناحية التشغيلية، يبقى لكل فرع رصيده المستقل مع إمكانية دمج التقارير للإدارة العليا. يمكن نقل صنف بين مستودعين، ومتابعة المقبوضات لكل فرع، كل ذلك من شاشة موحّدة. المرونة في النشر (سحابة أو محلي أو Hyper-V أو WSL) تتيح البدء بما يناسبك.

ننشر FastFree بهذا النهج عبر NixOS مع فروع معزولة وآمنة؛ إن أردت شرحاً على حالتك، نحن على واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `As a company grows to more than one branch or warehouse, the question shifts from "how do we record" to "how do we see everything without fragmentation." The sound approach is for each branch to have its isolated data environment, yet under unified management that lets you view overall performance from one place.

Network isolation matters. Running branches behind a VPN secures traffic between components and blocks unauthorized access, especially when branches operate at client sites or distant locations. This reduces risk without daily complexity.

Consistent deployment eases operations. Tools like NixOS let you describe each branch's environment as a single reproducible file, so environments match and the "works for me but not for you" errors shrink. Simple CLI management (update, rebuild, backup) covers most tasks.

Operationally, each branch keeps its own balance while reports can be consolidated for top management. You can transfer an item between warehouses and track each branch's receivables, all from one screen. Flexible deployment (cloud, on-premise, Hyper-V, or WSL) lets you start with what fits you.

We deploy FastFree this way on NixOS with isolated, secure branches; if you want an explanation tailored to your case, we are on WhatsApp +201091999937 or at admin@fastfree.cloud.`,
    excerpt_ar: 'إدارة الفروع بمعزل آمن ومركزي عبر VPN ونشر متسق يسهّل الرؤية الموحّدة.',
    excerpt_en: 'Managing branches with secure, isolated, centralized control via VPN and consistent deployment for unified visibility.',
    cover_image: '/assets/blog-multi-branch-management.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['ERP', 'NixOS'],
    is_published: true,
    published_at: '2026-03-28',
    views: 240,
  },
  {
    id: 'web1',
    title_ar: 'بناء موقع ويب لشركتك: خطوات عملية للنمو',
    title_en: 'Building a Business Website: Practical Steps for Growth',
    slug: 'building-business-website-sme',
    content_ar: `البدء بموقع ويب للشركة ليس مجرد "أن نكون موجودين على الإنترنت"، بل خطوة تشغيلية تبدأ بتوضيح الهدف. هل الموقع ليعرّف بالشركة وخدماتها، أم لاستقبال طلبات، أم لدعم عملاء حاليين؟ توضيح الغرض يسهّل كل قرار لاحق: عدد الصفحات، ووجود نموذج تواصل، وطريقة التحديث.

قبل اختيار أداة البناء، يفيد أن تجمع المحتوى الأساسي: اسم النشاط وعنوانه ووسائل التواصل، ووصفاً بسيطاً لكل خدمة. كثير من المواقع تتعثر لاحقاً لأن الصور والنصوص لم تُجهّز مسبقاً. المحتوى العربي يحتاج واجهة تدعم الاتجاه من اليمين لليسار (RTL) وخطاً واضحاً، وهو ما نعتمده في منتجات FastFree حيث نستخدم خط Cairo وواجهة عربية أصيلة.

طريقة النشر تختلف حسب الحاجة. موقع ثابت (صفحات جاهزة) يكفي لمعظم الشركات الصغيرة التي نادراً ما تحدّث محتواها، بينما الأنظمة التي تحتاج حسابات أو تحديثاً مستمراً تستفيد من منصة ديناميكية أو منخفضة الكود. في FastFree نبني واجهات بنحو 60 شاشة و43 خدمة مع 1,253 مفتاح ترجمة (i18n) وصفر أخطاء TypeScript، وهو ما يسهّل صيانة طويلة الأمد.

لا تنتظر الكمال قبل النشر. ابدأ بموقع بسيط يعمل ويدعم الجوال، ثم طوّره تدريجياً حسب ملاحظات الزوار.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Starting a company website is not merely "being present online"; it is an operational step that begins with clarifying the goal. Is the site to introduce the company and its services, to receive inquiries, or to support existing customers? A clear purpose makes every later decision easier: the number of pages, whether to include a contact form, and how updates will happen.

Before choosing a builder, it helps to gather the core content: the business name, address, and contact details, plus a short description of each service. Many sites stall later because images and text were not prepared in advance. Arabic content needs an interface that supports right-to-left (RTL) direction and a clear font; this is what we use in FastFree products, with the Cairo font and a native Arabic interface.

The delivery method depends on the need. A static site (pre-built pages) is enough for most small businesses that rarely change content, while systems needing accounts or frequent updates benefit from a dynamic or low-code platform. At FastFree we build interfaces with about 60 screens and 43 services, with 1,253 i18n keys and zero TypeScript errors, which makes long-term maintenance easier.

Do not wait for perfection before launching. Start with a simple site that works and supports mobile, then improve it gradually based on visitor feedback.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'خطوات عملية لبناء موقع شركة: توضيح الهدف، تجهيز المحتوى، واختيار طريقة النشر المناسبة.',
    excerpt_en: 'Practical steps to build a company site: clarify the goal, prepare content, and pick the right delivery method.',
    cover_image: '/assets/blog-building-business-website-sme.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code', 'ERP'],
    is_published: true,
    published_at: '2026-01-20',
    views: 180,
  },
  {
    id: 'web2',
    title_ar: 'فوائد التطبيقات التقدمية للويب للشركات الصغيرة',
    title_en: 'Progressive Web App Benefits for Small Businesses',
    slug: 'pwa-benefits-small-business',
    content_ar: `البرامج التقدمية للويب (PWA) هي مواقع عادية مبنية بأدوات الويب القياسية، لكنها تضيف قدرات شبيهة بالتطبيقات المثبّتة: يمكن فتحها من الشاشة الرئيسية، والعمل دون اتصال جزئياً، واستقبال إشعارات عند توفّر الدعم. تعتمد على عامل خدمة (service worker) يخزّن الموارد، وملف بيان (manifest) يصف شكل التطبيق، وكلاهما يتطلب اتصالاً آمناً (HTTPS).

أكبر ميزة للشركات الصغيرة هي شفرة واحدة تعمل على أجهزة متعددة. بدل بناء تطبيق منفصل لكل نظام تشغيل، تصل إلى الهواتف والحواسيب من رابط واحد. هذا يقلّل تكلفة التطوير والصيانة مقارنة بتطبيق أصيل منفصل، كما أن التحديث يتم فوراً دون مراجعة متجر تطبيقات.

العمل دون اتصال مفيد خصوصاً حيث ضعف الشبكة. يمكن للمستخدم تصفّح صفحات سبق زيارتها أو إكمال نموذج وإرساله لاحقاً عند عودة الاتصال. لكن تجدر الإشارة إلى قيود حسب المتصفح والجهاز؛ فبعض المزايا مثل الإشعارات تختلف سلوكها على iOS مقارنة بأندرويد.

إذا كان نشاطك يركّز على التصفّح والطلب بدل الحاجة لأدوات عتادية عميقة، فالـ PWA خيار معقول.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Progressive Web Apps (PWAs) are ordinary websites built with standard web technologies, but they add app-like capabilities: they can be opened from the home screen, work partially offline, and receive notifications where supported. They rely on a service worker that caches resources and a web app manifest that describes how the app appears, and both require a secure (HTTPS) connection.

The main advantage for small businesses is a single codebase that runs across devices. Instead of building a separate app for each platform, you reach phones and computers from one link. This lowers development and maintenance cost compared with a separate native app, and updates ship instantly without an app-store review.

Offline behaviour is useful where connectivity is weak. A user can browse pages they visited before or complete a form and send it once the connection returns. Note, though, that behaviour varies by browser and device; some features such as push notifications differ on iOS compared with Android.

If your business focuses on browsing and ordering rather than deep hardware features, a PWA is a reasonable option.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'ما هي PWA وكيف توفّر شفرة واحدة وتشغيلاً دون اتصال وتكلفة أقل مقارنة بتطبيق أصيل.',
    excerpt_en: 'What a PWA is and how it offers one codebase, offline use, and lower cost than a native app.',
    cover_image: '/assets/blog-pwa-benefits-small-business.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code'],
    is_published: true,
    published_at: '2026-02-10',
    views: 250,
  },
  {
    id: 'web3',
    title_ar: 'أساسيات التصميم المتجاوب للمواقع',
    title_en: 'Responsive Web Design Basics',
    slug: 'responsive-web-design-basics',
    content_ar: `التصميم المتجاوب يجعل نفس الصفحة تظهر بشكل مناسب على شاشات متعددة الأحجام، من الهاتف إلى الشاشة الكبيرة، باستخدام مجموعة واحدة من الملفات. الفكرة الأساسية تعود لإيثان ماركوت (2010) وتقوم على شبكة مرنة وصور تتناسب مع الحاوية واستعلامات وسائط (media queries). الخطوة الأولى دائماً هي وسم viewport في رأس الصفحة ليرتبط عرض التخطيط بعرض الجهاز الحقيقي.

النهج العملي هو "الموبايل أولاً": تكتب أسلوباً بسيطاً للشاشة الصغرى ثم تضيف تحسينات كلما اتسع العرض. نقاط التوقف (breakpoints) يفضّل أن تُختار حسب المحتوى لا حسب اسم جهاز معيّن؛ أي عندما يصبح السطر طويلاً جداً أو القسم ضيّقاً، هنا تضع نقطة التغيير. أدوات مثل Flexbox و Grid تسهّل التخطيط المرن قبل الحاجة لأي استعلام.

من ناحية الاستخدام، الأزرار يجب أن تكون كبيرة كفاية للنقر (نحو 44 بيكسل ارتفاع)، والنصوص قابلة للقراءة دون تكبير. في واجهات FastFree نعتمد RTL وخط Cairo لراحة المستخدم العربي على الجوال والحاسوب معاً.

اختبار الموقع على أكثر من عرض شاشة أوفر بكثير من بناء نسختي موقع منفصلتين.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Responsive design makes the same page render well across many screen sizes, from phone to large display, using one set of files. The core idea goes back to Ethan Marcotte (2010) and rests on a flexible grid, images that fit their container, and media queries. The first step is always the viewport meta tag in the page head, which ties the layout width to the device's real width.

The practical approach is "mobile first": write a simple style for the smallest screen, then add enhancements as the width grows. Breakpoints are best chosen by content, not by a specific device name; when a line of text becomes too long or a section too cramped, that is where you change the layout. Tools like Flexbox and Grid make the layout fluid before any media query is needed.

For usability, buttons should be large enough to tap (around 44 pixels tall) and text readable without zooming. In FastFree interfaces we use RTL and the Cairo font for Arabic users on both phone and desktop.

Testing the site at several widths is far cheaper than maintaining two separate site versions.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'التصميم المتجاوب بموبايل أولاً ونقاط توقف حسب المحتوى ووسم viewport وRTL.',
    excerpt_en: 'Responsive design with mobile-first, content-based breakpoints, the viewport tag, and RTL.',
    cover_image: '/assets/blog-responsive-web-design-basics.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code'],
    is_published: true,
    published_at: '2026-03-05',
    views: 320,
  },
  {
    id: 'web4',
    title_ar: 'أساسيات تحسين محركات البحث لموقع الشركة',
    title_en: 'SEO Basics for a Small Business Website',
    slug: 'seo-basics-small-business-website',
    content_ar: `تحسين محركات البحث (SEO) لموقع الشركة الصغيرة يبدأ بأساسيات يمكن إدارتها دون خبير. أهم عنصر على الصفحة هو وسما العنوان (title tag): اجعله واضحاً ودقيقاً ويفضّل ألا يتجاوز 60 حرفاً، ويصف ما في الصفحة فعلاً. والوصف التعريفي (meta description) ملخّص قصير (نحو 150 إلى 160 حرفاً) يساعد الباحث على الاختيار حتى وإن لم يؤثر مباشرة على الترتيب.

بنية العناوين مهمة: عنوان رئيسي واحد (H1) لكل صفحة، ثم عناوين فرعية (H2، H3) تنظّم المحتوى. محركات البحث تقرأ البنية كما يقرأ القارئ المتصفّح، والعناوين الواضحة تساعد أيضاً أدوات الذكاء الاصطناعي على اقتباس المعلومة بدقة. استخدم كلمة مفتاحية واحدة أساسية لكل صفحة بدل تكديس كلمات.

البيانات المهيكلة (schema) بصيغة JSON-LD تساعد محركات البحث على فهم نوع صفحتك، مثل نشاط محلي أو خدمة أو مقال، مما قد يظهر نتائج غنية. وسرعة الموقع عامل مؤثّر؛ الصفحات التي تُحمّل في أقل من ثانيتين تُذكر أكثر بواسطة أدوات الذكاء الاصطناعي وفق تقارير حديثة.

النتائج تتراكم ببطء؛ ركّز على المحتوى المفيد والعناوين الصادقة قبل كل شيء.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Search engine optimization (SEO) for a small business site starts with basics you can manage without an expert. The most important on-page element is the title tag: make it clear and accurate, ideally under 60 characters, and truly describing the page. The meta description is a short summary (about 150 to 160 characters) that helps searchers choose, even though it does not directly affect ranking.

Heading structure matters: one main heading (H1) per page, then subheadings (H2, H3) that organize the content. Search engines read structure the way a skimming reader does, and clear headings also help AI tools quote information accurately. Use one primary keyword per page rather than stuffing terms.

Structured data (schema) in JSON-LD helps search engines understand the page type, such as LocalBusiness, Service, or Article, which can enable rich results. Site speed matters too; pages that load in under two seconds are cited more often by AI tools, according to recent reports.

Results build up slowly; focus on useful content and honest titles above all.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'أساسيات SEO: عناوين واضحة وبنية محتوى وبيانات مهيكلة وسرعة تحميل.',
    excerpt_en: 'SEO basics: clear titles, content structure, structured data, and load speed.',
    cover_image: '/assets/blog-seo-basics-small-business-website.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code', 'ERP'],
    is_published: true,
    published_at: '2026-04-12',
    views: 410,
  },
  {
    id: 'web5',
    title_ar: 'إتاحة الويب: أساسيات WCAG للشركات',
    title_en: 'Web Accessibility: WCAG Basics for Businesses',
    slug: 'web-accessibility-wcag-basics',
    content_ar: `إتاحة الويب تعني جعل الموقع قابلاً للاستخدام من أكبر عدد من الناس، بما فيهم ذوو الإعاقة. المعيار المعتمد هو WCAG 2.1 الصادر عن W3C، ويُنظّم حول أربع مبادئ: يمكن إدراكه، يمكن تشغيله، مفهوم، ومتين (POUR). المستوى AA هو المعيار الشائع المذكور في كثير من التشريعات.

بعض العادات تغطي معظم الحالات العملية: نص بديل (alt) يصف الصور ذات المعنى، وتباين لون كافٍ (نسبة 4.5:1 للنص العادي و3:1 للنص الكبير وعناصر الواجهة)، وعناوين حقيقية تبني هيكلاً، وروابط تصف وجهتها، وحقول نماذج لها بطاقات مرئية ورسائل خطأ واضحة، وإمكانية التنقّل بلوحة المفاتيح. تشير تقديرات شائعة إلى أن نحو واحداً من كل خمسة أشخاص يتعامل بأسلوب ما من الإعاقة.

تحسين الإتاحة يفيد الجميع غالباً؛ تباين أفضل للقراءة تحت الشمس، وتنقّل بلوحة المفاتيح على أجهزة التلفاز. أدوات مثل WAVE و axe و Lighthouse تكشف المشاكل الشائعة، لكن الفحص اليدوي ضروري لأن الأدوات الآلية لا تكتشف كل شيء.

ابدأ بإصلاحات صغيرة في قوالب الموقع لتورثها كل الصفحات لاحقاً.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Web accessibility means making the site usable by as many people as possible, including those with disabilities. The reference standard is WCAG 2.1 from W3C, organized around four principles: perceivable, operable, understandable, and robust (POUR). Level AA is the common benchmark referenced in many laws.

A few habits cover most practical cases: alt text that describes meaningful images, sufficient colour contrast (a ratio of 4.5:1 for normal text and 3:1 for large text and interface components), real headings that form a structure, links that state their destination, form fields with visible labels and clear error messages, and the ability to navigate by keyboard. Widely cited estimates suggest about one in five people interacts with some form of impairment.

Improving accessibility usually helps everyone; better contrast aids reading in sunlight, and keyboard navigation works on TV browsers. Tools like WAVE, axe, and Lighthouse reveal common issues, but manual checking is needed because automated tools miss things.

Start with small fixes in your site templates so every later page inherits them.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'مبادئ WCAG وأربع عادات تغطي معظم حالات إتاحة الويب دون تعقيد.',
    excerpt_en: 'WCAG principles and four habits that cover most web accessibility cases without complexity.',
    cover_image: '/assets/blog-web-accessibility-wcag-basics.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code'],
    is_published: true,
    published_at: '2026-05-18',
    views: 290,
  },
  {
    id: 'web6',
    title_ar: 'المواقع الثابتة مقابل الديناميكية: كيف تختار',
    title_en: 'Static vs Dynamic Websites: How to Choose',
    slug: 'static-vs-dynamic-websites',
    content_ar: `المواقع الثابتة ترسل ملفات HTML جاهزة لكل زائر، فلا تغيّر محتواها حسب المستخدم. ميزتها الأساسية السرعة والأمان المنخفض التكلفة: لا خادم ديناميكياً ولا قاعدة بيانات، فنقاط الفشل أقل. تناسب المواقع التعريفية والمحافظ التي نادراً ما تتغيّر، وتسهّل نشرها عبر شبكات توصيل المحتوى (CDN).

المواقع الديناميكية تبني كل صفحة عند الطلب باستخدام لغة خادم وقاعدة بيانات، مما يتيح تخصيص المحتوى وتحديثاً عبر لوحة إدارة دون لمس الكود. هذا مناسب للمتاجر والأنظمة التي تحتاج حسابات أو بحثاً أو مستخدمين. تكلفتها أعلى في التشغيل وتحتاج عناية أكبر بالأمان والنسخ الاحتياطي.

النهج الهجين يجمع بينهما اليوم عبر ما يسمى headless CMS ودوال بلا خادم، فيقدّم محتوى ثابتاً سريعاً مع عناصر ديناميكية حيث تلزم. في FastFree ننشر الخلفية (Frappe/ERPNext) مع قواعد بيانات في حاويات Docker، بينما يمكن لواجهات العرض أن تستفيد من التخزين المؤقت.

الخيار يعتمد على تكرار التحديث والوظائف المطلوبة أكثر من الموضة.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Static sites send pre-built HTML files to every visitor, with content that does not change per user. Their main strengths are speed and low-cost security: no server-side processing and no database means fewer points of failure. They suit brochure and portfolio sites that rarely change, and they are easy to serve through a content delivery network (CDN).

Dynamic sites build each page on request using a server language and a database, which allows personalized content and updates through an admin panel without touching code. This fits shops and systems needing accounts, search, or user data. Their running cost is higher and they need more care for security and backups.

The hybrid approach combines both today via a headless CMS and serverless functions, delivering fast static content with dynamic elements where needed. At FastFree we deploy the backend (Frappe/ERPNext) with databases in Docker containers, while front-end views can benefit from caching.

The choice depends on update frequency and required functions more than on fashion.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'مقارنة بين المواقع الثابتة والديناميكية والنهج الهجين ومتى يلزم كل نوع.',
    excerpt_en: 'Comparing static and dynamic sites plus the hybrid approach, and when each is needed.',
    cover_image: '/assets/blog-static-vs-dynamic-websites.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code', 'Docker'],
    is_published: true,
    published_at: '2026-06-22',
    views: 360,
  },
  {
    id: 'web7',
    title_ar: 'منصّات منخفضة الكود للشركات الصغيرة',
    title_en: 'Low-Code Platforms for Small Businesses',
    slug: 'low-code-platforms-sme-guide',
    content_ar: `المنصّات منخفضة الكود تتيح بناء تطبيقات بأقل كتابة كود، عبر واجهات سحب وإفلات ومكوّنات جاهزة، ما يجعلها في متناول غير المبرمجين. بعض المسحّات الصناعية تشير إلى أن تطويراً منخفض الكود يمكن أن يكون أسرع بعدة مرّات من الكتابة التقليدية، وهو ما يهم الشركات الصغيرة محدودة الفريق والميزانية.

ننصح بنهج خطوة بخطوة: ابدأ بمسار عمل واحد واضح (مثل نماذج الموافقات أو متابعة المخزون)، وأصدر نسخة صغيرة كل أسبوع، وقِس الوقت الموفّر بصدق. منصّات منخفضة الكود تناسب التطبيقات الداخلية ذات النماذج والتقارير، لكن لها حدود: قلة التخصيص العميق، وارتباط بالمورّد (vendor lock-in)، وتحديات التوسّع. لذلك يبقى البناء المخصص أفضل عندما يكون المسار هو الميزة التنافسية الحقيقية.

في FastFree نتبنّى فلسفة مشابهة: محرّك منخفض الكود يوفّر مدير نوافذ وجداول ديناميكية وتوليد نماذج، مع نواة مشتركة تدعم العربية والإنجليزية عبر 1,253 مفتاح ترجمة. هذا يسرّع بناء وحدات المحاسبة والمخزون والمبيعات والمشتريات والموارد البشرية وإدارة العملاء.

لا تستبدل الحكم الهندسي بالأداة؛ استخدم منخفض الكود حيث يوفّر وقتاً حقيقياً.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Low-code platforms let you build applications with less hand-coding, using drag-and-drop interfaces and ready components, which puts them within reach of non-developers. Some industry surveys suggest low-code development can be several times faster than traditional coding, which matters for small businesses with limited teams and budgets.

We recommend a step-by-step approach: start with one clear workflow (such as approval forms or stock tracking), ship a small version each week, and measure saved time honestly. Low-code fits internal apps with forms and reports, but it has limits: shallow deep customization, vendor lock-in, and scaling challenges. Custom building remains better when the workflow itself is the real competitive edge.

At FastFree we follow a similar philosophy: a low-code engine provides a window manager, dynamic tables, and form generation, with a shared core supporting Arabic and English through 1,253 i18n keys. This speeds building the accounting, inventory, sales, purchase, HR, and CRM modules.

Do not replace engineering judgement with a tool; use low-code where it saves real time.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'متى يناسب منخفض الكود الشركات الصغيرة وحدوده مقابل البناء المخصص.',
    excerpt_en: 'When low-code fits small businesses, and its limits versus custom building.',
    cover_image: '/assets/blog-low-code-platforms-sme-guide.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code'],
    is_published: true,
    published_at: '2026-07-15',
    views: 470,
  },
  {
    id: 'web8',
    title_ar: 'النشر عبر NixOS وDocker: شرح مبسّط',
    title_en: 'Deployment with NixOS and Docker Explained',
    slug: 'nixos-docker-deployment-explained',
    content_ar: `نشر البرمجيات بثبات يتطلب بيئة قابلة لإعادة الإنتاج، وهنا يبرز دور NixOS والحاويات. NixOS نظام يصف إعداد الخادم بأكمله في ملف واحد تصريحي؛ إن نجح على جهاز، نجح على غيره، ويسمح بالتراجع إلى نسخة سابقة عند أي خلل (rollback). هذا يقلّل ما يُعرف بـ "انجراف الإعدادات" (configuration drift).

Docker من جهته يحزم التطبيق واعتمادياته في صورة واحدة تعمل بنفس الطريقة في بيئات مختلفة، ما يسهّل النقل بين مزوّدي الخدمة وتجنّب ارتباط بمورّد واحد. المزيج بينهما قوي: NixOS يضمن بناءً محدّداً قابلاً لإعادة الإنتاج، وDocker يوفّر بيئة عزل محمولة للتشغيل.

في FastFree ننشر عبر NixOS مع حاويات محدودة الصلاحيات (rootless) خلف وكيل عكسي، تشمل الخلفية وقواعد MariaDB و Redis، مع شبكة داخلية ثابتة. هذا يمنح تشغيلاً متعدد العملاء بعزل آمن وتحديث موثّق.

الاستثمار في وصف البيئة ملفاً واحداً يوفّر وقتاً طويل الأمد أكثر مما يبدو في البداية.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Deploying software reliably needs a reproducible environment, and this is where NixOS and containers help. NixOS describes the whole server setup in a single declarative file; if it works on one machine it works on another, and it allows rolling back to a previous version if something breaks. This reduces what is known as "configuration drift".

Docker, for its part, packages the application and its dependencies into one image that runs the same way across environments, which eases moving between providers and avoids lock-in to one vendor. The combination is strong: NixOS guarantees a defined, reproducible build, while Docker provides a portable, isolated runtime.

At FastFree we deploy on NixOS with rootless containers behind a reverse proxy, including the backend and MariaDB and Redis databases, on a stable internal network. This gives multi-client operation with secure isolation and documented updates.

Investing in describing the environment as a single file saves more long-term time than it seems at first.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'كيف يوفّر NixOS بيئة قابلة لإعادة الإنتاج وDocker عزلاً محمولاً للنشر.',
    excerpt_en: 'How NixOS gives a reproducible environment and Docker a portable, isolated runtime for deploy.',
    cover_image: '/assets/blog-nixos-docker-deployment-explained.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['NixOS', 'Docker'],
    is_published: true,
    published_at: '2026-08-19',
    views: 230,
  },
  {
    id: 'web9',
    title_ar: 'أداء الموقع ومؤشّرات تجربة الويب الأساسية',
    title_en: 'Site Performance and Core Web Vitals',
    slug: 'core-web-vitals-site-performance',
    content_ar: `مؤشّرات تجربة الويب الأساسية (Core Web Vitals) من Google تقيس تجربة المستخدم الحقيقية في ثلاثة جوانب. أكبر رسم محتوى (LCP) يقيس سرعة التحميل، ويُعدّ جيداً عند حدوثه خلال 2.5 ثانية أو أقل. الاستجابة للتفاعل (INP) تقيس سرعة استجابة الصفحة للنقر واللمس، وتُعدّ جيدة عند 200 ميلّي ثانية أو أقل، وهي استُبدلت بمؤشّر FID القديم في مارس 2024. وثبات التخطيط (CLS) يقيس مدى قفز العناصر، ويُعدّ جيداً عند 0.1 أو أقل.

تُقيَّم هذه المؤشّرات من بيانات مستخدمين حقيقيين في Chrome عند النسبة المئوية 75 عبر نافذة 28 يوماً، لا من نتائج مخبرية فقط. أدوات مثل PageSpeed Insights و Search Console تظهر الحالة الفعلية، بينما Lighthouse مفيد للتشخيص. أسرع إصلاح غالباً هو عدم تأخير صورة المحتوى الرئيسي وإعطاؤها أولوية تحميل، وإضافة أبعاد واضحة لكل صورة لتفادي القفز.

السرعة تؤثر على الزوار وعلى الظهور في البحث. في واجهات FastFree نعتمد بناءً بصفر أخطاء TypeScript وصوراً بصيغ حديثة وخططاً للأداء ضمن التصميم من البداية.

تحسين الأداء عمل مستمر يقاس كل بضعة أسابيع، لا إصلاح لمرة واحدة.

للحديث معنا ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `Google's Core Web Vitals measure real user experience in three areas. Largest Contentful Paint (LCP) measures loading speed and is good at 2.5 seconds or less. Interaction to Next Paint (INP) measures how quickly the page responds to clicks and taps, and is good at 200 milliseconds or less; it replaced the older FID metric in March 2024. Cumulative Layout Shift (CLS) measures how much elements jump, and is good at 0.1 or less.

These metrics are judged from real Chrome user data at the 75th percentile over a 28-day window, not from lab scores alone. Tools like PageSpeed Insights and Search Console show the actual status, while Lighthouse is useful for diagnosis. The fastest fix is usually not to delay the main content image and to give it load priority, plus setting explicit dimensions on images to avoid shift.

Speed affects visitors and search visibility. In FastFree interfaces we use a zero-TypeScript-error build, modern image formats, and a performance plan designed in from the start.

Improving performance is ongoing work measured every few weeks, not a one-time fix.

To talk with us simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'شرح LCP و INP و CLS ومتى تُعدّ جيدة وكيف تُقاس من بيانات مستخدمين حقيقيين.',
    excerpt_en: 'Explaining LCP, INP, and CLS, their good thresholds, and how real-user data is measured.',
    cover_image: '/assets/blog-core-web-vitals-site-performance.svg',
    category: 'WEB_DEVELOPMENT',
    tags: ['Low-Code', 'Docker'],
    is_published: true,
    published_at: '2026-09-10',
    views: 540,
  },
  {
    id: 'web10',
    title_ar: 'مواقع نصممها ونبنيها: تعريفية ومتاجر سريعة ثنائية اللغة',
    title_en: 'Websites We Design and Build: Fast Bilingual Corporate Sites and Stores',
    slug: 'custom-websites-showcase',
    content_ar: `نبني في FastFree مواقع تعريفية للشركات ومتاجر إلكترونية مصممة للسوق العربي: عربية أولاً مع نسخة إنجليزية كاملة، واتجاه RTL صحيح، وخطوط عربية واضحة.

كل موقع يخرج سريعاً: صفحات خفيفة، صور محسّنة، ونتائج بحث أفضل عبر أساسيات SEO (عناوين ووصف وبيانات منظمة وخريطة موقع). السرعة ليست رفاهية — الزائر يغادر الصفحة البطيئة قبل أن يقرأ عرضك.

المتاجر تشمل سلة ودفع وطلبات وإشعارات، ولوحة تحكم سهلة يحدّث منها العميل المحتوى والمنتجات بنفسه دون أن يتصل بنا كل مرة.

منهجيتنا ثابتة: استشارة نفهم فيها النشاط، ثم تصميم يوافق الهوية، ثم تطوير واختبار على الموبايل أولاً، ثم إطلاق ومتابعة وقياس.

صممنا وبنينا بهذا الأسلوب مواقع تعريفية وواجهات أنظمة تعمل يومياً لدى عملائنا، ونطبق نفس المعايير على كل مشروع جديد.

لنتحدث عن موقعك ببساطة، واتساب +201091999937 أو admin@fastfree.cloud.`,
    content_en: `At FastFree we design and build corporate websites and e-commerce stores made for the Arab market: Arabic-first with a full English version, correct RTL layout, and clear Arabic typography.

Every site ships fast: lightweight pages, optimized images, and better search visibility through SEO basics (titles, descriptions, structured data, sitemap). Speed is not a luxury — visitors leave slow pages before reading your offer.

Stores include cart, payments, orders, and notifications, plus an easy dashboard so clients update content and products themselves without calling us every time.

Our method is fixed: a consultation to understand the business, then identity-matching design, then mobile-first development and testing, then launch, follow-up, and measurement.

We have designed and built corporate sites and system front-ends this way that serve our clients daily, and we apply the same standards to every new project.

To talk about your website simply, WhatsApp +201091999937 or admin@fastfree.cloud.`,
    excerpt_ar: 'مواقع تعريفية ومتاجر إلكترونية سريعة ثنائية اللغة نبنيها بمنهجية ثابتة من الاستشارة حتى الإطلاق.',
    excerpt_en: 'Fast bilingual corporate sites and stores we build with a fixed method from consultation to launch.',
    cover_image: null,
    category: 'WEB_DEVELOPMENT',
    tags: ['Websites', 'SEO', 'Design'],
    is_published: true,
    published_at: '2026-09-05',
    views: 150,
  },
];
