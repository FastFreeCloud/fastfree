# AGENTS.md — FastFree Inventory

## ملاحظات سريعة

```bash
# TypeCheck
cd apps/fastfree_ledger && npx vue-tsc --noEmit

# Lint Check
cd apps/fastfree_ledger && npm run lint:check
```

## وصف الحزمة

إدارة المخزون — المنتجات، الفئات، المستودعات، الموردون، قيود المخزون، التقارير.

- **البكج:** `fastfree-inventory`
- **الإصدار:** `0.0.1`
- **النوع:** ESM
- **النقطة الرئيسية:** `src/index.ts`
- **التصديرات:** `.`, `./services`, `./stores`, `./types`

### التبعيات

| التبعية | النوع | الإصدار |
|---------|-------|---------|
| dexie | dependency | ^4.4.4 |
| fastfree-auth | dependency | workspace:* |
| quasar-app-extension-fastfree-lowcode | dependency | workspace:* |
| pinia | peer/dev | ^4.0.0 / ^2.0.0 |
| quasar | peer/dev | ^2.23.1 / ^2.0.0 |
| vue | peer/dev | ^3.5.22 / ^3.4.0 |
| vue-tsc | dev | ^3.3.3 |
| typescript | dev | ^6.0.0 |
| oxfmt | dev | ^0.x |
| oxlint | dev | ^1.x |

## هيكل الملفات

```
packages/fastfree_inventory/
├── AGENTS.md
├── package.json
├── README.md
├── .editorconfig
├── .gitignore
├── .vscode/
├── ae/
├── oxfmt.config.ts
├── oxlint.config.ts
├── playground/
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── src/
    ├── index.ts                        # Entry point — كلExports
    ├── init.ts                         # التهيئة + الترجمات + تسجيل الشاشات
    ├── types/
    │   └── index.ts                    # TypeScript Types
    ├── services/
    │   ├── index.ts                    # Barrel export للخدمات
    │   ├── product.service.ts          # CRUD للمنتجات
    │   ├── category.service.ts         # CRUD للفئات
    │   ├── warehouse.service.ts        # CRUD للمستودعات
    │   ├── supplier.service.ts         # CRUD للموردين
    │   ├── stock.service.ts            # CRUD لقيود المخزون + ترحيل/إلغاء
    │   ├── stockLedger.service.ts      # دفتر المخزون + أرصدة
    │   ├── serial.service.ts           # أرقام التسلسل
    │   ├── batch.service.ts            # الدفعات
    │   └── report.service.ts           # تقارير المخزون
    ├── stores/
    │   └── useInventoryStore.ts        # Pinia Store
    └── screens/
        ├── index.ts                    # Barrel export للشاشات
        ├── InventoryDashboard.vue      # لوحة المعلومات
        ├── ProductList.vue             # قائمة المنتجات
        ├── ProductForm.vue             # نموذج إضافة منتج
        ├── CategoryList.vue            # إدارة الفئات
        ├── WarehouseList.vue           # إدارة المستودعات
        ├── SupplierList.vue            # إدارة الموردين
        ├── StockEntryList.vue          # قائمة قيود المخزون
        └── StockEntryForm.vue          # نموذج إنشاء قيد مخزون
```

## الأنواع (Types)

### `src/types/index.ts`

