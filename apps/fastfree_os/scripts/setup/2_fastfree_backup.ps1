<#
.SYNOPSIS
    FastFree OS - Backup and Restore
.DESCRIPTION
    Professional GUI for backing up (wsl --export) and restoring
    (wsl --import) WSL distributions. Supports stopping the distro
    before backup and setting default after restore.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# ------------------------------------------------------------------
#  Defaults
# ------------------------------------------------------------------
$Defaults = [ordered]@{
    DistroName  = "fastfree"
    InstallPath = "D:\fastfree\fastos"
    BackupPath  = "D:\nixos\backup\FastFree.tar.gz"
}

# ------------------------------------------------------------------
#  Theme
# ------------------------------------------------------------------
$C = @{
    FormBg  = [System.Drawing.Color]::FromArgb(30, 30, 46)
    GroupBg = [System.Drawing.Color]::FromArgb(42, 42, 64)
    HdrL    = [System.Drawing.Color]::FromArgb(40, 140, 100)
    HdrR    = [System.Drawing.Color]::FromArgb(20, 70, 60)
    Accent  = [System.Drawing.Color]::FromArgb(50, 180, 120)
    BtnOk   = [System.Drawing.Color]::FromArgb(46, 160, 67)
    BtnDng  = [System.Drawing.Color]::FromArgb(200, 60, 60)
    BtnInfo = [System.Drawing.Color]::FromArgb(50, 120, 200)
    Fg2     = [System.Drawing.Color]::FromArgb(180, 180, 200)
    Fg3     = [System.Drawing.Color]::FromArgb(120, 120, 150)
    InBg    = [System.Drawing.Color]::FromArgb(24, 24, 40)
    InFg    = [System.Drawing.Color]::FromArgb(220, 220, 240)
    LogBg   = [System.Drawing.Color]::FromArgb(16, 16, 28)
    LogFg   = [System.Drawing.Color]::FromArgb(100, 255, 160)
}
$F = @{
    Title = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
    Sub   = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Italic)
    Norm  = New-Object System.Drawing.Font("Segoe UI", 9.5)
    Lbl   = New-Object System.Drawing.Font("Segoe UI Semibold", 9)
    Btn   = New-Object System.Drawing.Font("Segoe UI Semibold", 9)
    Mono  = New-Object System.Drawing.Font("Cascadia Code, Consolas", 9)
    Grp   = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5)
}

# ------------------------------------------------------------------
#  UI factory helpers
# ------------------------------------------------------------------
function New-Lbl ($text,$x,$y,$w=160) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text=$text; $l.Location=[System.Drawing.Point]::new($x,$y)
    $l.Size=[System.Drawing.Size]::new($w,22); $l.ForeColor=$C.Fg2; $l.Font=$F.Lbl
    $l
}
function New-Tb ($x,$y,$w,$val="") {
    $t = New-Object System.Windows.Forms.TextBox
    $t.Location=[System.Drawing.Point]::new($x,$y); $t.Size=[System.Drawing.Size]::new($w,26)
    $t.Text=$val; $t.BackColor=$C.InBg; $t.ForeColor=$C.InFg
    $t.BorderStyle="FixedSingle"; $t.Font=$F.Norm
    $t
}
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
function New-Grp ($text,$x,$y,$w,$h) {
    $g = New-Object System.Windows.Forms.GroupBox
    $g.Text=$text; $g.Location=[System.Drawing.Point]::new($x,$y)
    $g.Size=[System.Drawing.Size]::new($w,$h); $g.ForeColor=$C.Accent
    $g.BackColor=$C.GroupBg; $g.Font=$F.Grp
    $g
}
function New-Chk ($text,$x,$y,$checked=$true) {
    $k = New-Object System.Windows.Forms.CheckBox
    $k.Text=$text; $k.Location=[System.Drawing.Point]::new($x,$y)
    $k.Size=[System.Drawing.Size]::new(480,24); $k.Checked=$checked
    $k.ForeColor=$C.Fg2; $k.Font=$F.Norm
    $k
}

# ------------------------------------------------------------------
#  Form
# ------------------------------------------------------------------
$form = New-Object System.Windows.Forms.Form
$form.Text = "FastFree OS - Backup / Restore"
$form.Size = [System.Drawing.Size]::new(700, 620)
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
    $e.Graphics.DrawString("FastFree OS - Backup / Restore",$F.Title,[System.Drawing.Brushes]::White,18,10)
    $sb2=New-Object System.Drawing.SolidBrush($C.Fg2)
    $e.Graphics.DrawString("Export and import WSL distributions",$F.Sub,$sb2,22,38); $sb2.Dispose()
})
$form.Controls.Add($hdr)

