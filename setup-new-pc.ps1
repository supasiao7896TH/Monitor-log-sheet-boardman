# setup-new-pc.ps1 — สคริปต์ตั้งค่าระบบอัตโนมัติบนเครื่อง PC ใหม่
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Plant Log Analyzer — One-Click Setup for New PC" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. ตั้งสิทธิ์ NTFS ให้ Operator กะอื่นเข้าถึงได้บนเครื่อง Shared PC
Write-Host "`n[1/4] Setting folder NTFS permissions for BUILTIN\Users..." -ForegroundColor Green
icacls "D:\Monitor log sheet boardman" /grant "BUILTIN\Users:(OI)(CI)RX" /T | Out-Null
Write-Host "  -> NTFS Permissions granted successfully." -ForegroundColor Gray

# 2. ลงทะเบียน Custom URI Protocol (plantlogbridge://)
Write-Host "`n[2/4] Registering plantlogbridge:// protocol handler..." -ForegroundColor Green
reg import "D:\Monitor log sheet boardman\bridge\register-protocol.reg"
Write-Host "  -> Protocol registered successfully in HKCU." -ForegroundColor Gray

# 3. สร้าง Task Scheduler สำหรับเปิด Bridge อัตโนมัติตอนล็อกอิน
Write-Host "`n[3/4] Creating Task Scheduler auto-start task..." -ForegroundColor Green
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "D:\Monitor log sheet boardman\bridge\excel-bridge.ps1"'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
Register-ScheduledTask -TaskName "Plant Log Analyzer - Excel Bridge" -Action $action -Trigger $trigger -Description "Auto-start Excel Bridge on login" -Force | Out-Null
Write-Host "  -> Task Scheduler registered (Task: 'Plant Log Analyzer - Excel Bridge')." -ForegroundColor Gray

# 4. ตรวจสอบโฟลเดอร์ปลายทาง
Write-Host "`n[4/4] Verifying essential directories..." -ForegroundColor Green
$spPath = "C:\Users\$env:USERNAME\OneDrive - PTT Global Chemical Public Company Limited\Shortcuts\Production - PE Documents\02 - Plant 1\Log sheet digital PTA#1"
if (Test-Path -LiteralPath $spPath) {
    Write-Host "  [OK] SharePoint OneDrive Shortcut: FOUND" -ForegroundColor Green
} else {
    Write-Host "  [!] SharePoint OneDrive Shortcut: NOT FOUND YET (อย่าลืมกด 'Add shortcut to OneDrive' บนเว็บ SharePoint)" -ForegroundColor Yellow
}

$watchPath = "D:\PTA COMMONT WORK\Log sheet Digital"
if (Test-Path -LiteralPath $watchPath) {
    Write-Host "  [OK] Log Sheet Watch Folder: FOUND" -ForegroundColor Green
} else {
    Write-Host "  [!] Log Sheet Watch Folder: NOT FOUND YET (อย่าลืมนำโฟลเดอร์สำรองมาวางที่ D:\PTA COMMONT WORK)" -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Setup Completed! Starting Excel Bridge..." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process "D:\Monitor log sheet boardman\bridge\start-bridge.bat"
