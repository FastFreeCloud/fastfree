// ============================================================
// FastFree Inventory — Initialization
// ============================================================

import type { Component } from 'vue'

interface ScreenConfig {
  component: Component
  label: string
  icon: string
  groupId: string
}

let registerScreen: ((type: string, config: ScreenConfig) => void) | null = null
let registerGroup: ((name: string, icon: string) => void) | null = null
let registerGroupPage: ((groupName: string, page: { screenType: string; label: string; icon: string }) => void) | null = null
let registerMessages: ((namespace: string, en: Record<string, string>, ar: Record<string, string>) => void) | null = null

async function loadLowcodeRegistry(): Promise<void> {
  try {
    const mod = await import('quasar-app-extension-fastfree-lowcode/src/runtime/index')
    registerScreen = mod.registerScreen
    registerGroup = mod.registerGroup
    registerGroupPage = mod.registerGroupPage
    registerMessages = mod.registerMessages
  } catch {
    console.warn('[FastFree Inventory] Could not load lowcode registry. Screens will not be registered.')
  }
}

// Screens
import InventoryDashboard from './screens/InventoryDashboard.vue'
import ProductList from './screens/ProductList.vue'
import CategoryList from './screens/CategoryList.vue'
import WarehouseList from './screens/WarehouseList.vue'
import StockEntryList from './screens/StockEntryList.vue'
import SupplierList from './screens/SupplierList.vue'

// ============================================================
// Translations
// ============================================================

const INVENTORY_MESSAGES_EN: Record<string, string> = {
  // Group
  'inventory': 'Inventory',

  // Dashboard
  'dashboard': 'Inventory Dashboard',
  'totalProducts': 'Total Products',
  'lowStock': 'Low Stock Alerts',
  'totalWarehouses': 'Warehouses',
  'totalEntries': 'Stock Entries',
  'recentEntries': 'Recent Entries',

  // Product
  'products': 'Products',
  'addProduct': 'Add Product',
  'productName': 'Product Name',
  'productCode': 'Product Code',
  'barcode': 'Barcode',
  'category': 'Category',
  'unitOfMeasure': 'Unit of Measure',
  'buyingPrice': 'Buying Price',
  'sellingPrice': 'Selling Price',
  'currentStock': 'Current Stock',
  'minimumStock': 'Minimum Stock',
  'maximumStock': 'Maximum Stock',
  'warehouse': 'Warehouse',
  'supplier': 'Supplier',
  'taxRate': 'Tax Rate',
  'description': 'Description',
  'status': 'Status',
  'active': 'Active',
  'inactive': 'Inactive',
  'discontinued': 'Discontinued',

  // UOM
  'piece': 'Piece',
  'kg': 'Kilogram',
  'gram': 'Gram',
  'liter': 'Liter',
  'meter': 'Meter',
  'box': 'Box',
  'pack': 'Pack',
  'dozen': 'Dozen',

  // Category
  'categories': 'Categories',
  'addCategory': 'Add Category',
  'editCategory': 'Edit Category',
  'categoryName': 'Category Name',
  'categoryCode': 'Category Code',
  'parent': 'Parent',

  // Warehouse
  'warehouses': 'Warehouses',
  'addWarehouse': 'Add Warehouse',
  'editWarehouse': 'Edit Warehouse',
  'warehouseName': 'Warehouse Name',
  'warehouseCode': 'Warehouse Code',
  'address': 'Address',
  'phone': 'Phone',
  'manager': 'Manager',

  // Stock Entry
  'stockEntries': 'Stock Entries',
  'addEntry': 'Add Stock Entry',
  'entryNumber': 'Entry Number',
  'entryType': 'Entry Type',
  'postingDate': 'Posting Date',
  'receipt': 'Receipt',
  'issue': 'Issue',
  'transfer': 'Transfer',
  'adjustment': 'Adjustment',
  'totalAmount': 'Total Amount',
  'product': 'Product',
  'quantity': 'Quantity',
  'rate': 'Rate',
  'amount': 'Amount',
  'sourceWarehouse': 'Source Warehouse',
  'targetWarehouse': 'Target Warehouse',
  'addItem': 'Add Item',
  'submitEntryConfirm': 'Are you sure you want to submit this stock entry?',
  'cancelEntryConfirm': 'Are you sure you want to cancel this stock entry?',
  'draft': 'Draft',
  'submitted': 'Submitted',
  'cancelled': 'Cancelled',

  // Supplier
  'suppliers': 'Suppliers',
  'addSupplier': 'Add Supplier',
  'editSupplier': 'Edit Supplier',
  'supplierName': 'Supplier Name',
  'supplierCode': 'Supplier Code',
  'email': 'Email',
  'contactPerson': 'Contact Person',
  'gstNumber': 'GST Number',

  // General
  'remarks': 'Remarks',
  'items': 'Items',
}

