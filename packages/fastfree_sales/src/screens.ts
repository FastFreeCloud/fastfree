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

const SALES_GROUP = 'sales.sales'

export function registerSalesScreens(
  registerScreen: RegisterScreen,
  registerGroup: RegisterGroup,
  registerGroupPage: RegisterGroupPage,
): void {
  registerGroup(SALES_GROUP, 'mdi-cart')

  const screens = [
    { type: 'sales-customers', loader: () => import('./screens/CustomerList.vue'), label: 'sales.customers', icon: 'mdi-account-group' },
    { type: 'sales-quotations', loader: () => import('./screens/QuotationList.vue'), label: 'sales.quotations', icon: 'mdi-file-document' },
    { type: 'sales-orders', loader: () => import('./screens/SalesOrderList.vue'), label: 'sales.salesOrders', icon: 'mdi-cart-check' },
    { type: 'sales-invoices', loader: () => import('./screens/SalesInvoiceList.vue'), label: 'sales.salesInvoices', icon: 'mdi-receipt' },
    { type: 'sales-delivery', loader: () => import('./screens/DeliveryNoteList.vue'), label: 'sales.deliveryNotes', icon: 'mdi-truck-delivery' },
    { type: 'sales-reports', loader: () => import('./screens/SalesReportScreen.vue'), label: 'sales.salesReports', icon: 'mdi-chart-bar' },
  ]

  for (const s of screens) {
    const component = defineAsyncComponent(s.loader)
    registerScreen(s.type, { component, label: s.label, icon: s.icon, groupId: SALES_GROUP })
    registerGroupPage(SALES_GROUP, { screenType: s.type, label: s.label, icon: s.icon })
  }
}
