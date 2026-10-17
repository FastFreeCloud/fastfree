# لوحة تحكم لـ Clan باستخدام Quasar — بحث موثّق (الإصدار 2)

> آخر تحديث: 14 أكتوبر 2026.
> المصدر: وثائق Clan 26.05 ووثائق Quasar (Quasar CLI with Vite، `@quasar/app-vite` v3).
> كل ما هو غير مؤكد من الوثائق موسوم بـ **[تحقق]**.
> القرار التنفيذي الحالي: **Quasar SPA** + backend Node.js منفصل ومقيّد. اسم الحزمة في `package.json` هو `fastfree` بحروف صغيرة، وأول شاشة هي الأجهزة (`/machines`). شاشة Login محذوفة من الواجهة والتصميمات. بيانات التصميمات تجريبية وليست أجهزة حقيقية. راجع `PLAN.md` و`docs/spa-architecture.md` للتعليمات التنفيذية المعتمدة.
> ملاحظة: أي أمثلة SSR قديمة محفوظة في `docs/archive/` للأرشيف فقط، وليست توجيهات التنفيذ الحالية.

---

## 0) ما تغيّر في هذا الإصدار

| الموضوع | قبل | الآن |
|---|---|---|
| أوامر الشبكة | علّمتها **[تحقق]** لأنها غائبة عن مرجع الـ CLI | دليل الشبكات يوثّق `clan network list` و`ping <machine>` و`overview`. ما زالت غائبة عن صفحة الـ CLI الرئيسية، فجرّب `clan network --help` قبل البناء. |
| `--host-key-check` | ذكرته لـ `update` فقط | الافتراضي في `clan ssh` هو `tofu`، وفي `machines update` و`machines generations` هو `ask` (قد يعلّق التنفيذ). |
| شاشات اللوحة | 18 شاشة في الحزمة السابقة | **17 شاشة** بعد حذف Login، مع جعل Machines أول شاشة. |
| Quasar | SSR middleware فقط | أضفت **App Extensions** بالتفصيل، وكيف تغلّف الـ backend كحزمة. |
| `quasar new` | `quasar new ssrmiddleware api` | أمر `quasar new` يدعم middleware لـ SSR. الاسم الدقيق للنوع **[تحقق]** بـ `quasar new --help`. |

تناقض في الوثائق نفسها: صفحة الـ installer تقول `clan machines build-machine`، بينما مرجع الـ CLI فيه `build` فقط. **[تحقق]** على نسختك.

---

## 1) الشاشات الـ 17 ومصدر بياناتها

الرمز: 🟢 قراءة فقط، 🟡 يغيّر حالة لكن بتأكيد، 🔴 لا يُعرض في اللوحة.

| # | الشاشة (EN · AR) | تعرض | الأمر / المصدر | الخطر |
|---|---|---|---|---|
| 2 | Overview · نظرة عامة | أرقام ملخصة، ما يحتاج انتباه | تجميع من الشاشات الأخرى | 🟢 |
| 1 | Machines · الأجهزة | قائمة الأجهزة وحالتها وأزرار Update | `clan select`، `clan network ping` | 🟡 |
| 3 | Machine detail · تفاصيل الجهاز | بيانات جهاز، vars، سجل مهمة تحديث | `vars list`، `machines update` | 🟡 |
| 4 | Inventory · المخزون | الأجهزة، `machineClass`، الوسوم، `targetHost` | `clan select` على `inventory.machines` | 🟢 |
| 5 | Services · الخدمات | الـ instances والأدوار ووسم تجريبي | `clan select` على `inventory.instances` | 🟢 |
| 6 | Jobs · المهام | سجل المهام وحالتها | ذاكرة الـ backend | 🟢 |
| 7 | Build · البناء | `--dry-run` وصيغ `toplevel`/`iso`/`sd-card` | `clan machines build` | 🟡 |
| 8 | Generations · الإصدارات | تاريخ إصدارات جهاز | `clan machines generations` | 🟢 |
| 9 | Backups · النسخ الاحتياطي | آخر نسخة، العدد، الجدول، الوجهات | `clan backups list/create`، إعداد `borgbackup` | 🟡 |
| 10 | State · الحالة | مجلدات الـ state والخدمة المسؤولة | `clan state list <machine> [--service]` | 🟢 |
| 11 | Vars · المتغيرات | قيم per-machine/shared، الأسرار مقنّعة | `clan vars list <machine>` | 🟢 |
| 12 | Vars health · سلامة المتغيرات | نتيجة الفحص وزر Fix وتنبيه مفتاح age | `clan vars check`، `clan vars fix` | 🟡 |
| 13 | Secrets · الأسرار | مَن يفك تشفير أي سر (بدون القيم) | `secrets list`، `users/groups/machines list` | 🟢 |
| 14 | Access · الوصول | دور sshd، شهادات CA، admin، emergency، users | خدمات `sshd`, `admin`, `emergency-access`, `users` | 🟢 |
| 15 | Network · الشبكة | ترتيب الاتصال، نتائج ping، جدول وسائل النقل | `clan network list/ping/overview` | 🟢 |
| 16 | Monitoring · المراقبة | الـ server والـ clients ورابط Grafana | خدمة `monitoring` | 🟢 |
| 17 | Settings · الإعدادات | `clan show`، `CLAN_DIR`، العمليات المعطّلة | `clan show` + إعدادات الخادم | 🟢 |

