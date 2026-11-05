/**
 * Domain Model: SovereignApp
 * Represents an enterprise application running inside the FastFree sovereign node.
 */

export type AppCategory = 'enterprise' | 'finance' | 'workforce' | 'crm' | 'management' | 'infrastructure';

export interface SovereignAppProps {
  id: string;
  nameAr: string;
  nameEn: string;
  port: number;
  subdomain: string;
  category: AppCategory;
  descriptionAr: string;
  descriptionEn: string;
  badgeLabelAr?: string;
  badgeLabelEn?: string;
  badgeColor?: 'emerald' | 'cyan' | 'purple' | 'amber';
}

export class SovereignApp {
  public readonly id: string;
  public readonly nameAr: string;
  public readonly nameEn: string;
  public readonly port: number;
  public readonly subdomain: string;
  public readonly category: AppCategory;
  public readonly descriptionAr: string;
  public readonly descriptionEn: string;
  public readonly badgeLabelAr: string;
  public readonly badgeLabelEn: string;
  public readonly badgeColor: 'emerald' | 'cyan' | 'purple' | 'amber';

  constructor(props: SovereignAppProps) {
    this.id = props.id;
    this.nameAr = props.nameAr;
    this.nameEn = props.nameEn;
    this.port = props.port;
    this.subdomain = props.subdomain;
    this.category = props.category;
    this.descriptionAr = props.descriptionAr;
    this.descriptionEn = props.descriptionEn;
    this.badgeLabelAr = props.badgeLabelAr || 'جاهز';
    this.badgeLabelEn = props.badgeLabelEn || 'Ready';
    this.badgeColor = props.badgeColor || 'emerald';
  }

  public getName(isRtl: boolean): string {
    return isRtl ? this.nameAr : this.nameEn;
  }

  public getDescription(isRtl: boolean): string {
    return isRtl ? this.descriptionAr : this.descriptionEn;
  }

  public getBadge(isRtl: boolean): string {
    return isRtl ? this.badgeLabelAr : this.badgeLabelEn;
  }

  public get gradient(): string {
    switch (this.id) {
      case 'erp':
        return 'linear-gradient(135deg, #1E3A8A, #3B82F6)';
      case 'pos':
        return 'linear-gradient(135deg, #065F46, #10B981)';
      case 'ledger':
        return 'linear-gradient(135deg, #581C87, #8B5CF6)';
      case 'hr':
        return 'linear-gradient(135deg, #831843, #EC4899)';
      case 'crm':
        return 'linear-gradient(135deg, #7C2D12, #F97316)';
      case 'panel':
        return 'linear-gradient(135deg, #14532D, #22C55E)';
      case 'hyperv':
        return 'linear-gradient(135deg, #0F172A, #334155)';
      case 'wireguard':
      default:
        return 'linear-gradient(135deg, #1E1B4B, #6366F1)';
    }
  }

  public getUrl(host: string = 'localhost'): string {
    if (this.port === 80) return `http://${host}`;
    if (this.port === 443) return `https://${host}`;
    return `http://${host}:${this.port}`;
  }

  public getLaunchUrl(host: string = 'localhost'): string {
    return this.getUrl(host);
  }

  public static createDefaultFleet(): SovereignApp[] {
    return [
      new SovereignApp({
        id: 'erp',
        nameAr: 'نظام ERP المتكامل',
        nameEn: 'FastFree ERP',
        port: 80,
        subdomain: 'erp',
        category: 'enterprise',
        descriptionAr: 'منظومة إدارة المؤسسة الشاملة والمخازن',
        descriptionEn: 'Enterprise Resource Planning & Supply Chain',
        badgeLabelAr: 'بوابة 80',
        badgeLabelEn: 'Port 80',
        badgeColor: 'cyan'
      }),
      new SovereignApp({
        id: 'pos',
        nameAr: 'نقطة البيع POS',
        nameEn: 'Point of Sale POS',
        port: 8080,
        subdomain: 'pos',
        category: 'finance',
        descriptionAr: 'واجهة الكاشير السريعة والفوترة الفورية',
        descriptionEn: 'High-speed Offline Cashier & Fast Invoicing',
        badgeLabelAr: 'بوابة 8080',
        badgeLabelEn: 'Port 8080',
        badgeColor: 'emerald'
      }),
      new SovereignApp({
        id: 'ledger',
        nameAr: 'دفتر الأستاذ Ledger',
        nameEn: 'General Ledger',
        port: 8081,
        subdomain: 'ledger',
        category: 'finance',
        descriptionAr: 'المحاسبة العامة وقيود اليومية ومراكز التكلفة',
        descriptionEn: 'General Ledger, Financial Journals & Cost Centers',
        badgeLabelAr: 'بوابة 8081',
        badgeLabelEn: 'Port 8081',
        badgeColor: 'emerald'
      }),
      new SovereignApp({
        id: 'hr',
        nameAr: 'الموارد البشرية HR',
        nameEn: 'Human Resources HR',
        port: 8082,
        subdomain: 'hr',
        category: 'workforce',
        descriptionAr: 'إدارة شؤون الموظفين، الرواتب، والإجازات',
        descriptionEn: 'Payroll, Attendance, Leaves & Staff Management',
        badgeLabelAr: 'بوابة 8082',
        badgeLabelEn: 'Port 8082',
        badgeColor: 'purple'
      }),
      new SovereignApp({
        id: 'crm',
        nameAr: 'إدارة علاقات العملاء CRM',
        nameEn: 'Customer Relationship CRM',
        port: 8083,
        subdomain: 'crm',
        category: 'crm',
        descriptionAr: 'إدارة العملاء المحتملين، الصفقات والحملات',
        descriptionEn: 'Leads, Sales Pipeline & Opportunity Tracking',
        badgeLabelAr: 'بوابة 8083',
        badgeLabelEn: 'Port 8083',
        badgeColor: 'cyan'
      }),
      new SovereignApp({
        id: 'panel',
        nameAr: 'لوحة التحكم Panel',
        nameEn: 'Control Panel',
        port: 5173,
        subdomain: 'panel',
        category: 'management',
        descriptionAr: 'إدارة العقدة، المستأجرين، ومراقبة الشبكة',
        descriptionEn: 'Node Administration, Tenants & Fleet Monitor',
        badgeLabelAr: 'بوابة 5173',
        badgeLabelEn: 'Port 5173',
        badgeColor: 'cyan'
      }),
      new SovereignApp({
        id: 'hyperv',
        nameAr: 'جهاز Hyper-V Core',
        nameEn: 'Hyper-V Core Appliance',
        port: 22,
        subdomain: 'core',
        category: 'infrastructure',
        descriptionAr: 'نظام تشغيل NixOS 26.05 المعزول بالعتاد',
        descriptionEn: 'Hardware-isolated NixOS 26.05 Sovereign Appliance',
        badgeLabelAr: 'NixOS Core',
        badgeLabelEn: 'NixOS Core',
        badgeColor: 'purple'
      }),
      new SovereignApp({
        id: 'wireguard',
        nameAr: 'شبكة FastFree VPN المشفرة',
        nameEn: 'FastFree VPN Mesh Tunnel',
        port: 51822,
        subdomain: 'wg',
        category: 'infrastructure',
        descriptionAr: 'نفق P2P آمن ومشفر يربط العقد بالمتحكم',
        descriptionEn: 'Encrypted P2P Overlay Mesh UDP 51822',
        badgeLabelAr: 'UDP 51822',
        badgeLabelEn: 'UDP 51822',
        badgeColor: 'emerald'
      })
    ];
  }
}
