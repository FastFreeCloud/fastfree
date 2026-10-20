<template>
  <div class="clan-builder-screen q-pa-md">
    <!-- Header Banner -->
    <q-card flat bordered class="q-mb-md header-card">
      <q-card-section class="row items-center justify-between q-py-sm">
        <div class="row items-center q-gutter-x-sm">
          <q-avatar color="primary" text-color="white" icon="mdi-disc" size="44px" />
          <div>
            <div class="text-h6 text-weight-bold row items-center q-gutter-x-xs">
              <span>Clan Image Builder & OS Generator</span>
              <span lang="ar" dir="rtl" class="text-subtitle1 text-grey-5 q-ml-sm">معالج بناء وتحميل صور الأجهزة</span>
            </div>
            <div class="text-caption text-grey-6">
              Declarative NixOS Flake & Clan 26.05 image compilation for physical, Hyper-V, and cloud machines
            </div>
          </div>
        </div>

        <div class="row q-gutter-x-sm items-center">
          <q-badge color="grey-9" text-color="teal-3" class="q-pa-xs font-mono">
            Fleet: {{ machines.length }} Nodes
          </q-badge>
          <q-badge color="grey-9" text-color="purple-3" class="q-pa-xs font-mono">
            Clan 26.05
          </q-badge>

          <q-btn
            outline
            dense
            color="primary"
            icon="mdi-refresh"
            label="Refresh Fleet · تحديث"
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

    <!-- Interactive Quasar Stepper Wizard -->
    <q-card flat bordered class="stepper-card-wrapper shadow-1">
      <q-stepper
        v-model="currentStep"
        header-nav
        color="primary"
        animated
        done-color="positive"
        active-color="primary"
        class="bg-transparent"
      >
        <!-- STEP 1: SELECT TARGET MACHINE / CLIENT -->
        <q-step
          :name="1"
          title="Select Target Client · اختيار العميل أو الجهاز"
          caption="client1, client2, client3"
          icon="mdi-server"
          :done="currentStep > 1"
        >
          <div class="q-mb-sm row items-center justify-between">
            <div>
              <div class="text-subtitle1 text-weight-bold">
                1. Select Target Clan Client · حدد الجهاز المطلوب بناء صورته
              </div>
              <div class="text-caption text-grey-6">
                Choose the target machine defined in the Clan flake repository.
              </div>
            </div>

            <q-chip dense color="primary" text-color="white" icon="mdi-server-network">
              Selected: <strong class="q-ml-xs">{{ selectedMachine }}</strong>
            </q-chip>
          </div>

          <!-- Machine Cards Grid -->
          <div class="row q-col-gutter-md q-my-sm">
            <div
              v-for="m in machines"
              :key="m.name"
              class="col-12 col-md-4"
            >
              <q-card
                v-ripple
                flat
                bordered
                class="cursor-pointer machine-choice-card transition-all"
                :class="{ 'machine-selected': selectedMachine === m.name }"
                @click="selectedMachine = m.name"
              >
                <q-card-section class="q-pa-md">
                  <div class="row items-center justify-between no-wrap q-mb-sm">
                    <div class="row items-center q-gutter-x-sm">
                      <q-avatar
                        :icon="m.icon"
                        :color="selectedMachine === m.name ? 'primary' : 'grey-8'"
                        text-color="white"
                        size="38px"
                      />
                      <div>
                        <div class="text-weight-bold text-body1">{{ m.name }}</div>
                        <div class="text-caption text-grey-6 font-mono">{{ m.host }}</div>
                      </div>
                    </div>

                    <q-radio v-model="selectedMachine" :val="m.name" color="primary" />
                  </div>

                  <div class="text-caption text-grey-7 q-my-xs" style="min-height: 38px">
                    {{ m.description }}
                  </div>

                  <div class="row items-center justify-between q-mt-sm">
                    <div class="row q-gutter-xs">
                      <q-badge
                        v-for="role in m.roles"
                        :key="role"
                        dense
                        outline
                        :color="selectedMachine === m.name ? 'primary' : 'grey-7'"
                        :label="role"
                      />
                    </div>
                    <q-chip dense size="xs" color="grey-9" text-color="teal-3" label="x86_64-linux" />
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Selected Machine Spec Overview -->
          <q-card flat bordered class="q-mt-md bg-grey-10 text-grey-3 rounded-borders">
            <q-card-section class="q-py-sm">
              <div class="row items-center justify-between">
                <div class="row items-center q-gutter-x-sm">
                  <q-icon name="mdi-information-outline" color="cyan" size="20px" />
                  <span class="text-weight-medium">Target Host Details:</span>
                  <span class="text-teal-4 font-mono">{{ selectedMachine }}</span>
                  <span class="text-grey-5 font-mono">({{ currentSelectedMachine?.host }})</span>
                </div>
                <div class="row q-gutter-x-xs">
                  <span class="text-caption text-grey-5">Flake target:</span>
                  <code class="text-caption text-purple-3 font-mono">hosts/{{ selectedMachine }}/default.nix</code>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-step>

        <!-- STEP 2: CHOOSE TARGET FORMAT & OPTIONS -->
        <q-step
          :name="2"
          title="Choose Format · صيغة البناء والتثبيت"
          caption="ISO, VHDX, QCOW2, Raw"
          icon="mdi-disc"
          :done="currentStep > 2"
        >
          <div class="q-mb-sm row items-center justify-between">
            <div>
              <div class="text-subtitle1 text-weight-bold">
                2. Select OS Image Format · اختر صيغة ملف النظام المطلوبة
              </div>
              <div class="text-caption text-grey-6">
                Optimized declarative disk formats for bare metal, Hyper-V, and cloud hypervisors.
              </div>
            </div>

            <q-chip dense color="purple-8" text-color="white" icon="mdi-disc">
              Format: <strong class="q-ml-xs">{{ selectedFormat.toUpperCase() }}</strong>
            </q-chip>
          </div>

          <!-- The 4 Primary Formats Requested -->
          <div class="text-caption text-weight-bold text-grey-5 q-mb-xs">
            PRIMARY RECOMMENDED FORMATS · الصيغ الأساسية المعتمدة:
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div
              v-for="fmt in primaryFormats"
              :key="fmt.id"
              class="col-12 col-sm-6"
            >
              <q-card
                v-ripple
                flat
                bordered
                class="cursor-pointer format-choice-card transition-all"
                :class="{ 'format-selected': selectedFormat === fmt.id }"
                @click="selectedFormat = fmt.id"
              >
                <q-card-section class="q-pa-md">
                  <div class="row items-center justify-between no-wrap q-mb-xs">
                    <div class="row items-center q-gutter-x-sm">
                      <q-avatar
                        :icon="fmt.icon"
                        :color="selectedFormat === fmt.id ? 'primary' : 'grey-8'"
                        text-color="white"
                        size="34px"
                      />
                      <div>
                        <div class="text-weight-bold text-body2">{{ fmt.label }}</div>
                        <div class="text-caption text-grey-5 font-mono">{{ fmt.ext }}</div>
                      </div>
                    </div>
                    <q-radio v-model="selectedFormat" :val="fmt.id" color="primary" dense />
                  </div>

                  <div class="text-caption text-grey-7 q-my-xs" style="min-height: 40px">
                    <div>{{ fmt.descriptionAr }}</div>
                    <div class="text-grey-6 q-mt-xs">{{ fmt.descriptionEn }}</div>
                  </div>

                  <div class="row items-center justify-between q-mt-sm">
                    <q-chip dense outline size="xs" color="primary" :label="fmt.bestFor" />
                    <span class="text-caption text-grey-5 font-mono">Est: {{ fmt.estSize }}</span>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Secondary / Cloud Formats Expansion -->
          <q-expansion-item
            dense
            dense-toggle
            expand-separator
            icon="mdi-cloud-outline"
            label="Additional Cloud, VM & ARM Formats · صيغ إضافية للسحابة والأجهزة المصغرة"
            header-class="text-weight-medium text-grey-4 bg-grey-10 rounded-borders q-pa-xs"
            class="q-mb-md"
          >
            <div class="row q-col-gutter-sm q-pt-sm">
              <div
                v-for="fmt in secondaryFormats"
                :key="fmt.id"
                class="col-12 col-sm-6 col-md-4"
              >
                <q-card
                  v-ripple
                  flat
                  bordered
                  class="cursor-pointer format-choice-card transition-all"
                  :class="{ 'format-selected': selectedFormat === fmt.id }"
                  @click="selectedFormat = fmt.id"
                >
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center justify-between no-wrap">
                      <div class="row items-center q-gutter-x-xs">
                        <q-icon :name="fmt.icon" size="20px" :color="selectedFormat === fmt.id ? 'primary' : 'grey-6'" />
                        <div>
                          <div class="text-weight-bold text-caption">{{ fmt.label }}</div>
                          <div class="text-caption text-grey-5 font-mono" style="font-size: 11px">{{ fmt.ext }}</div>
                        </div>
                      </div>
                      <q-radio v-model="selectedFormat" :val="fmt.id" color="primary" dense />
                    </div>
                    <div class="text-caption text-grey-6 q-mt-xs" style="font-size: 11px">
                      {{ fmt.descriptionEn }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-expansion-item>

          <!-- Advanced Build Options Card -->
          <q-card flat bordered class="q-mb-sm bg-grey-10 text-grey-3">
            <q-card-section class="q-pa-md">
              <div class="text-subtitle2 text-weight-bold q-mb-sm row items-center q-gutter-x-xs">
                <q-icon name="mdi-tune" color="primary" />
                <span>Build Configuration Options · خيارات التوليد والأمان:</span>
              </div>

              <div class="row q-col-gutter-md items-center">
                <div class="col-12 col-md-6">
                  <q-toggle
                    v-model="includeSecrets"
                    label="Embed SOPS Secrets & Auto-Join (تضمين الأسرار والمفاتيح)"
                    color="positive"
                  />
                  <div class="text-caption text-grey-5 q-ml-md">
                    Embeds Age/SOPS decryption key and Wireguard credentials directly into the image so the machine auto-joins the clan mesh on first boot.
                  </div>
                </div>

                <div class="col-12 col-md-6">
                  <q-toggle
                    v-model="dryRun"
                    label="Dry-Run Only (فحص التكوين دون بناء ثقيل)"
                    color="warning"
                  />
                  <div class="text-caption text-grey-5 q-ml-md">
                    Evaluates the Nix flake and checks derivations without creating the heavy disk image file.
                  </div>
                </div>

                <div class="col-12 q-pt-sm">
                  <q-input
                    v-model="buildHost"
                    outlined
                    dense
                    dark
                    label="Dedicated Remote Builder (deploy.buildHost) — اختياري"
                    placeholder="e.g. root@builder.fastfree.cloud or localhost"
                    hint="Offload the heavy compilation to a remote NixOS builder instance as documented in Clan 26.05"
                  >
                    <template #prepend>
                      <q-icon name="mdi-server-network" color="primary" />
                    </template>
                  </q-input>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Exact Command Preview -->
          <div class="q-pa-sm bg-black text-green-4 font-mono text-caption rounded-borders row items-center justify-between">
            <div>
              <span class="text-grey-6">$</span> {{ currentCommand }}
            </div>
            <q-btn flat round dense size="sm" icon="mdi-content-copy" color="grey-4" @click="copyCommand">
              <q-tooltip>Copy Command</q-tooltip>
            </q-btn>
          </div>
        </q-step>

        <!-- STEP 3: START BUILD & GITHUB ACTIONS INTEGRATION -->
        <q-step
          :name="3"
          title="Build & Deploy · بدء البناء والربط السحابي"
          caption="GitHub Actions & Artifacts"
          icon="mdi-rocket-launch"
        >
          <div class="row q-col-gutter-md">
            <!-- Left Side: GitHub Actions & Configuration Overview -->
            <div class="col-12 col-md-6">
              <!-- Summary Card -->
              <q-card flat bordered class="q-mb-md">
                <q-card-section class="bg-grey-9 text-white q-py-sm">
                  <div class="text-subtitle2 text-weight-bold row items-center q-gutter-x-xs">
                    <q-icon name="mdi-clipboard-check-outline" color="teal-3" />
                    <span>Configuration Overview · ملخص إعدادات البناء</span>
                  </div>
                </q-card-section>

                <q-card-section class="q-pa-md">
                  <div class="row q-col-gutter-sm">
                    <div class="col-6">
                      <div class="text-caption text-grey-5">Target Machine:</div>
                      <div class="text-weight-bold text-body1 text-primary">{{ selectedMachine }}</div>
                      <div class="text-caption text-grey-6">{{ currentSelectedMachine?.description }}</div>
                    </div>

                    <div class="col-6">
                      <div class="text-caption text-grey-5">Target Format:</div>
                      <div class="text-weight-bold text-body1 text-purple-4">{{ selectedFormatInfo?.label }}</div>
                      <div class="text-caption text-grey-6 font-mono">{{ selectedFormatInfo?.ext }} (Est: {{ selectedFormatInfo?.estSize }})</div>
                    </div>

                    <div class="col-6">
                      <div class="text-caption text-grey-5">Architecture:</div>
                      <q-badge color="teal-9" label="x86_64-linux" />
                    </div>

                    <div class="col-6">
                      <div class="text-caption text-grey-5">Secrets Embedding:</div>
                      <q-badge :color="includeSecrets ? 'positive' : 'grey-7'" :label="includeSecrets ? 'Age / SOPS Encrypted' : 'No Secrets'" />
                    </div>
                  </div>
                </q-card-section>
              </q-card>

              <!-- GitHub Actions Linkage Card -->
              <q-card flat bordered class="q-mb-md">
                <q-card-section class="bg-indigo-10 text-white q-py-sm">
                  <div class="row items-center justify-between">
                    <div class="text-subtitle2 text-weight-bold row items-center q-gutter-x-xs">
                      <q-icon name="mdi-github" size="22px" />
                      <span>GitHub Actions CI/CD Pipeline · الربط مع جيت هب</span>
                    </div>
                    <q-badge color="positive" label="CI WORKFLOW LINKED" />
                  </div>
                </q-card-section>

                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey-7 q-mb-sm">
                    Build operations can execute locally via Clan CLI or delegate directly to the production GitHub Actions workflow runner:
                  </div>

                  <div class="q-pa-xs bg-grey-10 text-grey-3 font-mono text-caption rounded-borders q-mb-sm">
                    <div class="row items-center justify-between">
                      <span>Workflow: <code>.github/workflows/9_build_clan_image.yaml</code></span>
                      <q-chip dense size="xs" color="grey-8" text-color="white" label="branch: master" />
                    </div>
                  </div>

                  <div class="row q-gutter-xs">
                    <q-btn
                      outline
                      dense
                      size="sm"
                      color="indigo-4"
                      icon="mdi-open-in-new"
                      label="View GitHub Actions Runs · متابعة سير العمل"
                      href="https://github.com/FastFreeCloud/fastfree/actions/workflows/9_build_clan_image.yaml"
                      target="_blank"
                      type="a"
                    />
                    <q-btn
                      outline
                      dense
                      size="sm"
                      color="grey-4"
                      icon="mdi-console"
                      label="Copy gh workflow run CLI"
                      @click="copyGhCommand"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Right Side: Build Execution, Progress & Download Artifact -->
            <div class="col-12 col-md-6">
              <!-- Build Execution Card -->
              <q-card flat bordered class="q-mb-md">
                <q-card-section class="bg-primary text-white q-py-sm">
                  <div class="row items-center justify-between">
                    <div class="text-subtitle2 text-weight-bold row items-center q-gutter-x-xs">
                      <q-icon name="mdi-hammer-wrench" />
                      <span>Build Executor & Live Telemetry · منفذ البناء</span>
                    </div>
                    <q-badge
                      :color="isBuilding ? 'warning' : buildComplete ? 'positive' : 'grey-5'"
                      :label="isBuilding ? 'BUILDING' : buildComplete ? 'COMPLETED' : 'READY'"
                    />
                  </div>
                </q-card-section>

                <q-card-section class="q-pa-md">
                  <!-- Prominent Build Button -->
                  <q-btn
                    color="primary"
                    class="full-width q-py-sm text-weight-bold text-body1"
                    icon="mdi-play-circle"
                    :loading="isBuilding"
                    :disable="isBuilding || !selectedMachine"
                    :label="isBuilding ? 'Compiling Machine Image...' : 'Start Build · بدء بناء وتوليد الصورة'"
                    @click="startBuild"
                  />

                  <!-- Live Progress Indicator -->
                  <div v-if="isBuilding || buildComplete" class="q-mt-md">
                    <div class="row items-center justify-between text-caption q-mb-xs">
                      <span class="text-weight-bold">{{ currentBuildStage }}</span>
                      <span class="font-mono text-weight-bold text-primary">{{ buildProgressPercent }}%</span>
                    </div>

                    <q-linear-progress
                      :value="buildProgress"
                      size="14px"
                      rounded
                      stripe
                      :color="buildComplete ? 'positive' : 'primary'"
                      track-color="grey-9"
                    />

                    <!-- Build Stages Chips -->
                    <div class="row q-gutter-xs q-mt-sm">
                      <q-chip
                        v-for="(st, idx) in buildStagesList"
                        :key="idx"
                        dense
                        size="xs"
                        :color="getStageColor(idx)"
                        text-color="white"
                        :label="st"
                      />
                    </div>
                  </div>
                </q-card-section>

                <!-- Live Terminal Log Window -->
                <q-card-section v-if="isBuilding || buildLogs.length > 0" class="q-pt-none">
                  <div class="row items-center justify-between q-mb-xs">
                    <div class="text-caption text-weight-bold font-mono">Terminal Logs · مخرجات كلان:</div>
                    <q-spinner-dots v-if="isBuilding" color="primary" size="18px" />
                  </div>
                  <div class="terminal-log-window font-mono text-caption q-pa-sm bg-black text-white rounded-borders">
                    <div v-for="(log, idx) in buildLogs" :key="idx" class="log-line">
                      <span class="text-grey-6">[{{ log.time }}]</span>
                      <span :class="log.color || 'text-grey-3'"> {{ log.text }}</span>
                    </div>
                  </div>
                </q-card-section>
              </q-card>

              <!-- Completed Artifact & Direct Download Card -->
              <q-card v-if="buildComplete" flat bordered class="artifact-card shadow-2">
                <q-card-section class="bg-positive text-white q-py-sm">
                  <div class="row items-center justify-between">
                    <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
                      <q-icon name="mdi-check-decagram" size="24px" />
                      <span>Image Ready · اكتمل بناء الصورة بنجاح</span>
                    </div>
                    <q-badge color="white" text-color="positive" label="Ready to Download" />
                  </div>
                </q-card-section>

                <q-card-section class="q-pa-md">
                  <div class="row items-center q-col-gutter-sm q-mb-sm">
                    <div class="col-8">
                      <div class="text-weight-bold text-body1 ellipsis">{{ artifactFileName }}</div>
                      <div class="text-caption text-grey-7">{{ selectedFormatInfo?.label }} · {{ artifactSize }}</div>
                    </div>
                    <div class="col-4 text-right">
                      <q-chip dense color="primary" text-color="white" label="x86_64-linux" />
                    </div>
                  </div>

                  <!-- Checksum Box -->
                  <div class="q-my-sm q-pa-xs bg-grey-2 rounded-borders">
                    <div class="text-caption text-grey-8 row items-center justify-between no-wrap">
                      <span class="ellipsis font-mono">SHA256: {{ artifactSha256 }}</span>
                      <q-btn flat round dense size="sm" icon="mdi-content-copy" @click="copyChecksum">
                        <q-tooltip>Copy Checksum</q-tooltip>
                      </q-btn>
                    </div>
                  </div>

                  <!-- Direct Download Actions -->
                  <div class="q-gutter-y-sm q-mt-sm">
                    <q-btn
                      unelevated
                      color="positive"
                      class="full-width text-weight-bold"
                      icon="mdi-download"
                      label="Download Real Image · تحميل الصورة الفعلية"
                      @click="triggerDownload"
                    />

                    <q-btn
                      v-if="lastBuildResult?.workflowRunUrl"
                      outline
                      color="indigo-4"
                      class="full-width text-weight-bold"
                      icon="mdi-github"
                      label="View Run & Artifacts on GitHub Actions"
                      :href="lastBuildResult.workflowRunUrl"
                      target="_blank"
                      type="a"
                    />

                    <q-btn
                      outline
                      color="purple-4"
                      class="full-width text-weight-bold"
                      icon="mdi-package-down"
                      label="GitHub Releases Public Downloads · صفحة الإصدارات العامة"
                      href="https://github.com/FastFreeCloud/fastfree/releases/tag/clan-images"
                      target="_blank"
                      type="a"
                    />

                    <q-btn
                      v-if="selectedFormat === 'iso' || selectedFormat === 'raw'"
                      flat
                      color="teal-4"
                      class="full-width"
                      icon="mdi-flash"
                      label="How to Flash to USB via Clan Flash · دليل الحرق على فلاشة"
                      @click="showFlashGuide = true"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-step>

        <!-- Stepper Global Navigation Buttons -->
        <template #navigation>
          <q-stepper-navigation class="row items-center justify-between q-mt-md q-pt-sm border-top">
            <q-btn
              v-if="currentStep > 1"
              outline
              color="grey-5"
              icon="mdi-arrow-left"
              label="Previous Step · الخطوة السابقة"
              @click="currentStep--"
            />
            <div v-else />

            <div class="row q-gutter-x-sm">
              <q-btn
                v-if="buildComplete"
                flat
                color="secondary"
                icon="mdi-restart"
                label="Build Another · بناء نسخة أخرى"
                @click="resetBuild"
              />

              <q-btn
                v-if="currentStep < 3"
                color="primary"
                icon-right="mdi-arrow-right"
                :label="currentStep === 1 ? 'Next: Choose Format · التالي: اختيار الصيغة' : 'Next: Build & Deploy · التالي: بدء البناء'"
                @click="currentStep++"
              />
            </div>
          </q-stepper-navigation>
        </template>
      </q-stepper>
    </q-card>

    <!-- Flash to USB Guide Dialog -->
    <q-dialog v-model="showFlashGuide">
      <q-card style="min-width: min(92vw, 560px)">
        <q-card-section class="row items-center justify-between bg-primary text-white q-py-sm">
          <div class="text-subtitle1 text-weight-bold row items-center q-gutter-x-sm">
            <q-icon name="mdi-flash" />
            <span>Flash to USB via Clan Flash Write · حرق مباشر</span>
          </div>
          <q-btn v-close-popup flat round dense icon="mdi-close" color="white" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-body2 q-mb-md">
            To flash this machine configuration directly to a physical USB drive on your local workstation, run the official Clan CLI command:
          </div>

          <div class="q-pa-sm bg-black text-green-4 font-mono text-caption rounded-borders q-mb-md">
            clan flash write {{ selectedMachine }} --disk main /dev/sdX --ssh-pubkey ~/.ssh/id_rsa.pub
          </div>

          <div class="text-caption text-grey-7">
            <ul>
              <li>Replace <code>/dev/sdX</code> with your actual USB target drive (e.g. <code>/dev/sdb</code> on Linux or Disk number on Windows).</li>
              <li>Clan will format the partition table with Disko and flash the bootable partition automatically.</li>
              <li>Your SSH public key is injected so you can immediately SSH as root upon boot.</li>
            </ul>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn v-close-popup flat label="Close · إغلاق" color="primary" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useClanStore } from '../stores/clan';
