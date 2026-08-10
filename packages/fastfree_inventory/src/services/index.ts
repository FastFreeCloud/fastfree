// ============================================================
// FastFree Inventory — Services Barrel Export
// ============================================================

export {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
} from './product.service'

export {
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
} from './category.service'

export {
  getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse,
} from './warehouse.service'

export {
  getStockEntries, getStockEntry, createStockEntry, updateStockEntry,
  deleteStockEntry, submitStockEntry, cancelStockEntry, getStockBalance,
} from './stock.service'

export {
  getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
} from './supplier.service'

export {
  getStockLedgerEntries, getStockBalance as getStockBalanceFromLedger,
} from './stockLedger.service'

export {
  getSerialNumbers, getSerialNumber, createSerialNumber, updateSerialNumber,
} from './serial.service'

export {
  getBatches, getBatch, createBatch, updateBatch,
} from './batch.service'

export {
  getStockBalanceReport, getStockAgeReport, getWarehouseSummary,
} from './report.service'