| النوع | الوصف |
|-------|-------|
| `UnitOfMeasure` | Type — `'Piece' \| 'Kg' \| 'Gram' \| 'Liter' \| 'Meter' \| 'Box' \| 'Pack' \| 'Dozen'` |
| `ProductStatus` | Type — `'Active' \| 'Inactive' \| 'Discontinued'` |
| `Product` | Interface — `name`, `productName`, `productCode`, `category?`, `unitOfMeasure`, `status`, `buyingPrice`, `sellingPrice`, `openingStock`, `currentStock`, `minimumStock`, `maximumStock`, `warehouse?`, `supplier?`, `description?`, `barcode?`, `taxRate`, `disabled` |
| `Category` | Interface — `name`, `categoryName`, `categoryCode`, `parent?`, `description?`, `disabled` |
| `Warehouse` | Interface — `name`, `warehouseName`, `warehouseCode`, `address?`, `phone?`, `manager?`, `company?`, `disabled` |
| `StockEntryType` | Type — `'Receipt' \| 'Issue' \| 'Transfer' \| 'Adjustment'` |
| `StockEntryStatus` | Type — `'Draft' \| 'Submitted' \| 'Cancelled'` |
| `StockEntryItem` | Interface — `product`, `quantity`, `rate`, `amount`, `sourceWarehouse?`, `targetWarehouse?` |
| `StockEntry` | Interface — `name`, `entryType`, `postingDate`, `items`, `status`, `company?`, `remarks?`, `totalAmount` |
| `Supplier` | Interface — `name`, `supplierName`, `supplierCode`, `email?`, `phone?`, `address?`, `contactPerson?`, `gstNumber?`, `disabled` |
| `StockBalance` | Interface — `product`, `productName`, `warehouse`, `warehouseName`, `quantity`, `valuationRate`, `stockValue` |
| `ApiResponse<T>` | Interface — `success`, `data?`, `error?` `{ code, message, details? }` |

### `src/services/stockLedger.service.ts`

| النوع | الوصف |
|-------|-------|
| `StockLedgerEntry` | Interface — `name`, `itemCode`, `itemName`, `warehouse`, `postingDate`, `postingTime`, `voucherType`, `voucherNo`, `actualQty`, `qtyAfterTransaction`, `stockValue`, `stockValueAfterTransaction`, `batchNo?`, `serialNo?` |

### `src/services/serial.service.ts`

| النوع | الوصف |
|-------|-------|
| `SerialNo` | Interface — `name`, `serialNo`, `itemCode`, `itemName`, `warehouse?`, `status` (`'Available' \| 'Issued' \| 'Transferred' \| 'Expired' \| 'Scrapped'`), `purchaseDate?`, `deliveryDate?`, `batchNo?` |

### `src/services/batch.service.ts`

| النوع | الوصف |
|-------|-------|
| `Batch` | Interface — `name`, `batchId`, `itemCode`, `itemName`, `manufacturingDate?`, `expiryDate?`, `batchQty`, `stockUom` |

### `src/services/report.service.ts`

| النوع | الوصف |
|-------|-------|
| `StockBalanceReport` | Interface — `itemCode`, `itemName`, `warehouse`, `qty`, `valuationRate`, `stockValue` |
| `StockAgeReport` | Interface — `itemCode`, `itemName`, `warehouse`, `qty`, `ageInDays`, `stockValue` |

## الخدمات (Services)

### `product.service.ts` — المنتجات

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getProducts(filters?)` | `(filters?: Record<string, unknown>) => Promise<ApiResponse<Product[]>>` | جلب المنتجات — limit 500 |
| `getProduct(name)` | `(name: string) => Promise<ApiResponse<Product>>` | جلب منتج بالاسم |
| `createProduct(data)` | `(data: Partial<Product>) => Promise<ApiResponse<Product>>` | إنشاء منتج |
| `updateProduct(name, data)` | `(name: string, data: Partial<Product>) => Promise<ApiResponse<Product>>` | تعديل منتج |
| `deleteProduct(name)` | `(name: string) => Promise<ApiResponse<void>>` | حذف منتج |

**Doctype:** `Product`

### `category.service.ts` — الفئات

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getCategories(filters?)` | `(filters?: Record<string, unknown>) => Promise<ApiResponse<Category[]>>` | جلب الفئات — limit 500 |
| `getCategory(name)` | `(name: string) => Promise<ApiResponse<Category>>` | جلب فئة بالاسم |
| `createCategory(data)` | `(data: Partial<Category>) => Promise<ApiResponse<Category>>` | إنشاء فئة |
| `updateCategory(name, data)` | `(name: string, data: Partial<Category>) => Promise<ApiResponse<Category>>` | تعديل فئة |
| `deleteCategory(name)` | `(name: string) => Promise<ApiResponse<void>>` | حذف فئة |