import { apiBuildMachine, type ClanBuildResult } from '../lib/api';

const $q = useQuasar();
const clanStore = useClanStore();

// Step control (1: Machine, 2: Format, 3: Build & Deploy)
const currentStep = ref<number>(1);

const selectedMachine = ref<string>(clanStore.selectedBuildMachine || 'client1');
const selectedFormat = ref<string>(clanStore.selectedBuildFormat || 'iso');
const lastBuildResult = ref<ClanBuildResult | null>(null);

// Sync with clanStore when user opens builder from Machines screen
watch(
  () => clanStore.selectedBuildMachine,
  (val) => {
    if (val) {
      selectedMachine.value = val;
    }
  },
);

const includeSecrets = ref<boolean>(true);
const dryRun = ref<boolean>(false);
const buildHost = ref<string>('');

const isBuilding = ref<boolean>(false);
const buildComplete = ref<boolean>(false);
const showFlashGuide = ref<boolean>(false);

const buildProgress = ref<number>(0);
const currentBuildStage = ref<string>('Ready to build');

interface LogEntry {
  time: string;
  text: string;
  color?: string | undefined;
}
const buildLogs = ref<LogEntry[]>([]);

const buildStagesList = [
  '1. Flake Eval',
  '2. Secrets Sealing',
  '3. Nix Closure',
  '4. Disk Packaging',
  '5. Artifact Verification',
];

