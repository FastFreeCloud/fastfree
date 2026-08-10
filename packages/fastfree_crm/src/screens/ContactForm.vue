<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon
          :name="contact ? 'mdi-pencil' : 'mdi-plus'"
          size="1.5rem"
          color="primary"
        />
        <span class="text-h6">{{
          contact ? t("common.edit") : t("crm.addContact")
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
              v-model="form.first_name"
              :label="t('crm.firstName')"
              outlined
              :rules="[(val) => !!val || t('validation.fieldRequired')]"
              aria-label="First Name"
            />
            <q-input
              v-model="form.last_name"
              :label="t('crm.lastName')"
              outlined
              aria-label="Last Name"
            />
            <q-input
              v-model="form.email_id"
              :label="t('crm.emailId')"
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
            <q-input
              v-model="form.company_name"
              :label="t('crm.companyName')"
              outlined
              aria-label="Company Name"
            />
            <q-input
              v-model="form.designation"
              :label="t('crm.designation')"
              outlined
              aria-label="Designation"
            />
            <q-input
              v-model="form.department"
              :label="t('crm.department')"
              outlined
              aria-label="Department"
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
              v-model="form.address"
              :label="t('crm.address')"
              outlined
              type="textarea"
              rows="2"
              aria-label="Address"
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
import { createContact, updateContact } from "../services/contact.service";
import type { Contact } from "../types";

const props = defineProps<{
  modelValue: boolean;
  contact?: Contact | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
}>();

const { t } = useLcI18n();
const $q = useQuasar();

const saving = ref(false);

const genderOptions = computed(() => [
  { label: t("crm.male"), value: "Male" },
  { label: t("crm.female"), value: "Female" },
  { label: t("crm.other"), value: "Other" },
]);

const form = reactive<Partial<Contact>>({
  first_name: "",
  last_name: "",
  email_id: "",
  phone: "",
  mobile_no: "",
  company_name: "",
  designation: "",
  department: "",
  salutation: "",
  address: "",
});

watch(
  () => props.contact,
  (ct) => {
    if (ct) {
      form.first_name = ct.first_name ?? "";
      form.last_name = ct.last_name ?? "";
      form.email_id = ct.email_id ?? "";
      form.phone = ct.phone ?? "";
      form.mobile_no = ct.mobile_no ?? "";
      form.company_name = ct.company_name ?? "";
      form.designation = ct.designation ?? "";
      form.department = ct.department ?? "";
      form.salutation = ct.salutation ?? "";
      form.address = ct.address ?? "";
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  form.first_name = "";
  form.last_name = "";
  form.email_id = "";
  form.phone = "";
  form.mobile_no = "";
  form.company_name = "";
  form.designation = "";
  form.department = "";
  form.salutation = "";
  form.address = "";
}

function close() {
  emit("update:modelValue", false);
  resetForm();
}

async function save() {
  saving.value = true;
  try {
    let result;
    if (props.contact) {
      result = await updateContact(
        props.contact.name,
        form as Partial<Contact>,
      );
    } else {
      result = await createContact(form as Partial<Contact>);
    }
    if (result.success) {
      $q.notify({ type: "positive", message: t("crm.contactSaved") });
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
