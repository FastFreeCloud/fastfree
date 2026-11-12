$proc = Get-Process -Name 'fastfree-installer' -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "PID: $($proc.Id)"
    Write-Host "MainWindowTitle: $($proc.MainWindowTitle)"
    Write-Host "MainWindowHandle: $($proc.MainWindowHandle)"
    Write-Host "Responding: $($proc.Responding)"
} else {
    Write-Host "fastfree-installer not running"
}
