$Password = "Fastfree@2026"
$IP = "76.13.51.10"
$User = "root"

$commands = @'
echo "═══ 1. site_config.json FULL CONTENT ═══"
cat /var/lib/containers/storage/volumes/fastfree-backend-sites/_data/backend.fastfree.cloud/site_config.json 2>/dev/null || echo "NOT FOUND"

echo ""
echo "═══ 2. ALL MySQL users ═══"
mysql -u root -p"Fastfree@2026" -e "SELECT user, host, plugin FROM mysql.user;" 2>&1

echo ""
echo "═══ 3. MySQL databases ═══"
mysql -u root -p"Fastfree@2026" -e "SHOW DATABASES;" 2>&1

echo ""
echo "═══ 4. backend container env vars ═══"
podman exec fastfree-backend-app env 2>/dev/null | grep -iE 'DB|MYSQL|PASSWORD|FRAPPE' || echo "Cannot exec"

echo ""
echo "═══ 5. backend container MySQL connectivity test ═══"
podman exec fastfree-backend-app python3 -c "
import pymysql, json, os
cfg = json.load(open('/home/frappe/frappe-bench/sites/backend.fastfree.cloud/site_config.json'))
print('db_name:', cfg.get('db_name'))
print('db_password:', cfg.get('db_password'))
print('db_host:', cfg.get('db_host'))
try:
    conn = pymysql.connect(host=cfg.get('db_host','localhost'), user=cfg['db_name'], password=cfg['db_password'], database=cfg['db_name'])
    print('MySQL CONNECT: SUCCESS')
    conn.close()
except Exception as e:
    print('MySQL CONNECT FAILED:', e)
" 2>&1 || echo "Python test failed"

echo ""
echo "═══ 6. frappe-bench sites directory ═══"
ls -la /var/lib/containers/storage/volumes/fastfree-backend-sites/_data/backend.fastfree.cloud/ 2>/dev/null | head -20

echo ""
echo "═══ 7. fastfree-backend-mysql-user service logs ═══"
journalctl -u fastfree-backend-mysql-user.service --no-pager -n 30 2>&1

echo ""
echo "═══ 8. MariaDB error log (last 20) ═══"
journalctl -u mysql --no-pager -n 20 2>&1 | grep -i 'error\|denied\|failed' || echo "No errors"

echo ""
echo "═══ 9. Can we reach MySQL from inside backend container? ═══"
podman exec fastfree-backend-app mysql -h host.containers.internal -u root -p"Fastfree@2026" -e "SELECT 1;" 2>&1 || echo "MySQL not reachable from container"
'@

# Write the remote script to a temp file
$remoteScript = "/tmp/diagnose_vps.sh"

# Use plink or ssh with password
# Try using Process with stdin for password
$securePass = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ($User, $securePass)

# Method: Use ssh with expect-like approach via echo pipe
Write-Host "Connecting to $IP as $User..."

# Try using ssh with explicit password via echo
echo $Password | ssh -o StrictHostKeyChecking=no "$User@$IP" "cat" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "SSH key or agent auth works!"
}

# Let's try the direct approach - ssh with password piped
$process = New-Object System.Diagnostics.Process
$process.StartInfo.FileName = "ssh"
$process.StartInfo.Arguments = "-o StrictHostKeyChecking=no $User@$IP"
$process.StartInfo.UseShellExecute = $false
$process.StartInfo.RedirectStandardInput = $true
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true
$process.StartInfo.CreateNoWindow = $true

$process.Start() | Out-Null

# Send commands
$process.StandardInput.WriteLine($commands)
$process.StandardInput.Close()

$stdout = $process.StandardOutput.ReadToEnd()
$stderr = $process.StandardError.ReadToEnd()
$process.WaitForExit()

if ($stdout) { Write-Host $stdout }
if ($stderr) { Write-Host $stderr }
