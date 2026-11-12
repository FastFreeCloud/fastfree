$exe = "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer\src-tauri\target\debug\fastfree-installer.exe"
$outLog = "C:\Users\FastFree\Desktop\fastfree\scratch\tauri_stdout.log"
$errLog = "C:\Users\FastFree\Desktop\fastfree\scratch\tauri_stderr.log"

if (Test-Path $outLog) { Remove-Item $outLog }
if (Test-Path $errLog) { Remove-Item $errLog }

$p = Start-Process -FilePath $exe -WorkingDirectory "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer" -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru

Write-Host "Started PID: $($p.Id)"
Start-Sleep -Seconds 6
Write-Host "Still running: $(!$p.HasExited)"
if ($p.HasExited) {
    Write-Host "ExitCode: $($p.ExitCode)"
}

Write-Host "--- STDOUT ---"
if (Test-Path $outLog) { Get-Content $outLog }
Write-Host "--- STDERR ---"
if (Test-Path $errLog) { Get-Content $errLog }
