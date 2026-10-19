$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$vbsPath = Join-Path $projectPath 'start-bot-hidden.vbs'

Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object {
  $_.CommandLine -match [regex]::Escape($projectPath) -and $_.CommandLine -match 'start:local|src/index'
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'MAX Bot.lnk'

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = 'wscript.exe'
$Shortcut.Arguments = "`"$vbsPath`""
$Shortcut.WorkingDirectory = $projectPath
$Shortcut.Description = 'MAX Applications Bot autostart'
$Shortcut.Save()

$taskName = 'MAX Applications Bot'
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbsPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

New-Item -ItemType Directory -Force -Path (Join-Path $projectPath 'data') | Out-Null
Write-Host "Autostart installed:"
Write-Host "  Startup shortcut: $shortcutPath"
Write-Host "  Scheduled task: $taskName"
Write-Host "  Log file: $(Join-Path $projectPath 'data\bot.log')"
