/**
 * Domain Service: LicensePresentationService
 * Single source of truth for localized license presentation views
 * (company chip, tier name, expiry labels and the feature catalogue).
 *
 * Pure & framework-free: every method is a function of its inputs and the
 * `isRtl` flag, so it is unit-testable without Vue or the Tauri backend.
 */
import { LicenseExpiry } from '../models/LicenseExpiry';

export interface LicenseExpiryView {
  /** yyyy-MM-dd for dated licenses, otherwise the perpetual label. */
  dateLabel: string;
  statusLabel: string;
  statusClass: 'pill-active' | 'pill-warn' | 'pill-expired';
}

export class LicensePresentationService {
  private static _instance: LicensePresentationService;

  public static getInstance(): LicensePresentationService {
    if (!LicensePresentationService._instance) {
      LicensePresentationService._instance = new LicensePresentationService();
    }
    return LicensePresentationService._instance;
  }

  private constructor() {
    // Singleton: presentation rules are stateless anyway.
  }

  /** Chip-friendly company name; long names are truncated deterministically. */
  public getCompanyView(isRtl: boolean, companyName: string | null | undefined): string {
    const name = companyName?.trim();
    if (!name || name.toLowerCase().includes('enterprise client')) {
      return isRtl ? 'عميل FastFree' : 'FastFree Client';
    }
    if (name.length > 28) {
      return `${name.slice(0, 26)}...`;
    }
    return name;
  }

  /** Localized tier label derived from the raw tier slot (ent/std/trial). */
  public getTierView(isRtl: boolean, tier: string | null | undefined, tierName?: string): string {
    const slot = (tier ?? '').toLowerCase();
    if (slot.includes('ent')) {
      return isRtl ? 'ترخيص مؤسسي سيادي' : 'Sovereign Enterprise';
    }
    if (slot.includes('std') || slot.includes('standard')) {
      return isRtl ? 'ترخيص قياسي' : 'Standard License';
    }
    if (slot.includes('trial')) {
      return isRtl ? 'ترخيص تجريبي' : 'Trial License';
    }
    return tierName || (isRtl ? 'ترخيص معتمد' : 'Verified License');
  }

  /** Expiry date + status pill semantics for the verified license card. */
  public getExpiryView(
    isRtl: boolean,
    expiresAt: string | null | undefined,
    referenceTime?: number,
  ): LicenseExpiryView {
    const expiry = new LicenseExpiry(expiresAt, referenceTime);
    const perpetualLabel = isRtl ? 'ترخيص دائم' : 'Perpetual';
    const dateLabel = expiry.isPerpetual ? perpetualLabel : (expiry.isoDate ?? perpetualLabel);

    const days = expiry.daysRemaining;
    if (days === null) {
      return { dateLabel, statusLabel: isRtl ? 'سارٍ ودائم' : 'Perpetual', statusClass: 'pill-active' };
    }
    if (days <= 0) {
      return { dateLabel, statusLabel: isRtl ? 'منتهي الصلاحية' : 'Expired', statusClass: 'pill-expired' };
    }
    if (days < 30) {
      return {
        dateLabel,
        statusLabel: isRtl ? `باقٍ ${days} يوم` : `${days} days left`,
        statusClass: 'pill-warn',
      };
    }
    return { dateLabel, statusLabel: isRtl ? 'سارٍ ونشط' : 'Active', statusClass: 'pill-active' };
  }

  /** Days remaining for any external consumer (null when perpetual/unparseable). */
  public getDaysRemaining(expiresAt: string | null | undefined, referenceTime?: number): number | null {
    return new LicenseExpiry(expiresAt, referenceTime).daysRemaining;
  }

  /** Effective list of nodes this license may provision or appear on. */
  public getEligibleNodes(
    eligibleClients: ReadonlyArray<string> | null | undefined,
    boundNode: string | null | undefined,
  ): string[] {
    if (eligibleClients && eligibleClients.length > 0) {
      return Array.from(eligibleClients);
    }
    return [boundNode?.trim() || 'client2'];
  }

  /** Whether the license holder may pick between several nodes. */
  public hasMultipleEligibleNodes(
    eligibleClients: ReadonlyArray<string> | null | undefined,
    boundNode: string | null | undefined,
  ): boolean {
    return this.getEligibleNodes(eligibleClients, boundNode).length > 1;
  }

  /** Localized unlocked-feature display name; unknown ids fall back to readable text. */
  public getFeatureName(isRtl: boolean, feature: string): string {
    const mapEn: Readonly<Record<string, string>> = {
      sovereign_hyperv_appliance: 'Hyper-V Enterprise Appliance',
      wireguard_mesh_vpn: 'FastFree VPN Encrypted Mesh',
      accounting_general_ledger: 'General Ledger & Accounts',
      inventory_warehouse_suite: 'Multi-Warehouse Inventory',
      sales_and_crm_engine: 'Sales & CRM Invoicing',
      purchase_and_supply_chain: 'Purchase Orders & Supply Chain',
      hr_payroll_management: 'HR & Biometric Payroll',
      fastfree_panel_governance: 'Sovereign Control Panel & Fleet',
      evaluation_mode: '14-Day Evaluation Sandbox',
    };

    const mapAr: Readonly<Record<string, string>> = {
      sovereign_hyperv_appliance: 'بيئة العتاد المؤسسي على Hyper-V',
      wireguard_mesh_vpn: 'شبكة FastFree VPN المشفرة',
      accounting_general_ledger: 'دفتر الأستاذ العام والمحاسبة',
      inventory_warehouse_suite: 'إدارة المخزون والمستودعات',
      sales_and_crm_engine: 'المبيعات والعملاء والفواتير',
      purchase_and_supply_chain: 'المشتريات وسلاسل الإمداد',
      hr_payroll_management: 'الموارد البشرية والرواتب',
      fastfree_panel_governance: 'لوحة التحكم والإدارة المؤسسية السيادية',
      evaluation_mode: 'بيئة تجريبية تقييمية (14 يوماً)',
    };

    const map = isRtl ? mapAr : mapEn;
    return map[feature] || feature.replace(/_/g, ' ');
  }
}
