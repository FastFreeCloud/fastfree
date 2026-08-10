<#
.SYNOPSIS
    FastFree OS - System Update
.DESCRIPTION
    Updates the FastFree OS system inside WSL by running nixos-rebuild switch
    using the local project files. No git pull needed — uses files directly
    from the Windows filesystem mounted at /mnt/d/.
.PARAMETER DistroName
    The WSL distribution name. Default is "fastfree".
.PARAMETER ProjectPath
    Path to the project inside WSL. Auto-detected if not specified.
#>

param (
    [string]$DistroName = "fastfree",
    [string]$ProjectPath = ""
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# ------------------------------------------------------------------
#  Theme — Blue accent for update tool
# ------------------------------------------------------------------
$C = @{
    FormBg  = [System.Drawing.Color]::FromArgb(30, 30, 46)
    GroupBg = [System.Drawing.Color]::FromArgb(42, 42, 64)
    HdrL    = [System.Drawing.Color]::FromArgb(50, 120, 200)
    HdrR    = [System.Drawing.Color]::FromArgb(25, 60, 120)
    Accent  = [System.Drawing.Color]::FromArgb(80, 160, 255)
    BtnOk   = [System.Drawing.Color]::FromArgb(46, 160, 67)
    BtnDng  = [System.Drawing.Color]::FromArgb(200, 60, 60)
    BtnInfo = [System.Drawing.Color]::FromArgb(50, 120, 200)
    Fg2     = [System.Drawing.Color]::FromArgb(180, 180, 200)
    Fg3     = [System.Drawing.Color]::FromArgb(120, 120, 150)
    InBg    = [System.Drawing.Color]::FromArgb(24, 24, 40)
    InFg    = [System.Drawing.Color]::FromArgb(220, 220, 240)
    LogBg   = [System.Drawing.Color]::FromArgb(16, 16, 28)
    LogFg   = [System.Drawing.Color]::FromArgb(100, 255, 160)
    StOk    = [System.Drawing.Color]::FromArgb(46, 160, 67)
    StBad   = [System.Drawing.Color]::FromArgb(200, 60, 60)
    StWarn  = [System.Drawing.Color]::FromArgb(220, 180, 50)
}
$F = @{
    Title = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
    Sub   = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Italic)
    Norm  = New-Object System.Drawing.Font("Segoe UI", 9.5)
    Lbl   = New-Object System.Drawing.Font("Segoe UI Semibold", 9)
    Btn   = New-Object System.Drawing.Font("Segoe UI Semibold", 9)
    Mono  = New-Object System.Drawing.Font("Cascadia Code, Consolas", 9)
    Grp   = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5)
    Hint  = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Italic)
}

# ------------------------------------------------------------------
#  UI factory helpers
# ------------------------------------------------------------------
function New-Btn ($text,$x,$y,$w=120,$h=32,$bg=$null) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text=$text; $b.Location=[System.Drawing.Point]::new($x,$y)
    $b.Size=[System.Drawing.Size]::new($w,$h); $b.FlatStyle="Flat"
    $b.FlatAppearance.BorderSize=0; $b.Font=$F.Btn
    $b.Cursor=[System.Windows.Forms.Cursors]::Hand
    $b.BackColor = if ($bg) { $bg } else { $C.Accent }
    $b.ForeColor=[System.Drawing.Color]::White; $b.Tag=$b.BackColor
    $b.Add_MouseEnter({ $cc=$this.Tag; $this.BackColor=[System.Drawing.Color]::FromArgb([Math]::Min(255,$cc.R+25),[Math]::Min(255,$cc.G+25),[Math]::Min(255,$cc.B+25)) })
    $b.Add_MouseLeave({ $this.BackColor=$this.Tag })
    $b
}

# ------------------------------------------------------------------
#  Form
# ------------------------------------------------------------------
$form = New-Object System.Windows.Forms.Form
$form.Text = "FastFree OS - System Update"
$form.Size = [System.Drawing.Size]::new(700, 650)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Font = $F.Norm
$form.BackColor = $C.FormBg