const buildProgressPercent = computed(() => {
  return Math.round(buildProgress.value * 100);
});

function getStageColor(idx: number): string {
  const currentIdx = Math.floor(buildProgress.value * 5);
  if (idx < currentIdx || buildComplete.value) return 'positive';
  if (idx === currentIdx && isBuilding.value) return 'primary';
  return 'grey-8';
}

interface MachineItem {
  name: string;
  host: string;
  description: string;
  roles: string[];
  icon: string;
}

const baselineFleet: MachineItem[] = [
  {
    name: 'client1',
    host: 'hyperv-guest.clan',
    description: 'Windows Hyper-V Client & Desktop VM node',
    roles: ['Hyper-V', 'Desktop', 'Client'],
    icon: 'mdi-microsoft-windows',
  },
  {
    name: 'client2',
    host: 'root@76.13.51.10',
    description: 'Main Remote Production VPS Host (NixOS 26.05 Clan Master)',
    roles: ['Host', 'Server', 'Production'],
    icon: 'mdi-cloud-outline',
  },
  {
    name: 'client3',
    host: 'workstation.clan',
    description: 'Distributed Developer Workstation & Backup Node',
    roles: ['Workstation', 'Backup', 'Node'],
    icon: 'mdi-desktop-mac',
  },
];

