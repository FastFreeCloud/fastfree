/**
 * Clan Panel fixtures — machine rows served by `/api/v1/machines`.
 *
 * Kept beside the ERP domain factories so both unit tests and Cypress E2E
 * specs share one definition of the machine contract.
 */
import { defineFactory, unique } from './core'

export interface MachineFixture {
  name: string
  hostname: string
  isOnline: boolean
  roles: string[]
  description: string
  targetHost: string | null
  buildHost: string | null
  machineClass: string
  installedAt: string | null
}

export const machine = defineFactory<MachineFixture>(() => ({
  name: unique('client-test'),
  hostname: `${unique('client-test')}.fastfree.local`,
  isOnline: true,
  roles: ['hyperv', 'appliance', 'app', 'fastfree'],
  description: 'Test machine created by the shared fixture factory',
  targetHost: `root@${unique('client-test')}.fastfree.local`,
  buildHost: 'localhost',
  machineClass: 'hyperv',
  installedAt: '2026-10-18',
}))
