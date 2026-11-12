$exe = "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer\src-tauri\target\debug\fastfree-installer.exe"
$dir = "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer"

$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = "`"$exe`""
    CurrentDirectory = $dir
}

Write-Host "WMI ReturnValue: $($res.ReturnValue)"
Write-Host "WMI ProcessId: $($res.ProcessId)"

Start-Sleep -Seconds 10
$p = Get-Process -Id $res.ProcessId -ErrorAction SilentlyContinue
if ($p) {
    Write-Host "Still running! PID: $($p.Id), Responding: $($p.Responding)"
} else {
    Write-Host "Exited."
}
