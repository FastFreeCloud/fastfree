// ============================================================
// FastFree CRM — Opportunity Service
// ============================================================

import {
  getDocList,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
  callPost,
} from "fastfree-auth";
import type { ApiResponse, Opportunity } from "../types";

const DOCTYPE = "Opportunity";

export async function getOpportunities(): Promise<ApiResponse<Opportunity[]>> {
  const result = await getDocList<Opportunity>(
    DOCTYPE,
    undefined,
    [
      "name",
      "customer",
      "opportunity_from",
      "status",
      "stage",
      "opportunity_amount",
      "posting_date",
      "lead_source",
    ],
    "posting_date",
    500,
  );
  if (!result.success)
    return {
      success: false,
      error: result.error ?? {
        code: "FETCH_FAILED",
        message: "Failed to fetch opportunities",
      },
    };
  return { success: true, data: result.data ?? [] };
}

export async function getOpportunity(
  id: string,
): Promise<ApiResponse<Opportunity>> {
  return getDoc<Opportunity>(DOCTYPE, id);
}

export async function createOpportunity(
  data: Partial<Opportunity>,
): Promise<ApiResponse<Opportunity>> {
  return createDoc<Opportunity>(DOCTYPE, data as Record<string, unknown>);
}

export async function updateOpportunity(
  id: string,
  data: Partial<Opportunity>,
): Promise<ApiResponse<Opportunity>> {
  return updateDoc<Opportunity>(DOCTYPE, id, data as Record<string, unknown>);
}

export async function deleteOpportunity(
  id: string,
): Promise<ApiResponse<void>> {
  const result = await deleteDoc(DOCTYPE, id);
  if (result.success) return { success: true };
  return {
    success: false,
    error: result.error ?? {
      code: "DELETE_FAILED",
      message: "Failed to delete opportunity",
    },
  };
}

export async function submitOpportunity(
  name: string,
): Promise<ApiResponse<void>> {
  return callPost<void>("frappe.client.submit_single", {
    doctype: DOCTYPE,
    docname: name,
  });
}

export async function cancelOpportunity(
  name: string,
): Promise<ApiResponse<void>> {
  return callPost<void>("frappe.client.cancel", {
    doctype: DOCTYPE,
    docname: name,
  });
}
