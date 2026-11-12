import json

def create_app_card(title_ar, title_en, desc_ar, desc_en, icon, color, port, mesh_node, action_type, screen_id, external_url=None):
    if action_type == "sdui":
        action_obj = {
            "type": "open_sdui_screen",
            "screen": screen_id
        }
    else:
        action_obj = {
            "type": "tauri:invoke",
            "command": "open_external_url",
            "payload": {
                "url": external_url
            }
        }

    return {
        "type": "div",
        "class": "col-12 col-sm-6 col-md-4 col-lg-3",
        "children": [
            {
                "type": "card",
                "class": "diag-card q-pa-md text-center cursor-pointer full-height flex flex-center column justify-between",
                "props": {
                    "flat": True,
                    "bordered": True
                },
                "children": [
                    {
                        "type": "icon",
                        "props": {
                            "name": icon,
                            "size": "xl",
                            "color": color
                        }
                    },
                    {
                        "type": "div",
                        "class": "text-subtitle1 text-weight-bold q-mt-sm text-main",
                        "text": {
                            "ar": title_ar,
                            "en": title_en
                        }
                    },
                    {
                        "type": "div",
                        "class": "text-caption text-muted q-mb-xs",
                        "text": {
                            "ar": desc_ar,
                            "en": desc_en
                        }
                    },
                    {
                        "type": "row",
                        "class": "row q-gutter-xs justify-center q-mb-xs",
                        "children": [
                            {
                                "type": "badge",
                                "props": {
                                    "color": "positive",
                                    "outline": True
                                },
                                "text": {
                                    "ar": "Active",
                                    "en": "Active"
                                }
                            },
                            {
                                "type": "badge",
                                "props": {
                                    "color": color,
                                    "outline": True
                                },
                                "text": {
                                    "ar": port,
                                    "en": port
                                }
                            },
                            {
                                "type": "badge",
                                "props": {
                                    "color": "secondary",
                                    "outline": True
                                },
                                "text": {
                                    "ar": f"Mesh: {mesh_node}",
                                    "en": f"Mesh: {mesh_node}"
                                }
                            }
                        ]
                    },
                    {
                        "type": "button",
                        "props": {
                            "label": {
                                "ar": f"فتح {title_ar} داخل التطبيق" if action_type == "sdui" else f"فتح {title_ar}",
                                "en": f"Open {title_en} In-App" if action_type == "sdui" else f"Open {title_en}"
                            },
                            "color": color,
                            "outline": True,
                            "dense": True,
                            "icon": "open_in_new" if action_type == "sdui" else "launch",
                            "class": "full-width q-mt-sm"
                        },
                        "events": {
                            "click": action_obj
                        }
                    }
                ]
            }
        ]
    }

apps = [
    # 1. Native In-App Sovereign SDUI Screens
    ("إنشاء وتخصيص عميل Clan", "Create Sovereign Node", "معالج تسجيل عميل جديد، تخصيص العتاد، وتحديد التطبيقات", "Provision new machine, allocate Hyper-V RAM & assign apps", "add_circle", "primary", "منفذ 9101", "client1", "sdui", "client_manager"),
    ("FastFree المحاسبة والمالية", "General Ledger & Accounting", "دفتر الأستاذ العام، شجرة الحسابات والقيود المحاسبية", "General Ledger, Journal Entries & Chart of Accounts", "account_balance", "secondary", "منفذ 9103", "client3", "sdui", "accounting_ledger"),
    ("FastFree المبيعات والكاشير", "Sales Invoicing & POS", "نقطة البيع اللمسية السريعة والفوترة والباركود", "Touch POS Terminal, Invoicing & VAT Receipts", "point_of_sale", "positive", "منفذ 9102", "client4", "sdui", "sales_pos"),
    ("FastFree أسطول السيرفرات Clan", "Clan.lol Fleet Monitor", "مراقبة وإدارة الـ 11 سيرفر وشبكة WireGuard Mesh", "11-Node Fleet Control & WireGuard Mesh Status", "dns", "cyan", "منفذ 9108", "client11", "sdui", "fleet_monitor"),
    ("FastFree إدارة المخازن", "Inventory & Warehouse Hub", "حركات المخزون، التحويلات وقارئ الباركود الذكي", "Stock Adjustments, Barcode Scanner & Multi-Warehouse", "inventory_2", "accent", "منفذ 9104", "client7", "sdui", "sales_pos"), # Fallback to active pos/inventory
    ("FastFree الموارد البشرية", "HR & Payroll Sovereign", "دليل الموظفين، الحضور والانصراف ومسيرات الرواتب", "Employee Directory, Attendance & Salary Slips", "badge", "primary", "منفذ 9105", "client8", "sdui", "accounting_ledger"),
    ("FastFree المشتريات والموردين", "Purchase Orders & RFQ", "أوامر الشراء، عروض الأسعار واعتماد التوريدات", "Purchase Orders, Quotations & Vendor Cycles", "shopping_cart", "deep-purple", "منفذ 9106", "client9", "sdui", "accounting_ledger"),
    ("FastFree إدارة علاقات العملاء", "CRM & Pipeline Suite", "إدارة العملاء المحتملين والصفقات ومراحل التحويل", "Lead Funnels, Deal Stages & Contact Timeline", "support_agent", "teal", "منفذ 9107", "client10", "sdui", "sales_pos"),
    
    # 2. External System Gateways
    ("نظام ERPNext المتكامل", "ERPNext Core Suite", "نظام التخطيط وإدارة العمليات والمالية الشامل", "Enterprise Resource Planning & Operations", "store", "primary", "منفذ 8000", "client2", "external", None, "http://localhost:8000"),
    ("لوحة إدارة الخادم Cockpit", "Cockpit Admin Console", "إدارة موارد النواة والنظام وسجلات العقد", "System metrics, kernel logs, and containers", "dashboard", "warning", "منفذ 9090", "client5", "external", None, "https://localhost:9090"),
    ("استوديو البيانات DbGate", "DbGate Database Studio", "مدير قواعد بيانات MariaDB واستعلامات SQL", "MariaDB SQL studio and schema designer", "storage", "indigo", "منفذ 3000", "client6", "external", None, "http://localhost:3000"),
    ("بوابة Caddy Edge والتشفير", "Caddy Secure Edge Gateway", "توجيه TLS الآمن وجدار حماية البوابة السيادية", "Automated zero-trust TLS reverse proxy", "security", "positive", "منفذ 80/443", "client1", "external", None, "https://fastfree.local")
]

schema_path = r"C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer\src\schemas\step6_launchpad.json"
with open(schema_path, "r", encoding="utf-8") as f:
    schema = json.load(f)

app_cards = [create_app_card(*a) for a in apps]
schema["root"]["children"][3]["children"] = app_cards
schema["title"]["ar"] = "سطح مكتب وتطبيقات FastFree السيادية (CasaOS Desktop & Launchpad)"
schema["title"]["en"] = "FastFree Sovereign CasaOS Desktop & Launchpad"

with open(schema_path, "w", encoding="utf-8") as f:
    json.dump(schema, f, ensure_ascii=False, indent=2)

print(f"Updated step6_launchpad.json with {len(apps)} apps (Native SDUI + External Gateways)!")
