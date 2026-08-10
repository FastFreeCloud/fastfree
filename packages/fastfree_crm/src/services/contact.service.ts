// ============================================================
// FastFree CRM — Contact Service
// ============================================================

import {
  getDocList,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
} from "fastfree-auth";
import type { ApiResponse, Contact } from "../types";

const DOCTYPE = "Contact";

export async function getContacts(): Promise<ApiResponse<Contact[]>> {
  const result = await getDocList<Contact>(
    DOCTYPE,
    undefined,
    ["first_name", "last_name", "email_id", "phone", "company_name"],
    "first_name",
    500,
  );
  if (!result.success)
    return {
      success: false,
      error: result.error ?? {
        code: "FETCH_FAILED",
        message: "Failed to fetch contacts",
      },
    };
  return { success: true, data: result.data ?? [] };
}

export async function getContact(id: string): Promise<ApiResponse<Contact>> {
  return getDoc<Contact>(DOCTYPE, id);
}

export async function createContact(
  data: Partial<Contact>,
): Promise<ApiResponse<Contact>> {
  return createDoc<Contact>(DOCTYPE, data as Record<string, unknown>);
}

export async function updateContact(
  id: string,
  data: Partial<Contact>,
): Promise<ApiResponse<Contact>> {
  return updateDoc<Contact>(DOCTYPE, id, data as Record<string, unknown>);
}

export async function deleteContact(id: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, id);
}
