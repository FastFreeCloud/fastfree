# FastFree Licensing & Fleet Control Plane

```javascript
/**
 * FastFree Cloud Licensing & Fleet Control Plane (Google Apps Script)
 * Sheet ID: 1WM3vVved271m8ZrTbivM5s38xSZF5NzxjpsWNb2SfH8
 * 
 * Canonical 3-Tab Architecture:
 * - Tab 1: Licenses (Commercial & Enterprise Client Licensing)
 * - Tab 2: Fleet_Servers (Clan 26.05 Hyper-V Mesh Topology & Server Nodes client1..client11)
 * - Tab 3: Sub_Devices (Branch Sub-Devices: Cashiers, Mobiles, Tablets with Live QR Codes)
 */

const SECRET_API_KEY = "FASTFREE-API-SECRET-KEY-998822";
const GITHUB_PAT_DEFAULT = ""; // ضع رمز GitHub Token الخاص بك هنا مباشرة ولن يطلبه منك الشيت نهائياً
const TAB_LICENSES = "Licenses";
const TAB_FLEET_SERVERS = "Fleet_Servers";
const TAB_WIREGUARD_LEGACY = "WireGuard";
const TAB_SUB_DEVICES = "Sub_Devices";

// 1. قائمة الأعمدة المعتمدة لورقة التراخيص (Licenses)
const HEADERS_LICENSES = [
  "node_id",
  "organization_name",
  "license_key",
  "tier",
  "max_seats",
  "status",
  "expiration_date",
  "computer_name",
  "windows_user",
  "hardware_specs",
  "hwid",
  "activated_at",
  "notes"
];

// 2. قائمة الأعمدة المعتمدة لورقة خوادم الأسطول (Fleet_Servers)
const HEADERS_FLEET_SERVERS = [
  "node_id",
  "role",
  "tunnel_ip",
  "listen_port",
  "client_public_key",
  "server_endpoint",
  "full_config",
  "clan_status",
  "updated_at"
];

// 3. قائمة الأعمدة المعتمدة لورقة الأجهزة الفرعية ونقاط البيع (Sub_Devices)
const HEADERS_SUB_DEVICES = [
  "device_id",
  "node_id",
  "device_name",
  "assigned_role",
  "device_ip",
  "qr_code",
  "client_private_key",
  "client_public_key",
  "server_endpoint",
  "status",
  "created_at"
];

/**
 * إضافة قائمة مخصصة في واجهة Google Sheets تلقائياً عند فتح الجدول
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("FastFree")
    .addItem("1. تهيئة وتنسيق الورقات الثلاث (Setup 3 Tabs)", "setupHeaders")
    .addSeparator()
    .addItem("2. 🚀 مزامنة وتوليد الأسطول فوراً (1-Click Instant Sync)", "syncFleetNowDirectly")
    .addItem("3. 🌐 تشغيل المزامنة عبر سير عمل GitHub (Advanced)", "triggerFleetSyncWorkflow")
    .addSeparator()
    .addItem("إنشاء ترخيص عميل يدوي (Create Single License)", "createNewLicensePrompt")
    .addToUi();
}

/**
 * توليد ومزامنة أسطول خوادم Clan والتراخيص فوراً بنقرة زر واحدة داخل الشيت مباشرة
 * دون الحاجة لفتح GitHub، ودون الحاجة لتوكن، ودون أي تدخل يدوي
 */
function syncFleetNowDirectly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // التأكد من تهيئة الورقات الثلاث أولاً إذا لم تكن موجودة
  let sheetLic = ss.getSheetByName(TAB_LICENSES);
  let sheetFleet = getFleetServersSheet(ss);
  if (!sheetLic || !sheetFleet) {
    setupHeaders(true);
  }

  const fleetData = [
    {
      node_id: "client1",
      license_key: "FF-CL01-41EF-AC89",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.1/16",
      listen_port: 51820,
      client_public_key: "Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.1/16\nListenPort = 51820\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Sovereign Clan Mesh Controller (client01)"
    },
    {
      node_id: "client2",
      license_key: "FF-CL02-1235-96AF",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.2/32",
      listen_port: 51822,
      client_public_key: "bCcmoi03/b9+GbjNs3w0O/Q9bhsUBPusFWRN9Wzfl2Q=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.2/32\nListenPort = 51822\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 02)"
    },
    {
      node_id: "client3",
      license_key: "FF-CL03-F799-5485",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.3/32",
      listen_port: 51823,
      client_public_key: "PjoOppXxMEt0CDYGoJ5Rp33EwP3ECsmJkR1MoCN4FAs=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.3/32\nListenPort = 51823\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 03)"
    },
    {
      node_id: "client4",
      license_key: "FF-CL04-C52C-C104",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.4/32",
      listen_port: 51824,
      client_public_key: "6tyN6qB6q87RkKBPkM8p0qOllVKPDnMEsBA6rOgqEX0=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.4/32\nListenPort = 51824\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 04)"
    },
    {
      node_id: "client5",
      license_key: "FF-CL05-0EBD-E734",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.5/32",
      listen_port: 51825,
      client_public_key: "eSOJnNvymTQcScCXmb0AFQFzxUjWLwC7uqF3mlU+3PA=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.5/32\nListenPort = 51825\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 05)"
    },
    {
      node_id: "client6",
      license_key: "FF-CL06-1054-089B",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.6/32",
      listen_port: 51826,
      client_public_key: "Y/isLWIXG5k+KKYSYcnUTVjLKQI5FVwDLdUorKaVymA=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.6/32\nListenPort = 51826\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 06)"
    },
    {
      node_id: "client7",
      license_key: "FF-CL07-C25D-5179",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.7/32",
      listen_port: 51827,
      client_public_key: "rIM57XMLmwpzdN3rR8YdlVWeEN/+Wjz0OWUPPsCwQYo=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.7/32\nListenPort = 51827\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 07)"
    },
    {
      node_id: "client8",
      license_key: "FF-CL08-38D8-F746",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.8/32",
      listen_port: 51828,
      client_public_key: "3JwNSKHt+x0vENfoqkJXW3jQ6R7wWmszfv1zvSZcRmo=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.8/32\nListenPort = 51828\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 08)"
    },
    {
      node_id: "client9",
      license_key: "FF-CL09-1DB8-64AA",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.9/32",
      listen_port: 51829,
      client_public_key: "rX//P5eobINdBXQL/QPVa3UAN+/3h5vgiwqDAY4L9I8=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.9/32\nListenPort = 51829\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 09)"
    },
    {
      node_id: "client10",
      license_key: "FF-CL10-34F1-5E6C",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.10/32",
      listen_port: 51830,
      client_public_key: "Idk2L2iNK9mLh8Uc6N9ksT3hwkQuyEX5+NgyzVDDLRI=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.10/32\nListenPort = 51830\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 10)"
    },
    {
      node_id: "client11",
      license_key: "FF-CL11-84E8-FFD3",
      organization_name: "عميل جديد",
      tier: "enterprise",
      max_seats: 10,
      status: "AVAILABLE",
      tunnel_ip: "10.24.0.11/32",
      listen_port: 51831,
      client_public_key: "5ZroHanxIkicNqfDUMPTeECMFJbGGRCX6JAhcLjDK2E=",
      server_endpoint: "fastfree.cloud:51820",
      full_config: "[Interface]\nAddress = 10.24.0.11/32\nListenPort = 51831\n\n[Peer]\nPublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=\nEndpoint = fastfree.cloud:51820\nAllowedIPs = 10.24.0.0/16, 10.100.0.0/16\nPersistentKeepalive = 25",
      notes: "Automated Clan Fleet Sync (client 11)"
    }
  ];

  const count = upsertFleetData(fleetData, ss);

  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "🚀 اكتملت المزامنة الفورية بنجاح!",
    "تم ملء وتحديث جميع بيانات أسطول خوادم Clan والتراخيص (client1 إلى client11) داخل ورقتي Licenses و Fleet_Servers فوراً وبدون أي خطوات يدوية! (تم تحديث " + count + " عقدة بنجاح)",
    ui.ButtonSet.OK
  );
}

/**
 * تشغيل سير عمل GitHub Actions (11_fleet_sync_clan_licenses.yaml) مباشرة من داخل الشيت بنقرة زر واحدة
 * عبر GitHub REST API دون الحاجة لفتح المتصفح
 */
function triggerFleetSyncWorkflow() {
  const ui = SpreadsheetApp.getUi();
  const userProps = PropertiesService.getUserProperties();
  let token = (typeof GITHUB_PAT_DEFAULT !== "undefined" && GITHUB_PAT_DEFAULT && GITHUB_PAT_DEFAULT.trim()) 
    ? GITHUB_PAT_DEFAULT.trim() 
    : userProps.getProperty("GITHUB_PAT");

  // إذا لم يكن التوكن مكتوباً في الكود ولم يُحفظ سابقاً، نطلبه لمرة واحدة فقط
  if (!token) {
    const promptResp = ui.prompt(
      "مطلوب رمز GitHub Personal Access Token لمرة واحدة",
      "لتشغيل سير العمل مباشرة من الشيت، يرجى إدخال GitHub Token (بصلاحية repo أو workflow):\n(يمكنك توليده من: GitHub -> Settings -> Developer Settings -> Personal Access Tokens)",
      ui.ButtonSet.OK_CANCEL
    );

    if (promptResp.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    token = promptResp.getResponseText().trim();
    if (!token) {
      ui.alert("خطأ: لم يتم إدخال الرمز. يمكنك أيضاً تشغيله يدوياً عبر فتح صفحة GitHub.");
      return;
    }

    userProps.setProperty("GITHUB_PAT", token);
  }

  const repoOwner = "FastFreeCloud";
  const repoName = "fastfree";
  const workflowFile = "11_fleet_sync_clan_licenses.yaml";
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFile}/dispatches`;

  const payload = {
    ref: "master",
    inputs: {
      max_seats: "10",
      force_regenerate: false
    }
  };

  // دعم كلاً من Bearer (المعتمد للتوكنات المخصصة Fine-Grained) و token (الكلاسيكي)
  const authHeader = (token.startsWith("Bearer ") || token.startsWith("token ")) 
    ? token 
    : "Bearer " + token;

  const options = {
    method: "post",
    headers: {
      "Authorization": authHeader,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "FastFree-Google-Apps-Script"
    },
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const respCode = response.getResponseCode();

    if (respCode === 204) {
      ui.alert(
        "🚀 تم إطلاق سير العمل بنجاح!",
        "تم بدء سير العمل في GitHub Actions الآن.\n\nيقوم النظام حالياً باستخراج مفاتيح WireGuard المشفرة وتوليد التراخيص لجميع العقد (client1 إلى client11)، وستتدفق البيانات إلى جدولك خلال 20-30 ثانية تلقائياً!",
        ui.ButtonSet.OK
      );
    } else if (respCode === 401 || respCode === 403) {
      userProps.deleteProperty("GITHUB_PAT");
      ui.alert(
        "خطأ في صلاحيات GitHub Token",
        "رمز الـ Token غير صالح أو انتهت صلاحيته أو تنقصه صلاحية 'workflow' / 'repo'. تم مسح الرمز المحفوظ، يرجى المحاولة مجدداً برمز صحيح.",
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        "تنبيه من GitHub API",
        "كود الاستجابة: " + respCode + "\nالتفاصيل: " + response.getContentText(),
        ui.ButtonSet.OK
      );
    }
  } catch (err) {
    ui.alert("تعذر الاتصال بـ GitHub", err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * نافذة لتحديث أو مسح GitHub Token
 */
function promptSetGitHubToken() {
  const ui = SpreadsheetApp.getUi();
  const userProps = PropertiesService.getUserProperties();
  const currentToken = userProps.getProperty("GITHUB_PAT") ? "********" : "غير مضبوط";

  const promptResp = ui.prompt(
    "ضبط GitHub Personal Access Token",
    "الحالة الحالية: " + currentToken + "\n\nأدخل رمز GitHub Token الجديد (أو اتركه فارغاً لمسحه):",
    ui.ButtonSet.OK_CANCEL
  );

  if (promptResp.getSelectedButton() !== ui.Button.OK) return;

  const newToken = promptResp.getResponseText().trim();
  if (newToken) {
    userProps.setProperty("GITHUB_PAT", newToken);
    ui.alert("تم حفظ GitHub Token بنجاح!");
  } else {
    userProps.deleteProperty("GITHUB_PAT");
    ui.alert("تم مسح GitHub Token بنجاح.");
  }
}

/**
 * نافذة فتح وتوجيه لتشغيل سير عمل مزامنة الأسطول في GitHub Actions
 */
function openFleetSyncDialog() {
  const ui = SpreadsheetApp.getUi();
  const repoWorkflowUrl = "https://github.com/FastFreeCloud/fastfree/actions/workflows/11_fleet_sync_clan_licenses.yaml";
  
  const htmlOutput = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 18px; color: #0F172A; text-align: right;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="font-size: 24px;">🚀</span>
        <h3 style="margin: 0; font-size: 16px; color: #0F172A; font-weight: 700;">مزامنة أسطول Clan والتراخيص عبر GitHub</h3>
      </div>
      
      <p style="font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
        يقوم سير العمل <b>11_fleet_sync_clan_licenses</b> في مستودع GitHub باستخراج مفاتيح WireGuard المشفرة وتوليد التراخيص لجميع العقد (من client1 إلى client11) وتعبئة هذا الجدول تلقائياً بدون إدخال يدوي.
      </p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">طريقة التشغيل في GitHub:</div>
        <ol style="margin: 0; padding-right: 20px; font-size: 12px; color: #64748B; line-height: 1.6;">
          <li>اضغط على الزر الأزرق أدناه لفتح صفحة الأكشن مباشرة.</li>
          <li>اضغط على زر <b>Run workflow</b> في الزاوية العلوية اليمنى.</li>
          <li>سيتم إرسال كافة الخوادم والـ WireGuard IPs والتراخيص إلى الجدول فوراً.</li>
        </ol>
      </div>

      <div style="text-align: center; margin-bottom: 10px;">
        <a href="${repoWorkflowUrl}" target="_blank" style="background: #2563EB; color: #FFFFFF; padding: 11px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-block; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
          فتح صفحة تشغيل Workflow في GitHub ↗
        </a>
      </div>
    </div>
  `).setWidth(480).setHeight(320);

  ui.showModalDialog(htmlOutput, "تشغيل سير عمل مزامنة الأسطول (GitHub Action)");
}

/**
 * البحث عن ورقة الخوادم مع التوافق العكسي مع اسم WireGuard
 */
function getFleetServersSheet(ss) {
  return ss.getSheetByName(TAB_FLEET_SERVERS) || ss.getSheetByName(TAB_WIREGUARD_LEGACY);
}

/**
 * دالة مساعدة لقص وضبط حجم الورقة ليكون مطابقاً تماماً لحجم الجدول
 * وتطبيق نوع الخط الموحد، وتوسيط كافة النصوص أفقياً وعمودياً مع الحدود والارتفاعات
 */
function formatAndTrimSheet(sheet, numCols, numRows, fontName) {
  const font = fontName || "Segoe UI";

  // 1. تقليص الأعمدة لتطابق بالضبط عدد أعمدة الجدول
  const maxCols = sheet.getMaxColumns();
  if (maxCols > numCols) {
    sheet.deleteColumns(numCols + 1, maxCols - numCols);
  } else if (maxCols < numCols) {
    sheet.insertColumnsAfter(maxCols, numCols - maxCols);
  }

  // 2. تقليص الصفوف لتطابق بالضبط عدد صفوف الجدول المطلوبة
  const maxRows = sheet.getMaxRows();
  if (maxRows > numRows) {
    sheet.deleteRows(numRows + 1, maxRows - numRows);
  } else if (maxRows < numRows) {
    sheet.insertRowsAfter(maxRows, numRows - maxRows);
  }

  // 3. تطبيق الخط وتوسيط كافة خلايا الجدول أفقياً وعمودياً وإضافة حدود رمادية ناعمة
  const fullRange = sheet.getRange(1, 1, numRows, numCols);
  fullRange.setFontFamily(font)
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);

  // 4. تنسيق صف العناوين (Header) بخلفية فاخرة وخط عريض
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontSize(11)
    .setFontWeight("bold")
    .setBackground("#0F172A")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 42);
  sheet.setFrozenRows(1);

  // 5. ضبط ارتفاع صفوف البيانات لتكون مريحة وأنيقة (34px)
  for (let r = 2; r <= numRows; r++) {
    sheet.setRowHeight(r, 34);
  }
}

/**
 * تهيئة وترتيب رؤوس الأعمدة في الورقات الثلاث وتنسيق المظهر والقوائم المنسدلة (Comboboxes)
 * وقص مساحة كل ورقة لتكون مطابقة لحجم الجدول تماماً بدون أي أعمدة أو صفوف فارغة
 */
function setupHeaders(silent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const FONT_FAMILY = "Segoe UI";

  // ─────────────────────────────────────────────────────────────
  // 1. ورقة التراخيص (Licenses) - 13 عموداً × 31 صفاً
  // ─────────────────────────────────────────────────────────────
  let sheetLic = ss.getSheetByName(TAB_LICENSES);
  if (!sheetLic) {
    sheetLic = ss.insertSheet(TAB_LICENSES);
  }

  const licRowsCount = 31; // صف الرؤوس + 30 صفاً للبيانات
  formatAndTrimSheet(sheetLic, HEADERS_LICENSES.length, licRowsCount, FONT_FAMILY);
  sheetLic.getRange(1, 1, 1, HEADERS_LICENSES.length).setValues([HEADERS_LICENSES]);

  const licWidths = [110, 220, 230, 110, 100, 120, 130, 150, 130, 200, 280, 170, 200];
  licWidths.forEach((w, i) => {
    sheetLic.setColumnWidth(i + 1, w);
  });

  // إضافة قوائم منسدلة (Comboboxes) وتوسيطها
  const nodeOptions = ["client1", "client2", "client3", "client4", "client5", "client6", "client7", "client8", "client9", "client10", "client11"];
  const nodeRule = SpreadsheetApp.newDataValidation().requireValueInList(nodeOptions, true).build();
  sheetLic.getRange("A2:A" + licRowsCount).setDataValidation(nodeRule);

  const tierOptions = ["enterprise", "pro", "cluster", "starter"];
  const tierRule = SpreadsheetApp.newDataValidation().requireValueInList(tierOptions, true).build();
  sheetLic.getRange("D2:D" + licRowsCount).setDataValidation(tierRule);

  const statusOptions = ["AVAILABLE", "ACTIVE", "SUSPENDED", "REVOKED"];
  const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(statusOptions, true).build();
  sheetLic.getRange("F2:F" + licRowsCount).setDataValidation(statusRule);

  // التنسيق الشرطي لحالات الترخيص (Colors)
  const statusRange = sheetLic.getRange("F2:F" + licRowsCount);
  const ruleActive = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("ACTIVE")
    .setBackground("#DCFCE7")
    .setFontColor("#15803D")
    .setRanges([statusRange])
    .build();

  const ruleAvailable = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("AVAILABLE")
    .setBackground("#DBEAFE")
    .setFontColor("#1D4ED8")
    .setRanges([statusRange])
    .build();

  const ruleSuspended = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("SUSPENDED")
    .setBackground("#FEF3C7")
    .setFontColor("#B45309")
    .setRanges([statusRange])
    .build();

  const ruleRevoked = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("REVOKED")
    .setBackground("#FEE2E2")
    .setFontColor("#B91C1C")
    .setRanges([statusRange])
    .build();

  sheetLic.setConditionalFormatRules([ruleActive, ruleAvailable, ruleSuspended, ruleRevoked]);

  // ─────────────────────────────────────────────────────────────
  // 2. ورقة خوادم الأسطول (Fleet_Servers) - 9 أعمدة × 12 صفاً
  // ─────────────────────────────────────────────────────────────
  let sheetFleet = getFleetServersSheet(ss);
  if (!sheetFleet) {
    sheetFleet = ss.insertSheet(TAB_FLEET_SERVERS);
  } else if (sheetFleet.getName() === TAB_WIREGUARD_LEGACY) {
    sheetFleet.setName(TAB_FLEET_SERVERS);
  }

  const fleetRowsCount = 12; // صف الرؤوس + 11 عقدة (client1 .. client11)
  formatAndTrimSheet(sheetFleet, HEADERS_FLEET_SERVERS.length, fleetRowsCount, FONT_FAMILY);
  sheetFleet.getRange(1, 1, 1, HEADERS_FLEET_SERVERS.length).setValues([HEADERS_FLEET_SERVERS]);

  const fleetWidths = [110, 180, 140, 110, 280, 240, 360, 120, 170];
  fleetWidths.forEach((w, i) => {
    sheetFleet.setColumnWidth(i + 1, w);
  });

  sheetFleet.getRange("A2:A" + fleetRowsCount).setDataValidation(nodeRule);

  const roleOptions = ["Controller Hub (Hyper-V)", "Appliance Node (Hyper-V)"];
  const roleRule = SpreadsheetApp.newDataValidation().requireValueInList(roleOptions, true).build();
  sheetFleet.getRange("B2:B" + fleetRowsCount).setDataValidation(roleRule);

  const clanStatusOptions = ["Synced", "Pending", "Offline"];
  const clanRule = SpreadsheetApp.newDataValidation().requireValueInList(clanStatusOptions, true).build();
  sheetFleet.getRange("H2:H" + fleetRowsCount).setDataValidation(clanRule);

  const fleetStatusRange = sheetFleet.getRange("H2:H" + fleetRowsCount);
  const ruleSynced = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Synced")
    .setBackground("#DCFCE7")
    .setFontColor("#15803D")
    .setRanges([fleetStatusRange])
    .build();
  sheetFleet.setConditionalFormatRules([ruleSynced]);

  // ─────────────────────────────────────────────────────────────
  // 3. ورقة الأجهزة الفرعية ونقاط البيع (Sub_Devices) - 11 عموداً × 21 صفاً
  // ─────────────────────────────────────────────────────────────
  let sheetSub = ss.getSheetByName(TAB_SUB_DEVICES);
  if (!sheetSub) {
    sheetSub = ss.insertSheet(TAB_SUB_DEVICES);
  }

  const subRowsCount = 21; // صف الرؤوس + 20 صفاً للأجهزة
  formatAndTrimSheet(sheetSub, HEADERS_SUB_DEVICES.length, subRowsCount, FONT_FAMILY);
  sheetSub.getRange(1, 1, 1, HEADERS_SUB_DEVICES.length).setValues([HEADERS_SUB_DEVICES]);

  const subWidths = [140, 110, 180, 160, 140, 130, 260, 260, 240, 110, 170];
  subWidths.forEach((w, i) => {
    sheetSub.setColumnWidth(i + 1, w);
  });

  sheetSub.getRange("B2:B" + subRowsCount).setDataValidation(nodeRule);

  const subRoleOptions = ["موبايل الإدارة", "كاشير 1 (نقطة بيع)", "كاشير 2 (نقطة بيع)", "جهاز المحاسب", "تابلت المخزن والجرد", "أخرى"];
  const subRoleRule = SpreadsheetApp.newDataValidation().requireValueInList(subRoleOptions, true).build();
  sheetSub.getRange("D2:D" + subRowsCount).setDataValidation(subRoleRule);

  const subStatusOptions = ["ACTIVE", "REVOKED", "PENDING"];
  const subStatusRule = SpreadsheetApp.newDataValidation().requireValueInList(subStatusOptions, true).build();
  sheetSub.getRange("J2:J" + subRowsCount).setDataValidation(subStatusRule);

  // إعداد معادلة الـ QR Code التلقائية للموبايل ونقاط البيع
  for (let r = 2; r <= subRowsCount; r++) {
    sheetSub.setRowHeight(r, 70); // ارتفاع واسع ومريح لمعاينة الـ QR Code بوضوح
    const qrCell = sheetSub.getRange(r, 6);
    if (!qrCell.getFormula()) {
      qrCell.setFormula(`=IF(ISBLANK(G${r}), "", IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=" & ENCODEURL("[Interface]%0APrivateKey=" & G${r} & "%0AAddress=" & E${r} & "%0A[Peer]%0APublicKey=Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=%0AEndpoint=" & I${r} & "%0AAllowedIPs=10.24.0.0/16%0APersistentKeepalive=25")))`);
    }
  }

  if (!silent) {
    SpreadsheetApp.getUi().alert("تم بنجاح!", "تمت تهيئة الورقات الثلاث بحجم محكم ومطابق للجداول، مع تحسين الخطوط وتوسيط النصوص والحدود الأنيقة بنجاح!", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * توليد كود ترخيص رسمي بنمط: FF-CL02-XXXX-XXXX
 */
function generateLicenseKey(nodeId) {
  const match = String(nodeId || "").match(/\d+/);
  const nodeNum = match ? parseInt(match[0], 10) : 2;
  const numPad = String(nodeNum).padStart(2, "0");
  const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return "FF-CL" + numPad + "-" + randPart1 + "-" + randPart2;
}

function getNodeNumber(nodeId) {
  const match = String(nodeId || "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 2;
}

function getDefaultTunnelIp(nodeId) {
  const n = getNodeNumber(nodeId);
  return n === 1 ? "10.24.0.1/16" : "10.24.0." + n + "/32";
}

function getDefaultListenPort(nodeId) {
  const n = getNodeNumber(nodeId);
  return n === 1 ? 51820 : 51820 + n;
}

function getDefaultServerEndpoint(nodeId) {
  return "client1.fastfree.local:" + getDefaultListenPort(nodeId);
}

function getDefaultClientPublicKey(nodeId) {
  return "ff+" + nodeId + "+pubkey+mesh+clan2605+node===";
}

function generateDefaultWgConfig(nodeId, tunnelIp, listenPort, clientPubKey) {
  const ep = getDefaultServerEndpoint(nodeId);
  return [
    "[Interface]",
    "Address = " + (tunnelIp || getDefaultTunnelIp(nodeId)),
    "ListenPort = " + (listenPort || getDefaultListenPort(nodeId)),
    "PrivateKey = <INJECTED_VIA_CLAN_VARS>",
    "",
    "[Peer]",
    "PublicKey = Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=",
    "Endpoint = " + ep,
    "AllowedIPs = 10.24.0.0/16",
    "PersistentKeepalive = 25"
  ].join("\n");
}

/**
 * استخراج بيانات ورقة العمل وفهرسة الأعمدة
 */
function getSheetMap(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    return { headers: [], colIndexMap: {}, rows: [], numRows: 0 };
  }
  const headers = data[0].map(h => String(h || "").trim().toLowerCase());
  const colIndexMap = {};
  headers.forEach((h, idx) => {
    colIndexMap[h] = idx;
  });
  return {
    headers: headers,
    colIndexMap: colIndexMap,
    rows: data,
    numRows: data.length
  };
}

/**
 * منطق الـ Idempotent Upsert للأسطول عبر الورقات الثلاث
 * لا يقوم بحذف أو مسح أي بيانات سابقة إطلاقاً
 */
function upsertFleetData(fleetList, ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  let sheetLic = ss.getSheetByName(TAB_LICENSES);
  let sheetFleet = getFleetServersSheet(ss);
  if (!sheetLic || !sheetFleet) {
    setupHeaders(true);
    sheetLic = ss.getSheetByName(TAB_LICENSES);
    sheetFleet = getFleetServersSheet(ss);
  }

  const licMap = getSheetMap(sheetLic);
  const fleetMap = getSheetMap(sheetFleet);

  const colLicNode = licMap.colIndexMap["node_id"];
  const colLicOrg = licMap.colIndexMap["organization_name"];
  const colLicKey = licMap.colIndexMap["license_key"];
  const colLicTier = licMap.colIndexMap["tier"];
  const colLicSeats = licMap.colIndexMap["max_seats"];
  const colLicStatus = licMap.colIndexMap["status"];
  const colLicExp = licMap.colIndexMap["expiration_date"];
  const colLicNotes = licMap.colIndexMap["notes"];

  const colFleetNode = fleetMap.colIndexMap["node_id"];
  const colFleetRole = fleetMap.colIndexMap["role"];
  const colFleetTunnel = fleetMap.colIndexMap["tunnel_ip"];
  const colFleetPort = fleetMap.colIndexMap["listen_port"];
  const colFleetPub = fleetMap.colIndexMap["client_public_key"] !== undefined ? fleetMap.colIndexMap["client_public_key"] : fleetMap.colIndexMap["public_key"];
  const colFleetEndpoint = fleetMap.colIndexMap["server_endpoint"] !== undefined ? fleetMap.colIndexMap["server_endpoint"] : fleetMap.colIndexMap["endpoint"];
  const colFleetConfig = fleetMap.colIndexMap["full_config"];
  const colFleetStatus = fleetMap.colIndexMap["clan_status"];
  const colFleetUpdated = fleetMap.colIndexMap["updated_at"];

  let syncedCount = 0;

  for (let i = 0; i < fleetList.length; i++) {
    const item = fleetList[i] || {};
    const rawNodeId = item.node_id || item.nodeId || item.client_id || item.clientId || "";
    const nodeId = String(rawNodeId).trim().toLowerCase();
    if (!nodeId) continue;

    // 1. معالجة ورقة Licenses
    let licRowIndex = -1;
    for (let r = 1; r < licMap.rows.length; r++) {
      const cellNode = String(licMap.rows[r][colLicNode] || "").trim().toLowerCase();
      if (cellNode === nodeId) {
        licRowIndex = r + 1; // 1-based row index in sheet
        break;
      }
    }

    if (licRowIndex !== -1) {
      const existingRow = licMap.rows[licRowIndex - 1];
      const existingOrg = String(existingRow[colLicOrg] || "").trim();
      const existingStatus = String(existingRow[colLicStatus] || "").trim().toUpperCase();

      const inputOrg = String(item.organization_name || item.organization || item.company_name || "").trim();
      if ((!existingOrg || existingOrg === "عميل جديد") && inputOrg && inputOrg !== "عميل جديد") {
        sheetLic.getRange(licRowIndex, colLicOrg + 1).setValue(inputOrg);
      }

      if (existingStatus !== "ACTIVE") {
        const inputStatus = (item.status || "AVAILABLE").toUpperCase();
        sheetLic.getRange(licRowIndex, colLicStatus + 1).setValue(inputStatus);
      }

      if (item.tier) {
        sheetLic.getRange(licRowIndex, colLicTier + 1).setValue(String(item.tier).toLowerCase());
      }
      if (item.max_seats) {
        sheetLic.getRange(licRowIndex, colLicSeats + 1).setValue(item.max_seats);
      }
      if (item.expiration_date) {
        sheetLic.getRange(licRowIndex, colLicExp + 1).setValue(item.expiration_date);
      }
      if (item.notes) {
        sheetLic.getRange(licRowIndex, colLicNotes + 1).setValue(item.notes);
      }
    } else {
      const newKey = item.license_key || generateLicenseKey(nodeId);
      const newRow = [
        nodeId,
        item.organization_name || "عميل جديد",
        newKey,
        item.tier || "enterprise",
        item.max_seats || 10,
        item.status || "AVAILABLE",
        item.expiration_date || "2028-12-31",
        "", "", "", "", "",
        item.notes || "Auto-seeded via Clan Sync"
      ];
      
      // البحث عن أول صف فارغ داخل حجم الجدول المحدد لتجنب تمديد الجدول عشوائياً
      let emptyLicRow = -1;
      for (let r = 1; r < licMap.rows.length; r++) {
        if (!licMap.rows[r][colLicNode]) {
          emptyLicRow = r + 1;
          break;
        }
      }
      if (emptyLicRow !== -1) {
        sheetLic.getRange(emptyLicRow, 1, 1, newRow.length).setValues([newRow]);
        licMap.rows[emptyLicRow - 1][colLicNode] = nodeId;
      } else {
        sheetLic.appendRow(newRow);
      }
    }

    // 2. معالجة ورقة Fleet_Servers
    let fleetRowIndex = -1;
    for (let r = 1; r < fleetMap.rows.length; r++) {
      const cellNode = String(fleetMap.rows[r][colFleetNode] || "").trim().toLowerCase();
      if (cellNode === nodeId) {
        fleetRowIndex = r + 1;
        break;
      }
    }

    const inputPub = String(item.client_public_key || item.public_key || "").trim();
    const inputEndpoint = String(item.server_endpoint || item.endpoint || getDefaultServerEndpoint(nodeId)).trim();
    const inputTunnel = String(item.tunnel_ip || getDefaultTunnelIp(nodeId)).trim();
    const inputPort = item.listen_port || getDefaultListenPort(nodeId);
    const inputConfig = String(item.full_config || generateDefaultWgConfig(nodeId, inputTunnel, inputPort, inputPub)).trim();
    const roleDesc = nodeId === "client1" ? "Controller Hub (Hyper-V)" : "Appliance Node (Hyper-V)";
    const nowIso = new Date().toISOString();

    if (fleetRowIndex !== -1) {
      if (colFleetRole !== undefined) {
        sheetFleet.getRange(fleetRowIndex, colFleetRole + 1).setValue(roleDesc);
      }
      if (inputPub && inputPub !== "PENDING_KEY") {
        sheetFleet.getRange(fleetRowIndex, colFleetPub + 1).setValue(inputPub);
      }
      if (inputTunnel) {
        sheetFleet.getRange(fleetRowIndex, colFleetTunnel + 1).setValue(inputTunnel);
      }
      if (inputPort) {
        sheetFleet.getRange(fleetRowIndex, colFleetPort + 1).setValue(inputPort);
      }
      if (inputEndpoint) {
        sheetFleet.getRange(fleetRowIndex, colFleetEndpoint + 1).setValue(inputEndpoint);
      }
      if (inputConfig) {
        sheetFleet.getRange(fleetRowIndex, colFleetConfig + 1).setValue(inputConfig);
      }
      sheetFleet.getRange(fleetRowIndex, colFleetStatus + 1).setValue("Synced");
      sheetFleet.getRange(fleetRowIndex, colFleetUpdated + 1).setValue(nowIso);
    } else {
      const newFleetRow = [
        nodeId,
        roleDesc,
        inputTunnel,
        inputPort,
        inputPub || getDefaultClientPublicKey(nodeId),
        inputEndpoint,
        inputConfig,
        "Synced",
        nowIso
      ];

      // البحث عن أول صف فارغ داخل حجم الجدول المحدد في Fleet_Servers
      let emptyFleetRow = -1;
      for (let r = 1; r < fleetMap.rows.length; r++) {
        if (!fleetMap.rows[r][colFleetNode]) {
          emptyFleetRow = r + 1;
          break;
        }
      }
      if (emptyFleetRow !== -1) {
        sheetFleet.getRange(emptyFleetRow, 1, 1, newFleetRow.length).setValues([newFleetRow]);
        fleetMap.rows[emptyFleetRow - 1][colFleetNode] = nodeId;
      } else {
        sheetFleet.appendRow(newFleetRow);
      }
    }

    syncedCount++;
  }

  return syncedCount;
}

/**
 * نافذة تفاعلية تطلب اسم العميل وتولد ترخيصاً رسمياً
 */
function createNewLicensePrompt() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt("إنشاء ترخيص عميل جديد", "أدخل اسم المنشأة أو الشركة (مثال: شركة البركة للمقاولات):", ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const orgName = resp.getResponseText().trim();
  if (!orgName) {
    ui.alert("خطأ", "يجب إدخال اسم المنشأة لإنشاء الترخيص.", ui.ButtonSet.OK);
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetLic = ss.getSheetByName(TAB_LICENSES);
  let sheetFleet = getFleetServersSheet(ss);
  if (!sheetLic || !sheetFleet) {
    setupHeaders(true);
    sheetLic = ss.getSheetByName(TAB_LICENSES);
    sheetFleet = getFleetServersSheet(ss);
  }

  const licMap = getSheetMap(sheetLic);
  const colLicNode = licMap.colIndexMap["node_id"];
  const colLicOrg = licMap.colIndexMap["organization_name"];
  const colLicStatus = licMap.colIndexMap["status"];
  const colLicKey = licMap.colIndexMap["license_key"];

  let targetNodeId = null;
  let targetRowIndex = -1;
  const existingNodes = {};

  for (let r = 1; r < licMap.rows.length; r++) {
    const node = String(licMap.rows[r][colLicNode] || "").trim().toLowerCase();
    const st = String(licMap.rows[r][colLicStatus] || "").trim().toUpperCase();
    const org = String(licMap.rows[r][colLicOrg] || "").trim();
    if (node) existingNodes[node] = true;

    if (!targetNodeId && node.startsWith("client") && st === "AVAILABLE" && (!org || org === "عميل جديد")) {
      targetNodeId = node;
      targetRowIndex = r + 1;
    }
  }

  if (!targetNodeId) {
    for (let i = 1; i <= 11; i++) {
      const cand = "client" + i;
      if (!existingNodes[cand]) {
        targetNodeId = cand;
        break;
      }
    }
  }

  if (!targetNodeId) {
    ui.alert("عفواً", "جميع الأجهزة من client1 إلى client11 مستخدمة بالفعل.", ui.ButtonSet.OK);
    return;
  }

  const newKey = generateLicenseKey(targetNodeId);
  const nowIso = new Date().toISOString();

  if (targetRowIndex !== -1) {
    sheetLic.getRange(targetRowIndex, colLicOrg + 1).setValue(orgName);
    sheetLic.getRange(targetRowIndex, colLicKey + 1).setValue(newKey);
    sheetLic.getRange(targetRowIndex, colLicStatus + 1).setValue("ACTIVE");
    sheetLic.getRange(targetRowIndex, licMap.colIndexMap["activated_at"] + 1).setValue(nowIso);
  } else {
    const newRow = [
      targetNodeId,
      orgName,
      newKey,
      "enterprise",
      10,
      "ACTIVE",
      "2027-12-31",
      "", "", "", "",
      nowIso,
      "Manually assigned"
    ];
    sheetLic.appendRow(newRow);
  }

  ui.alert("تم إنشاء الترخيص بنجاح!", 
    "المؤسسة: " + orgName + "\n" +
    "الجهاز المخصص: " + targetNodeId + "\n" +
    "كود الترخيص: " + newKey,
    ui.ButtonSet.OK
  );
}

/**
 * معالجة طلبات الـ HTTP POST الواردة من مثبت FastFree Installer
 */
function doPost(e) {
  try {
    const contents = e.postData ? e.postData.contents : "";
    let payload = {};
    try {
      payload = JSON.parse(contents);
    } catch (parseErr) {
      payload = e.parameter || {};
    }

    const apiKey = payload.api_key || payload.apiKey;
    if (apiKey !== SECRET_API_KEY) {
      return jsonResponse({
        success: false,
        error: "UNAUTHORIZED",
        message: "Invalid or missing API Secret Token"
      });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. مزامنة الأسطول الجماعي (Fleet Bulk Sync / GitHub Action batch_sync)
    if (payload.action === "batch_sync" || payload.action === "fleet_sync" || payload.action === "sync_fleet" || Array.isArray(payload.fleet)) {
      const fleetList = Array.isArray(payload.fleet) ? payload.fleet : [];
      const count = upsertFleetData(fleetList, ss);
      return jsonResponse({
        success: true,
        action: payload.action || "batch_sync",
        count: count,
        message: "Fleet synchronized successfully across tabs."
      });
    }

    // 2. التحقق من الترخيص وتفعيله (Validate & Activate Node)
    const reqKey = String(payload.license_key || payload.licenseKey || payload.key || "").trim().toUpperCase();
    const reqHwid = String(payload.hwid || "").trim().toLowerCase();
    const reqComputer = String(payload.computer_name || payload.computerName || "").trim();
    const reqUser = String(payload.windows_user || payload.windowsUser || "").trim();
    const reqSpecs = String(payload.hardware_specs || payload.hardwareSpecs || "").trim();
    const reqUserSid = String(payload.user_sid || payload.userSid || "").trim();
    const action = String(payload.action || "").trim();
    const adminPassword = String(payload.admin_password || payload.adminPassword || "").trim();

    if (!reqKey) {
      return jsonResponse({
        success: false,
        error: "MISSING_LICENSE_KEY",
        message: "License key is required"
      });
    }

    let sheetLic = ss.getSheetByName(TAB_LICENSES);
    if (!sheetLic) {
      setupHeaders(true);
      sheetLic = ss.getSheetByName(TAB_LICENSES);
    }

    const licMap = getSheetMap(sheetLic);
    let matchedRow = -1;
    for (let r = 1; r < licMap.rows.length; r++) {
      const cellKey = String(licMap.rows[r][licMap.colIndexMap["license_key"]] || "").trim().toUpperCase();
      if (cellKey === reqKey) {
        matchedRow = r + 1;
        break;
      }
    }

    if (matchedRow === -1) {
      return jsonResponse({
        success: false,
        error: "INVALID_LICENSE",
        message: "License key not found in cloud database",
        searched: reqKey
      });
    }

    const rIdx = matchedRow - 1;
    const nodeId = String(licMap.rows[rIdx][licMap.colIndexMap["node_id"]] || "client2").trim();
    const orgName = String(licMap.rows[rIdx][licMap.colIndexMap["organization_name"]] || "").trim();
    const tier = String(licMap.rows[rIdx][licMap.colIndexMap["tier"]] || "enterprise").trim();
    const currentStatus = String(licMap.rows[rIdx][licMap.colIndexMap["status"]] || "AVAILABLE").trim().toUpperCase();
    const currentHwid = String(licMap.rows[rIdx][licMap.colIndexMap["hwid"]] || "").trim().toLowerCase();
    const maxSeats = licMap.rows[rIdx][licMap.colIndexMap["max_seats"]] || 10;
    const rawExp = licMap.rows[rIdx][licMap.colIndexMap["expiration_date"]];

    let expDateFormatted = "2027-12-31";
    if (rawExp instanceof Date) {
      expDateFormatted = Utilities.formatDate(rawExp, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (rawExp) {
      expDateFormatted = String(rawExp).trim();
    }

    if (currentStatus === "REVOKED") {
      return jsonResponse({
        success: false,
        error: "LICENSE_REVOKED",
        message: "This license has been permanently revoked."
      });
    }

    if (currentStatus === "SUSPENDED") {
      return jsonResponse({
        success: false,
        error: "LICENSE_SUSPENDED",
        message: "This license is currently suspended. Please contact support."
      });
    }

    // تجهيز بصمة العتاد وحساب المستخدم (Hardware Appliance & User Binding)
    const rawReqHwid = (reqHwid.includes("##") ? reqHwid.split("##")[0] : reqHwid).trim().toLowerCase();
    const cleanUserSid = reqUserSid.trim().toUpperCase();
    const incomingBinding = cleanUserSid ? `${rawReqHwid}##${cleanUserSid}` : rawReqHwid;

    // 2.1. مسار إلغاء الترخيص القديم ونقله بتفويض شركة FastFree
    if (action === "transfer_hwid" || action === "transfer") {
      if (adminPassword !== "@87171393") {
        return jsonResponse({
          success: false,
          error: "UNAUTHORIZED_MASTER_PASSWORD",
          message: "Invalid FastFree Master Company Password. تفويض شركة FastFree مطلوب لنقل الترخيص."
        });
      }

      sheetLic.getRange(matchedRow, licMap.colIndexMap["hwid"] + 1).setValue(incomingBinding);
      if (reqComputer) sheetLic.getRange(matchedRow, licMap.colIndexMap["computer_name"] + 1).setValue(reqComputer);
      if (reqUser) sheetLic.getRange(matchedRow, licMap.colIndexMap["windows_user"] + 1).setValue(reqUser);
      if (reqSpecs) sheetLic.getRange(matchedRow, licMap.colIndexMap["hardware_specs"] + 1).setValue(reqSpecs);
      sheetLic.getRange(matchedRow, licMap.colIndexMap["status"] + 1).setValue("ACTIVE");

      if (licMap.colIndexMap["notes"] !== undefined) {
        const curNotes = String(licMap.rows[rIdx][licMap.colIndexMap["notes"]] || "");
        const transferNote = `[Transferred: ${new Date().toISOString()} | SID: ${cleanUserSid}]`;
        sheetLic.getRange(matchedRow, licMap.colIndexMap["notes"] + 1).setValue(curNotes ? `${curNotes} | ${transferNote}` : transferNote);
      }
      SpreadsheetApp.flush();
    } else {
      // 2.2. التحقق العادي وفحص قفل بصمة العتاد (Hardware Appliance Lock)
      if (currentHwid) {
        const boundHwid = (currentHwid.includes("##") ? currentHwid.split("##")[0] : currentHwid).trim().toLowerCase();
        const boundSid = (currentHwid.includes("##") ? currentHwid.split("##")[1] : "").trim().toUpperCase();

        // 1. فحص العتاد الفعلي للجهاز (Physical Machine Hardware Verification)
        if (boundHwid !== rawReqHwid) {
          return jsonResponse({
            success: false,
            error: "HWID_MISMATCH",
            message: "License is bound to another hardware profile. Hardware transfer authorization required.",
            registeredHwid: boundHwid.substring(0, 8) + "..."
          });
        }

        // 2. نفس الجهاز الفعلي ولكن تغير سياق المستخدم (تشغيل كمسؤول، أو حساب الخدمة)
        // طالما أن عتاد الجهاز متطابق 100%، يتم تحديث ارتباط المستخدم الحالي تلقائياً دون حظر الترخيص
        if (cleanUserSid && boundSid !== cleanUserSid) {
          sheetLic.getRange(matchedRow, licMap.colIndexMap["hwid"] + 1).setValue(incomingBinding);
          if (reqUser) sheetLic.getRange(matchedRow, licMap.colIndexMap["windows_user"] + 1).setValue(reqUser);
          SpreadsheetApp.flush();
        }
      }

      // تفعيل الترخيص عند أول استخدام
      const nowIso = new Date().toISOString();
      if (!currentHwid && incomingBinding) {
        sheetLic.getRange(matchedRow, licMap.colIndexMap["hwid"] + 1).setValue(incomingBinding);
      }
      if (reqComputer) {
        sheetLic.getRange(matchedRow, licMap.colIndexMap["computer_name"] + 1).setValue(reqComputer);
      }
      if (reqUser) {
        sheetLic.getRange(matchedRow, licMap.colIndexMap["windows_user"] + 1).setValue(reqUser);
      }
      if (reqSpecs) {
        sheetLic.getRange(matchedRow, licMap.colIndexMap["hardware_specs"] + 1).setValue(reqSpecs);
      }
      if (currentStatus !== "ACTIVE") {
        sheetLic.getRange(matchedRow, licMap.colIndexMap["status"] + 1).setValue("ACTIVE");
        sheetLic.getRange(matchedRow, licMap.colIndexMap["activated_at"] + 1).setValue(nowIso);
      }
    }

    // استخراج بيانات العقدة من ورقة Fleet_Servers
    let sheetFleet = getFleetServersSheet(ss);
    let wgData = null;
    if (sheetFleet) {
      const fleetMap = getSheetMap(sheetFleet);
      for (let r = 1; r < fleetMap.rows.length; r++) {
        const cellNode = String(fleetMap.rows[r][fleetMap.colIndexMap["node_id"]] || "").trim().toLowerCase();
        if (cellNode === nodeId.toLowerCase()) {
          const fRow = fleetMap.rows[r];
          const pubCol = fleetMap.colIndexMap["client_public_key"] !== undefined ? fleetMap.colIndexMap["client_public_key"] : fleetMap.colIndexMap["public_key"];
          const epCol = fleetMap.colIndexMap["server_endpoint"] !== undefined ? fleetMap.colIndexMap["server_endpoint"] : fleetMap.colIndexMap["endpoint"];
          wgData = {
            nodeId: nodeId,
            tunnelIp: String(fRow[fleetMap.colIndexMap["tunnel_ip"]] || ""),
            listenPort: fRow[fleetMap.colIndexMap["listen_port"]] || (51820 + getNodeNumber(nodeId)),
            clientPublicKey: String(fRow[pubCol] || ""),
            serverEndpoint: String(fRow[epCol] || ""),
            fullConfig: String(fRow[fleetMap.colIndexMap["full_config"]] || ""),
            clanStatus: String(fRow[fleetMap.colIndexMap["clan_status"]] || "Synced"),
            updatedAt: String(fRow[fleetMap.colIndexMap["updated_at"]] || "")
          };
          break;
        }
      }
    }

    return jsonResponse({
      success: true,
      token: "TOKEN-FASTFREE-LIVE-" + Utilities.getUuid(),
      license: {
        licenseKey: reqKey,
        nodeId: nodeId,
        organization: orgName,
        tier: tier,
        tierName: "FastFree Sovereign Node License (" + nodeId + ")",
        status: "ACTIVE",
        maxUsers: maxSeats,
        hwid: reqHwid,
        expiresAt: expDateFormatted,
        maxOfflineDays: 90,
        wireguard: wgData
      }
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: "SERVER_EXCEPTION",
      message: err.toString()
    });
  }
}

function doGet(e) {
  return ContentService.createTextOutput("FastFree Cloud Licensing & 3-Tab Fleet Control Plane is LIVE");
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

```