**Doctype:** `Product Category`

### `warehouse.service.ts` — المستودعات

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getWarehouses(filters?)` | `(filters?: Record<string, unknown>) => Promise<ApiResponse<Warehouse[]>>` | جلب المستودعات — limit 500 |
| `getWarehouse(name)` | `(name: string) => Promise<ApiResponse<Warehouse>>` | جلب مستودع بالاسم |
| `createWarehouse(data)` | `(data: Partial<Warehouse>) => Promise<ApiResponse<Warehouse>>` | إنشاء مستودع |
| `updateWarehouse(name, data)` | `(name: string, data: Partial<Warehouse>) => Promise<ApiResponse<Warehouse>>` | تعديل مستودع |
| `deleteWarehouse(name)` | `(name: string) => Promise<ApiResponse<void>>` | حذف مستودع |

**Doctype:** `Warehouse`

### `supplier.service.ts` — الموردون

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getSuppliers(filters?)` | `(filters?: Record<string, unknown>) => Promise<ApiResponse<Supplier[]>>` | جلب الموردين — limit 500 |
| `getSupplier(name)` | `(name: string) => Promise<ApiResponse<Supplier>>` | جلب مورد بالاسم |
| `createSupplier(data)` | `(data: Partial<Supplier>) => Promise<ApiResponse<Supplier>>` | إنشاء مورد |
| `updateSupplier(name, data)` | `(name: string, data: Partial<Supplier>) => Promise<ApiResponse<Supplier>>` | تعديل مورد |
| `deleteSupplier(name)` | `(name: string) => Promise<ApiResponse<void>>` | حذف مورد |

**Doctype:** `Supplier`

### `stock.service.ts` — قيود المخزون

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getStockEntries(filters?)` | `(filters?: Record<string, unknown>) => Promise<ApiResponse<StockEntry[]>>` | جلب قيود المخزون — limit 500 |
| `getStockEntry(name)` | `(name: string) => Promise<ApiResponse<StockEntry>>` | جلب قيد بالاسم |
| `createStockEntry(data)` | `(data: Partial<StockEntry>) => Promise<ApiResponse<StockEntry>>` | إنشاء قيد |
| `updateStockEntry(name, data)` | `(name: string, data: Partial<StockEntry>) => Promise<ApiResponse<StockEntry>>` | تعديل قيد |
| `deleteStockEntry(name)` | `(name: string) => Promise<ApiResponse<void>>` | حذف قيد |
| `submitStockEntry(name)` | `(name: string) => Promise<ApiResponse<StockEntry>>` | ترحيل قيد (status → Submitted) |
| `cancelStockEntry(name)` | `(name: string) => Promise<ApiResponse<StockEntry>>` | إلغاء قيد (status → Cancelled) |
| `getStockBalance(warehouse?, product?)` | `(warehouse?: string, product?: string) => Promise<ApiResponse<StockBalance[]>>` | جلب أرصدة المخزون |

**Doctype:** `Stock Entry`, `Stock Balance`

### `stockLedger.service.ts` — دفتر المخزون

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getStockLedgerEntries(itemCode, warehouse?)` | `(itemCode: string, warehouse?: string) => Promise<ApiResponse<StockLedgerEntry[]>>` | جلب حركات المخزون — orderBy `posting_date desc` |
| `getStockBalance(itemCode, warehouse)` | `(itemCode: string, warehouse: string) => Promise<ApiResponse<{ qty: number; value: number }>>` | جلب أرصدة صنف في مستودع — آخر حركة فقط |

**Doctype:** `Stock Ledger Entry`

