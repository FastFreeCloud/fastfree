# دليل إعداد نظام التراخيص السحابي عبر Google Sheets

هذا الدليل يحتوي على كل ما يلزمك لتشغيل نظام التراخيص مجاناً وبأعلى درجات الأمان باستخدام **Google Sheets** و **Google Apps Script**.

---

## 1. إعداد جدول Google Sheet

1. افتح [Google Sheets](https://sheets.new) وأنشئ جدولاً جديداً باسم: **`FastFree Licensing Control Plane`**.
2. سمّ ورقة العمل الأولى (Tab): **`Licenses`**.
3. في الصف الأول (الصف رقم 1 - Headers)، انسخ وألصق أسماء الأعمدة التالية:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| **license_key** | **node_id** | **organization_name** | **tier** | **max_seats** | **hwid** | **status** | **expiration_date** | **issued_at** | **last_validated_at** | **notes** |

4. أضف بيانات افتراضية للعملاء (من `client2` حتى `client11`) كما يلي:

```csv
FF-CL02-7K2M-9P4W-1X88,client2,Al-Riyadh Sovereign Enterprise,hyperv_sovereign,50,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Initial provision for Hyper-V Client 2
FF-CL03-8B3N-0Q5X-2Y99,client3,Jeddah Logistics Core,hyperv_sovereign,25,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Initial provision for Hyper-V Client 3
FF-CL04-9C4P-1R6Y-3Z00,client4,Dammam Industrial Manufacturing,hyperv_sovereign,100,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,High-capacity cluster node
FF-CL05-0D5Q-2S7Z-4A11,client5,Medina Retail Distribution,hyperv_sovereign,30,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Retail & POS deployment
FF-CL06-1E6R-3T8A-5B22,client6,Mecca Hospitality Systems,hyperv_sovereign,50,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Hotel & Restaurant appliance
FF-CL07-2F7S-4U9B-6C33,client7,Al-Khobar Financial Services,enterprise_cluster,150,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Financial services primary node
FF-CL08-3G8T-5V0C-7D44,client8,Abha Health Networks,hyperv_sovereign,20,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Healthcare clinic node
FF-CL09-4H9U-6W1D-8E55,client9,Tabuk Agriculture Hub,hyperv_sovereign,15,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Cold-storage & logistics node
FF-CL10-5I0V-7X2E-9F66,client10,Jizan Trade Corporation,hyperv_sovereign,40,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Wholesale import node
FF-CL11-6J1W-8Y3F-0G77,client11,Hail Wholesale Exchange,hyperv_sovereign,30,,ACTIVE,2028-12-31T23:59:59Z,2026-10-25T00:00:00Z,,Trading & Ledger branch
```

> [!NOTE]
> لاحظ أن عمود **`hwid`** يُترك فارغاً في البداية؛ بمجرد أن يدخل العميل المفتاح في جهازه لأول مرة، يقوم التطبيق بربط بصمة جهازه تلقائياً وتثبيتها في هذه الخلية!

---

## 2. كود Google Apps Script (`Code.gs`)

1. من القائمة العلوية في Google Sheets، اضغط: **Extensions (الإضافات)** -> **Apps Script**.
2. امسح أي كود موجود في المحرر وضع الكود التالي:

```javascript
/**
 * FastFree Sovereign Licensing Control Plane API
 * Pure Google Apps Script Web App for HMAC/Ed25519 signed offline-tolerant licensing.
 */

const SHEET_NAME = 'Licenses';
const API_SECRET_TOKEN = 'FASTFREE-API-SECRET-KEY-998822'; // غير هذا المفتاح السري لمفتاحك الخاص

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // منع التضارب (Concurrency Protection)

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'INVALID_PAYLOAD' }, 400);
    }

    const body = JSON.parse(e.postData.contents);
    const { apiKey, licenseKey, hwid, action } = body;

    // 1. تحقق من الـ API Key السري
    if (apiKey !== API_SECRET_TOKEN) {
      return jsonResponse({ success: false, error: 'UNAUTHORIZED' }, 401);
    }

    if (!licenseKey || !hwid) {
      return jsonResponse({ success: false, error: 'MISSING_PARAMETERS' }, 400);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ success: false, error: 'SHEET_NOT_FOUND' }, 500);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const keyCol = headers.indexOf('license_key');
    const nodeCol = headers.indexOf('node_id');
    const orgCol = headers.indexOf('organization_name');
    const tierCol = headers.indexOf('tier');
    const hwidCol = headers.indexOf('hwid');
    const statusCol = headers.indexOf('status');
    const expCol = headers.indexOf('expiration_date');
    const lastSyncCol = headers.indexOf('last_validated_at');

    let foundRowIndex = -1;
    for (let r = 1; r < data.length; r++) {
      if (data[r][keyCol] === licenseKey.trim()) {
        foundRowIndex = r;
        break;
      }
    }

    if (foundRowIndex === -1) {
      return jsonResponse({ success: false, error: 'LICENSE_NOT_FOUND' }, 404);
    }

    const row = data[foundRowIndex];
    const currentStatus = row[statusCol];
    const currentHwid = row[hwidCol];
    const expDateStr = row[expCol];
    const nodeId = row[nodeCol];
    const orgName = row[orgCol];
    const tier = row[tierCol];

    // 2. التحقق من حالة الترخيص (ACTIVE أو SUSPENDED)
    if (currentStatus !== 'ACTIVE') {
      return jsonResponse({ success: false, error: 'LICENSE_SUSPENDED', message: 'This license has been deactivated.' }, 403);
    }

    // 3. التحقق من تاريخ الانتهاء
    if (new Date(expDateStr).getTime() < Date.now()) {
      return jsonResponse({ success: false, error: 'LICENSE_EXPIRED', message: 'License validity has expired.' }, 403);
    }

    // 4. ربط العتاد (First-Use Binding أو Match)
    if (!currentHwid || currentHwid === '') {
      // أول تفعيل: ربط بصمة الجهاز
      sheet.getRange(foundRowIndex + 1, hwidCol + 1).setValue(hwid);
    } else if (currentHwid !== hwid) {
      // محاولة استخدام المفتاح على جهاز آخر مختلف
      return jsonResponse({
        success: false,
        error: 'HWID_MISMATCH',
        message: 'This license is bound to another hardware node.'
      }, 403);
    }

    // 5. تحديث تاريخ آخر تحقق
    sheet.getRange(foundRowIndex + 1, lastSyncCol + 1).setValue(new Date().toISOString());

    // 6. تجهيز حمولة الترخيص
    const payload = {
      licenseKey: licenseKey,
      nodeId: nodeId,
      organization: orgName,
      tier: tier,
      hwid: hwid,
      status: 'ACTIVE',
      expiresAt: expDateStr,
      issuedAt: new Date().toISOString(),
      maxOfflineDays: 90
    };

    // 7. توقيع رقمي مشفر (HMAC-SHA256 Token)
    const tokenSignature = Utilities.computeHmacSha256Signature(JSON.stringify(payload), API_SECRET_TOKEN);
    const signatureHex = tokenSignature.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

    return jsonResponse({
      success: true,
      token: Utilities.base64Encode(JSON.stringify(payload)) + '.' + signatureHex,
      license: payload
    }, 200);

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. اضغط **Deploy (نشر)** -> **New deployment (نشر جديد)**:
   - اضغط على الترس واختر **Web app**.
   - **Description**: `FastFree Licensing Endpoint`
   - **Execute as**: `Me (حسابك الشخصي)`
   - **Who has access**: `Anyone (أي شخص)`
4. اضغط **Deploy** وانسخ الرابط النهائي المعطى (Web App URL).
