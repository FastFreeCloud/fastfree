Get-Process | Where-Object { $_.ProcessName -like '*fastfree*' -or $_.ProcessName -like '*node-setup*' } | Format-Table Id, ProcessName, SessionId, Path