### عمليات معطّلة عمداً (🔴)
`machines install` (يمسح القرص)، `flash write` (يكتب على USB)، `machines delete`، `backups restore`، `vars get/set` (يكشفان القيم)، `secrets get/set/remove`، `templates apply`، `machines update-hardware-config` و`machines create` (تعدّل الـ repo نفسه)، و`--no-check` في `update`.

---

## 2) Clan: مرجع الـ CLI كاملاً (26.05)

الأوامر الرئيسية: `backups`، `flash`، `init`، `machines`، `secrets`، `select`، `show`، `ssh`، `state`، `templates`، `vars`.
كل أمر يقبل `--flake <PATH>` (أو متغير البيئة `CLAN_DIR`)، و`--debug`، و`--option`.

### `clan machines`
| الأمر | الوظيفة | أهم الخيارات |
|---|---|---|
| `list` | قائمة الأجهزة | `--tags` |
| `build` (`b`) | بناء الإعدادات (كل الأجهزة لو لم تسمِّ) | `--format` (`toplevel`، `iso`، `sd-card`)، `--dry-run`، `--no-link`، `--no-secrets`، `--no-sandbox`، `--system`، `--tags` |
| `update` (`u`) | تحديث الأجهزة | `--tags`، `--host-key-check` (افتراضي `ask`)، `--target-host`، `--build-host`، `--upload-inputs`، `--specialisation`، `--no-check` |
| `generations` | أجيال الجهاز | `--host-key-check` (افتراضي `ask`)، `--target-host`، `--skip-outdated-check` |
| `create` | جهاز جديد من template | `--tags`، `--target-host`، `-t` (افتراضي `new-machine`) |
| `delete` | حذف جهاز | |
| `install` | تثبيت عبر الشبكة، **يمسح القرص** | `--phases` (افتراضي `kexec,disko,install,reboot`)، `--build-on`، `--yes`، `--kexec`، `-j/--json` (مدخل)، `-P/--png` |
| `init-hardware-config` | جمع معلومات العتاد عبر kexec | `--backend` (افتراضي `nixos-facter`) |
| `update-hardware-config` | توليد بيانات العتاد | `--backend`، `-y` |

ملاحظة 26.05: التحديث يسجّل الإصدار الجديد في الـ bootloader **قبل** التفعيل الحي، فيصمد بعد إعادة التشغيل حتى لو فشل التفعيل. `--no-check` يتجاوز الموانع.

### `clan vars`
| الأمر | الوظيفة |
|---|---|
| `list <machine>` | يطبع كل vars الجهاز (الأسرار `********`) |
| `get <machine> <var_id>` | يفك التشفير ويطبع قيمة (مثل `ssh-keys/pubkey`) |
| `set <machine> <var_id>` | يضبط قيمة يدوياً |
| `generate [machines] [-g gen] [-r/--regenerate]` | يولّد الناقص (`--no-sandbox` و`--fake-prompts` غير آمنين) |
| `check [machines] [-g gen]` | يفحص (من 26.05 يقبل صفراً أو أكثر من الأجهزة) |
| `fix [machines] [-g gen]` | يصلح |
| `upload <machine> [--directory]` | يرفع الأسرار |
| `keygen [--user] [-f]` | يولّد مفاتيح مستخدم |

بعد `generate --regenerate` لا بد من `clan machines update` لدفع التغيير. مفتاح age في `~/.config/sops/age/keys.txt`، ويُنشأ عند أول `generate`. **بدونه لا يمكن فك تشفير الـ vars، فاحتفظ بنسخة.**

### `clan secrets`
`get`، `list [regex]`، `set [-e]`، `remove`، `rename`، `import-sops`، و`key generate/show/update`، و`groups` (`add-machine/add-secret/add-user/list/remove-*`)، و`machines` و`users` (`add`، `get`، `list`، `remove`، `add-secret`، `remove-secret`، وللمستخدمين `add-key/remove-key`).

### `clan backups`
| الأمر | تفاصيل |
|---|---|
| `create <machine> [--provider]` | يبدأ نسخة عبر كل الـ providers المضبوطة |
| `list <machine> [--provider]` | يسرد الأرشيفات |
| `restore <machine> <provider> <name> [--service]` | استعادة (لا نعرضها) |

### باقي الأوامر
- `clan state list [machine] [--service]`: مجلدات الـ state والخدمات التي تضبطها.
- `clan select <selector> [--impure]`: قراءة قيم Nix. `*` للكل و`{a,b}` لمجموعة. مخرجات المثال الأول JSON.
- `clan show`: الاسم والوصف والدومين. بلا وسائط.
- `clan ssh <machine> [-c cmd]`: `--host-key-check` افتراضي `tofu`، و`--ssh-option` يتكرر، و`-j/--json` و`-P/--png` بيانات اتصال من المثبّت. `-c` يجب أن يكون آخر وسيط.
- `clan templates list`، و`apply disk <template> <machine> [--set] [--force]`، و`apply machine <template> <name>`، و`info disk <machine> <template>`.
- `clan flash list languages|keymaps`، و`flash write <machine> --disk <name> <device> [--mode format|mount] [--dry-run] ...` (يمسح الـ USB).
- `clan init`: يحلّ محل `clan flakes create`.

