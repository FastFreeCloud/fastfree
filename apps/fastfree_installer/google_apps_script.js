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
  ui.createMenu("FastFree Node")
    .addItem("تهيئة الورقات الثلاث (Setup 3 Tabs: Licenses, Fleet, Sub-Devices)", "setupHeaders")
    .addSeparator()
    .addItem("إنشاء ترخيص عميل جديد (Create Single License)", "createNewLicensePrompt")
    .addToUi();
}

/**
 * البحث عن ورقة الخوادم مع التوافق العكسي مع اسم WireGuard
 */
function getFleetServersSheet(ss) {
  return ss.getSheetByName(TAB_FLEET_SERVERS) || ss.getSheetByName(TAB_WIREGUARD_LEGACY);
}

/**
 * تهيئة وترتيب رؤوس الأعمدة في الورقات الثلاث وتنسيق المظهر والقوائم المنسدلة (Comboboxes)
 */
function setupHeaders(silent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ─────────────────────────────────────────────────────────────
  // 1. ورقة التراخيص (Licenses)
  // ─────────────────────────────────────────────────────────────
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
  const nodeOptions = ["client1", "client2", "client3", "client4", "client5", "client6", "client7", "client8", "client9", "client10", "client11"];
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

  // ─────────────────────────────────────────────────────────────
  // 2. ورقة خوادم الأسطول (Fleet_Servers)
  // ─────────────────────────────────────────────────────────────
  let sheetFleet = getFleetServersSheet(ss);
  if (!sheetFleet) {
    sheetFleet = ss.insertSheet(TAB_FLEET_SERVERS);
  } else if (sheetFleet.getName() === TAB_WIREGUARD_LEGACY) {
    sheetFleet.setName(TAB_FLEET_SERVERS);
  }
  sheetFleet.getRange(1, 1, 1, HEADERS_FLEET_SERVERS.length).setValues([HEADERS_FLEET_SERVERS]);
  sheetFleet.getRange(1, 1, 1, HEADERS_FLEET_SERVERS.length)
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheetFleet.setFrozenRows(1);
  sheetFleet.setRowHeight(1, 38);

  const fleetWidths = [100, 160, 140, 110, 280, 240, 360, 120, 170];
  fleetWidths.forEach((w, i) => {
    sheetFleet.setColumnWidth(i + 1, w);
  });

  // قوائم منسدلة ومحاذاة لورقة Fleet_Servers
  sheetFleet.getRange("A2:A100").setDataValidation(nodeRule).setHorizontalAlignment("center");

  const roleOptions = ["Controller Hub (Hyper-V)", "Appliance Node (Hyper-V)"];
  const roleRule = SpreadsheetApp.newDataValidation().requireValueInList(roleOptions, true).build();
  sheetFleet.getRange("B2:B100").setDataValidation(roleRule).setHorizontalAlignment("center");

  sheetFleet.getRange("C2:C100").setHorizontalAlignment("center"); // tunnel_ip
  sheetFleet.getRange("D2:D100").setHorizontalAlignment("center").setNumberFormat("0"); // listen_port
  sheetFleet.getRange("H2:H100").setHorizontalAlignment("center"); // clan_status

  const clanStatusOptions = ["Synced", "Pending", "Offline"];
  const clanRule = SpreadsheetApp.newDataValidation().requireValueInList(clanStatusOptions, true).build();
  sheetFleet.getRange("H2:H100").setDataValidation(clanRule);

  // تنسيق شرطي لحالة Clan في ورقة Fleet_Servers
  const fleetStatusRange = sheetFleet.getRange("H2:H100");
  const ruleSynced = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Synced")
    .setBackground("#dcfce7")
    .setFontColor("#15803d")
    .setRanges([fleetStatusRange])
    .build();
  sheetFleet.setConditionalFormatRules([ruleSynced]);

  // ─────────────────────────────────────────────────────────────
  // 3. ورقة الأجهزة الفرعية ونقاط البيع (Sub_Devices)
  // ─────────────────────────────────────────────────────────────
  let sheetSub = ss.getSheetByName(TAB_SUB_DEVICES);
  if (!sheetSub) {
    sheetSub = ss.insertSheet(TAB_SUB_DEVICES);
  }
  sheetSub.getRange(1, 1, 1, HEADERS_SUB_DEVICES.length).setValues([HEADERS_SUB_DEVICES]);
  sheetSub.getRange(1, 1, 1, HEADERS_SUB_DEVICES.length)
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheetSub.setFrozenRows(1);
  sheetSub.setRowHeight(1, 38);

  const subWidths = [140, 100, 180, 150, 140, 130, 260, 260, 240, 110, 170];
  subWidths.forEach((w, i) => {
    sheetSub.setColumnWidth(i + 1, w);
  });

  sheetSub.getRange("B2:B200").setDataValidation(nodeRule).setHorizontalAlignment("center");

  const subRoleOptions = ["موبايل الإدارة", "كاشير 1 (نقطة بيع)", "كاشير 2 (نقطة بيع)", "جهاز المحاسب", "تابلت المخزن والجرد", "أخرى"];
  const subRoleRule = SpreadsheetApp.newDataValidation().requireValueInList(subRoleOptions, true).build();
  sheetSub.getRange("D2:D200").setDataValidation(subRoleRule).setHorizontalAlignment("center");

  sheetSub.getRange("A2:A200").setHorizontalAlignment("center");
  sheetSub.getRange("E2:E200").setHorizontalAlignment("center");
  sheetSub.getRange("F2:F200").setHorizontalAlignment("center"); // QR Code cell
  sheetSub.getRange("J2:J200").setHorizontalAlignment("center");

  const subStatusOptions = ["ACTIVE", "REVOKED", "PENDING"];
  const subStatusRule = SpreadsheetApp.newDataValidation().requireValueInList(subStatusOptions, true).build();
  sheetSub.getRange("J2:J200").setDataValidation(subStatusRule);

  // معادلة الباركود التلقائي في عمود F: توليد صورة QR فورية للموبايل
  for (let r = 2; r <= 30; r++) {
    const qrCell = sheetSub.getRange(r, 6);
    if (!qrCell.getFormula()) {
      qrCell.setFormula(`=IF(ISBLANK(G${r}), "", IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" & ENCODEURL("[Interface]%0APrivateKey=" & G${r} & "%0AAddress=" & E${r} & "%0A[Peer]%0APublicKey=Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=%0AEndpoint=" & I${r} & "%0AAllowedIPs=10.24.0.0/16%0APersistentKeepalive=25")))`);
    }
  }

  if (!silent) {
    SpreadsheetApp.getUi().alert("تمت تهيئة الورقات الثلاث (Licenses, Fleet_Servers, Sub_Devices) بالقوائم المنسدلة ومعادلات الـ QR Codes بنجاح!");
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
        item.expiration_date || "2027-12-31",
        "", "", "", "", "",
        item.notes || "Auto-seeded via Clan Sync"
      ];
      sheetLic.appendRow(newRow);
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
      sheetFleet.appendRow(newFleetRow);
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

    // 1. مزامنة الأسطول الجماعي (Fleet Bulk Sync)
    if (payload.action === "fleet_sync" || payload.action === "sync_fleet" || Array.isArray(payload.fleet)) {
      const fleetList = Array.isArray(payload.fleet) ? payload.fleet : [];
      const count = upsertFleetData(fleetList, ss);
      return jsonResponse({
        success: true,
        action: "fleet_sync",
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

    // فحص قفل بصمة العتاد (HWID Lock)
    if (currentHwid && currentHwid !== reqHwid) {
      return jsonResponse({
        success: false,
        error: "HWID_MISMATCH",
        message: "License is bound to another hardware profile. Hardware transfer authorization required.",
        registeredHwid: currentHwid.substring(0, 8) + "..."
      });
    }

    // تفعيل الترخيص عند أول استخدام
    const nowIso = new Date().toISOString();
    if (!currentHwid && reqHwid) {
      sheetLic.getRange(matchedRow, licMap.colIndexMap["hwid"] + 1).setValue(reqHwid);
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
  return ContentService.createTextOutput("FastFree Cloud Licensing & 3-Tab Fleet Control Plane is LIVE");
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