# --- Header ---
$hdr = New-Object System.Windows.Forms.Panel
$hdr.Dock = [System.Windows.Forms.DockStyle]::Top; $hdr.Height = 64
$hdr.Add_Paint({
    param($s,$e)
    $r=$s.ClientRectangle
    $br=New-Object System.Drawing.Drawing2D.LinearGradientBrush($r,$C.HdrL,$C.HdrR,[System.Drawing.Drawing2D.LinearGradientMode]::Horizontal)
    $e.Graphics.FillRectangle($br,$r); $br.Dispose()
    $e.Graphics.DrawString("FastFree OS - System Update",$F.Title,[System.Drawing.Brushes]::White,18,10)
    $sb2=New-Object System.Drawing.SolidBrush($C.Fg2)
    $e.Graphics.DrawString("Rebuild NixOS configuration from local project files",$F.Sub,$sb2,22,38); $sb2.Dispose()
})
$form.Controls.Add($hdr)

# ---- System Info GroupBox ----
$grpInfo = New-Object System.Windows.Forms.GroupBox
$grpInfo.Text = " System Info"
$grpInfo.Location = [System.Drawing.Point]::new(15, 72)
$grpInfo.Size = [System.Drawing.Size]::new(655, 120)
$grpInfo.ForeColor = $C.Accent
$grpInfo.BackColor = $C.GroupBg
$grpInfo.Font = $F.Grp
$form.Controls.Add($grpInfo)

# -- Distro Name --
$lblDistro = New-Object System.Windows.Forms.Label
$lblDistro.Text = "Distro:"
$lblDistro.Location = [System.Drawing.Point]::new(20, 30)
$lblDistro.Size = [System.Drawing.Size]::new(100, 20)
$lblDistro.ForeColor = $C.Fg2; $lblDistro.Font = $F.Lbl
$grpInfo.Controls.Add($lblDistro)

$lblDistroVal = New-Object System.Windows.Forms.Label
$lblDistroVal.Text = $DistroName
$lblDistroVal.Location = [System.Drawing.Point]::new(120, 30)
$lblDistroVal.Size = [System.Drawing.Size]::new(200, 20)
$lblDistroVal.ForeColor = $C.InFg; $lblDistroVal.Font = $F.Norm
$grpInfo.Controls.Add($lblDistroVal)

# -- Status --
$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Status:"
$lblStatus.Location = [System.Drawing.Point]::new(20, 55)
$lblStatus.Size = [System.Drawing.Size]::new(100, 20)
$lblStatus.ForeColor = $C.Fg2; $lblStatus.Font = $F.Lbl
$grpInfo.Controls.Add($lblStatus)

$lblStatusVal = New-Object System.Windows.Forms.Label
$lblStatusVal.Text = "Checking..."
$lblStatusVal.Location = [System.Drawing.Point]::new(120, 55)
$lblStatusVal.Size = [System.Drawing.Size]::new(300, 20)
$lblStatusVal.ForeColor = $C.StWarn; $lblStatusVal.Font = $F.Norm
$grpInfo.Controls.Add($lblStatusVal)

# -- Project Path --
$lblProject = New-Object System.Windows.Forms.Label
$lblProject.Text = "Project:"
$lblProject.Location = [System.Drawing.Point]::new(20, 80)
$lblProject.Size = [System.Drawing.Size]::new(100, 20)
$lblProject.ForeColor = $C.Fg2; $lblProject.Font = $F.Lbl
$grpInfo.Controls.Add($lblProject)

$lblProjectVal = New-Object System.Windows.Forms.Label
$lblProjectVal.Text = "Auto-detecting..."
$lblProjectVal.Location = [System.Drawing.Point]::new(120, 80)
$lblProjectVal.Size = [System.Drawing.Size]::new(500, 20)
$lblProjectVal.ForeColor = $C.InFg; $lblProjectVal.Font = $F.Norm
$grpInfo.Controls.Add($lblProjectVal)

# ---- Update GroupBox ----
$grpUpdate = New-Object System.Windows.Forms.GroupBox
$grpUpdate.Text = " Update"
$grpUpdate.Location = [System.Drawing.Point]::new(15, 198)
$grpUpdate.Size = [System.Drawing.Size]::new(655, 90)
$grpUpdate.ForeColor = $C.Accent
$grpUpdate.BackColor = $C.GroupBg
$grpUpdate.Font = $F.Grp
$form.Controls.Add($grpUpdate)