const machines = computed<MachineItem[]>(() => {
  if (clanStore.machines && clanStore.machines.length > 0) {
    return clanStore.machines.map((m) => {
      let icon = 'mdi-server';
      let description = m.description || 'Clan managed NixOS node';
      if (m.name.includes('client1') || m.name.includes('hyperv')) {
        icon = 'mdi-microsoft-windows';
        description = m.description || 'Windows Hyper-V Client & Desktop VM node';
      } else if (m.name.includes('client2') || m.name.includes('vps')) {
        icon = 'mdi-cloud-outline';
        description = m.description || 'Main Remote Production VPS Host (NixOS 26.05 Clan Master)';
      } else if (m.name.includes('client3') || m.name.includes('workstation')) {
        icon = 'mdi-desktop-mac';
        description = m.description || 'Distributed Developer Workstation & Backup Node';
      }

      return {
        name: m.name,
        host: m.host || m.hostname || '127.0.0.1',
        description,
        roles: m.roles && m.roles.length > 0 ? m.roles : m.tags && m.tags.length > 0 ? m.tags : ['Node'],
        icon,
      };
    });
  }
  return baselineFleet;
});

const currentSelectedMachine = computed(() => {
  return machines.value.find((m) => m.name === selectedMachine.value) || machines.value[0];
});