const INVENTORY_MESSAGES_AR: Record<string, string> = {
  // Group
  'inventory': 'المخزون',

  // Dashboard
  'dashboard': 'لوحة معلومات المخزون',
  'totalProducts': 'إجمالي المنتجات',
  'lowStock': 'تنبيهات انخفاض المخزون',
  'totalWarehouses': 'المستودعات',
  'totalEntries': 'قيود المخزون',
  'recentEntries': 'آخر القيود',

  // Product
  'products': 'المنتجات',
  'addProduct': 'إضافة منتج',
  'productName': 'اسم المنتج',
  'productCode': 'كود المنتج',
  'barcode': 'الباركود',
  'category': 'الفئة',
  'unitOfMeasure': 'وحدة القياس',
  'buyingPrice': 'سعر الشراء',
  'sellingPrice': 'سعر البيع',
  'currentStock': 'المخزون الحالي',
  'minimumStock': 'الحد الأدنى للمخزون',
  'maximumStock': 'الحد الأقصى للمخزون',
  'warehouse': 'المستودع',
  'supplier': 'المورد',
  'taxRate': 'نسبة الضريبة',
  'description': 'الوصف',
  'status': 'الحالة',
  'active': 'نشط',
  'inactive': 'غير نشط',
  'discontinued': 'متوقف',

  // UOM
  'piece': 'قطعة',
  'kg': 'كيلوجرام',
  'gram': 'جرام',
  'liter': 'لتر',
  'meter': 'متر',
  'box': 'صندوق',
  'pack': 'علبة',
  'dozen': 'دستة',

  // Category
  'categories': 'الفئات',
  'addCategory': 'إضافة فئة',
  'editCategory': 'تعديل الفئة',
  'categoryName': 'اسم الفئة',
  'categoryCode': 'كود الفئة',
  'parent': 'الأب',

  // Warehouse
  'warehouses': 'المستودعات',
  'addWarehouse': 'إضافة مستودع',
  'editWarehouse': 'تعديل المستودع',
  'warehouseName': 'اسم المستودع',
  'warehouseCode': 'كود المستودع',
  'address': 'العنوان',
  'phone': 'الهاتف',
  'manager': 'المدير',

  // Stock Entry
  'stockEntries': 'قيود المخزون',
  'addEntry': 'إضافة قيد مخزون',
  'entryNumber': 'رقم القيد',
  'entryType': 'نوع القيد',
  'postingDate': 'تاريخ الترحيل',
  'receipt': 'استلام',
  'issue': 'صرف',
  'transfer': 'تحويل',
  'adjustment': 'تسوية',
  'totalAmount': 'الإجمالي',
  'product': 'المنتج',
  'quantity': 'الكمية',
  'rate': 'السعر',
  'amount': 'المبلغ',
  'sourceWarehouse': 'مستودع المصدر',
  'targetWarehouse': 'مستودع الوجهة',
  'addItem': 'إضافة صنف',
  'submitEntryConfirm': 'هل أنت متأكد من ترحيل هذا القيد؟',
  'cancelEntryConfirm': 'هل أنت متأكد من إلغاء هذا القيد؟',
  'draft': 'مسودة',
  'submitted': 'مرحل',
  'cancelled': 'ملغي',

  // Supplier
  'suppliers': 'الموردون',
  'addSupplier': 'إضافة مورد',
  'editSupplier': 'تعديل المورد',
  'supplierName': 'اسم المورد',
  'supplierCode': 'كود المورد',
  'email': 'البريد الإلكتروني',
  'contactPerson': 'جهة الاتصال',
  'gstNumber': 'الرقم الضريبي',

  // General
  'remarks': 'ملاحظات',
  'items': 'الأصناف',
}

// ============================================================
// Registration
// ============================================================

const INVENTORY_GROUP = 'inventory.inventory'

function registerInventoryScreens(): void {
  if (!registerScreen || !registerGroup || !registerGroupPage) {
    console.warn('[FastFree Inventory] Lowcode registry not available. Skipping.')
    return
  }

  registerGroup(INVENTORY_GROUP, 'mdi-warehouse')

  const screens = [
    { type: 'inventory-dashboard', component: InventoryDashboard, label: 'inventory.dashboard', icon: 'mdi-view-dashboard' },
    { type: 'inventory-products', component: ProductList, label: 'inventory.products', icon: 'mdi-package-variant' },
    { type: 'inventory-categories', component: CategoryList, label: 'inventory.categories', icon: 'mdi-shape' },
    { type: 'inventory-warehouses', component: WarehouseList, label: 'inventory.warehouses', icon: 'mdi-warehouse' },
    { type: 'inventory-stock-entries', component: StockEntryList, label: 'inventory.stockEntries', icon: 'mdi-swap-horizontal' },
    { type: 'inventory-suppliers', component: SupplierList, label: 'inventory.suppliers', icon: 'mdi-truck' },
  ]

  for (const s of screens) {
    registerScreen(s.type, { component: s.component, label: s.label, icon: s.icon, groupId: INVENTORY_GROUP })
    registerGroupPage(INVENTORY_GROUP, { screenType: s.type, label: s.label, icon: s.icon })
  }
}

// ============================================================
// Main initialization
// ============================================================

export async function initFastFreeInventory(): Promise<void> {
  await loadLowcodeRegistry()

  if (registerMessages) {
    registerMessages('inventory', INVENTORY_MESSAGES_EN, INVENTORY_MESSAGES_AR)
  }

  registerInventoryScreens()

}
