<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-account-group" size="2rem" color="primary" />
        <span class="text-h6">{{ t("crm.leads") }}</span>
        <q-space />
        <q-btn
          color="primary"
          icon="mdi-plus"
          :label="t('crm.addLead')"
          no-caps
          @click="openAdd"
        />
        <q-btn
          flat
          round
          icon="mdi-refresh"
          :aria-label="t('common.refresh')"
          @click="store.fetchLeads"
        />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.leads"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          :filter="search"
          flat
        >
          <template #top-right>
            <q-input
              v-model="search"
              :placeholder="t('common.search')"
              dense
              outlined
              clearable
              style="width: 200px"
            >
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </template>
          <template #body-cell-lead_status="props">
            <q-td :props="props">
              <q-badge
                :color="statusColor(props.row.lead_status)"
                :label="translateLeadStatus(props.row.lead_status)"
              />
            </q-td>
          </template>
          <template #body-cell-lead_source="props">
            <q-td :props="props">
              <q-badge
                :color="sourceColor(props.row.lead_source)"
                :label="translateLeadSource(props.row.lead_source)"
              />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                icon="mdi-pencil"
                size="sm"
                color="warning"
                :aria-label="t('common.edit')"
                @click="editLead(props.row)"
              />
              <q-btn
                flat
                round
                icon="mdi-delete"
                size="sm"
                color="negative"
                :aria-label="t('common.delete')"
                @click="deleteLead(props.row)"
              />
            </q-td>
          </template>
          <template #no-data>
            <q-td :props="{ colSpan: columns.length }" class="text-center">
              {{ t("common.noData") }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <LeadForm v-model="showForm" :lead="editingLead" @saved="onSaved" />

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t("common.confirmDelete") }}</span>
        </q-card-section>
        <q-card-section>{{ t("crm.deleteLeadConfirm") }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn
            flat
            color="negative"
            :label="t('common.delete')"
            @click="confirmDeleteLead"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useLcI18n } from "quasar-app-extension-fastfree-lowcode/src/runtime/i18n";
import { useCrmStore } from "../stores/useCrmStore";
import { deleteLead as apiDeleteLead } from "../services/lead.service";
import LeadForm from "./LeadForm.vue";
import type { Lead, LeadStatus, LeadSource } from "../types";

const { t } = useLcI18n();
const $q = useQuasar();
const store = useCrmStore();

const search = ref("");
const showForm = ref(false);
const editingLead = ref<Lead | null>(null);
const confirmDelete = ref(false);
const deleteTarget = ref<string | null>(null);

const columns = computed(() => [
  {
    name: "lead_name",
    label: t("crm.leadName"),
    field: "lead_name",
    sortable: true,
  },
  { name: "company_name", label: t("crm.companyName"), field: "company_name" },
  { name: "lead_owner", label: t("crm.leadOwner"), field: "lead_owner" },
  { name: "email_id", label: t("crm.email"), field: "email_id" },
  { name: "phone", label: t("crm.phone"), field: "phone" },
  { name: "lead_status", label: t("crm.leadStatus"), field: "lead_status" },
  { name: "lead_source", label: t("crm.leadSource"), field: "lead_source" },
  { name: "posting_date", label: t("crm.postingDate"), field: "posting_date" },
  { name: "actions", label: t("common.actions"), field: "actions" },
]);

function statusColor(status: LeadStatus): string {
  const map: Record<string, string> = {
    New: "info",
    Contacted: "primary",
    Qualified: "positive",
    Unqualified: "grey",
    Interested: "secondary",
    "Not Interested": "warning",
    Lost: "negative",
    Converted: "positive",
  };
  return map[status] ?? "grey";
}

function sourceColor(source: LeadSource): string {
  const map: Record<string, string> = {
    "Cold Call": "primary",
    "Email Campaign": "secondary",
    "Web Search": "info",
    Referral: "positive",
    "Social Media": "purple",
    "Web Form": "teal",
    "Walk In": "orange",
  };
  return map[source] ?? "grey";
}

function translateLeadStatus(status: LeadStatus): string {
  const map: Record<string, string> = {
    New: t("crm.leadStatusNew"),
    Contacted: t("crm.leadStatusContacted"),
    Qualified: t("crm.leadStatusQualified"),
    Unqualified: t("crm.leadStatusUnqualified"),
    Interested: t("crm.leadStatusInterested"),
    "Not Interested": t("crm.leadStatusNotInterested"),
    Lost: t("crm.leadStatusLost"),
    Converted: t("crm.leadStatusConverted"),
  };
  return map[status] ?? status;
}

function translateLeadSource(source: LeadSource): string {
  const map: Record<string, string> = {
    "Cold Call": t("crm.sourceColdCall"),
    "Email Campaign": t("crm.sourceEmailCampaign"),
    "Web Search": t("crm.sourceWebSearch"),
    Referral: t("crm.sourceReferral"),
    "Social Media": t("crm.sourceSocialMedia"),
    "Web Form": t("crm.sourceWebForm"),
    "Walk In": t("crm.sourceWalkIn"),
  };
  return map[source] ?? source;
}

function openAdd() {
  editingLead.value = null;
  showForm.value = true;
}

function editLead(lead: Lead) {
  editingLead.value = lead;
  showForm.value = true;
}

function deleteLead(lead: Lead) {
  deleteTarget.value = lead.name;
  confirmDelete.value = true;
}

async function confirmDeleteLead() {
  const id = deleteTarget.value;
  if (!id) return;
  confirmDelete.value = false;
  try {
    await apiDeleteLead(id);
    $q.notify({ type: "positive", message: t("crm.leadDeleted") });
    await store.fetchLeads();
  } catch {
    $q.notify({ type: "negative", message: t("common.error") });
  }
}

function onSaved() {
  showForm.value = false;
  editingLead.value = null;
  store.fetchLeads();
}

onMounted(() => store.fetchLeads());
</script>