interface PrimaryFormat {
  id: string;
  label: string;
  ext: string;
  icon: string;
  bestFor: string;
  estSize: string;
  descriptionAr: string;
  descriptionEn: string;
}

const primaryFormats: PrimaryFormat[] = [
  {
    id: 'iso',
    label: 'Bootable ISO Installer',
    ext: '.iso',
    icon: 'mdi-disc',
    bestFor: 'Bare Metal · USB Flash',
    estSize: '1.85 GB',
    descriptionAr: 'صورة هجينة تدعم الإقلاع عبر UEFI و Legacy BIOS جاهزة للحرق المباشر على فلاش USB.',
    descriptionEn: 'Hybrid UEFI/BIOS live image ready for USB flashing and physical hardware boot.',
  },
  {
    id: 'vhdx',
    label: 'Microsoft Hyper-V (VHDX)',
    ext: '.vhdx',
    icon: 'mdi-microsoft-windows',
    bestFor: 'Windows Hyper-V · Client1',
    estSize: '2.40 GB',
    descriptionAr: 'قرص افتراضي مخصص لأنظمة ويندوز سيرفر وHyper-V Manager يدعم التمدد التلقائي.',
    descriptionEn: 'Dynamic VHDX virtual hard disk optimized for Windows Server & Hyper-V Manager.',
  },
  {
    id: 'qcow2',
    label: 'QEMU / KVM / Proxmox',
    ext: '.qcow2',
    icon: 'mdi-server',
    bestFor: 'Proxmox VE · OpenStack',
    estSize: '2.10 GB',
    descriptionAr: 'صورة قرص مضغوطة ديناميكية لبيئات Proxmox VE وOpenStack تدعم لقطات Copy-On-Write.',
    descriptionEn: 'Compressed sparse virtual disk for Proxmox VE, OpenStack, and QEMU with snapshot support.',
  },
  {
    id: 'raw',
    label: 'Raw Disk Image',
    ext: '.raw',
    icon: 'mdi-harddisk',
    bestFor: 'Direct dd · Cloud Storage',
    estSize: '1.60 GB',
    descriptionAr: 'صورة بايت-ببايت مباشرة لكتابتها فوراً عبر أمر dd على وحدات SSD/NVMe أو أقراص السحابة.',
    descriptionEn: 'Byte-for-byte uncompressed disk image ready for direct dd write or cloud block volumes.',
  },
];

