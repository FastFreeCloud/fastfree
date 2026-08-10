<#
.SYNOPSIS
    FastFree OS - Tools Manager
.DESCRIPTION
    Detects and installs required tools (7-Zip, Docker CLI, Docker Compose)
    via winget with one-click install. Professional DataGridView table shows
    status of each tool.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# ------------------------------------------------------------------
#  Theme
# ------------------------------------------------------------------
$C = @{
    FormBg  = [System.Drawing.Color]::FromArgb(30, 30, 46)
    GroupBg = [System.Drawing.Color]::FromArgb(42, 42, 64)
    HdrL    = [System.Drawing.Color]::FromArgb(180, 100, 40)
    HdrR    = [System.Drawing.Color]::FromArgb(100, 50, 20)
    Accent  = [System.Drawing.Color]::FromArgb(220, 140, 60)
    BtnOk   = [System.Drawing.Color]::FromArgb(46, 160, 67)
    BtnInfo = [System.Drawing.Color]::FromArgb(50, 120, 200)
    Fg2     = [System.Drawing.Color]::FromArgb(180, 180, 200)
    Fg3     = [System.Drawing.Color]::FromArgb(120, 120, 150)
    InBg    = [System.Drawing.Color]::FromArgb(24, 24, 40)
    InFg    = [System.Drawing.Color]::FromArgb(220, 220, 240)
    LogBg   = [System.Drawing.Color]::FromArgb(16, 16, 28)
    LogFg   = [System.Drawing.Color]::FromArgb(100, 255, 160)
    StOk    = [System.Drawing.Color]::FromArgb(46, 160, 67)
    StBad   = [System.Drawing.Color]::FromArgb(200, 60, 60)
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
$form.Text = "FastFree OS - Tools Manager"
$form.Size = [System.Drawing.Size]::new(700, 560)
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
    $e.Graphics.DrawString("FastFree OS - Tools Manager",$F.Title,[System.Drawing.Brushes]::White,18,10)
    $sb2=New-Object System.Drawing.SolidBrush($C.Fg2)
    $e.Graphics.DrawString("Detect and install required tools via winget",$F.Sub,$sb2,22,38); $sb2.Dispose()
})
$form.Controls.Add($hdr)

# ---- Tools GroupBox ----
$grpTools = New-Object System.Windows.Forms.GroupBox
$grpTools.Text = " Required Tools"
$grpTools.Location = [System.Drawing.Point]::new(15, 72)
$grpTools.Size = [System.Drawing.Size]::new(655, 295)
$grpTools.ForeColor = $C.Accent
$grpTools.BackColor = $C.GroupBg
$grpTools.Font = $F.Grp
$form.Controls.Add($grpTools)

# ---- DataGridView ----
$dgv = New-Object System.Windows.Forms.DataGridView
$dgv.Location = [System.Drawing.Point]::new(20, 30)
$dgv.Size = [System.Drawing.Size]::new(615, 140)
$dgv.BackgroundColor = $C.InBg
$dgv.GridColor = [System.Drawing.Color]::FromArgb(60, 60, 80)
$dgv.DefaultCellStyle.BackColor = $C.InBg
$dgv.DefaultCellStyle.ForeColor = $C.InFg
$dgv.DefaultCellStyle.SelectionBackColor = [System.Drawing.Color]::FromArgb(60, 60, 100)
$dgv.DefaultCellStyle.SelectionForeColor = [System.Drawing.Color]::White
$dgv.DefaultCellStyle.Font = $F.Norm
$dgv.ColumnHeadersDefaultCellStyle.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 80)
$dgv.ColumnHeadersDefaultCellStyle.ForeColor = [System.Drawing.Color]::White
$dgv.ColumnHeadersDefaultCellStyle.Font = $F.Lbl
$dgv.EnableHeadersVisualStyles = $false
$dgv.ColumnHeadersHeightSizeMode = "AutoSize"
$dgv.AllowUserToAddRows = $false
$dgv.AllowUserToDeleteRows = $false
$dgv.AllowUserToResizeRows = $false
$dgv.ReadOnly = $true
$dgv.RowHeadersVisible = $false
$dgv.SelectionMode = "FullRowSelect"
$dgv.BorderStyle = "None"
$dgv.CellBorderStyle = "SingleHorizontal"
$dgv.RowTemplate.Height = 36
$dgv.AutoSizeColumnsMode = "Fill"

$col1 = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$col1.Name = "Tool"; $col1.HeaderText = "Tool"; $col1.FillWeight = 25
[void]$dgv.Columns.Add($col1)

