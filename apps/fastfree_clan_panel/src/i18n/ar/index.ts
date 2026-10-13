/**
 * Arabic bundle, typed against the English master schema. A key that is
 * missing or misspelled here is a compile error, not a blank label.
 *
 * The UI renders English first and the Arabic beside it in its own span with
 * dir="rtl", so this file stays flat — no nested objects are needed.
 */
import type enUS from '../en-US';

const ar: typeof enUS = {
  app: {
    name: 'لوحة Clan',
    tagline: 'تحكم في الأسطول',
  },

  login: {
    title: 'تسجيل الدخول',
    subtitle: 'الصق توكن اللوحة للمتابعة',
    token: 'توكن الوصول',
    submit: 'دخول',
    verifying: 'جارٍ التحقق من التوكن…',
    failed: 'التوكن ده مش مقبول',
    hint: 'التوكن هو متغير البيئة CLAN_PANEL_TOKEN على السيرفر',
  },

  nav: {
    groups: {
      fleet: 'الأسطول',
      operations: 'العمليات',
      data: 'البيانات',
      security: 'الأمان',
      infrastructure: 'البنية التحتية',
    },
    overview: 'نظرة عامة',
    machines: 'الأجهزة',
    inventory: 'المخزون',
    services: 'الخدمات',
    jobs: 'المهام',
    build: 'البناء',
    generations: 'الإصدارات',
    backups: 'النسخ الاحتياطي',
    state: 'الحالة',
    vars: 'المتغيرات',
    varsHealth: 'سلامة المتغيرات',
    secrets: 'الأسرار',
    access: 'الوصول',
    network: 'الشبكة',
    monitoring: 'المراقبة',
    settings: 'الإعدادات',
    signOut: 'خروج',
  },

  common: {
    refresh: 'تحديث',
    loading: 'جارٍ التحميل…',
    empty: 'مفيش حاجة تتعرض دلوقتي',
    error: 'حصل خطأ',
    retry: 'إعادة محاولة',
    cancel: 'إلغاء',
    close: 'إغلاق',
    confirm: 'تأكيد',
    run: 'تشغيل',
    copy: 'نسخ',
    copied: 'تم النسخ',
    detail: 'التفاصيل',
    all: 'الكل',
    machine: 'الجهاز',
    status: 'الحالة',
    actions: 'إجراءات',
    duration: 'المدة',
    result: 'النتيجة',
    never: 'أبداً',
    yes: 'نعم',
    no: 'لا',
    unknown: 'غير معروف',
    masked: '••••••••',
    experimental: 'تجريبي',
    builtinTags: 'وسوم مدمجة',
    managedBy: 'مُدار بواسطة Clan',
    tokenAuthOn: 'توكن المصادقة شغّال',
  },

  status: {
    reachable: 'موصول',
    unreachable: 'مش موصول',
    running: 'شغّال',
    updating: 'بيحدّث',
    queued: 'في الانتظار',
    succeeded: 'نجح',
    failed: 'فشل',
    cancelling: 'بيلغي',
    needsFix: 'محتاج إصلاح',
    missing: 'ناقص',
    valid: 'صالح',
  },

  overview: {
    title: 'نظرة عامة',
    needsAttention: 'محتاج انتباه',
    jobsToday: 'مهام النهارده',
    noRecentBackup: 'مفيش نسخة احتياطية حديثة',
    recentJobs: 'آخر المهام',
    fleetHealthy: 'كل الأجهزة ردت',
    machinesCount: 'عدد الأجهزة',
    reachableCount: 'الأجهزة الموصولة',
  },

  machines: {
    title: 'الأجهزة',
    generation: 'الإصدار',
    lastBackup: 'آخر نسخة',
    update: 'تحديث',
    updateConfirm: 'ده بيشغّل `clan machines update` على {machine}. هيغيّر النظام المستخدم.',
    detail: 'تفاصيل الجهاز',
  },

  machineDetail: {
    title: 'تفاصيل الجهاز',
    vars: 'المتغيرات',
    secretsMasked: 'الأسرار بتتقنّع دايماً.',
    updateJob: 'مهمة التحديث',
    startedAgo: 'شغّال · بدأ {when}',
    cancelJob: 'إلغاء المهمة',
    copyLog: 'نسخ السجل',
    noJob: 'مفيش مهمة اتشغلت لهذا الجهاز بعد',
  },

  inventory: {
    title: 'المخزون',
    class: 'النوع',
    tags: 'الوسوم',
    targetHost: 'جهاز الهدف',
    instances: 'الحالات',
    noTarget: '—',
  },

  services: {
    title: 'الخدمات',
    instance: 'الحالة',
    module: 'الوحدة',
    role: 'الدور',
    instancesExperimental: 'الحالات / التجريبية',
  },

  jobs: {
    title: 'المهام',
    everythingRun: 'كل اللي اللوحة شغّلته',
    command: 'الأمر',
    started: 'البداية',
    log: 'السجل',
    noJobs: 'مفيش مهمة اتشغلت بعد',
  },

  build: {
    title: 'البناء',
    machine: 'الجهاز',
    buildHost: 'جهاز البناء',
    format: 'الصيغة',
    dryRunOnly: 'تجربة جافة بس',
    runBuild: 'شغّل البناء',
    noResult: 'مفيش بناء اتشغّل بعد',
  },

  generations: {
    title: 'الإصدارات',
    versionHistory: 'تاريخ إصدارات جهاز واحد',
    generation: 'الإصدار',
    built: 'متبني',
    note: 'ملاحظة',
    none: 'مفيش إصدارات',
  },

  backups: {
    title: 'النسخ الاحتياطي',
    withBackups: 'اللي فيها نسخ',
    without: 'اللي مفيهاش',
    latestBackup: 'آخر نسخة',
    lastBackup: 'آخر نسخة احتياطية',
    createBackup: 'اعمل نسخة',
    destination: 'الوجهة',
    schedule: 'المواعيد',
    excludes: 'المستثنى',
    createConfirm: 'ده بيبدأ مهمة نسخ احتياطي لـ {machine}.',
    none: 'مفيش نسخ احتياطي متظبطة',
  },

  state: {
    title: 'الحالة',
    whatData: 'البيانات اللي كل خدمة بتحتفظ بيها',
    service: 'الخدمة',
    folders: 'المجلدات',
    hooks: 'الخطافات',
    none: 'الجهاز ده مش معرّف مجلدات حالة',
  },

  vars: {
    title: 'المتغيرات',
    key: 'المفتاح',
    scope: 'النطاق',
    value: 'القيمة',
    secret: 'سر',
    perMachine: 'لكل جهاز',
    shared: 'مشترك',
    none: 'مفيش متغيرات',
  },

  varsHealth: {
    title: 'سلامة المتغيرات',
    machine: 'الجهاز',
    generator: 'المُولِّد',
    result: 'النتيجة',
    action: 'الإجراء',
    check: 'فحص',
    fix: 'إصلاح',
    fixConfirm: 'ده بيشغّل `clan vars fix` على {machine}. هيعيد كتابة مخزن المتغيرات.',
    backUpKey: 'خد نسخة من مفتاح الـ age. لو ضاع، كل المتغيرات المشفّرة هتبقى مقروءةش.',
    allValid: 'كل المتغيرات موجودة وصالحة.',
  },

  secrets: {
    title: 'الأسرار',
    whoCanDecrypt: 'مين يقدر يفك تشفير أي سر',
    users: 'المستخدمين',
    groups: 'المجموعات',
    notAvailable: 'غير متاح هنا',
    disabledNotice:
      'قيم الأسرار ماتعرضش أبداً. اللوحة بتعرض المستقبِلين بس — `secrets get` و`secrets set` و`secrets remove` متعطّلين.',
  },

  access: {
    title: 'الوصول',
    sshAdmin: 'SSH والإدارة ووصول الطوارئ',
    machinesWithAdmin: 'أجهزة فيها إدارة',
    emergencyAccess: 'وصول الطوارئ',
    caCertificates: 'شهادات CA',
    sshdRole: 'دور sshd',
    hostCertificate: 'شهادة الجهاز',
    adminUser: 'مستخدم الإدارة',
    users: 'المستخدمين',
    carefulKeys: 'احذر المفاتيح المصرّح بها',
    carefulKeysBody:
      'تعديل المفاتيح المصرّحة على جهاز بعيد ممكن يقفل عليك. سيب مفتاح تاني وكون عندك console شغّال.',
  },

  network: {
    title: 'الشبكة',
    howReached: 'إزاي بنوصل لكل جهاز',
    pingAll: 'اتصل بالكل',
    connectionOrder: 'ترتيب الاتصال',
    activeRoute: 'المسار النشط',
    transport: 'وسيلة النقل',
    roles: 'الأدوار',
    internet: 'الإنترنت',
    zerotier: 'ZeroTier',
    tor: 'Tor',
    none: 'مفيش وسائل نقل متسجّلة',
  },

  monitoring: {
    title: 'المراقبة',
    clients: 'العملاء',
    server: 'السيرفر',
    grafanaEnabled: 'Grafana: {state}',
    openGrafana: 'افتح Grafana',
    monitoredServices: 'الخدمات المرصودة',
    ssl: 'SSL',
    notConfigured: 'المراقبة مش متظبطة للجهاز ده',
  },

  settings: {
    title: 'الإعدادات',
    clanDetails: 'تفاصيل Clan وأمان اللوحة',
    name: 'الاسم',
    description: 'الوصف',
    domain: 'الدومين',
    panel: 'اللوحة',
    clanFolder: 'مجلد Clan',
    listensOn: 'بيسمع على',
    token: 'التوكن',
    tokenSource: 'CLAN_PANEL_TOKEN (بيئة)',
    intentionallyDisabled: 'معطّل عن قصد',
    disabledList:
      'machines install, machines delete, machines create, flash write, backups restore, vars get, vars set, secrets get/set/remove, templates apply, update --no-check',
  },
};

export default ar;