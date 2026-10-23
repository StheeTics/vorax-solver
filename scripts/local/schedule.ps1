# Registers the nightly jobs with Windows' Task Scheduler: every night at 4:00 it starts scripts/nightly.sh in WSL,
# hidden, waking the PC for it when Windows allows wake timers, and running it at the next start when the PC was off.
# Output goes to ~/.local/share/vorax/nightly.log in WSL; a notification says how the jobs went.
# Run it again to change the time; -Remove takes it away.
# Usage (from WSL): powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w scripts/local/schedule.ps1)" [-At 04:00] [-Distro Ubuntu] [-Remove]
param([string]$At = '04:00', [string]$Distro = 'Ubuntu', [switch]$Remove)
$name = 'Vorax nightly jobs'
Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
# the evening reminder this replaces
Unregister-ScheduledTask -TaskName 'Vorax nightly reminder' -Confirm:$false -ErrorAction SilentlyContinue
if ($Remove) { "Removed '$name'."; return }
$run = "wsl.exe -d $Distro -- bash -c 'bash ~/repos/tli-vorax-simulator/scripts/nightly.sh >> ~/.local/share/vorax/nightly.log 2>&1'"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -Command `"$run`""
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 8) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description 'Runs the Vorax nightly jobs (scripts/nightly.sh in WSL).' | Out-Null
"Registered '$name' daily at $At."