### `serial.service.ts` — أرقام التسلسل

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getSerialNumbers(itemCode, status?)` | `(itemCode: string, status?: string) => Promise<ApiResponse<SerialNo[]>>` | جلب أرقام التسلسل لصنف |
| `getSerialNumber(name)` | `(name: string) => Promise<ApiResponse<SerialNo>>` | جلب رقم تسلسل بالاسم |
| `createSerialNumber(data)` | `(data: Partial<SerialNo>) => Promise<ApiResponse<SerialNo>>` | إنشاء رقم تسلسل |
| `updateSerialNumber(name, data)` | `(name: string, data: Partial<SerialNo>) => Promise<ApiResponse<SerialNo>>` | تعديل رقم تسلسل |

**Doctype:** `Serial No`

### `batch.service.ts` — الدفعات

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getBatches(itemCode)` | `(itemCode: string) => Promise<ApiResponse<Batch[]>>` | جلب الدفعات لصنف |
| `getBatch(name)` | `(name: string) => Promise<ApiResponse<Batch>>` | جلب دفعة بالاسم |
| `createBatch(data)` | `(data: Partial<Batch>) => Promise<ApiResponse<Batch>>` | إنشاء دفعة |
| `updateBatch(name, data)` | `(name: string, data: Partial<Batch>) => Promise<ApiResponse<Batch>>` | تعديل دفعة |

**Doctype:** `Batch`

### `report.service.ts` — التقارير

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `getStockBalanceReport(warehouse?)` | `(warehouse?: string) => Promise<ApiResponse<StockBalanceReport[]>>` | تقرير أرصدة المخزون |
| `getStockAgeReport(warehouse?)` | `(warehouse?: string) => Promise<ApiResponse<StockAgeReport[]>>` | تقرير عمر المخزون — Doctype `Stock Ageing Report` |
| `getWarehouseSummary()` | `() => Promise<ApiResponse<{ warehouse: string; totalItems: number; totalValue: number }[]>>` | ملخص المستودعات — مجموع من Stock Balance |

**Doctypes:** `Stock Balance`, `Stock Ageing Report`

## الشاشات (Screens)

### `InventoryDashboard.vue` — لوحة المعلومات

- **الوصف:** بطاقات إحصائية + جدول آخر القيود
- **البيانات:** `products`, `warehouses`, `stockEntries` من Store
- **المؤشرات:** إجمالي المنتجات، تنبيهات انخفاض المخزون، المستودعات، قيود المخزون
- **الحسابات:** `lowStockCount` (filtered products where currentStock ≤ minimumStock), `recentEntries` (آخر 5 قيود)
- **التحميل:** `Promise.all` لـ `fetchProducts`, `fetchStockEntries`, `fetchWarehouses`
- **الأعمدة:** `name`, `entryType`, `postingDate`, `totalAmount`, `status`

### `ProductList.vue` — قائمة المنتجات

- **الوصف:** جدول المنتجات + عرض تفاصيل + حذف مع تأكيد
- **الأعمدة:** `productCode`, `productName`, `category`, `currentStock`, `unitOfMeasure`, `sellingPrice`, `status`, `actions`
- **الإجراءات:** `viewProduct` (dialog تفاصيل), `confirmDelete` → `handleDelete` مع try/catch/finally
- **الـ Form:** `ProductForm` كـ dialog منفصل
- **الأيقونات:** `mdi-eye` (عرض), `mdi-delete` (حذف), `mdi-plus` (إضافة), `refresh`
- **التنبيهات:** `$q.notify` عند الحذف (positive) أو الخطأ (negative)

### `ProductForm.vue` — نموذج إضافة منتج

