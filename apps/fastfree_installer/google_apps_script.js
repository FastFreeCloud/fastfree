/**
 * FastFree Cloud Licensing Plane (Google Apps Script)
 * Sheet ID: 1WM3vVved271m8ZrTbivM5s38xSZF5NzxjpsWNb2SfH8
 * Tab Name: Licenses
 */

const SECRET_API_KEY = "FASTFREE-API-SECRET-KEY-998822";
const SHEET_NAME = "Licenses";

// قائمة الأعمدة المعتمدة
const DEFAULT_HEADERS = [
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

/**
 * إضافة قائمة مخصصة في واجهة Google Sheets تلقائياً عند فتح الجدول
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("⚡ FastFree Node")
    .addItem("➕ إنشاء ترخيص عميل جديد (Create License)", "createNewLicensePrompt")
    .addSeparator()
    .addItem("🛠️ تهيئة أعمدة الجدول (Setup Headers)", "setupHeaders")
    .addToUi();
}

/**
 * تهيئة وترتيب رؤوس الأعمدة إذا كان الجدول جديداً
 */
function setupHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  sheet.getRange(1, 1, 1, DEFAULT_HEADERS.length).setValues([DEFAULT_HEADERS]);
  sheet.getRange(1, 1, 1, DEFAULT_HEADERS.length)
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
    
  SpreadsheetApp.getUi().alert("✅ تم ضبط رؤوس الأعمدة بنجاح!");
}

/**
 * نافذة تفاعلية تطلب اسم العميل وتقوم بتوليد كود رسمي وإضافته فوراً للجدول
 */
function createNewLicensePrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "إنشاء ترخيص عميل جديد",
    "أدخل اسم الشركة / العميل (Organization Name):",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const orgName = response.getResponseText().trim();
  if (!orgName) {
    ui.alert("⚠️ يرجى إدخال اسم الشركة!");
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setupHeaders();
    sheet = ss.getSheetByName(SHEET_NAME);
  }

  const data = sheet.getDataRange().getValues();
  const nextNodeNum = Math.min(Math.max(data.length, 2), 11);
  const nodeId = "client" + nextNodeNum;

  // توليد كود ترخيص فريد بنمط: FF-CL02-XXXX-XXXX
  const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const licenseKey = "FF-CL" + String(nextNodeNum).padStart(2, "0") + "-" + randPart1 + "-" + randPart2;

  // تاريخ انتهاء بعد سنة كاملة
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 1);
  const expDateStr = expDate.toISOString().split("T")[0];

  // خريطة الأعمدة
  const headers = data[0].map(h => String(h || "").trim().toLowerCase());
  const newRow = new Array(headers.length).fill("");

  function setVal(colName, val) {
    const idx = headers.indexOf(colName.toLowerCase());
    if (idx !== -1) newRow[idx] = val;
  }

  setVal("node_id", nodeId);
  setVal("organization_name", orgName);
  setVal("license_key", licenseKey);
  setVal("tier", "enterprise");
  setVal("max_seats", 50);
  setVal("status", "ACTIVE");
  setVal("expiration_date", expDateStr);
  setVal("notes", "Generated via FastFree Node Menu");

  sheet.appendRow(newRow);

  ui.alert(
    "🎉 تم إنشاء الترخيص بنجاح!\n\n" +
    "اسم العميل: " + orgName + "\n" +
    "رقم العقدة: " + nodeId + "\n" +
    "كود الترخيص: " + licenseKey + "\n" +
    "تاريخ الانتهاء: " + expDateStr + "\n\n" +
    "تم حفظ الكود في الجدول. انسخ الكود وأرسله للعميل الآن."
  );
}

