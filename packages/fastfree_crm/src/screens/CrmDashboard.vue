<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-view-dashboard" size="2rem" color="primary" />
        <span class="text-h6">{{ t("crm.crmDashboard") }}</span>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md q-mb-lg">
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-primary">{{ formatNumber(store.leads.length) }}</div>
              <div class="text-caption">{{ t("crm.totalLeads") }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-secondary">
                {{ formatNumber(store.opportunities.length) }}
              </div>
              <div class="text-caption">{{ t("crm.totalOpportunities") }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-positive">
                {{ formatNumber(store.contacts.length) }}
              </div>
              <div class="text-caption">{{ t("crm.totalContacts") }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-info" v-if="conversionRate !== null">
                {{ conversionRate }}%
              </div>
              <div class="text-caption">{{ t("crm.conversionRate") }}</div>
            </q-card-section>
          </q-card>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-gutter-md q-mt-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1">{{ t("crm.leadsByStatus") }}</div>
            <q-table
              :rows="leadPipelineRows"
              :columns="pipelineColumns"
              row-key="name"
              flat
              dense
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useLcI18n } from "quasar-app-extension-fastfree-lowcode/src/runtime/i18n";
import { useFormatNumber } from "quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber";
import { useCrmStore } from "../stores/useCrmStore";

const { t } = useLcI18n();
const { formatNumber } = useFormatNumber();
const store = useCrmStore();

const leadPipelineRows = computed(() => {
  if (!store.summary?.leads_by_status) return [];
  return Object.entries(store.summary.leads_by_status).map(([key, val]) => ({
    name: key,
    count: val as number,
  }));
});

const pipelineColumns = computed(() => [
  { name: "name", label: t("common.status"), field: "name" },
  { name: "count", label: t("common.total"), field: "count" },
]);

const conversionRate = computed(() => {
  if (!store.summary) return null;
  return store.summary.conversion_rate;
});

onMounted(() => {
  Promise.all([
    store.fetchLeads(),
    store.fetchOpportunities(),
    store.fetchContacts(),
    store.fetchSummary(),
  ]);
});
</script>
