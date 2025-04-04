# PowerShell script to check user activity

# Get the last input time
$lastInputInfo = New-Object "LASTINPUTINFO"
$lastInputInfo.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($lastInputInfo)
[System.Runtime.InteropServices.Marshal]::StructureToPtr($lastInputInfo, [System.IntPtr]::Zero, $false)
[System.Windows.Forms.Application]::DoEvents()
[System.Windows.Forms.Application]::Idle += { [System.Windows.Forms.Application]::DoEvents() }
[System.Windows.Forms.Application]::Run()

# Function to get the idle time in seconds
function Get-IdleTime {
    [System.Runtime.InteropServices.Marshal]::StructureToPtr($lastInputInfo, [System.IntPtr]::Zero, $false)
    $idleTime = (Get-TickCount) - $lastInputInfo.dwTime
    return [math]::Floor($idleTime / 1000)
}

# Check user activity every 5 seconds
while ($true) {
    $idleTime = Get-IdleTime
    if ($idleTime -lt 5) {
        Write-Host "User is active"
    } else {
        Write-Host "User is idle"
    }
    Start-Sleep -Seconds 5
}