---

## 3) الشبكة (مؤكد من دليل الشبكات)

عند `clan ssh` أو `clan machines update` يجرّب Clan الشبكات حسب الأولوية:
1. اتصال مباشر (`internet`).
2. VPN مثل ZeroTier (وذكر الدليل Tailscale).
3. Tor.
4. أي شبكة مضبوطة أخرى.

- أوامر الشبكة: `clan network list` (الشبكات وحالتها)، `clan network ping <machine>` (اختبار كل شبكة)، `clan network overview` (الخريطة).
- ضبط `targetHost` (في الـ inventory أو `clan.core.networking.targetHost`) أو تمرير `--target-host` **يعطّل** التدرج التلقائي.
- 26.05: عناوين ZeroTier تُكتشف تلقائياً فلا حاجة لـ `targetHost`، ويمكن تشغيل أكثر من شبكة ZeroTier.

### وسائل النقل والخدمات المرتبطة
| الخدمة | الأدوار | أهم الإعدادات / ملاحظات |
|---|---|---|
| `internet` | `default` | `host`، `port` (22)، `user` (root افتراضياً)، `jumphosts` |
| `zerotier` | `controller`، `moon`، `peer` | الـ controller يلزم أن يكون متصلاً لقبول أجهزة جديدة فقط. `public`، `allowedIds`، `stableEndpoints` |
| `wireguard` | `controller`، `peer` | `endpoint`، `port` (51820)، `mtu`، عناوين IPv6 تلقائية |
| `tor` | `server`، `client` | `portMapping` (22→22 افتراضياً)، `secretHostname` (true) |
| `mycelium` | `peer` | شبكة IPv6 overlay مشفّرة |
| `yggdrasil` | `default` | تجريبية. منافذ 6443–6446 |
| `p2p-ssh-iroh` | `server` | **تجريبية.** SSH خلف NAT بلا port forwarding. الحماية الوحيدة هي مصادقة SSH، فاستخدم المفاتيح فقط وعطّل كلمة السر |

---

## 4) خدمات Clan التي تهم اللوحة

| الخدمة | الأدوار | ما تعرضه اللوحة |
|---|---|---|
| `borgbackup` | `client`، `server` | `startAt` (افتراضي `*-*-* 01:00:00` يومياً)، `exclude`، `destinations.<name>.repo`، وعلى الـ server `address` و`directory` (`/var/lib/borgbackup`) |
| `localbackup` | `default` | `snapshots` (20)، `targets` وخطافات pre/post |
| `sshd` | `server`، `client` | شهادات host موقّعة من CA (مفعّلة افتراضياً)، `authorizedKeys`، `generateRootKey`. **حذف مفتاح قد يقفلك** |
| `users` | `default` | `user`، `groups`، `share`، `prompt`، `openssh.authorizedKeys` |
| `admin` | `default` | مستخدم root بمفاتيح `allowedKeys` |
| `emergency-access` | `default` | يضبط باسورد طوارئ لو فشل الإقلاع |
| `monitoring` | `client`، `server` | **تجريبية.** الـ server جهاز واحد فقط، وGrafana اختياري، `monitoredSystemdServices`، `useSSL` |
| `pki` | `default` | يستبدل `certificates` (مهملة). Root CA مشترك، بلا daemon |
| `syncthing` | `peer` | `folders` و`extraDevices` |
| `data-mesher` | `default` | **تجريبية.** مزامنة ملفات موقّعة بـ ED25519 |
| `trusted-nix-caches` | `default` | لا إعدادات |
| `installer` | `iso` | **تجريبية.** يبني ISO، ويعرض عنوان onion في الشاشة إن كان الجهاز Tor server |

### ملاحظات من إصدار 26.05 (Release notes)
- أمان التحديث (bootloader قبل التفعيل) و`--specialisation` و`--no-check`.
- ترقية ZeroTier إلى multi-instance **كسر توافق** (`clan.core.networking.zerotier.*` أُزيلت).
- `sshd`: شهادات CA افتراضية، شغّل `clan vars generate` ثم انشر عند أول ترقية.
- أُزيلت `clan vms run/inspect` وbackend الـ `fs`، و`clanPkgs` ستُزال في الإصدار القادم.
- نصيحة الترقية: جرّب جهازاً غير حرج أولاً، يفضَّل أن يكون دخول SSH له لا يعتمد على ZeroTier.
- بعد الترقية، أول `update` قد يفشل في التفعيل بسبب dbus-broker، وإعادة التشغيل تحل ذلك.

### الـ Build host وتمرير الـ agent
- `deploy.buildHost` يفصل البناء عن الهدف. الأولوية: `--build-host` ثم `inventory...deploy.buildHost` ثم `clan.core.networking.buildHost` ثم الهدف نفسه. لازم نفس المعمارية.
- `forwardAgent` معطّل افتراضياً. من يملك root على الـ build host يقدر استخدام مفاتيحك. الأفضل مفتاح مخصص يولّده `clan vars`.

---

## 5) لا API ولا SDK

- لا REST API رسمي. قرار "Clan As Library" يخطط لواجهات أخرى (TUI، سطح مكتب، جوال).
- لا SDK منشور، ومكتبة `clan_cli` قد تتغير.
- **الواجهة الأثبت هي أوامر CLI.** مخرجاتها نصية إلا `clan select` (JSON). لذلك الـ backend يلفّ الأوامر ويحلّل نصها، وشكل مخرجات `state list` و`generations` و`backups list` و`network ping` **[تحقق]** منه قبل البناء.

