/**
 * FastFree Cloud Licensing & Fleet Control Plane (Google Apps Script)
 * Sheet ID: 1WM3vVved271m8ZrTbivM5s38xSZF5NzxjpsWNb2SfH8
 * 
 * Two-Tab Architecture:
 * - Tab 1: Licenses (Commercial & Enterprise Client Licensing)
 * - Tab 2: WireGuard (Clan 26.05 Mesh Network Telemetry & Peer Configs)
 */

const SECRET_API_KEY = "FASTFREE-API-SECRET-KEY-998822";
const TAB_LICENSES = "Licenses";
const TAB_WIREGUARD = "WireGuard";

// قائمة الأعمدة المعتمدة لورقة التراخيص (Licenses)
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

// قائمة الأعمدة المعتمدة لورقة شبكة واير جارد (WireGuard)
const HEADERS_WIREGUARD = [
  "node_id",
  "tunnel_ip",
  "listen_port",
  "client_public_key",
  "server_endpoint",
  "full_config",
  "clan_status",
  "updated_at"
];

/**
 * إضافة قائمة مخصصة في واجهة Google Sheets تلقائياً عند فتح الجدول
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("FastFree Node")
    .addItem("تهيئة الورقتين (Setup Tabs: Licenses & WireGuard)", "setupHeaders")
    .addSeparator()
    .addItem("إنشاء ترخيص عميل جديد (Create Single License)", "createNewLicensePrompt")
    .addToUi();
}

/**
 * تهيئة وترتيب رؤوس الأعمدة في كلا الورقتين وتنسيق المظهر والقوائم المنسدلة (Comboboxes)
 */
