# Phase 2.3 — Tauri MCP Automated Visual Inspection & Layout Audit

- Generated: 2026-11-12T21:05:08.706Z
- Completed: 2026-11-12T21:07:54.409Z
- Matrix: 3 themes x 3 resolutions x 6 steps = 54 checkpoints
- MCP tools: webview_screenshot, manage_window (info/resize/list), webview_execute_js, driver_session, ipc_get_backend_state

## Summary

| Status | Count |
| --- | --- |
| pass | 0 |
| warn | 12 |
| fail | 42 |
| error | 0 |
| screenshots captured | 54 |

Issues by category: `{"contrast":54,"clipping":24}`

Checkpoints with vertical clipping, by step: `{"3":6,"5":9,"6":9}`

Checkpoints with text-contrast failures, by theme: `{"dark":18,"light":18,"oled-black":18}`

## Flagged Checkpoints

### 1024x768 / dark / step 1 — warn
- **[medium] contrast**: 12/25 text samples below WCAG AA; worst 3.86 (rgb(25, 118, 210) on rgb(23,23,31)) "{{ state.cpuCores || 8 }} أنوية متوفرة"

### 1024x768 / dark / step 2 — warn
- **[medium] contrast**: 1/9 text samples below WCAG AA; worst 3 (rgb(255, 255, 255) on rgb(38,166,154)) "التحقق من المفتاح"

