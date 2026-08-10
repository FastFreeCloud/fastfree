// ============================================================
// FastFree CRM — Campaign Service
// ============================================================

import {
  getDocList,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
  callPost,
} from "fastfree-auth";
import type { ApiResponse, Campaign } from "../types";

const DOCTYPE = "Campaign";

export async function getCampaigns(): Promise<ApiResponse<Campaign[]>> {
  const result = await getDocList<Campaign>(
    DOCTYPE,
    undefined,
    [
      "name",
      "campaign_name",
      "campaign_type",
      "status",
      "budget_cost",
      "started_date",
    ],
    "started_date",
    500,
  );
  if (!result.success)
    return {
      success: false,
      error: result.error ?? {
        code: "FETCH_FAILED",
        message: "Failed to fetch campaigns",
      },
    };
  return { success: true, data: result.data ?? [] };
}

export async function getCampaign(id: string): Promise<ApiResponse<Campaign>> {
  return getDoc<Campaign>(DOCTYPE, id);
}

export async function createCampaign(
  data: Partial<Campaign>,
): Promise<ApiResponse<Campaign>> {
  return createDoc<Campaign>(DOCTYPE, data as Record<string, unknown>);
}

export async function updateCampaign(
  id: string,
  data: Partial<Campaign>,
): Promise<ApiResponse<Campaign>> {
  return updateDoc<Campaign>(DOCTYPE, id, data as Record<string, unknown>);
}

export async function deleteCampaign(id: string): Promise<ApiResponse<void>> {
  const result = await deleteDoc(DOCTYPE, id);
  if (result.success) return { success: true };
  return {
    success: false,
    error: result.error ?? {
      code: "DELETE_FAILED",
      message: "Failed to delete campaign",
    },
  };
}

export async function submitCampaign(name: string): Promise<ApiResponse<void>> {
  return callPost<void>("frappe.client.submit_single", {
    doctype: DOCTYPE,
    docname: name,
  });
}

export async function cancelCampaign(name: string): Promise<ApiResponse<void>> {
  return callPost<void>("frappe.client.cancel", {
    doctype: DOCTYPE,
    docname: name,
  });
}