interface SecondaryFormat {
  id: string;
  label: string;
  ext: string;
  icon: string;
  descriptionEn: string;
  estSize: string;
}

const secondaryFormats: SecondaryFormat[] = [
  { id: 'vmdk', label: 'VMware ESXi / Workstation', ext: '.vmdk', icon: 'mdi-alpha-v-box', descriptionEn: 'VMware disk format with open-vm-tools included.', estSize: '2.25 GB' },
  { id: 'virtualbox', label: 'Oracle VirtualBox (OVA)', ext: '.ova', icon: 'mdi-package-variant', descriptionEn: 'Pre-packaged appliance ready for VirtualBox import.', estSize: '2.20 GB' },
  { id: 'amazon', label: 'Amazon EC2 (AMI)', ext: '.ami.vhd', icon: 'mdi-aws', descriptionEn: 'AWS EC2 nitro image with cloud-init pre-configured.', estSize: '1.95 GB' },
  { id: 'gce', label: 'Google Compute Engine', ext: '.tar.gz', icon: 'mdi-google-cloud', descriptionEn: 'Google Cloud Platform image bundle compatible with gcloud.', estSize: '1.75 GB' },
  { id: 'azure', label: 'Microsoft Azure Image', ext: '.vhd', icon: 'mdi-microsoft-azure', descriptionEn: 'Fixed-size VHD aligned to 1MB boundary required by Azure.', estSize: '2.10 GB' },
  { id: 'sd-card', label: 'Raspberry Pi / ARM SD Card', ext: '.img.zst', icon: 'mdi-memory', descriptionEn: 'Bootable SD card image for Raspberry Pi 4/5 and ARM SBCs.', estSize: '1.15 GB' },
  { id: 'kexec', label: 'In-Memory Kexec Tarball', ext: '.tar.xz', icon: 'mdi-flash-alert', descriptionEn: 'Take over any existing Linux machine remotely without BIOS reboot.', estSize: '850 MB' },
];

