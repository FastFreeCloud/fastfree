// ============================================================
// FastFree CRM — Pinia Store
// ============================================================

import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  Lead,
  Opportunity,
  Contact,
  Campaign,
  CrmSummary,
} from "../types";
import {
  getLeads,
  getOpportunities,
  getContacts,
  getCampaigns,
  getSalesPerformance,
} from "../services";

export const useCrmStore = defineStore("fastfree-crm", () => {
  // ── State ──
  const leads = ref<Lead[]>([]);
  const opportunities = ref<Opportunity[]>([]);
  const contacts = ref<Contact[]>([]);
  const campaigns = ref<Campaign[]>([]);
  const summary = ref<CrmSummary | null>(null);

  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── Helpers ──
  function setLoading(val: boolean) {
    loading.value = val;
  }
  function setError(e: unknown) {
    error.value = e instanceof Error ? e.message : e != null ? String(e) : null;
  }

  // ── Fetch actions ──
  async function fetchLeads() {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeads();
      if (res.success) {
        leads.value = res.data ?? [];
      } else {
        setError(res.error?.message ?? "Failed to fetch leads");
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOpportunities() {
    setLoading(true);
    setError(null);
    try {
      const res = await getOpportunities();
      if (res.success) {
        opportunities.value = res.data ?? [];
      } else {
        setError(res.error?.message ?? "Failed to fetch opportunities");
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchContacts() {
    setLoading(true);
    setError(null);
    try {
      const res = await getContacts();
      if (res.success) {
        contacts.value = res.data ?? [];
      } else {
        setError(res.error?.message ?? "Failed to fetch contacts");
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await getSalesPerformance();
      if (res.success && res.data) {
        summary.value = res.data;
      } else {
        setError(res.error?.message ?? "Failed to fetch CRM summary");
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  // ── Reset ──
  function $reset() {
    leads.value = [];
    opportunities.value = [];
    contacts.value = [];
    campaigns.value = [];
    summary.value = null;
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    leads,
    opportunities,
    contacts,
    campaigns,
    summary,
    loading,
    error,
    // Actions
    fetchLeads,
    fetchOpportunities,
    fetchContacts,
    fetchSummary,
    $reset,
  };
});
