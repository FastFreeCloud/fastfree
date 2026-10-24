<template>
  <q-page class="q-pa-md" dir="auto">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 q-my-none text-weight-bold">{{ $t('sample.title') }}</h1>
        <p class="text-caption text-grey-7 q-my-none">{{ $t('sample.subtitle') }}</p>
      </div>

      <q-btn
        color="primary"
        icon="add"
        :label="$t('common.add')"
        aria-label="Add new record"
        @click="openCreateDialog"
      />
    </div>

    <!-- Data Table -->
    <q-table
      :rows="records"
      :columns="columns"
      row-key="name"
      :loading="loading"
      flat
      bordered
    >
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="statusColor(props.row.status)">
            {{ translateStatus(props.row.status) }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn
            flat
            round
            dense
            icon="edit"
            aria-label="Edit record"
            @click="editRecord(props.row)"
          />
          <q-btn
            v-if="props.row.docstatus === 0"
            flat
            round
            dense
            color="negative"
            icon="delete"
            aria-label="Delete record"
            @click="deleteRecord(props.row.name)"
          />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useStatusHelpers } from 'fastfree-lowcode';

interface SampleDoc {
  name: string;
  title: string;
  status: string;
  docstatus: 0 | 1 | 2;
  total_amount?: number;
}

const $q = useQuasar();
const { statusColor, translateStatus } = useStatusHelpers();

const loading = ref<boolean>(false);
const records = ref<SampleDoc[]>([]);

const columns = [
  { name: 'title', label: 'Title', field: 'title', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' as const },
];

function openCreateDialog() {
  $q.notify({
    type: 'info',
    message: 'Opening dialog...',
  });
}

function editRecord(item: SampleDoc) {
  $q.notify({
    type: 'info',
    message: `Editing ${item.name}`,
  });
}

async function deleteRecord(id: string) {
  loading.value = true;
  try {
    records.value = records.value.filter((r) => r.name !== id);
    $q.notify({ type: 'positive', message: 'Record deleted' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to delete' });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  records.value = [
    { name: 'REC-001', title: 'Example Invoice', status: 'Draft', docstatus: 0 },
    { name: 'REC-002', title: 'Completed Payment', status: 'Completed', docstatus: 1 },
  ];
});
</script>

<style scoped>
/* Scoped styles using logical properties for RTL/LTR */
.q-page {
  padding-inline-start: 1rem;
  padding-inline-end: 1rem;
}
</style>
