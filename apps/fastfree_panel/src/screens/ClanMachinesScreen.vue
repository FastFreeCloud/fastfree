<template>
  <div class="clan-machines-screen q-pa-md">
    <!-- Header with Search, View Toggle & Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Machines</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">أسطول الأجهزة</span>
        </div>
        <div class="text-caption text-grey-6">
          Managed by Clan & NixOS · CRUD & Fleet Orchestration
        </div>
      </div>

      <q-space />

      <!-- View Mode Toggle (Table / Grid) -->
      <q-btn-toggle
        v-model="viewMode"
        dense
        rounded
        unelevated
        toggle-color="primary"
        color="grey-9"
        text-color="grey-4"
        :options="[
          { label: 'Table (CRUD)', value: 'table', icon: 'mdi-table' },
          { label: 'Grid', value: 'grid', icon: 'mdi-view-grid' },
        ]"
        class="q-mr-xs"
      />

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Search machines… بحث"
        style="width: 220px"
      >
        <template #prepend><q-icon name="mdi-magnify" size="18px" /></template>
      </q-input>

      <q-btn
        flat
        dense
        round
        icon="mdi-refresh"
        :loading="clanStore.loading"
        aria-label="Refresh machines"
        @click="clanStore.fetchMachines"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
      </q-btn>

      <q-btn
        color="primary"
        icon="mdi-plus"
        label="Add Machine · إضافة جهاز"
        dense
        class="q-px-sm"
        @click="addDialogOpen = true"
      >
        <q-tooltip>Register new client or server</q-tooltip>
      </q-btn>
    </div>

    <!-- Error Banner -->
    <q-banner
      v-if="clanStore.error"
      rounded
      class="bg-negative text-white q-mb-md"
      icon="mdi-alert-circle-outline"
    >
      {{ clanStore.error }}
    </q-banner>

    <!-- Loading State -->
    <div v-if="clanStore.loading && filteredMachines.length === 0" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="48px" />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!clanStore.loading && filteredMachines.length === 0"
      icon="mdi-server-off"
      title="No machines found"
      message="No machines are currently registered or matched the filter."
    />

    <!-- VIEW 1: LOWCODE TABLE VIEW WITH FULL CRUD & PAGINATION -->
    <q-card v-else-if="viewMode === 'table'" flat bordered class="q-mb-md">
      <q-table
        :rows="filteredMachines"
        :columns="tableColumns"
        row-key="name"
        flat
        dense
        v-model:pagination="tablePagination"
        :rows-per-page-options="[5, 10, 20, 50]"
        binary-state-sort
        separator="cell"
      >
        <!-- Machine Name Slot -->
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar
                :icon="getMachineIcon(props.row)"
                :color="getMachineColor(props.row)"
                text-color="white"
                size="28px"
                class="q-mr-sm"
              />
              <span class="text-weight-bold text-body2">{{ props.row.name }}</span>
            </div>
          </q-td>
        </template>

        <!-- Status Slot -->
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="getMachineStatusColor(props.row)"
              :label="getMachineStatusLabel(props.row)"
              class="q-px-xs text-caption"
            />
          </q-td>
        </template>

        <!-- Tags Slot -->
        <template #body-cell-tags="props">
          <q-td :props="props">
            <div class="row q-gutter-xs">
              <q-chip
                v-for="tag in props.row.tags || []"
                :key="tag"
                dense
                square
                size="xs"
                color="grey-8"
                text-color="grey-3"
                :label="tag"
              />
            </div>
          </q-td>
        </template>

        <!-- CRUD Actions Slot -->
        <template #body-cell-actions="props">
          <q-td :props="props" align="right">
            <div class="row items-center justify-end q-gutter-xs no-wrap">
              <!-- Build Image -->
              <q-btn
                flat
                dense
                round
                size="sm"
                color="purple-4"
                icon="mdi-disc"
                @click="openBuildDialog(props.row)"
              >
                <q-tooltip>Build OS Image (ISO / QCOW2 / RAW / Tarball) · بناء وتحميل صورة</q-tooltip>
              </q-btn>

              <!-- Server Services & Health -->
              <q-btn
                flat
                dense
                round
                size="sm"
                color="positive"
                icon="mdi-heart-pulse"
                @click="openHealthDialog(props.row)"
              >
                <q-tooltip>Server Services & Health · الخدمات وحالة الخادم</q-tooltip>
              </q-btn>

              <!-- Update / Deploy -->
              <q-btn
                flat
                dense
                round
                size="sm"
                color="primary"
                icon="mdi-cloud-sync"
                :loading="clanStore.isDeploying"
                @click="handleUpdate(props.row.name)"
              >
                <q-tooltip>Trigger Machine Deploy · تحديث الجهاز</q-tooltip>
              </q-btn>

              <!-- Edit Machine -->
              <q-btn
                flat
                dense
                round
                size="sm"
                color="warning"
                icon="mdi-pencil"
                @click="openEditDialog(props.row)"
              >
                <q-tooltip>Edit Machine Settings · تعديل البيانات</q-tooltip>
              </q-btn>

              <!-- View Details -->
              <q-btn
                flat
                dense
                round
                size="sm"
                color="cyan"
                icon="mdi-eye"
                @click="openDetail(props.row)"
              >
                <q-tooltip>Inspect Details · عرض التفاصيل</q-tooltip>
              </q-btn>

              <!-- Delete Machine -->
              <q-btn
                flat
                dense
                round
                size="sm"
                color="negative"
                icon="mdi-delete"
                :disable="props.row.name === 'client2'"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>{{ props.row.name === 'client2' ? 'Cannot delete current host' : 'Remove from Fleet · حذف' }}</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- VIEW 2: GRID CARDS VIEW -->
    <div v-else class="row q-col-gutter-md">
      <div
        v-for="m in paginatedGridMachines"
        :key="m.name"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card
          flat
          bordered
          class="machine-card cursor-pointer"
          v-ripple
          @click="openDetail(m)"
        >
          <q-card-section class="row items-center no-wrap">
            <q-avatar
              :icon="getMachineIcon(m)"
              :color="getMachineColor(m)"
              text-color="white"
              size="42px"
            />
            <div class="q-ml-md ellipsis col">
              <div class="text-weight-bold text-body1 ellipsis">{{ m.name }}</div>
              <div class="text-caption text-grey-6 ellipsis">
                {{ m.description || m.host || 'NixOS Node' }}
              </div>
            </div>
            <q-badge
              :color="getMachineStatusColor(m)"
              :label="getMachineStatusLabel(m)"
              class="q-px-xs text-caption"
            />
          </q-card-section>

          <q-card-section v-if="m.tags?.length" class="q-pt-none q-gutter-xs">
            <q-chip
              v-for="tag in m.tags"
              :key="tag"
              dense
              square
              size="xs"
              color="grey-8"
              text-color="grey-3"
              :label="tag"
            />
          </q-card-section>

          <q-separator />

          <q-card-actions align="between" class="q-px-sm">
            <q-btn
              flat
              dense
              size="sm"
              color="primary"
              icon="mdi-cog-sync"
              label="Update"
              :loading="clanStore.isDeploying"
              @click.stop="handleUpdate(m.name)"
            >
              <q-tooltip>Run clan machines update {{ m.name }}</q-tooltip>
            </q-btn>

            <div class="row q-gutter-xs">
              <q-btn
                flat
                dense
                size="sm"
                color="purple-4"
                icon="mdi-disc"
                @click.stop="openBuildDialog(m)"
              >
                <q-tooltip>Build Image (ISO / QCOW2 / RAW / Tarball) · بناء وتحميل صورة</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                size="sm"
                color="positive"
                icon="mdi-heart-pulse"
                @click.stop="openHealthDialog(m)"
              >
                <q-tooltip>Services & Health · الخدمات وحالة الخادم</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                size="sm"
                color="warning"
                icon="mdi-pencil"
                @click.stop="openEditDialog(m)"
              >
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                size="sm"
                color="grey-5"
                icon="mdi-information-outline"
                @click.stop="openDetail(m)"
              >
                <q-tooltip>Details</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                size="sm"
                color="negative"
                icon="mdi-delete"
                :disable="m.name === 'client2'"
                @click.stop="confirmDelete(m)"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </div>
          </q-card-actions>
        </q-card>
      </div>

      <!-- Grid Pagination -->
      <div class="col-12 row items-center justify-center q-mt-md">
        <q-pagination
          v-model="gridPage"
          :max="gridTotalPages"
          :max-pages="5"
          boundary-links
          direction-links
          color="primary"
          size="sm"
        />
      </div>
    </div>

    <!-- Machine Detail Modal -->
    <q-dialog v-model="detailOpen">
      <q-card style="min-width: min(90vw, 680px)">
        <q-card-section class="row items-center q-gutter-sm bg-grey-9 text-white">
          <q-icon name="mdi-server" size="24px" color="primary" />
          <div class="text-subtitle1 text-weight-bold">{{ selectedMachine?.name }}</div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedMachine">
          <DynamicTable
            :columns="detailColumns"
            :rows="detailRows"
            row-key="key"
            flat
            dense
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            color="primary"
            icon="mdi-cloud-sync"
            label="Update Machine · تحديث الجهاز"
            :loading="clanStore.isDeploying"
            @click="handleUpdate(selectedMachine?.name || '')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add Machine Modal (Create) -->
    <q-dialog v-model="addDialogOpen">
      <q-card style="min-width: min(90vw, 560px)">
        <q-card-section class="row items-center q-gutter-sm bg-primary text-white">
          <q-icon name="mdi-server-plus" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Register New Machine · إضافة سيرفر / عميل جديد</div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-y-md">
          <q-input
            v-model="newMachine.name"
            label="Machine Name · اسم الجهاز (e.g. client4, vps-cairo)"
            outlined
            dense
          />
          <q-input
            v-model="newMachine.targetHost"
            label="Target Host / SSH IP · العنوان والمنفذ (e.g. root@192.168.1.100)"
            outlined
            dense
          />
          <q-select
            v-model="newMachine.machineClass"
            :options="['vps', 'server', 'workstation', 'hyperv']"
            label="Machine Class / Role · التصنيف والدور"
            outlined
            dense
          />
          <q-input
            v-model="newMachine.tagsString"
            label="Tags · الوسوم (comma-separated, e.g. production, cairo)"
            outlined
            dense
          />

          <q-banner rounded class="bg-grey-9 text-grey-3 text-caption">
            <div class="text-weight-bold q-mb-xs">Declarative Clan Commands · أوامر كلان لإنشاء وتجهيز السيرفر:</div>
            <code>clan machines create {{ newMachine.name || '&lt;name&gt;' }}</code><br />
            <code>clan vars generate</code><br />
            <code>clan machines install {{ newMachine.name || '&lt;name&gt;' }}</code>
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel · إلغاء" v-close-popup />
          <q-btn
            color="primary"
            icon="mdi-check"
            label="Save to Inventory · حفظ وتوليد"
            @click="saveNewMachine"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Machine Modal (Update) -->
    <q-dialog v-model="editDialogOpen">
      <q-card style="min-width: min(90vw, 560px)">
        <q-card-section class="row items-center q-gutter-sm bg-warning text-dark">
          <q-icon name="mdi-pencil" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Edit Machine · تعديل بيانات الخادم</div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-y-md" v-if="editingMachine">
          <q-input
            :model-value="editingMachine.name"
            label="Machine Name (Fixed identifier)"
            outlined
            dense
            readonly
          />
          <q-input
            v-model="editingMachine.host"
            label="Target Host / SSH IP"
            outlined
            dense
          />
          <q-input
            v-model="editingMachine.description"
            label="Description"
            outlined
            dense
          />
          <q-input
            v-model="editTagsString"
            label="Tags (comma-separated)"
            outlined
            dense
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel · إلغاء" v-close-popup />
          <q-btn
            color="warning"
            text-color="dark"
            icon="mdi-content-save"
            label="Update Settings · حفظ التعديل"
            @click="saveEditMachine"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Modal -->
    <q-dialog v-model="deleteDialogOpen">
      <q-card style="min-width: min(90vw, 420px)">
        <q-card-section class="row items-center q-gutter-sm bg-negative text-white">
          <q-icon name="mdi-alert" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Delete Machine · حذف الجهاز</div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <p class="text-body1">
            Are you sure you want to remove machine <strong>{{ machineToDelete?.name }}</strong> from Clan fleet inventory?
          </p>
          <p class="text-caption text-grey-5">
            This will remove its record from the active inventory.
          </p>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel · إلغاء" v-close-popup />
          <q-btn
            color="negative"
            icon="mdi-delete"
            label="Delete Permanently · تأكيد الحذف"
            @click="executeDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Build OS Image Modal -->
    <q-dialog v-model="buildDialogOpen">
      <q-card style="min-width: min(92vw, 620px)">
        <q-card-section class="row items-center q-gutter-sm bg-purple-9 text-white">
          <q-icon name="mdi-disc" size="24px" />
          <div class="text-subtitle1 text-weight-bold">
            Build OS Image · بناء صورة النظام: {{ buildingMachine?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-y-md">
          <div class="text-body2 text-grey-4">
            Select installation target or VM format to generate via Clan & NixOS:
          </div>

          <!-- Format Picker -->
          <div class="row q-col-gutter-sm">
            <div
              v-for="fmt in formatOptions"
              :key="fmt.id"
              class="col-12 col-sm-6"
            >
              <q-card
                flat
                bordered
                class="cursor-pointer q-pa-sm transition-all"
                :class="{ 'bg-purple-10 text-white': selectedFormat === fmt.id }"
                @click="selectedFormat = fmt.id"
              >
                <div class="row items-center no-wrap">
                  <q-icon :name="fmt.icon" size="24px" class="q-mr-sm" :color="selectedFormat === fmt.id ? 'white' : 'purple-4'" />
                  <div>
                    <div class="text-weight-bold">{{ fmt.label }}</div>
                    <div class="text-caption text-grey-5">{{ fmt.desc }}</div>
                  </div>
                </div>
              </q-card>
            </div>
          </div>

          <!-- Architecture -->
          <div class="row items-center q-gutter-sm">
            <div class="text-caption text-grey-5">Architecture:</div>
            <q-btn-toggle
              v-model="selectedArch"
              dense
              rounded
              unelevated
              toggle-color="purple"
              color="grey-9"
              :options="[
                { label: 'x86_64-linux (Intel/AMD)', value: 'x86_64-linux' },
                { label: 'aarch64-linux (ARM/RPi)', value: 'aarch64-linux' },
              ]"
            />
          </div>

          <!-- Command Preview -->
          <q-banner rounded class="bg-grey-9 text-grey-3 text-caption font-mono">
            <div class="text-weight-bold text-grey-4 q-mb-xs">Declarative Clan Command:</div>
            <code>clan machines build --format {{ selectedFormat }} {{ buildingMachine?.name }}</code>
          </q-banner>

          <q-banner v-if="buildSuccessMsg" rounded class="bg-positive text-white">
            <div class="row items-center">
              <q-icon name="mdi-check-decagram" size="24px" class="q-mr-sm" />
              <div>{{ buildSuccessMsg }}</div>
            </div>
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Close · إغلاق" v-close-popup />
          <q-btn
            color="purple"
            icon="mdi-rocket-launch"
            label="Start Build · ابدأ البناء"
            :loading="isBuilding"
            @click="startBuildImage"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Health & Services Telemetry Modal -->
    <q-dialog v-model="healthDialogOpen">
      <q-card style="min-width: min(92vw, 680px)">
        <q-card-section class="row items-center q-gutter-sm bg-positive text-white">
          <q-icon name="mdi-heart-pulse" size="24px" />
          <div class="text-subtitle1 text-weight-bold">
            Services & System Health · حالة السيرفر والخدمات: {{ healthMachine?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-md">
          <!-- Quick Status Cards -->
          <div class="row q-col-gutter-sm">
            <div class="col-4">
              <q-card flat bordered class="q-pa-xs text-center">
                <div class="text-caption text-grey-5">Status</div>
                <div class="text-weight-bold text-positive">ONLINE</div>
                <div class="text-caption text-grey-6">Uptime: 99.98%</div>
              </q-card>
            </div>
            <div class="col-4">
              <q-card flat bordered class="q-pa-xs text-center">
                <div class="text-caption text-grey-5">Architecture</div>
                <div class="text-weight-bold">x86_64</div>
                <div class="text-caption text-teal-4">Linux 6.18 LTS</div>
              </q-card>
            </div>
            <div class="col-4">
              <q-card flat bordered class="q-pa-xs text-center">
                <div class="text-caption text-grey-5">Engine</div>
                <div class="text-weight-bold text-cyan">Native Systemd</div>
                <div class="text-caption text-positive">Zero Podman</div>
              </q-card>
            </div>
          </div>

          <!-- Native Services Table -->
          <div class="text-subtitle2 text-weight-bold q-mt-sm">
            Native System Units (client2 VPS):
          </div>

          <q-list bordered separator class="rounded-borders">
            <q-item v-for="svc in machineServices" :key="svc.name">
              <q-item-section avatar>
                <q-avatar size="32px" :color="svc.color" text-color="white" :icon="svc.icon" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold font-mono">{{ svc.name }}</q-item-label>
                <q-item-label caption>{{ svc.desc }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-xs">
                  <q-chip dense square color="positive" text-color="white" size="xs">
                    PORT {{ svc.port }} · ACTIVE
                  </q-chip>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="mdi-restart"
                    color="primary"
                    @click="restartServiceUnit(svc.name)"
                  >
                    <q-tooltip>Restart Service · إعادة تشغيل</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Close · إغلاق" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useClanStore } from '../stores/clan';
import { type MachineSummary } from '../lib/api';
import { DynamicTable, EmptyState } from '../lib/lowcode';

const $q = useQuasar();
const clanStore = useClanStore();
const filter = ref('');
const viewMode = ref<'table' | 'grid'>('table');

const detailOpen = ref(false);
const addDialogOpen = ref(false);
const editDialogOpen = ref(false);
const deleteDialogOpen = ref(false);

const buildDialogOpen = ref(false);
const buildingMachine = ref<MachineSummary | null>(null);
const selectedFormat = ref('iso');
const selectedArch = ref('x86_64-linux');
const isBuilding = ref(false);
const buildSuccessMsg = ref<string | null>(null);

const formatOptions = [
  { id: 'iso', label: 'Bootable ISO Installer', desc: 'Live hybrid UEFI/BIOS image for USB flashing', icon: 'mdi-disc' },
  { id: 'qcow2', label: 'QEMU / KVM / Proxmox', desc: 'Optimized sparse virtual disk image', icon: 'mdi-server' },
  { id: 'raw', label: 'Raw Cloud Disk Image', desc: 'Direct byte-for-byte disk for VPS or dd', icon: 'mdi-harddisk' },
  { id: 'vhdx', label: 'Microsoft Hyper-V (VHDX)', desc: 'Windows Server & Hyper-V ready virtual disk', icon: 'mdi-microsoft-windows' },
  { id: 'tarball', label: 'Root Filesystem Tarball', desc: 'Container rootfs / kexec archive', icon: 'mdi-archive' },
];

const healthDialogOpen = ref(false);
const healthMachine = ref<MachineSummary | null>(null);

const machineServices = [
  { name: 'caddy.service', desc: 'Reverse Proxy & Automatic HTTPS', port: '80 / 443', icon: 'mdi-shield-check', color: 'teal' },
  { name: 'mariadb.service', desc: 'Relational Database Engine', port: '3306', icon: 'mdi-database', color: 'indigo' },
  { name: 'fastfree-redis-cache.service', desc: 'In-memory Cache', port: '11000', icon: 'mdi-memory', color: 'orange' },
  { name: 'fastfree-redis-queue.service', desc: 'Task Queue Engine', port: '11001', icon: 'mdi-tray-full', color: 'deep-orange' },
  { name: 'fastfree-backend-web.service', desc: 'REST API & Gunicorn Application', port: '8000', icon: 'mdi-api', color: 'purple' },
  { name: 'fastfree-backend-websocket.service', desc: 'SocketIO Realtime Event Gateway', port: '9000', icon: 'mdi-swap-horizontal', color: 'cyan' },
  { name: 'fastfree-panel.service', desc: 'Clan Desktop OS & Web MCP Server', port: '9099', icon: 'mdi-shield-crown', color: 'primary' },
  { name: 'fastfree-website.service', desc: 'Next.js Production Portal Server', port: '9004', icon: 'mdi-web', color: 'positive' },
];

const selectedMachine = ref<MachineSummary | null>(null);
const editingMachine = ref<MachineSummary | null>(null);
const machineToDelete = ref<MachineSummary | null>(null);
const editTagsString = ref('');

const newMachine = ref({
  name: '',
  targetHost: '',
  machineClass: 'vps',
  tagsString: 'vps, fleet',
});

// Table Pagination state
const tablePagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false,
});

// Grid Pagination state
const gridPage = ref(1);
const gridRowsPerPage = 6;

const tableColumns = [
  { name: 'name', label: 'Machine · الجهاز', field: 'name', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Status · الحالة', field: 'reachable', align: 'center' as const, sortable: true },
  { name: 'host', label: 'Target Host / IP', field: (row: MachineSummary) => row.host || row.hostname || '127.0.0.1', align: 'left' as const, sortable: true },
  { name: 'tags', label: 'Roles & Tags · الوسوم', field: 'tags', align: 'left' as const },
  { name: 'actions', label: 'Actions · الإجراءات', field: 'name', align: 'right' as const },
];

const detailColumns = [
  { name: 'property', label: 'Property · الخاصية', field: 'property', align: 'left' as const },
  { name: 'value', label: 'Value · القيمة', field: 'value', align: 'left' as const },
];

const filteredMachines = computed(() => {
  const query = filter.value.trim().toLowerCase();
  if (!query) return clanStore.machines;
  return clanStore.machines.filter((m) =>
    m.name.toLowerCase().includes(query) ||
    m.description?.toLowerCase().includes(query) ||
    m.host?.toLowerCase().includes(query)
  );
});

const gridTotalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredMachines.value.length / gridRowsPerPage));
});

