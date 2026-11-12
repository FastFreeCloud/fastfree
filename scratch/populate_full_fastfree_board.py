import sqlite3
import json
import time
import uuid

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT value FROM state WHERE key = 'plugin.fastfree_board.kanban-v2'")
row = c.fetchone()
if not row:
    print("State not found!")
    exit(1)

board_data = json.loads(row[0])

# Helper to build cards
def make_card(title, desc_md, labels, status):
    return {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": desc_md,
        "labels": labels,
        "status": status,
        "sessions": [],
        "links": [],
        "project": {
            "server": "local",
            "directory": r"C:\Users\FastFree\Desktop\fastfree",
            "name": "FastFree ERP"
        },
        "updatedAt": int(time.time() * 1000)
    }

cards = [
    # ==========================================
    # 1. FASTFREE INSTALLER (تطبيق المثبت والمرافق)
    # ==========================================
    make_card(
        "المثبت: توحيد بنية المشروع وحذف الفوضى وتأكيد الـ 3 تطبيقات والـ 9 حزم",
        "## المنجز الفعلي\n- [x] ضبط pnpm-workspace.yaml.\n- [x] حذف الحزم الزائدة والمكررة.\n- [x] التحقق من توافق monorepo dependencies وتمرير pnpm lockfile بنجاح 100%.",
        "installer, architecture, done",
        "done"
    ),
    make_card(
        "المثبت: استعادة وتصحيح 7,170 حرف عربي (Mojibake Fix) ودمج خطوط IBM Plex محلياً",
        "## المنجز الفعلي\n- [x] فك تشفير Windows-1252 العكسي إلى UTF-8.\n- [x] دمج خطوط IBM Plex Sans Arabic محلياً بدون إنترنت.\n- [x] تفعيل dir='rtl' في الواجهة لمنع تشوه النصوص.",
        "installer, i18n, fonts, done",
        "done"
    ),
    make_card(
        "المثبت: الخطوة 1 - فحص العتاد والذاكرة الحقيقية (Real Sysinfo & Hardware Probe)",
        "## المواصفات الفعلية\n- [x] استدعاء sysinfo لقراءة الأنوية والذاكرة العشوائية الحقيقية.\n- [x] التحقق من دعم المعالج للمحاكاة الافتراضية SLAT / Hyper-V.\n- [x] فحص محركات الأقراص المتاحة لتثبيت الآلات الافتراضية.",
        "installer, discovery, sysinfo, done",
        "done"
    ),
    make_card(
        "المثبت: الخطوة 2 - التشفير والترخيص السيادي الأوفلاين (Ed25519 & HWID Licensing)",
        "## خطة التنفيذ الفعلي\n- [ ] فحص التوقيع الرقمي بمفتاح Ed25519 غير قابل للكسر.\n- [ ] ربط التفعيل ببصمة الجهاز الرقمية (HWID) للعمل دون إنترنت.\n- [ ] منع تخطي شاشات التثبيت بدون رخصة مشفرة صالحة.",
        "installer, security, licensing, ready",
        "ready"
    ),
    make_card(
        "المثبت: الخطوة 3 - التخصيص الديناميكي للذاكرة وحماية النظام المضيف (Dynamic RAM Sizing)",
        "## خطة التنفيذ الفعلي\n- [ ] قراءة الذاكرة المتاحة وحجز 2GB إجبارياً لنظام ويندوز لمنع انهيار النظام.\n- [ ] ضبط معايير Hyper-V Memory Alignment (مضاعفات 128MB).\n- [ ] منع تخصيص أكثر من المتاح لتجنب خطأ 0x800705AA.",
        "installer, memory, hyperv, ready",
        "ready"
    ),
    make_card(
        "المثبت: الخطوة 4 - توليد مفاتيح شبكة WireGuard الحقيقية وإعداد جدار الحماية",
        "## خطة التنفيذ الفعلي\n- [ ] توليد أزواج مفاتيح تشفير WireGuard (Private/Public) لكل عقدة.\n- [ ] كتابة ملف التكوين wg0.conf وضبط منفذ UDP 51820.\n- [ ] فتح المنفذ في Windows Firewall تلقائياً عبر واجهة INetFwPolicy2 في Rust.",
        "installer, wireguard, firewall, ready",
        "ready"
    ),
    make_card(
        "المثبت: الخطوة 5 - نشر آلة Hyper-V Gen 2 وبناء صورة NixOS الحقيقية (Real VHDX Deploy)",
        "## خطة التنفيذ الفعلي\n- [ ] التحقق من صلاحيات Administrator وطلب الترقية.\n- [ ] تنزيل وفك ضغط صورة fastfree_{client}.vhdx.zst السيادية.\n- [ ] إنشاء آلة Gen 2 في C:\\FastFree\\VMs وضبط إقلاع SCSI وتعطيل SecureBoot لـ GRUB2.\n- [ ] مراقبة نبض الآلة الحقيقي وقراءة مؤشرات WMI للأداء.",
        "installer, hyperv, provisioning, ready",
        "ready"
    ),
    make_card(
        "المثبت: الخطوة 6 - سطح مكتب CasaOS وبوابة التطبيقات الـ 12 السيادية",
        "## المنجز الفعلي\n- [x] تصميم شبكة CasaOS المتكاملة بـ 12 تطبيقاً ونظاماً سيادياً.\n- [x] ربط كل تطبيق بمنافذه وعقد الـ Mesh الخاصة به.\n- [x] التحقق البصري واختبار الـ DOM عبر أدوات MCP.",
        "installer, casaos, launchpad, done",
        "done"
    ),
    make_card(
        "المثبت: الراوتر الداخلي للشاشات السيادية داخل تطبيق الديسك توب (In-App Sovereign Router)",
        "## المنجز الفعلي\n- [x] تشغيل شاشات المحاسبة، الكاشير، وأسطول السيرفرات داخل التطبيق فوراً دون متصفح.\n- [x] توفير زر رجوع لسطح مكتب التطبيقات.\n- [x] التقاط وتوثيق صور الشاشات عبر أدوات MCP.",
        "installer, router, in-app, done",
        "done"
    ),
    make_card(
        "المثبت: بناء الحزمة النهائية المستقلة للإنتاج والتوزيع (Tauri NSIS Setup .exe)",
        "## خطة التنفيذ الفعلي\n- [ ] تشغيل cargo tauri build لإنتاج ملف FastFree-Node-Setup.exe نهائي.\n- [ ] تضمين جميع الخطوط والأيقونات والملفات ليعمل 100% دون إنترنت.\n- [ ] اختبار التثبيت الصامت والتنصيب المكتبي المستقل.",
        "installer, build, nsis, backlog",
        "backlog"
    ),

    # ==========================================
    # 2. FASTFREE LOWCODE (محرك الـ SDUI والـ Quasar Extension)
    # ==========================================
    make_card(
        "حزمة fastfree_lowcode: محرك قراءة ومعالجة شاشات الـ JSON SDUI Parser",
        "## المنجز الفعلي\n- [x] معالجة شاشات SDUI وتحويل الـ JSON إلى مكونات Quasar تفاعلية.\n- [x] دعم بنية العقد الشجرية (AST Nodes).\n- [x] اجتياز 18 من 18 فحصاً قياسياً في أداة verify-sdui-screens.cjs.",
        "lowcode, quasar_extension, parser, done",
        "done"
    ),
    make_card(
        "حزمة fastfree_lowcode: التخزين المحلي السريع والعمل دون اتصال (SWR Dexie / IndexedDB)",
        "## خطة التنفيذ الفعلي\n- [ ] تفعيل استراتيجية Stale-While-Revalidate (SWR) لملفات الـ JSON.\n- [ ] تخزين الشاشات والبيانات محلياً في Dexie.js لتسريع الفتح لأقل من 50ms.\n- [ ] مزامنة التعديلات تلقائياً عند الاتصال بالشبكة.",
        "lowcode, indexeddb, offline, progress",
        "progress"
    ),
    make_card(
        "حزمة fastfree_lowcode: نظام التوكينز والألوان السيادية والثيمات (Tokens & Dark Theme)",
        "## المنجز الفعلي\n- [x] إضافة 269 سطراً من متغيرات tokens.css الموحدة.\n- [x] دعم الثيم المظلم (Dark) والنهاري (Light) و OLED.\n- [x] توحيد كلاسات المحاذاة والـ RTL وسيادية التصميم.",
        "lowcode, tokens, css, done",
        "done"
    ),

    # ==========================================
    # 3. FASTFREE OS (إدارة أسطول السيرفرات وموديولات Clan)
    # ==========================================
    make_card(
        "حزمة fastfree_os: دمج الـ Panel بالكامل وتوحيد إدارة الـ 11 سيرفر وموديولات Clan",
        "## المنجز الفعلي\n- [x] دمج كود fastfree_panel داخل fastfree_os.\n- [x] ربط backend Hono بقائمة الأجهزة والخدمات في inventory.json.\n- [x] إزالة التكرار وتوحيد الحزمة تحت مظلة واحدة.",
        "fastfree_os, clan, panel, done",
        "done"
    ),
    make_card(
        "حزمة fastfree_os: معالج إنشاء وتخصيص عميل Clan السيادي (client_manager.json)",
        "## المنجز الفعلي\n- [x] شاشة SDUI متكاملة لإدخال اسم العميل والنطاق وتخصيص عتاد Hyper-V.\n- [x] سويتشات اختيار التطبيقات والخدمات لكل عميل.\n- [x] توليد تعريف العميل في inventory.json وبناء الـ VHDX.",
        "fastfree_os, client_manager, sdui, done",
        "done"
    ),
    make_card(
        "حزمة fastfree_os: شاشة مراقبة الأسطول والربط الشبكي WireGuard (fleet_monitor.json)",
        "## المنجز الفعلي\n- [x] شاشة تفاعلية لمراقبة الـ 11 سيرفر Clan بنظام الـ JSON.\n- [x] قياس زمن الاستجابة (Latency) ومراقبة خدمات systemd.\n- [x] توثيق لقطات الشاشة بنجاح عبر أدوات MCP.",
        "fastfree_os, fleet_monitor, wireguard, done",
        "done"
    ),

    # ==========================================
    # 4. FASTFREE AUTH (المصادقة والأمان السيادي)
    # ==========================================
    make_card(
        "حزمة fastfree_auth: شاشة تسجيل الدخول السيادية وحماية الحسابات (auth_login.json)",
        "## خطة التنفيذ الفعلي\n- [ ] تصميم شاشة تسجيل الدخول الأوفلاين بنظام الـ SDUI JSON.\n- [ ] التحقق من كلمات المرور المحلية عبر التجزئة الآمنة (Argon2id).\n- [ ] دعم التوثيق الثنائي (2FA TOTP) بدون الاعتماد على سيرفر خارجي.",
        "fastfree_auth, sdui, login, ready",
        "ready"
    ),
    make_card(
        "حزمة fastfree_auth: مصفوفة الصلاحيات والأدوار (Sovereign RBAC & Permissions Matrix)",
        "## خطة التنفيذ الفعلي\n- [ ] تحديد أدوار المستخدمين (مدير النظام، محاسب، كاشير، مدير مخزن، مدير مشتريات).\n- [ ] ربط الصلاحيات بالـ SDUI Components لإخفاء أو تعطيل الأزرار غير المصرح بها.\n- [ ] توثيق سجل تدقيق العمليات الحساسة (Audit Log).",
        "fastfree_auth, rbac, security, ready",
        "ready"
    ),

    # ==========================================
    # 5. FASTFREE ACCOUNTING (المحاسبة والمالية)
    # ==========================================
    make_card(
        "حزمة fastfree_accounting: شاشة دفتر الأستاذ العام والقوائم المالية (general_ledger.json)",
        "## المنجز الفعلي\n- [x] بناء شاشة دفتر الأستاذ العام بنظام SDUI JSON.\n- [x] عرض المؤشرات المالية التنفيذية، الميزانية، وقيود اليومية.\n- [x] التحقق البصري والتشغيل المباشر داخل التطبيق عبر الـ MCP.",
        "fastfree_accounting, ledger, sdui, done",
        "done"
    ),
    make_card(
        "حزمة fastfree_accounting: الشجرة المحاسبية والقيود المزدوجة (Chart of Accounts Engine)",
        "## خطة التنفيذ الفعلي\n- [ ] هيكلة شجرة الحسابات (الأصول، الخصوم، حقوق الملكية، الإيرادات، المصروفات).\n- [ ] نظام تسجيل القيود المحاسبية الآلية من فواتير المبيعات والمشتريات.\n- [ ] تصدير ميزان المراجعة وقائمة الدخل إلى PDF و Excel أوفلاين.",
        "fastfree_accounting, chart_of_accounts, finance, ready",
        "ready"
    ),

    # ==========================================
    # 6. FASTFREE SALES (المبيعات ونقاط البيع POS)
    # ==========================================
    make_card(
        "حزمة fastfree_sales: شاشة نقطة البيع السريعة والكاشير اللمسي (pos_checkout.json)",
        "## المنجز الفعلي\n- [x] بناء واجهة كاشير POS كاملة عبر SDUI JSON.\n- [x] دعم شبكة المنتجات بالأسعار، التصنيفات، وسلة المشتريات التفاعلية.\n- [x] التحقق البصري والتشغيل المباشر داخل التطبيق عبر الـ MCP.",
        "fastfree_sales, pos, sdui, done",
        "done"
    ),
    make_card(
        "حزمة fastfree_sales: قارئ الباركود، الطابعات الحرارية، والفاتورة الضريبية ZATCA",
        "## خطة التنفيذ الفعلي\n- [ ] ربط مدخلات ماسح الباركود (USB/كاميرا) للبحث والإضافة الفورية للسلة.\n- [ ] طباعة الإيصالات الحرارية أوفلاين عبر بروتوكول ESC/POS.\n- [ ] توليد الفاتورة الضريبية المبسطة مع رمز الاستجابة السريعة (QR Code).",
        "fastfree_sales, barcode, zatca, printer, ready",
        "ready"
    ),

    # ==========================================
    # 7. FASTFREE INVENTORY (إدارة المخازن والمستودعات)
    # ==========================================
    make_card(
        "حزمة fastfree_inventory: شاشة الجرد وإدارة المستودعات (inventory_audit.json)",
        "## خطة التنفيذ الفعلي\n- [ ] تصميم شاشة جرد المستودعات والتحويلات المخزنية بنظام SDUI JSON.\n- [ ] تتبع حركة الأصناف (Stock Ledger) بالدخول والخروج.\n- [ ] تنبيهات انخفاض المخزون وإعادة الطلب التلقائي.",
        "fastfree_inventory, sdui, warehouse, ready",
        "ready"
    ),
    make_card(
        "حزمة fastfree_inventory: إدارة الأرقام التسلسلية وتتبع الشحنات والباركود",
        "## خطة التنفيذ الفعلي\n- [ ] دعم الأصناف ذات الأرقام التسلسلية (Serial Numbers) وتواريخ الصلاحية (Batches).\n- [ ] توليد وطباعة ملصقات الباركود لمنتجات المستودع أوفلاين.\n- [ ] إدارة المواقع والأرفف المتعددة داخل المستودع الواحد.",
        "fastfree_inventory, barcode, batches, ready",
        "ready"
    ),

    # ==========================================
    # 8. FASTFREE PURCHASE (المشتريات والموردين)
    # ==========================================
    make_card(
        "حزمة fastfree_purchase: شاشة أوامر الشراء ودورة الموردين (purchase_order.json)",
        "## خطة التنفيذ الفعلي\n- [ ] تصميم شاشة طلبات وأوامر الشراء (PO) بنظام SDUI JSON.\n- [ ] سجل الموردين ومقارنة عروض الأسعار (RFQ).\n- [ ] اعتماد سندات استلام البضائع (GRN) ومطابقتها مع الفواتير والمخزون.",
        "fastfree_purchase, sdui, procurement, ready",
        "ready"
    ),

    # ==========================================
    # 9. FASTFREE HR (الموارد البشرية والرواتب)
    # ==========================================
    make_card(
        "حزمة fastfree_hr: شاشة شؤون الموظفين ومسيرات الرواتب (employee_payroll.json)",
        "## خطة التنفيذ الفعلي\n- [ ] تصميم شاشة سجل الموظفين والعقود بنظام SDUI JSON.\n- [ ] متابعة الحضور والانصراف وتسجيل الإجازات.\n- [ ] حساب مسيرات الرواتب الشهرية والبدلات والاستقطاعات وتوليد قسيمة الراتب.",
        "fastfree_hr, sdui, payroll, ready",
        "ready"
    ),

    # ==========================================
    # 10. FASTFREE CRM (إدارة علاقات العملاء)
    # ==========================================
    make_card(
        "حزمة fastfree_crm: شاشة خط الصفقات والعملاء المحتملين (lead_pipeline.json)",
        "## خطة التنفيذ الفعلي\n- [ ] تصميم شاشة كانبان مسار الصفقات (Deals Pipeline) بنظام SDUI JSON.\n- [ ] إدارة العملاء المحتملين وتتبع مراحل التفاوض.\n- [ ] تحويل الصفقة الفائزة بضغطة زر إلى فاتورة مبيعات في fastfree_sales.",
        "fastfree_crm, sdui, pipeline, ready",
        "ready"
    ),

    # ==========================================
    # 11. FASTFREE BACKEND & WEBSITE (الخادم السيادي والموقع)
    # ==========================================
    make_card(
        "تطبيق fastfree_backend: خادم Hono وخدمات Frappe الميكروية وقاعدة البيانات",
        "## خطة التنفيذ الفعلي\n- [ ] ربط محرك الـ Backend بقواعد بيانات MariaDB و Redis.\n- [ ] توفير REST و MCP Endpoints لإدارة عملاء أسطول Clan.\n- [ ] تأمين الاتصال المحلي السيادي مع تطبيق الديسك توب عبر WireGuard.",
        "backend, hono, frappe, ready",
        "ready"
    ),
    make_card(
        "تطبيق fastfree_website: البوابة السيادية وتحميل حزم التثبيت والتراخيص (Next.js)",
        "## خطة التنفيذ الفعلي\n- [ ] واجهة Next.js تعريفية سيادية لنظام FastFree ERP.\n- [ ] صفحة تحميل تطبيق الديسك توب (.exe) وتطبيق الأندرويد (.apk).\n- [ ] بوابة استخراج مفاتيح التفعيل السيادية الأوفلاين.",
        "website, nextjs, portal, ready",
        "ready"
    )
]

board_data["cards"] = cards

# Update state in drafts.sqlite
new_val = json.dumps(board_data, ensure_ascii=False)
c.execute("UPDATE state SET value = ?, updated_at = ? WHERE key = 'plugin.fastfree_board.kanban-v2'", (new_val, int(time.time() * 1000)))
conn.commit()
conn.close()

print(f"Successfully populated FastFree Board with {len(cards)} comprehensive lifecycle tasks across all apps and packages!")