- **الوصف:** dialog لإنشاء منتج جديد
- **الحقول:** `productName`*, `productCode`*, `barcode`, `category` (select), `unitOfMeasure`* (select), `buyingPrice`, `sellingPrice`, `minimumStock`, `maximumStock`, `taxRate`, `warehouse` (select), `supplier` (select), `status` (select), `description` (textarea)
- **الخيارات:** `uomOptions` (8 وحدات), `statusOptions` (3 حالات), `categoryOptions`, `warehouseOptions`, `supplierOptions` — كلها من Store
- **التحقق:** `required` على `productName`, `productCode`, `unitOfMeasure`
- **الإرسال:** `createProduct` مع `@submit.prevent`
- **النتيجة:** `result.success` → `emit('saved')` + `close()` | `!result.success` → `$q.notify` بـ error

### `CategoryList.vue` — إدارة الفئات

- **الوصف:** جدول الفئات + نموذج inline للإضافة/التعديل + حذف مع تأكيد
- **الأعمدة:** `categoryCode`, `categoryName`, `parent`, `description`, `actions`
- **الإجراءات:** `openAdd`, `editCategory`, `confirmDelete` → `handleDelete` مع try/catch
- **النموذج:** `categoryName*`, `categoryCode*`, `parent`, `description` — `@submit.prevent="save"`
- **الحفظ:** `createCategory` أو `updateCategory` حسب `editingCategory`
- **التحقق:** `required` على `categoryName`, `categoryCode`
- **النتيجة:** `result.success` → `fetchCategories()` + `closeForm()` | `!result.success` → `$q.notify` بـ error

### `WarehouseList.vue` — إدارة المستودعات

- **الوصف:** جدول المستودعات + نموذج inline للإضافة/التعديل + حذف مع تأكيد
- **الأعمدة:** `warehouseCode`, `warehouseName`, `address`, `phone`, `manager`, `actions`
- **الإجراءات:** `openAdd`, `editWarehouse`, `confirmDelete` → `handleDelete` مع try/catch
- **النموذج:** `warehouseName*`, `warehouseCode*`, `address`, `phone`, `manager` — `@submit.prevent="save"`
- **الحفظ:** `createWarehouse` أو `updateWarehouse` حسب `editingWarehouse`
- **التحقق:** `required` على `warehouseName`, `warehouseCode`
- **النتيجة:** `result.success` → `fetchWarehouses()` + `closeForm()` | `!result.success` → `$q.notify` بـ error

### `SupplierList.vue` — إدارة الموردين

- **الوصف:** جدول الموردين + نموذج inline للإضافة/التعديل + حذف مع تأكيد
- **الأعمدة:** `supplierCode`, `supplierName`, `contactPerson`, `email`, `phone`, `actions`
- **الإجراءات:** `openAdd`, `editSupplier`, `confirmDelete` → `handleDelete` مع try/catch
- **النموذج:** `supplierName*`, `supplierCode*`, `contactPerson`, `email`, `phone`, `address`, `gstNumber` — `@submit.prevent="save"`
- **الحفظ:** `createSupplier` أو `updateSupplier` حسب `editingSupplier`
- **التحقق:** `required` على `supplierName`, `supplierCode`
- **النتيجة:** `result.success` → `fetchSuppliers()` + `closeForm()` | `!result.success` → `$q.notify` بـ error

### `StockEntryList.vue` — قائمة قيود المخزون

- **الوصف:** جدول القيود + عرض تفاصيل + ترحيل/إلغاء مع تأكيد
- **الأعمدة:** `name`, `entryType`, `postingDate`, `totalAmount`, `status`, `actions`
- **أعمدة العناصر:** `product`, `quantity`, `rate`, `amount`, `sourceWarehouse`, `targetWarehouse`
- **الإجراءات:** `viewEntry` (dialog تفاصيل), `handleSubmit` (Status → Draft), `handleCancel` (Status → Submitted)
- **الترجمة:** `translateStatus(status)` — يحول `Draft` → `inventory.draft`, `Submitted` → `inventory.submitted`, `Cancelled` → `inventory.cancelled`
- **اللون:** `Draft` → grey, `Submitted` → positive, `Cancelled` → negative
- **ال确认:** `confirmActionVisible` مع `actionType` (submit/cancel)
- **التنفيذ:** `executeAction` مع try/catch/finally — `submitStockEntry` أو `cancelStockEntry`
- **الـ Form:** `StockEntryForm` كـ dialog منفصل