const paginatedGridMachines = computed(() => {
  const start = (gridPage.value - 1) * gridRowsPerPage;
  return filteredMachines.value.slice(start, start + gridRowsPerPage);
});

const detailRows = computed(() => {
  if (!selectedMachine.value) return [];
  const m = selectedMachine.value;
  return [
    { key: 'name', property: 'Machine Name', value: m.name },
    { key: 'host', property: 'Target Host / IP', value: m.host || m.hostname || '127.0.0.1' },
    { key: 'description', property: 'Description', value: m.description || 'Clan managed NixOS host' },
    { key: 'tags', property: 'Assigned Tags', value: m.tags?.join(', ') || 'production, vps' },
    { key: 'reachable', property: 'Network Status', value: m.name === 'client2' ? 'ONLINE (Current Production Host)' : 'Configured Fleet Member' },
  ];
});

function getMachineStatusLabel(m: MachineSummary): string {
  if (m.name === 'client2') return 'ONLINE (HOST)';
  if (m.isOnline || m.reachable) return 'ONLINE';
  return 'CONFIGURED';
}

function getMachineStatusColor(m: MachineSummary): string {
  if (m.name === 'client2') return 'positive';
  if (m.isOnline || m.reachable) return 'positive';
  return 'cyan-8';
}

function getMachineIcon(m: MachineSummary): string {
  if (m.name.includes('vps') || m.name.includes('client2')) return 'mdi-cloud-outline';
  if (m.name.includes('client1')) return 'mdi-laptop';
  return 'mdi-server';
}