### 1024x768 / dark / step 3 — fail
- **[high] contrast**: 2/14 text samples below WCAG AA; worst 1.18 (rgba(0, 0, 0, 0.6) on rgb(23,23,31)) "مسار قرص VHDX المستهدف"
- **[high] clipping**: 4 elements extend below viewport (max bottom 821 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / dark / step 4 — fail
- **[high] contrast**: 2/10 text samples below WCAG AA; worst 1.18 (rgba(0, 0, 0, 0.6) on rgb(23,23,31)) "عنوان نقطة النهاية (Endpoint)"

### 1024x768 / dark / step 5 — fail
- **[medium] contrast**: 1/40 text samples below WCAG AA; worst 3.86 (rgb(25, 118, 210) on rgb(23,23,31)) "5. فحص الصحة والجاهزية السيادية"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1216 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / dark / step 6 — fail
- **[medium] contrast**: 5/40 text samples below WCAG AA; worst 2.82 (rgb(156, 39, 176) on rgb(23,23,31)) "منفذ 9104"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1769 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / light / step 1 — fail
- **[high] contrast**: 19/25 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "المعالج (CPU Cores)"

### 1024x768 / light / step 2 — fail
- **[high] contrast**: 4/9 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "مفتاح ترخيص العقدة (Sovereign License Ke"

### 1024x768 / light / step 3 — fail
- **[high] contrast**: 9/14 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "أنوية المعالج الافتراضية المخصصة (vCPU C"
- **[high] clipping**: 4 elements extend below viewport (max bottom 821 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / light / step 4 — fail
- **[high] contrast**: 6/10 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "ترابط أقران شبكة Clan Mesh التلقائي (Nod"

### 1024x768 / light / step 5 — fail
- **[high] contrast**: 19/40 text samples below WCAG AA; worst 1.07 (rgb(15, 23, 42) on rgb(30,30,37)) "client1: البوابة والراوتر (Gateway)"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1216 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / light / step 6 — fail
- **[high] contrast**: 20/40 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "شبكة Clan متزامنة ومحصنة بالكامل"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1769 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / oled-black / step 1 — warn
- **[medium] contrast**: 15/25 text samples below WCAG AA; worst 3.7 (rgb(113, 113, 122) on rgb(23,23,30)) "تم فحص واكتشاف كافة عقد Clan.lol الـ 11 "

### 1024x768 / oled-black / step 2 — warn
- **[medium] contrast**: 3/9 text samples below WCAG AA; worst 3 (rgb(255, 255, 255) on rgb(38,166,154)) "التحقق من المفتاح"

### 1024x768 / oled-black / step 3 — fail
- **[high] contrast**: 6/14 text samples below WCAG AA; worst 1.17 (rgba(0, 0, 0, 0.6) on rgb(23,23,30)) "مسار قرص VHDX المستهدف"
- **[high] clipping**: 4 elements extend below viewport (max bottom 821 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / oled-black / step 4 — fail
- **[high] contrast**: 3/10 text samples below WCAG AA; worst 1.17 (rgba(0, 0, 0, 0.6) on rgb(23,23,30)) "عنوان نقطة النهاية (Endpoint)"

### 1024x768 / oled-black / step 5 — fail
- **[medium] contrast**: 6/40 text samples below WCAG AA; worst 3.61 (rgb(113, 113, 122) on rgb(25,25,33)) "سرعة كتابة VHDX"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1216 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1024x768 / oled-black / step 6 — fail
- **[medium] contrast**: 12/40 text samples below WCAG AA; worst 2.83 (rgb(156, 39, 176) on rgb(23,23,30)) "منفذ 9104"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1769 > 768); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / dark / step 1 — warn
- **[medium] contrast**: 12/25 text samples below WCAG AA; worst 3.86 (rgb(25, 118, 210) on rgb(23,23,31)) "{{ state.cpuCores || 8 }} أنوية متوفرة"

### 1280x800 / dark / step 2 — warn
- **[medium] contrast**: 1/9 text samples below WCAG AA; worst 3 (rgb(255, 255, 255) on rgb(38,166,154)) "التحقق من المفتاح"

### 1280x800 / dark / step 3 — fail
- **[high] contrast**: 2/14 text samples below WCAG AA; worst 1.18 (rgba(0, 0, 0, 0.6) on rgb(23,23,31)) "مسار قرص VHDX المستهدف"
- **[high] clipping**: 2 elements extend below viewport (max bottom 822 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / dark / step 4 — fail
- **[high] contrast**: 2/10 text samples below WCAG AA; worst 1.18 (rgba(0, 0, 0, 0.6) on rgb(23,23,31)) "عنوان نقطة النهاية (Endpoint)"

### 1280x800 / dark / step 5 — fail
- **[medium] contrast**: 1/40 text samples below WCAG AA; worst 3.86 (rgb(25, 118, 210) on rgb(23,23,31)) "5. فحص الصحة والجاهزية السيادية"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1217 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / dark / step 6 — fail
- **[medium] contrast**: 5/40 text samples below WCAG AA; worst 2.82 (rgb(156, 39, 176) on rgb(23,23,31)) "منفذ 9104"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1769 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / light / step 1 — fail
- **[high] contrast**: 19/25 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "المعالج (CPU Cores)"

### 1280x800 / light / step 2 — fail
- **[high] contrast**: 4/9 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "مفتاح ترخيص العقدة (Sovereign License Ke"

### 1280x800 / light / step 3 — fail
- **[high] contrast**: 9/14 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "أنوية المعالج الافتراضية المخصصة (vCPU C"
- **[high] clipping**: 2 elements extend below viewport (max bottom 822 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / light / step 4 — fail
- **[high] contrast**: 6/10 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "ترابط أقران شبكة Clan Mesh التلقائي (Nod"

### 1280x800 / light / step 5 — fail
- **[high] contrast**: 19/40 text samples below WCAG AA; worst 1.07 (rgb(15, 23, 42) on rgb(30,30,37)) "client1: البوابة والراوتر (Gateway)"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1217 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / light / step 6 — fail
- **[high] contrast**: 20/40 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "شبكة Clan متزامنة ومحصنة بالكامل"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1769 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / oled-black / step 1 — warn
- **[medium] contrast**: 15/25 text samples below WCAG AA; worst 3.7 (rgb(113, 113, 122) on rgb(23,23,30)) "تم فحص واكتشاف كافة عقد Clan.lol الـ 11 "

### 1280x800 / oled-black / step 2 — warn
- **[medium] contrast**: 3/9 text samples below WCAG AA; worst 3 (rgb(255, 255, 255) on rgb(38,166,154)) "التحقق من المفتاح"

### 1280x800 / oled-black / step 3 — fail
- **[high] contrast**: 6/14 text samples below WCAG AA; worst 1.17 (rgba(0, 0, 0, 0.6) on rgb(23,23,30)) "مسار قرص VHDX المستهدف"
- **[high] clipping**: 2 elements extend below viewport (max bottom 822 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / oled-black / step 4 — fail
- **[high] contrast**: 3/10 text samples below WCAG AA; worst 1.17 (rgba(0, 0, 0, 0.6) on rgb(23,23,30)) "عنوان نقطة النهاية (Endpoint)"

### 1280x800 / oled-black / step 5 — fail
- **[medium] contrast**: 6/40 text samples below WCAG AA; worst 3.61 (rgb(113, 113, 122) on rgb(25,25,33)) "سرعة كتابة VHDX"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1217 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1280x800 / oled-black / step 6 — fail
- **[medium] contrast**: 12/40 text samples below WCAG AA; worst 2.83 (rgb(156, 39, 176) on rgb(23,23,30)) "منفذ 9104"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1769 > 800); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1920x1080 / dark / step 1 — warn
- **[medium] contrast**: 12/25 text samples below WCAG AA; worst 3.86 (rgb(25, 118, 210) on rgb(23,23,31)) "{{ state.cpuCores || 8 }} أنوية متوفرة"

### 1920x1080 / dark / step 2 — warn
- **[medium] contrast**: 1/9 text samples below WCAG AA; worst 3 (rgb(255, 255, 255) on rgb(38,166,154)) "التحقق من المفتاح"

### 1920x1080 / dark / step 3 — fail
- **[high] contrast**: 2/14 text samples below WCAG AA; worst 1.18 (rgba(0, 0, 0, 0.6) on rgb(23,23,31)) "مسار قرص VHDX المستهدف"

### 1920x1080 / dark / step 4 — fail
- **[high] contrast**: 2/10 text samples below WCAG AA; worst 1.18 (rgba(0, 0, 0, 0.6) on rgb(23,23,31)) "عنوان نقطة النهاية (Endpoint)"

### 1920x1080 / dark / step 5 — fail
- **[medium] contrast**: 1/40 text samples below WCAG AA; worst 3.86 (rgb(25, 118, 210) on rgb(23,23,31)) "5. فحص الصحة والجاهزية السيادية"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1219 > 1080); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1920x1080 / dark / step 6 — fail
- **[medium] contrast**: 5/40 text samples below WCAG AA; worst 2.82 (rgb(156, 39, 176) on rgb(23,23,31)) "منفذ 9104"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1768 > 1080); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1920x1080 / light / step 1 — fail
- **[high] contrast**: 19/25 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "المعالج (CPU Cores)"

### 1920x1080 / light / step 2 — fail
- **[high] contrast**: 4/9 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "مفتاح ترخيص العقدة (Sovereign License Ke"

### 1920x1080 / light / step 3 — fail
- **[high] contrast**: 9/14 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "أنوية المعالج الافتراضية المخصصة (vCPU C"

### 1920x1080 / light / step 4 — fail
- **[high] contrast**: 6/10 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "ترابط أقران شبكة Clan Mesh التلقائي (Nod"

### 1920x1080 / light / step 5 — fail
- **[high] contrast**: 19/40 text samples below WCAG AA; worst 1.07 (rgb(15, 23, 42) on rgb(30,30,37)) "client1: البوابة والراوتر (Gateway)"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1219 > 1080); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1920x1080 / light / step 6 — fail
- **[high] contrast**: 20/40 text samples below WCAG AA; worst 1.22 (rgb(15, 23, 42) on rgb(40,40,47)) "شبكة Clan متزامنة ومحصنة بالكامل"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1768 > 1080); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1920x1080 / oled-black / step 1 — warn
- **[medium] contrast**: 15/25 text samples below WCAG AA; worst 3.7 (rgb(113, 113, 122) on rgb(23,23,30)) "تم فحص واكتشاف كافة عقد Clan.lol الـ 11 "