### `StockEntryForm.vue` — نموذج إنشاء قيد مخزون

- **الوصف:** dialog لإنشاء قيد مخزون جديد مع عناصر ديناميكية
- **الحقول:** `entryType`* (select), `postingDate`* (date), `remarks`, `sourceWarehouse` (select — ظاهر عند Transfer), `targetWarehouse` (select — ظاهر عند Transfer)
- **العناصر:** `product*` (select), `quantity*` (number ≥ 1), `rate*` (number ≥ 0) — مع زر حذف لكل عنصر
- **الإجراءات:** `addItem`, `removeItem(index)`
- **الخيارات:** `entryTypeOptions` (Receipt/Issue/Transfer/Adjustment), `productOptions` (من Store), `warehouseOptions` (من Store)
- **النوع:** `Partial<StockEntry>` (تم التحسين من `Record<string, unknown>`)
- **الإرسال:** `createStockEntry` مع `@submit.prevent="save"`
- **الحساب:** `amount = quantity × rate`, `totalAmount = sum of all items`
- **النتيجة:** `result.success` → `emit('saved')` + `close()` | `!result.success` → `$q.notify` بـ error

## الـ Store

### `useInventoryStore.ts` — Pinia Store

**المعرف:** `fastfree-inventory`

#### State

| المتغير | النوع | الوصف |
|---------|-------|-------|
| `products` | `ref<Product[]>` | قائمة المنتجات |
| `categories` | `ref<Category[]>` | قائمة الفئات |
| `warehouses` | `ref<Warehouse[]>` | قائمة المستودعات |
| `stockEntries` | `ref<StockEntry[]>` | قائمة قيود المخزون |
| `suppliers` | `ref<Supplier[]>` | قائمة الموردين |
| `stockBalances` | `ref<StockBalance[]>` | أرصدة المخزون |
| `loading` | `ref<boolean>` | حالة التحميل |
| `error` | `ref<string \| null>` | رسالة الخطأ |

#### Computed

| الخصائص | النوع | الوصف |
|---------|-------|-------|
| `activeProducts` | `computed(() => Product[])` | المنتجات النشطة (status === 'Active') |
| `lowStockProducts` | `computed(() => Product[])` | المنتجات ذات المخزون المنخفض (currentStock ≤ minimumStock) |
| `draftEntries` | `computed(() => StockEntry[])` | القيود المسودة (status === 'Draft') |
| `totalStockValue` | `computed(() => number)` | إجمالي قيمة المخزون (currentStock × sellingPrice) |

#### Actions

| الدالة | النوع | الوصف |
|--------|-------|-------|
| `fetchProducts(filters?)` | `(filters?) => Promise<void>` | جلب المنتجات مع cache |
| `fetchCategories(filters?)` | `(filters?) => Promise<void>` | جلب الفئات مع cache |
| `fetchWarehouses(filters?)` | `(filters?) => Promise<void>` | جلب المستودعات مع cache |
| `fetchStockEntries(filters?)` | `(filters?) => Promise<void>` | جلب قيود المخزون مع cache |
| `fetchSuppliers(filters?)` | `(filters?) => Promise<void>` | جلب الموردين مع cache |
| `fetchStockBalances(warehouse?, product?)` | `(warehouse?, product?) => Promise<void>` | جلب أرصدة المخزون مع cache |
| `$reset()` | `() => void` | إعادة تعيين كل State |

**الـ Cache:** يستخدم `getCached` / `setCached` من `fastfree-auth` — cache key بناءً على الـ filters

## الترجمات

