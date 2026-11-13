import { describe, it, expect, beforeEach } from 'vitest'
import {
  accounting,
  apiFailure,
  apiSuccess,
  auth,
  buildList,
  chartOfAccountsTree,
  crm,
  employeeDirectory,
  expiredLicense,
  hr,
  inventory,
  licenseAtUserLimit,
  lowStockProduct,
  machine,
  multiLineJournalEntry,
  negativeStockProduct,
  overBudgetCostCenter,
  overdueSalesInvoice,
  paginated,
  purchase,
  purchaseSeed,
  resetFactories,
  sales,
  salesPipeline,
  seq,
  stockMovementRun,
  accountingSeed,
  unique,
  unbalancedJournalEntry,
  zeroDayLeaveApplication,
  type MachineFixture,
} from '../../../tests/fixtures/index'

/**
 * Exercises the shared fixture library end-to-end: every factory must return a
 * fully-populated, internally consistent record, and the composed scenarios /
 * edge cases must produce the deliberate invalid states tests rely on.
 *
 * These tests live in the panel package because it already hosts the E2E suite
 * that consumes the same library through Cypress.
 */
describe('shared test fixtures', () => {
  beforeEach(() => {
    resetFactories()
  })

  describe('core primitives', () => {
    it('generates unique sequential tokens', () => {
      expect(unique('emp')).toBe('emp-1')
      expect(unique('emp')).toBe('emp-2')
      expect(seq('other')).toBe(1)
    })

    it('builds independent instances', () => {
      const users = buildList(auth.user, 3)
      expect(users).toHaveLength(3)
      expect(new Set(users.map((user) => user.id)).size).toBe(3)

      users[0].name = 'mutated'
      expect(users[1].name).not.toBe('mutated')
    })

    it('merges overrides onto the defaults', () => {
      expect(auth.user({ role: 'SWIFT' }).role).toBe('SWIFT')
      expect(auth.user({ role: 'USER' }).email).toContain('@fastfree.test')
    })
  })

  describe('api envelopes', () => {
    it('builds a success envelope', () => {
      expect(apiSuccess({ id: 1 })).toEqual({ success: true, data: { id: 1 } })
    })

    it('builds an error envelope with optional details', () => {
      expect(apiFailure('NOT_FOUND', 'missing').error?.code).toBe('NOT_FOUND')
      expect(apiFailure('X', 'boom', { id: 7 }).error?.details).toEqual({ id: 7 })
    })

    it('builds a paginated envelope', () => {
      expect(paginated([1, 2], 2, 10)).toEqual({ data: [1, 2], total: 2, page: 2, limit: 10 })
    })
  })

  describe('auth factories', () => {
    it('builds a complete user', () => {
      const user = auth.user()
      expect(user).toMatchObject({ name: 'Test User', role: 'OPERATOR' })
      expect(user.email).toContain('@fastfree.test')
      expect(user.permissions).toEqual([])
    })

    it('builds a live session and licence', () => {
      expect(auth.session().expiresAt).toBeGreaterThan(Date.now())
      expect(auth.license().status).toBe('active')
      expect(auth.license().type).toBe('standard')
    })

    it('builds settings and permission checks', () => {
      expect(auth.appSettings()).toEqual({
        language: 'en',
        theme: 'light',
        notifications: true,
        autoSave: true,
      })
      expect(auth.permissionCheck()).toEqual({ action: 'read', doctype: 'Employee' })
    })
  })

  describe('accounting factories', () => {
    it('builds balanced journal entries whose totals match the lines', () => {
      const entry = accounting.journalEntry()
      const debit = entry.accounts.reduce((sum, row) => sum + row.debit, 0)
      const credit = entry.accounts.reduce((sum, row) => sum + row.credit, 0)

      expect(entry.totalDebit).toBe(debit)
      expect(entry.totalCredit).toBe(credit)
      expect(entry.totalDebit).toBe(entry.totalCredit)
    })

    it('builds accounts, fiscal years, taxes and reports', () => {
      expect(accounting.account().isGroup).toBe(false)
      expect(accounting.account().openingBalance).toBe(0)

      expect(accounting.fiscalYear().name).toMatch(/^FY-\d{4}$/)

      expect(accounting.taxTemplate().rate).toBeGreaterThan(0)
      expect(accounting.taxRule().priority).toBeGreaterThanOrEqual(1)

      const report = accounting.financialReport()
      expect(report.totalDebit).toBe(report.rows.reduce((sum, row) => sum + row.debit, 0))
      expect(report.totalCredit).toBe(report.rows.reduce((sum, row) => sum + row.credit, 0))
    })

    it('builds payments and ledger rows', () => {
      expect(accounting.paymentEntry().paidAmount).toBeGreaterThan(0)
      expect(accounting.ledgerEntry().balance).toBe(
        accounting.ledgerEntry().debit - accounting.ledgerEntry().credit,
      )
    })
  })

  describe('crm / hr / inventory / purchase / sales factories', () => {
    it('builds crm records', () => {
      expect(crm.lead().lead_status).toBe('New')
      expect(crm.opportunity().opportunity_amount).toBeGreaterThan(0)
      expect(crm.contact().company_name).toBe('FastFree')
      expect(crm.address().country).toBe('Egypt')
      expect(crm.campaign().budget_cost).toBeGreaterThan(0)
    })

    it('builds hr records with coherent references', () => {
      const attendance = hr.attendance()
      expect(attendance.employee).toMatch(/^EMP-\d+$/)
      expect(hr.leaveApplication().total_days).toBeGreaterThan(0)
      expect(hr.salarySlip().net_pay).toBeGreaterThan(0)
      expect(hr.holidayList().holidays?.[0]?.description).toBe('National Day')
    })

    it('builds inventory records with derived totals', () => {
      const entry = inventory.stockEntry()
      expect(entry.totalAmount).toBe(entry.items.reduce((sum, item) => sum + item.amount, 0))
      expect(inventory.product().currentStock).toBeGreaterThan(0)
      expect(inventory.stockBalance().stockValue).toBe(
        inventory.stockBalance().quantity * inventory.stockBalance().valuationRate,
      )
    })

    it('builds purchase documents with derived totals', () => {
      const order = purchase.purchaseOrder()
      expect(order.total).toBe(order.items.reduce((sum, item) => sum + item.amount, 0))

      const invoice = purchase.purchaseInvoice()
      expect(invoice.total).toBe(invoice.items.reduce((sum, item) => sum + item.amount, 0))
      expect(invoice.outstandingAmount).toBe(invoice.total)
    })

    it('builds sales documents with derived totals', () => {
      const quotation = sales.quotation()
      expect(quotation.grand_total).toBe(
        quotation.items.reduce((sum, item) => sum + item.amount, 0),
      )

      const invoice = sales.salesInvoice()
      expect(invoice.grand_total).toBe(
        invoice.items.reduce((sum, item) => sum + item.amount, 0),
      )
      expect(invoice.outstanding_amount).toBe(invoice.grand_total)
      expect(invoice.due_date).toBe('2026-02-18')

      expect(sales.deliveryNote().total).toBe(
        sales.deliveryNote().items.reduce((sum, item) => sum + item.amount, 0),
      )
    })
  })

  describe('panel machine factory', () => {
    it('matches the machine contract served by /api/v1/machines', () => {
      const shape: MachineFixture = machine()
      expect(Object.keys(shape)).toEqual([
        'name',
        'hostname',
        'isOnline',
        'roles',
        'description',
        'targetHost',
        'buildHost',
        'machineClass',
        'installedAt',
      ])
    })
  })

  describe('composed scenarios', () => {
    it('builds a chart of accounts tree', () => {
      const tree = chartOfAccountsTree()
      expect(tree[0]!.isGroup).toBe(true)
      expect(tree[0]!.children).toHaveLength(2)
      expect(tree[0]!.children?.[0]?.parentAccount).toBe(tree[0]!.name)
    })

    it('builds an employee directory', () => {
      const directory = employeeDirectory(3)
      expect(directory.employees).toHaveLength(3)
      expect(new Set(directory.employees.map((employee) => employee.employee_id)).size).toBe(3)
      expect(directory.employees[0]!.department).toBe(directory.department.name)
    })

    it('builds a full lead pipeline', () => {
      const pipeline = salesPipeline()
      expect(pipeline.leads).toHaveLength(8)
      expect(pipeline.opportunities).toHaveLength(2)
      expect(pipeline.customer.customer_type).toBe('Company')
    })

    it('builds a stock movement run with valued lines', () => {
      const run = stockMovementRun()
      expect(run.receipt.entryType).toBe('Receipt')
      expect(run.issue.entryType).toBe('Issue')
      expect(run.receipt.totalAmount).toBeGreaterThan(0)
      expect(run.issue.totalAmount).toBeGreaterThan(0)
    })

    it('builds seeded datasets', () => {
      const seed = accountingSeed()
      expect(seed.journalEntries).toHaveLength(2)
      expect(seed.fiscalYears).toHaveLength(2)
      expect(purchaseSeed().invoice.total).toBeGreaterThan(0)
    })

    it('builds a multi-line balanced journal entry', () => {
      const entry = multiLineJournalEntry(4)
      expect(entry.accounts).toHaveLength(4)
      expect(entry.totalDebit).toBe(entry.totalCredit)
    })
  })

  describe('edge cases', () => {
    it('builds an unbalanced journal entry', () => {
      const entry = unbalancedJournalEntry()
      expect(entry.totalDebit).not.toBe(entry.totalCredit)
    })

    it('builds expired licences and sessions', () => {
      const licence = expiredLicense()
      expect(licence.status).toBe('expired')
      expect(licence.expiresAt).toBeLessThan(Date.now())

      const session = auth.session({ expiresAt: Date.now() - 1000 })
      expect(session.expiresAt).toBeLessThan(Date.now())
    })

    it('builds a licence at its user ceiling', () => {
      const licence = licenseAtUserLimit()
      expect(licence.type).toBe('trial')
      expect(licence.activatedDevices).toHaveLength(licence.maxUsers)
    })

    it('builds stock edge cases', () => {
      const low = lowStockProduct()
      expect(low.currentStock).toBeLessThan(low.minimumStock ?? 0)

      expect(negativeStockProduct().currentStock).toBeLessThan(0)
    })

    it('builds an over-budget cost center', () => {
      const scenario = overBudgetCostCenter()
      expect(scenario.overBudget).toBe(true)
      expect(scenario.spend).toBeGreaterThan(scenario.costCenter.budget)
    })

    it('builds an overdue invoice', () => {
      expect(overdueSalesInvoice().status).toBe('Overdue')
    })

    it('builds a zero-day leave application', () => {
      expect(zeroDayLeaveApplication().total_days).toBe(0)
    })
  })
})
