<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-account-multiple" size="2rem" color="primary" />
        <span class="text-h6">{{ t("crm.contacts") }}</span>
        <q-space />
        <q-btn
          color="primary"
          icon="mdi-plus"
          :label="t('crm.addContact')"
          no-caps
          @click="openAdd"
        />
        <q-btn
          flat
          round
          icon="mdi-refresh"
          :aria-label="t('common.refresh')"
          @click="store.fetchContacts"
        />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.contacts"
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
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                icon="mdi-pencil"
                size="sm"
                color="warning"
                :aria-label="t('common.edit')"
                @click="editContact(props.row)"
              />
              <q-btn
                flat
                round
                icon="mdi-delete"
                size="sm"
                color="negative"
                :aria-label="t('common.delete')"
                @click="deleteContact(props.row)"
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

    <ContactForm
      v-model="showForm"
      :contact="editingContact"
      @saved="onSaved"
    />

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t("common.confirmDelete") }}</span>
        </q-card-section>
        <q-card-section>{{ t("crm.deleteContactConfirm") }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn
            flat
            color="negative"
            :label="t('common.delete')"
            @click="confirmDeleteContact"
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
import { deleteContact as apiDeleteContact } from "../services/contact.service";
import ContactForm from "./ContactForm.vue";
import type { Contact } from "../types";

const { t } = useLcI18n();
const $q = useQuasar();
const store = useCrmStore();

const search = ref("");
const showForm = ref(false);
const editingContact = ref<Contact | null>(null);
const confirmDelete = ref(false);
const deleteTarget = ref<string | null>(null);

const columns = computed(() => [
  {
    name: "first_name",
    label: t("crm.firstName"),
    field: "first_name",
    sortable: true,
  },
  { name: "last_name", label: t("crm.lastName"), field: "last_name" },
  { name: "email_id", label: t("crm.emailId"), field: "email_id" },
  { name: "phone", label: t("crm.phone"), field: "phone" },
  { name: "company_name", label: t("crm.companyName"), field: "company_name" },
  { name: "designation", label: t("crm.designation"), field: "designation" },
  { name: "actions", label: t("common.actions"), field: "actions" },
]);

function openAdd() {
  editingContact.value = null;
  showForm.value = true;
}

function editContact(contact: Contact) {
  editingContact.value = contact;
  showForm.value = true;
}

function deleteContact(contact: Contact) {
  deleteTarget.value = contact.name;
  confirmDelete.value = true;
}

async function confirmDeleteContact() {
  const id = deleteTarget.value;
  if (!id) return;
  confirmDelete.value = false;
  try {
    await apiDeleteContact(id);
    $q.notify({ type: "positive", message: t("crm.contactDeleted") });
    await store.fetchContacts();
  } catch {
    $q.notify({ type: "negative", message: t("common.error") });
  }
}

function onSaved() {
  showForm.value = false;
  editingContact.value = null;
  store.fetchContacts();
}

onMounted(() => store.fetchContacts());
</script>
