// ============================================================
// FastFree Inventory — Main Entry Point
// ============================================================

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------

export { initFastFreeInventory } from './init'

// ------------------------------------------------------------
// Services
// ------------------------------------------------------------

export {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
} from './services'

export {
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
} from './services'

export {
  getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse,
} from './services'

export {
  getStockEntries, getStockEntry, createStockEntry, updateStockEntry,
  deleteStockEntry, submitStockEntry, cancelStockEntry, getStockBalance,
} from './services'

export {
  getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
} from './services'

// ------------------------------------------------------------
// Stores
// ------------------------------------------------------------

export { useInventoryStore } from './stores/useInventoryStore'

// ------------------------------------------------------------
// Screens
// ------------------------------------------------------------

export {
  InventoryDashboard, ProductList, CategoryList, WarehouseList,
  StockEntryList, SupplierList,
} from './screens'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type {
  Product, ProductStatus, UnitOfMeasure,
  Category,
  Warehouse,
  StockEntry, StockEntryType, StockEntryStatus, StockEntryItem,
  Supplier,
  StockBalance,
  ApiResponse,
} from './types'
