<#
.SYNOPSIS
    fastfree OS - WSL Installer / Updater
.DESCRIPTION
    Downloads a release asset from a private GitHub repo, extracts it,
    and imports it as a WSL2 distribution. Skips download if the file
    already exists with matching size.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# ------------------------------------------------------------------
#  Defaults
# ------------------------------------------------------------------
$Defaults = [ordered]@{
    Owner        = "FastFreeCloud"
    Repo         = "fastfree_os"
    Tag          = ""
    AssetName    = ""
    DistroName   = "fastfree"
    InstallPath  = "D:\fastfree\fastos"
    DownloadPath = "D:\fastfree"
    Token        = "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"
}

# ------------------------------------------------------------------
#  Theme
# ------------------------------------------------------------------
$C = @{
    FormBg   = [System.Drawing.Color]::FromArgb(30, 30, 46)
    GroupBg  = [System.Drawing.Color]::FromArgb(42, 42, 64)
    HdrL     = [System.Drawing.Color]::FromArgb(80, 60, 180)
    HdrR     = [System.Drawing.Color]::FromArgb(40, 30, 100)
    Accent   = [System.Drawing.Color]::FromArgb(130, 100, 255)
    BtnOk    = [System.Drawing.Color]::FromArgb(46, 160, 67)
    BtnInfo  = [System.Drawing.Color]::FromArgb(50, 120, 200)
    Fg2      = [System.Drawing.Color]::FromArgb(180, 180, 200)
    Fg3      = [System.Drawing.Color]::FromArgb(120, 120, 150)
    InBg     = [System.Drawing.Color]::FromArgb(24, 24, 40)
    InFg     = [System.Drawing.Color]::FromArgb(220, 220, 240)
    LogBg    = [System.Drawing.Color]::FromArgb(16, 16, 28)
    LogFg    = [System.Drawing.Color]::FromArgb(100, 255, 160)
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
#  7-Zip locator
# ------------------------------------------------------------------
function Find-SevenZip {
    foreach ($p in @("$env:ProgramFiles\7-Zip\7z.exe","${env:ProgramFiles(x86)}\7-Zip\7z.exe")) {
        if (Test-Path $p) { return $p }
    }
    $cmd = Get-Command 7z.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
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
function New-Tb ($x,$y,$w,$val="",[switch]$Pw) {
    $t = New-Object System.Windows.Forms.TextBox
    $t.Location=[System.Drawing.Point]::new($x,$y); $t.Size=[System.Drawing.Size]::new($w,26)
    $t.Text=$val; $t.BackColor=$C.InBg; $t.ForeColor=$C.InFg
    $t.BorderStyle="FixedSingle"; $t.Font=$F.Norm
    if ($Pw) { $t.UseSystemPasswordChar=$true }
    $t
}
function New-Cb ($x,$y,$w,$val="") {
    $cb = New-Object System.Windows.Forms.ComboBox
    $cb.Location=[System.Drawing.Point]::new($x,$y); $cb.Size=[System.Drawing.Size]::new($w,26)
    $cb.DropDownStyle="DropDown"; $cb.Text=$val
    $cb.BackColor=$C.InBg; $cb.ForeColor=$C.InFg; $cb.FlatStyle="Flat"; $cb.Font=$F.Norm
    $cb
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
    $k.Size=[System.Drawing.Size]::new(520,24); $k.Checked=$checked
    $k.ForeColor=$C.Fg2; $k.Font=$F.Norm
    $k
}

# ------------------------------------------------------------------
#  Form
# ------------------------------------------------------------------
$form = New-Object System.Windows.Forms.Form
$form.Text = "FastFree OS - Installer"
$form.Size = [System.Drawing.Size]::new(700, 660)
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
    $e.Graphics.DrawString("FastFree OS - Installer",$F.Title,[System.Drawing.Brushes]::White,18,10)
    $sb2=New-Object System.Drawing.SolidBrush($C.Fg2)
    $e.Graphics.DrawString("Download, extract and import WSL distribution",$F.Sub,$sb2,22,38); $sb2.Dispose()
})
$form.Controls.Add($hdr)

# ---- GitHub Release ----
$grp1 = New-Grp " GitHub Release" 15 72 655 195
$form.Controls.Add($grp1)