/**
 * نقطة النهاية (API Endpoint) لاستقبال طلبات التفعيل من برنامج التثبيت (Tauri Installer)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "NO_PAYLOAD" });
    }

    const payload = JSON.parse(e.postData.contents);

    // 1. التحقق من مفتاح الحماية API Key
    if (payload.apiKey !== SECRET_API_KEY && payload.api_key !== SECRET_API_KEY) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED_ACCESS" });
    }

    const reqKey = (payload.licenseKey || payload.license_key || "").trim().toUpperCase();
    const reqHwid = (payload.hwid || "").trim();
    const computerName = payload.computerName || payload.computer_name || "";
    const windowsUser = payload.windowsUser || payload.windows_user || "";
    const hardwareSpecs = payload.hardwareSpecs || payload.hardware_specs || "";

    if (!reqKey) {
      return jsonResponse({ success: false, error: "EMPTY_LICENSE_KEY" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ success: false, error: "SHEET_NOT_FOUND" });
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return jsonResponse({ success: false, error: "NO_LICENSES_IN_REGISTRY" });
    }

    // قراءة رؤوس الأعمدة ديناميكياً
    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    const getColIndex = (name) => headers.indexOf(name.toLowerCase());

    const colKey = getColIndex("license_key");
    const colStatus = getColIndex("status");
    const colHwid = getColIndex("hwid");
    const colExp = getColIndex("expiration_date");
    const colNode = getColIndex("node_id");
    const colOrg = getColIndex("organization_name");
    const colTier = getColIndex("tier");
    const colCompName = getColIndex("computer_name");
    const colWinUser = getColIndex("windows_user");
    const colSpecs = getColIndex("hardware_specs");
    const colActivatedAt = getColIndex("activated_at");

    if (colKey === -1) {
      return jsonResponse({ success: false, error: "MISSING_LICENSE_KEY_COLUMN", headers: headers });
    }

    // 2. البحث عن كود الترخيص
    let targetRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const cellVal = String(data[i][colKey] || "").trim().toUpperCase();
      if (cellVal === reqKey) {
        targetRowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (targetRowIndex === -1) {
      return jsonResponse({
        success: false,
        error: "LICENSE_NOT_FOUND",
        searched: reqKey
      });
    }

    const rowData = data[targetRowIndex - 1];
    const status = String(rowData[colStatus] || "ACTIVE").toUpperCase().trim();
    const boundHwid = String(rowData[colHwid] || "").trim();
    const expDateVal = rowData[colExp];

    // 3. التحقق من حالة الترخيص
    if (status === "REVOKED" || status === "SUSPENDED" || status === "INACTIVE") {
      return jsonResponse({ success: false, error: "LICENSE_REVOKED" });
    }

    // 4. التحقق من تاريخ الصلاحية
    if (expDateVal) {
      const expDate = new Date(expDateVal);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return jsonResponse({ success: false, error: "LICENSE_EXPIRED" });
      }
    }

    // 5. ربط بصمة الجهاز HWID وتسجيل مواصفات الجهاز تلقائياً
    if (!boundHwid) {
      // أول تفعيل للجهاز -> قفل الكود على هذا الجهاز وتسجيل بيانات العميل
      if (reqHwid && colHwid !== -1) {
        sheet.getRange(targetRowIndex, colHwid + 1).setValue(reqHwid);
      }
      if (computerName && colCompName !== -1) {
        sheet.getRange(targetRowIndex, colCompName + 1).setValue(computerName);
      }
      if (windowsUser && colWinUser !== -1) {
        sheet.getRange(targetRowIndex, colWinUser + 1).setValue(windowsUser);
      }
      if (hardwareSpecs && colSpecs !== -1) {
        sheet.getRange(targetRowIndex, colSpecs + 1).setValue(hardwareSpecs);
      }
      if (colActivatedAt !== -1) {
        sheet.getRange(targetRowIndex, colActivatedAt + 1).setValue(new Date().toISOString());
      }
    } else if (boundHwid.toLowerCase() !== reqHwid.toLowerCase()) {
      // الجهاز يختلف عن الجهاز المسجل سابقاً -> رفض التفعيل
      return jsonResponse({
        success: false,
        error: "HARDWARE_MISMATCH",
        message: "This license is bound to another hardware node."
      });
    }

    // 6. نجاح التفعيل وإرجاع البيانات للعقدة
    const nodeId = colNode !== -1 ? String(rowData[colNode] || "client2") : "client2";
    const orgName = colOrg !== -1 ? String(rowData[colOrg] || "Enterprise Client") : "Enterprise Client";
    const tier = colTier !== -1 ? String(rowData[colTier] || "enterprise") : "enterprise";

    return jsonResponse({
      success: true,
      token: "TOKEN-FASTFREE-LIVE-" + Utilities.getUuid(),
      license: {
        licenseKey: reqKey,
        nodeId: nodeId,
        organization: orgName,
        tier: tier,
        status: "ACTIVE",
        hwid: reqHwid,
        maxOfflineDays: 90
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
  return ContentService.createTextOutput("FastFree Licensing Plane is LIVE ✅");
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