$btnUpdate = New-Btn "  Update System" 20 30 200 40 $C.BtnOk
$btnUpdate.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 10)
$grpUpdate.Controls.Add($btnUpdate)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Text = "Runs nixos-rebuild switch with sudo (no git pull needed)"
$lblHint.Location = [System.Drawing.Point]::new(230, 38)
$lblHint.Size = [System.Drawing.Size]::new(400, 20)
$lblHint.ForeColor = $C.Fg3; $lblHint.Font = $F.Hint
$grpUpdate.Controls.Add($lblHint)

# --- Progress ---
$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = [System.Drawing.Point]::new(15, 295)
$progress.Size = [System.Drawing.Size]::new(655, 8)
$progress.Style = "Marquee"; $progress.MarqueeAnimationSpeed = 0
$form.Controls.Add($progress)

# --- Log ---
$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location = [System.Drawing.Point]::new(15, 310)
$txtLog.Size = [System.Drawing.Size]::new(655, 215)
$txtLog.Multiline = $true; $txtLog.ScrollBars = "Vertical"; $txtLog.ReadOnly = $true
$txtLog.BackColor = $C.LogBg; $txtLog.ForeColor = $C.LogFg
$txtLog.Font = $F.Mono; $txtLog.BorderStyle = "None"
$form.Controls.Add($txtLog)

# --- Copy Log button ---
$btnCopy = New-Btn "  Copy Log" 540 530 130 28 $C.BtnInfo
$btnCopy.Font = $F.Btn
$btnCopy.Add_Click({
    if ($txtLog.Text.Length -gt 0) {
        [System.Windows.Forms.Clipboard]::SetText($txtLog.Text)
        $sLbl.Text = "Log copied to clipboard!"
        $sLbl.ForeColor = $C.StOk
        Start-Sleep -Seconds 2
        $sLbl.Text = "Ready"
        $sLbl.ForeColor = $C.Fg3
    }
})
$form.Controls.Add($btnCopy)

# --- Status bar ---
$sbar = New-Object System.Windows.Forms.StatusStrip; $sbar.BackColor = $C.FormBg
$sLbl = New-Object System.Windows.Forms.ToolStripStatusLabel
$sLbl.Text = "Ready"; $sLbl.ForeColor = $C.Fg3; $sLbl.Font = $F.Norm
[void]$sbar.Items.Add($sLbl); $form.Controls.Add($sbar)

# ------------------------------------------------------------------
#  Thread-safe log queue + UI timer (no InvokeRequired needed)
# ------------------------------------------------------------------
$script:logQueue = [System.Collections.ArrayList]::Synchronized([System.Collections.ArrayList]::new())
$script:sharedState = [hashtable]::Synchronized(@{ status = $null; busy = $null })

$logTimer = New-Object System.Windows.Forms.Timer
$logTimer.Interval = 100
$logTimer.Add_Tick({
    while ($script:logQueue.Count -gt 0) {
        $m = $script:logQueue[0]
        $script:logQueue.RemoveAt(0)
        $txtLog.AppendText($m + "`r`n")
    }
    $st = $script:sharedState.status
    if ($null -ne $st) { $sLbl.Text = $st; $script:sharedState.status = $null }
    $bv = $script:sharedState.busy
    if ($null -ne $bv) {
        $btnUpdate.Enabled = -not $bv
        $progress.MarqueeAnimationSpeed = if ($bv) { 30 } else { 0 }
        if (-not $bv) { $sLbl.Text = "Ready" }
        $script:sharedState.busy = $null
    }
})
$logTimer.Start()

function Write-Log ($Message, $Level = "INFO") {
    $ts = Get-Date -Format "HH:mm:ss"
    [void]$logQueue.Add("[$ts][$Level] $Message")
}
function Set-Status ($Text) { $sharedState.status = $Text }
function Set-Busy ($Busy) { $sharedState.busy = $Busy }

# ------------------------------------------------------------------
#  Detect project path inside WSL
# ------------------------------------------------------------------
function Find-WSLProject {
    # Try common Windows drive mounts
    foreach ($drive in @("d","c","e","f")) {
        $wslPath = "/mnt/$drive/2026/fastfree/dev/fastfree_os"
        $check = wsl -d $DistroName -e bash -c "test -f $wslPath/flake.nix && echo ok" 2>&1
        if ($check -match "ok") {
            return $wslPath
        }
    }
    # Check /etc/fastfree as fallback
    $etcCheck = wsl -d $DistroName -e bash -c "test -f /etc/fastfree/flake.nix && echo ok" 2>&1
    if ($etcCheck -match "ok") {
        return "/etc/fastfree"
    }
    return ""
}

