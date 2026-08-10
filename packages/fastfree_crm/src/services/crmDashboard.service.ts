// ============================================================
// FastFree CRM — Dashboard Service
// ============================================================

import { callGet } from "fastfree-auth";
import type { ApiResponse, CrmSummary } from "../types";

export async function getLeadPipeline(
  params?: Record<string, unknown>,
): Promise<ApiResponse<Record<string, number>>> {
  return callGet<Record<string, number>>("crm.dashboard.lead_pipeline", params);
}

export async function getOpportunityPipeline(
  params?: Record<string, unknown>,
): Promise<ApiResponse<Record<string, number>>> {
  return callGet<Record<string, number>>(
    "crm.dashboard.opportunity_pipeline",
    params,
  );
}

export async function getLeadsBySource(
  params?: Record<string, unknown>,
): Promise<ApiResponse<Record<string, number>>> {
  return callGet<Record<string, number>>(
    "crm.dashboard.leads_by_source",
    params,
  );
}

export async function getSalesPerformance(
  params?: Record<string, unknown>,
): Promise<ApiResponse<CrmSummary>> {
  return callGet<CrmSummary>("crm.dashboard.sales_performance", params);
}

export async function getCampaignROI(
  params?: Record<string, unknown>,
): Promise<ApiResponse<Record<string, number>>> {
  return callGet<Record<string, number>>("crm.dashboard.campaign_roi", params);
}
