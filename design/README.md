# FastFree Sovereign Design Studio (`design/`)

استوديو التصميم السيادي الموحد لمستودع FastFree، يخدم كافة تطبيقات المنظومة تحت سقف واحد متوافق مع **Open Design**.

## هيكلية المجلد (Monorepo Unified Studio Layout)

```text
fastfree/
└── design/
    ├── README.md                          # دليل استوديو التصميم الموحد
    ├── DESIGN.md                          # الهوية البصرية الكبرى (Windows 11 Fluent 2 & Cairo RTL)
    ├── tokens/                            # التوكنات الموحدة لكافة التطبيقات
    │   └── tokens.css
    └── projects/                          # مشاريع الشاشات مقسمة لكل تطبيق
        └── installer/                     # شاشات ومثبت FastFree Installer
            ├── manifest.json              # سجل المشروع ومعايير Craft
            ├── DESIGN.md                  # مبادئ التصميم الخاصة بالشاشة
            ├── tokens.css                 # توكنات الألوان والأسطح
            ├── index.html                 # النموذج التفاعلي الحي
            ├── components.html            # معاينة المكونات
            ├── .mcp.json                  # خوادم MCP
            └── opencode.json              # إعدادات الوكيل
```

## التطبيقات المستهدفة مستقبلاً في `projects/`:
- `projects/installer/`: مثبت النظام ورفيق سطح المكتب
- `projects/panel/`: لوحة إدارة السحابة والخوادم
- `projects/ledger/`: المحاسبة والمبيعات والمخزون
- `projects/pos/`: نقاط البيع والتجزئة
- `projects/hr/`: الموارد البشرية والرواتب
