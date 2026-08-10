<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon
          :name="lead ? 'mdi-pencil' : 'mdi-plus'"
          size="1.5rem"
          color="primary"
        />
        <span class="text-h6">{{
          lead ? t("crm.editLead") : t("crm.addLead")
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
              v-model="form.lead_name"
              :label="t('crm.leadName')"
              outlined
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              aria-label="Lead Name"
            />
            <q-input
              v-model="form.company_name"
              :label="t('crm.companyName')"
              outlined
              aria-label="Company Name"
            />
            <q-select
              v-model="form.lead_type"
              :options="leadTypeOptions"
              :label="t('crm.leadType')"
              outlined
              emit-value
              map-options
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              :aria-label="t('crm.leadType')"
              options-dense
            />
            <q-select
              v-model="form.lead_source"
              :options="leadSourceOptions"
              :label="t('crm.leadSource')"
              outlined
              emit-value
              map-options
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              :aria-label="t('crm.leadSource')"
              options-dense
            />
            <q-select
              v-model="form.lead_status"
              :options="leadStatusOptions"
              :label="t('crm.leadStatus')"
              outlined
              emit-value
              map-options
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              :aria-label="t('crm.leadStatus')"
              options-dense
            />
            <q-input
              v-model="form.email_id"
              :label="t('crm.email')"
              outlined
              type="email"
              :rules="[
                (val) =>
                  !val ||
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ||
                  t('validation.fieldRequired'),
              ]"
              aria-label="Email"
            />
            <q-input
              v-model="form.phone"
              :label="t('crm.phone')"
              outlined
              aria-label="Phone"
            />
            <q-input
              v-model="form.mobile_no"
              :label="t('crm.mobileNo')"
              outlined
              aria-label="Mobile No"
            />
            <q-select
              v-model="form.gender"
              :options="genderOptions"
              :label="t('crm.gender')"
              outlined
              emit-value
              map-options
              :aria-label="t('crm.gender')"
              options-dense
            />
            <q-input
              v-model="form.website"
              :label="t('crm.website')"
              outlined
              aria-label="Website"
            />
            <q-input
              v-model="form.industry"
              :label="t('crm.industry')"
              outlined
              aria-label="Industry"
            />
            <q-input
              v-model="form.territory"
              :label="t('crm.territory')"
              outlined
              aria-label="Territory"
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
              v-model="form.address"
              :label="t('crm.address')"
              outlined
              type="textarea"
              rows="2"
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              aria-label="Address"
            />
            <q-input
              v-model="form.description"
              :label="t('crm.description')"
              outlined
              type="textarea"
              rows="3"
              aria-label="Description"
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
import { createLead, updateLead } from "../services/lead.service";
import type { Lead, LeadStatus, LeadType, LeadSource } from "../types";

const props = defineProps<{
  modelValue: boolean;
  lead?: Lead | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const { t } = useLcI18n();
const $q = useQuasar();

const saving = ref(false);

const leadStatusOptions = computed(() => [
  { label: t("crm.leadStatusNew"), value: "New" },
  { label: t("crm.leadStatusContacted"), value: "Contacted" },
  { label: t("crm.leadStatusQualified"), value: "Qualified" },
  { label: t("crm.leadStatusUnqualified"), value: "Unqualified" },
  { label: t("crm.leadStatusInterested"), value: "Interested" },
  { label: t("crm.leadStatusNotInterested"), value: "Not Interested" },
  { label: t("crm.leadStatusLost"), value: "Lost" },
  { label: t("crm.leadStatusConverted"), value: "Converted" },
]);

const leadTypeOptions = computed(() => [
  { label: t("crm.leadTypeCompany"), value: "Company" },
  { label: t("crm.leadTypeIndividual"), value: "Individual" },
  { label: t("crm.leadTypePartnership"), value: "Partnership" },
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

const genderOptions = computed(() => [
  { label: t("crm.male"), value: "Male" },
  { label: t("crm.female"), value: "Female" },
  { label: t("crm.other"), value: "Other" },
]);

const form = reactive<Partial<Lead>>({
  lead_name: "",
  company_name: "",
  email_id: "",
  phone: "",
  mobile_no: "",
  gender: "",
  website: "",
  industry: "",
  territory: "",
  posting_date: "",
  address: "",
  description: "",
});

watch(
  () => props.lead,
  (ld) => {
    if (ld) {
      form.lead_name = ld.lead_name;
      form.company_name = ld.company_name ?? "";
      form.lead_type = ld.lead_type;
      form.lead_source = ld.lead_source;
      form.lead_status = ld.lead_status;
      form.email_id = ld.email_id ?? "";
      form.phone = ld.phone ?? "";
      form.mobile_no = ld.mobile_no ?? "";
      form.gender = ld.gender ?? "";
      form.website = ld.website ?? "";
      form.industry = ld.industry ?? "";
      form.territory = ld.territory ?? "";
      form.posting_date = ld.posting_date ?? "";
      form.address = ld.address ?? "";
      form.description = ld.description ?? "";
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  form.lead_name = "";
  form.company_name = "";
  form.email_id = "";
  form.phone = "";
  form.mobile_no = "";
  form.gender = "";
  form.website = "";
  form.industry = "";
  form.territory = "";
  form.posting_date = "";
  form.address = "";
  form.description = "";
  delete form.lead_type;
  delete form.lead_source;
  delete form.lead_status;
}

function close() {
  emit("update:modelValue", false);
  resetForm();
}

async function save() {
  saving.value = true;
  try {
    let result;
    if (props.lead) {
      result = await updateLead(props.lead.name, form as Partial<Lead>);
    } else {
      result = await createLead(form as Partial<Lead>);
    }
    if (result.success) {
      $q.notify({ type: "positive", message: t("crm.leadSaved") });
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