$col2 = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$col2.Name = "PackageId"; $col2.HeaderText = "Package ID"; $col2.FillWeight = 35
[void]$dgv.Columns.Add($col2)

$col3 = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$col3.Name = "Status"; $col3.HeaderText = "Status"; $col3.FillWeight = 25
[void]$dgv.Columns.Add($col3)

$toolsList = @(
    @{ Tool="7-Zip";          PackageId="7zip.7zip"            },
    @{ Tool="Docker CLI";     PackageId="Docker.DockerCLI"     },
    @{ Tool="Docker Compose"; PackageId="Docker.DockerCompose" }
)
foreach ($tool in $toolsList) {
    [void]$dgv.Rows.Add($tool.Tool, $tool.PackageId, "...")
}
$grpTools.Controls.Add($dgv)

# ---- Buttons ----
$btnCheck = New-Btn "Check Status" 20 185 155 34 $C.BtnInfo
$grpTools.Controls.Add($btnCheck)

$btnInstSel = New-Btn "Install Selected" 190 185 165 34 $C.Accent
$grpTools.Controls.Add($btnInstSel)

$btnInstAll = New-Btn "Install All Missing" 370 185 165 34 $C.BtnOk
$grpTools.Controls.Add($btnInstAll)

$btnConfigDocker = New-Btn "Configure Windows DOCKER_HOST (tcp://127.0.0.1:2375)" 20 225 515 34 $C.BtnInfo
$grpTools.Controls.Add($btnConfigDocker)

# ---- Hint labels ----
$lbl1 = New-Object System.Windows.Forms.Label
$lbl1.Text = "Click 'Check Status' to detect installed tools. Then install individually or all at once."
$lbl1.ForeColor = $C.Fg3; $lbl1.Font = $F.Hint
$lbl1.Location = [System.Drawing.Point]::new(20, 268); $lbl1.Size = [System.Drawing.Size]::new(615, 18)
$grpTools.Controls.Add($lbl1)

# ---- Progress + Log ----
$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location=[System.Drawing.Point]::new(15,377); $progress.Size=[System.Drawing.Size]::new(655,8)
$progress.Style="Marquee"; $progress.MarqueeAnimationSpeed=0
$form.Controls.Add($progress)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location=[System.Drawing.Point]::new(15,390); $txtLog.Size=[System.Drawing.Size]::new(655,110)
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
        $btnCheck.Enabled=-not $Busy; $btnInstSel.Enabled=-not $Busy; $btnInstAll.Enabled=-not $Busy; $btnConfigDocker.Enabled=-not $Busy
        $progress.MarqueeAnimationSpeed=if($Busy){30}else{0}
        if(-not $Busy){$sLbl.Text="Ready"}
    }
    if($form.InvokeRequired){$form.Invoke([Action]$a)}else{& $a}
}

# ------------------------------------------------------------------
#  Tool check / install functions
# ------------------------------------------------------------------
function Test-WingetPackage ([string]$PackageId) {
    try {
        $result = winget list --id $PackageId --accept-source-agreements 2>&1
        $resultString = $result | Out-String
        if ($resultString -match [regex]::Escape($PackageId)) { return $true }
        return $false
    } catch { return $false }
}

function Install-WingetPackage ([string]$PackageId) {
    Write-Log "Installing $PackageId via winget..."
    Set-Status "Installing $PackageId..."
    $proc = Start-Process -FilePath "winget" `
        -ArgumentList @("install","--id=$PackageId","-e","--accept-source-agreements","--accept-package-agreements") `
        -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -eq 0) {
        Write-Log "$PackageId installed successfully." "OK"
        return $true
    } else {
        Write-Log "$PackageId install returned exit code $($proc.ExitCode)." "WARN"
        return $false
    }
}

