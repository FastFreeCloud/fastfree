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

const ACCOUNTING_GROUP = 'accounting.accounting'

export function registerAccountingScreens(
  registerScreen: RegisterScreen,
  registerGroup: RegisterGroup,
  registerGroupPage: RegisterGroupPage,
): void {
  registerGroup(ACCOUNTING_GROUP, 'mdi-cash-multiple')

  const screens = [
    { type: 'accounting-dashboard', loader: () => import('./screens/AccountingDashboard.vue'), label: 'accounting.dashboard', icon: 'mdi-view-dashboard' },
    { type: 'accounting-chart', loader: () => import('./screens/ChartOfAccounts.vue'), label: 'accounting.chartOfAccounts', icon: 'mdi-sitemap' },
    { type: 'accounting-journal', loader: () => import('./screens/JournalEntryList.vue'), label: 'accounting.journalEntries', icon: 'mdi-book-open' },
    { type: 'accounting-payment', loader: () => import('./screens/PaymentEntryList.vue'), label: 'accounting.paymentEntries', icon: 'mdi-cash-multiple' },
    { type: 'accounting-ledger', loader: () => import('./screens/GeneralLedger.vue'), label: 'accounting.generalLedger', icon: 'mdi-book-open-variant' },
    { type: 'accounting-cost-center', loader: () => import('./screens/CostCenterList.vue'), label: 'accounting.costCenters', icon: 'mdi-domain' },
    { type: 'accounting-fiscal-year', loader: () => import('./screens/FiscalYearList.vue'), label: 'accounting.fiscalYears', icon: 'mdi-calendar-range' },
    { type: 'accounting-reports', loader: () => import('./screens/FinancialReports.vue'), label: 'accounting.financialReports', icon: 'mdi-chart-bar' },
  ]

  for (const s of screens) {
    const component = defineAsyncComponent(s.loader)
    registerScreen(s.type, { component, label: s.label, icon: s.icon, groupId: ACCOUNTING_GROUP })
    registerGroupPage(ACCOUNTING_GROUP, { screenType: s.type, label: s.label, icon: s.icon })
  }
}
