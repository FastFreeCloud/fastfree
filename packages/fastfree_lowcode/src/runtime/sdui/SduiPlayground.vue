<template>
  <div class="sdui-playground full-width column">
    <!-- Top Global Header & Toolbar -->
    <header class="sdui-playground__header q-pa-sm bg-grey-10 text-white row items-center justify-between no-wrap shadow-2">
      <!-- Title & Branding -->
      <div class="row items-center q-gutter-sm no-wrap">
        <q-icon name="developer_board" size="28px" color="primary" />
        <div>
          <div class="text-subtitle1 text-weight-bold row items-center q-gutter-xs">
            <span>SDUI Playground</span>
            <q-badge color="primary" label="v1.0" class="q-ml-xs text-caption" />
          </div>
          <div class="text-caption text-grey-5 gt-xs">
            محرر واجهات المستخدم المعتمدة على الخادم (Server-Driven UI) التفاعلي الحي
          </div>
        </div>
      </div>

      <!-- Presets Toolbar (قوالب جاهزة) -->
      <div class="row items-center q-gutter-xs">
        <span class="text-caption text-grey-4 q-mr-xs gt-sm">القوالب الجاهزة:</span>
        <q-btn-toggle
          v-model="activePresetId"
          dense
          rounded
          unelevated
          toggle-color="primary"
          color="grey-9"
          text-color="grey-4"
          :options="presetOptions"
          @update:model-value="onPresetChange"
        />
      </div>

      <!-- Right Utility Actions & Layout Controls -->
      <div class="row items-center q-gutter-xs no-wrap">
        <!-- Layout Mode Toggle (Split / Editor / Preview) -->
        <q-btn-group rounded flat class="gt-xs">
          <q-btn
            dense
            flat
            round
            icon="view_column"
            :color="viewMode === 'split' ? 'primary' : 'grey-5'"
            @click="viewMode = 'split'"
          >
            <q-tooltip>عرض منقسم (Split Screen)</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            round
            icon="code"
            :color="viewMode === 'editor' ? 'primary' : 'grey-5'"
            @click="viewMode = 'editor'"
          >
            <q-tooltip>المحرر فقط (Code Only)</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            round
            icon="visibility"
            :color="viewMode === 'preview' ? 'primary' : 'grey-5'"
            @click="viewMode = 'preview'"
          >
            <q-tooltip>العرض الحي فقط (Preview Only)</q-tooltip>
          </q-btn>
        </q-btn-group>

        <q-separator vertical dark inset class="q-mx-xs gt-xs" />

        <!-- Format JSON -->
        <q-btn
          dense
          flat
          color="amber"
          icon="auto_fix_high"
          label="تنسيق"
          class="gt-xs"
          @click="formatJson"
        >
          <q-tooltip>تنسيق الكود (Format JSON)</q-tooltip>
        </q-btn>

        <!-- Copy JSON -->
        <q-btn
          dense
          flat
          color="cyan"
          icon="content_copy"
          @click="copyJson"
        >
          <q-tooltip>نسخ JSON إلى الحافظة</q-tooltip>
        </q-btn>

        <!-- Reset to Default -->
        <q-btn
          dense
          flat
          color="negative"
          icon="restart_alt"
          @click="resetToDefault"
        >
          <q-tooltip>استعادة القالب الافتراضي</q-tooltip>
        </q-btn>

        <!-- Toggle State Inspector Drawer -->
        <q-btn
          dense
          flat
          round
          :color="showStateInspector ? 'positive' : 'grey-5'"
          icon="data_object"
          @click="showStateInspector = !showStateInspector"
        >
          <q-tooltip>لوحة فحص الحالة (State Inspector)</q-tooltip>
        </q-btn>
      </div>
    </header>

    <!-- Error Banner (Real-time Syntax Alert) -->
    <q-banner
      v-if="syntaxError"
      inline-actions
      dense
      class="sdui-playground__error-banner bg-negative text-white q-px-md q-py-xs shadow-2 animate-fade"
    >
      <template #avatar>
        <q-icon name="report_problem" color="white" size="24px" />
      </template>
      <div class="row items-center q-gutter-sm">
        <span class="text-weight-bold">خطأ في قواعد كود JSON:</span>
        <span class="text-body2 text-amber-2">
          سطر {{ syntaxError.line }}، عمود {{ syntaxError.column }} — {{ syntaxError.message }}
        </span>
      </div>
      <template #action>
        <q-btn flat dense color="white" label="تراجع" icon="undo" @click="undoLastValid" />
      </template>
    </q-banner>

    <!-- Mobile Screen Tabs (When Screen lt md) -->
    <div v-if="$q.screen.lt.md" class="bg-grey-9 text-white">
      <q-tabs
        v-model="mobileActiveTab"
        dense
        align="justify"
        active-color="primary"
        indicator-color="primary"
        class="text-grey-4"
      >
        <q-tab name="editor" icon="code" label="محرر JSON" />
        <q-tab name="preview" icon="visibility" label="العرض الحي" />
      </q-tabs>
    </div>

    <!-- Main Workspace Area -->
    <div class="sdui-playground__workspace col row no-wrap overflow-hidden relative-position">
      <!-- Desktop Splitter Mode -->
      <q-splitter
        v-if="!$q.screen.lt.md && viewMode === 'split'"
        v-model="splitterRatio"
        :limits="[20, 80]"
        class="full-width full-height"
        separator-class="sdui-playground__splitter-sep bg-grey-8"
      >
        <!-- Before Slot: Code Editor Pane -->
        <template #before>
          <div class="full-width full-height column bg-grey-10">
            <!-- Pane Subheader -->
            <div class="sdui-pane-header q-px-md q-py-xs row items-center justify-between bg-dark text-grey-4 border-bottom">
              <div class="row items-center q-gutter-xs">
                <q-icon name="code" size="18px" color="amber" />
                <span class="text-caption text-weight-medium">محرر JSON (Live AST)</span>
              </div>
              <div class="row items-center q-gutter-xs">
                <q-badge
                  :color="syntaxError ? 'negative' : 'positive'"
                  :label="syntaxError ? 'خطأ صيغة' : 'JSON سليم'"
                  class="text-weight-bold"
                />
                <span class="text-caption text-grey-6">{{ lineCount }} سطر</span>
              </div>
            </div>

            <!-- Code Editor Container with Gutter & Monospace Textarea -->
            <div class="sdui-code-editor col row no-wrap relative-position overflow-hidden">
              <!-- Line Numbers Gutter -->
              <div
                ref="gutterRef"
                class="sdui-code-editor__gutter q-py-sm q-px-xs text-right select-none text-grey-6 font-mono"
              >
                <div
                  v-for="lineNum in lineCount"
                  :key="lineNum"
                  class="sdui-code-editor__line-number"
                  :class="{ 'text-negative text-bold': syntaxError && syntaxError.line === lineNum }"
                >
                  {{ lineNum }}
                </div>
              </div>

              <!-- Main Textarea -->
              <textarea
                ref="textareaRef"
                v-model="editorCode"
                class="sdui-code-editor__textarea col q-pa-sm font-mono"
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                placeholder="أدخل هيكل SDUI بتنسيق JSON هنا..."
                @scroll="syncScroll"
                @keydown="onEditorKeyDown"
              ></textarea>
            </div>
          </div>
        </template>

        <!-- After Slot: Live Render Pane -->
        <template #after>
          <div class="full-width full-height column bg-grey-2">
            <!-- Pane Subheader -->
            <div class="sdui-pane-header q-px-md q-py-xs row items-center justify-between bg-grey-3 text-grey-9 border-bottom">
              <div class="row items-center q-gutter-xs">
                <q-icon name="preview" size="18px" color="primary" />
                <span class="text-caption text-weight-bold">العرض الحي (Interactive Render)</span>
              </div>
              <div class="row items-center q-gutter-sm">
                <q-badge color="teal" :label="`عقد: ${nodeCount}`" />
                <q-btn
                  dense
                  flat
                  size="sm"
                  icon="refresh"
                  label="تحديث يدوي"
                  color="grey-8"
                  @click="forceRerender"
                />
              </div>
            </div>

            <!-- Live Rendering Container with Error Boundary -->
            <div class="sdui-preview-container col q-pa-md overflow-auto relative-position">
              <!-- Runtime Render Error Fallback -->
              <div v-if="renderError" class="q-pa-md">
                <q-banner class="bg-negative text-white rounded-borders shadow-2">
                  <template #avatar>
                    <q-icon name="error_outline" size="32px" />
                  </template>
                  <div class="text-subtitle1 text-weight-bold">تعذر رسم الشجرة الحية (Render Error)</div>
                  <div class="text-body2 text-amber-1 q-mt-xs">{{ renderError.message }}</div>
                  <template #action>
                    <q-btn flat color="white" label="إعادة المحاولة" @click="renderError = null" />
                  </template>
                </q-banner>
              </div>

              <!-- Real Live SDUI Tree -->
              <div v-else-if="parsedRootNode" :key="renderKey" class="sdui-live-tree">
                <SduiNode
                  :node="parsedRootNode"
                  :state="playgroundState"
                  @action="handleDispatchedAction"
                />
              </div>

              <!-- Empty State -->
              <div v-else class="full-width full-height row flex-center text-grey-6">
                <div class="text-center">
                  <q-icon name="layers_clear" size="48px" />
                  <div class="text-subtitle1 q-mt-sm">لا يوجد كائن SDUI صالح للعرض</div>
                  <div class="text-caption">اختر أحد القوالب الجاهزة أعلاه للبدء</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </q-splitter>

      <!-- Single Pane Modes (Editor Only or Preview Only on Desktop) -->
      <div v-else-if="!$q.screen.lt.md && viewMode === 'editor'" class="full-width full-height column bg-grey-10">
        <!-- Editor Only -->
        <div class="sdui-pane-header q-px-md q-py-xs row items-center justify-between bg-dark text-grey-4 border-bottom">
          <div class="row items-center q-gutter-xs">
            <q-icon name="code" size="18px" color="amber" />
            <span class="text-caption text-weight-medium">محرر JSON — وضع ملء الشاشة</span>
          </div>
          <q-btn dense flat round icon="close" color="grey-5" @click="viewMode = 'split'" />
        </div>
        <div class="sdui-code-editor col row no-wrap relative-position overflow-hidden">
          <div ref="gutterRef" class="sdui-code-editor__gutter q-py-sm q-px-xs text-right select-none text-grey-6 font-mono">
            <div v-for="lineNum in lineCount" :key="lineNum" class="sdui-code-editor__line-number">
              {{ lineNum }}
            </div>
          </div>
          <textarea
            ref="textareaRef"
            v-model="editorCode"
            class="sdui-code-editor__textarea col q-pa-sm font-mono"
            spellcheck="false"
            @scroll="syncScroll"
            @keydown="onEditorKeyDown"
          ></textarea>
        </div>
      </div>

      <div v-else-if="!$q.screen.lt.md && viewMode === 'preview'" class="full-width full-height column bg-grey-2">
        <!-- Preview Only -->
        <div class="sdui-pane-header q-px-md q-py-xs row items-center justify-between bg-grey-3 text-grey-9 border-bottom">
          <div class="row items-center q-gutter-xs">
            <q-icon name="preview" size="18px" color="primary" />
            <span class="text-caption text-weight-bold">العرض الحي — وضع ملء الشاشة</span>
          </div>
          <q-btn dense flat round icon="close" color="grey-8" @click="viewMode = 'split'" />
        </div>
        <div class="sdui-preview-container col q-pa-md overflow-auto">
          <SduiNode
            v-if="parsedRootNode"
            :key="renderKey"
            :node="parsedRootNode"
            :state="playgroundState"
            @action="handleDispatchedAction"
          />
        </div>
      </div>

      <!-- Mobile Tabbed Layout -->
      <div v-else class="full-width full-height column">
        <!-- Mobile Editor -->
        <div v-show="mobileActiveTab === 'editor'" class="col full-height column bg-grey-10">
          <textarea
            v-model="editorCode"
            class="sdui-code-editor__textarea col q-pa-sm font-mono"
            spellcheck="false"
            @keydown="onEditorKeyDown"
          ></textarea>
        </div>
        <!-- Mobile Preview -->
        <div v-show="mobileActiveTab === 'preview'" class="col full-height q-pa-sm bg-grey-2 overflow-auto">
          <SduiNode
            v-if="parsedRootNode"
            :key="renderKey"
            :node="parsedRootNode"
            :state="playgroundState"
            @action="handleDispatchedAction"
          />
        </div>
      </div>

      <!-- Bottom Collapsible State & Action History Drawer -->
      <div
        v-if="showStateInspector"
        class="sdui-state-drawer absolute-bottom bg-dark text-white shadow-10"
      >
        <div class="row items-center justify-between q-px-md q-py-xs bg-grey-9 border-bottom">
          <div class="row items-center q-gutter-sm">
            <q-icon name="data_object" size="18px" color="positive" />
            <span class="text-caption text-weight-bold">فاحص الحالة التفاعلية (Reactive State) ومسجل الأحداث</span>
            <q-badge color="positive" :label="`${Object.keys(playgroundState).length} حقول`" />
          </div>
          <div class="row items-center q-gutter-xs">
            <q-btn
              dense
              flat
              size="sm"
              color="amber"
              icon="clear_all"
              label="تصفية الأحداث"
              @click="actionLogs = []"
            />
            <q-btn
              dense
              flat
              round
              size="sm"
              icon="close"
              color="grey-4"
              @click="showStateInspector = false"
            />
          </div>
        </div>

        <div class="row no-wrap sdui-state-drawer__body q-pa-sm q-gutter-sm">
          <!-- State Inspector Column -->
          <div class="col-6 column">
            <div class="text-caption text-grey-4 text-weight-bold q-mb-xs">الحالة الحالية (state):</div>
            <pre class="sdui-state-pre col bg-black q-pa-sm rounded-borders font-mono text-positive overflow-auto text-caption">{{ JSON.stringify(playgroundState, null, 2) }}</pre>
          </div>

          <!-- Actions Log Column -->
          <div class="col-6 column">
            <div class="text-caption text-grey-4 text-weight-bold q-mb-xs">سجل الأحداث الأخيرة (Action Logs):</div>
            <div class="col bg-black q-pa-xs rounded-borders overflow-auto">
              <div v-if="actionLogs.length === 0" class="text-caption text-grey-6 text-center q-py-md">
                لم يتم تنفيذ أي أحداث بعد. انقر على أي زر أو مفتاح تفاعلي!
              </div>
              <div
                v-for="(log, idx) in actionLogs"
                :key="idx"
                class="q-pa-xs q-mb-xs rounded-borders bg-grey-9 text-caption row items-center justify-between"
              >
                <div class="row items-center q-gutter-xs">
                  <q-badge :color="getActionBadgeColor(log.type)" :label="log.type" />
                  <span class="text-grey-3 font-mono">{{ log.summary }}</span>
                </div>
                <span class="text-grey-6 text-caption">{{ log.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  nextTick,
  onErrorCaptured,
  onMounted
} from 'vue'
import { Notify } from 'quasar'
import SduiNode from './SduiNode.vue'
import type { SduiNode as SduiNodeType, SduiScreen, SduiAction } from './types'

defineOptions({
  name: 'SduiPlayground'
})

// ==========================================
// PRESET DEFINITIONS (3 Comprehensive Screens)
// ==========================================

interface PlaygroundPreset {
  id: string
  name: string
  label: string
  initialState: Record<string, any>
  json: SduiScreen
}

const PRESET_SERVER_SIZING: PlaygroundPreset = {
  id: 'server-sizing',
  name: 'server_sizing',
  label: 'مواصفات العتاد (Server)',
  initialState: {
    cpu_cores: 16,
    ram_gb: 64,
    disk_gb: 500,
    server_role: 'NixOS Mesh Worker',
    backup_enabled: true
  },
  json: {
    id: 'screen-server-sizing',
    title: 'تخصيص مواصفات الخادم | Server Sizing',
    root: {
      type: 'QCard',
      props: {
        flat: false,
        bordered: true,
        class: 'q-pa-md shadow-3 rounded-borders bg-white'
      },
      children: [
        {
          type: 'div',
          class: 'row items-center q-mb-md',
          children: [
            {
              type: 'QIcon',
              props: { name: 'dns', size: '36px', color: 'primary', class: 'q-mr-sm' }
            },
            {
              type: 'div',
              children: [
                {
                  type: 'div',
                  class: 'text-h6 text-weight-bold text-primary',
                  text: 'تخصيص مواصفات العتاد (Server Hardware Sizing)'
                },
                {
                  type: 'div',
                  class: 'text-caption text-grey-7',
                  text: 'حدد المعالج، الذاكرة العشوائية وسعة التخزين لعقدة NixOS في شبكة Clan'
                }
              ]
            }
          ]
        },
        { type: 'QSeparator', props: { class: 'q-my-md' } },
        {
          type: 'div',
          class: 'row q-col-gutter-md q-mb-lg',
          children: [
            {
              type: 'div',
              class: 'col-12 col-sm-4',
              children: [
                {
                  type: 'QCard',
                  props: { flat: true, bordered: true, class: 'bg-blue-1 text-center q-pa-sm shadow-1' },
                  children: [
                    { type: 'div', class: 'text-caption text-blue-9 text-weight-bold', text: 'أنوية المعالج (vCPU)' },
                    { type: 'div', class: 'text-h5 text-bold text-primary q-mt-xs', text: '{{ state.cpu_cores }} Cores' }
                  ]
                }
              ]
            },
            {
              type: 'div',
              class: 'col-12 col-sm-4',
              children: [
                {
                  type: 'QCard',
                  props: { flat: true, bordered: true, class: 'bg-green-1 text-center q-pa-sm shadow-1' },
                  children: [
                    { type: 'div', class: 'text-caption text-green-9 text-weight-bold', text: 'الذاكرة (RAM)' },
                    { type: 'div', class: 'text-h5 text-bold text-positive q-mt-xs', text: '{{ state.ram_gb }} GB ECC' }
                  ]
                }
              ]
            },
            {
              type: 'div',
              class: 'col-12 col-sm-4',
              children: [
                {
                  type: 'QCard',
                  props: { flat: true, bordered: true, class: 'bg-purple-1 text-center q-pa-sm shadow-1' },
                  children: [
                    { type: 'div', class: 'text-caption text-purple-9 text-weight-bold', text: 'التخزين السريع (NVMe)' },
                    { type: 'div', class: 'text-h5 text-bold text-purple q-mt-xs', text: '{{ state.disk_gb }} GB SSD' }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'div',
          class: 'q-mb-lg',
          children: [
            {
              type: 'div',
              class: 'text-subtitle2 text-weight-bold text-grey-9 q-mb-xs',
              text: 'عدد الأنوية الافتراضية (vCPU Cores):'
            },
            {
              type: 'QSlider',
              model: 'cpu_cores',
              props: {
                min: 2,
                max: 64,
                step: 2,
                label: true,
                labelAlways: true,
                markers: true,
                color: 'primary'
              }
            }
          ]
        },
        {
          type: 'div',
          class: 'q-mb-lg',
          children: [
            {
              type: 'div',
              class: 'text-subtitle2 text-weight-bold text-grey-9 q-mb-xs',
              text: 'سعة الذاكرة العشوائية (RAM in Gigabytes):'
            },
            {
              type: 'QSlider',
              model: 'ram_gb',
              props: {
                min: 4,
                max: 256,
                step: 4,
                label: true,
                labelAlways: true,
                markers: true,
                color: 'positive'
              }
            }
          ]
        },
        {
          type: 'div',
          class: 'q-mb-lg',
          children: [
            {
              type: 'div',
              class: 'text-subtitle2 text-weight-bold text-grey-9 q-mb-xs',
              text: 'سعة قرص التخزين فائق السرعة (NVMe Storage in GB):'
            },
            {
              type: 'QSlider',
              model: 'disk_gb',
              props: {
                min: 50,
                max: 2000,
                step: 50,
                label: true,
                labelAlways: true,
                markers: true,
                color: 'purple'
              }
            }
          ]
        },
        {
          type: 'div',
          class: 'q-mb-md',
          children: [
            {
              type: 'QToggle',
              model: 'backup_enabled',
              props: {
                label: 'تفعيل النسخ الاحتياطي اليومي المؤتمت (BorgBackup)',
                color: 'primary'
              }
            }
          ]
        },
        { type: 'QSeparator', props: { class: 'q-my-md' } },
        {
          type: 'div',
          class: 'row justify-between items-center',
          children: [
            {
              type: 'QBtn',
              props: {
                label: 'استعادة القيم الافتراضية',
                flat: true,
                color: 'grey-7',
                icon: 'refresh'
              },
              events: {
                click: [
                  { type: 'state:set', target: 'cpu_cores', payload: 16 },
                  { type: 'state:set', target: 'ram_gb', payload: 64 },
                  { type: 'state:set', target: 'disk_gb', payload: 500 },
                  { type: 'notify', payload: { message: 'تمت استعادة القيم الافتراضية للعتاد', color: 'info' } }
                ]
              }
            },
            {
              type: 'QBtn',
              props: {
                label: 'اعتماد مواصفات الخادم',
                color: 'primary',
                unelevated: true,
                icon: 'check_circle'
              },
              events: {
                click: [
                  {
                    type: 'tauri:invoke',
                    command: 'save_server_sizing',
                    payload: { role: 'nixos_node' }
                  },
                  {
                    type: 'notify',
                    payload: {
                      message: 'تم حفظ مواصفات الخادم بنجاح والتحقق من التوافق!',
                      color: 'positive',
                      icon: 'verified'
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  }
}

const PRESET_WIREGUARD: PlaygroundPreset = {
  id: 'wireguard-network',
  name: 'wireguard_network',
  label: 'شبكة WireGuard',
  initialState: {
    wg_ip: '10.100.0.1/24',
    wg_port: '51820',
    wg_private_key: 'aXJ4OWZhc3RmcmVlX2tleV9kZW1vX3ZhbHVlPT0=',
    wg_endpoint: 'mesh.fastfree.cloud:51820',
    wg_kill_switch: true,
    wg_hw_accel: true
  },
  json: {
    id: 'screen-wireguard-network',
    title: 'إعدادات شبكة WireGuard المشفرة',
    root: {
      type: 'QCard',
      props: {
        flat: false,
        bordered: true,
        class: 'q-pa-md shadow-3 rounded-borders bg-white'
      },
      children: [
        {
          type: 'div',
          class: 'row items-center q-mb-md',
          children: [
            {
              type: 'QIcon',
              props: { name: 'security', size: '36px', color: 'teal', class: 'q-mr-sm' }
            },
            {
              type: 'div',
              children: [
                {
                  type: 'div',
                  class: 'text-h6 text-weight-bold text-teal-9',
                  text: 'إعدادات شبكة WireGuard المشفرة (Mesh Tunnel)'
                },
                {
                  type: 'div',
                  class: 'text-caption text-grey-7',
                  text: 'تكوين أنفاق الاتصال الآمن بين عقد Clan بتشفير ChaCha20-Poly1305'
                }
              ]
            }
          ]
        },
        { type: 'QSeparator', props: { class: 'q-my-md' } },
        {
          type: 'div',
          class: 'row q-col-gutter-md q-mb-md',
          children: [
            {
              type: 'div',
              class: 'col-12 col-md-6',
              children: [
                {
                  type: 'QInput',
                  model: 'wg_ip',
                  props: {
                    label: 'عنوان واجهة النفق (Interface IPv4/CIDR)',
                    outlined: true,
                    dense: true,
                    color: 'teal',
                    prefix: 'IP:'
                  }
                }
              ]
            },
            {
              type: 'div',
              class: 'col-12 col-md-6',
              children: [
                {
                  type: 'QInput',
                  model: 'wg_port',
                  props: {
                    label: 'منفذ الاستماع (Listen Port UDP)',
                    outlined: true,
                    dense: true,
                    color: 'teal',
                    prefix: 'Port:'
                  }
                }
              ]
            },
            {
              type: 'div',
              class: 'col-12',
              children: [
                {
                  type: 'QInput',
                  model: 'wg_private_key',
                  props: {
                    label: 'المفتاح الخاص المشفر (Private Key Base64)',
                    outlined: true,
                    dense: true,
                    color: 'teal',
                    type: 'password'
                  }
                }
              ]
            },
            {
              type: 'div',
              class: 'col-12',
              children: [
                {
                  type: 'QInput',
                  model: 'wg_endpoint',
                  props: {
                    label: 'نقطة اتصال النظير المركزي (Peer Public Endpoint)',
                    outlined: true,
                    dense: true,
                    color: 'teal',
                    hint: 'اسم النطاق أو الـ IP مع منفذ الـ UDP'
                  }
                }
              ]
            }
          ]
        },
        {
          type: 'div',
          class: 'column q-gutter-sm q-mb-md',
          children: [
            {
              type: 'QToggle',
              model: 'wg_kill_switch',
              props: {
                label: 'تفعيل مفتاح الإغلاق التلقائي (Kill Switch) لمنع تسريب الحزم خارج النفق',
                color: 'negative'
              }
            },
            {
              type: 'QToggle',
              model: 'wg_hw_accel',
              props: {
                label: 'تسريع تشفير الحزم باستخدام وحدات العتاد (CPU Crypto Acceleration)',
                color: 'teal'
              }
            }
          ]
        },
        { type: 'QSeparator', props: { class: 'q-my-md' } },
        {
          type: 'div',
          class: 'row justify-between items-center',
          children: [
            {
              type: 'QBtn',
              props: {
                label: 'توليد مفاتيح جديدة',
                outline: true,
                color: 'teal',
                icon: 'vpn_key'
              },
              events: {
                click: [
                  {
                    type: 'state:set',
                    target: 'wg_private_key',
                    payload: 'OGJkOWY4ODk0NDY4YjJmY2FkMzM0YWEyMWVmODhjZTg='
                  },
                  {
                    type: 'notify',
                    payload: { message: 'تم توليد زوج مفاتيح تشفير عشوائي آمن', color: 'teal' }
                  }
                ]
              }
            },
            {
              type: 'QBtn',
              props: {
                label: 'حفظ وبدء نفق WireGuard',
                color: 'teal',
                unelevated: true,
                icon: 'bolt'
              },
              events: {
                click: [
                  {
                    type: 'tauri:invoke',
                    command: 'connect_wireguard',
                    payload: { interface: 'wg0' }
                  },
                  {
                    type: 'notify',
                    payload: {
                      message: 'جاري تشغيل واجهة WireGuard والتأكد من المصافحة...',
                      color: 'positive',
                      icon: 'done_all'
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  }
}

const PRESET_PIPELINE: PlaygroundPreset = {
  id: 'provisioning-pipeline',
  name: 'provisioning_pipeline',
  label: 'مسار التثبيت (Pipeline)',
  initialState: {
    deploy_progress: 0.45,
    current_stage: 'بناء حزم NixOS Flakes',
    stage_index: 2,
    target_node: 'nixos-gateway-01'
  },
  json: {
    id: 'screen-provisioning-pipeline',
    title: 'خط أنابيب التثبيت والنشر الآلي',
    root: {
      type: 'QCard',
      props: {
        flat: false,
        bordered: true,
        class: 'q-pa-md shadow-3 rounded-borders bg-white'
      },
      children: [
        {
          type: 'div',
          class: 'row items-center q-mb-md',
          children: [
            {
              type: 'QIcon',
              props: { name: 'rocket_launch', size: '36px', color: 'deep-orange', class: 'q-mr-sm' }
            },
            {
              type: 'div',
              children: [
                {
                  type: 'div',
                  class: 'text-h6 text-weight-bold text-deep-orange-9',
                  text: 'خط أنابيب التثبيت والنشر المؤتمت (Provisioning Pipeline)'
                },
                {
                  type: 'div',
                  class: 'text-caption text-grey-7',
                  text: 'متابعة مراحل بناء وتجهيز عقدة النظام خطوة بخطوة'
                }
              ]
            }
          ]
        },
        { type: 'QSeparator', props: { class: 'q-my-md' } },
        {
          type: 'div',
          class: 'q-mb-lg',
          children: [
            {
              type: 'div',
              class: 'row justify-between items-center q-mb-xs',
              children: [
                {
                  type: 'div',
                  class: 'text-weight-bold text-subtitle1 text-grey-9',
                  text: 'نسبة تقدم عملية النشر:'
                },
                {
                  type: 'QBadge',
                  props: { color: 'deep-orange', class: 'q-pa-xs text-bold text-subtitle2' },
                  text: '{{ state.deploy_progress }}'
                }
              ]
            },
            {
              type: 'QLinearProgress',
              model: 'deploy_progress',
              props: {
                color: 'deep-orange',
                trackColor: 'grey-4',
                size: '18px',
                stripe: true,
                rounded: true,
                class: 'q-my-sm shadow-1'
              }
            },
            {
              type: 'div',
              class: 'text-caption text-grey-8 row items-center q-mt-xs',
              children: [
                {
                  type: 'QIcon',
                  props: { name: 'autorenew', class: 'q-mr-xs', color: 'deep-orange' }
                },
                {
                  type: 'span',
                  text: 'المرحلة قيد المعالجة: {{ state.current_stage }}'
                }
              ]
            }
          ]
        },
        {
          type: 'div',
          class: 'row q-col-gutter-sm q-mb-lg',
          children: [
            {
              type: 'div',
              class: 'col-4',
              children: [
                {
                  type: 'QCard',
                  props: { flat: true, bordered: true, class: 'bg-green-1 q-pa-sm text-center shadow-1' },
                  children: [
                    { type: 'QIcon', props: { name: 'check_circle', color: 'positive', size: '28px' } },
                    { type: 'div', class: 'text-caption text-weight-bold text-green-9 q-mt-xs', text: '1. تقسيم الأقراص' }
                  ]
                }
              ]
            },
            {
              type: 'div',
              class: 'col-4',
              children: [
                {
                  type: 'QCard',
                  props: { flat: true, bordered: true, class: 'bg-orange-1 q-pa-sm text-center shadow-1' },
                  children: [
                    { type: 'QIcon', props: { name: 'settings', color: 'warning', size: '28px' } },
                    { type: 'div', class: 'text-caption text-weight-bold text-orange-9 q-mt-xs', text: '2. بناء NixOS' }
                  ]
                }
              ]
            },
            {
              type: 'div',
              class: 'col-4',
              children: [
                {
                  type: 'QCard',
                  props: { flat: true, bordered: true, class: 'bg-grey-2 q-pa-sm text-center shadow-1' },
                  children: [
                    { type: 'QIcon', props: { name: 'hourglass_empty', color: 'grey-7', size: '28px' } },
                    { type: 'div', class: 'text-caption text-weight-bold text-grey-8 q-mt-xs', text: '3. تشغيل الخدمات' }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'div',
          class: 'text-subtitle2 q-mb-sm text-weight-bold text-grey-9',
          text: 'محاكاة مراحل النشر التفاعلية (Pipeline Simulation):'
        },
        {
          type: 'div',
          class: 'row q-gutter-sm',
          children: [
            {
              type: 'QBtn',
              props: { label: '0% بدء التثبيت', outline: true, color: 'grey-8', size: 'sm' },
              events: {
                click: [
                  { type: 'state:set', target: 'deploy_progress', payload: 0.05 },
                  { type: 'state:set', target: 'current_stage', payload: 'تهيئة جدول بارتشنات GPT...' },
                  { type: 'notify', payload: { message: 'بدء مرحلة تهيئة الأقراص', color: 'info' } }
                ]
              }
            },
            {
              type: 'QBtn',
              props: { label: '35% تهيئة القرص', outline: true, color: 'primary', size: 'sm' },
              events: {
                click: [
                  { type: 'state:set', target: 'deploy_progress', payload: 0.35 },
                  { type: 'state:set', target: 'current_stage', payload: 'إنشاء نظام ملفات Btrfs مع التشفير...' }
                ]
              }
            },
            {
              type: 'QBtn',
              props: { label: '70% بناء الحزم', outline: true, color: 'warning', size: 'sm' },
              events: {
                click: [
                  { type: 'state:set', target: 'deploy_progress', payload: 0.7 },
                  { type: 'state:set', target: 'current_stage', payload: 'تنزيل وتجميع حزم النواة وخدمات Clan...' }
                ]
              }
            },
            {
              type: 'QBtn',
              props: { label: '100% اكتمال النشر', color: 'positive', unelevated: true, size: 'sm' },
              events: {
                click: [
                  { type: 'state:set', target: 'deploy_progress', payload: 1.0 },
                  { type: 'state:set', target: 'current_stage', payload: 'اكتملت جميع العمليات والنظام جاهز!' },
                  { type: 'notify', payload: { message: 'تم نشر عقدة الخادم بنجاح وبدء تشغيل النطاق!', color: 'positive' } }
                ]
              }
            }
          ]
        }
      ]
    }
  }
}

const presets: Record<string, PlaygroundPreset> = {
  'server-sizing': PRESET_SERVER_SIZING,
  'wireguard-network': PRESET_WIREGUARD,
  'provisioning-pipeline': PRESET_PIPELINE
}

const presetOptions = [
  { label: 'مواصفات العتاد', value: 'server-sizing' },
  { label: 'شبكة WireGuard', value: 'wireguard-network' },
  { label: 'مسار التثبيت', value: 'provisioning-pipeline' }
]

// ==========================================
// REACTIVE COMPONENT STATE
// ==========================================

const activePresetId = ref<string>('server-sizing')
const viewMode = ref<'split' | 'editor' | 'preview'>('split')
const mobileActiveTab = ref<'editor' | 'preview'>('editor')
const splitterRatio = ref<number>(48)
const showStateInspector = ref<boolean>(false)

// Editor code & parsing
const editorCode = ref<string>('')
const lastValidCode = ref<string>('')
const playgroundState = reactive<Record<string, any>>({})
const parsedRootNode = ref<SduiNodeType | null>(null)
const renderKey = ref<number>(0)

// Errors & boundary
interface SyntaxErrorInfo {
  message: string
  line: number
  column: number
}
const syntaxError = ref<SyntaxErrorInfo | null>(null)
const renderError = ref<Error | null>(null)

// Action logs
interface ActionLogEntry {
  type: string
  summary: string
  time: string
}
const actionLogs = ref<ActionLogEntry[]>([])

// Editor DOM references
const gutterRef = ref<HTMLDivElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// ==========================================
// LINE NUMBERS & COMPUTED STATS
// ==========================================

const lineCount = computed(() => {
  return editorCode.value.split('\n').length || 1
})

const nodeCount = computed(() => {
  if (!parsedRootNode.value) return 0
  let count = 0
  function walk(node: SduiNodeType) {
    count++
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(walk)
    }
  }
  walk(parsedRootNode.value)
  return count
})

// ==========================================
// REAL-TIME COMPILER & ERROR PARSER
// ==========================================

function calculateLineAndCol(text: string, position: number): { line: number; column: number } {
  const safePos = Math.max(0, Math.min(position, text.length))
  const slice = text.slice(0, safePos)
  const lines = slice.split('\n')
  const line = lines.length
  const column = lines[lines.length - 1].length + 1
  return { line, column }
}

function parseSyntaxError(err: Error, text: string): SyntaxErrorInfo {
  let line = 1
  let column = 1

  // Extract from "at position 123"
  const posMatch = err.message.match(/at position (\d+)/i)
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10)
    const loc = calculateLineAndCol(text, pos)
    line = loc.line
    column = loc.column
  } else {
    // Extract from "line 3 column 5"
    const lineMatch = err.message.match(/line (\d+)/i)
    const colMatch = err.message.match(/column (\d+)/i)
    if (lineMatch) line = parseInt(lineMatch[1], 10)
    if (colMatch) column = parseInt(colMatch[1], 10)
  }

  return {
    message: err.message.replace(/^JSON\.parse:\s*/, ''),
    line,
    column
  }
}

/**
 * Real-time watcher parsing JSON instantaneously with graceful fallback
 */
watch(
  editorCode,
  (newCode) => {
    if (!newCode || !newCode.trim()) {
      syntaxError.value = null
      parsedRootNode.value = null
      return
    }

    try {
      const parsed = JSON.parse(newCode)
      syntaxError.value = null
      lastValidCode.value = newCode

      // Extract SduiNode root
      if (parsed && typeof parsed === 'object') {
        if (parsed.root && typeof parsed.root === 'object') {
          parsedRootNode.value = parsed.root
        } else if (parsed.type) {
          parsedRootNode.value = parsed
        }

        // Merge initial state if present in JSON and not yet set
        if (parsed.state && typeof parsed.state === 'object') {
          for (const [k, v] of Object.entries(parsed.state)) {
            if (!(k in playgroundState)) {
              playgroundState[k] = v
            }
          }
        }
      }
    } catch (err: any) {
      // Capture error details without crashing the app
      syntaxError.value = parseSyntaxError(err, newCode)
      // We retain parsedRootNode.value to avoid screen flickering while user is typing
    }
  },
  { immediate: false }
)

// ==========================================
// PRESET LOADING & RESET
// ==========================================

function loadPreset(presetKey: string) {
  const preset = presets[presetKey] || PRESET_SERVER_SIZING
  activePresetId.value = presetKey

  // Reset & populate state
  for (const k of Object.keys(playgroundState)) {
    delete playgroundState[k]
  }
  Object.assign(playgroundState, JSON.parse(JSON.stringify(preset.initialState)))

  // Populate editor
  editorCode.value = JSON.stringify(preset.json, null, 2)
  lastValidCode.value = editorCode.value
  parsedRootNode.value = preset.json.root
  syntaxError.value = null
  renderError.value = null
  renderKey.value++
}

function onPresetChange(newKey: string) {
  loadPreset(newKey)
}

function resetToDefault() {
  loadPreset(activePresetId.value)
  Notify.create({
    message: 'تمت استعادة القالب الافتراضي بنجاح',
    color: 'info',
    icon: 'restore',
    position: 'top',
    timeout: 2000
  })
}

function undoLastValid() {
  if (lastValidCode.value) {
    editorCode.value = lastValidCode.value
  }
}

// ==========================================
// UTILITY ACTIONS (Format, Copy)
// ==========================================

function formatJson() {
  try {
    const obj = JSON.parse(editorCode.value)
    editorCode.value = JSON.stringify(obj, null, 2)
    syntaxError.value = null
    Notify.create({
      message: 'تم تنسيق كود JSON بنجاح',
      color: 'positive',
      icon: 'check',
      position: 'top',
      timeout: 1500
    })
  } catch (err: any) {
    syntaxError.value = parseSyntaxError(err, editorCode.value)
    Notify.create({
      message: 'تعذر تنسيق الكود لوجود أخطاء في القواعد',
      color: 'negative',
      icon: 'error',
      position: 'top',
      timeout: 2500
    })
  }
}

async function copyJson() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(editorCode.value)
    } else {
      const el = document.createElement('textarea')
      el.value = editorCode.value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    Notify.create({
      message: 'تم نسخ كود JSON إلى الحافظة',
      color: 'positive',
      icon: 'content_copy',
      position: 'top',
      timeout: 2000
    })
  } catch (err) {
    Notify.create({
      message: 'فشل النسخ إلى الحافظة',
      color: 'negative',
      icon: 'warning',
      position: 'top'
    })
  }
}

function forceRerender() {
  renderKey.value++
}

// ==========================================
// EDITOR KEYBOARD & SCROLL SYNC
// ==========================================

function onEditorKeyDown(e: KeyboardEvent) {
  // Support Tab key indentation
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = textareaRef.value
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = editorCode.value

    editorCode.value = value.substring(0, start) + '  ' + value.substring(end)
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
    })
  }
}

function syncScroll() {
  if (textareaRef.value && gutterRef.value) {
    gutterRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

// ==========================================
// ACTION EVENT TRACKING
// ==========================================

function handleDispatchedAction(payload: {
  action: SduiAction | SduiAction[]
  eventName: string
  event: any
}) {
  const actions = Array.isArray(payload.action) ? payload.action : [payload.action]
  for (const act of actions) {
    const summary = act.type === 'state:set'
      ? `state.${act.target} = ${JSON.stringify(act.payload)}`
      : act.type === 'tauri:invoke'
      ? `tauri.invoke("${act.command}")`
      : act.type === 'notify'
      ? `notify: ${typeof act.payload === 'string' ? act.payload : act.payload?.message || act.command}`
      : JSON.stringify(act)

    actionLogs.value.unshift({
      type: act.type,
      summary,
      time: new Date().toLocaleTimeString()
    })
  }

  // Keep max 30 logs
  if (actionLogs.value.length > 30) {
    actionLogs.value.pop()
  }
}

function getActionBadgeColor(type: string): string {
  switch (type) {
    case 'state:set': return 'positive'
    case 'tauri:invoke': return 'primary'
    case 'notify': return 'amber-9'
    case 'navigate': return 'purple'
    default: return 'grey-7'
  }
}

// ==========================================
// ERROR BOUNDARY
// ==========================================

onErrorCaptured((err: Error, _instance: unknown, info: string) => {
  renderError.value = err
  console.error('[SduiPlayground ErrorBoundary]', err, info)
  return false
})

// ==========================================
// LIFECYCLE
// ==========================================

onMounted(() => {
  loadPreset('server-sizing')
})
</script>

<style scoped>
.sdui-playground {
  height: 100%;
  min-height: 600px;
  background-color: #121218;
  font-family: inherit;
}

.sdui-playground__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 52px;
}

.sdui-pane-header {
  height: 36px;
  font-size: 0.82rem;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.bg-dark.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace;
}

/* Code Editor */
.sdui-code-editor {
  background-color: #181824;
}

.sdui-code-editor__gutter {
  width: 48px;
  background-color: #13131c;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  line-height: 1.6;
  overflow-y: hidden;
  user-select: none;
}

.sdui-code-editor__line-number {
  height: 20.8px;
  padding-right: 4px;
}

.sdui-code-editor__textarea {
  background-color: transparent;
  color: #cdd6f4;
  border: none;
  outline: none;
  resize: none;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
  tab-size: 2;
  caret-color: #89b4fa;
}

.sdui-code-editor__textarea::selection {
  background-color: rgba(137, 180, 250, 0.25);
}

/* Live Preview */
.sdui-preview-container {
  background-color: #f8fafc;
}

.sdui-live-tree {
  max-width: 900px;
  margin: 0 auto;
}

/* Bottom State Drawer */
.sdui-state-drawer {
  height: 220px;
  z-index: 100;
  border-top: 2px solid #1976d2;
}

.sdui-state-drawer__body {
  height: calc(100% - 37px);
}

.sdui-state-pre {
  margin: 0;
  height: 100%;
}

.sdui-playground__splitter-sep {
  width: 6px;
  cursor: col-resize;
  transition: background-color 0.2s;
}

.sdui-playground__splitter-sep:hover {
  background-color: #1976d2 !important;
}

.animate-fade {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
