// ============================================================
// FastFree CRM — Address Service
// ============================================================

import {
  getDocList,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
} from "fastfree-auth";
import type { ApiResponse, Address } from "../types";

const DOCTYPE = "Address";

export async function getAddresses(): Promise<ApiResponse<Address[]>> {
  const result = await getDocList<Address>(
    DOCTYPE,
    undefined,
    ["name", "address_title", "city", "state", "country", "address_type"],
    "address_title",
    500,
  );
  if (!result.success)
    return {
      success: false,
      error: result.error ?? {
        code: "FETCH_FAILED",
        message: "Failed to fetch addresses",
      },
    };
  return { success: true, data: result.data ?? [] };
}

export async function getAddress(id: string): Promise<ApiResponse<Address>> {
  return getDoc<Address>(DOCTYPE, id);
}

export async function createAddress(
  data: Partial<Address>,
): Promise<ApiResponse<Address>> {
  return createDoc<Address>(DOCTYPE, data as Record<string, unknown>);
}

export async function updateAddress(
  id: string,
  data: Partial<Address>,
): Promise<ApiResponse<Address>> {
  return updateDoc<Address>(DOCTYPE, id, data as Record<string, unknown>);
}

export async function deleteAddress(id: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, id);
}
