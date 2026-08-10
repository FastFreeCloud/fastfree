<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon
          :name="opportunity ? 'mdi-pencil' : 'mdi-plus'"
          size="1.5rem"
          color="primary"
        />
        <span class="text-h6">{{
          opportunity ? t("crm.editOpportunity") : t("crm.addOpportunity")
        }}</span>
        <q-space />
        <q-btn
          flat
          round
          icon="mdi-close"
          :aria-label="t('common.cancel')"
          @click="close"
        />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="save">
          <div class="q-gutter-md">
            <q-input
              v-model="form.name"
              :label="t('common.name')"
              outlined
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              aria-label="Name"
            />
            <q-select
              v-model="form.status"
              :options="statusOptions"
              :label="t('crm.opportunityStatus')"
              outlined
              emit-value
              map-options
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              :aria-label="t('crm.opportunityStatus')"
              options-dense
            />
            <q-select
              v-model="form.stage"
              :options="stageOptions"
              :label="t('crm.stage')"
              outlined
              emit-value
              map-options
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              :aria-label="t('crm.stage')"
              options-dense
            />
            <q-select
              v-model="form.lead_source"
              :options="leadSourceOptions"
              :label="t('crm.leadSource')"
              outlined
              emit-value
              map-options
              :aria-label="t('crm.leadSource')"
              options-dense
            />
            <q-input
              v-model.number="form.opportunity_amount"
              :label="t('crm.opportunityAmount')"
              outlined
              type="number"
              aria-label="Opportunity Amount"
            />
            <q-input
              v-model.number="form.probability"
              :label="t('crm.probability')"
              outlined
              type="number"
              aria-label="Probability"
            />
            <q-input
              v-model="form.currency"
              :label="t('crm.currency')"
              outlined
              aria-label="Currency"
            />
            <q-input
              v-model="form.expected_closing_date"
              :label="t('crm.expectedClosingDate')"
              outlined
              type="date"
              aria-label="Expected Closing Date"
            />
            <q-input
              v-model="form.posting_date"
              :label="t('crm.postingDate')"
              outlined
              type="date"
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              aria-label="Posting Date"
            />
            <q-input
              v-model="form.opportunity_from"
              :label="t('crm.opportunityFrom')"
              outlined
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              aria-label="Opportunity From"
            />
            <q-input
              v-model="form.customer"
              :label="t('crm.customer')"
              outlined
              aria-label="Customer"
            />
            <q-input
              v-model="form.company"
              :label="t('crm.company')"
              outlined
              aria-label="Company"
            />

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn
                flat
                :label="t('common.cancel')"
                @click="close"
                type="button"
              />
              <q-btn
                type="submit"
                color="primary"
                :label="t('common.save')"
                :loading="saving"
              />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { useQuasar } from "quasar";
import { useLcI18n } from "quasar-app-extension-fastfree-lowcode/src/runtime/i18n";
import {
  createOpportunity,
  updateOpportunity,
} from "../services/opportunity.service";
import type {
  Opportunity,
  OpportunityStatus,
  OpportunityStage,
  LeadSource,
} from "../types";

const props = defineProps<{
  modelValue: boolean;
  opportunity?: Opportunity | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const { t } = useLcI18n();
const $q = useQuasar();

const saving = ref(false);

const statusOptions = computed(() => [
  { label: t("crm.oppStatusOpen"), value: "Open" },
  { label: t("crm.oppStatusQuotation"), value: "Quotation" },
  { label: t("crm.oppStatusOrdered"), value: "Ordered" },
  { label: t("crm.oppStatusLost"), value: "Lost" },
  { label: t("crm.oppStatusWon"), value: "Won" },
  { label: t("crm.oppStatusReplied"), value: "Replied" },
]);

const stageOptions = computed(() => [
  { label: t("crm.stageProspecting"), value: "Prospecting" },
  { label: t("crm.stageQualification"), value: "Qualification" },
  { label: t("crm.stageProposal"), value: "Proposal" },
  { label: t("crm.stageNegotiation"), value: "Negotiation" },
  { label: t("crm.stageClosedWon"), value: "Closed Won" },
  { label: t("crm.stageClosedLost"), value: "Closed Lost" },
]);

const leadSourceOptions = computed(() => [
  { label: t("crm.sourceColdCall"), value: "Cold Call" },
  { label: t("crm.sourceEmailCampaign"), value: "Email Campaign" },
  { label: t("crm.sourceWebSearch"), value: "Web Search" },
  { label: t("crm.sourceReferral"), value: "Referral" },
  { label: t("crm.sourceSocialMedia"), value: "Social Media" },
  { label: t("crm.sourceWebForm"), value: "Web Form" },
  { label: t("crm.sourceWalkIn"), value: "Walk In" },
]);

const form = reactive<Partial<Opportunity>>({
  name: "",
  opportunity_amount: 0,
  probability: 0,
  currency: "",
  expected_closing_date: "",
  posting_date: "",
  opportunity_from: "",
  customer: "",
  company: "",
});

watch(
  () => props.opportunity,
  (opp) => {
    if (opp) {
      form.name = opp.name;
      form.status = opp.status;
      if (opp.stage) {
        form.stage = opp.stage;
      } else {
        delete form.stage;
      }
      if (opp.lead_source) {
        form.lead_source = opp.lead_source;
      } else {
        delete form.lead_source;
      }
      form.opportunity_amount = opp.opportunity_amount ?? 0;
      form.probability = opp.probability ?? 0;
      form.currency = opp.currency ?? "";
      form.expected_closing_date = opp.expected_closing_date ?? "";
      form.posting_date = opp.posting_date ?? "";
      form.opportunity_from = opp.opportunity_from ?? "";
      form.customer = opp.customer ?? "";
      form.company = opp.company ?? "";
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  form.name = "";
  form.opportunity_amount = 0;
  form.probability = 0;
  form.currency = "";
  form.expected_closing_date = "";
  form.posting_date = "";
  form.opportunity_from = "";
  form.customer = "";
  form.company = "";
  delete form.status;
  delete form.stage;
  delete form.lead_source;
}

function close() {
  emit("update:modelValue", false);
  resetForm();
}

async function save() {
  saving.value = true;
  try {
    let result;
    if (props.opportunity) {
      result = await updateOpportunity(
        props.opportunity.name,
        form as Partial<Opportunity>,
      );
    } else {
      result = await createOpportunity(form as Partial<Opportunity>);
    }
    if (result.success) {
      $q.notify({ type: "positive", message: t("crm.opportunitySaved") });
      emit("saved");
      close();
    } else {
      $q.notify({
        type: "negative",
        message: result.error?.message ?? t("common.error"),
      });
    }
  } catch {
    $q.notify({ type: "negative", message: t("common.error") });
  } finally {
    saving.value = false;
  }
}
</script>