---

## 6) Quasar: ما تقوله الوثائق

### أوامر الـ CLI
`dev` (`-m`، `-p`، `-H`)، `build` (`-m`، `-P`)، `mode add|remove` (`--webserver hono|fastify|express|koa` والافتراضي `hono`)، `new` (page، layout، component، boot، store، SSR middleware)، `ext` (`add`، `remove`، `invoke`، `uninvoke`، وبدون وسائط يسرد المثبّت)، `run <ext-id> <cmd>`، `info`، `inspect`، `describe`، `clean`، `prepare`.
أمر `serve` للتجربة فقط: افتراضيه `0.0.0.0`، فاستخدم `--hostname localhost`.

### SSR mode
- يضيف `/src-ssr` فيه خادم Node (`server.js`) وملفات middleware. الوثائق تقول إن لوحة داخلية لا تحتاج SSR عادةً، لكننا نستخدمه كمضيف Node للـ API، وهذا قرار مقبول وإن لم يكن الاستخدام المعتاد.
- الـ middleware بصيغة `defineSsrMiddleware` من `#q-app` (في v3). يستقبل `{ app, port, resolve, publicPath, folders, render, serve }`، واستخدم `resolve.urlPath()` للمسارات.
- `render` **إجباري وأخير** في `ssr.middlewares`.
- أي حزمة داخل `/src-ssr` تُدرج في `/src-ssr/package.json` تحت `dependencies`.
- خيارات `ssr` في `quasar.config`: `prodPort` (3000، ويتجاوزه `PORT`)، `middlewares`، `extendSSRWebserverConf`، `extendSSRPackageJson`، `prodScriptNamedExport`، `pwa`.
- التطوير: `quasar dev -m ssr -H 127.0.0.1 -p 9000`. الإنتاج: `quasar build -m ssr` ثم `npm start` من مجلد المخرجات.
- تحذير الـ proxy: خادم التطوير ليس حداً للتفويض.

### App Extensions (ما سألت عنه)
> افترضت أن "quasar dev extension" يعني **App Extension**، وهو الأقرب لهدفك لأن الوثائق تذكر صراحة أنه يستطيع "بناء وتشغيل والتحكم في API server". لو قصدت **Browser Extension (BEX)** فهو وضع مختلف لبناء إضافات Chrome/Firefox (`quasar dev -m bex`)، ولا يخدم هذا المشروع.

**ما هي:** حزمة npm يحمّلها Quasar CLI لإضافة وظائف لأي مشروع. تعمل مع Quasar CLI فقط (ليس Vite plugin ولا UMD). الاسم لازم يبدأ بـ `quasar-app-extension-`، والباقي هو `ext-id`.

**ما يمكنها فعله (حسب الوثائق):** أوامر CLI جديدة، UI plugins، مكونات، تطبيق مرافق، تعديل `quasar.config`، تعديل Vite، **بناء API server وتشغيله**، وتعديل الكود بقيم من خارج Quasar. وتستطيع استبدال starter kit.

**التثبيت والإدارة:** `quasar ext add <id>`، `quasar ext remove <id>`، `quasar ext invoke/uninvoke` (يتخطى npm)، والتحديث بإعادة `add`، والقائمة بـ `quasar ext` أو `quasar info` أو `quasar.extensions.json`.

**⚠️ الأمان (من الوثائق):** الإضافة تعمل بصلاحيات المستخدم بلا sandbox، وتُنفَّذ في كل `quasar dev` و`quasar build`. تقرأ الملفات وتشغّل الأوامر وتقرأ متغيرات البيئة. ثبّت فقط من مصدر موثوق.

**الإنشاء:** `pnpm create quasar@latest` ثم اختر AppExtension (يتطلب PNPM v11+). ينتج workspace فيه:
```
ae/                  # ما ستنشره
  package.json
  src/
    index.js         # يعمل في dev/build (مطلوب)
    install.js       # اختياري
    prompts.js       # اختياري
    uninstall.js     # اختياري
    templates/       # ملفات تُنسخ لمشروع المستخدم
    runtime/         # كود الواجهة
playground/          # مشروع @quasar/app-vite للتجربة
```
الاختبار: `pnpm run dev` و`pnpm run dev -m ssr` و`pnpm run invoke` و`pnpm run cycle`. النشر من مجلد `ae` فقط، ويجب إبقاء البادئة `quasar-app-extension-`.

**الـ Index API** (`defineIndexScript` من `#q-app`):
- خصائص `api`: `ctx`، `extId`، `prompts`، `resolve` (`app`، `src`، `ssr`، ...)، `appDir`، `logger`.
- مساعدات: `compatibleWith(pkg, semver)`، `hasPackage`، `hasExtension`، `getPackageVersion`، `hasTypescript()`، `getNodePackagerName()`، و`get/set/mergePersistentConf`.
- `extendQuasarConf(cb)`: تعدّل `conf` مباشرة أو تُرجع جزءاً للدمج. المسار بـ `~` يعني من `node_modules`.
- `registerCommand(name, fn)`: يتيح `quasar run <ext-id> <name>`.
- `registerDescribeApi`: لـ `quasar describe` (للمكونات).
- Hooks: `beforeDev`، `afterDev`، `beforeBuild`، `afterBuild`، `onPublish`.
- Build hooks: `extendViteConf(cfg, { isClient, isServer })`، **`extendSSRWebserverConf`**، `extendSSRPackageJson` (v3+)، `extendSSRManifestJson` (v3.1+)، وغيرها لـ SSG/Electron/PWA/BEX.

