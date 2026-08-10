<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-handshake" size="2rem" color="primary" />
        <span class="text-h6">{{ t("crm.opportunities") }}</span>
        <q-space />
        <q-btn
          color="primary"
          icon="mdi-plus"
          :label="t('crm.addOpportunity')"
          no-caps
          @click="openAdd"
        />
        <q-btn
          flat
          round
          icon="mdi-refresh"
          :aria-label="t('common.refresh')"
          @click="store.fetchOpportunities"
        />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.opportunities"
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
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="statusColor(props.row.status)"
                :label="translateStatus(props.row.status)"
              />
            </q-td>
          </template>
          <template #body-cell-stage="props">
            <q-td :props="props">
              <q-badge
                :color="stageColor(props.row.stage)"
                :label="translateStage(props.row.stage)"
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
                @click="editOpportunity(props.row)"
              />
              <q-btn
                flat
                round
                icon="mdi-delete"
                size="sm"
                color="negative"
                :aria-label="t('common.delete')"
                @click="deleteOpportunity(props.row)"
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

    <OpportunityForm
      v-model="showForm"
      :opportunity="editingOpportunity"
      @saved="onSaved"
    />

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t("common.confirmDelete") }}</span>
        </q-card-section>
        <q-card-section>{{ t("crm.deleteOpportunityConfirm") }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn
            flat
            color="negative"
            :label="t('common.delete')"
            @click="confirmDeleteOpportunity"
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
import { useStatusHelpers } from "quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers";
import { useCrmStore } from "../stores/useCrmStore";
import { deleteOpportunity as apiDeleteOpportunity } from "../services/opportunity.service";
import OpportunityForm from "./OpportunityForm.vue";
import type {
  Opportunity,
  OpportunityStage,
} from "../types";

const { t } = useLcI18n();
const $q = useQuasar();
const store = useCrmStore();
const { translateStatus, statusColor } = useStatusHelpers("crm");

const search = ref("");
const showForm = ref(false);
const editingOpportunity = ref<Opportunity | null>(null);
const confirmDelete = ref(false);
const deleteTarget = ref<string | null>(null);

const columns = computed(() => [
  { name: "name", label: t("common.name"), field: "name", sortable: true },
  { name: "customer", label: t("crm.customer"), field: "customer" },
  {
    name: "opportunity_from",
    label: t("crm.opportunityFrom"),
    field: "opportunity_from",
  },
  { name: "status", label: t("crm.opportunityStatus"), field: "status" },
  { name: "stage", label: t("crm.stage"), field: "stage" },
  {
    name: "opportunity_amount",
    label: t("crm.opportunityAmount"),
    field: "opportunity_amount",
  },
  { name: "posting_date", label: t("crm.postingDate"), field: "posting_date" },
  { name: "lead_source", label: t("crm.leadSource"), field: "lead_source" },
  { name: "actions", label: t("common.actions"), field: "actions" },
]);

function stageColor(stage: OpportunityStage): string {
  const map: Record<string, string> = {
    Prospecting: "info",
    Qualification: "primary",
    Proposal: "secondary",
    Negotiation: "warning",
    "Closed Won": "positive",
    "Closed Lost": "negative",
  };
  return map[stage] ?? "grey";
}

function translateStage(stage: OpportunityStage): string {
  const map: Record<string, string> = {
    Prospecting: t("crm.stageProspecting"),
    Qualification: t("crm.stageQualification"),
    Proposal: t("crm.stageProposal"),
    Negotiation: t("crm.stageNegotiation"),
    "Closed Won": t("crm.stageClosedWon"),
    "Closed Lost": t("crm.stageClosedLost"),
  };
  return map[stage] ?? stage;
}

function openAdd() {
  editingOpportunity.value = null;
  showForm.value = true;
}

function editOpportunity(opportunity: Opportunity) {
  editingOpportunity.value = opportunity;
  showForm.value = true;
}

function deleteOpportunity(opportunity: Opportunity) {
  deleteTarget.value = opportunity.name;
  confirmDelete.value = true;
}

async function confirmDeleteOpportunity() {
  const id = deleteTarget.value;
  if (!id) return;
  confirmDelete.value = false;
  try {
    await apiDeleteOpportunity(id);
    $q.notify({ type: "positive", message: t("crm.opportunityDeleted") });
    await store.fetchOpportunities();
  } catch {
    $q.notify({ type: "negative", message: t("common.error") });
  }
}

function onSaved() {
  showForm.value = false;
  editingOpportunity.value = null;
  store.fetchOpportunities();
}

onMounted(() => store.fetchOpportunities());
</script>