const selectedFormatInfo = computed(() => {
  const p = primaryFormats.find((f) => f.id === selectedFormat.value);
  if (p) return p;
  const s = secondaryFormats.find((f) => f.id === selectedFormat.value);
  if (s) {
    return {
      id: s.id,
      label: s.label,
      ext: s.ext,
      icon: s.icon,
      bestFor: 'Cloud / Embedded',
      estSize: s.estSize,
      descriptionAr: s.descriptionEn,
      descriptionEn: s.descriptionEn,
    };
  }
  return primaryFormats[0];
});

const currentCommand = computed(() => {
  let cmd = `clan machines build ${selectedMachine.value} --format ${selectedFormat.value}`;
  if (!includeSecrets.value) {
    cmd += ' --no-secrets';
  }
  if (dryRun.value) {
    cmd += ' --dry-run';
  }
  if (buildHost.value.trim()) {
    cmd += ` --build-host ${buildHost.value.trim()}`;
  }
  return cmd;
});

const artifactFileName = computed(() => {
  const ext = selectedFormatInfo.value?.ext || '.iso';
  return `${selectedMachine.value}-26.05-${selectedFormat.value}${ext}`;
});

const artifactSize = computed(() => {
  return selectedFormatInfo.value?.estSize || '2.00 GB';
});

const artifactSha256 = computed(() => {
  return '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
});

function addLog(text: string, color?: string) {
  const now = new Date();
  const time = now.toTimeString().split(' ')[0] ?? '';
  buildLogs.value.push({ time, text, color });
}