**الـ Install API** (`defineInstallScript`): `render(folder, scope)` و`renderFile(src, dest, scope)` (قوالب lodash، وملفات النقطة تُسمّى بـ `_env`)، و`extendPackageJson`، و`extendJsonFile`، و`onExitLog`، و`resolve.ssr(...)`.
**الـ Prompts API** (`definePromptsScript`): تستخدم مكتبة مثل `@clack/prompts`، وتخزَّن الإجابات في `quasar.extensions.json` وتصل عبر `api.prompts`.
**الـ Uninstall API** (`defineUninstallScript`): `removePath(path)` بحذر.
**الاكتشاف:** بحث npm عن `quasar-app-extension`، وقائمة `quasar-awesome`، وإضافات رسمية مثل `@quasar/testing` و`@quasar/qcalendar`.

---

## 7) المعمارية المعتمدة الآن: Quasar SPA + API منفصل

- واجهة المتصفح: Quasar CLI with Vite (`@quasar/app-vite` v3) في وضع SPA. اسم حزمة التطبيق حرفيًا `fastfree`، lowercase، في `package.json`.
- شاشة البداية: `/machines` لعرض الأجهزة. `Overview` شاشة ثانوية.
- لا توجد صفحة Login ولا إدخال token داخل الواجهة. **هذا لا يعني إلغاء حماية API**: المصادقة والصلاحيات تظل مفروضة على الخادم أو عبر reverse proxy موثوق.
- كل أوامر Clan وقراءة `CLAN_DIR` تبقى في backend منفصل، ولا تُضمّن الأسرار في ملفات SPA. لا تستخدم SSR middleware.
- أوامر Quasar القياسية للتطوير والبناء: `quasar dev` و`quasar build`. يخرج البناء إلى `dist/spa` افتراضيًا حسب التوثيق الرسمي.
- التفاصيل التنفيذية، مسارات `/api/v1/*` وقواعد الأمان في `docs/spa-architecture.md`؛ وخطة التنفيذ المرحلية الملزمة في `PLAN.md`.

## 8) مراحل التنفيذ المعتمدة

المرجع الملزم هو `PLAN.md`، ويُنفّذ طور واحد فقط في كل مرة: (0) فحص ملفات المشروع وإصداراته دون تغيير، (1) تأسيس/التحقق من SPA وAPI، (2) API آمن للقراءة فقط، (3) شاشات الواجهة بدءًا بـ Machines، (4) الشبكة والاعتمادية، (5) عمليات تغيّر الحالة بعد موافقة صريحة، (6) التحقق والإنتاج، (7) بحث الانتقال إلى API/SDK رسمي إن توفر. لا تُعلّم أي مهمة مكتملة دون دليل فعلي من بيئة المستخدم.

## 9) قواعد الأمان الأساسية

- لا Login screen: لا ترسل token من الواجهة ولا تخزّنه في `localStorage` أو متغير `VITE_*`.
- API محميّ من جهة الخادم؛ رفض الطلبات غير المصرّح بها. لو كانت اللوحة محلية لمشغّل واحد، يمكن وضعها خلف reverse proxy موثوق أو جلسة خادمية آمنة، مع إبقاء backend مربوطًا على `127.0.0.1` افتراضيًا.
- استدعاء Clan عبر `execFile`/`spawn` بقائمة أوامر ثابتة، دون shell أو إدخال عشوائي للأوامر.
- إخفاء قيم vars/secrets على الخادم قبل تكوين JSON؛ لا تعتمد على إخفائها بالواجهة فقط.
- العمليات المتغيرة للحالة لا تُنفّذ دون موافقة صريحة ومراجعة أمنية وسجل تدقيق؛ الأوامر الخطيرة المذكورة في `CLAUDE.md` تظل محظورة.

## 10) قائمة التحقق المعلّقة

1. `clan network --help` (الأوامر غائبة عن الصفحة الرئيسية للـ CLI).
2. الشكل الدقيق لمخرجات `clan select` و`state list` و`generations` و`backups list` و`network ping`.
3. هل يقبل `machines update` القيمة `tofu` في `--host-key-check`؟
4. `hostname` في `@hono/node-server` عند الإنتاج.
5. `build` أم `build-machine` في 26.05.
6. ترتيب `ssr.middlewares` عند تعديله من Extension، وتسجيل routes.
7. نسخة `@quasar/app-vite` في مشروعك.

---

## 11) التحقق شاشة بشاشة

**طريقة التقييم:** 🟢 **موثّق** = الأمر والخيارات ومعناها مذكورة في الوثائق، 🟡 **جزئي** = الأمر أو الخيار موثّق لكن شكل المخرجات أو دلالتها غير مذكورة، 🔵 **تصميم التطبيق** = ميزة من اللوحة نفسها وليست من Clan.
وسم المستوى ظاهر الآن أعلى كل شاشة في التصميم (Documented / Partly verified / App design).