### 1920x1080 / oled-black / step 2 — warn
- **[medium] contrast**: 3/9 text samples below WCAG AA; worst 3 (rgb(255, 255, 255) on rgb(38,166,154)) "التحقق من المفتاح"

### 1920x1080 / oled-black / step 3 — fail
- **[high] contrast**: 6/14 text samples below WCAG AA; worst 1.17 (rgba(0, 0, 0, 0.6) on rgb(23,23,30)) "مسار قرص VHDX المستهدف"

### 1920x1080 / oled-black / step 4 — fail
- **[high] contrast**: 3/10 text samples below WCAG AA; worst 1.17 (rgba(0, 0, 0, 0.6) on rgb(23,23,30)) "عنوان نقطة النهاية (Endpoint)"

### 1920x1080 / oled-black / step 5 — fail
- **[medium] contrast**: 6/40 text samples below WCAG AA; worst 3.61 (rgb(113, 113, 122) on rgb(25,25,33)) "سرعة كتابة VHDX"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1219 > 1080); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

### 1920x1080 / oled-black / step 6 — fail
- **[medium] contrast**: 12/40 text samples below WCAG AA; worst 2.83 (rgb(156, 39, 176) on rgb(23,23,30)) "منفذ 9104"
- **[high] clipping**: 12 elements extend below viewport (max bottom 1768 > 1080); content-wrapper overflow: hidden / hidden [NO SCROLL POSSIBLE]

