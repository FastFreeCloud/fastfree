/**
 * CRM fixtures — leads, opportunities, contacts, addresses and campaigns.
 *
 * Field names follow the Frappe/ERPNext snake_case contract the services read.
 */
import type { Address, Campaign, Contact, Lead, Opportunity } from '../../packages/fastfree_crm/src/types'
import { defineFactory, unique } from './core'

export const lead = defineFactory<Lead>(() => ({
  name: unique('LEAD'),
  lead_name: 'Test Lead',
  lead_status: 'New',
  lead_source: 'Cold Call',
  lead_type: 'Individual',
  email_id: `${unique('lead')}@fastfree.test`,
  phone: '+201000000000',
  posting_date: '2026-01-15',
}))

export const opportunity = defineFactory<Opportunity>(() => ({
  name: unique('OPP'),
  status: 'Open',
  stage: 'Prospecting',
  opportunity_amount: 5000,
  probability: 20,
  currency: 'EGP',
  posting_date: '2026-01-15',
  expected_closing_date: '2026-03-15',
}))

export const contact = defineFactory<Contact>(() => ({
  name: unique('CNT'),
  first_name: 'Ada',
  last_name: 'Lovelace',
  email_id: `${unique('contact')}@fastfree.test`,
  phone: '+201000000001',
  company_name: 'FastFree',
}))

export const address = defineFactory<Address>(() => ({
  name: unique('ADDR'),
  address_title: 'Head Office',
  address_line1: '1 Test Street',
  city: 'Cairo',
  country: 'Egypt',
  address_type: 'Office',
}))

export const campaign = defineFactory<Campaign>(() => ({
  name: unique('CAMP'),
  campaign_name: 'Spring Launch',
  campaign_type: 'Email',
  status: 'Planned',
  budget_cost: 1000,
  actual_cost: 0,
  started_date: '2026-01-01',
  ended_date: '2026-01-31',
}))