# ================================================================
#  Backup Section
# ================================================================
$grpBk = New-Grp " Backup Distribution" 15 72 655 165
$form.Controls.Add($grpBk)

$grpBk.Controls.Add((New-Lbl "Distro Name:" 20 32))
$txtBkDistro = New-Tb 180 29 455 $Defaults.DistroName; $grpBk.Controls.Add($txtBkDistro)

$grpBk.Controls.Add((New-Lbl "Backup Path:" 20 62))
$txtBkPath = New-Tb 180 59 365 $Defaults.BackupPath; $grpBk.Controls.Add($txtBkPath)
$btnBkBrowse = New-Btn "Browse..." 555 58 80 28 $C.BtnInfo
$btnBkBrowse.Add_Click({
    $d=New-Object System.Windows.Forms.SaveFileDialog
    $d.Filter="TAR.GZ (*.tar.gz)|*.tar.gz|All (*.*)|*.*"; $d.FileName="FastFree.tar.gz"
    if($d.ShowDialog()-eq"OK"){$txtBkPath.Text=$d.FileName}
})
$grpBk.Controls.Add($btnBkBrowse)

$chkStop = New-Chk "Stop distribution before backup" 20 98 $true
$grpBk.Controls.Add($chkStop)

$btnBackup = New-Btn "Start Backup" 495 128 140 32 $C.BtnOk
$grpBk.Controls.Add($btnBackup)

# ================================================================
#  Restore Section
# ================================================================
$grpRs = New-Grp " Restore Distribution" 15 248 655 195
$form.Controls.Add($grpRs)

$grpRs.Controls.Add((New-Lbl "Distro Name:" 20 32))
$txtRsDistro = New-Tb 180 29 455 $Defaults.DistroName; $grpRs.Controls.Add($txtRsDistro)

$grpRs.Controls.Add((New-Lbl "Backup File:" 20 62))
$txtRsFile = New-Tb 180 59 365 $Defaults.BackupPath; $grpRs.Controls.Add($txtRsFile)
$btnRsBrowse = New-Btn "Browse..." 555 58 80 28 $C.BtnInfo
$btnRsBrowse.Add_Click({
    $d=New-Object System.Windows.Forms.OpenFileDialog
    $d.Filter="TAR.GZ (*.tar.gz)|*.tar.gz|TAR (*.tar)|*.tar|All (*.*)|*.*"
    if($d.ShowDialog()-eq"OK"){$txtRsFile.Text=$d.FileName}
})
$grpRs.Controls.Add($btnRsBrowse)

$grpRs.Controls.Add((New-Lbl "Install Path:" 20 92))
$txtRsPath = New-Tb 180 89 365 $Defaults.InstallPath; $grpRs.Controls.Add($txtRsPath)
$btnRsPathBrowse = New-Btn "Browse..." 555 88 80 28 $C.BtnInfo
$btnRsPathBrowse.Add_Click({
    $d=New-Object System.Windows.Forms.FolderBrowserDialog
    if($d.ShowDialog()-eq"OK"){$txtRsPath.Text=$d.SelectedPath}
})
$grpRs.Controls.Add($btnRsPathBrowse)

$chkRsDef = New-Chk "Set as default WSL distribution after restore" 20 125 $true
$grpRs.Controls.Add($chkRsDef)

$btnRestore = New-Btn "Restore Backup" 495 158 140 32 $C.BtnDng
$grpRs.Controls.Add($btnRestore)

# ---- Progress + Log ----
$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location=[System.Drawing.Point]::new(15,452); $progress.Size=[System.Drawing.Size]::new(655,8)
$progress.Style="Marquee"; $progress.MarqueeAnimationSpeed=0
$form.Controls.Add($progress)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location=[System.Drawing.Point]::new(15,465); $txtLog.Size=[System.Drawing.Size]::new(655,88)
$txtLog.Multiline=$true; $txtLog.ScrollBars="Vertical"; $txtLog.ReadOnly=$true
$txtLog.BackColor=$C.LogBg; $txtLog.ForeColor=$C.LogFg; $txtLog.Font=$F.Mono; $txtLog.BorderStyle="None"
$form.Controls.Add($txtLog)

