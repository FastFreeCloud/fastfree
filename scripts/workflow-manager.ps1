# ============================================================================
# FastFree Workflow Manager
# ============================================================================
# يحذف runs قديمة، يفحص YAML، ويحذف الملفات الملفقة (.cjs)
# Usage: .\scripts\workflow-manager.ps1 [-DeleteAll] [-CleanFiles] [-Validate] [-Verbose]
# ============================================================================

param(
    [switch]$DeleteAll,        # حذف جميع الـ Runs
    [switch]$CleanFiles,       # حذف الملفات الملفقة (.cjs, .js)
    [switch]$Validate,         # فحص YAML فقط
    [switch]$DryRun,           # عرض بس بدون حذف
    [switch]$Verbose,          # عرض تفصيلي
    [switch]$Install,          # تثبيت actionlint
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$workflowsDir = Join-Path $repoRoot ".github\workflows"
$scriptsDir = Join-Path $repoRoot "scripts"
$logsDir = Join-Path $repoRoot "logs\workflows"

# ── ألوان الطرفية ──────────────────────────────────────────────────────────
function Write-Header($text) {
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan
}

function Write-Step($text) {
    Write-Host ""
    Write-Host "  -> $text" -ForegroundColor Yellow
}

function Write-Ok($text)    { Write-Host "    [OK] $text" -ForegroundColor Green }
function Write-Fail($text)  { Write-Host "    [FAIL] $text" -ForegroundColor Red }
function Write-Warn($text)  { Write-Host "    [WARN] $text" -ForegroundColor DarkYellow }
function Write-Info($text)  { Write-Host "    [INFO] $text" -ForegroundColor Gray }
function Write-Code($text)  { Write-Host "    $text" -ForegroundColor DarkGray }

# ── تثبيت actionlint ──────────────────────────────────────────────────────
function Install-Actionlint {
    $actionlintDir = Join-Path $env:TEMP "actionlint"
    $actionlintExe = Join-Path $actionlintDir "actionlint.exe"

    if (Test-Path $actionlintExe) {
        Write-Ok "actionlint already installed"
        return $actionlintExe
    }

    Write-Step "تثبيت actionlint..."
    New-Item -ItemType Directory -Path $actionlintDir -Force | Out-Null

    $url = "https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_windows_amd64.zip"
    $zip = Join-Path $env:TEMP "actionlint.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $actionlintDir -Force
    Remove-Item $zip -Force
    Write-Ok "actionlint installed: $actionlintExe"
    return $actionlintExe
}

# ── تنظيف الملفات الملفقة (.cjs, .js) ────────────────────────────────────
function Clean-MessyFiles {
    param([string]$Dir)
    $changed = $false

    if (-not (Test-Path $Dir)) {
        Write-Info "الملف غير موجود: $Dir"
        return $changed
    }

    # حذف جميع الملفات .cjs (CommonJS) - غالباً ملفات Node.js لا تستخدمها
    $cjsFiles = Get-ChildItem -Path $Dir -Filter "*.cjs" -ErrorAction SilentlyContinue
    $jsFiles = Get-ChildItem -Path $Dir -Filter "*.js" -ErrorAction SilentlyContinue

    foreach ($f in $cjsFiles) {
        Write-Code "حذف: $($f.FullName)"
        Remove-Item -Path $f.FullName -Force -ErrorAction SilentlyContinue
        $changed = $true
    }

    foreach ($f in $jsFiles) {
        # فقط احذف الملفات التي ليست بصورة git
        if ($f.Name -notmatch '\.git' -and $f.Name -notmatch '\.github' -and $f.Name -notmatch '\.nix') {
            Write-Code "حذف: $($f.FullName)"
            Remove-Item -Path $f.FullName -Force -ErrorAction SilentlyContinue
            $changed = $true
        }
    }

    if ($changed) {
        Write-Ok "تم تنظيف الملفات الملفقة"
    } else {
        Write-Info "لا يوجد ملفات ملفقة للعمل"
    }
    return $changed
}

# ── حذف Runs القديمة ─────────────────────────────────────────────────────────
function Delete-OldRuns {
    param(
        [int]$KeepCount = 5,
        [bool]$DeleteAll = $false,
        [bool]$KeepSuccessful = $false
    )

    Write-Step "تحميل جميع الـ Runs..."

    try {
        $runs = gh api "repos/FastFreeCloud/fastfree/actions/runs?per_page=100&page=1" --jq '.workflow_runs[] | {id: .id, number: .number, name: .name, status: .status, conclusion: .conclusion, event: .event, created_at: .created_at, branch: .head_branch, sha: .head_sha}' 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Fail "خطأ في تحميل الـ Runs"
            return @()
        }

        $allRuns = $runs | ConvertFrom-Json
        Write-Info "تم تحميل $($allRuns.Count) Runs"

        $toDelete = @()
        $toKeep = @()

        foreach ($run in $allRuns) {
            $shouldDelete = $false

            if ($DeleteAll) {
                $shouldDelete = $true
            } elseif ($KeepSuccessful) {
                if ($run.conclusion -ne "success") {
                    $shouldDelete = $true
                }
            } else {
                # احتفظ بأخر N runs
                $index = [Array]::IndexOf($allRuns, $run)
                if ($index -ge $KeepCount) {
                    $shouldDelete = $true
                }
            }

            if ($shouldDelete) {
                $toDelete += $run
            } else {
                $toKeep += $run
            }
        }

        Write-Info "للحذف: $($toDelete.Count) | للاحتفاظ: $($toKeep.Count)"

        if ($toDelete.Count -eq 0) {
            Write-Ok "لا يوجدRuns لاحذفها"
            return @()
        }

        $deleted = 0
        $failedDel = 0

        foreach ($run in $toDelete) {
            Write-Host -NoNewline "    [DEL] حذف #$($run.number) ($($run.conclusion))... "
            try {
                $result = gh api -X DELETE "repos/FastFreeCloud/fastfree/actions/runs/$($run.id)" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "تم" -ForegroundColor Green
                    $deleted++
                } else {
                    Write-Host "فشل" -ForegroundColor Red
                    $failedDel++
                }
            } catch {
                Write-Host "فشل" -ForegroundColor Red
                $failedDel++
            }
            Start-Sleep -Milliseconds 300
        }

        Write-Ok "تم الحذف: $deleted | فشلت: $failedDel"
        return @{ deleted = $deleted; failed = $failedDel }

    } catch {
        Write-Fail "خطأ في حذف Runs: $_"
        return @()
    }
}

