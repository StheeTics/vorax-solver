# A Windows notification, for the nightly jobs on this PC: their reminder (scripts/local/reminder.ps1 registers it)
# and their result (scripts/nightly.sh, through WSL). Windows PowerShell 5.1, nothing to install.
# Usage: powershell -File toast.ps1 <title> <text>
param([string]$Title = 'Vorax', [string]$Text = '')
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$esc = { param($s) [System.Security.SecurityElement]::Escape($s) }
$lines = ($Text -split "`n| \| " | Where-Object { $_ } | ForEach-Object { "<text>$(& $esc $_)</text>" }) -join ''
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast><visual><binding template=`"ToastGeneric`"><text>$(& $esc $Title)</text>$lines</binding></visual></toast>")
# shown as Windows PowerShell's notification: an app id Windows already knows, so no shortcut is needed
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
