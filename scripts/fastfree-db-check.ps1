###############################################################################
# FastFree Database Check Script (with password support)
# Usage: .\fastfree-db-check.ps1
###############################################################################

param(
    [string]$Server = "76.13.51.10",
    [string]$User = "root",
    [string]$Password = "fastfree@2026"
)

function Run-SSHCommand {
    param(
        [string]$Command
    )
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh"
    $psi.Arguments = "-o StrictHostKeyChecking=no $User@$Server"
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    
    $process = [System.Diagnostics.Process]::Start($psi)
    
    # Send password if prompted
    Start-Sleep -Milliseconds 500
    $process.StandardInput.WriteLine($Password)
    
    # Send the actual command
    Start-Sleep -Milliseconds 500
    $process.StandardInput.WriteLine($Command)
    $process.StandardInput.WriteLine("exit")
    
    # Read output
    $output = $process.StandardOutput.ReadToEnd()
    $error = $process.StandardError.ReadToEnd()
    
    $process.WaitForExit()
    
    return @{ Output = $output; Error = $error }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  FastFree Database Check" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Test SSH Connection
Write-Host "[1/7] Testing SSH connection to $Server..." -ForegroundColor Yellow
$result = Run-SSHCommand -Command "echo OK"
if ($result.Output -match "OK") {
    Write-Host "  OK: SSH connection successful" -ForegroundColor Green
} else {
    Write-Host "  WARN: SSH connection may have issues" -ForegroundColor Yellow
}

# Step 2: Check MariaDB Status
Write-Host ""
Write-Host "[2/7] Checking MariaDB status..." -ForegroundColor Yellow
$result = Run-SSHCommand -Command "systemctl status mariadb --no-pager -l 2>&1 | head -20"
Write-Host $result.Output

# Step 3: List Databases
Write-Host ""
Write-Host "[3/7] Listing databases..." -ForegroundColor Yellow
$result = Run-SSHCommand -Command "mysql -u $User -p'$Password' -e 'SHOW DATABASES;' 2>/dev/null"
Write-Host $result.Output

# Step 4: Database Sizes
Write-Host ""
Write-Host "[4/7] Database sizes..." -ForegroundColor Yellow
$result = Run-SSHCommand -Command "mysql -u $User -p'$Password' -e `"SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size_MB' FROM information_schema.tables GROUP BY table_schema ORDER BY SUM(data_length + index_length) DESC;`" 2>/dev/null"
Write-Host $result.Output

# Step 5: List Users
Write-Host ""
Write-Host "[5/7] MySQL users..." -ForegroundColor Yellow
$result = Run-SSHCommand -Command "mysql -u $User -p'$Password' -e 'SELECT user, host FROM mysql.user;' 2>/dev/null"
Write-Host $result.Output

# Step 6: Check Running Services
Write-Host ""
Write-Host "[6/7] Running services..." -ForegroundColor Yellow
$result = Run-SSHCommand -Command "systemctl list-units --type=service --state=running --no-pager | grep -E '(mariadb|mysql|caddy|wireguard|avahi|sshd|podman)'"
Write-Host $result.Output

# Step 7: Disk Usage
Write-Host ""
Write-Host "[7/7] Disk usage..." -ForegroundColor Yellow
$result = Run-SSHCommand -Command "df -h / /home /var 2>/dev/null"
Write-Host $result.Output

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Check complete" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