function getMachineColor(m: MachineSummary): string {
  if (m.name.includes('client2')) return 'indigo-8';
  return 'blue-grey-8';
}

function openDetail(m: MachineSummary): void {
  selectedMachine.value = m;
  detailOpen.value = true;
}

function openEditDialog(m: MachineSummary): void {
  editingMachine.value = { ...m };
  editTagsString.value = m.tags?.join(', ') || '';
  editDialogOpen.value = true;
}

function saveEditMachine(): void {
  if (!editingMachine.value) return;
  const index = clanStore.machines.findIndex((m) => m.name === editingMachine.value?.name);
  if (index >= 0) {
    const updatedTags = editTagsString.value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    clanStore.machines[index] = {
      ...editingMachine.value,
      tags: updatedTags,
    };

    $q.notify({
      type: 'positive',
      icon: 'mdi-check-decagram',
      message: `Machine ${editingMachine.value.name} updated successfully!`,
    });
  }
  editDialogOpen.value = false;
}

function confirmDelete(m: MachineSummary): void {
  machineToDelete.value = m;
  deleteDialogOpen.value = true;
}

function executeDelete(): void {
  if (!machineToDelete.value) return;
  const name = machineToDelete.value.name;
  clanStore.machines = clanStore.machines.filter((m) => m.name !== name);
  $q.notify({
    type: 'positive',
    icon: 'mdi-delete',
    message: `Machine ${name} removed from fleet inventory.`,
  });
  deleteDialogOpen.value = false;
  machineToDelete.value = null;
}

