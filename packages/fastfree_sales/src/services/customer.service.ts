import { getDocList, getDoc, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Customer } from '../types'

const DOCTYPE = 'Customer'

const CUSTOMER_FIELDS = [
  'name',
  'customer_name',
  'customer_type',
  'customer_group',
  'territory',
  'email_id',
  'mobile_no',
  'default_currency',
  'disabled',
]

// Raw row shape from Frappe — every field is optional/unknown because list
// responses only carry requested fields and Check fields arrive as 0/1.
interface CustomerRow {
  name?: unknown
  customer_name?: unknown
  customer_type?: unknown
  customer_group?: unknown
  territory?: unknown
  email_id?: unknown
  mobile_no?: unknown
  default_currency?: unknown
  disabled?: unknown
}

interface NamedRow {
  name?: unknown
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function mapCustomer(row: CustomerRow): Customer {
  const name = asString(row.name, '')
  const customer: Customer = {
    name,
    customer_name: asString(row.customer_name, name),
    customer_type: row.customer_type === 'Individual' ? 'Individual' : 'Company',
    customer_group: asString(row.customer_group, ''),
    territory: asString(row.territory, ''),
  }
  const emailId = asOptionalString(row.email_id)
  if (emailId !== undefined) customer.email_id = emailId
  const mobileNo = asOptionalString(row.mobile_no)
  if (mobileNo !== undefined) customer.mobile_no = mobileNo
  const currency = asOptionalString(row.default_currency)
  if (currency !== undefined) customer.default_currency = currency
  if (typeof row.disabled === 'boolean') {
    customer.disabled = row.disabled
  } else if (typeof row.disabled === 'number') {
    customer.disabled = row.disabled === 1
  }
  return customer
}

// Snake_case payload with only defined, real Customer fields.
// NEVER sends email/phone/address/is_active — those do not exist on Customer.
function toCustomerPayload(data: Partial<Customer>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (data.customer_name !== undefined) payload.customer_name = data.customer_name
  if (data.customer_type !== undefined) payload.customer_type = data.customer_type
  if (data.customer_group !== undefined) payload.customer_group = data.customer_group
  if (data.territory !== undefined) payload.territory = data.territory
  if (data.email_id !== undefined) payload.email_id = data.email_id
  if (data.mobile_no !== undefined) payload.mobile_no = data.mobile_no
  if (data.default_currency !== undefined) payload.default_currency = data.default_currency
  if (data.disabled !== undefined) payload.disabled = data.disabled
  return payload
}

export async function getCustomers(): Promise<ApiResponse<Customer[]>> {
  const result = await getDocList<CustomerRow>(DOCTYPE, undefined, CUSTOMER_FIELDS, 'customer_name', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch customers' } }
  return { success: true, data: (result.data ?? []).map(mapCustomer) }
}

export async function getCustomer(name: string): Promise<ApiResponse<Customer>> {
  const result = await getDoc<CustomerRow>(DOCTYPE, name)
  if (!result.success || result.data === undefined) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch customer' } }
  return { success: true, data: mapCustomer(result.data) }
}

export async function createCustomer(data: Partial<Customer>): Promise<ApiResponse<Customer>> {
  const result = await createDoc<CustomerRow>(DOCTYPE, toCustomerPayload(data))
  if (!result.success || result.data === undefined) return { success: false, error: result.error ?? { code: 'CREATE_FAILED', message: 'Failed to create customer' } }
  return { success: true, data: mapCustomer(result.data) }
}

export async function updateCustomer(name: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
  const result = await updateDoc<CustomerRow>(DOCTYPE, name, toCustomerPayload(data))
  if (!result.success || result.data === undefined) return { success: false, error: result.error ?? { code: 'UPDATE_FAILED', message: 'Failed to update customer' } }
  return { success: true, data: mapCustomer(result.data) }
}

export async function deleteCustomer(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function getCustomerGroups(): Promise<string[]> {
  const result = await getDocList<NamedRow>('Customer Group', undefined, ['name'], 'name', 200)
  if (!result.success) return []
  return (result.data ?? [])
    .map((row) => (typeof row.name === 'string' ? row.name : ''))
    .filter((name) => name !== '')
}

export async function getTerritories(): Promise<string[]> {
  const result = await getDocList<NamedRow>('Territory', undefined, ['name'], 'name', 200)
  if (!result.success) return []
  return (result.data ?? [])
    .map((row) => (typeof row.name === 'string' ? row.name : ''))
    .filter((name) => name !== '')
}