> **حدود البحث:** مستودع clan-core (`git.clan.lol` وGitHub) يرفض الجلب الآلي (`robots`)، فلم أتمكن من قراءة كود الـ CLI لمعرفة شكل المخرجات. شكل المخرجات يبقى مهمة المرحلة 0 على جهازك.

| الشاشة | المستوى | ما تأكد من الوثائق | ما لم يتأكد |
|---|---|---|---|
| Overview | 🔵 | | كل الإجماليات تحسبها اللوحة من الشاشات الأخرى |
| Machines | 🟡 | `machines list` و`--tags` موثقان. وسوم `all/nixos/darwin` و`machineClass` موثقة. `clan.core.deployment.requireExplicitUpdate` يجعل `update` بلا أسماء يتخطى الجهاز | حالة "متصل/غير متصل": تعتمد على `network ping` غير موثّق المخرجات. عمود Generation يحتاج `generations` عبر SSH لكل جهاز (بطيء) |
| Machine detail | 🟡 | `vars list`، `machines update` وخياراته | سجل التحديث حقيقي لكن شكل نصه غير معروف. Cancel = قتل العملية (تصميم التطبيق) |
| Inventory | 🟡 | `inventory.machines` فيه `tags`, `machineClass`, `deploy.targetHost` (دليل الـ inventory). `clan.core.networking.targetHost` افتراضيه `root@<fqdn>` لو `networking.domain` مضبوط | **أن `clan select` يقرأ مسار `inventory` أصلاً**: أمثلة الوثائق كلها على `nixosConfigurations.*`. عمود "instances" من تصميمي |
| Services | 🟡 | الأدوار والخيارات لكل خدمة، وحالة "تجريبية" من 26.05 | مسار قراءة `inventory.instances` بـ `select` غير موثّق |
| Jobs | 🔵 | | مهام في الذاكرة |
| Build | 🟢 | `machines build` بـ `--format` (`toplevel`/`iso`/`sd-card`) و`--dry-run` و`--no-secrets` | شكل سجل `--dry-run` (يُعرض كنص خام) |
| Generations | 🟡 | `machines generations` و`--host-key-check` (افتراضي `ask`) و`--skip-outdated-check` | **كل أعمدة الجدول**: شكل المخرجات غير موثّق |
| Backups | 🟡 | `backups create/list`، جدول `startAt` الافتراضي 01:00، `exclude`، وجهات متعددة تُنتج وحدة systemd لكل وجهة. كل provider يعرّف أوامره (`create`/`list`/`restore`) في `clan.core.backups.providers` | `backups list` ينفّذ **أمر الـ provider نفسه**، فشكل مخرجاته يختلف (غالباً borg). "العدد" و"آخر نسخة" تحتاج تحليلاً لكل provider، وليست حقلاً قياسياً |
| State | 🟡 | `state list [machine] [--service]`. الخيارات في `clan.core.state`: `folders`، و`preBackupScript`/`postBackupScript`/`preRestoreScript`/`postRestoreScript` | شكل مخرجات `state list` |
| Vars | 🟡 | `vars list` تُظهر `zerotier/zerotier-ip` و`zerotier/zerotier-network-id` (دليل الـ VPN)، والأسرار `********`. تخزين `per-machine` و`shared` موثّق | **عمود Scope**: `vars list` لا يُذكر أنه يعرض النطاق. قد يحتاج قراءة مجلد `vars/` |
| Vars health | 🟡 | `vars check` و`vars fix` موجودان (26.05: يقبلان صفراً أو أكثر من الأجهزة، و`-g` لـ generator واحد) | **الوثائق لا تشرح ما يفحصه `check` ولا ما يصلحه `fix`**. لا تعرض "Fix" قبل تجربتهما على جهاز غير حرج |
| Secrets | 🟡 | `secrets list [regex]` و`users/groups/machines list` موثقة | لا أمر موثّق يعرض "من يصل لأي سر"، فربط الأسرار بالمستخدمين قد يحتاج أكثر من أمر أو قراءة ملفات `sops` |
| Access | 🟡 | خيارات `sshd`, `users`, `admin`, `emergency-access` موثقة بالتفصيل | لا أمر يسرد الخدمات المفعّلة لكل جهاز، فتُستنتج من الـ inventory (غير مجرّب) |
| Network | 🟡 | ترتيب الاتصال، وأمر `network list/ping/overview` مذكور في دليل الشبكات. عنوان ZeroTier وشبكته من `vars list`. `zerotier-cli info` على الجهاز يعطي ONLINE | **مخرجات أوامر `network` غير موثّقة**، والأوامر غائبة عن مرجع الـ CLI. دليل الـ mesh VPN لا يوثّق أمراً لعرض الـ peers |
| Monitoring | 🟡 | الأدوار والخيارات (`grafana.enable`, `monitoredSystemdServices`, `useSSL`) وأن الـ server جهاز واحد وأن الخدمة تجريبية | قراءتها من الـ inventory غير مجرّبة |
| Settings | 🟢 | `clan show` يعرض Name وDescription وDomain (مثال الوثائق). `CLAN_DIR` موثّق | |