$grp1.Controls.Add((New-Lbl "Owner:" 20 30))
$txtOwner = New-Tb 180 27 455 $Defaults.Owner; $grp1.Controls.Add($txtOwner)

$grp1.Controls.Add((New-Lbl "Repository:" 20 60))
$txtRepo = New-Tb 180 57 455 $Defaults.Repo; $grp1.Controls.Add($txtRepo)

$grp1.Controls.Add((New-Lbl "Release Tag:" 20 90))
$cmbTag = New-Cb 180 87 360 $Defaults.Tag; $grp1.Controls.Add($cmbTag)
$btnLoad = New-Btn "Load..." 550 86 85 28 $C.BtnInfo; $grp1.Controls.Add($btnLoad)

$grp1.Controls.Add((New-Lbl "Asset File:" 20 120))
$cmbAsset = New-Cb 180 117 455 $Defaults.AssetName; $grp1.Controls.Add($cmbAsset)

$grp1.Controls.Add((New-Lbl "Access Token:" 20 150))
$txtToken = New-Tb 180 147 455 $Defaults.Token -Pw; $grp1.Controls.Add($txtToken)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Text="Token is used only in memory - never saved to disk."
$lblHint.ForeColor=$C.Fg3; $lblHint.Font=$F.Hint
$lblHint.Location=[System.Drawing.Point]::new(180,174); $lblHint.Size=[System.Drawing.Size]::new(455,16)
$grp1.Controls.Add($lblHint)

# ---- WSL Destination ----
$grp2 = New-Grp " WSL Destination" 15 275 655 140
$form.Controls.Add($grp2)

$grp2.Controls.Add((New-Lbl "Distro Name:" 20 30))
$txtDistro = New-Tb 180 27 455 $Defaults.DistroName; $grp2.Controls.Add($txtDistro)

$grp2.Controls.Add((New-Lbl "Install Path:" 20 64))
$txtPath = New-Tb 180 61 365 $Defaults.InstallPath; $grp2.Controls.Add($txtPath)
$btnBrowse = New-Btn "Browse..." 555 60 80 28 $C.BtnInfo
$btnBrowse.Add_Click({ $d=New-Object System.Windows.Forms.FolderBrowserDialog; if($d.ShowDialog()-eq"OK"){$txtPath.Text=$d.SelectedPath} })
$grp2.Controls.Add($btnBrowse)

$grp2.Controls.Add((New-Lbl "Download Path:" 20 98))
$txtDlPath = New-Tb 180 95 365 $Defaults.DownloadPath; $grp2.Controls.Add($txtDlPath)
$btnDlBrowse = New-Btn "Browse..." 555 94 80 28 $C.BtnInfo
$btnDlBrowse.Add_Click({ $d=New-Object System.Windows.Forms.FolderBrowserDialog; if($d.ShowDialog()-eq"OK"){$txtDlPath.Text=$d.SelectedPath} })
$grp2.Controls.Add($btnDlBrowse)

# ---- Options ----
$chkDef  = New-Chk "Set as default WSL distribution after import" 20 422 $true
$chkSkip = New-Chk "Skip download if file already exists with matching size" 20 448 $true
$form.Controls.AddRange(@($chkDef,$chkSkip))

# ---- Progress + Log ----
$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location=[System.Drawing.Point]::new(15,482); $progress.Size=[System.Drawing.Size]::new(655,8)
$progress.Style="Marquee"; $progress.MarqueeAnimationSpeed=0
$form.Controls.Add($progress)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location=[System.Drawing.Point]::new(15,492); $txtLog.Size=[System.Drawing.Size]::new(655,80)
$txtLog.Multiline=$true; $txtLog.ScrollBars="Vertical"; $txtLog.ReadOnly=$true
$txtLog.BackColor=$C.LogBg; $txtLog.ForeColor=$C.LogFg; $txtLog.Font=$F.Mono; $txtLog.BorderStyle="None"
$form.Controls.Add($txtLog)

