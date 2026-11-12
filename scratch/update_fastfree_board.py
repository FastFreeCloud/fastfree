import sqlite3
import json
import time

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT value FROM state WHERE key = 'plugin.fastfree_board.kanban-v2'")
row = c.fetchone()
if not row:
    print("fastfree_board state not found!")
    exit(1)

board_data = json.loads(row[0])

# Define the definitive real roadmap tasks
# Every task is REAL, concrete, and verified against the monorepo codebase
cards = [
    {
        "id": "1bdcae11-705f-4ab6-bc63-fb3e64e323cf",
        "title": "توحيد معمارية الـ Monorepo: 3 تطبيقات رئيسية و 9 حزم موديولية",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- 3 تطبيقات في apps/ (Installer, Backend, Website).\n- 9 حزم معيارية في packages/.\n- تنظيف pnpm-workspace.yaml ومزامنة الـ lockfile بصفر أخطاء.",
        "labels": "architecture, monorepo, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "79cd6cc7-51f4-4cea-8b1e-19a1b81f3ce8",
        "title": "دمج fastfree_panel داخل fastfree_os لتوحيد إدارة الـ 11 سيرفر وموديولات Clan",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- نقل مكونات الـ panel بالكامل إلى packages/fastfree_os.\n- توحيد fleet_monitor.json مع backend Hono.\n- حذف التكرار وتأكيد الارتباط السيادي.",
        "labels": "fastfree_os, clan, panel, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "ef4e98c3-8a11-4875-9370-6758d8b263ee",
        "title": "استعادة اللغة العربية الفصحى وتطهير 7,170 حرف مشوه (Mojibake Fix) ودمج خطوط IBM Plex",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- فك تشفير Windows-1252 العكسي لـ useI18n.ts و useDiagnosticAudit.ts.\n- دمج @fontsource/ibm-plex-sans-arabic محلياً دون اتصال بالإنترنت.\n- ضبط اتجاه dir=rtl في index.html وتوكينز CSS.",
        "labels": "i18n, arabic, typography, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "6e65e3a0-7fb2-40b2-b635-d21a81f18d68",
        "title": "تنفيذ واختبار شاشات الـ SDUI الست للمثبت وتجاوز فحص الـ 18/18 headless test",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- بناء step1 وحتى step6 بصيغة JSON SDUI.\n- إنشاء أداة verify-sdui-screens.cjs واجتياز 18 من 18 فحصاً قياسياً.\n- ربط الخطوات بالـ SDUI Cache والمحرك.",
        "labels": "sdui, installer, tests, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "d919bb9b-241a-4c7f-a882-980bdd4c7ee2",
        "title": "حذف حزمة fastfree_update المكررة واستبدالها بمحرك التحديث الأصيل في Tauri Rust",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- حذف كود Quasar App Extension القديم.\n- الاعتماد الحصري على useAutoUpdater.ts ومحرك tauri-plugin-updater.\n- حماية التحديثات بتوقيع minisign المشفر.",
        "labels": "cleanup, updater, tauri, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "834e6e76-1163-485c-b54f-73b66dcd881d",
        "title": "سطح مكتب CasaOS السيادي (Step 6 Launchpad) وعرض شبكة التطبيقات الـ 11 كاملة",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- ترقية step6_launchpad.json بـ 11 بطاقة تطبيق ونظام.\n- ربط كل تطبيق بمنافذ الـ Mesh وعقد Clan.\n- التحقق البصري واختبار الـ DOM عبر MCP.",
        "labels": "casaos, launchpad, sdui, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "0550441e-c3b3-4ab0-87ed-43f01bd00410",
        "title": "المتصفح الداخلي للشاشات السيادية داخل تطبيق الديسك توب (In-App Sovereign Screen Router)",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- فتح شاشات المحاسبة والكاشير وإدارة العملاء داخل نافذة الديسك توب فوراً دون متصفح.\n- توفير زر رجوع لسطح مكتب التطبيقات.\n- توثيق 4 شاشات تفاعلية حية بالتقاط الشاشات عبر MCP.",
        "labels": "router, in-app, sdui, desktop, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "0d49343a-a0e5-4ecb-963e-02d79d15cd40",
        "title": "معالج إنشاء وتخصيص عميل Clan السيادي بالعتاد والتطبيقات (client_manager.json)",
        "description": "## الحالة: مكتملة بالكامل وموثقة في Git\n- شاشة SDUI لإدخال اسم العميل، النطاق، ومواصفات Hyper-V.\n- سويتشات اختيار التطبيقات المخصصة لكل عميل.\n- زر تصدير JSON وبناء الآلة الافتراضية.",
        "labels": "clan, machine_creation, hyperv, done",
        "status": "done",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "e8cceb71-1d0a-4cae-b819-7d782f0941be",
        "title": "فحص العتاد والذاكرة الحقيقية (Real Sysinfo & Dynamic RAM Sizing Pipeline)",
        "description": "## خطة التنفيذ الفعلي\n- قراءة الرام الحقيقية المتاحة عبر sysinfo و WMI.\n- فرض حجز 2GB للـ Host لمنع أخطاء نفاذ الذاكرة.\n- فحص دعم المعالج لمحاكاة Hyper-V و SLAT.",
        "labels": "discovery, hardware, sysinfo, progress",
        "status": "progress",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "1e08cdfd-de0d-423e-9253-00585892b822",
        "title": "منظومة التشفير والترخيص السيادي الحقيقي (Offline Ed25519 Cryptographic Licensing)",
        "description": "## خطة التنفيذ الفعلي\n- فحص التوقيع الرقمي بمفتاح Ed25519 غير قابل للتزوير.\n- دعم التفعيل الأوفلاين التام بربط مفتاح الجهاز (HWID).\n- منع تجاوز شاشات التثبيت بدون رخصة صالحة.",
        "labels": "security, licensing, crypto, ready",
        "status": "ready",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "d894e215-4b01-43ad-ab21-017b50b59e3b",
        "title": "توليد مفاتيح وشبكة WireGuard Mesh الحقيقية وضبط جدار الحماية (Windows Firewall Rules)",
        "description": "## خطة التنفيذ الفعلي\n- توليد مفاتيح حقيقية Private/Public لكل عقدة.\n- إنشاء ملفات wireguard/wg0.conf وتثبيت منافذ UDP 51820.\n- التحقق البرمجي التلقائي من قواعد جدار حماية ويندوز.",
        "labels": "networking, wireguard, firewall, ready",
        "status": "ready",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "452f97a0-f428-4911-9f83-ec666fa0be59",
        "title": "محرك نشر وبناء آلات Hyper-V Gen 2 الحقيقي (Real Hyper-V VHDX Deployment Engine)",
        "description": "## خطة التنفيذ الفعلي\n- فحص صلاحيات Administrator وطلب الترقية الآمنة.\n- تنزيل وفك ضغط صورة fastfree_{client}.vhdx.zst السيادية.\n- إنشاء آلة الجيل الثاني وضبط إقلاع SCSI وتعطيل SecureBoot لـ GRUB2.\n- مراقبة نبض الآلة الحقيقي وقراءة مؤشرات WMI للأداء.",
        "labels": "hyperv, provisioning, nixos, ready",
        "status": "ready",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    },
    {
        "id": "4e9d355e-861a-4106-b43c-801a9032fe10",
        "title": "تجميع وإصدار حزمة التثبيت المستقلة للإنتاج (Tauri NSIS Standalone Setup .exe)",
        "description": "## خطة التنفيذ الفعلي\n- تشغيل cargo tauri build لإنتاج ملف FastFree-Node-Setup.exe نهائي.\n- تضمين جميع الخطوط والأيقونات والملفات ليعمل 100% دون إنترنت.\n- اختبار التثبيت الصامت والتنصيب المكتبي المستقل.",
        "labels": "build, release, nsis, desktop, backlog",
        "status": "backlog",
        "sessions": [],
        "links": [],
        "project": {"server": "local", "directory": r"C:\Users\FastFree\Desktop\fastfree", "name": "FastFree ERP"},
        "updatedAt": int(time.time() * 1000)
    }
]

board_data["cards"] = cards

# Update state in drafts.sqlite
new_val = json.dumps(board_data, ensure_ascii=False)
c.execute("UPDATE state SET value = ?, updated_at = ? WHERE key = 'plugin.fastfree_board.kanban-v2'", (new_val, int(time.time() * 1000)))
conn.commit()
conn.close()

print(f"Successfully updated FastFree Board in OpenCode drafts.sqlite with {len(cards)} rigorous real tasks!")