# ---- Status bar ----
$sbar = New-Object System.Windows.Forms.StatusStrip; $sbar.BackColor=$C.FormBg
$sLbl = New-Object System.Windows.Forms.ToolStripStatusLabel
$sLbl.Text="Ready"; $sLbl.ForeColor=$C.Fg3; $sLbl.Font=$F.Norm
[void]$sbar.Items.Add($sLbl); $form.Controls.Add($sbar)

# ------------------------------------------------------------------
#  Thread-safe UI helpers
# ------------------------------------------------------------------
function Write-Log ([string]$Message,[string]$Level="INFO") {
    $ts=Get-Date -Format "HH:mm:ss"
    $px=switch($Level){"OK"{"+"}"WARN"{"!"}"ERROR"{"X"}"SUCCESS"{"*"}default{">"}}
    $line="[$ts][$px $Level] $Message"
    if($txtLog.InvokeRequired){$txtLog.Invoke([Action]{$txtLog.AppendText("$line`r`n")})}
    else{$txtLog.AppendText("$line`r`n")}
}
function Set-Status ([string]$Text) {
    if($form.InvokeRequired){$form.Invoke([Action]{$sLbl.Text=$Text})}else{$sLbl.Text=$Text}
}
function Set-Busy ([bool]$Busy) {
    $a={
        $btnBackup.Enabled=-not $Busy; $btnRestore.Enabled=-not $Busy
        $progress.MarqueeAnimationSpeed=if($Busy){30}else{0}
        if(-not $Busy){$sLbl.Text="Ready"}
    }
    if($form.InvokeRequired){$form.Invoke([Action]$a)}else{& $a}
}

# ------------------------------------------------------------------
#  Backup logic
# ------------------------------------------------------------------
function Start-Backup {
    param([string]$DistroName,[string]$BackupPath,[bool]$StopFirst)
    try {
        Set-Status "Backing up '$DistroName'..."
        Write-Log "Starting backup for '$DistroName'..."

        if ($StopFirst) {
            Write-Log "Stopping distribution '$DistroName'..."
            wsl.exe -t $DistroName
            Start-Sleep -Seconds 2
            Write-Log "Distribution stopped." "OK"
        }

        $backupDir = Split-Path $BackupPath -Parent
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            Write-Log "Created directory: $backupDir"
        }

        Write-Log "Exporting '$DistroName' to '$BackupPath' (please wait)..."
        Set-Status "Exporting distribution..."
        wsl.exe --export $DistroName $BackupPath

        if ($LASTEXITCODE -eq 0) {
            $size = [math]::Round((Get-Item $BackupPath).Length / 1MB, 1)
            Write-Log "Backup complete! Size: $size MB" "SUCCESS"
            Set-Status "Backup complete!"
            [System.Windows.Forms.MessageBox]::Show(
                "Backup completed!`nFile: $BackupPath`nSize: $size MB",
                "FastFree OS", "OK", "Information") | Out-Null
        } else {
            throw "wsl --export failed (exit $LASTEXITCODE)"
        }
    } catch {
        Write-Log "ERROR: $($_.Exception.Message)" "ERROR"; Set-Status "Backup failed!"
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Error","OK","Error") | Out-Null
    } finally { Set-Busy $false }
}

# ------------------------------------------------------------------
#  Restore logic
# ------------------------------------------------------------------
function Start-Restore {
    param([string]$DistroName,[string]$BackupPath,[string]$InstallPath,[bool]$SetDefault)
    try {
        Set-Status "Restoring '$DistroName'..."
        Write-Log "Starting restore for '$DistroName'..."

        if (-not (Test-Path $BackupPath)) { throw "Backup file not found: $BackupPath" }

        $fSize = [math]::Round((Get-Item $BackupPath).Length / 1MB, 1)
        Write-Log "Backup file: $BackupPath ($fSize MB)" "OK"

        $existing = wsl --list --quiet 2>$null
        if ($existing -contains $DistroName) {
            Write-Log "Distro '$DistroName' exists - unregistering..." "WARN"
            wsl --unregister $DistroName | Out-Null
        }

        $vhdPath = Join-Path $InstallPath "vhd"
        if (-not (Test-Path $vhdPath)) {
            New-Item -ItemType Directory -Path $vhdPath -Force | Out-Null
        }

        Write-Log "Importing '$DistroName' from backup (please wait)..."
        Set-Status "Importing distribution..."
        wsl --import $DistroName $vhdPath $BackupPath --version 2

        if ($LASTEXITCODE -ne 0) { throw "'wsl --import' failed (exit $LASTEXITCODE)." }
        Write-Log "Imported successfully." "OK"

        if ($SetDefault) {
            wsl --set-default $DistroName
            Write-Log "'$DistroName' is now the default." "OK"
        }

        Write-Log "Restore complete! Run: wsl -d $DistroName" "SUCCESS"
        Set-Status "Restore complete!"
        [System.Windows.Forms.MessageBox]::Show(
            "Restore completed!`nDistro: $DistroName",
            "FastFree OS", "OK", "Information") | Out-Null
    } catch {
        Write-Log "ERROR: $($_.Exception.Message)" "ERROR"; Set-Status "Restore failed!"
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Error","OK","Error") | Out-Null
    } finally { Set-Busy $false }
}

