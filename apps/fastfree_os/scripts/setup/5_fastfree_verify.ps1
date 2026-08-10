#Requires -Version 5.1
<#
.SYNOPSIS
    FastFree OS - System Verification
.DESCRIPTION
    Checks all modules: base, mariadb, fastfree_backend, phpmyadmin.
    Professional DataGridView shows pass/fail for each check.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# ------------------------------------------------------------------
#  Theme (Teal/Cyan accent)
# ------------------------------------------------------------------
$C = @{
    FormBg  = [System.Drawing.Color]::FromArgb(30, 30, 46)
    GroupBg = [System.Drawing.Color]::FromArgb(42, 42, 64)
    HdrL    = [System.Drawing.Color]::FromArgb(40, 140, 140)
    HdrR    = [System.Drawing.Color]::FromArgb(20, 70, 80)
    Accent  = [System.Drawing.Color]::FromArgb(50, 190, 190)
    BtnOk   = [System.Drawing.Color]::FromArgb(46, 160, 67)
    Fg2     = [System.Drawing.Color]::FromArgb(180, 180, 200)
    Fg3     = [System.Drawing.Color]::FromArgb(120, 120, 150)
    InBg    = [System.Drawing.Color]::FromArgb(24, 24, 40)
    InFg    = [System.Drawing.Color]::FromArgb(220, 220, 240)
    LogBg   = [System.Drawing.Color]::FromArgb(16, 16, 28)
    LogFg   = [System.Drawing.Color]::FromArgb(100, 255, 160)
    Pass    = [System.Drawing.Color]::FromArgb(46, 160, 67)
    Fail    = [System.Drawing.Color]::FromArgb(245, 101, 101)
    SepBg   = [System.Drawing.Color]::FromArgb(38, 50, 60)
    SepFg   = [System.Drawing.Color]::FromArgb(80, 200, 200)
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

function Write-Log ([string]$Message,[string]$Level="INFO") {
    $ts=Get-Date -Format "HH:mm:ss"
    $px=switch($Level){"OK"{"+"}"WARN"{"!"}"ERROR"{"X"}default{">"}}
    $txtLog.AppendText("[$ts][$px $Level] $Message`r`n")
}

# ------------------------------------------------------------------
#  Form
# ------------------------------------------------------------------
$form = New-Object System.Windows.Forms.Form
$form.Text = "FastFree OS - System Verification"
$form.Size = [System.Drawing.Size]::new(750, 700)
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
    $e.Graphics.DrawString("FastFree OS - System Verification",$F.Title,[System.Drawing.Brushes]::White,18,10)
    $sb2=New-Object System.Drawing.SolidBrush($C.Fg2)
    $e.Graphics.DrawString("Verify all modules: base, mariadb, backend, phpmyadmin",$F.Sub,$sb2,22,38); $sb2.Dispose()
})
$form.Controls.Add($hdr)

# ---- Summary GroupBox ----
$grpSum = New-Object System.Windows.Forms.GroupBox
$grpSum.Text = " Summary"
$grpSum.Location = [System.Drawing.Point]::new(15, 72)
$grpSum.Size = [System.Drawing.Size]::new(705, 60)
$grpSum.ForeColor = $C.Accent
$grpSum.BackColor = $C.GroupBg
$grpSum.Font = $F.Grp
$form.Controls.Add($grpSum)

$lblSummary = New-Object System.Windows.Forms.Label
$lblSummary.Text = "Click 'Run Verification' to start."
$lblSummary.ForeColor = $C.Fg2
$lblSummary.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
$lblSummary.Location = [System.Drawing.Point]::new(15, 22)
$lblSummary.Size = [System.Drawing.Size]::new(675, 28)
$grpSum.Controls.Add($lblSummary)

# ---- DataGridView ----
$grpDgv = New-Object System.Windows.Forms.GroupBox
$grpDgv.Text = " Results"
$grpDgv.Location = [System.Drawing.Point]::new(15, 138)
$grpDgv.Size = [System.Drawing.Size]::new(705, 405)
$grpDgv.ForeColor = $C.Accent
$grpDgv.BackColor = $C.GroupBg
$grpDgv.Font = $F.Grp
$form.Controls.Add($grpDgv)

$dgv = New-Object System.Windows.Forms.DataGridView
$dgv.Location = [System.Drawing.Point]::new(12, 24)
$dgv.Size = [System.Drawing.Size]::new(680, 370)
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
$dgv.RowTemplate.Height = 30
$dgv.AutoSizeColumnsMode = "Fill"

