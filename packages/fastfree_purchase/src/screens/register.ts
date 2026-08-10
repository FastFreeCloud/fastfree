import { defineAsyncComponent, type Component } from 'vue'

interface ScreenRegistration {
  component: Component
  label?: string
  icon?: string
  groupId?: string
}

interface GroupPage {
  screenType: string
  label: string
  icon: string
}

type RegisterScreen = (type: string, registration: ScreenRegistration) => void
type RegisterGroup = (name: string, icon: string) => void
type RegisterGroupPage = (groupName: string, page: Omit<GroupPage, 'id'>) => void

const PURCHASE_GROUP = 'purchase.purchase'

export function registerPurchaseScreens(
  registerScreen: RegisterScreen,
  registerGroup: RegisterGroup,
  registerGroupPage: RegisterGroupPage,
): void {
  registerGroup(PURCHASE_GROUP, 'mdi-cart')

  const screens = [
    { type: 'purchase-dashboard', loader: () => import('./PurchaseDashboard.vue'), label: 'screens.purchase-dashboard', icon: 'mdi-view-dashboard' },
    { type: 'purchase-suppliers', loader: () => import('./SupplierList.vue'), label: 'screens.purchase-suppliers', icon: 'mdi-truck' },
    { type: 'purchase-orders', loader: () => import('./PurchaseOrderList.vue'), label: 'screens.purchase-orders', icon: 'mdi-cart-check' },
    { type: 'purchase-receipts', loader: () => import('./PurchaseReceiptList.vue'), label: 'screens.purchase-receipts', icon: 'mdi-package-down' },
    { type: 'purchase-invoices', loader: () => import('./PurchaseInvoiceList.vue'), label: 'screens.purchase-invoices', icon: 'mdi-receipt' },
    { type: 'purchase-reports', loader: () => import('./PurchaseReportScreen.vue'), label: 'screens.purchase-reports', icon: 'mdi-chart-bar' },
  ]

  for (const s of screens) {
    const component = defineAsyncComponent(s.loader)
    registerScreen(s.type, { component, label: s.label, icon: s.icon, groupId: PURCHASE_GROUP })
    registerGroupPage(PURCHASE_GROUP, { screenType: s.type, label: s.label, icon: s.icon })
  }
}