# ------------------------------------------------------------------
#  Background runner
# ------------------------------------------------------------------
function Start-BgWork ([scriptblock]$Work,[hashtable]$Vars=@{}) {
    $rs=[runspacefactory]::CreateRunspace(); $rs.ApartmentState="STA"; $rs.ThreadOptions="ReuseThread"; $rs.Open()
    foreach($n in @('txtLog','form','sLbl','progress','btnBackup','btnRestore')){
        $v=Get-Variable -Name $n -ValueOnly -ErrorAction SilentlyContinue
        if($null -ne $v){$rs.SessionStateProxy.SetVariable($n,$v)}
    }
    foreach($k in $Vars.Keys){$rs.SessionStateProxy.SetVariable($k,$Vars[$k])}
    $ps=[powershell]::Create(); $ps.Runspace=$rs
    $sb=[System.Text.StringBuilder]::new()
    foreach($fn in @('Write-Log','Set-Busy','Set-Status')){
        $d=(Get-Command $fn -ErrorAction SilentlyContinue).Definition
        if($d){[void]$sb.AppendLine("function $fn {"); [void]$sb.AppendLine($d); [void]$sb.AppendLine("}")}
    }
    [void]$sb.AppendLine($Work.ToString())
    [void]$ps.AddScript($sb.ToString())
    $ar=$ps.BeginInvoke()
    $null=Register-ObjectEvent -InputObject $ps -EventName InvocationStateChanged -Action {
        if($EventArgs.InvocationStateInfo.State -in @("Completed","Failed","Stopped")){
            try{$Sender.EndInvoke($Event.MessageData.AR)}catch{}
            $Sender.Dispose(); $Event.MessageData.RS.Close(); $Event.MessageData.RS.Dispose()
            Unregister-Event -SourceIdentifier $Event.SourceIdentifier -ErrorAction SilentlyContinue
            Remove-Job -Name $Event.SourceIdentifier -ErrorAction SilentlyContinue
        }
    } -MessageData @{AR=$ar;RS=$rs}
}

# ------------------------------------------------------------------
#  Wire buttons
# ------------------------------------------------------------------
$btnBackup.Add_Click({
    $txtLog.Clear(); Set-Busy $true
    $p=@{
        DistroName=$txtBkDistro.Text.Trim()
        BackupPath=$txtBkPath.Text.Trim()
        StopFirst=$chkStop.Checked
    }
    $def=(Get-Command Start-Backup).Definition
    Start-BgWork -Work {
        Invoke-Expression "function Start-Backup { $def }"
        Start-Backup @BP
    } -Vars @{BP=$p;def=$def}
})

$btnRestore.Add_Click({
    $txtLog.Clear()
    $confirm=[System.Windows.Forms.MessageBox]::Show(
        "This will unregister the existing distribution (if any) and restore from backup.`nAre you sure?",
        "Confirm Restore","YesNo","Warning")
    if($confirm -ne "Yes"){return}
    Set-Busy $true
    $p=@{
        DistroName=$txtRsDistro.Text.Trim()
        BackupPath=$txtRsFile.Text.Trim()
        InstallPath=$txtRsPath.Text.Trim()
        SetDefault=$chkRsDef.Checked
    }
    $def=(Get-Command Start-Restore).Definition
    Start-BgWork -Work {
        Invoke-Expression "function Start-Restore { $def }"
        Start-Restore @RP
    } -Vars @{RP=$p;def=$def}
})

[void]$form.ShowDialog()