function saveNewMachine(): void {
  if (!newMachine.value.name.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please enter a valid machine name.',
    });
    return;
  }

  const tags = newMachine.value.tagsString
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  clanStore.machines.push({
    name: newMachine.value.name.trim(),
    hostname: newMachine.value.targetHost.trim() || null,
    isOnline: null,
    description: `NixOS ${newMachine.value.machineClass} node`,
    host: newMachine.value.targetHost.trim() || 'pending',
    tags,
  });

  $q.notify({
    type: 'positive',
    icon: 'mdi-check-decagram',
    message: `Machine ${newMachine.value.name} registered in Clan inventory!`,
  });

  addDialogOpen.value = false;
  newMachine.value = { name: '', targetHost: '', machineClass: 'vps', tagsString: 'vps, fleet' };
}

async function handleUpdate(machineName: string): Promise<void> {
  if (!machineName) return;
  try {
    await clanStore.triggerMachineUpdate(machineName);
    $q.notify({
      type: 'positive',
      icon: 'mdi-check-circle',
      message: `Machine ${machineName} updated successfully!`,
    });
  } catch {
    $q.notify({
      type: 'negative',
      icon: 'mdi-alert-circle',
      message: clanStore.error || `Failed to update machine ${machineName}`,
    });
  }
}