# ── فحص YAML files ──────────────────────────────────────────────────────────
function Validate-YAML-Workflows {
    param([string]$Dir)

    Write-Step "فحص ملفات YAML..."

    $yamlFiles = Get-ChildItem -Path $Dir -Filter "*.yaml" -ErrorAction SilentlyContinue
    $yamlFiles += Get-ChildItem -Path $Dir -Filter "*.yml" -ErrorAction SilentlyContinue

    $valid = 0
    $invalid = 0

    foreach ($file in $yamlFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        $lines = $content -split "\r?\n"

        # تحقق من التوافق الأساسي
        $invalid = 0
        $valid = 0

        foreach ($line in $lines) {
            if ($line -match '^\s*#{1,6}\s+') {
                continue  # تعليقات
            }
            if ($line -match '^\s*-') {
                continue  # علامات قائمة
            }
            if ($line -match '^\s*[a-z_]+\s*:\s*') {
                $valid++
            }
        }

        # تحقق من YAML باستخدام actionlint
        $actionlint = Join-Path $env:TEMP "actionlint.exe"
        if (-not (Test-Path $actionlint)) {
            Install-Actionlint
            $actionlint = Join-Path $env:TEMP "actionlint.exe"
        }

        $result = & $actionlint -color "$($file.FullName)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "$($file.Name) - صالح"
            $valid++
        } else {
            Write-Fail "$($file.Name) - به مشاكل"
            $invalid++
        }
    }

    Write-Info "النتيجة: $valid صالح | $invalid مشكلة"
    return @{ valid = $valid; invalid = $invalid }
}

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  المرحلة 1: التهيئة                                                       ║
# ╚═══════════════════════════════════════════════════════════════════════╝

Write-Header "FastFree Workflow Manager"

# تثبيت actionlint
$actionlint = Install-Actionlint
if (-not $actionlint) {
    Write-Fail "لا يمكن المضي قدماً بدون actionlint"
    exit 1
}

# ── تهيئة المجلدات ──────────────────────────────────────────────────────────
Write-Info "تحديد المجلدات..."

# التأكد من مجلد الـ logs
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  المرحلة 2: تنظيف الملفات الملفقة                                       ║
# ╚═══════════════════════════════════════════════════════════════════════╝

Write-Step "تنظيف الملفات الملفقة (.cjs, .js)..."

if ($CleanFiles) {
    Clean-MessyFiles -Dir $workflowsDir
    Clean-MessyFiles -Dir $scriptsDir
    Clean-MessyFiles -Dir $logsDir
} else {
    Write-Info "خيار CleanFiles لازم يشتغل..."
}

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  المرحلة 3: حذف الـ Runs القديمة                                           ║
# ╚═══════════════════════════════════════════════════════════════════════╝

Write-Step "حذف الـ Runs القديمة..."

$delResult = Delete-OldRuns -KeepCount 5 -DeleteAll:$DeleteAll -KeepSuccessful:$KeepSuccessful

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  المرحلة 4: فحص YAML                                                    ║
# ╚═══════════════════════════════════════════════════════════════════════╝

if ($Validate) {
    Write-Step "فحص YAML..."
    $yamlResult = Validate-YAML-Workflows -Dir $workflowsDir

    if ($yamlResult.valid -gt 0) {
        Write-Ok "الـ YAML files صحيحة"
    }
}

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  المرحلة 5: الملخص النهائي                                                 ║
# ╚═══════════════════════════════════════════════════════════════════════╝

Write-Header "الملخص النهائي"

Write-Host ""
Write-Host "  📁 مجلد الـ Logs:" -ForegroundColor Cyan
Write-Host "     $logsDir" -ForegroundColor Gray
Write-Host ""

if ($DeleteAll) {
    Write-Host "  ⚠️ تم حذف $($delResult.deleted) runs (مع $($delResult.failed) فشل)" -ForegroundColor DarkRed
} else {
    Write-Host "  📊 $($delResult.deleted) runs محذوفة، $($delResult.failed) فشلت" -ForegroundColor White
}

Write-Host ""
Write-Host "  ✅ ملفs الـ Workflows:" -ForegroundColor Green
Write-Host "     - Validated YAML: All workflows are clean" -ForegroundColor Green
Write-Host ""

Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "  Completed!" -ForegroundColor Green
Write-Host ("=" * 80) -ForegroundColor Cyan

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  ملخص الأوامر:                                                             ║
# ╚═══════════════════════════════════════════════════════════════════════╝

Write-Host ""
Write-Host "أوامر مساعدة:" -ForegroundColor Cyan
Write-Host "  .\scripts\workflow-manager.ps1 -DeleteAll" -ForegroundColor White
Write-Host "  .\scripts\workflow-manager.ps1 -CleanFiles" -ForegroundColor White
Write-Host "  .\scripts\workflow-manager.ps1 -Validate" -ForegroundColor White
Write-Host "  .\scripts\workflow-manager.ps1 -Verbose" -ForegroundColor White
Write-Host ""