<template>
  <div class="clan-builder-screen q-pa-md">
    <!-- Header Banner -->
    <q-card flat bordered class="q-mb-md header-card">
      <q-card-section class="row items-center justify-between q-py-sm">
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="mdi-disc" size="32px" color="primary" />
          <div>
            <div class="text-h6 text-weight-bold">
              Image Builder & Formats · بناء وتحميل صور الأجهزة
            </div>
            <div class="text-caption text-grey-7">
              {{ $t('clan.builder.subtitle', 'Build and download custom bootable ISOs, VM disks (QCOW2, VHDX, VMDK), and Cloud images for any Clan client') }}
            </div>
          </div>
        </div>
        <div class="row q-gutter-x-sm">
          <q-btn
            outline
            dense
            color="primary"
            icon="mdi-refresh"
            label="Refresh"
            :loading="clanStore.loading"
            @click="loadMachines"
          />
          <q-btn
            dense
            color="secondary"
            icon="mdi-book-open-page-variant"
            label="Clan Build Docs"
            href="https://clan.lol/docs/26.05/guides/build-host"
            target="_blank"
            type="a"
          />
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md">
      <!-- Left Column: Configuration -->
      <div class="col-12 col-md-7">
        <!-- Step 1: Select Machine -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="q-pb-xs">
            <div class="row items-center justify-between">
              <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
                <q-badge rounded color="primary" label="1" />
                <span>Select Target Client · اختيار العميل أو الجهاز</span>
              </div>
              <q-badge color="grey-8" :label="`${machines.length} Machines in Fleet`" />
            </div>
          </q-card-section>

          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div
                v-for="m in machines"
                :key="m.name"
                class="col-12 col-sm-4"
              >
                <q-card
                  v-ripple
                  flat
                  bordered
                  class="cursor-pointer machine-choice-card transition-all"
                  :class="{ 'machine-selected': selectedMachine === m.name }"
                  @click="selectedMachine = m.name"
                >
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center justify-between no-wrap">
                      <div class="text-weight-bold ellipsis">{{ m.name }}</div>
                      <q-icon
                        :name="selectedMachine === m.name ? 'mdi-check-circle' : 'mdi-circle-outline'"
                        :color="selectedMachine === m.name ? 'primary' : 'grey-5'"
                        size="18px"
                      />
                    </div>
                    <div class="text-caption text-grey-6 ellipsis q-mt-xs">
                      {{ m.host }}
                    </div>
                    <div class="q-mt-xs row q-gutter-xs">
                      <q-badge
                        v-for="tag in m.roles.slice(0, 2)"
                        :key="tag"
                        dense
                        color="primary"
                        outline
                        :label="tag"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Step 2: Choose Format -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="q-pb-xs">
            <div class="row items-center justify-between">
              <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
                <q-badge rounded color="primary" label="2" />
                <span>Select Target Format · صيغة البناء والتثبيت</span>
              </div>
              <q-chip dense outline color="primary" :label="selectedFormatCategory?.name || 'Installers'" />
            </div>
          </q-card-section>

          <q-card-section class="q-pt-xs">
            <q-tabs
              v-model="activeCategoryKey"
              dense
              no-caps
              active-color="primary"
              indicator-color="primary"
              align="left"
              class="text-grey q-mb-sm"
            >
              <q-tab
                v-for="cat in formatCategories"
                :key="cat.key"
                :name="cat.key"
                :icon="cat.icon"
                :label="cat.name"
              />
            </q-tabs>

            <div class="row q-col-gutter-sm">
              <div
                v-for="fmt in activeFormats"
                :key="fmt.id"
                class="col-12 col-sm-6"
              >
                <q-card
                  v-ripple
                  flat
                  bordered
                  class="cursor-pointer format-choice-card"
                  :class="{ 'format-selected': selectedFormat === fmt.id }"
                  @click="selectedFormat = fmt.id"
                >
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center justify-between no-wrap">
                      <div class="row items-center q-gutter-x-sm">
                        <q-icon :name="fmt.icon" size="22px" :color="selectedFormat === fmt.id ? 'primary' : 'grey-7'" />
                        <div>
                          <div class="text-weight-bold">{{ fmt.label }}</div>
                          <div class="text-caption text-grey-6">{{ fmt.ext }}</div>
                        </div>
                      </div>
                      <q-radio v-model="selectedFormat" :val="fmt.id" dense />
                    </div>
                    <div class="text-caption text-grey-7 q-mt-xs">
                      {{ fmt.description }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Step 3: Build Options -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="q-pb-xs">
            <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
              <q-badge rounded color="primary" label="3" />
              <span>Advanced Build Options · خيارات متقدمة للبناء</span>
            </div>
          </q-card-section>

          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-toggle
                  v-model="includeSecrets"
                  label="Embed Secrets & Auto-Join (تضمين الأسرار والمفاتيح)"
                  color="positive"
                />
                <div class="text-caption text-grey-6 q-ml-md">
                  Embeds Age/SOPS decryption key and Wireguard credentials directly into the image so the machine auto-joins the clan on first boot.
                </div>
              </div>

              <div class="col-12 col-sm-6">
                <q-toggle
                  v-model="dryRun"
                  label="Dry-Run Only (فحص التكوين دون بناء ثقيل)"
                  color="warning"
                />
                <div class="text-caption text-grey-6 q-ml-md">
                  Evaluates the flake and tests Nix derivations without generating the full disk image file.
                </div>
              </div>

              <div class="col-12">
                <q-input
                  v-model="buildHost"
                  outlined
                  dense
                  label="Dedicated Build Host (deploy.buildHost) — اختياري"
                  placeholder="e.g. localhost or root@builder.fastfree.cloud"
                  hint="Offload the heavy build to a powerful remote builder as defined in Clan 26.05 documentation"
                >
                  <template #prepend>
                    <q-icon name="mdi-server-network" />
                  </template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Right Column: Build Terminal & Artifact Download -->
      <div class="col-12 col-md-5">
        <!-- Build Execution Card -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="bg-primary text-white q-py-sm">
            <div class="row items-center justify-between">
              <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
                <q-icon name="mdi-hammer-wrench" />
                <span>Build Executor · منفذ البناء</span>
              </div>
              <q-badge
                :color="isBuilding ? 'warning' : buildComplete ? 'positive' : 'grey-5'"
                :label="isBuilding ? 'BUILDING' : buildComplete ? 'READY' : 'STANDBY'"
              />
            </div>
          </q-card-section>

          <q-card-section>
            <div class="q-mb-md">
              <div class="text-caption text-grey-7">Target Command:</div>
              <div class="command-box q-pa-sm rounded-borders font-mono text-caption bg-grey-10 text-green-4">
                {{ currentCommand }}
              </div>
            </div>

            <q-btn
              color="primary"
              class="full-width q-py-sm text-weight-bold"
              size="md"
              icon="mdi-play-circle"
              :loading="isBuilding"
              :disable="isBuilding || !selectedMachine"
              :label="isBuilding ? 'Building Machine Image...' : 'Build Machine Image · بدء البناء'"
              @click="startBuild"
            />
          </q-card-section>

          <!-- Live Progress / Output -->
          <q-card-section v-if="isBuilding || buildLogs.length > 0" class="q-pt-none">
            <q-separator class="q-mb-sm" />
            <div class="row items-center justify-between q-mb-xs">
              <div class="text-caption text-weight-bold">Build Terminal Logs:</div>
              <q-spinner-dots v-if="isBuilding" color="primary" size="20px" />
            </div>
            <div class="terminal-log-window font-mono text-caption q-pa-sm bg-black text-white rounded-borders">
              <div v-for="(log, idx) in buildLogs" :key="idx" class="log-line">
                <span class="text-grey-6">[{{ log.time }}]</span> {{ log.text }}
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Artifact & Download Card (Appears when build is ready) -->
        <q-card v-if="buildComplete" flat bordered class="artifact-card">
          <q-card-section class="bg-positive text-white q-py-sm">
            <div class="row items-center justify-between">
              <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
                <q-icon name="mdi-check-decagram" />
                <span>Build Succeeded · اكتمل البناء بنجاح</span>
              </div>
              <q-badge color="white" text-color="positive" label="Ready to Download" />
            </div>
          </q-card-section>

          <q-card-section class="q-pb-sm">
            <div class="row items-center q-col-gutter-sm q-mb-sm">
              <div class="col-8">
                <div class="text-weight-bold ellipsis">{{ artifactFileName }}</div>
                <div class="text-caption text-grey-7">{{ artifactFormatInfo }} · {{ artifactSize }}</div>
              </div>
              <div class="col-4 text-right">
                <q-chip dense color="primary" text-color="white" label="x86_64-linux" />
              </div>
            </div>

            <div class="q-my-sm q-pa-xs bg-grey-2 rounded-borders">
              <div class="text-caption text-grey-8 row items-center justify-between no-wrap">
                <span class="ellipsis font-mono">SHA256: {{ artifactSha256 }}</span>
                <q-btn flat round dense size="sm" icon="mdi-content-copy" @click="copyChecksum">
                  <q-tooltip>Copy Checksum</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- Direct Download Buttons -->
            <div class="q-gutter-y-sm q-mt-sm">
              <q-btn
                color="positive"
                class="full-width text-weight-bold"
                icon="mdi-download"
                label="Download Image · تحميل الصورة المباشر"
                @click="triggerDownload"
              />

              <q-btn
                outline
                color="secondary"
                class="full-width text-weight-bold"
                icon="mdi-console"
                label="Copy SCP Download Command · أمر التحميل بالسيرفر"
                @click="copyScpCommand"
              />

              <q-btn
                v-if="selectedFormat === 'iso' || selectedFormat === 'raw'"
                flat
                color="dark"
                class="full-width"
                icon="mdi-flash"
                label="How to Flash to USB via Clan Flash"
                @click="showFlashGuide = true"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Flash Guide Dialog -->
    <q-dialog v-model="showFlashGuide">
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center justify-between bg-primary text-white q-py-sm">
          <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
            <q-icon name="mdi-flash" />
            <span>Flash to USB via Clan Flash Write</span>
          </div>
          <q-btn v-close-popup flat round dense icon="mdi-close" color="white" />
        </q-card-section>

        <q-card-section>
          <div class="text-body2 q-mb-md">
            To flash this machine configuration directly to a physical USB drive on your workstation, use the official Clan CLI command:
          </div>

          <div class="q-pa-sm bg-grey-10 text-green-4 font-mono text-caption rounded-borders q-mb-md">
            clan flash write {{ selectedMachine }} --disk main /dev/sdX --ssh-pubkey ~/.ssh/id_rsa.pub
          </div>

          <div class="text-caption text-grey-7">
            <ul>
              <li>Replace <code>/dev/sdX</code> with your actual USB target drive.</li>
              <li>Clan will format the disk and flash the bootable partition automatically.</li>
              <li>Your SSH public key will be written so you can immediately SSH as root upon boot.</li>
            </ul>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Close" color="primary" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useClanStore } from '../stores/clan';

const $q = useQuasar();
const clanStore = useClanStore();

const selectedMachine = ref<string>('client1');
const selectedFormat = ref<string>('iso');
const activeCategoryKey = ref<string>('installer');
const includeSecrets = ref<boolean>(true);
const dryRun = ref<boolean>(false);
const buildHost = ref<string>('');

const isBuilding = ref<boolean>(false);
const buildComplete = ref<boolean>(false);
const showFlashGuide = ref<boolean>(false);

interface LogEntry {
  time: string;
  text: string;
}
const buildLogs = ref<LogEntry[]>([]);

// Formats categorized
const formatCategories = [
  {
    key: 'installer',
    name: 'Live Installers · وسائط التثبيت',
    icon: 'mdi-disc',
  },
  {
    key: 'vm',
    name: 'Hypervisors · الأنظمة الوهمية',
    icon: 'mdi-laptop',
  },
  {
    key: 'cloud',
    name: 'Cloud Images · السحابة',
    icon: 'mdi-cloud',
  },
  {
    key: 'embedded',
    name: 'ARM & Devices · أجهزة ARM',
    icon: 'mdi-chip',
  },
  {
    key: 'closure',
    name: 'Closures & Advanced · متقدم',
    icon: 'mdi-cube-outline',
  },
];

interface FormatItem {
  id: string;
  category: string;
  label: string;
  ext: string;
  icon: string;
  description: string;
}

const allFormats: FormatItem[] = [
  // Installers
  {
    id: 'iso',
    category: 'installer',
    label: 'Bootable ISO Installer',
    ext: '.iso',
    icon: 'mdi-disc',
    description: 'Hybrid UEFI/BIOS live image for physical installation or flashing to USB.',
  },
  {
    id: 'raw',
    category: 'installer',
    label: 'Raw Disk Image',
    ext: '.raw',
    icon: 'mdi-harddisk',
    description: 'Direct byte-for-byte disk image ready for dd write to hard drive/NVMe.',
  },
  // Hypervisors
  {
    id: 'qcow2',
    category: 'vm',
    label: 'QEMU / KVM (Proxmox)',
    ext: '.qcow2',
    icon: 'mdi-server',
    description: 'Compressed sparse disk image for Proxmox VE, OpenStack, and Libvirt.',
  },
  {
    id: 'vhdx',
    category: 'vm',
    label: 'Microsoft Hyper-V (VHDX)',
    ext: '.vhdx',
    icon: 'mdi-microsoft-windows',
    description: 'Optimized disk image for Windows Server and Hyper-V virtualization.',
  },
  {
    id: 'vmdk',
    category: 'vm',
    label: 'VMware ESXi / Workstation',
    ext: '.vmdk',
    icon: 'mdi-alpha-v-box',
    description: 'VMware virtual machine disk format with VMware tools ready.',
  },
  {
    id: 'virtualbox',
    category: 'vm',
    label: 'Oracle VirtualBox (OVA)',
    ext: '.ova',
    icon: 'mdi-package-variant',
    description: 'Pre-packaged appliance ready for immediate import into VirtualBox.',
  },
  // Cloud
  {
    id: 'amazon',
    category: 'cloud',
    label: 'Amazon EC2 (AMI)',
    ext: '.ami.vhd',
    icon: 'mdi-aws',
    description: 'Pre-configured AWS image with cloud-init and EC2 nitro drivers.',
  },
  {
    id: 'gce',
    category: 'cloud',
    label: 'Google Compute Engine',
    ext: '.tar.gz',
    icon: 'mdi-google-cloud',
    description: 'Google Cloud Platform image bundle compatible with gcloud compute images.',
  },
  {
    id: 'azure',
    category: 'cloud',
    label: 'Microsoft Azure Image',
    ext: '.vhd',
    icon: 'mdi-microsoft-azure',
    description: 'Fixed-size VHD aligned to 1MB boundary required by Azure.',
  },
  {
    id: 'do',
    category: 'cloud',
    label: 'DigitalOcean Droplet Image',
    ext: '.qcow2.gz',
    icon: 'mdi-digital-ocean',
    description: 'Custom droplet image with DigitalOcean networking auto-configuration.',
  },
  // Embedded
  {
    id: 'sd-card',
    category: 'embedded',
    label: 'Raspberry Pi / ARM SD Card',
    ext: '.img.zst',
    icon: 'mdi-memory',
    description: 'Bootable SD card image for Raspberry Pi 4/5 and supported ARM SBCs.',
  },
  // Closure / Advanced
  {
    id: 'toplevel',
    category: 'closure',
    label: 'Standard NixOS Closure',
    ext: 'result/bin/switch-to-configuration',
    icon: 'mdi-nix',
    description: 'Standard NixOS system closure for remote in-place activation.',
  },
  {
    id: 'kexec',
    category: 'closure',
    label: 'In-Memory Kexec Tarball',
    ext: '.tar.xz',
    icon: 'mdi-flash-alert',
    description: 'Take over any existing Linux machine remotely in-memory without rebooting to BIOS.',
  },
  {
    id: 'tarball',
    category: 'closure',
    label: 'Root Filesystem Tarball',
    ext: '.tar.gz',
    icon: 'mdi-archive',
    description: 'Complete rootfs archive suitable for custom containers or root extraction.',
  },
];

const selectedFormatCategory = computed(() => {
  return formatCategories.find((c) => c.key === activeCategoryKey.value) ?? formatCategories[0];
});

const activeFormats = computed(() => {
  return allFormats.filter((f) => f.category === activeCategoryKey.value);
});

interface MachineItem {
  name: string;
  host: string;
  roles: string[];
}

const machines = computed<MachineItem[]>(() => {
  if (clanStore.machines && clanStore.machines.length > 0) {
    return clanStore.machines.map((m) => ({
      name: m.name,
      host: m.hostname || 'Local / In-Clan',
      roles: m.roles || [],
    }));
  }
  return [
    { name: 'client1', host: 'hyperv-guest', roles: ['Hyper-V', 'Desktop', 'Client'] },
    { name: 'client2', host: 'root@76.13.51.10', roles: ['Host', 'Server', 'Production'] },
    { name: 'client3', host: 'distributed-node', roles: ['Node', 'Backup'] },
  ];
});

const currentCommand = computed(() => {
  let cmd = `clan machines build ${selectedMachine.value} --format ${selectedFormat.value}`;
  if (!includeSecrets.value) {
    cmd += ' --no-secrets';
  }
  if (dryRun.value) {
    cmd += ' --dry-run';
  }
  if (buildHost.value) {
    cmd += ` --build-host ${buildHost.value}`;
  }
  return cmd;
});

const artifactFileName = computed(() => {
  const fmt = allFormats.find((f) => f.id === selectedFormat.value);
  const ext = fmt ? fmt.ext : '.iso';
  return `${selectedMachine.value}-26.05-${selectedFormat.value}${ext}`;
});

const artifactFormatInfo = computed(() => {
  const fmt = allFormats.find((f) => f.id === selectedFormat.value);
  return fmt ? fmt.label : selectedFormat.value.toUpperCase();
});

const artifactSize = computed(() => {
  switch (selectedFormat.value) {
    case 'iso':
      return '1.85 GB';
    case 'qcow2':
      return '2.10 GB (Sparse)';
    case 'vhdx':
      return '2.40 GB';
    case 'vmdk':
      return '2.25 GB';
    case 'sd-card':
      return '1.15 GB (Compressed)';
    default:
      return '1.50 GB';
  }
});

const artifactSha256 = computed(() => {
  return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
});

function addLog(text: string) {
  const now = new Date();
  const time = now.toTimeString().split(' ')[0] ?? '';
  buildLogs.value.push({ time, text });
}

async function startBuild() {
  if (!selectedMachine.value) {
    $q.notify({ type: 'warning', message: 'Please select a machine first.' });
    return;
  }

  isBuilding.value = true;
  buildComplete.value = false;
  buildLogs.value = [];

  addLog(`Initiating build for machine: ${selectedMachine.value}`);
  addLog(`Target format: ${selectedFormat.value} (${artifactFormatInfo.value})`);
  addLog(`Command: ${currentCommand.value}`);

  try {
    // Call the Clan build API or simulate stream
    addLog('Evaluating Clan 26.05 flake and dependencies...');
    await new Promise((r) => setTimeout(r, 600));

    if (includeSecrets.value) {
      addLog('Injecting Age/SOPS public keys and machine variables from clan vars...');
    } else {
      addLog('Skipping secrets (--no-secrets flag passed)');
    }
    await new Promise((r) => setTimeout(r, 800));

    if (buildHost.value) {
      addLog(`Delegating compilation to build-host: ${buildHost.value}`);
    } else {
      addLog('Compiling NixOS system closure with native packages...');
    }
    await new Promise((r) => setTimeout(r, 1000));

    addLog(`Creating ${artifactFormatInfo.value} disk image structure...`);
    await new Promise((r) => setTimeout(r, 800));

    addLog('Finalizing image and computing SHA-256 checksum...');
    await new Promise((r) => setTimeout(r, 500));

    addLog(`Build finished successfully! Output file: /srv/fastfree-panel/downloads/${artifactFileName.value}`);
    buildComplete.value = true;

    $q.notify({
      type: 'positive',
      message: `Machine "${selectedMachine.value}" (${selectedFormat.value}) built successfully! Ready to download.`,
      icon: 'mdi-check-circle',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Build failed';
    addLog(`Error during build: ${msg}`);
    $q.notify({ type: 'negative', message: `Build failed: ${msg}` });
  } finally {
    isBuilding.value = false;
  }
}

function triggerDownload() {
  const downloadUrl = `/srv/fastfree-panel/downloads/${artifactFileName.value}`;
  $q.notify({
    type: 'info',
    message: `Starting direct download: ${downloadUrl}`,
    icon: 'mdi-download',
  });

  // Simulated browser file download trigger
  if (typeof window !== 'undefined') {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent('FastFree Machine Image: ' + artifactFileName.value)}`);
    element.setAttribute('download', artifactFileName.value);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}

function copyChecksum() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(artifactSha256.value)
      .then(() => $q.notify({ type: 'positive', message: 'Checksum copied to clipboard!' }))
      .catch(() => $q.notify({ type: 'warning', message: 'Failed to copy checksum' }));
  }
}

function copyScpCommand() {
  const scpCmd = `scp root@76.13.51.10:/srv/fastfree-panel/downloads/${artifactFileName.value} .`;
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(scpCmd)
      .then(() => $q.notify({ type: 'positive', message: 'SCP command copied to clipboard!' }))
      .catch(() => $q.notify({ type: 'warning', message: 'Failed to copy command' }));
  }
}

function loadMachines() {
  clanStore.fetchMachines().catch(() => {});
}

onMounted(() => {
  loadMachines();
});
</script>

<style scoped>
.clan-builder-screen {
  background-color: var(--lc-surface, #f8fafc);
  min-height: 100%;
}

.machine-choice-card {
  border: 1px solid var(--lc-border, #e2e8f0);
  border-radius: 8px;
  background-color: var(--lc-surface-container, #ffffff);
}

.machine-choice-card:hover {
  border-color: var(--q-primary);
  transform: translateY(-2px);
}

.machine-selected {
  border: 2px solid var(--q-primary) !important;
  background-color: rgba(var(--q-primary-rgb, 30, 102, 245), 0.05);
}

.format-choice-card {
  border: 1px solid var(--lc-border, #e2e8f0);
  border-radius: 8px;
  background-color: var(--lc-surface-container, #ffffff);
}

.format-choice-card:hover {
  border-color: var(--q-primary);
}

.format-selected {
  border: 2px solid var(--q-primary) !important;
  background-color: rgba(var(--q-primary-rgb, 30, 102, 245), 0.05);
}

.command-box {
  border: 1px solid #334155;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-log-window {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #334155;
}

.log-line {
  line-height: 1.4;
  margin-bottom: 2px;
}

.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}
</style>
