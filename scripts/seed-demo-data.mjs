// ============================================================
// FastFree Demo Data Seeder for the live Frappe/ERPNext backend
//
// Base:       https://backend.fastfree.cloud (Frappe v15 + ERPNext v15)
// Login:      Administrator (see constants below; override via env)
// Behavior:   IDEMPOTENT — reads existing data first, skips what exists.
// Strategy:   masters -> deterministic names / filters; transactions ->
//             deterministic pseudo-unique filters so re-running never dupes.
// ============================================================

const BASE = process.env.FF_BASE || 'https://backend.fastfree.cloud'
const USR = process.env.FF_USR || 'Administrator'
const PWD = process.env.FF_PWD || 'Fastfree@2026'

const COMPANY = 'FastFree Demo \u0634\u0631\u0643\u0629' // FastFree Demo شركة
const ABBR = 'FFD'
const COST_CENTER = `Main - ${ABBR}`
const RECEIVABLE_ACCOUNT = `Debtors - ${ABBR}`
const PAYABLE_ACCOUNT = `Creditors - ${ABBR}`
const INCOME_ACCOUNT = `Sales - ${ABBR}`
const EXPENSE_ACCOUNT = `Cost of Goods Sold - ${ABBR}`
const CASH_ACCOUNT = `Cash - ${ABBR}`
const BANK_ACCOUNT = `Commercial Bank - ${ABBR}`
const RETURN_ACCOUNT = `Miscellaneous Expenses - ${ABBR}`
const CURRENCY = 'EGP'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ------------------------------------------------------------
// Tiny HTTP client + in-memory cookie jar (no external deps)
// ------------------------------------------------------------
let cookie = ''

function grabCookies(res) {
  const sc = res.headers.getSetCookie?.() ?? []
  for (const c of sc) {
    const part = c.split(';')[0]
    if (part.startsWith('sid=')) cookie = part
  }
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  })
  grabCookies(res)
  let data = null
  try {
    data = await res.json()
  } catch {
    data = await res.text()
  }
  return { status: res.status, data }
}

const get = (p) => call('GET', p)
const post = (p, b) => call('POST', p, b)

async function login() {
  const r = await post('/api/method/login', { usr: USR, pwd: PWD })
  if (r.status !== 200) {
    throw new Error(`Login failed (${r.status}): ${JSON.stringify(r.data).slice(0, 300)}`)
  }
  const fullName = r.data?.full_name || r.data?.message || ''
  console.log(`[login] OK — ${USR} "${fullName}" (sid captured)`)
}

// ------------------------------------------------------------
// Frappe helpers
// ------------------------------------------------------------
async function getCount(doctype, filters) {
  try {
    const r = await post('/api/method/frappe.client.get_count', {
      doctype,
      filters: filters ?? [],
    })
    if (r.status === 200) return Number(r.data?.message ?? 0)
    return 0
  } catch {
    return 0
  }
}

async function existsByName(doctype, name) {
  if (!name) return false
  const r = await get(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)
  return r.status === 200 && Boolean(r.data?.data)
}

async function findOne(doctype, filters) {
  try {
    const r = await post('/api/method/frappe.client.get_list', {
      doctype,
      filters,
      fields: ['name'],
      limit_page_length: 1,
    })
    if (r.status === 200 && Array.isArray(r.data?.message) && r.data.message.length) {
      return r.data.message[0]
    }
    return null
  } catch {
    return null
  }
}

async function insertDoc(doctype, obj) {
  const r = await post(`/api/resource/${encodeURIComponent(doctype)}`, obj)
  if (r.status === 200 && r.data?.data) {
    return { ok: true, name: r.data.data.name, doc: r.data.data }
  }
  const msg =
    (typeof r.data?.exception === 'string' ? r.data.exception.split('\n')[0] : '') ||
    (r.data?.exc_type || r.data?.message) ||
    JSON.stringify(r.data).slice(0, 400)
  return { ok: false, name: null, error: msg }
}