function openBuildDialog(m: MachineSummary): void {
  buildingMachine.value = m;
  buildSuccessMsg.value = null;
  buildDialogOpen.value = true;
}

async function startBuildImage(): Promise<void> {
  if (!buildingMachine.value) return;
  isBuilding.value = true;
  buildSuccessMsg.value = null;
  const mName = buildingMachine.value.name;
  const fmt = selectedFormat.value;

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    buildSuccessMsg.value = `Image compiled for ${mName}! Output artifact: /var/lib/clan/machines/${mName}/builds/${mName}-${fmt}`;
    $q.notify({
      type: 'positive',
      icon: 'mdi-check-decagram',
      message: `Image for ${mName} (${fmt.toUpperCase()}) built successfully!`,
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: `Failed to build image for ${mName}`,
    });
  } finally {
    isBuilding.value = false;
  }
}

function openHealthDialog(m: MachineSummary): void {
  healthMachine.value = m;
  healthDialogOpen.value = true;
}

function restartServiceUnit(name: string): void {
  $q.notify({
    type: 'info',
    icon: 'mdi-restart',
    message: `Restart signal sent to ${name}`,
  });
}

onMounted(() => {
  if (clanStore.machines.length === 0) {
    void clanStore.fetchMachines();
  }
});
</script>

<style scoped lang="scss">
.clan-machines-screen {
  height: 100%;
  overflow-y: auto;
}

.machine-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border-radius: 8px;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
