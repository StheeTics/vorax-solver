# Registers the nightly reminder: a Windows notification every evening to start the nightly jobs
# (bash ~/repos/vorax-nightly/scripts/nightly.sh in WSL, or ask Claude). Run it again to change the time; -Remove takes it away.
# Usage: powershell -ExecutionPolicy Bypass -File reminder.ps1 [-At 23:00] [-Remove]
param([string]$At = '23:00', [switch]$Remove)
$name = 'Vorax nightly reminder'
Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
if ($Remove) { "Removed '$name'."; return }
# the task runs a copy kept outside WSL, so it works while WSL is stopped
$dir = Join-Path $env:LOCALAPPDATA 'Vorax'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'toast.ps1') (Join-Path $dir 'toast.ps1') -Force
$text = "Time for the nightly jobs: in WSL, bash ~/repos/vorax-nightly/scripts/nightly.sh | Or ask Claude to run them."
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$dir\toast.ps1`" `"Vorax nightly jobs`" `"$text`""
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description 'Reminds to run the Vorax nightly jobs (scripts/nightly.sh).' | Out-Null
"Registered '$name' daily at $At."