# ------------------------------------------------------------------
#  Check WSL status
# ------------------------------------------------------------------
function Get-WSLStatus {
    try {
        $list = wsl --list --quiet 2>&1
        $listStr = ($list -join "`n") -replace "`0", ""
        if ($listStr -match $DistroName) {
            $running = wsl -d $DistroName -e bash -c "echo running" 2>&1
            if ($running -match "running") {
                return "Running"
            }
            return "Stopped"
        }
        return "Not Installed"
    } catch {
        return "Error"
    }
}

# ------------------------------------------------------------------
#  Background runner
# ------------------------------------------------------------------
function Start-BgWork ([scriptblock]$Work, [hashtable]$Vars = @{}) {
    $rs = [runspacefactory]::CreateRunspace(); $rs.ApartmentState = "STA"; $rs.ThreadOptions = "ReuseThread"; $rs.Open()
    foreach ($n in @('txtLog','form','sLbl','progress','btnUpdate')) {
        $v = Get-Variable -Name $n -ValueOnly -ErrorAction SilentlyContinue
        if ($null -ne $v) { $rs.SessionStateProxy.SetVariable($n, $v) }
    }
    foreach ($k in $Vars.Keys) { $rs.SessionStateProxy.SetVariable($k, $Vars[$k]) }
    $ps = [powershell]::Create(); $ps.Runspace = $rs
    $sb = [System.Text.StringBuilder]::new()
    foreach ($fn in @('Write-Log','Set-Busy','Set-Status')) {
        $d = (Get-Command $fn -ErrorAction SilentlyContinue).Definition
        if ($d) { [void]$sb.AppendLine($d) }
    }
    [void]$sb.AppendLine($Work.ToString())
    [void]$ps.AddScript($sb.ToString())
    $ar = $ps.BeginInvoke()
    $null = Register-ObjectEvent -InputObject $ps -EventName InvocationStateChanged -Action {
        if ($EventArgs.InvocationStateInfo.State -in @("Completed","Failed","Stopped")) {
            try { $Sender.EndInvoke($Event.MessageData.AR) } catch {}
            $Sender.Dispose(); $Event.MessageData.RS.Close(); $Event.MessageData.RS.Dispose()
            Unregister-Event -SourceIdentifier $Event.SourceIdentifier -ErrorAction SilentlyContinue
            Remove-Job -Name $Event.SourceIdentifier -ErrorAction SilentlyContinue
        }
    } -MessageData @{ AR = $ar; RS = $rs }
}

# ------------------------------------------------------------------
#  On load: check status & detect project
# ------------------------------------------------------------------
$form.Add_Shown({
    $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor

    # Check WSL status
    Write-Log "Checking WSL distribution '$DistroName'..."
    $status = Get-WSLStatus
    $lblStatusVal.Text = $status

    switch ($status) {
        "Running" {
            $lblStatusVal.ForeColor = $C.StOk
            Write-Log "Distribution '$DistroName' is running." "OK"
        }
        "Stopped" {
            $lblStatusVal.ForeColor = $C.StWarn
            Write-Log "Distribution '$DistroName' exists but is stopped." "WARN"
        }
        "Not Installed" {
            $lblStatusVal.ForeColor = $C.StBad
            Write-Log "Distribution '$DistroName' is not installed!" "ERROR"
            Write-Log "Run the installer first: 1_fastfree_installer.ps1" "ERROR"
            $btnUpdate.Enabled = $false
        }
        "Error" {
            $lblStatusVal.ForeColor = $C.StBad
            Write-Log "Error checking WSL status." "ERROR"
            $btnUpdate.Enabled = $false
        }
    }

    # Detect project path
    if ($status -eq "Running") {
        Write-Log "Detecting project path inside WSL..."
        $detectedPath = Find-WSLProject
        if ($detectedPath) {
            $lblProjectVal.Text = $detectedPath
            Write-Log "Project found: $detectedPath" "OK"
        } else {
            $lblProjectVal.Text = "Not found"
            $lblProjectVal.ForeColor = $C.StBad
            Write-Log "Cannot find flake.nix in WSL!" "ERROR"
            Write-Log "Expected at: /mnt/d/2026/fastfree/dev/fastfree_os/" "ERROR"
            $btnUpdate.Enabled = $false
        }
    }

    $form.Cursor = [System.Windows.Forms.Cursors]::Default
})

