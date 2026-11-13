/**
 * Installer SDUI screen registry (screens.ts)
 * -------------------------------------------
 * Single source of truth for every Server-Driven UI screen the installer can
 * render. All screens are JSON schemas — no screen is hand-coded in a Vue
 * template. Step screens are the 6-stage wizard; named screens are opened
 * in-app via `open_sdui_screen` actions.
 *
 * Phase 2.2: adds the six Clan.lol NixOS specification schemas.
 */
import type { SduiScreen } from 'quasar-app-extension-fastfree-lowcode';

// ── Installer wizard schemas ────────────────────────────────────────────────
import step2License from './step2_license.json';
import step3Sizing from './step3_sizing.json';

// ── Clan.lol NixOS specification schemas ────────────────────────────────────
import clanNodeDiscovery from './clan_node_discovery.json';
import clanModulesCatalog from './clan_modules_catalog.json';
import clanVarsSecrets from './clan_vars_secrets.json';
import clanMeshWireguard from './clan_mesh_wireguard.json';
import clanProvisioningDeploy from './clan_provisioning_deploy.json';
import clanLaunchpadDashboard from './clan_launchpad_dashboard.json';

// ── Sovereign package schemas (modular apps) ────────────────────────────────
import fleetMonitorSchema from '../../../../packages/fastfree_panel/src/schemas/fleet_monitor.json';
import clientManagerSchema from '../../../../packages/fastfree_panel/src/schemas/client_manager.json';
import posCheckoutSchema from '../../../../packages/fastfree_sales/src/schemas/pos_checkout.json';
import generalLedgerSchema from '../../../../packages/fastfree_accounting/src/schemas/general_ledger.json';

const asScreen = (schema: unknown): SduiScreen => schema as unknown as SduiScreen;

/** The six Clan.lol NixOS specification screens (Phase 2.2). */
export const CLAN_SCREENS: Record<string, SduiScreen> = {
  clan_node_discovery: asScreen(clanNodeDiscovery),
  clan_modules_catalog: asScreen(clanModulesCatalog),
  clan_vars_secrets: asScreen(clanVarsSecrets),
  clan_mesh_wireguard: asScreen(clanMeshWireguard),
  clan_provisioning_deploy: asScreen(clanProvisioningDeploy),
  clan_launchpad_dashboard: asScreen(clanLaunchpadDashboard),
};

/** Wizard step → screen schema. Every step renders from JSON. */
export const STEP_SCHEMAS: Record<number, SduiScreen> = {
  1: asScreen(clanNodeDiscovery),
  2: asScreen(step2License),
  3: asScreen(step3Sizing),
  4: asScreen(clanMeshWireguard),
  5: asScreen(clanProvisioningDeploy),
  6: asScreen(clanLaunchpadDashboard),
};

/** Named screens reachable through `open_sdui_screen` actions. */
export const NAMED_SDUI_SCREENS: Record<string, SduiScreen> = {
  ...CLAN_SCREENS,
  // Sovereign package screens
  fleet_monitor: asScreen(fleetMonitorSchema),
  client_manager: asScreen(clientManagerSchema),
  create_client: asScreen(clientManagerSchema),
  sales_pos: asScreen(posCheckoutSchema),
  pos_checkout: asScreen(posCheckoutSchema),
  accounting_ledger: asScreen(generalLedgerSchema),
  general_ledger: asScreen(generalLedgerSchema),
};

/** Every registered SDUI screen (steps + named). */
export const ALL_SDUI_SCREENS: SduiScreen[] = [
  ...Object.values(STEP_SCHEMAS),
  ...Object.values(NAMED_SDUI_SCREENS),
];

/** Resolve a step number to its schema, falling back to step 1. */
export function getStepSchema(step: number): SduiScreen | null {
  return STEP_SCHEMAS[step] ?? null;
}

/** Resolve a named screen id, falling back to null. */
export function getNamedScreen(id: string): SduiScreen | null {
  return NAMED_SDUI_SCREENS[id] ?? null;
}