function setupHeaders(silent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ورقة التراخيص (Licenses)
  let sheetLic = ss.getSheetByName(TAB_LICENSES);
  if (!sheetLic) {
    sheetLic = ss.insertSheet(TAB_LICENSES);
  }
  sheetLic.getRange(1, 1, 1, HEADERS_LICENSES.length).setValues([HEADERS_LICENSES]);
  sheetLic.getRange(1, 1, 1, HEADERS_LICENSES.length)
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheetLic.setFrozenRows(1);
  sheetLic.setRowHeight(1, 38);

  const licWidths = [100, 220, 220, 110, 100, 120, 130, 150, 130, 200, 280, 170, 200];
  licWidths.forEach((w, i) => {
    sheetLic.setColumnWidth(i + 1, w);
  });

  // إضافة قوائم منسدلة (Comboboxes / Data Validation) لورقة Licenses (حتى الصف 100)
  const nodeOptions = ["client2", "client3", "client4", "client5", "client6", "client7", "client8", "client9", "client10", "client11"];
  const nodeRule = SpreadsheetApp.newDataValidation().requireValueInList(nodeOptions, true).build();
  sheetLic.getRange("A2:A100").setDataValidation(nodeRule).setHorizontalAlignment("center");

  const tierOptions = ["enterprise", "pro", "cluster", "starter"];
  const tierRule = SpreadsheetApp.newDataValidation().requireValueInList(tierOptions, true).build();
  sheetLic.getRange("D2:D100").setDataValidation(tierRule).setHorizontalAlignment("center");

  const statusOptions = ["AVAILABLE", "ACTIVE", "SUSPENDED", "REVOKED"];
  const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(statusOptions, true).build();
  sheetLic.getRange("F2:F100").setDataValidation(statusRule).setHorizontalAlignment("center");

  // محاذاة وتنسيق أعمدة Licenses
  sheetLic.getRange("C2:C100").setHorizontalAlignment("center"); // license_key
  sheetLic.getRange("E2:E100").setHorizontalAlignment("center").setNumberFormat("0"); // max_seats
  sheetLic.getRange("G2:G100").setHorizontalAlignment("center"); // expiration_date
  sheetLic.getRange("H2:M100").setVerticalAlignment("middle");

  // التنسيق الشرطي لحالات الترخيص (Conditional Formatting Colors)
  const statusRange = sheetLic.getRange("F2:F100");
  const ruleActive = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("ACTIVE")
    .setBackground("#dcfce7")
    .setFontColor("#15803d")
    .setRanges([statusRange])
    .build();

  const ruleAvailable = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("AVAILABLE")
    .setBackground("#dbeafe")
    .setFontColor("#1d4ed8")
    .setRanges([statusRange])
    .build();

  const ruleSuspended = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("SUSPENDED")
    .setBackground("#fef3c7")
    .setFontColor("#b45309")
    .setRanges([statusRange])
    .build();

  const ruleRevoked = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("REVOKED")
    .setBackground("#fee2e2")
    .setFontColor("#b91c1c")
    .setRanges([statusRange])
    .build();

  sheetLic.setConditionalFormatRules([ruleActive, ruleAvailable, ruleSuspended, ruleRevoked]);

  // 2. ورقة شبكة واير جارد (WireGuard)
  let sheetWg = ss.getSheetByName(TAB_WIREGUARD);
  if (!sheetWg) {
    sheetWg = ss.insertSheet(TAB_WIREGUARD);
  }
  sheetWg.getRange(1, 1, 1, HEADERS_WIREGUARD.length).setValues([HEADERS_WIREGUARD]);
  sheetWg.getRange(1, 1, 1, HEADERS_WIREGUARD.length)
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheetWg.setFrozenRows(1);
  sheetWg.setRowHeight(1, 38);

  const wgWidths = [100, 140, 110, 280, 230, 360, 120, 170];
  wgWidths.forEach((w, i) => {
    sheetWg.setColumnWidth(i + 1, w);
  });

  // قوائم منسدلة ومحاذاة لورقة WireGuard
  sheetWg.getRange("A2:A100").setDataValidation(nodeRule).setHorizontalAlignment("center");
  sheetWg.getRange("B2:B100").setHorizontalAlignment("center"); // tunnel_ip
  sheetWg.getRange("C2:C100").setHorizontalAlignment("center").setNumberFormat("0"); // listen_port
  sheetWg.getRange("G2:G100").setHorizontalAlignment("center"); // clan_status

  const clanStatusOptions = ["Synced", "Pending", "Offline"];
  const clanRule = SpreadsheetApp.newDataValidation().requireValueInList(clanStatusOptions, true).build();
  sheetWg.getRange("G2:G100").setDataValidation(clanRule);

  // تنسيق شرطي لحالة Clan في ورقة WireGuard
  const wgStatusRange = sheetWg.getRange("G2:G100");
  const ruleSynced = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Synced")
    .setBackground("#dcfce7")
    .setFontColor("#15803d")
    .setRanges([wgStatusRange])
    .build();
  sheetWg.setConditionalFormatRules([ruleSynced]);

  if (!silent) {
    SpreadsheetApp.getUi().alert("تم تهيئة الورقتين (Licenses & WireGuard) بالقوائم المنسدلة والتنسيق والألوان بنجاح!");
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
  return "10.24.0." + getNodeNumber(nodeId) + "/32";
}

function getDefaultListenPort(nodeId) {
  return 51820 + getNodeNumber(nodeId);
}

function getDefaultServerEndpoint(nodeId) {
  return "client1.fastfree.cloud:" + getDefaultListenPort(nodeId);
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
    "PublicKey = ff+client1+controller+vps+primary+master===",
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
 * منطق الـ Idempotent Upsert للأسطول عبر ورقتي Licenses و WireGuard
 * لا يقوم بحذف أو مسح أي بيانات سابقة إطلاقاً
 */
function upsertFleetData(fleetList, ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  let sheetLic = ss.getSheetByName(TAB_LICENSES);
  let sheetWg = ss.getSheetByName(TAB_WIREGUARD);
  if (!sheetLic || !sheetWg) {
    setupHeaders(true);
    sheetLic = ss.getSheetByName(TAB_LICENSES);
    sheetWg = ss.getSheetByName(TAB_WIREGUARD);
  }

  const licMap = getSheetMap(sheetLic);
  const wgMap = getSheetMap(sheetWg);

  const colLicNode = licMap.colIndexMap["node_id"];
  const colLicOrg = licMap.colIndexMap["organization_name"];
  const colLicKey = licMap.colIndexMap["license_key"];
  const colLicTier = licMap.colIndexMap["tier"];
  const colLicSeats = licMap.colIndexMap["max_seats"];
  const colLicStatus = licMap.colIndexMap["status"];
  const colLicExp = licMap.colIndexMap["expiration_date"];
  const colLicNotes = licMap.colIndexMap["notes"];

  const colWgNode = wgMap.colIndexMap["node_id"];
  const colWgTunnel = wgMap.colIndexMap["tunnel_ip"];
  const colWgPort = wgMap.colIndexMap["listen_port"];
  const colWgPub = wgMap.colIndexMap["client_public_key"];
  const colWgEndpoint = wgMap.colIndexMap["server_endpoint"];
  const colWgConfig = wgMap.colIndexMap["full_config"];
  const colWgStatus = wgMap.colIndexMap["clan_status"];
  const colWgUpdated = wgMap.colIndexMap["updated_at"];

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
      // السجل موجود بالفعل -> تطبيق شروط عدم التكرار وعدم المساس بالبيانات الحساسة
      const existingRow = licMap.rows[licRowIndex - 1];
      const existingOrg = String(existingRow[colLicOrg] || "").trim();
      const existingStatus = String(existingRow[colLicStatus] || "").trim().toUpperCase();

      // DO NOT touch license_key
      // DO NOT overwrite organization_name if user set one (keep non-default)
      const inputOrg = String(item.organization_name || item.organization || item.company_name || "").trim();
      if ((!existingOrg || existingOrg === "عميل جديد") && inputOrg && inputOrg !== "عميل جديد") {
        sheetLic.getRange(licRowIndex, colLicOrg + 1).setValue(inputOrg);
      }

      // DO NOT reset status if "ACTIVE"
      if (existingStatus !== "ACTIVE") {
        const inputStatus = (item.status || "AVAILABLE").toUpperCase();
        sheetLic.getRange(licRowIndex, colLicStatus + 1).setValue(inputStatus);
      }

      // DO NOT clear hwid or activated_at (نحن لا نلمس أعمدة HWID أو activated_at هنا مطلقاً)

      // تحديث المقاعد إذا لم تكن محددة
      const existingSeats = existingRow[colLicSeats];
      if ((!existingSeats || existingSeats === "") && item.max_seats) {
        sheetLic.getRange(licRowIndex, colLicSeats + 1).setValue(item.max_seats);
      }
    } else {
      // السجل غير موجود -> إضافة صف جديد بترخيص افتراضي متاح
      const newKey = item.license_key || item.licenseKey || generateLicenseKey(nodeId);
      const orgName = item.organization_name || item.organization || item.company_name || "عميل جديد";
      const tier = item.tier || "enterprise";
      const maxSeats = item.max_seats || item.maxSeats || 10;
      const status = "AVAILABLE";

      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 2);
      const expDateStr = item.expiration_date || item.expires_at || expDate.toISOString().split("T")[0];

      const newLicRow = new Array(HEADERS_LICENSES.length).fill("");
      newLicRow[colLicNode] = nodeId;
      newLicRow[colLicOrg] = orgName;
      newLicRow[colLicKey] = newKey;
      newLicRow[colLicTier] = tier;
      newLicRow[colLicSeats] = maxSeats;
      newLicRow[colLicStatus] = status;
      newLicRow[colLicExp] = expDateStr;
      newLicRow[colLicNotes] = item.notes || "Synced via Clan Fleet";

      sheetLic.appendRow(newLicRow);
      licMap.rows.push(newLicRow);
    }

    // 2. معالجة ورقة WireGuard
    let wgRowIndex = -1;
    for (let r = 1; r < wgMap.rows.length; r++) {
      const cellNode = String(wgMap.rows[r][colWgNode] || "").trim().toLowerCase();
      if (cellNode === nodeId) {
        wgRowIndex = r + 1; // 1-based row index in sheet
        break;
      }
    }

    const tunnelIp = item.tunnel_ip || item.client_tunnel_ip || getDefaultTunnelIp(nodeId);
    const listenPort = item.listen_port || item.port || getDefaultListenPort(nodeId);
    const clientPubKey = item.client_public_key || item.public_key || getDefaultClientPublicKey(nodeId);
    const serverEndpoint = item.server_endpoint || item.controller_endpoint || getDefaultServerEndpoint(nodeId);
    const fullConfig = item.full_config || item.config || generateDefaultWgConfig(nodeId, tunnelIp, listenPort, clientPubKey);
    const clanStatus = "Synced";
    const updatedAt = new Date().toISOString();

    if (wgRowIndex !== -1) {
      // تحديث الأعمدة الفنية للشبكة
      sheetWg.getRange(wgRowIndex, colWgTunnel + 1).setValue(tunnelIp);
      sheetWg.getRange(wgRowIndex, colWgPort + 1).setValue(listenPort);
      sheetWg.getRange(wgRowIndex, colWgPub + 1).setValue(clientPubKey);
      sheetWg.getRange(wgRowIndex, colWgEndpoint + 1).setValue(serverEndpoint);
      sheetWg.getRange(wgRowIndex, colWgConfig + 1).setValue(fullConfig);
      sheetWg.getRange(wgRowIndex, colWgStatus + 1).setValue(clanStatus);
      sheetWg.getRange(wgRowIndex, colWgUpdated + 1).setValue(updatedAt);
    } else {
      // إضافة صف جديد في ورقة WireGuard
      const newWgRow = new Array(HEADERS_WIREGUARD.length).fill("");
      newWgRow[colWgNode] = nodeId;
      newWgRow[colWgTunnel] = tunnelIp;
      newWgRow[colWgPort] = listenPort;
      newWgRow[colWgPub] = clientPubKey;
      newWgRow[colWgEndpoint] = serverEndpoint;
      newWgRow[colWgConfig] = fullConfig;
      newWgRow[colWgStatus] = clanStatus;
      newWgRow[colWgUpdated] = updatedAt;

      sheetWg.appendRow(newWgRow);
      wgMap.rows.push(newWgRow);
    }

    syncedCount++;
  }

  return syncedCount;
}