# ------------------------------------------------------------------
#  Wire: Update button
# ------------------------------------------------------------------
$btnUpdate.Add_Click({
    $txtLog.Clear()
    $btnUpdate.Enabled = $false
    $progress.MarqueeAnimationSpeed = 30
    $projPath = $lblProjectVal.Text

    if (-not $projPath -or $projPath -eq "Not found" -or $projPath -eq "Auto-detecting...") {
        $txtLog.AppendText("[ERROR] Project path not detected!`r`n")
        $btnUpdate.Enabled = $true
        $progress.MarqueeAnimationSpeed = 0
        return
    }

    $sLbl.Text = "Rebuilding NixOS..."
    $txtLog.AppendText("[INFO] Starting system update...`r`n")
    $txtLog.AppendText("[INFO] Running: nixos-rebuild switch --flake $projPath#dev`r`n")

    # Write bash script to temp file, then execute via WSL
    $bashScript = @"
#!/bin/bash
export PATH=/run/current-system/sw/bin:/usr/local/bin:/usr/bin:/bin
echo '[INFO] Setting git safe.directory...'
git config --global --add safe.directory '$projPath'
echo '[INFO] Cleaning stale transient services...'
systemctl stop nixos-rebuild-switch-to-configuration.service 2>/dev/null || true
systemctl reset-failed nixos-rebuild-switch-to-configuration.service 2>/dev/null || true
rm -f /run/systemd/transient/nixos-rebuild-switch-to-configuration.service 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true
echo '[INFO] Running nixos-rebuild switch...'
/run/current-system/sw/bin/nixos-rebuild switch --flake '$projPath#dev' 2>&1
"@
    $tmpScript = "$env:TEMP\fastfree_rebuild.sh"
    Set-Content -Path $tmpScript -Value $bashScript -Encoding UTF8 -NoNewline
    $wslTmpPath = wsl -d $DistroName -- wslpath -a "$($tmpScript -replace '\\','/')"

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo.FileName = "wsl.exe"
    $proc.StartInfo.Arguments = "-d $DistroName -u root -- bash $wslTmpPath"
    $proc.StartInfo.UseShellExecute = $false
    $proc.StartInfo.RedirectStandardOutput = $true
    $proc.StartInfo.RedirectStandardError = $true
    $proc.StartInfo.CreateNoWindow = $true
    $proc.Start()

    $hasError = $false
    while (!$proc.StandardOutput.EndOfStream) {
        $line = $proc.StandardOutput.ReadLine()
        $t = $line.Trim()
        if (-not $t) { continue }
        if ($t -match "^warning:") {
            $txtLog.AppendText("[WARN] $t`r`n")
        } elseif ($t -match "error:|FAILED|returned non-zero|Permission denied") {
            $txtLog.AppendText("[ERROR] $t`r`n")
            $hasError = $true
        } elseif ($t -match "activating|switching|setting up|reload|restart|new units|reloading") {
            $txtLog.AppendText("[INFO] $t`r`n")
        } elseif ($t -match "Active:|Loaded:|Process:|Main PID:|switch-to-configuration|units failed") {
            $txtLog.AppendText("[INFO] $t`r`n")
        } elseif ($t -match "done|successfully|finished|completed|Checking switch") {
            $txtLog.AppendText("[ OK] $t`r`n")
        } elseif ($t -match "building the system|Building") {
            $txtLog.AppendText("[INFO] Building system configuration...`r`n")
        }
        $txtLog.SelectionStart = $txtLog.TextLength
        $txtLog.ScrollToCaret()
        [System.Windows.Forms.Application]::DoEvents()
    }
    $proc.WaitForExit()

    if ($proc.ExitCode -eq 0) {
        $txtLog.AppendText("[ OK] System update completed successfully!`r`n")
        $sLbl.Text = "Update completed successfully"
        $sLbl.ForeColor = $C.StOk
    } else {
        $txtLog.AppendText("[WARN] Update finished with warnings. Check log above.`r`n")
        $sLbl.Text = "Update finished with warnings"
        $sLbl.ForeColor = $C.StWarn
    }

    $btnUpdate.Enabled = $true
    $progress.MarqueeAnimationSpeed = 0
})

# ------------------------------------------------------------------
#  Run
# ------------------------------------------------------------------
[void]$form.ShowDialog()
$form.Dispose()