$col1 = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$col1.Name = "Status"; $col1.HeaderText = "Status"; $col1.FillWeight = 12
[void]$dgv.Columns.Add($col1)
$col2 = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$col2.Name = "Module"; $col2.HeaderText = "Module"; $col2.FillWeight = 18
[void]$dgv.Columns.Add($col2)
$col3 = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$col3.Name = "Check"; $col3.HeaderText = "Check"; $col3.FillWeight = 35
[void]$dgv.Columns.Add($col3)
$col4 = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$col4.Name = "Detail"; $col4.HeaderText = "Detail"; $col4.FillWeight = 35
[void]$dgv.Columns.Add($col4)

$grpDgv.Controls.Add($dgv)

# ---- Buttons ----
$btnRun = New-Btn "Run Verification" 15 550 200 36 $C.BtnOk
$form.Controls.Add($btnRun)

# ---- Progress + Log ----
$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location=[System.Drawing.Point]::new(15,592); $progress.Size=[System.Drawing.Size]::new(705,8)
$progress.Style="Marquee"; $progress.MarqueeAnimationSpeed=0
$form.Controls.Add($progress)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location=[System.Drawing.Point]::new(15,602); $txtLog.Size=[System.Drawing.Size]::new(705,52)
$txtLog.Multiline=$true; $txtLog.ScrollBars="Vertical"; $txtLog.ReadOnly=$true
$txtLog.BackColor=$C.LogBg; $txtLog.ForeColor=$C.LogFg; $txtLog.Font=$F.Mono; $txtLog.BorderStyle="None"
$form.Controls.Add($txtLog)

# ---- Status bar ----
$sbar = New-Object System.Windows.Forms.StatusStrip; $sbar.BackColor=$C.FormBg
$sLbl = New-Object System.Windows.Forms.ToolStripStatusLabel
$sLbl.Text="Ready"; $sLbl.ForeColor=$C.Fg3; $sLbl.Font=$F.Norm
[void]$sbar.Items.Add($sLbl); $form.Controls.Add($sbar)

