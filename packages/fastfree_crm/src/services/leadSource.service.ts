// ============================================================
// FastFree CRM — Lead Source Service
// Manages Link entries in the "Lead Source" DocType
// ------------------------------------------------------------
// NOTE: The `LeadSource` type alias (Cold Call | Email Campaign | ...)
// lives in ../types and describes allowed source values on a Lead.
// This service manages the "Lead Source" DocType records themselves.
// ============================================================

import {
  getDocList,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
} from "fastfree-auth";
import type { ApiResponse } from "../types";

const DOCTYPE = "Lead Source";

interface LeadSourceDoc {
  name: string;
  source_name?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

export async function getLeadSources(): Promise<ApiResponse<LeadSourceDoc[]>> {
  const result = await getDocList<LeadSourceDoc>(
    DOCTYPE,
    undefined,
    ["name", "source_name"],
    "source_name",
    500,
  );
  if (!result.success)
    return {
      success: false,
      error: result.error ?? {
        code: "FETCH_FAILED",
        message: "Failed to fetch lead sources",
      },
    };
  return { success: true, data: result.data ?? [] };
}

export async function getLeadSource(
  id: string,
): Promise<ApiResponse<LeadSourceDoc>> {
  return getDoc<LeadSourceDoc>(DOCTYPE, id);
}

export async function createLeadSource(
  data: Partial<LeadSourceDoc>,
): Promise<ApiResponse<LeadSourceDoc>> {
  return createDoc<LeadSourceDoc>(DOCTYPE, data as Record<string, unknown>);
}

export async function updateLeadSource(
  id: string,
  data: Partial<LeadSourceDoc>,
): Promise<ApiResponse<LeadSourceDoc>> {
  return updateDoc<LeadSourceDoc>(DOCTYPE, id, data as Record<string, unknown>);
}

export async function deleteLeadSource(id: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, id);
}
