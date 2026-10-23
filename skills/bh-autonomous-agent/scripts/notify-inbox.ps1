[CmdletBinding()]
param(
    [string]$Title = "Agent INBOX Notification",
    [string]$Message = "Đề xuất mới đang chờ bạn duyệt trong INBOX.md",
    [string]$Sound = "Default"
)

# Ensure UTF-8 output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    # Method 1: Windows 10/11 WinRT Toast Notification
    $template = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>$Title</text>
            <text>$Message</text>
        </binding>
    </visual>
    <audio src="ms-winsoundevent:Notification.Default" />
</toast>
"@

    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)

    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    $appId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
    Write-Host "🔔 Đã hiển thị Windows Toast Notification: $Title"
}
catch {
    try {
        # Method 2: Fallback to System.Windows.Forms NotifyIcon BalloonTip
        Add-Type -AssemblyName System.Windows.Forms
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Information
        $notify.BalloonTipTitle = $Title
        $notify.BalloonTipText = $Message
        $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
        $notify.Visible = $True
        $notify.ShowBalloonTip(5000)
        [System.Media.SystemSounds]::Asterisk.Play()
        Write-Host "🔔 Đã hiển thị BalloonTip Notification: $Title"
    }
    catch {
        Write-Warning "⚠️ Không thể hiển thị Desktop Toast: $($_.Exception.Message)"
        Write-Host "`a" # Beep
    }
}
