// ============================================================
// FastFree CRM — TypeScript Types
// Frappe / ERPNext DocTypes (snake_case field names)
// ============================================================

// ------------------------------------------------------------
// Lead
// ------------------------------------------------------------

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Unqualified"
  | "Interested"
  | "Not Interested"
  | "Lost"
  | "Converted";

export type LeadType = "Company" | "Individual" | "Partnership";

export type LeadSource =
  | "Cold Call"
  | "Email Campaign"
  | "Web Search"
  | "Referral"
  | "Social Media"
  | "Web Form"
  | "Walk In";

export interface Lead {
  name: string;
  lead_name: string;
  lead_status: LeadStatus;
  lead_source: LeadSource;
  lead_type: LeadType;
  company_name?: string;
  lead_owner?: string;
  email_id?: string;
  phone?: string;
  mobile_no?: string;
  gender?: string;
  opportunity_from?: string;
  customer?: string;
  address?: string;
  website?: string;
  industry?: string;
  territory?: string;
  source?: string;
  request_type?: string;
  description?: string;
  posting_date?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

// ------------------------------------------------------------
// Opportunity
// ------------------------------------------------------------

export type OpportunityStatus =
  "Open" | "Quotation" | "Ordered" | "Lost" | "Won" | "Replied";

export type OpportunityStage =
  | "Prospecting"
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export interface Opportunity {
  name: string;
  status: OpportunityStatus;
  lead?: string;
  customer?: string;
  opportunity_from?: string;
  company?: string;
  posting_date?: string;
  opportunity_amount?: number;
  probability?: number;
  stage?: OpportunityStage;
  expected_closing_date?: string;
  lead_source?: LeadSource;
  currency?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

// ------------------------------------------------------------
// Contact
// ------------------------------------------------------------

export type ContactType = "Individual" | "Company";

export interface Contact {
  name: string;
  first_name?: string;
  last_name?: string;
  email_id?: string;
  phone?: string;
  mobile_no?: string;
  company_name?: string;
  gender?: string;
  address?: string;
  department?: string;
  designation?: string;
  salutation?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

// ------------------------------------------------------------
// Address
// ------------------------------------------------------------

export interface Address {
  name: string;
  address_title?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email_id?: string;
  address_type?: string;
  latitude?: number;
  longitude?: number;
  creation?: string;
  modified?: string;
  owner?: string;
}

// ------------------------------------------------------------
// Campaign
// ------------------------------------------------------------

export type CampaignType =
  | "Email"
  | "Google Adwords"
  | "Social Media"
  | "Direct Mail"
  | "Referral"
  | "Other";

export type CampaignStatus =
  "Planned" | "Active" | "Completed" | "Cancelled" | "Draft";

export interface Campaign {
  name: string;
  campaign_name?: string;
  campaign_type?: CampaignType;
  status?: CampaignStatus;
  budget_cost?: number;
  actual_cost?: number;
  started_date?: string;
  ended_date?: string;
  description?: string;
  company?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

// ------------------------------------------------------------
// Lead Source
// ------------------------------------------------------------

export type LeadSourceParams = {
  from_date?: string;
  to_date?: string;
};

// ------------------------------------------------------------
// CRM Summary
// ------------------------------------------------------------

export interface CrmSummary {
  total_leads: number;
  total_opportunities: number;
  total_contacts: number;
  total_campaigns: number;
  leads_by_status: Record<string, number>;
  opportunities_by_stage: Record<string, number>;
  total_opportunity_value: number;
  won_opportunity_value: number;
  conversion_rate: number;
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