### تغييرات التصميم المعتمدة في 2026-10-14
- حُذفت شاشة Login من الواجهة ومجلد التصميمات. لا يوفّر هذا التغيير تصريحًا بفتح API دون حماية خادمية.
- أصبحت Machines أول شاشة وموجّه البداية `/machines`.
- وسم مستوى التحقق أعلى كل شاشة.
- Machines: وسم `requireExplicitUpdate` وملاحظة أن هذه الأجهزة تُستثنى من "تحديث الكل".
- State: عمود الخطافات صار "backup + restore hooks".
- ملاحظات Backups وVars health وNetwork وSecrets وAccess وOverview تذكر الفجوة بوضوح.

### اكتشافات جديدة من البحث
1. **يوجد تطبيق رسمي `clan-app`:** المسرد (Glossary) يصفه بأنه "واجهة رسومية لإدارة الـ clans أسهل من clan-cli". قبل الاستثمار الكامل، افحص ما يغطيه ولا تكرّره دون داعٍ. وقرار "Clan As Library" يؤكد أن واجهات أخرى قيد العمل.
2. **`clan.core.deployment.requireExplicitUpdate`:** يغيّر معنى زر "تحديث الكل".
3. **الـ vars تُولَّد تلقائياً** أثناء `clan machines update` إن كانت ناقصة (دليل المفاهيم)، فشاشة Vars health ليست شرطاً قبل التحديث.
4. **مسار الأسرار:** الأسرار تُنشر في `/run/secrets/` أو `/run/secrets-for-users/`، وbackend التخزين الافتراضي هو sops (والبدائل `password-store` و`age` وغيرهما).
5. **`neededFor`:** `partitioning` و`activation` و`users` و`services`، وهي تفسّر لماذا بعض الأسرار تُرفع أثناء التثبيت.
6. **`internalListenAddresses`** في `clan.core.networking`: عناوين تربط عليها الخدمات الداخلية (تُضاف من وحدات VPN).

### ما يجب أن تفعله المرحلة 0 إضافة لما سبق
- جرّب: `clan select inventory` أو المسار المناسب لقراءة `inventory.machines` و`inventory.instances`، وسجّل المسار الذي ينجح.
- شغّل `clan vars check` على جهاز تجريبي وسجّل ما يفعله، ثم افعل الشيء نفسه مع `fix` بعد نسخة احتياطية.
- شغّل `clan backups list <machine>` وانظر هل المخرجات نص خام من borg أم شيء منظّم.
- اقرأ `clan secrets users list` و`groups list` و`machines list` وانظر هل تُظهر الأسرار المرتبطة.
- اقرأ `clan-app` وقارن ما يوفره بشاشاتنا.

---

## المصادر