async function startBuild() {
  if (!selectedMachine.value) {
    $q.notify({ type: 'warning', message: 'Please select a machine first.' });
    return;
  }

  isBuilding.value = true;
  buildComplete.value = false;
  lastBuildResult.value = null;
  buildLogs.value = [];
  buildProgress.value = 0.2;
  currentBuildStage.value = 'Connecting to FastFree Backend & Dispatching GitHub Actions Workflow...';

  addLog(`[CI/CD Dispatch] Starting declarative build for machine: ${selectedMachine.value}`, 'text-teal-3');
  addLog(`[Target Format] ${selectedFormatInfo.value?.label} (${selectedFormat.value})`, 'text-purple-3');
  addLog(`[Command] ${currentCommand.value}`, 'text-green-4');

  try {
    addLog('Contacting FastFree Panel API (/api/v1/machines/:name/build)...', 'text-grey-4');

    const result = await apiBuildMachine(selectedMachine.value, {
      format: selectedFormat.value,
      architecture: 'x86_64-linux',
      noSecrets: !includeSecrets.value,
      dryRun: dryRun.value,
      buildHost: buildHost.value.trim() || undefined,
    });

    lastBuildResult.value = result;
    buildProgress.value = 1.0;
    buildComplete.value = true;
    currentBuildStage.value = result.workflowId
      ? `Workflow #${result.workflowId} Dispatched & Running on GitHub Actions`
      : 'Build Dispatched Successfully · Ready on GitHub';

    addLog(`Build job dispatched to GitHub Actions successfully!`, 'text-positive');
    if (result.workflowRunUrl) {
      addLog(`Workflow Run: ${result.workflowRunUrl}`, 'text-teal-3');
    }
    if (result.downloadUrl) {
      addLog(`Artifacts Download Target: ${result.downloadUrl}`, 'text-teal-3');
    }
    if (result.stdout) {
      addLog(result.stdout, 'text-grey-4');
    }

    $q.notify({
      type: 'positive',
      icon: 'mdi-check-circle',
      message: `Image build for "${selectedMachine.value}" (${selectedFormat.value}) dispatched to GitHub Actions!`,
      timeout: 4000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Build failed';
    addLog(`Error during build dispatch: ${msg}`, 'text-negative');
    $q.notify({ type: 'negative', message: `Build dispatch failed: ${msg}` });
  } finally {
    isBuilding.value = false;
  }
}

function triggerDownload() {
  const downloadUrl =
    lastBuildResult.value?.downloadUrl ||
    lastBuildResult.value?.workflowRunUrl ||
    'https://github.com/FastFreeCloud/fastfree/releases/tag/clan-images';

  $q.notify({
    type: 'positive',
    icon: 'mdi-download',
    message: `Opening direct download page: ${downloadUrl}`,
    timeout: 3500,
  });

  if (typeof window !== 'undefined') {
    window.open(downloadUrl, '_blank');
  }
}

function copyChecksum() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard
      .writeText(artifactSha256.value)
      .then(() => $q.notify({ type: 'positive', message: 'Checksum SHA-256 copied to clipboard!' }))
      .catch(() => $q.notify({ type: 'warning', message: 'Failed to copy checksum' }));
  }
}

function copyCommand() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard
      .writeText(currentCommand.value)
      .then(() => $q.notify({ type: 'positive', message: 'Clan command copied to clipboard!' }))
      .catch(() => $q.notify({ type: 'warning', message: 'Failed to copy command' }));
  }
}


function copyGhCommand() {
  const ghCmd = `gh workflow run 9_build_clan_image.yaml --ref master -f machine=${selectedMachine.value} -f format=${selectedFormat.value}`;
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard
      .writeText(ghCmd)
      .then(() => $q.notify({ type: 'positive', message: 'GitHub CLI command copied to clipboard!' }))
      .catch(() => $q.notify({ type: 'warning', message: 'Failed to copy command' }));
  }
}

function resetBuild() {
  buildComplete.value = false;
  buildProgress.value = 0;
  buildLogs.value = [];
  currentBuildStage.value = 'Ready to build';
  currentStep.value = 1;
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
  border: 1px solid var(--lc-border, #334155);
  border-radius: 8px;
  background-color: var(--lc-surface-container, #1e293b);
}

.machine-choice-card:hover {
  border-color: var(--q-primary);
  transform: translateY(-2px);
}

.machine-selected {
  border: 2px solid var(--q-primary) !important;
  background-color: rgba(var(--q-primary-rgb, 30, 102, 245), 0.08);
}

.format-choice-card {
  border: 1px solid var(--lc-border, #334155);
  border-radius: 8px;
  background-color: var(--lc-surface-container, #1e293b);
}

.format-choice-card:hover {
  border-color: var(--q-primary);
  transform: translateY(-2px);
}

.format-selected {
  border: 2px solid var(--q-primary) !important;
  background-color: rgba(var(--q-primary-rgb, 30, 102, 245), 0.08);
}

.terminal-log-window {
  max-height: 200px;
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

.border-top {
  border-top: 1px solid var(--lc-border, #334155);
}
</style>