# ------------------------------------------------------------------
#  WSL check helper
# ------------------------------------------------------------------
function Invoke-WslCheck ([string]$Cmd) {
    try {
        $p = New-Object System.Diagnostics.Process
        $p.StartInfo.FileName = "wsl.exe"
        $p.StartInfo.Arguments = "-d fastfree -u root -- bash -c `"export PATH=/run/current-system/sw/bin:/usr/local/bin:/usr/bin:/bin; $Cmd`""
        $p.StartInfo.UseShellExecute = $false
        $p.StartInfo.RedirectStandardOutput = $true
        $p.StartInfo.RedirectStandardError = $true
        $p.StartInfo.CreateNoWindow = $true
        $null = $p.Start()
        $stdout = $p.StandardOutput.ReadToEnd()
        $stderr = $p.StandardError.ReadToEnd()
        $p.WaitForExit()
        return @{ ExitCode = $p.ExitCode; Stdout = $stdout.Trim(); Stderr = $stderr.Trim() }
    } catch {
        return @{ ExitCode = -1; Stdout = ""; Stderr = $_.Exception.Message }
    }
}

# ------------------------------------------------------------------
#  Check definitions
# ------------------------------------------------------------------
$AllChecks = @(
    # BASE
    @{ Module="base"; Name="SSH Service";     Cmd='systemctl is-active sshd';                                   Exp="active";  Fail="SSH service not running" }
    @{ Module="base"; Name="SSH Port 22";     Cmd='ss -tlnp | grep "22"';                                       Exp="LISTEN";  Fail="Port 22 not listening" }
    @{ Module="base"; Name="Admin User";      Cmd='id admin | grep -o wheel';                                   Exp="wheel";   Fail="admin missing or not in wheel" }
    @{ Module="base"; Name="Podman";          Cmd='podman --version | head -1';                                 Exp="";        Fail="Podman not installed" }
    @{ Module="base"; Name="Git";             Cmd='git --version | head -1';                                    Exp="";        Fail="Git not installed" }
    @{ Module="base"; Name="FastFree CLI";    Cmd='fastfree --help | head -1';                                  Exp="";        Fail="CLI not installed" }
    @{ Module="base"; Name="GHCR Auth";       Cmd='cat /etc/containers/auth.json | grep -o ghcr.io';            Exp="ghcr.io"; Fail="GHCR auth not configured" }

    # MARIADB
    @{ Module="mariadb"; Name="MySQL Service";     Cmd='systemctl is-active mysql';                              Exp="active";  Fail="MySQL not running" }
    @{ Module="mariadb"; Name="Port 3306";         Cmd='ss -tlnp | grep "3306"';                                 Exp="LISTEN";  Fail="Port 3306 not listening" }
    @{ Module="mariadb"; Name="MariaDB Version";   Cmd='mysql --version | head -1';                              Exp="";        Fail="MariaDB client not found" }
    @{ Module="mariadb"; Name="Skip Name Resolve"; Cmd='mysql -u root -e "SHOW VARIABLES LIKE ''skip_name_resolve''" | grep ON'; Exp="ON"; Fail="skip-name-resolve not enabled" }
    @{ Module="mariadb"; Name="Bind Localhost";    Cmd='mysql -u root -e "SHOW VARIABLES LIKE ''bind_address''" | grep 127.0.0.1'; Exp="127.0.0.1"; Fail="Not bound to localhost" }

    # BACKEND
    @{ Module="backend"; Name="Backend Network";    Cmd='podman network inspect fastfree-net | grep -o fastfree-net'; Exp="fastfree-net"; Fail="Network missing" }
    @{ Module="backend"; Name="Redis Cache";        Cmd='podman ps --filter name=fastfree-redis-cache --format "{{.Status}}"'; Exp="Up"; Fail="Redis cache not running" }
    @{ Module="backend"; Name="Redis Queue";        Cmd='podman ps --filter name=fastfree-redis-queue --format "{{.Status}}"'; Exp="Up"; Fail="Redis queue not running" }
    @{ Module="backend"; Name="Backend App";        Cmd='podman ps --filter name=fastfree-backend-app --format "{{.Status}}"'; Exp="Up"; Fail="Backend app not running" }
    @{ Module="backend"; Name="Backend Frontend";   Cmd='podman ps --filter name=fastfree-backend-frontend --format "{{.Status}}"'; Exp="Up"; Fail="Backend frontend not running" }
    @{ Module="backend"; Name="Backend WebSocket";  Cmd='podman ps --filter name=fastfree-backend-websocket --format "{{.Status}}"'; Exp="Up"; Fail="WebSocket not running" }
    @{ Module="backend"; Name="Queue Short";        Cmd='podman ps --filter name=fastfree-backend-queue-short --format "{{.Status}}"'; Exp="Up"; Fail="Short queue not running" }
    @{ Module="backend"; Name="Queue Long";         Cmd='podman ps --filter name=fastfree-backend-queue-long --format "{{.Status}}"'; Exp="Up"; Fail="Long queue not running" }
    @{ Module="backend"; Name="Scheduler";          Cmd='podman ps --filter name=fastfree-backend-scheduler --format "{{.Status}}"'; Exp="Up"; Fail="Scheduler not running" }
    @{ Module="backend"; Name="Configurator";       Cmd='podman ps -a --filter name=fastfree-backend-configurator --format "{{.Status}}"'; Exp="Exited(0)"; Fail="Configurator did not complete" }
    @{ Module="backend"; Name="Create Site";        Cmd='podman ps -a --filter name=fastfree-backend-create-site --format "{{.Status}}"'; Exp="Exited(0)"; Fail="Site creation did not complete" }
    @{ Module="backend"; Name="Port 8080";          Cmd='ss -tlnp | grep "8080"';                                 Exp="LISTEN";  Fail="Port 8080 not listening" }
    @{ Module="backend"; Name="ERPNext Ping";       Cmd='curl -s -o /dev/null -w "%%{http_code}" http://localhost:8080'; Exp="200"; Fail="ERPNext not responding" }
    @{ Module="backend"; Name="Redis Cache PING";   Cmd='podman exec fastfree-redis-cache redis-cli ping';        Exp="PONG"; Fail="Redis cache no PONG" }
    @{ Module="backend"; Name="Redis Queue PING";   Cmd='podman exec fastfree-redis-queue redis-cli ping';        Exp="PONG"; Fail="Redis queue no PONG" }
    @{ Module="backend"; Name="Backend DB";         Cmd='mysql -u root -e "SHOW DATABASES LIKE ''fastfree_backend''" | grep fastfree_backend'; Exp="fastfree_backend"; Fail="Backend DB not found" }
    @{ Module="backend"; Name="Backend Backup";     Cmd='systemctl list-timers fastfree-backend-backup.timer --no-pager | grep fastfree'; Exp="fastfree"; Fail="Backup timer missing" }

    # PHPMYADMIN
    @{ Module="phpmyadmin"; Name="Container";  Cmd='podman ps --filter name=phpmyadmin --format "{{.Status}}"';    Exp="Up";  Fail="Container not running" }
    @{ Module="phpmyadmin"; Name="Port 8082";  Cmd='ss -tlnp | grep "8082"';                                 Exp="LISTEN";  Fail="Port 8082 not listening" }
    @{ Module="phpmyadmin"; Name="HTTP";        Cmd='curl -s -o /dev/null -w "%%{http_code}" http://localhost:8082';  Exp="200"; Fail="phpMyAdmin not responding" }
)

# ------------------------------------------------------------------
#  Wire: Run Verification (synchronous with DoEvents)
# ------------------------------------------------------------------
$btnRun.Add_Click({
    $btnRun.Enabled = $false
    $dgv.Rows.Clear()
    $txtLog.Clear()
    $lblSummary.Text = "Running checks..."
    $lblSummary.ForeColor = $C.Fg2
    $progress.MarqueeAnimationSpeed = 30
    [System.Windows.Forms.Application]::DoEvents()

    $passCount = 0; $failCount = 0
    $currentModule = ""

    foreach ($chk in $AllChecks) {
        # Module separator
        if ($chk.Module -ne $currentModule) {
            $currentModule = $chk.Module
            $modLabel = switch ($currentModule) {
                "base"       { "BASE (SSH, Podman, System)" }
                "mariadb"    { "MARIADB (Database)" }
                "backend"    { "FASTFREE_BACKEND (ERPNext/Frappe)" }
                "phpmyadmin" { "PHPMYADMIN (Web UI)" }
                default      { $currentModule.ToUpper() }
            }
            $idx = $dgv.Rows.Add("", $modLabel, "", "")
            $row = $dgv.Rows[$idx]
            $row.DefaultCellStyle.BackColor = $C.SepBg
            $row.DefaultCellStyle.ForeColor = $C.SepFg
            $row.DefaultCellStyle.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
            $row.Height = 28
        }

        $sLbl.Text = "Checking: $($chk.Name)..."
        [System.Windows.Forms.Application]::DoEvents()

        $result = Invoke-WslCheck -Cmd $chk.Cmd

        if ($chk.Exp) {
            if ($result.Stdout -match [regex]::Escape($chk.Exp)) {
                $status = "+"; $statusColor = $C.Pass; $passCount++
                $detail = if ($result.Stdout) { ($result.Stdout -split "`n")[0] } else { "OK" }
            } else {
                $status = "X"; $statusColor = $C.Fail; $failCount++
                $detail = if ($result.Stderr) { ($result.Stderr -split "`n")[0] } elseif ($result.Stdout) { ($result.Stdout -split "`n")[0] } else { $chk.Fail }
            }
        } else {
            if ($result.ExitCode -ne 0 -and -not $result.Stdout) {
                $status = "X"; $statusColor = $C.Fail; $failCount++
                $detail = if ($result.Stderr) { ($result.Stderr -split "`n")[0] } else { $chk.Fail }
            } else {
                $status = "+"; $statusColor = $C.Pass; $passCount++
                $detail = if ($result.Stdout) { ($result.Stdout -split "`n")[0] } else { "OK" }
            }
        }

        $idx = $dgv.Rows.Add($status, $chk.Module, $chk.Name, $detail)
        $dgv.Rows[$idx].Cells["Status"].Style.ForeColor = $statusColor
        Write-Log "[$($chk.Module)] $($chk.Name) = $status $detail" $(if($status -eq "+"){"OK"}else{"ERROR"})
        [System.Windows.Forms.Application]::DoEvents()
    }

    $total = $passCount + $failCount
    if ($failCount -eq 0) {
        $lblSummary.Text = "ALL PASSED - $passCount/$total checks OK"
        $lblSummary.ForeColor = $C.Pass
    } else {
        $lblSummary.Text = "$failCount FAILED - $passCount passed, $failCount failed ($total total)"
        $lblSummary.ForeColor = $C.Fail
    }

    $progress.MarqueeAnimationSpeed = 0
    $sLbl.Text = "Verification complete"
    $btnRun.Enabled = $true
})

# ------------------------------------------------------------------
#  Run
# ------------------------------------------------------------------
[void]$form.ShowDialog()
$form.Dispose()