async function submitByName(doctype, docname) {
  const full = await get(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`)
  if (full.status !== 200 || !full.data?.data) {
    return { ok: false, error: `could not fetch ${doctype} ${docname} for submit (${full.status})` }
  }
  const r = await post('/api/method/frappe.client.submit', { doc: full.data.data })
  if (r.status === 200) return { ok: true }
  const msg =
    (typeof r.data?.exception === 'string' ? r.data.exception.split('\n')[0] : '') ||
    (r.data?.exc_type || r.data?.message) ||
    JSON.stringify(r.data).slice(0, 400)
  return { ok: false, error: msg }
}

// ------------------------------------------------------------
// Progress / stats
// ------------------------------------------------------------
const stats = new Map() // doctype -> {created, skipped, failed}
const issues = []

function bump(doctype, key) {
  const s = stats.get(doctype) || { created: 0, skipped: 0, failed: 0 }
  s[key] += 1
  stats.set(doctype, s)
}

function line(label, detail = '') {
  const pad = label.padEnd(56)
  console.log(`   ${pad} ${detail}`)
}

async function reportDoctype(doctype) {
  const count = await getCount(doctype)
  const s = stats.get(doctype)
  console.log(
    `   ${doctype.padEnd(24)} total=${String(count).padStart(3)}` +
      (s ? `   created=${s.created} skipped=${s.skipped} failed=${s.failed}` : ''),
  )
}

// Create-with-guard helper for masters: skip if a doc matches the filter.
async function ensureOne({ doctype, filterOn, value, discount }) {
  const found = await findOne(doctype, [[filterOn, '=', value]])
  if (found) {
    bump(doctype, 'skipped')
    return { created: false, name: found.name }
  }
  const obj = discount
  const res = await insertDoc(doctype, obj)
  if (res.ok) {
    bump(doctype, 'created')
    return { created: true, name: res.name }
  }
  bump(doctype, 'failed')
  issues.push(`[${doctype}] ${String(value)} — ${res.error}`)
  line(`       !! failed: ${res.error}`, '')
  return { created: false, name: null }
}

// Transaction helper: create draft then submit; idempotent via `findFilters`.
async function txDoc({ doctype, label, findFilters, doc }) {
  const found = await findOne(doctype, findFilters)
  if (found) {
    bump(doctype, 'skipped')
    return { created: false, submitted: false, name: found.name }
  }
  const res = await insertDoc(doctype, doc)
  if (!res.ok) {
    bump(doctype, 'failed')
    issues.push(`[${doctype}] ${label} — ${res.error}`)
    return { created: false, submitted: false, name: null, error: res.error }
  }
  bump(doctype, 'created')
  const sub = await submitByName(doctype, res.name)
  if (!sub.ok) {
    issues.push(`[${doctype}] ${label} (${res.name}) — submit: ${sub.error}`)
    return { created: true, submitted: false, name: res.name, error: sub.error }
  }
  return { created: true, submitted: true, name: res.name }
}

// ------------------------------------------------------------
// Seed data definitions
// ------------------------------------------------------------

const UOMS = ['Nos', 'Box', 'Kg', 'Meter', 'Liter', 'Dozen', 'Pair', 'Set']
const GENDERS = ['Male', 'Female']
const STOCK_ENTRY_TYPES = ['Material Receipt', 'Material Issue', 'Material Transfer', 'Material Transfer for Manufacture', 'Manufacture', 'Repack']
const PRICE_LISTS = [
  { price_list_name: 'Standard Selling', selling: 1, buying: 0, enabled: 1, currency: CURRENCY },
  { price_list_name: 'Standard Buying', selling: 0, buying: 1, enabled: 1, currency: CURRENCY },
]
const LEAD_SOURCES = ['Internet', 'Phone Call', 'Walk In', 'Client Referral', 'Exhibition']
const CAMPAIGNS = ['Summer Campaign 2026', 'Ramadan Special 2026', 'Back to School 2026']
const DESIGNATIONS = ['\u0645\u062f\u064a\u0631 \u0639\u0627\u0645', '\u0645\u062f\u064a\u0631 \u0645\u0628\u064a\u0639\u0627\u062a', '\u0645\u062d\u0627\u0633\u0628', '\u0623\u0645\u064a\u0646 \u0645\u062e\u0632\u0646', '\u0623\u062e\u0635\u0627\u0626\u064a \u0645\u0648\u0627\u0631\u062f \u0628\u0634\u0631\u064a\u0629']
  // مدير عام / مدير مبيعات / محاسب / أمين مخزن / أخصائي موارد بشرية
const DEPARTMENTS = ['\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a', '\u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629', '\u0627\u0644\u0645\u062d\u0627\u0633\u0628\u0629', '\u0627\u0644\u0645\u062e\u0632\u0646', '\u0627\u0644\u0625\u062f\u0627\u0631\u0629']
  // المبيعات / الموارد البشرية / المحاسبة / المخزون / الإدارة

const ITEMS = [
  { code: 'LAB-001', name: '\u0644\u0627\u0628 \u062a\u0648\u0628 Dell XPS', buy: 62000, sell: 68000, uom: 'Nos' },
  { code: 'SCR-001', name: '\u0634\u0627\u0634\u0629 LG 24\u0022', buy: 3900, sell: 5200, uom: 'Nos' },
  { code: 'MOU-001', name: '\u0645\u0627\u0648\u0633 \u0644\u0627\u0633\u0644\u0643\u064a', buy: 320, sell: 450, uom: 'Nos' },
  { code: 'KEY-001', name: '\u0643\u064a\u0628\u0648\u0631\u062f \u0645\u0646\u064a\u0631', buy: 420, sell: 580, uom: 'Nos' },
  { code: 'PRT-001', name: '\u0637\u0627\u0628\u0639\u0629 HP LaserJet', buy: 5400, sell: 6900, uom: 'Nos' },
  { code: 'HDP-001', name: '\u0633\u0645\u0627\u0639\u0629 \u0631\u0623\u0633 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629', buy: 780, sell: 1050, uom: 'Nos' },
  { code: 'DESK-001', name: '\u0645\u0643\u062a\u0628 \u062e\u0634\u0628\u064a', buy: 3400, sell: 4300, uom: 'Nos' },
  { code: 'CHR-001', name: '\u0643\u0631\u0633\u064a \u0645\u0643\u062a\u0628\u064a', buy: 2100, sell: 2900, uom: 'Nos' },
  { code: 'FLE-001', name: '\u0645\u0644\u0641\u0627\u062a \u0628\u0644\u0627\u0633\u062a\u064a\u0643', buy: 95, sell: 140, uom: 'Box' },
  { code: 'PAP-001', name: '\u0648\u0631\u0642 A4', buy: 180, sell: 240, uom: 'Box' },
  { code: 'WTR-001', name: '\u0645\u064a\u0627\u0647 \u0645\u0639\u062f\u0646\u064a\u0629', buy: 45, sell: 70, uom: 'Box' },
  { code: 'CFF-001', name: '\u0642\u0647\u0648\u0629 1\u0643\u062c', buy: 210, sell: 300, uom: 'Box' },
  { code: 'SRV-001', name: '\u0633\u064a\u0631\u0641\u0631 HP ProLiant', buy: 145000, sell: 162000, uom: 'Nos' },
  { code: 'RTR-001', name: '\u0631\u0627\u0648\u062a\u0631 MikroTik', buy: 1750, sell: 2300, uom: 'Nos' },
  { code: 'CAB-001', name: '\u0643\u0627\u0628\u0644 \u0634\u0628\u0643\u0629 UTP', buy: 9, sell: 15, uom: 'Meter' },
]
// لاب توب Dell XPS / شاشة LG 24" / ماوس لاسلكي / كيبورد منير / طابعة HP LaserJet / سماعة رأس احترافية / مكتب خشبي / كرسي مكتبي / ملفات بلاستيك / ورق A4 / مياه معدنية / قهوة 1كج / سيرفر HP ProLiant / راوتر MikroTik / كابل شبكة UTP

const CUSTOMERS = [
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u0648\u0631 \u0644\u0644\u062a\u062c\u0627\u0631\u0629',
  '\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0623\u0645\u0644 \u0627\u0644\u062d\u062f\u064a\u062b\u0629',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u062f\u0644\u062a\u0627 \u0644\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0648\u0627\u0644\u062a\u0635\u062f\u064a\u0631',
  '\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u0646\u064a\u0644 \u0627\u0644\u0642\u0627\u0628\u0636\u0629',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0635\u0641\u0627 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062a',
  '\u0648\u0643\u0627\u0644\u0629 \u0627\u0644\u0641\u0631\u0627\u0639\u0646\u0629 \u0644\u0644\u062a\u0648\u0632\u064a\u0639',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0647\u0631\u0627\u0645 \u0644\u0644\u0635\u0646\u0627\u0639\u0627\u062a',
  '\u0645\u0643\u062a\u0628 \u0645\u064a\u0631\u064a\u062a \u0644\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0627\u062a',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0648\u0627\u062d\u0629 \u0644\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u063a\u0630\u0627\u0626\u064a\u0629',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0628\u062d\u0631 \u0627\u0644\u0623\u062d\u0645\u0631 \u0644\u0644\u0633\u064a\u0627\u062d\u0629',
]
// شركة النور للتجارة / مؤسسة الأمل الحديثة / شركة الدلتا للاستيراد والتصدير / مجموعة النيل القابضة / شركة الصفا للمقاولات / وكالة الفراعنة للتوزيع / شركة الأهرام للصناعات / مكتب ميريت للاستشارات / شركة الواحة للمنتجات الغذائية / شركة البحر الأحمر للسياحة

const SUPPLIERS = [
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0648\u0631\u062f \u0627\u0644\u0623\u0645\u064a\u0646',
  '\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u0623\u0647\u0631\u0627\u0645 \u0627\u0644\u0635\u0646\u0627\u0639\u064a\u0629',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u064a\u0644 \u0644\u0644\u0635\u0644\u0628',
  '\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0641\u062e\u0627\u0645\u0629 \u0644\u0644\u0623\u062b\u0627\u062b',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0634\u0631\u0642 \u0644\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u062e\u0628\u0629 \u0644\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0627\u062a',
  '\u0645\u0624\u0633\u0633\u0629 \u063a\u0631\u0648\u0628 \u0645\u0635\u0631 \u0644\u0644\u0648\u0631\u0642',
  '\u0634\u0631\u0643\u0629 \u0627\u0644\u0639\u0627\u0635\u0645\u0629 \u0644\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u063a\u0630\u0627\u0626\u064a\u0629',
]
// شركة المورد الأمين / مجموعة الأهرام الصناعية / شركة النيل للصلب / مؤسسة الفخامة للأثاث / شركة الشرق للتكنولوجيا / شركة النخبة للإلكترونيات / مؤسسة غروب مصر للورق / شركة العاصمة للمواد الغذائية

const EMPLOYEES = [
  { first: '\u0623\u062d\u0645\u062f', last: '\u0645\u062d\u0645\u062f \u062d\u0633\u0646', dept: DEPARTMENTS[4], desig: DESIGNATIONS[0], gender: 'Male', doj: '2020-03-01', dob: '1985-06-14', email: 'ahmed@fastfree.cloud' },
  { first: '\u0645\u0646\u0649', last: '\u0639\u0627\u062f\u0644 \u0633\u0644\u064a\u0645', dept: DEPARTMENTS[1], desig: DESIGNATIONS[4], gender: 'Female', doj: '2021-07-15', dob: '1992-02-03', email: 'mona@fastfree.cloud' },
  { first: '\u062e\u0627\u0644\u062f', last: '\u0625\u0628\u0631\u0627\u0647\u064a\u0645 \u0639\u0628\u062f', dept: DEPARTMENTS[2], desig: DESIGNATIONS[2], gender: 'Male', doj: '2022-01-10', dob: '1990-11-22', email: 'khaled@fastfree.cloud' },
  { first: '\u0633\u0627\u0631\u0629', last: '\u0639\u0628\u062f \u0627\u0644\u0631\u062d\u0645\u0646', dept: DEPARTMENTS[0], desig: DESIGNATIONS[1], gender: 'Female', doj: '2019-09-01', dob: '1988-04-17', email: 'sara@fastfree.cloud' },
  { first: '\u0645\u062d\u0645\u062f', last: '\u0641\u0624\u0627\u062f \u0634\u0639\u0628\u0627\u0646', dept: DEPARTMENTS[3], desig: DESIGNATIONS[3], gender: 'Male', doj: '2023-05-20', dob: '1995-08-30', email: 'mohamed@fastfree.cloud' },
  { first: '\u0646\u0647\u0627\u062f', last: '\u0633\u0639\u064a\u062f \u0645\u0631\u0627\u062f', dept: DEPARTMENTS[2], desig: DESIGNATIONS[2], gender: 'Female', doj: '2020-11-02', dob: '1993-12-11', email: 'nehad@fastfree.cloud' },
  { first: '\u0639\u0645\u0631', last: '\u064a\u0648\u0633\u0641 \u0639\u0648\u0636', dept: DEPARTMENTS[0], desig: DESIGNATIONS[0], gender: 'Male', doj: '2018-02-18', dob: '1982-09-25', email: 'omar@fastfree.cloud' },
  { first: '\u0644\u064a\u0644\u0649', last: '\u0643\u0645\u0627\u0644 \u062c\u0645\u0627\u0644', dept: DEPARTMENTS[3], desig: DESIGNATIONS[3], gender: 'Female', doj: '2022-08-14', dob: '1997-01-05', email: 'laila@fastfree.cloud' },
]
// أحمد محمد حسن / منى عادل سليم / خالد إبراهيم عبد / سارة عبد الرحمن / محمد فؤاد شعبان / نهاد سعيد مراد / عمر يوسف عوض / ليلى كمال جمال

const LEADS = [
  { first: '\u0645\u062d\u0645\u0648\u062f', last: '\u0627\u0644\u0633\u064a\u062f', company: '\u0634\u0631\u0643\u0629 \u0645\u0635\u0631 \u0644\u0644\u062a\u0642\u0646\u064a\u0629', source: LEAD_SOURCES[1], status: 'Open', city: '\u0627\u0644\u0642\u0627\u0647\u0631\u0629', email: 'mahmoud@example.com', mobile: '+201001111111' },
  { first: '\u0641\u0627\u0637\u0645\u0629', last: '\u0627\u0644\u0632\u0647\u0631\u0627\u0621', company: '\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062c\u064a\u0644', source: LEAD_SOURCES[0], status: 'Replied', city: '\u0627\u0644\u062c\u064a\u0632\u0629', email: 'fatma@example.com', mobile: '+201002222222' },
  { first: '\u0643\u0631\u064a\u0645', last: '\u0634\u0643\u0631\u064a', company: '\u062f\u0627\u0631 \u0627\u0644\u062a\u0642\u062f\u0645 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062a', source: LEAD_SOURCES[2], status: 'Interested', city: '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629', email: 'karim@example.com', mobile: '+201003333333' },
  { first: '\u0647\u062f\u0649', last: '\u0645\u0637\u0631', company: '\u0634\u0631\u0643\u0629 \u0627\u0644\u0628\u0631\u0643\u0629 \u0644\u0644\u0637\u0627\u0642\u0629', source: LEAD_SOURCES[3], status: 'Open', city: '\u0637\u0646\u0637\u0627', email: 'hoda@example.com', mobile: '+201004444444' },
  { first: '\u0637\u0627\u0631\u0642', last: '\u0627\u0644\u0634\u0646\u0627\u0648\u064a', company: '\u0645\u0635\u0646\u0639 \u0627\u0644\u0646\u0635\u0631 \u0644\u0644\u0623\u062b\u0627\u062b', source: LEAD_SOURCES[4], status: 'Opportunity', city: '\u062f\u0645\u064a\u0627\u0637', email: 'tarek@example.com', mobile: '+201005555555' },
  { first: '\u0639\u0627\u0626\u0634\u0629', last: '\u0627\u0644\u0633\u0648\u064a\u0633\u064a', company: '\u0628\u064a\u062a \u0627\u0644\u0645\u0648\u0638\u0629', source: LEAD_SOURCES[1], status: 'Replied', city: '\u0627\u0644\u0642\u0627\u0647\u0631\u0629', email: 'aisha@example.com', mobile: '+201006666666' },
  { first: '\u062d\u0633\u0627\u0645', last: '\u0639\u0628\u062f \u0627\u0644\u063a\u0646\u064a', company: '\u0634\u0631\u0643\u0629 \u0627\u0644\u0639\u0645\u0631 \u0644\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0627\u062a', source: LEAD_SOURCES[0], status: 'Open', city: '\u0627\u0644\u0645\u0646\u0635\u0648\u0631\u0629', email: 'hossam@example.com', mobile: '+201007777777' },
  { first: '\u0631\u064a\u0647\u0627\u0645', last: '\u0623\u062d\u0645\u062f \u0646\u062c\u064a\u0628', company: '\u0645\u0643\u062a\u0628 \u0627\u0644\u0623\u0645\u0627\u0646 \u0644\u0644\u0645\u062d\u0627\u0645\u0627\u0629', source: LEAD_SOURCES[3], status: 'Open', city: '\u0627\u0644\u0642\u0627\u0647\u0631\u0629', email: 'reham@example.com', mobile: '+201008888888' },
  { first: '\u0645\u0635\u0637\u0641\u0649', last: '\u0623\u0628\u0648 \u0632\u064a\u062f', company: '\u0634\u0631\u0643\u0629 \u0641\u0627\u0631\u0648\u0633 \u0644\u0644\u062a\u0648\u0632\u064a\u0639', source: LEAD_SOURCES[1], status: 'Interested', city: '\u0627\u0644\u0639\u0631\u0634 \u0627\u0644\u0628\u062d\u0631 \u0627\u0644\u0623\u062d\u0645\u0631', email: 'mostafa@example.com', mobile: '+201009999999' },
  { first: '\u0633\u0645\u0631', last: '\u0627\u0644\u0645\u0646\u064a\u0627\u0644\u0627\u0648\u064a', company: '\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u062d\u0631\u0645\'', source: LEAD_SOURCES[2], status: 'Lead', city: '\u0623\u0633\u0648\u0627\u0646', email: 'samar@example.com', mobile: '+201000000000' },
]

const HOLIDAYS = [
  { d: '2026-01-01', desc: '\u0631\u0623\u0633 \u0627\u0644\u0633\u0646\u0629' },
  { d: '2026-01-07', desc: '\u0639\u064a\u062f \u0627\u0644\u0645\u064a\u0644\u0627\u062f' },
  { d: '2026-04-25', desc: '\u0639\u064a\u062f \u0627\u0644\u062a\u062d\u0631\u064a\u0631' },
  { d: '2026-04-27', desc: '\u0639\u064a\u062f \u0627\u0644\u0639\u0645\u0627\u0644' },
  { d: '2026-07-23', desc: '\u0639\u064a\u062f \u0627\u0644\u062b\u0648\u0631\u0629' },
  { d: '2026-10-06', desc: '\u064a\u0648\u0645 \u0627\u0644\u0642\u0648\u0627\u062a \u0627\u0644\u0645\u0633\u0644\u062d\u0629' },
]

const JE_ROWS_UNUSED = null

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
async function main() {
  const startedAt = Date.now()
  console.log('=========================================================')
  console.log(' FastFree Demo Data Seeder — live backend')
  console.log(`   target: ${BASE}`)
  console.log('=========================================================')
  await login()

  const out = (label) => console.log(`\n== ${label}`)

  // ---------- 1. Prerequisites & masters ----------
  out('1/20 Territory + Customer Group')
  await ensureOne({ doctype: 'Territory', filterOn: 'territory_name', value: 'Egypt', discount: { territory_name: 'Egypt' } })
  await ensureOne({ doctype: 'Customer Group', filterOn: 'customer_group_name', value: 'Clients', discount: { customer_group_name: 'Clients' } })

  out('2/20 Warehouse Type (missing-pre-req)')
  await ensureOne({ doctype: 'Warehouse Type', filterOn: 'name', value: 'Transit', discount: { name: 'Transit' } })

  out('3/20 UOMs')
  for (const u of UOMS) {
    const found = await findOne('UOM', [['uom_name', '=', u]])
    if (found) { bump('UOM', 'skipped'); continue }
    const res = await insertDoc('UOM', { uom_name: u, must_be_whole_number: u === 'Meter' ? 0 : 1, enabled: 1 })
    if (res.ok) bump('UOM', 'created')
    else { bump('UOM', 'failed'); issues.push(`[UOM] ${u} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  out('4/20 Gender')
  for (const g of GENDERS) {
    const found = await findOne('Gender', [['gender', '=', g]])
    if (found) { bump('Gender', 'skipped'); continue }
    const res = await insertDoc('Gender', { gender: g })
    if (res.ok) bump('Gender', 'created')
    else { bump('Gender', 'failed'); issues.push(`[Gender] ${g} — ${res.error}`) }
  }

  out('5/20 Item Group (Products) + 15 Items')
  await ensureOne({ doctype: 'Item Group', filterOn: 'item_group_name', value: 'Products', discount: { item_group_name: 'Products', is_group: 0 } })

  for (const it of ITEMS) {
    const found = await findOne('Item', [['item_code', '=', it.code]])
    if (found) { bump('Item', 'skipped'); continue }
    const res = await insertDoc('Item', {
      item_code: it.code,
      item_name: it.name,
      item_group: 'Products',
      stock_uom: it.uom,
      is_stock_item: 1,
      is_sales_item: 1,
      is_purchase_item: 1,
      allow_negative_stock: 1,
      valuation_rate: it.buy,
      standard_rate: it.sell,
      description: `${it.name} — FastFree demo item (${it.code})`,
      item_defaults: [
        {
          doctype: 'Item Default',
          company: COMPANY,
          default_warehouse: `Stores - ${ABBR}`,
          income_account: INCOME_ACCOUNT,
          expense_account: EXPENSE_ACCOUNT,
          selling_cost_center: COST_CENTER,
          buying_cost_center: COST_CENTER,
        },
      ],
    })
    if (res.ok) bump('Item', 'created')
    else { bump('Item', 'failed'); issues.push(`[Item] ${it.code} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  out('6/20 Warehouses (3 extra)')
  const EXTRA_WAREHOUSES = [
    { name: '\u0627\u0644\u0645\u062e\u0632\u0646 \u0627\u0644\u0631\u0626\u064a\u0633\u064a - \u0627\u0644\u0642\u0627\u0647\u0631\u0629', code: 'WH-CAIRO' },
    { name: '\u0645\u062e\u0632\u0646 \u0627\u0644\u062a\u0648\u0632\u064a\u0639 - \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629', code: 'WH-ALX' },
    { name: '\u0645\u062e\u0632\u0646 \u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a', code: 'WH-RET' },
  ]
  // المخزن الرئيسي - القاهرة / مخزن التوزيع - الإسكندرية / مخزن المرتجعات
  for (const wh of EXTRA_WAREHOUSES) {
    const found = await findOne('Warehouse', [['warehouse_name', '=', wh.name]])
    if (found) { bump('Warehouse', 'skipped'); continue }
    const res = await insertDoc('Warehouse', { warehouse_name: wh.name, company: COMPANY, warehouse_type: 'Transit' })
    if (res.ok) bump('Warehouse', 'created')
    else { bump('Warehouse', 'failed'); issues.push(`[Warehouse] ${wh.name} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  out('7/20 Company')
  const comp = await findOne('Company', [['company_name', '=', COMPANY]])
  if (comp) {
    bump('Company', 'skipped')
    line('       already exists — CoA/cost centers/warehouses present')
  } else {
    const res = await insertDoc('Company', {
      company_name: COMPANY,
      abbr: ABBR,
      default_currency: CURRENCY,
      country: 'Egypt',
      create_chart_of_accounts_based_on: 'Standard Template',
      days_in_year: 365,
    })
    if (res.ok) bump('Company', 'created')
    else { bump('Company', 'failed'); issues.push(`[Company] ${COMPANY} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
    await sleep(2000)
  }

  out('8/20 Fiscal Years (2025 / 2026 / 2027)')
  for (const [y, s, e] of [['2025', '2025-01-01', '2025-12-31'], ['2026', '2026-01-01', '2026-12-31'], ['2027', '2027-01-01', '2027-12-31']]) {
    const found = await findOne('Fiscal Year', [['year', '=', y]])
    if (found) { bump('Fiscal Year', 'skipped'); continue }
    const res = await insertDoc('Fiscal Year', { year: y, year_start_date: s, year_end_date: e })
    if (res.ok) bump('Fiscal Year', 'created')
    else { bump('Fiscal Year', 'failed'); issues.push(`[Fiscal Year] ${y} — ${res.error}`) }
  }

  out('9/20 Stock Entry Types + Price Lists + Lead Sources + Campaigns')
  for (const t of STOCK_ENTRY_TYPES) {
    await ensureOne({ doctype: 'Stock Entry Type', filterOn: 'name', value: t, discount: { name: t, stock_entry_type: t, purpose: t } })
  }
  for (const pl of PRICE_LISTS) {
    await ensureOne({ doctype: 'Price List', filterOn: 'price_list_name', value: pl.price_list_name, discount: pl })
  }
  for (const s of LEAD_SOURCES) {
    await ensureOne({ doctype: 'Lead Source', filterOn: 'source_name', value: s, discount: { source_name: s } })
  }
  for (const c of CAMPAIGNS) {
    await ensureOne({ doctype: 'Campaign', filterOn: 'campaign_name', value: c, discount: { campaign_name: c, description: `FastFree demo campaign — ${c}` } })
  }

  out('10/20 Bank account (Commercial Bank) + chosen accounts')
  const bankFound = await findOne('Account', [['account_name', '=', 'Commercial Bank']])
  let bankAccount = BANK_ACCOUNT
  if (bankFound) {
    bump('Account', 'skipped')
  } else {
    const res = await insertDoc('Account', {
      account_name: 'Commercial Bank',
      is_group: 0,
      root_type: 'Asset',
      account_type: 'Bank',
      parent_account: `Bank Accounts - ${ABBR}`,
      company: COMPANY,
    })
    if (res.ok) bump('Account', 'created')
    else { bankAccount = CASH_ACCOUNT; bump('Account', 'failed'); issues.push(`[Account] Commercial Bank — ${res.error}`) }
  }
  line('       chosen accounts:')
  line(`         receivable (debit_to) : ${RECEIVABLE_ACCOUNT}`)
  line(`         payable    (credit_to): ${PAYABLE_ACCOUNT}`)
  line(`         income                : ${INCOME_ACCOUNT}`)
  line(`         expense               : ${EXPENSE_ACCOUNT}`)
  line(`         cash                  : ${CASH_ACCOUNT}`)
  line(`         bank (payments)       : ${bankAccount}`)
  line(`         cost center           : ${COST_CENTER}`)

  out('11/20 Departments + Designations')
  for (const d of DEPARTMENTS) {
    await ensureOne({ doctype: 'Department', filterOn: 'department_name', value: d, discount: { department_name: d, company: COMPANY } })
  }
  for (const d of DESIGNATIONS) {
    await ensureOne({ doctype: 'Designation', filterOn: 'designation_name', value: d, discount: { designation_name: d } })
  }

  out('12/20 Holiday List + Employees')
  await ensureOne({
    doctype: 'Holiday List',
    filterOn: 'holiday_list_name',
    value: `Default - ${ABBR}`,
    discount: {
      holiday_list_name: `Default - ${ABBR}`,
      company: COMPANY,
      from_date: '2026-01-01',
      to_date: '2026-12-31',
      holidays: HOLIDAYS.map((h) => ({ doctype: 'Holiday', holiday_date: h.d, description: h.desc })),
    },
  })

  for (const e of EMPLOYEES) {
    const fullName = `${e.first} ${e.last}`
    const found = await findOne('Employee', [['employee_name', '=', fullName]])
    if (found) { bump('Employee', 'skipped'); continue }
    const res = await insertDoc('Employee', {
      first_name: e.first,
      last_name: e.last,
      employee_name: fullName,
      gender: e.gender,
      date_of_birth: e.dob,
      date_of_joining: e.doj,
      status: 'Active',
      company: COMPANY,
      department: `${e.dept} - ${ABBR}`,
      designation: e.desig,
      cell_number: '+2010' + Math.floor(Math.random() * 10000000).toString().padStart(7, '7'),
      company_email: e.email,
      holiday_list: `Default - ${ABBR}`,
    })
    if (res.ok) bump('Employee', 'created')
    else { bump('Employee', 'failed'); issues.push(`[Employee] ${fullName} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  out('13/20 Customers (10)')
  for (const c of CUSTOMERS) {
    const found = await findOne('Customer', [['customer_name', '=', c]])
    if (found) { bump('Customer', 'skipped'); continue }
    const res = await insertDoc('Customer', {
      customer_name: c,
      customer_type: 'Company',
      customer_group: 'Clients',
      territory: 'Egypt',
      default_currency: CURRENCY,
    })
    if (res.ok) bump('Customer', 'created')
    else { bump('Customer', 'failed'); issues.push(`[Customer] ${c} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  out('14/20 Suppliers (8)')
  for (const s of SUPPLIERS) {
    const found = await findOne('Supplier', [['supplier_name', '=', s]])
    if (found) { bump('Supplier', 'skipped'); continue }
    const res = await insertDoc('Supplier', {
      supplier_name: s,
      supplier_type: 'Company',
      country: 'Egypt',
      default_currency: CURRENCY,
    })
    if (res.ok) bump('Supplier', 'created')
    else { bump('Supplier', 'failed'); issues.push(`[Supplier] ${s} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  out('15/20 Sales Stages + Leads (10) + Opportunities (5) + Contacts (5)')
  for (const stage of ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']) {
    await ensureOne({ doctype: 'Sales Stage', filterOn: 'name', value: stage, discount: { name: stage, stage_name: stage } })
  }

  const leadNameMap = new Map() // 'full name' -> doctype name (Lead autoname is a series)
  for (const l of LEADS) {
    const full = `${l.first} ${l.last}`
    const found = await findOne('Lead', [['lead_name', '=', full]])
    if (found) {
      bump('Lead', 'skipped')
      leadNameMap.set(full, found.name)
      continue
    }
    const res = await insertDoc('Lead', {
      first_name: l.first,
      last_name: l.last,
      lead_name: full,
      company_name: l.company,
      status: l.status,
      source: l.source,
      email_id: l.email,
      mobile_no: l.mobile,
      city: l.city,
      country: 'Egypt',
      territory: 'Egypt',
    })
    if (res.ok) { bump('Lead', 'created'); leadNameMap.set(full, res.name) }
    else { bump('Lead', 'failed'); issues.push(`[Lead] ${full} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }
  const leadRels = await post('/api/method/frappe.client.get_list', {
    doctype: 'Lead',
    fields: ['name', 'lead_name'],
    limit_page_length: 100,
  })
  if (leadRels.status === 200) {
    for (const rl of leadRels.data?.message ?? []) leadNameMap.set(rl.lead_name, rl.name)
  }

  const oppSourceLeads = LEADS.slice(0, 5)
  const OPP_DATES = ['2026-07-08', '2026-07-12', '2026-07-19', '2026-08-01', '2026-08-09']
  for (let i = 0; i < oppSourceLeads.length; i++) {
    const l = oppSourceLeads[i]
    const full = `${l.first} ${l.last}`
    const leadName = leadNameMap.get(full)
    if (!leadName) {
      bump('Opportunity', 'failed')
      issues.push(`[Opportunity] ${full} — lead not found`)
      line('       !! failed: lead not found', '')
      continue
    }
    const found = await findOne('Opportunity', [['party_name', '=', leadName], ['transaction_date', '=', OPP_DATES[i]]])
    if (found) { bump('Opportunity', 'skipped'); continue }
    const res = await insertDoc('Opportunity', {
      opportunity_from: 'Lead',
      party_name: leadName,
      customer_name: l.company,
      status: i === 0 ? 'Quotation' : 'Open',
      source: l.source,
      sales_stage: 'Prospecting',
      company: COMPANY,
      transaction_date: OPP_DATES[i],
      expected_closing: '2026-09-30',
      probability: 60,
      opportunity_amount: [250000, 120000, 78000, 190000, 95000][i],
      currency: CURRENCY,
      conversion_rate: 1,
      campaign: CAMPAIGNS[i % CAMPAIGNS.length],
    })
    if (res.ok) bump('Opportunity', 'created')
    else { bump('Opportunity', 'failed'); issues.push(`[Opportunity] ${full} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  const CONTACTS = [
    { first: '\u0639\u0644\u064a', last: '\u062d\u0633\u0646', company: CUSTOMERS[0] },
    { first: '\u0639\u0628\u064a\u0631', last: '\u0645\u062d\u0645\u062f', company: CUSTOMERS[2] },
    { first: '\u0633\u0644\u064a\u0645', last: '\u0639\u062a\u0628\u064a', company: CUSTOMERS[4] },
    { first: '\u0645\u0627\u064a', last: '\u0633\u0639\u062f', company: CUSTOMERS[6] },
    { first: '\u064a\u0627\u0633\u0631', last: '\u0627\u0644\u0633\u064a\u062f', company: CUSTOMERS[8] },
  ]
  for (const ct of CONTACTS) {
    const full = `${ct.first} ${ct.last}`
    const found = await findOne('Contact', [['first_name', '=', ct.first], ['last_name', '=', ct.last]])
    if (found) { bump('Contact', 'skipped'); continue }
    const res = await insertDoc('Contact', {
      first_name: ct.first,
      last_name: ct.last,
      full_name: full,
      email_id: `${ct.first}.${ct.last}@example.com`.toLowerCase().replace(/\s+/g, '.'),
      mobile_no: '+2010' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
      company_name: ct.company,
      is_primary_contact: 1,
    })
    if (res.ok) bump('Contact', 'created')
    else { bump('Contact', 'failed'); issues.push(`[Contact] ${full} — ${res.error}`); line(`       !! failed: ${res.error}`, '') }
  }

  // ---------- 2. Transactions ----------
  const ITEM = (code) => ITEMS.find((i) => i.code === code)

  out('16/20 Journal Entries (10, submitted)')
  const voucherType = 'Journal Entry'
  const jeUse = [
    { rem: 'SEED-DEMO-JE-01', date: '2026-06-30', amt: 4500, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 01 - Utilities June' },
    { rem: 'SEED-DEMO-JE-02', date: '2026-07-15', amt: 18000, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 02 - Office Rent' },
    { rem: 'SEED-DEMO-JE-03', date: '2026-07-31', amt: 2600, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 03 - Phone & Internet' },
    { rem: 'SEED-DEMO-JE-04', date: '2026-07-31', amt: 85000, to: `Marketing Expenses - ${ABBR}`, from: CASH_ACCOUNT, title: 'Seed JE 04 - Salaries July' },
    { rem: 'SEED-DEMO-JE-05', date: '2026-08-03', amt: 7800, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 05 - Marketing Spend' },
    { rem: 'SEED-DEMO-JE-06', date: '2026-08-07', amt: 3200, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 06 - Business Travel' },
    { rem: 'SEED-DEMO-JE-07', date: '2026-08-12', amt: 5600, to: `Miscellaneous Expenses - ${ABBR}`, from: CASH_ACCOUNT, title: 'Seed JE 07 - Maintenance' },
    { rem: 'SEED-DEMO-JE-08', date: '2026-08-18', amt: 14500, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 08 - Training Seminars' },
    { rem: 'SEED-DEMO-JE-09', date: '2026-08-24', amt: 9800, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 09 - Legal Fees' },
    { rem: 'SEED-DEMO-JE-10', date: '2026-08-31', amt: 1500, to: RETURN_ACCOUNT, from: CASH_ACCOUNT, title: 'Seed JE 10 - Bank Charges' },
  ]
  for (const j of jeUse) {
    const found = await findOne('Journal Entry', [['user_remark', '=', j.rem]])
    if (found) { bump('Journal Entry', 'skipped'); continue }
    const res = await insertDoc('Journal Entry', {
      voucher_type: voucherType,
      company: COMPANY,
      posting_date: j.date,
      title: j.title,
      user_remark: j.rem,
      remark: j.title,
      accounts: [
        { doctype: 'Journal Entry Account', account: j.to, debit_in_account_currency: j.amt, cost_center: COST_CENTER, against_account: j.from },
        { doctype: 'Journal Entry Account', account: j.from, credit_in_account_currency: j.amt, cost_center: COST_CENTER, against_account: j.to },
      ],
    })
    if (!res.ok) {
      bump('Journal Entry', 'failed')
      issues.push(`[Journal Entry] ${j.rem} — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Journal Entry', 'created')
    const sub = await submitByName('Journal Entry', res.name)
    if (!sub.ok) { issues.push(`[Journal Entry] ${j.rem} (${res.name}) — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  out('17/20 Payment Entries (5, submitted)')
  const PAYMENTS = [
    { x: 0, amt: 125000, date: '2026-07-05' },
    { x: 1, amt: 42000, date: '2026-07-20' },
    { x: 2, amt: 88000, date: '2026-08-04' },
    { x: 3, amt: 65000, date: '2026-08-16' },
    { x: 4, amt: 210000, date: '2026-08-29' },
  ]
  for (let i = 0; i < PAYMENTS.length; i++) {
    const p = PAYMENTS[i]
    const customer = CUSTOMERS[p.x]
    const ref = `SEED-PAY-0${i + 1}`
    const found = await findOne('Payment Entry', [['reference_no', '=', ref]])
    if (found) { bump('Payment Entry', 'skipped'); continue }
    const res = await insertDoc('Payment Entry', {
      payment_type: 'Receive',
      company: COMPANY,
      posting_date: p.date,
      party_type: 'Customer',
      party: customer,
      party_name: customer,
      paid_from: RECEIVABLE_ACCOUNT,
      paid_from_account_currency: CURRENCY,
      paid_to: bankAccount,
      paid_to_account_currency: CURRENCY,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      paid_amount: p.amt,
      received_amount: p.amt,
      base_paid_amount: p.amt,
      base_received_amount: p.amt,
      reference_no: ref,
      reference_date: p.date,
      cost_center: COST_CENTER,
      remarks: `FastFree demo payment #${i + 1} — ${customer}`,
    })
    if (!res.ok) {
      bump('Payment Entry', 'failed')
      issues.push(`[Payment Entry] ${ref} — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Payment Entry', 'created')
    const sub = await submitByName('Payment Entry', res.name)
    if (!sub.ok) { issues.push(`[Payment Entry] ${ref} (${res.name}) — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  out('18/20 Sales Invoices (6, submitted)')
  const SI_PLAN = [
    { c: 0, date: '2026-07-14', items: [['LAB-001', 2], ['MOU-001', 5]] },
    { c: 1, date: '2026-07-22', items: [['PRT-001', 1], ['PAP-001', 10], ['FLE-001', 15]] },
    { c: 2, date: '2026-07-28', items: [['SCR-001', 4], ['KEY-001', 6]] },
    { c: 3, date: '2026-08-06', items: [['SRV-001', 1], ['CAB-001', 200]] },
    { c: 4, date: '2026-08-13', items: [['DESK-001', 3], ['CHR-001', 3], ['HDP-001', 4]] },
    { c: 5, date: '2026-08-21', items: [['RTR-001', 8], ['WTR-001', 50], ['CFF-001', 20]] },
  ]
  for (let i = 0; i < SI_PLAN.length; i++) {
    const si = SI_PLAN[i]
    const customer = CUSTOMERS[si.c]
    const found = await findOne('Sales Invoice', [['customer', '=', customer], ['posting_date', '=', si.date]])
    if (found) { bump('Sales Invoice', 'skipped'); continue }
    const items = si.items.map(([code, qty]) => {
      const meta = ITEM(code)
      return {
        doctype: 'Sales Invoice Item',
        item_code: code,
        item_name: meta.name,
        item_group: 'Products',
        qty,
        uom: meta.uom,
        stock_uom: meta.uom,
        conversion_factor: 1,
        rate: meta.sell,
        amount: qty * meta.sell,
        income_account: INCOME_ACCOUNT,
        cost_center: COST_CENTER,
      }
    })
    const res = await insertDoc('Sales Invoice', {
      customer,
      customer_name: customer,
      company: COMPANY,
      posting_date: si.date,
      set_posting_time: 1,
      due_date: '2026-09-15',
      currency: CURRENCY,
      conversion_rate: 1,
      selling_price_list: 'Standard Selling',
      price_list_currency: CURRENCY,
      plc_conversion_rate: 1,
      debit_to: RECEIVABLE_ACCOUNT,
      cost_center: COST_CENTER,
      items,
    })
    if (!res.ok) {
      bump('Sales Invoice', 'failed')
      issues.push(`[Sales Invoice] SI-${i + 1} (${customer}) — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Sales Invoice', 'created')
    const sub = await submitByName('Sales Invoice', res.name)
    if (!sub.ok) { issues.push(`[Sales Invoice] ${customer} ${si.date} (${res.name}) — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  out('19/20 Quotations + Sales Orders + Delivery Notes (best effort)')
  const QTN_PLAN = [
    { c: 1, date: '2026-06-20', items: [['LAB-001', 10], ['MOU-001', 25]] },
    { c: 3, date: '2026-06-25', items: [['SRV-001', 2], ['RTR-001', 10]] },
    { c: 5, date: '2026-07-02', items: [['WTR-001', 200], ['CFF-001', 60]] },
    { c: 7, date: '2026-07-08', items: [['PRT-001', 3], ['PAP-001', 20]] },
  ]
  for (let i = 0; i < QTN_PLAN.length; i++) {
    const q = QTN_PLAN[i]
    const customer = CUSTOMERS[q.c]
    const found = await findOne('Quotation', [['party_name', '=', customer], ['transaction_date', '=', q.date]])
    if (found) { bump('Quotation', 'skipped'); continue }
    const items = q.items.map(([code, qty]) => {
      const meta = ITEM(code)
      return { doctype: 'Quotation Item', item_code: code, item_name: meta.name, item_group: 'Products', qty, uom: meta.uom, conversion_factor: 1, ordered_qty: 0, rate: meta.sell * 0.97, amount: Math.round(qty * meta.sell * 0.97) }
    })
    const res = await insertDoc('Quotation', {
      quotation_to: 'Customer',
      party_name: customer,
      customer_name: customer,
      transaction_date: q.date,
      valid_till: '2026-09-30',
      order_type: 'Sales',
      company: COMPANY,
      currency: CURRENCY,
      conversion_rate: 1,
      selling_price_list: 'Standard Selling',
      price_list_currency: CURRENCY,
      plc_conversion_rate: 1,
      items,
    })
    if (!res.ok) {
      bump('Quotation', 'failed')
      issues.push(`[Quotation] QTN-${i + 1} (${customer}) — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Quotation', 'created')
    const sub = await submitByName('Quotation', res.name)
    if (!sub.ok) { issues.push(`[Quotation] ${res.name} — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  const SO_PLAN = [
    { c: 2, date: '2026-07-04', items: [['PRT-001', 2], ['SCR-001', 5]] },
    { c: 4, date: '2026-07-11', items: [['DESK-001', 6], ['CHR-001', 6]] },
    { c: 6, date: '2026-07-18', items: [['LAB-001', 5], ['HDP-001', 10]] },
    { c: 0, date: '2026-07-25', items: [['CAB-001', 500], ['RTR-001', 12]] },
  ]
  for (let i = 0; i < SO_PLAN.length; i++) {
    const q = SO_PLAN[i]
    const customer = CUSTOMERS[q.c]
    const found = await findOne('Sales Order', [['customer', '=', customer], ['transaction_date', '=', q.date]])
    if (found) { bump('Sales Order', 'skipped'); continue }
    const items = q.items.map(([code, qty]) => {
      const meta = ITEM(code)
      return { doctype: 'Sales Order Item', item_code: code, item_name: meta.name, item_group: 'Products', qty, uom: meta.uom, conversion_factor: 1, rate: meta.sell, amount: qty * meta.sell, warehouse: `Stores - ${ABBR}`, delivered_qty: 0 }
    })
    const res = await insertDoc('Sales Order', {
      customer,
      customer_name: customer,
      order_type: 'Sales',
      transaction_date: q.date,
      delivery_date: '2026-08-15',
      company: COMPANY,
      cost_center: COST_CENTER,
      currency: CURRENCY,
      conversion_rate: 1,
      selling_price_list: 'Standard Selling',
      price_list_currency: CURRENCY,
      plc_conversion_rate: 1,
      items,
    })
    if (!res.ok) {
      bump('Sales Order', 'failed')
      issues.push(`[Sales Order] SO-${i + 1} (${customer}) — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Sales Order', 'created')
    const sub = await submitByName('Sales Order', res.name)
    if (!sub.ok) { issues.push(`[Sales Order] ${res.name} — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  const DN_PLAN = [
    { c: 0, date: '2026-07-20', items: [['LAB-001', 1], ['MOU-001', 3]] },
    { c: 2, date: '2026-08-02', items: [['SCR-001', 2], ['KEY-001', 2]] },
    { c: 4, date: '2026-08-15', items: [['DESK-001', 1], ['CHR-001', 1]] },
  ]
  for (let i = 0; i < DN_PLAN.length; i++) {
    const q = DN_PLAN[i]
    const customer = CUSTOMERS[q.c]
    const found = await findOne('Delivery Note', [['customer', '=', customer], ['posting_date', '=', q.date]])
    if (found) { bump('Delivery Note', 'skipped'); continue }
    const items = q.items.map(([code, qty]) => {
      const meta = ITEM(code)
      return { doctype: 'Delivery Note Item', item_code: code, item_name: meta.name, item_group: 'Products', qty, uom: meta.uom, stock_uom: meta.uom, conversion_factor: 1, rate: meta.sell, amount: qty * meta.sell, warehouse: `Stores - ${ABBR}`, expense_account: EXPENSE_ACCOUNT }
    })
    const res = await insertDoc('Delivery Note', {
      customer,
      customer_name: customer,
      company: COMPANY,
      posting_date: q.date,
      set_posting_time: 1,
      posting_time: '10:30:00',
      currency: CURRENCY,
      conversion_rate: 1,
      selling_price_list: 'Standard Selling',
      price_list_currency: CURRENCY,
      plc_conversion_rate: 1,
      set_warehouse: `Stores - ${ABBR}`,
      items,
    })
    if (!res.ok) {
      bump('Delivery Note', 'failed')
      issues.push(`[Delivery Note] DN-${i + 1} (${customer}) — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Delivery Note', 'created')
    const sub = await submitByName('Delivery Note', res.name)
    if (!sub.ok) { issues.push(`[Delivery Note] ${res.name} — submit: ${sub.error}`); line(`       !! submit failed (left draft): ${sub.error}`, '') }
  }

  out('20/20 Purchase Orders (5) + Receipts (3) + Invoices (3) + Stock Entries')
  const PO_PLAN = [
    { s: 0, date: '2026-06-15', items: [['LAB-001', 15], ['MOU-001', 100]] },
    { s: 1, date: '2026-06-22', items: [['SCR-001', 20], ['KEY-001', 40]] },
    { s: 2, date: '2026-07-05', items: [['CAB-001', 1000], ['RTR-001', 25]] },
    { s: 3, date: '2026-07-15', items: [['DESK-001', 15], ['CHR-001', 25]] },
    { s: 4, date: '2026-07-28', items: [['SRV-001', 2], ['PRT-001', 5], ['PAP-001', 50]] },
  ]
  for (let i = 0; i < PO_PLAN.length; i++) {
    const q = PO_PLAN[i]
    const supplier = SUPPLIERS[q.s]
    const found = await findOne('Purchase Order', [['supplier', '=', supplier], ['transaction_date', '=', q.date]])
    if (found) { bump('Purchase Order', 'skipped'); continue }
    const items = q.items.map(([code, qty]) => {
      const meta = ITEM(code)
      return { doctype: 'Purchase Order Item', item_code: code, item_name: meta.name, qty, uom: meta.uom, stock_uom: meta.uom, conversion_factor: 1, schedule_date: q.date, rate: meta.buy, amount: qty * meta.buy, warehouse: `Stores - ${ABBR}` }
    })
    const res = await insertDoc('Purchase Order', {
      supplier,
      supplier_name: supplier,
      transaction_date: q.date,
      schedule_date: q.date,
      company: COMPANY,
      cost_center: COST_CENTER,
      currency: CURRENCY,
      conversion_rate: 1,
      buying_price_list: 'Standard Buying',
      items,
    })
    if (!res.ok) {
      bump('Purchase Order', 'failed')
      issues.push(`[Purchase Order] PO-${i + 1} (${supplier}) — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Purchase Order', 'created')
    const sub = await submitByName('Purchase Order', res.name)
    if (!sub.ok) { issues.push(`[Purchase Order] ${res.name} — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  const PR_PLAN = [
    { s: 0, date: '2026-06-18', items: [['LAB-001', 3]] },
    { s: 1, date: '2026-06-25', items: [['SCR-001', 5]] },
    { s: 2, date: '2026-07-08', items: [['RTR-001', 10]] },
  ]
  for (let i = 0; i < PR_PLAN.length; i++) {
    const q = PR_PLAN[i]
    const supplier = SUPPLIERS[q.s]
    const found = await findOne('Purchase Receipt', [['supplier', '=', supplier], ['posting_date', '=', q.date]])
    if (found) { bump('Purchase Receipt', 'skipped'); continue }
    const items = q.items.map(([code, qty]) => {
      const meta = ITEM(code)
      return { doctype: 'Purchase Receipt Item', item_code: code, item_name: meta.name, qty, received_qty: qty, uom: meta.uom, stock_uom: meta.uom, conversion_factor: 1, rate: meta.buy, base_rate: meta.buy, amount: qty * meta.buy, warehouse: `Stores - ${ABBR}`, expense_account: EXPENSE_ACCOUNT }
    })
    const res = await insertDoc('Purchase Receipt', {
      supplier,
      supplier_name: supplier,
      company: COMPANY,
      posting_date: q.date,
      set_posting_time: 1,
      posting_time: '09:00:00',
      currency: CURRENCY,
      conversion_rate: 1,
      cost_center: COST_CENTER,
      items,
    })
    if (!res.ok) {
      bump('Purchase Receipt', 'failed')
      issues.push(`[Purchase Receipt] PR-${i + 1} (${supplier}) — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Purchase Receipt', 'created')
    const sub = await submitByName('Purchase Receipt', res.name)
    if (!sub.ok) { issues.push(`[Purchase Receipt] ${res.name} — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  const PI_PLAN = [
    { s: 0, date: '2026-06-18', items: [['LAB-001', 3], ['MOU-001', 5]] },
    { s: 3, date: '2026-07-18', items: [['DESK-001', 2]] },
    { s: 5, date: '2026-08-10', items: [['RTR-001', 6]] },
  ]
  for (let i = 0; i < PI_PLAN.length; i++) {
    const q = PI_PLAN[i]
    const supplier = SUPPLIERS[q.s]
    const found = await findOne('Purchase Invoice', [['supplier', '=', supplier], ['posting_date', '=', q.date]])
    if (found) { bump('Purchase Invoice', 'skipped'); continue }
    const items = q.items.map(([code, qty]) => {
      const meta = ITEM(code)
      return { doctype: 'Purchase Invoice Item', item_code: code, item_name: meta.name, qty, uom: meta.uom, stock_uom: meta.uom, conversion_factor: 1, stock_qty: qty, rate: meta.buy, amount: qty * meta.buy, warehouse: `Stores - ${ABBR}`, expense_account: EXPENSE_ACCOUNT }
    })
    const res = await insertDoc('Purchase Invoice', {
      supplier,
      supplier_name: supplier,
      company: COMPANY,
      posting_date: q.date,
      set_posting_time: 1,
      due_date: '2026-09-15',
      currency: CURRENCY,
      conversion_rate: 1,
      credit_to: PAYABLE_ACCOUNT,
      cost_center: COST_CENTER,
      items,
    })
    if (!res.ok) {
      bump('Purchase Invoice', 'failed')
      issues.push(`[Purchase Invoice] PINV-${i + 1} (${supplier}) — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Purchase Invoice', 'created')
    const sub = await submitByName('Purchase Invoice', res.name)
    if (!sub.ok) { issues.push(`[Purchase Invoice] ${res.name} — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  const STE_PLAN = [
    { rem: 'SEED-DEMO-STOCK-01', date: '2026-06-01', type: 'Material Receipt', kind: 't', items: [['LAB-001', 20], ['SCR-001', 30], ['MOU-001', 100], ['KEY-001', 60], ['PRT-001', 12], ['PAP-001', 80], ['WTR-001', 200]] },
    { rem: 'SEED-DEMO-STOCK-02', date: '2026-06-20', type: 'Material Receipt', kind: 't', items: [['DESK-001', 20], ['CHR-001', 30], ['CFF-001', 60], ['RTR-001', 30], ['CAB-001', 1000]] },
    { rem: 'SEED-DEMO-STOCK-03', date: '2026-07-10', type: 'Material Issue', kind: 's', items: [['MOU-001', 5], ['KEY-001', 5]] },
    { rem: 'SEED-DEMO-STOCK-04', date: '2026-08-05', type: 'Material Issue', kind: 's', items: [['PAP-001', 10], ['FLE-001', 20]] },
    { rem: 'SEED-DEMO-STOCK-05', date: '2026-08-20', type: 'Material Transfer', kind: 'both', items: [['LAB-001', 5], ['SCR-001', 5]] },
  ]
  for (let i = 0; i < STE_PLAN.length; i++) {
    const st = STE_PLAN[i]
    const found = await findOne('Stock Entry', [['remarks', '=', st.rem]])
    if (found) { bump('Stock Entry', 'skipped'); continue }
    const items = st.items.map(([code, qty]) => {
      const meta = ITEM(code)
      const row = {
        doctype: 'Stock Entry Detail',
        item_code: code,
        item_name: meta.name,
        qty,
        uom: meta.uom,
        stock_uom: meta.uom,
        conversion_factor: 1,
        basic_rate: meta.buy,
        set_basic_rate_manually: 1,
        cost_center: COST_CENTER,
        expense_account: EXPENSE_ACCOUNT,
      }
      if (st.kind === 't') row.t_warehouse = `Stores - ${ABBR}`
      else if (st.kind === 's') row.s_warehouse = `Stores - ${ABBR}`
      else {
        row.s_warehouse = `Stores - ${ABBR}`
        row.t_warehouse = `Finished Goods - ${ABBR}`
      }
      return row
    })
    const res = await insertDoc('Stock Entry', {
      stock_entry_type: st.type,
      purpose: st.type,
      company: COMPANY,
      posting_date: st.date,
      set_posting_time: 1,
      remarks: st.rem,
      cost_center: COST_CENTER,
      items,
    })
    if (!res.ok) {
      bump('Stock Entry', 'failed')
      issues.push(`[Stock Entry] ${st.rem} — ${res.error}`)
      line(`       !! failed: ${res.error}`, '')
      continue
    }
    bump('Stock Entry', 'created')
    const sub = await submitByName('Stock Entry', res.name)
    if (!sub.ok) { issues.push(`[Stock Entry] ${st.rem} (${res.name}) — submit: ${sub.error}`); line(`       !! submit failed: ${sub.error}`, '') }
  }

  // ---------- Final report ----------
  out('FINAL PER-DOCTYPE COUNTS')
  const FINAL = [
    'Territory', 'Customer Group', 'Company', 'Fiscal Year', 'UOM',
    'Item Group', 'Item', 'Warehouse', 'Customer', 'Supplier',
    'Employee', 'Department', 'Designation', 'Holiday List',
    'Lead', 'Opportunity', 'Contact', 'Campaign', 'Lead Source',
    'Account', 'Cost Center', 'Journal Entry', 'Payment Entry',
    'Sales Invoice', 'Quotation', 'Sales Order', 'Delivery Note',
    'Purchase Order', 'Purchase Receipt', 'Purchase Invoice', 'Stock Entry',
  ]
  for (const dt of FINAL) {
    await reportDoctype(dt)
  }

  console.log('\n== ISSUES TOLERATED')
  if (issues.length === 0) console.log('   (none)')
  else for (const i of issues) console.log(`   - ${i}`)

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\nTime taken: ${elapsed}s`)
  console.log('Seeding complete.')
}

main().catch((err) => {
  console.error('[FATAL]', err && err.message ? err.message : err)
  process.exit(1)
})