- **80 مفتاح** في `INVENTORY_MESSAGES_EN` / `INVENTORY_MESSAGES_AR`
- **Namespace:** `inventory`
- **المسجل:** `registerMessages('inventory', EN, AR)` في `init.ts`

### مفاتيح الترجمة

| المجموعة | المفاتيح |
|----------|---------|
| **Dashboard** | `dashboard`, `totalProducts`, `lowStock`, `totalWarehouses`, `totalEntries`, `recentEntries` |
| **Product** | `products`, `addProduct`, `productName`, `productCode`, `barcode`, `category`, `unitOfMeasure`, `buyingPrice`, `sellingPrice`, `currentStock`, `minimumStock`, `maximumStock`, `warehouse`, `supplier`, `taxRate`, `description`, `status`, `active`, `inactive`, `discontinued` |
| **UOM** | `piece`, `kg`, `gram`, `liter`, `meter`, `box`, `pack`, `dozen` |
| **Category** | `categories`, `addCategory`, `editCategory`, `categoryName`, `categoryCode`, `parent` |
| **Warehouse** | `warehouses`, `addWarehouse`, `editWarehouse`, `warehouseName`, `warehouseCode`, `address`, `phone`, `manager` |
| **Stock Entry** | `stockEntries`, `addEntry`, `entryNumber`, `entryType`, `postingDate`, `receipt`, `issue`, `transfer`, `adjustment`, `totalAmount`, `product`, `quantity`, `rate`, `amount`, `sourceWarehouse`, `targetWarehouse`, `addItem`, `submitEntryConfirm`, `cancelEntryConfirm`, `draft`, `submitted`, `cancelled` |
| **Supplier** | `suppliers`, `addSupplier`, `editSupplier`, `supplierName`, `supplierCode`, `email`, `contactPerson`, `gstNumber` |
| **General** | `remarks`, `items` |

## التبعيات

| التبعية | البكج | الاستخدام |
|---------|-------|----------|
| `fastfree-auth` | `getDoc`, `getDocList`, `createDoc`, `updateDoc`, `deleteDoc`, `getCached`, `setCached` | كل الخدمات + الـ Cache |
| `quasar-app-extension-fastfree-lowcode` | `registerScreen`, `registerGroup`, `registerGroupPage`, `registerMessages`, `useLcI18n` | التهيئة + الترجمة |
| `pinia` | `defineStore` | الـ Store |
| `quasar` | `useQuasar`, `QTable`, `QDialog`, etc. | الـ UI |
| `vue` | `ref`, `reactive`, `computed`, `onMounted` | Base |

## سجل التغييرات

### 2026-08-07 — إصلاحات شاملة

#### Form Submissions (4 فورمات)
- StockEntryForm — `@submit.prevent="save"` + buttons inside form
- CategoryList — `@submit.prevent="save"` + buttons inside form
- WarehouseList — `@submit.prevent="save"` + buttons inside form
- SupplierList — `@submit.prevent="save"` + buttons inside form

#### Save Success Checks (5 فورمات)
- ProductForm — else branch بعد result.success مع error notification
- CategoryList — capture result + check success + error notification
- WarehouseList — capture result + check success + error notification
- SupplierList — capture result + check success + error notification
- StockEntryForm — else branch بعد result.success مع error notification

#### Error Handling (3 handleDelete)
- CategoryList — try/catch في handleDelete
- WarehouseList — try/catch في handleDelete
- SupplierList — try/catch في handleDelete

#### Type Safety
- StockEntryForm — `Record<string, unknown>` → `Partial<StockEntry>`

### 2026-08-08 — إصلاحات الجودة

#### InventoryDashboard
- try/catch + loading + `Promise.all` لـ `fetchProducts`, `fetchStockEntries`, `fetchWarehouses`

#### ProductList
- try/catch/finally + `$q.notify` في `handleDelete`

#### StockEntryList
- try/catch/finally + `$q.notify` في `executeAction`