## Full Checklist

| resolution | theme | step | status | viewport | dpr | max bottom | screenshot | issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1024x768 | dark | 1 | warn | 1024x768 | 1 | 727 | step1-dark-1024x768.png | 1 |
| 1024x768 | dark | 2 | warn | 1024x768 | 1 | 656 | step2-dark-1024x768.png | 1 |
| 1024x768 | dark | 3 | fail | 1024x768 | 1 | 821 | step3-dark-1024x768.png | 2 |
| 1024x768 | dark | 4 | fail | 1024x768 | 1 | 624 | step4-dark-1024x768.png | 1 |
| 1024x768 | dark | 5 | fail | 1024x768 | 1 | 1216 | step5-dark-1024x768.png | 2 |
| 1024x768 | dark | 6 | fail | 1024x768 | 1 | 1769 | step6-dark-1024x768.png | 2 |
| 1024x768 | light | 1 | fail | 1024x768 | 1 | 727 | step1-light-1024x768.png | 1 |
| 1024x768 | light | 2 | fail | 1024x768 | 1 | 656 | step2-light-1024x768.png | 1 |
| 1024x768 | light | 3 | fail | 1024x768 | 1 | 821 | step3-light-1024x768.png | 2 |
| 1024x768 | light | 4 | fail | 1024x768 | 1 | 624 | step4-light-1024x768.png | 1 |
| 1024x768 | light | 5 | fail | 1024x768 | 1 | 1216 | step5-light-1024x768.png | 2 |
| 1024x768 | light | 6 | fail | 1024x768 | 1 | 1769 | step6-light-1024x768.png | 2 |
| 1024x768 | oled-black | 1 | warn | 1024x768 | 1 | 727 | step1-oled-black-1024x768.png | 1 |
| 1024x768 | oled-black | 2 | warn | 1024x768 | 1 | 656 | step2-oled-black-1024x768.png | 1 |
| 1024x768 | oled-black | 3 | fail | 1024x768 | 1 | 821 | step3-oled-black-1024x768.png | 2 |
| 1024x768 | oled-black | 4 | fail | 1024x768 | 1 | 624 | step4-oled-black-1024x768.png | 1 |
| 1024x768 | oled-black | 5 | fail | 1024x768 | 1 | 1216 | step5-oled-black-1024x768.png | 2 |
| 1024x768 | oled-black | 6 | fail | 1024x768 | 1 | 1769 | step6-oled-black-1024x768.png | 2 |
| 1280x800 | dark | 1 | warn | 1280x800 | 1 | 728 | step1-dark-1280x800.png | 1 |
| 1280x800 | dark | 2 | warn | 1280x800 | 1 | 657 | step2-dark-1280x800.png | 1 |
| 1280x800 | dark | 3 | fail | 1280x800 | 1 | 822 | step3-dark-1280x800.png | 2 |
| 1280x800 | dark | 4 | fail | 1280x800 | 1 | 625 | step4-dark-1280x800.png | 1 |
| 1280x800 | dark | 5 | fail | 1280x800 | 1 | 1217 | step5-dark-1280x800.png | 2 |
| 1280x800 | dark | 6 | fail | 1280x800 | 1 | 1769 | step6-dark-1280x800.png | 2 |
| 1280x800 | light | 1 | fail | 1280x800 | 1 | 728 | step1-light-1280x800.png | 1 |
| 1280x800 | light | 2 | fail | 1280x800 | 1 | 657 | step2-light-1280x800.png | 1 |
| 1280x800 | light | 3 | fail | 1280x800 | 1 | 822 | step3-light-1280x800.png | 2 |
| 1280x800 | light | 4 | fail | 1280x800 | 1 | 625 | step4-light-1280x800.png | 1 |
| 1280x800 | light | 5 | fail | 1280x800 | 1 | 1217 | step5-light-1280x800.png | 2 |
| 1280x800 | light | 6 | fail | 1280x800 | 1 | 1769 | step6-light-1280x800.png | 2 |
| 1280x800 | oled-black | 1 | warn | 1280x800 | 1 | 728 | step1-oled-black-1280x800.png | 1 |
| 1280x800 | oled-black | 2 | warn | 1280x800 | 1 | 657 | step2-oled-black-1280x800.png | 1 |
| 1280x800 | oled-black | 3 | fail | 1280x800 | 1 | 822 | step3-oled-black-1280x800.png | 2 |
| 1280x800 | oled-black | 4 | fail | 1280x800 | 1 | 625 | step4-oled-black-1280x800.png | 1 |
| 1280x800 | oled-black | 5 | fail | 1280x800 | 1 | 1217 | step5-oled-black-1280x800.png | 2 |
| 1280x800 | oled-black | 6 | fail | 1280x800 | 1 | 1769 | step6-oled-black-1280x800.png | 2 |
| 1920x1080 | dark | 1 | warn | 1920x1080 | 1 | 730 | step1-dark-1920x1080.png | 1 |
| 1920x1080 | dark | 2 | warn | 1920x1080 | 1 | 659 | step2-dark-1920x1080.png | 1 |
| 1920x1080 | dark | 3 | fail | 1920x1080 | 1 | 824 | step3-dark-1920x1080.png | 1 |
| 1920x1080 | dark | 4 | fail | 1920x1080 | 1 | 627 | step4-dark-1920x1080.png | 1 |
| 1920x1080 | dark | 5 | fail | 1920x1080 | 1 | 1219 | step5-dark-1920x1080.png | 2 |
| 1920x1080 | dark | 6 | fail | 1920x1080 | 1 | 1768 | step6-dark-1920x1080.png | 2 |
| 1920x1080 | light | 1 | fail | 1920x1080 | 1 | 730 | step1-light-1920x1080.png | 1 |
| 1920x1080 | light | 2 | fail | 1920x1080 | 1 | 659 | step2-light-1920x1080.png | 1 |
| 1920x1080 | light | 3 | fail | 1920x1080 | 1 | 824 | step3-light-1920x1080.png | 1 |
| 1920x1080 | light | 4 | fail | 1920x1080 | 1 | 627 | step4-light-1920x1080.png | 1 |
| 1920x1080 | light | 5 | fail | 1920x1080 | 1 | 1219 | step5-light-1920x1080.png | 2 |
| 1920x1080 | light | 6 | fail | 1920x1080 | 1 | 1768 | step6-light-1920x1080.png | 2 |
| 1920x1080 | oled-black | 1 | warn | 1920x1080 | 1 | 730 | step1-oled-black-1920x1080.png | 1 |
| 1920x1080 | oled-black | 2 | warn | 1920x1080 | 1 | 659 | step2-oled-black-1920x1080.png | 1 |
| 1920x1080 | oled-black | 3 | fail | 1920x1080 | 1 | 824 | step3-oled-black-1920x1080.png | 1 |
| 1920x1080 | oled-black | 4 | fail | 1920x1080 | 1 | 627 | step4-oled-black-1920x1080.png | 1 |
| 1920x1080 | oled-black | 5 | fail | 1920x1080 | 1 | 1219 | step5-oled-black-1920x1080.png | 2 |
| 1920x1080 | oled-black | 6 | fail | 1920x1080 | 1 | 1768 | step6-oled-black-1920x1080.png | 2 |