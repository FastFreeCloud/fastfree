// ============================================================
// FastFree CRM — Report Service
// ============================================================

import { callGet } from "fastfree-auth";
import type { ApiResponse } from "../types";

export async function getLeadReport(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<Record<string, unknown>>> {
  return callGet<Record<string, unknown>>("crm.report.lead_report", {
    from_date: fromDate,
    to_date: toDate,
  });
}

export async function getOpportunityReport(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<Record<string, unknown>>> {
  return callGet<Record<string, unknown>>("crm.report.opportunity_report", {
    from_date: fromDate,
    to_date: toDate,
  });
}

export async function getCampaignReport(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<Record<string, unknown>>> {
  return callGet<Record<string, unknown>>("crm.report.campaign_report", {
    from_date: fromDate,
    to_date: toDate,
  });
}