# ---- Buttons ----
$btnInstall = New-Btn "Install / Update" 375 582 140 34 $C.BtnOk
$btnClose   = New-Btn "Close" 530 582 140 34 $C.Accent
$btnClose.Add_Click({ $form.Close() })
$form.Controls.AddRange(@($btnInstall,$btnClose))

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
    $px=switch($Level){"OK"{"+"}"SKIP"{">>"}"WARN"{"!"}"ERROR"{"X"}"SUCCESS"{"*"}default{">"}}
    $line="[$ts][$px $Level] $Message"
    if($txtLog.InvokeRequired){$txtLog.Invoke([Action]{$txtLog.AppendText("$line`r`n")})}
    else{$txtLog.AppendText("$line`r`n")}
}
function Set-Status ([string]$Text) {
    if($form.InvokeRequired){$form.Invoke([Action]{$sLbl.Text=$Text})}else{$sLbl.Text=$Text}
}
function Set-Busy ([bool]$Busy) {
    $a={
        $btnInstall.Enabled=-not $Busy; $btnBrowse.Enabled=-not $Busy; $btnDlBrowse.Enabled=-not $Busy
        $progress.MarqueeAnimationSpeed=if($Busy){30}else{0}
        if(-not $Busy){$sLbl.Text="Ready"}
    }
    if($form.InvokeRequired){$form.Invoke([Action]$a)}else{& $a}
}

# ------------------------------------------------------------------
#  Release loader
# ------------------------------------------------------------------
$script:ReleaseAssetMap = @{}

