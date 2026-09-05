export type Service = {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  features: { ar: string; en: string }[];
  is_active: boolean;
  sort_order: number;
};

export const services: Service[] = [
  {
    id: '1',
    title_ar: 'منصّة منخفضة الكود',
    title_en: 'Low-Code Platform',
    description_ar: 'محرك واجهات Vue قابل لإعادة الاستخدام يوفّر مدير نوافذ وجداول CRUD وإنشاء نماذج ديناميكي وتصميماً ودعماً للعربية/الإنجليزية لبناء التطبيقات في وقت قياسي.',
    description_en: 'A reusable Vue engine providing a window manager, CRUD tables, dynamic form generation, theming, and EN/AR i18n so business apps are built in record time.',
    icon: 'Blocks',
    features: [
      { ar: 'مدير نوافذ وجداول ديناميكية', en: 'Window Manager + Dynamic Tables' },
      { ar: 'إنشاء نماذج ديناميكي', en: 'Dynamic Form Generation' },
      { ar: '10 ثيمات ودعم عربي/إنجليزي', en: '10 Themes + EN/AR i18n' },
    ],
    is_active: true,
    sort_order: 1,
  },
  {
    id: '2',
    title_ar: 'نظام ERP معياري',
    title_en: 'Modular ERP Suite',
    description_ar: 'نظام موارد مؤسسية قابل للتركيب تندمج فيه وحدات المحاسبة والمخزون والمبيعات والمشتريات والموارد البشرية وإدارة العملاء في مساحة عمل واحدة.',
    description_en: 'A composable ERP where accounting, inventory, sales, purchase, HR, and CRM modules plug into one unified workspace.',
    icon: 'LayoutDashboard',
    features: [
      { ar: '60 شاشة و43 خدمة', en: '60 Screens, 43 Services' },
      { ar: 'نواة مشتركة بإصدارات', en: 'Versioned Shared Core' },
      { ar: 'يعمل دون اتصال', en: 'Works Offline (IndexedDB)' },
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    id: '3',
    title_ar: 'المحاسبة والتمويل',
    title_en: 'Accounting & Finance',
    description_ar: 'محاسبة مزدوجة القيد كاملة: دليل حسابات وقيود يومية ومدفوعات ومراكز تكلفة وسنوات مالية وتقارير مالية جاهزة للضرائب.',
    description_en: 'Full double-entry accounting: chart of accounts, journal entries, payments, cost centers, fiscal years, and tax-ready financial reports.',
    icon: 'Calculator',
    features: [
      { ar: 'دفتر حسابات مزدوج', en: 'Double-Entry Ledger' },
      { ar: 'ميزان مراجعة وأرباح وخسائر', en: 'Trial Balance & P&L' },
      { ar: 'ضريبة القيمة المضافة والخصم', en: 'VAT & Withholding Tax' },
    ],
    is_active: true,
    sort_order: 3,
  },
  {
    id: '4',
    title_ar: 'المخزون والمستودعات',
    title_en: 'Inventory & Warehouse',
    description_ar: 'إدارة الأصناف والمخزون متعدد المستودعات وتتبّع الأرقام التسلسلية والدفعات وتقييم المخزون بتقارير أعمار المخزون.',
    description_en: 'Manage products, multi-warehouse stock, serial/batch tracking, and stock valuation with aging reports.',
    icon: 'Package',
    features: [
      { ar: 'مخزون متعدد المستودعات', en: 'Multi-Warehouse Stock' },
      { ar: 'تتبّع رقمي وتسلسلي', en: 'Serial & Batch Tracking' },
      { ar: 'تقارير تقييم المخزون', en: 'Stock Valuation Reports' },
    ],
    is_active: true,
    sort_order: 4,
  },
  {
    id: '5',
    title_ar: 'المبيعات والطلبات',
    title_en: 'Sales & Orders',
    description_ar: 'دورة مبيعات كاملة: العملاء وعروض الأسعار وأوامر البيع والفواتير وأذون التسليم مع متابعة الذمم.',
    description_en: 'Full sales cycle: customers, quotations, sales orders, invoices, and delivery notes with receivables tracking.',
    icon: 'ShoppingCart',
    features: [
      { ar: 'عرض سعر→أمر بيع→فاتورة', en: 'Quote→Order→Invoice' },
      { ar: 'تتبّع التسليم', en: 'Delivery Tracking' },
      { ar: 'تقارير الذمم', en: 'Receivables Reports' },
    ],
    is_active: true,
    sort_order: 5,
  },
  {
    id: '6',
    title_ar: 'المشتريات والتوريد',
    title_en: 'Purchase & Procurement',
    description_ar: 'إدارة الموردين وأوامر الشراء وإيصالات الاستلام والفواتير مع متابعة المبالغ المستحقة.',
    description_en: 'Supplier management plus purchase orders, goods receipts, and invoices with outstanding-amount tracking.',
    icon: 'Truck',
    features: [
      { ar: 'دليل الموردين', en: 'Supplier Directory' },
      { ar: 'أمر شراء→استلام→فاتورة', en: 'PO→Receipt→Invoice' },
      { ar: 'تصدير CSV', en: 'CSV Export' },
    ],
    is_active: true,
    sort_order: 6,
  },
  {
    id: '7',
    title_ar: 'الموارد البشرية والرواتب',
    title_en: 'HR & Payroll',
    description_ar: 'الموظفون والأقسام والحضور والإجازات ومعالجة الرواتب لكل الشركة بضغطة واحدة.',
    description_en: 'Employees, departments, attendance, leave, and one-click company-wide payroll processing.',
    icon: 'Users',
    features: [
      { ar: 'سجلات الموظفين', en: 'Employee Records' },
      { ar: 'الحضور والإجازات', en: 'Attendance & Leave' },
      { ar: 'عمليات الرواتب', en: 'Payroll Runs' },
    ],
    is_active: true,
    sort_order: 7,
  },
  {
    id: '8',
    title_ar: 'إدارة العملاء والتسويق',
    title_en: 'CRM & Marketing',
    description_ar: 'دورة حياة العملاء المحتملين ومسار الفرص وجهات الاتصال وتحليلات الحملات مع دعم ثنائي اللغة.',
    description_en: 'Lead lifecycle, opportunity pipeline, contacts, and campaign analytics with bilingual support.',
    icon: 'Contact',
    features: [
      { ar: 'مسار العملاء المحتملين', en: 'Lead Pipeline' },
      { ar: 'تتبّع الفرص', en: 'Opportunity Tracking' },
      { ar: 'تحليلات الحملات', en: 'Campaign Analytics' },
    ],
    is_active: true,
    sort_order: 8,
  },
  {
    id: '9',
    title_ar: 'الأمان والترخيص',
    title_en: 'Auth, Security & Licensing',
    description_ar: 'تسجيل الدخول والجلسات وصلاحيات حسب الأدوار وترخيص الطبقات والتخزين دون اتصال والمزامنة اللحظية.',
    description_en: 'Login/sessions, role-based access control, license tiers, offline storage, and realtime sync across modules.',
    icon: 'ShieldCheck',
    features: [
      { ar: 'صلاحيات حسب الأدوار', en: 'RBAC Permissions' },
      { ar: 'طبقات الترخيص', en: 'License Tiers' },
      { ar: 'دون اتصال ولحظي', en: 'Offline + Realtime' },
    ],
    is_active: true,
    sort_order: 9,
  },
  {
    id: '10',
    title_ar: 'الاستضافة السحابية وDevOps',
    title_en: 'Cloud Hosting & DevOps',
    description_ar: 'نشر متعدد العملاء عبر NixOS وDocker مع وكيل عكسي وشبكة VPN ومعالجة احتياطية وأداة سطر أوامر.',
    description_en: 'Multi-client deployment via NixOS + Docker with reverse proxy, WireGuard VPN, backups, and a CLI tool.',
    icon: 'Cloud',
    features: [
      { ar: 'NixOS متعدد العملاء', en: 'NixOS Multi-Client' },
      { ar: 'Docker وشبكة خاصة', en: 'Docker + VPN' },
      { ar: 'سطر أوامر ونسخ احتياطي', en: 'CLI & Backups' },
    ],
    is_active: true,
    sort_order: 10,
  },
];