# ------------------------------------------------------------------
#  Background runner
# ------------------------------------------------------------------
function Start-BgWork ([scriptblock]$Work,[hashtable]$Vars=@{}) {
    $rs=[runspacefactory]::CreateRunspace(); $rs.ApartmentState="STA"; $rs.ThreadOptions="ReuseThread"; $rs.Open()
    foreach($n in @('txtLog','form','sLbl','progress','btnCheck','btnInstSel','btnInstAll','btnConfigDocker','dgv')){
        $v=Get-Variable -Name $n -ValueOnly -ErrorAction SilentlyContinue
        if($null -ne $v){$rs.SessionStateProxy.SetVariable($n,$v)}
    }
    foreach($k in $Vars.Keys){$rs.SessionStateProxy.SetVariable($k,$Vars[$k])}
    $ps=[powershell]::Create(); $ps.Runspace=$rs
    $sb=[System.Text.StringBuilder]::new()
    foreach($fn in @('Write-Log','Set-Busy','Set-Status','Install-WingetPackage','Test-WingetPackage')){
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
#  Wire: Check Status
# ------------------------------------------------------------------
$btnCheck.Add_Click({
    $btnCheck.Enabled=$false
    $form.Cursor=[System.Windows.Forms.Cursors]::WaitCursor
    Write-Log "Checking installed tools..."

    for ($i = 0; $i -lt $dgv.Rows.Count; $i++) {
        $pkgId = $dgv.Rows[$i].Cells["PackageId"].Value
        $dgv.Rows[$i].Cells["Status"].Value = "Checking..."
        [System.Windows.Forms.Application]::DoEvents()

        $installed = Test-WingetPackage -PackageId $pkgId
        if ($installed) {
            $dgv.Rows[$i].Cells["Status"].Value = "Installed"
            $dgv.Rows[$i].Cells["Status"].Style.ForeColor = $C.StOk
            Write-Log "$pkgId - Installed" "OK"
        } else {
            $dgv.Rows[$i].Cells["Status"].Value = "Not Installed"
            $dgv.Rows[$i].Cells["Status"].Style.ForeColor = $C.StBad
            Write-Log "$pkgId - Not Installed" "WARN"
        }
    }

    Write-Log "Tool check complete." "OK"
    $form.Cursor=[System.Windows.Forms.Cursors]::Default
    $btnCheck.Enabled=$true
})

# ------------------------------------------------------------------
#  Wire: Install Selected
# ------------------------------------------------------------------
$btnInstSel.Add_Click({
    if ($dgv.SelectedRows.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show("Select a tool from the list first.","FastFree OS","OK","Warning") | Out-Null
        return
    }
    $row = $dgv.SelectedRows[0]
    $pkgId = $row.Cells["PackageId"].Value
    $statusVal = $row.Cells["Status"].Value

    if ($statusVal -eq "Installed") {
        [System.Windows.Forms.MessageBox]::Show("$pkgId is already installed.","FastFree OS","OK","Information") | Out-Null
        return
    }

    Set-Busy $true; $txtLog.Clear()
    $def = (Get-Command Install-WingetPackage).Definition
    Start-BgWork -Work {
        Invoke-Expression "function Install-WingetPackage { $def }"
        Install-WingetPackage -PackageId $targetPkg
        Set-Busy $false
    } -Vars @{targetPkg=$pkgId;def=$def}
})

# ------------------------------------------------------------------
#  Wire: Install All Missing
# ------------------------------------------------------------------
$btnInstAll.Add_Click({
    $txtLog.Clear()

    # Collect missing
    $missing = @()
    for ($i = 0; $i -lt $dgv.Rows.Count; $i++) {
        $st = $dgv.Rows[$i].Cells["Status"].Value
        if ($st -ne "Installed") {
            $missing += $dgv.Rows[$i].Cells["PackageId"].Value
        }
    }

    if ($missing.Count -eq 0) {
        Write-Log "All tools are already installed!" "OK"
        return
    }

    Set-Busy $true
    $def = (Get-Command Install-WingetPackage).Definition
    Start-BgWork -Work {
        Invoke-Expression "function Install-WingetPackage { $def }"
        foreach ($pkg in $pkgsToInstall) {
            Install-WingetPackage -PackageId $pkg
        }
        Write-Log "All missing tools installation attempted." "SUCCESS"
        Set-Busy $false
    } -Vars @{pkgsToInstall=$missing;def=$def}
})

$btnConfigDocker.Add_Click({
    try {
        Write-Log "Configuring Windows DOCKER_HOST environment variable..."
        [Environment]::SetEnvironmentVariable("DOCKER_HOST", "tcp://127.0.0.1:2375", "User")
        $env:DOCKER_HOST = "tcp://127.0.0.1:2375"
        Write-Log "DOCKER_HOST successfully configured to 'tcp://127.0.0.1:2375' (User scope & Current Process)." "SUCCESS"
        [System.Windows.Forms.MessageBox]::Show("DOCKER_HOST environment variable configured successfully!`n`nValue: tcp://127.0.0.1:2375`nScope: User & Current Process","Docker Host Configured","OK","Information") | Out-Null
    } catch {
        Write-Log "Failed to configure DOCKER_HOST: $($_.Exception.Message)" "ERROR"
        [System.Windows.Forms.MessageBox]::Show("Failed to configure DOCKER_HOST:`n$($_.Exception.Message)","Error","OK","Error") | Out-Null
    }
})

[void]$form.ShowDialog()