$btnLoad.Add_Click({
    $btnLoad.Enabled=$false; $form.Cursor=[System.Windows.Forms.Cursors]::WaitCursor
    try {
        $tok=$txtToken.Text
        if([string]::IsNullOrWhiteSpace($tok)){throw "Enter the GitHub PAT first."}
        $hd=@{Authorization="Bearer $tok";Accept="application/vnd.github+json";"X-GitHub-Api-Version"="2022-11-28";"User-Agent"="FastFreeOS-Installer"}
        $url="https://api.github.com/repos/$($txtOwner.Text.Trim())/$($txtRepo.Text.Trim())/releases?per_page=100"
        $rels=Invoke-RestMethod -Uri $url -Headers $hd -Method Get
        $script:ReleaseAssetMap=@{}; $cmbTag.Items.Clear()
        foreach($r in $rels){
            [void]$cmbTag.Items.Add($r.tag_name)
            $script:ReleaseAssetMap[$r.tag_name]=@($r.assets|ForEach-Object{$_.name})
        }
        if($cmbTag.Items.Count -gt 0){$cmbTag.SelectedIndex=0}
        else{[System.Windows.Forms.MessageBox]::Show("No releases found.","FastFree OS","OK","Warning")|Out-Null}
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Error:`n$($_.Exception.Message)","Error","OK","Error")|Out-Null
    } finally { $form.Cursor=[System.Windows.Forms.Cursors]::Default; $btnLoad.Enabled=$true }
})

function Check-LocalFileStatus {
    $dlFolder = $txtDlPath.Text.Trim()
    $assetName = $cmbAsset.Text.Trim()
    if ([string]::IsNullOrWhiteSpace($dlFolder) -or [string]::IsNullOrWhiteSpace($assetName)) {
        return
    }
    $localFile = Join-Path $dlFolder $assetName
    if (Test-Path $localFile) {
        $size = [math]::Round((Get-Item $localFile).Length / 1MB, 1)
        Write-Log "Local file found: '$assetName' ($size MB). Verified." "OK"
        Set-Status "Local file found ($size MB)"
    } else {
        Write-Log "File not found locally: '$assetName'. Will download." "INFO"
        Set-Status "Ready to download"
    }
}

$cmbTag.Add_SelectedIndexChanged({
    $cmbAsset.Items.Clear()
    if($script:ReleaseAssetMap.ContainsKey($cmbTag.Text)){
        foreach($n in $script:ReleaseAssetMap[$cmbTag.Text]){[void]$cmbAsset.Items.Add($n)}
        if($cmbAsset.Items.Count -gt 0){$cmbAsset.SelectedIndex=0}
    }
})

$cmbAsset.Add_SelectedIndexChanged({
    Check-LocalFileStatus
})

$txtDlPath.Add_TextChanged({
    Check-LocalFileStatus
})

# ------------------------------------------------------------------
#  Install logic
# ------------------------------------------------------------------
function Start-Install {
    param([string]$Owner,[string]$Repo,[string]$Tag,[string]$AssetName,
          [string]$Token,[string]$DistroName,[string]$InstallPath,[string]$DownloadPath,
          [bool]$SetDefault,[bool]$SkipIfExists)
    try {
        Set-Status "Installing '$DistroName'..."
        Write-Log "Starting installation for '$DistroName'..."
        if([string]::IsNullOrWhiteSpace($Token)){throw "GitHub PAT is required."}

        Write-Log "Checking WSL..."
        $null=wsl --status 2>&1
        if($LASTEXITCODE -ne 0){throw "WSL not available. Run 'wsl --install' as Admin."}
        Write-Log "WSL is available." "OK"

        Write-Log "Looking for 7-Zip..."
        $sz=Find-SevenZip
        if(-not $sz){throw "7-Zip not found. Use 3_fastfree_tools.ps1 to install it."}
        Write-Log "Found 7-Zip: $sz" "OK"

        if(-not(Test-Path $DownloadPath)){New-Item -ItemType Directory -Path $DownloadPath -Force|Out-Null}
        if(-not(Test-Path $InstallPath)){New-Item -ItemType Directory -Path $InstallPath -Force|Out-Null}
        $dlPath=Join-Path $DownloadPath $AssetName
        $exPath=Join-Path $InstallPath "extracted"

        $doDownload=$true
        try {
            Write-Log "Querying release '$Tag'..."
            $hd=@{Authorization="Bearer $Token";Accept="application/vnd.github+json";"X-GitHub-Api-Version"="2022-11-28";"User-Agent"="FastFreeOS-Installer"}
            $rel=Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/releases/tags/$Tag" -Headers $hd -Method Get
            $asset=$rel.assets|Where-Object{$_.name -eq $AssetName}
            if(-not $asset){
                $av=($rel.assets|ForEach-Object{$_.name}) -join ", "
                throw "Asset '$AssetName' not found. Available: $av"
            }
            Write-Log "Found asset (id:$($asset.id), $([math]::Round($asset.size/1MB,1)) MB)." "OK"

            if($SkipIfExists -and (Test-Path $dlPath)){
                $ls=(Get-Item $dlPath).Length
                if($ls -eq $asset.size){
                    Write-Log "File already downloaded ($([math]::Round($ls/1MB,1)) MB) - skipping download." "SKIP"
                    $doDownload=$false
                    [System.Windows.Forms.MessageBox]::Show("The file is already downloaded and verified ($([math]::Round($ls/1MB,1)) MB). Skipping download.","FastFree OS","OK","Information") | Out-Null
                } else { Write-Log "Size mismatch (local:$ls, remote:$($asset.size)). Re-downloading..." "WARN" }
            }
        } catch {
            if (Test-Path $dlPath) {
                Write-Log "GitHub connection failed ($($_.Exception.Message)) but local file exists." "WARN"
                Write-Log "Using existing local file: $dlPath" "OK"
                $doDownload=$false
                $confirm = [System.Windows.Forms.MessageBox]::Show("Could not connect to GitHub ($($_.Exception.Message)).`n`nA local file was found: '$dlPath'.`nDo you want to proceed with offline installation using this file?", "GitHub offline fallback", "YesNo", "Warning")
                if ($confirm -ne "Yes") {
                    throw "Installation cancelled: GitHub unreachable."
                }
            } else {
                throw $_
            }
        }

        if($doDownload){
            Write-Log "Downloading asset..."; Set-Status "Downloading $AssetName..."
            [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
            $dh=@{Authorization="Bearer $Token";Accept="application/octet-stream";"User-Agent"="FastFreeOS-Installer"}
            Invoke-WebRequest -Uri "https://api.github.com/repos/$Owner/$Repo/releases/assets/$($asset.id)" -Headers $dh -OutFile $dlPath -UseBasicParsing
            Write-Log "Download complete." "OK"
        }

        Set-Status "Extracting..."; Write-Log "Extracting to '$exPath'..."
        if(Test-Path $exPath){Remove-Item $exPath -Recurse -Force}
        New-Item -ItemType Directory -Path $exPath -Force|Out-Null
        $p=Start-Process -FilePath $sz -ArgumentList @("x","`"$dlPath`"","-o`"$exPath`"","-y") -NoNewWindow -Wait -PassThru
        if($p.ExitCode -ne 0){throw "7-Zip failed (exit $($p.ExitCode))."}
        Write-Log "Extraction complete." "OK"

        Write-Log "Locating rootfs..."
        $rootfs=Get-ChildItem -Path $exPath -Recurse -File|Where-Object{$_.Extension -in ".wsl",".gz",".tar"}|Sort-Object Length -Descending|Select-Object -First 1
        if(-not $rootfs){throw "No .wsl/.tar.gz/.tar found."}
        Write-Log "Rootfs: $($rootfs.FullName)" "OK"

        $existing=wsl --list --quiet 2>$null
        if($existing -contains $DistroName){
            Write-Log "Distro '$DistroName' exists - unregistering..." "WARN"
            wsl --unregister $DistroName|Out-Null
        }

        Set-Status "Importing..."
        $vhd=Join-Path $InstallPath "vhd"
        New-Item -ItemType Directory -Path $vhd -Force|Out-Null
        Write-Log "Importing '$DistroName' (may take minutes)..."
        wsl --import $DistroName $vhd $rootfs.FullName --version 2
        if($LASTEXITCODE -ne 0){throw "'wsl --import' failed ($LASTEXITCODE)."}
        Write-Log "Imported successfully." "OK"

        if($SetDefault){
            wsl --set-default $DistroName
            if($LASTEXITCODE -ne 0){throw "'wsl --set-default' failed."}
            Write-Log "'$DistroName' is now default." "OK"
        }
        Remove-Item $exPath -Recurse -Force -ErrorAction SilentlyContinue

        Write-Log "Done! Run: wsl -d $DistroName" "SUCCESS"; Set-Status "Complete!"
        [System.Windows.Forms.MessageBox]::Show("Installation complete!`nDistro: $DistroName","FastFree OS","OK","Information")|Out-Null
    } catch {
        Write-Log "ERROR: $($_.Exception.Message)" "ERROR"; Set-Status "Failed!"
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Error","OK","Error")|Out-Null
    } finally { Set-Busy $false }
}

# ------------------------------------------------------------------
#  Background runner
# ------------------------------------------------------------------
function Start-BgWork ([scriptblock]$Work,[hashtable]$Vars=@{}) {
    $rs=[runspacefactory]::CreateRunspace(); $rs.ApartmentState="STA"; $rs.ThreadOptions="ReuseThread"; $rs.Open()
    foreach($n in @('txtLog','form','sLbl','progress','btnInstall','btnBrowse','btnDlBrowse')){
        $v=Get-Variable -Name $n -ValueOnly -ErrorAction SilentlyContinue
        if($null -ne $v){$rs.SessionStateProxy.SetVariable($n,$v)}
    }
    foreach($k in $Vars.Keys){$rs.SessionStateProxy.SetVariable($k,$Vars[$k])}
    $ps=[powershell]::Create(); $ps.Runspace=$rs
    $sb=[System.Text.StringBuilder]::new()
    foreach($fn in @('Find-SevenZip','Write-Log','Set-Busy','Set-Status')){
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
#  Wire Install button
# ------------------------------------------------------------------
$btnInstall.Add_Click({
    $txtLog.Clear(); Set-Busy $true
    $p=@{
        Owner=$txtOwner.Text.Trim(); Repo=$txtRepo.Text.Trim()
        Tag=$cmbTag.Text.Trim(); AssetName=$cmbAsset.Text.Trim()
        Token=$txtToken.Text; DistroName=$txtDistro.Text.Trim()
        InstallPath=$txtPath.Text.Trim(); DownloadPath=$txtDlPath.Text.Trim()
        SetDefault=$chkDef.Checked; SkipIfExists=$chkSkip.Checked
    }
    $def=(Get-Command Start-Install).Definition
    Start-BgWork -Work {
        Invoke-Expression "function Start-Install { $def }"
        Start-Install @IP
    } -Vars @{IP=$p;def=$def}
})

[void]$form.ShowDialog()