/**
 * نافذة تفاعلية تطلب اسم العميل وتقوم بتوليد كود رسمي وإضافته فوراً للجدول وتجهيز شبكة WireGuard الخاصة به
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
    ui.alert("يرجى إدخال اسم الشركة!");
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetLic = ss.getSheetByName(TAB_LICENSES);
  if (!sheetLic) {
    setupHeaders(true);
    sheetLic = ss.getSheetByName(TAB_LICENSES);
  }

  const licMap = getSheetMap(sheetLic);
  const colNode = licMap.colIndexMap["node_id"];
  const colKey = licMap.colIndexMap["license_key"];
  const colOrg = licMap.colIndexMap["organization_name"];
  const colStatus = licMap.colIndexMap["status"];

  // البحث عن أول عقدة متاحة (AVAILABLE) أو أول رقم عقدة غير مستخدم بين client2 و client11
  const existingNodes = {};
  let targetRowIndex = -1;
  let targetNodeId = "";

  for (let r = 1; r < licMap.rows.length; r++) {
    const nId = String(licMap.rows[r][colNode] || "").trim().toLowerCase();
    const st = String(licMap.rows[r][colStatus] || "").trim().toUpperCase();
    if (nId) {
      existingNodes[nId] = true;
      if (st === "AVAILABLE" && targetRowIndex === -1) {
        targetRowIndex = r + 1;
        targetNodeId = nId;
      }
    }
  }

  // إذا لم نجد صفاً متاحاً شاغراً، نبحث عن رقم عقدة شاغر client2..client11
  if (!targetNodeId) {
    for (let i = 2; i <= 11; i++) {
      const cand = "client" + i;
      if (!existingNodes[cand]) {
        targetNodeId = cand;
        break;
      }
    }
    if (!targetNodeId) {
      targetNodeId = "client" + (licMap.rows.length + 1);
    }
  }

  const licenseKey = generateLicenseKey(targetNodeId);

  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 1);
  const expDateStr = expDate.toISOString().split("T")[0];

  if (targetRowIndex !== -1) {
    // تحديث الصف المتاح بالاسم الجديد وتاريخ الصلاحية
    sheetLic.getRange(targetRowIndex, colOrg + 1).setValue(orgName);
    sheetLic.getRange(targetRowIndex, colKey + 1).setValue(licenseKey);
    const colExp = licMap.colIndexMap["expiration_date"];
    if (colExp !== undefined) {
      sheetLic.getRange(targetRowIndex, colExp + 1).setValue(expDateStr);
    }
  } else {
    // إضافة صف جديد
    const newRow = new Array(HEADERS_LICENSES.length).fill("");
    newRow[licMap.colIndexMap["node_id"]] = targetNodeId;
    newRow[licMap.colIndexMap["organization_name"]] = orgName;
    newRow[licMap.colIndexMap["license_key"]] = licenseKey;
    newRow[licMap.colIndexMap["tier"]] = "enterprise";
    newRow[licMap.colIndexMap["max_seats"]] = 50;
    newRow[licMap.colIndexMap["status"]] = "ACTIVE";
    newRow[licMap.colIndexMap["expiration_date"]] = expDateStr;
    newRow[licMap.colIndexMap["notes"]] = "Created via FastFree Node Menu";
    sheetLic.appendRow(newRow);
  }

  // التأكد من وجود وتحديث سجل WireGuard لهذه العقدة
  upsertFleetData([{
    node_id: targetNodeId,
    organization_name: orgName,
    max_seats: 10
  }], ss);

  ui.alert(
    "تم إنشاء الترخيص بنجاح!\n\n" +
    "اسم العميل: " + orgName + "\n" +
    "رقم العقدة: " + targetNodeId + "\n" +
    "كود الترخيص: " + licenseKey + "\n" +
    "تاريخ الانتهاء: " + expDateStr + "\n\n" +
    "تم حفظ الكود وإعداد شبكة واير جارد بنجاح. يمكنك إرسال الكود للعميل الآن."
  );
}

/**
 * نقطة النهاية (API Endpoint) لاستقبال طلبات التفعيل والمزامنة من FastFree Installer و Clan Mesh
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "NO_PAYLOAD" });
    }

    const payload = JSON.parse(e.postData.contents);

    // 1. التحقق من مفتاح الحماية API Key
    const reqApiKey = payload.apiKey || payload.api_key;
    if (reqApiKey !== SECRET_API_KEY) {
      return jsonResponse({ success: false, error: "UNAUTHORIZED" });
    }

    const action = String(payload.action || "").trim().toLowerCase();

    // 2. معالجة طلبات المزامنة الشاملة للأسطول (batch_sync / upsert_fleet)
    if (action === "batch_sync" || action === "upsert_fleet") {
      const fleet = payload.fleet || payload.clients || payload.nodes || [];
      if (!Array.isArray(fleet)) {
        return jsonResponse({ success: false, error: "INVALID_FLEET_DATA", message: "Fleet must be an array." });
      }

      const count = upsertFleetData(fleet);
      return jsonResponse({
        success: true,
        action: action,
        synced_count: count,
        message: "Fleet synced successfully into Licenses and WireGuard tabs."
      });
    }

    // 3. معالجة طلبات التحقق من التراخيص (verify أو افتراضي عند إرسال licenseKey)
    const reqKey = (payload.licenseKey || payload.license_key || "").trim().toUpperCase();
    const reqHwid = (payload.hwid || "").trim();
    const computerName = payload.computerName || payload.computer_name || "";
    const windowsUser = payload.windowsUser || payload.windows_user || "";
    const hardwareSpecs = payload.hardwareSpecs || payload.hardware_specs || "";

    if (!reqKey) {
      return jsonResponse({ success: false, error: "MISSING_PARAMETERS", message: "License key is required." });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetLic = ss.getSheetByName(TAB_LICENSES);
    if (!sheetLic) {
      setupHeaders(true);
      sheetLic = ss.getSheetByName(TAB_LICENSES);
    }

    const licMap = getSheetMap(sheetLic);
    const colKey = licMap.colIndexMap["license_key"];
    const colStatus = licMap.colIndexMap["status"];
    const colHwid = licMap.colIndexMap["hwid"];
    const colExp = licMap.colIndexMap["expiration_date"];
    const colNode = licMap.colIndexMap["node_id"];
    const colOrg = licMap.colIndexMap["organization_name"];
    const colTier = licMap.colIndexMap["tier"];
    const colSeats = licMap.colIndexMap["max_seats"];
    const colCompName = licMap.colIndexMap["computer_name"];
    const colWinUser = licMap.colIndexMap["windows_user"];
    const colSpecs = licMap.colIndexMap["hardware_specs"];
    const colActivatedAt = licMap.colIndexMap["activated_at"];

    if (colKey === undefined) {
      return jsonResponse({ success: false, error: "MISSING_LICENSE_KEY_COLUMN", headers: licMap.headers });
    }

    // البحث عن كود الترخيص
    let targetRowIndex = -1;
    for (let i = 1; i < licMap.rows.length; i++) {
      const cellVal = String(licMap.rows[i][colKey] || "").trim().toUpperCase();
      if (cellVal === reqKey) {
        targetRowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (targetRowIndex === -1) {
      return jsonResponse({
        success: false,
        error: "LICENSE_NOT_FOUND",
        searched: reqKey,
        message: "License key was not found in the registry."
      });
    }

    const rowData = licMap.rows[targetRowIndex - 1];
    const status = String(rowData[colStatus] || "ACTIVE").toUpperCase().trim();
    const boundHwid = String(rowData[colHwid] || "").trim();
    const expDateVal = rowData[colExp];

    // التحقق من حالة الترخيص
    if (status === "REVOKED") {
      return jsonResponse({ success: false, error: "LICENSE_REVOKED", message: "This license has been permanently revoked." });
    }
    if (status === "SUSPENDED" || status === "INACTIVE") {
      return jsonResponse({ success: false, error: "LICENSE_SUSPENDED", message: "This license is suspended." });
    }

    // التحقق من تاريخ الصلاحية
    let expDateFormatted = null;
    if (expDateVal) {
      const expDate = new Date(expDateVal);
      if (!isNaN(expDate.getTime())) {
        if (expDate < new Date()) {
          return jsonResponse({ success: false, error: "LICENSE_EXPIRED", message: "This license has expired." });
        }
        expDateFormatted = expDate.toISOString();
      } else {
        expDateFormatted = String(expDateVal);
      }
    }

    // ربط بصمة الجهاز HWID وتسجيل مواصفات الجهاز تلقائياً عند أول تفعيل
    if (!boundHwid) {
      if (reqHwid && colHwid !== undefined) {
        sheetLic.getRange(targetRowIndex, colHwid + 1).setValue(reqHwid);
      }
      if (status === "AVAILABLE" && colStatus !== undefined) {
        sheetLic.getRange(targetRowIndex, colStatus + 1).setValue("ACTIVE");
      }
      if (computerName && colCompName !== undefined) {
        sheetLic.getRange(targetRowIndex, colCompName + 1).setValue(computerName);
      }
      if (windowsUser && colWinUser !== undefined) {
        sheetLic.getRange(targetRowIndex, colWinUser + 1).setValue(windowsUser);
      }
      if (hardwareSpecs && colSpecs !== undefined) {
        sheetLic.getRange(targetRowIndex, colSpecs + 1).setValue(hardwareSpecs);
      }
      if (colActivatedAt !== undefined) {
        sheetLic.getRange(targetRowIndex, colActivatedAt + 1).setValue(new Date().toISOString());
      }
    } else if (boundHwid.toLowerCase() !== reqHwid.toLowerCase()) {
      return jsonResponse({
        success: false,
        error: "HWID_MISMATCH",
        message: "This license is bound to another hardware node."
      });
    }

    // استخراج بيانات العقدة والترخيص
    const nodeId = colNode !== undefined ? String(rowData[colNode] || "client2") : "client2";
    const orgName = colOrg !== undefined ? String(rowData[colOrg] || "Enterprise Client") : "Enterprise Client";
    const tier = colTier !== undefined ? String(rowData[colTier] || "enterprise") : "enterprise";
    const maxSeats = colSeats !== undefined && rowData[colSeats] ? parseInt(rowData[colSeats], 10) : 50;

    // استخراج تفاصيل WireGuard الخاصة بهذه العقدة إن وجدت
    let wgData = null;
    const sheetWg = ss.getSheetByName(TAB_WIREGUARD);
    if (sheetWg) {
      const wgMap = getSheetMap(sheetWg);
      const colWgNode = wgMap.colIndexMap["node_id"];
      for (let r = 1; r < wgMap.rows.length; r++) {
        const cellNode = String(wgMap.rows[r][colWgNode] || "").trim().toLowerCase();
        if (cellNode === nodeId.toLowerCase()) {
          const wgRow = wgMap.rows[r];
          wgData = {
            nodeId: nodeId,
            tunnelIp: String(wgRow[wgMap.colIndexMap["tunnel_ip"]] || ""),
            listenPort: wgRow[wgMap.colIndexMap["listen_port"]] || (51820 + getNodeNumber(nodeId)),
            clientPublicKey: String(wgRow[wgMap.colIndexMap["client_public_key"]] || ""),
            serverEndpoint: String(wgRow[wgMap.colIndexMap["server_endpoint"]] || ""),
            fullConfig: String(wgRow[wgMap.colIndexMap["full_config"]] || ""),
            clanStatus: String(wgRow[wgMap.colIndexMap["clan_status"]] || "Synced"),
            updatedAt: String(wgRow[wgMap.colIndexMap["updated_at"]] || "")
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
        tierName: "FastFree Node License (" + nodeId + ")",
        status: "ACTIVE",
        maxUsers: maxSeats,
        maxSeats: maxSeats,
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
  return ContentService.createTextOutput("FastFree Cloud Licensing & Fleet Control Plane is LIVE");
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
