$exePath = "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer\src-tauri\target\debug\fastfree-installer.exe"
Write-Host "Target executable: $exePath"

# Method 1: Using Shell.Application COM object connected to explorer
try {
    $shell = New-Object -ComObject Shell.Application
    $shell.ShellExecute($exePath, "", "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer", "open", 1)
    Write-Host "Shell.Application ShellExecute invoked successfully."
} catch {
    Write-Host "ShellExecute failed: $_"
    # Fallback: explorer.exe invocation
    Start-Process -FilePath "explorer.exe" -ArgumentList "`"$exePath`""
    Write-Host "Explorer.exe launched."
}

Start-Sleep -Seconds 3
$p = Get-Process -Name 'fastfree-installer' -ErrorAction SilentlyContinue
if ($p) {
    Write-Host "Process running: ID $($p.Id) Session $($p.SessionId)"
} else {
    Write-Host "Process not detected yet."
}