### Clan
- [الصفحة الرئيسية للوثائق 26.05](https://clan.lol/docs/26.05)
- [Release notes 26.05](https://clan.lol/docs/26.05/releases/26-05)
- CLI: [Overview](https://clan.lol/docs/26.05/reference/cli) · [machines](https://clan.lol/docs/26.05/reference/cli/machines) · [vars](https://clan.lol/docs/26.05/reference/cli/vars) · [secrets](https://clan.lol/docs/26.05/reference/cli/secrets) · [backups](https://clan.lol/docs/26.05/reference/cli/backups) · [state](https://clan.lol/docs/26.05/reference/cli/state) · [select](https://clan.lol/docs/26.05/reference/cli/select) · [show](https://clan.lol/docs/26.05/reference/cli/show) · [ssh](https://clan.lol/docs/26.05/reference/cli/ssh) · [templates](https://clan.lol/docs/26.05/reference/cli/templates) · [flash](https://clan.lol/docs/26.05/reference/cli/flash)
- خيارات الأجهزة: [clan.core.state](https://clan.lol/docs/26.05/reference/clan.core/state) · [clan.core.backups](https://clan.lol/docs/26.05/reference/clan.core/backups) · [clan.core.networking](https://clan.lol/docs/26.05/reference/clan.core/networking) · [clan.core.deployment](https://clan.lol/docs/26.05/reference/clan.core/deployment) · [Glossary](https://clan.lol/docs/26.05/reference/glossary)
- أدلة: [Vars concepts](https://clan.lol/docs/26.05/guides/vars/vars-concepts) · [Backups (advanced)](https://clan.lol/docs/26.05/guides/backups/backup-advanced) · [Networking](https://clan.lol/docs/26.05/guides/networking/networking) · [Mesh VPN](https://clan.lol/docs/26.05/guides/networking/mesh-vpn) · [Inventory](https://clan.lol/docs/26.05/guides/inventory/intro-to-inventory) · [Backups](https://clan.lol/docs/26.05/guides/backups/intro-to-backups) · [Vars](https://clan.lol/docs/26.05/guides/vars/intro-to-vars) · [Vars troubleshooting](https://clan.lol/docs/26.05/guides/vars/vars-troubleshooting) · [Build host](https://clan.lol/docs/26.05/guides/build-host) · [SSH agent forwarding](https://clan.lol/docs/26.05/guides/ssh-agent-forwarding) · [Specialisations](https://clan.lol/docs/26.05/guides/specialisations) · [Disk encryption](https://clan.lol/docs/26.05/guides/disk-encryption) · [Secure Boot](https://clan.lol/docs/26.05/guides/secure-boot)
- خدمات: [admin](https://clan.lol/docs/26.05/services/official/admin) · [borgbackup](https://clan.lol/docs/26.05/services/official/borgbackup) · [localbackup](https://clan.lol/docs/26.05/services/official/localbackup) · [sshd](https://clan.lol/docs/26.05/services/official/sshd) · [users](https://clan.lol/docs/26.05/services/official/users) · [emergency-access](https://clan.lol/docs/26.05/services/official/emergency-access) · [monitoring](https://clan.lol/docs/26.05/services/official/monitoring) · [pki](https://clan.lol/docs/26.05/services/official/pki) · [certificates](https://clan.lol/docs/26.05/services/official/certificates) · [syncthing](https://clan.lol/docs/26.05/services/official/syncthing) · [data-mesher](https://clan.lol/docs/26.05/services/official/data-mesher) · [trusted-nix-caches](https://clan.lol/docs/26.05/services/official/trusted-nix-caches) · [installer](https://clan.lol/docs/26.05/services/official/installer) · [internet](https://clan.lol/docs/26.05/services/official/internet) · [zerotier](https://clan.lol/docs/26.05/services/official/zerotier) · [wireguard](https://clan.lol/docs/26.05/services/official/wireguard) · [tor](https://clan.lol/docs/26.05/services/official/tor) · [mycelium](https://clan.lol/docs/26.05/services/official/mycelium) · [yggdrasil](https://clan.lol/docs/26.05/services/official/yggdrasil) · [p2p-ssh-iroh](https://clan.lol/docs/26.05/services/official/p2p-ssh-iroh)
- قرارات معمارية: [02 Clan As Library](https://clan.lol/docs/26.05/decisions/02-clan-as-library) · [openapi.json (نموذج أولي)](https://git.clan.lol/clan/clan-core/src/branch/docs-framework/tested-trappist/openapi.json)

### Quasar
- App Extensions: [Introduction](https://quasar.dev/app-extensions/introduction) · [Discover](https://quasar.dev/app-extensions/discover) · [Development guide](https://quasar.dev/app-extensions/development-guide/introduction) · [Index API](https://quasar.dev/app-extensions/development-guide/index-api) · [Install API](https://quasar.dev/app-extensions/development-guide/install-api) · [Prompts API](https://quasar.dev/app-extensions/development-guide/prompts-api) · [Uninstall API](https://quasar.dev/app-extensions/development-guide/uninstall-api) · [Provide CLI commands](https://quasar.dev/app-extensions/common-formulas-and-patterns/provide-cli-commands) · [Starter kit equivalent](https://quasar.dev/app-extensions/common-formulas-and-patterns/starter-kit-equivalent) · [JSON API](https://quasar.dev/app-extensions/common-formulas-and-patterns/json-api)
- Browser Extension (BEX): [Introduction](https://quasar.dev/quasar-cli-vite/developing-browser-extensions/introduction)
- SSR: [What is SSR](https://quasar.dev/quasar-cli-vite/developing-ssr/introduction) · [SSR Middleware](https://quasar.dev/quasar-cli-vite/developing-ssr/ssr-middleware) · [SSR Webserver](https://quasar.dev/quasar-cli-vite/developing-ssr/ssr-webserver) · [Configuring SSR](https://quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr) · [Deploying SSR](https://quasar.dev/quasar-cli-vite/developing-ssr/deploying)
- CLI: [Commands List](https://quasar.dev/quasar-cli-vite/commands-list) · [API Proxying](https://quasar.dev/quasar-cli-vite/api-proxying)


## 12) SPA architecture update (2026-10-14)

The active implementation targets a **Quasar SPA frontend plus a separate private Node.js API backend**, package name `fastfree` (lowercase), no Login screen, and Machines at `/machines`. The supplied ZIP remains a design/research handoff; it does not by itself confirm a runnable app source tree.

- Quasar's official SPA build command is `quasar build`; the default output directory is `dist/spa` unless `build.distDir` is customized. See [Quasar: Deploying a SPA](https://quasar.dev/quasar-cli-vite/developing-spa/deploying/) and [Quasar: Commands List](https://quasar.dev/quasar-cli-vite/commands-list/).
- The browser calls relative API paths such as `/api/v1/machines`. In development, proxy `/api` from the Quasar dev server to the backend. In production, serve `dist/spa` and reverse-proxy `/api/` to the backend on loopback; prefer same-origin routing. Configure an `index.html` fallback if Vue Router uses history mode.
- `CLAN_DIR`, `CLAN_PANEL_TOKEN`, SSH credentials, and secret values must remain backend-only and must never be compiled into SPA assets.
- The backend must run a fixed allowlist of Clan commands with argument arrays and no shell, validate machine names against live inventory, bound time/output/concurrency, filter errors, and mask sensitive values before returning JSON.
- A browser route guard is UX only; authorization is enforced by the API. Bearer tokens stored in browser JavaScript-accessible storage are vulnerable to XSS theft, so the token design needs a security review before remote/multi-user production use.
- Clan CLI commands and output schemas must still be verified on the target Clan 26.05 environment. The official docs describe CLI-based management and machine commands; do not assume an undocumented stable REST API. Recheck official docs before any future claim about API/SDK availability.

See [`spa-architecture.md`](spa-architecture.md) for the implementation and deployment checklist. This research update does not mark any command as locally verified and does not replace Phase 0.
