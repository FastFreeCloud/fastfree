// ============================================================
// FastFree CRM — Lead Service
// ============================================================

import {
  getDocList,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
  callPost,
} from "fastfree-auth";
import type { ApiResponse, Lead, Opportunity } from "../types";

const DOCTYPE = "Lead";

export async function getLeads(): Promise<ApiResponse<Lead[]>> {
  const result = await getDocList<Lead>(
    DOCTYPE,
    undefined,
    [
      "lead_name",
      "company_name",
      "lead_owner",
      "status",
      "lead_source",
      "email_id",
      "phone",
      "posting_date",
    ],
    "posting_date",
    500,
  );
  if (!result.success)
    return {
      success: false,
      error: result.error ?? {
        code: "FETCH_FAILED",
        message: "Failed to fetch leads",
      },
    };
  return { success: true, data: result.data ?? [] };
}

export async function getLead(id: string): Promise<ApiResponse<Lead>> {
  return getDoc<Lead>(DOCTYPE, id);
}

export async function createLead(
  data: Partial<Lead>,
): Promise<ApiResponse<Lead>> {
  return createDoc<Lead>(DOCTYPE, data as Record<string, unknown>);
}

export async function updateLead(
  id: string,
  data: Partial<Lead>,
): Promise<ApiResponse<Lead>> {
  return updateDoc<Lead>(DOCTYPE, id, data as Record<string, unknown>);
}

export async function deleteLead(id: string): Promise<ApiResponse<void>> {
  const result = await deleteDoc(DOCTYPE, id);
  if (result.success) return { success: true };
  return {
    success: false,
    error: result.error ?? {
      code: "DELETE_FAILED",
      message: "Failed to delete lead",
    },
  };
}

export async function convertLeadToOpportunity(
  leadId: string,
  data: Partial<Lead>,
): Promise<ApiResponse<Opportunity>> {
  return callPost<Opportunity>("frappe.client.convert_to_opportunity", {
    ...data,
    lead: leadId,
  } as Record<string, unknown>);
}

export async function submitLead(name: string): Promise<ApiResponse<void>> {
  return callPost<void>("frappe.client.submit_single", {
    doctype: DOCTYPE,
    docname: name,
  });
}

export async function cancelLead(name: string): Promise<ApiResponse<void>> {
  return callPost<void>("frappe.client.cancel", {
    doctype: DOCTYPE,
    docname: name,
  });
}
