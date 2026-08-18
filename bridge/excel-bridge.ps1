# Plant Log Analyzer — Local Excel Bridge (V29.74)
#
# ทำไมต้องมีสคริปต์นี้: การทดลองจริงพบว่าไม่มีไลบรารี JavaScript ฟรีตัวไหน (SheetJS, exceljs)
# เขียนไฟล์ log sheet ของโรงงานกลับได้ครบถ้วนปลอดภัย — ไฟล์เหล่านี้มีสูตรเชื่อมต่อ OSIsoft PI System
# แบบ live (PI Datalink add-in) ซึ่งไลบรารีเหล่านั้นเขียน calcChain.xml ไม่ถูกต้อง ทำให้ Excel บังคับ
# คำนวณสูตรใหม่ทั้งหมดและกลายเป็น #NAME? แม้ค่าที่ถูกต้องจะยังอยู่ในไฟล์ก็ตาม (ดูรายละเอียดเหตุผล/
# หลักฐานการทดสอบใน context.md) มีแค่ Excel ตัวจริงเท่านั้นที่เขียนไฟล์ได้ถูกต้อง 100% — สคริปต์นี้จึง
# ทำหน้าที่เป็นตัวกลาง รับคำสั่งจาก Web App (ผ่าน HTTP บนเครื่องเดียวกัน) แล้วสั่ง Excel ที่เปิดไฟล์
# log sheet ค้างไว้อยู่แล้วให้เขียน comment กลับเข้าไปเอง
#
# วิธีใช้: เปิดไฟล์ log sheet ต้นฉบับใน Excel ค้างไว้ก่อน แล้วรันสคริปต์นี้ (ดู README.md ในโฟลเดอร์นี้
# สำหรับวิธีตั้งให้รันอัตโนมัติทุกครั้งที่ล็อกอินเข้าเครื่อง) ปล่อยหน้าต่างนี้รันค้างไว้ระหว่างใช้งาน
# Web App — ปิดหน้าต่างนี้ (Ctrl+C) เมื่อเลิกใช้งาน
#
# V29.78 FEAT: เพิ่ม route สำหรับ auto-import/auto-archive — Web App เรียก /source-file-info + /source-file
# เป็นระยะเพื่อดึงไฟล์ log sheet ล่าสุดจาก $WatchFolder มา import เองอัตโนมัติ (ไม่ต้อง COM/Excel เปิดไฟล์
# เลย แค่อ่านไฟล์ดิบจาก disk) และเรียก /archive-source-file เพื่อคัดลอกไฟล์ต้นฉบับไปเก็บ safety copy ที่
# $ArchiveFolder เมื่อ Web App เช็คแล้วว่าข้อมูลครบ 4 เวลา (03:00/09:00/15:00/21:00) ของวันนั้น
#
# V29.85 FEAT: เพิ่ม /save-shared-db + /load-shared-db ให้ browser sync ข้อมูลทั้งหมด (Tags/Records/
# MasterTags/UserCountermeasures) ผ่าน $SharedDbPath — แก้ปัญหา operator login คนละ Windows account บน
# เครื่อง shared เห็น IndexedDB คนละก้อน (IndexedDB ผูกกับ browser profile ต่อ account เสมอ)
#
# V29.96 FEAT: เพิ่ม /rollover-daily-file — เปลี่ยนชื่อไฟล์ log sheet (แพทเทิร์นวันที่ "(DD-MM-YY)" ในชื่อ
# ไฟล์) และเขียนวันที่ใหม่ลง cell W1 ของชีต "BM 1" อัตโนมัติทุกวัน แทนที่ operator ต้องทำเองทุกเช้า —
# เรียกซ้ำได้ทุก poll แบบ idempotent (no-op ถ้าวันที่ในชื่อไฟล์ตรงกับวันนี้อยู่แล้ว)
#
# V29.97 FEAT: /rollover-daily-file เปิดไฟล์ log sheet ใน Excel ให้เองอัตโนมัติถ้ายังไม่มีใครเปิดไว้ (เดิม
# ต้อง operator เปิดไฟล์ค้างไว้ก่อนเสมอ ไม่งั้น rollover ข้ามคืนจะ error ทิ้งไว้จนกว่าจะมีคนมาเปิดตอนเช้า) —
# ดู Find-OrOpenWorkbook ด้านล่าง ใช้เฉพาะ route นี้ ไม่กระทบ Handle-WriteRemark ซึ่งยังต้องการให้ operator
# เปิดไฟล์เองก่อนเหมือนเดิม (เขียน Resolution Remark เป็น manual flow ระหว่างเปิดไฟล์ดูอยู่แล้ว)

$Port = 5175
$AllowedOrigins = @(
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://monitor-log-sheet-boardman.supasiao.workers.dev'
)
$AppCommentAuthor = 'Plant Log Analyzer (Web App)'

# V29.78 FEAT: ตั้งค่า path ทั้งสองนี้ให้ตรงกับเครื่องจริงถ้าย้ายโฟลเดอร์ — ทั้งคู่เป็น path คงที่ที่กำหนด
# ไว้ในสคริปต์นี้เท่านั้น (ไม่รับ path จากฝั่งเบราว์เซอร์เด็ดขาด กัน endpoint ถูกใช้อ่าน/เขียนไฟล์นอกเหนือ
# จากที่ตั้งใจไว้)
$WatchFolder = "D:\PTA COMMONT WORK\Log sheet Digital"
# V29.95 CONFIG: ย้าย archive มารวมกับ $WatchFolder ตามคำขอ — ยังคง subfolder รายเดือน (เช่น "Aug 26")
# ไว้เหมือนเดิม กันไฟล์ archive ปนกับไฟล์ live ที่ root ของโฟลเดอร์นี้
$ArchiveFolder = "D:\PTA COMMONT WORK\Log sheet Digital"

# V29.85 FEAT: path เก็บ shared-db snapshot กลาง (Tags/Records/MasterTags/UserCountermeasures ทั้งหมด)
# — ไม่ผูกกับ Windows account คนใดคนหนึ่ง แก้ปัญหา operator login คนละ account บนเครื่อง shared แล้วเห็น
# IndexedDB คนละก้อน (IndexedDB ผูกกับ browser profile ซึ่งผูกกับ Windows account เสมอ ไม่เกี่ยวกับว่า
# ไฟล์ app อยู่ที่ไหน) เป็น path คงที่ในสคริปต์เท่านั้นเหมือน $WatchFolder/$ArchiveFolder ด้านบน
$SharedDbPath = "D:\Monitor log sheet boardman\shared-data\plantlog-shared-db.json"

function Write-CorsHeaders($response, $origin) {
    if ($origin -and ($AllowedOrigins -contains $origin)) {
        $response.Headers.Add('Access-Control-Allow-Origin', $origin)
        $response.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        $response.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')
        return $true
    }
    return $false
}

function Send-JsonResponse($response, $statusCode, $body, $depth = 5) {
    # V29.85 FEAT: $depth เสริม (default 5 เดิม ไม่กระทบ route อื่น) — payload ของ /load-shared-db ลึกกว่า
    # route อื่นเพราะซ้อน records/tags/masterTags/userCountermeasures ทั้งหมดไว้ใต้ field 'data'
    $json = $body | ConvertTo-Json -Compress -Depth $depth
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.StatusCode = $statusCode
    $response.ContentType = 'application/json; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
}

function Send-BinaryResponse($response, $statusCode, $bytes, $fileName) {
    $response.StatusCode = $statusCode
    $response.ContentType = 'application/octet-stream'
    $response.Headers.Add('Content-Disposition', "attachment; filename=`"$fileName`"")
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
}

# V29.78 FEAT: หาไฟล์ log sheet "วันนี้" ใน $WatchFolder — ไม่นับไฟล์ที่ชื่อมีคำว่า "(master)" (เป็น
# template ไว้อ้างอิง ไม่ใช่ไฟล์ข้อมูลจริง) ตาม routine จริงของ operator จะมีไฟล์ที่ไม่ใช่ master อยู่แค่
# ไฟล์เดียวเสมอ (operator เปลี่ยนวันที่ในชื่อไฟล์เดิมเอง ไม่ได้สร้างไฟล์ใหม่ทุกวัน) — ถ้าเจอมากกว่า 1 ไฟล์
# ไม่เดาว่าไฟล์ไหนถูก คืน error ทันที กัน auto-import/archive ดึงไฟล์ผิด
#
# V29.81 FIX: ก็ต้องข้ามไฟล์ที่ขึ้นต้นด้วย "~$" ด้วย — Excel สร้างไฟล์ lock ชื่อนี้เอง (เช่น
# "~$P1-F-2002-22 ... .xlsm") ทุกครั้งที่มีคนเปิดไฟล์ .xlsx/.xlsm ค้างไว้ ซึ่งตาม workflow ของฟีเจอร์นี้
# operator ต้องเปิดไฟล์ log sheet ค้างไว้ใน Excel ตลอดกะอยู่แล้ว (เพื่อให้ sync remark กลับ Excel ทำงานได้)
# — ถ้าไม่ข้ามไฟล์ lock นี้ Resolve-SourceFile จะเห็นเป็น "มากกว่า 1 ไฟล์" แล้ว error ทุกครั้งที่ไฟล์เปิดอยู่
# จริง ทำให้ auto-import/auto-archive ใช้งานไม่ได้เกือบตลอดเวลาที่ใช้งานจริง (พบจากการทดสอบจำลอง lock-file)
function Resolve-SourceFile {
    if (-not (Test-Path -LiteralPath $WatchFolder -PathType Container)) {
        return @{ status = 'error'; message = "ไม่พบโฟลเดอร์ $WatchFolder" }
    }
    $candidates = @(Get-ChildItem -LiteralPath $WatchFolder -File | Where-Object { $_.Name -notmatch '\(master\)' -and $_.Name -notlike '~$*' })
    if ($candidates.Count -eq 0) {
        return @{ status = 'not-found'; message = 'ไม่พบไฟล์ log sheet ในโฟลเดอร์ (ไม่นับไฟล์ master)' }
    }
    if ($candidates.Count -gt 1) {
        return @{ status = 'error'; message = 'พบไฟล์มากกว่า 1 ไฟล์ในโฟลเดอร์ (ไม่นับไฟล์ master) — ระบบรองรับเฉพาะกรณีมีไฟล์เดียว กรุณาตรวจสอบโฟลเดอร์' }
    }
    return @{ status = 'ok'; file = $candidates[0] }
}

# V29.78 FEAT: เปิดไฟล์แบบ FileShare.ReadWrite (แทน Get-Content/ReadAllBytes ที่เลือก sharing mode เองไม่
# ได้) ให้ยังอ่านได้แม้ Excel เปิดไฟล์ค้างอยู่พร้อมกัน — จุดเสี่ยงจริงคือช่วงสั้นๆ ที่ PI Datalink รีเฟรช
# แล้ว Excel กำลัง save (03:00/09:00/15:00/21:00) ซึ่งอาจชน sharing violation ได้ ให้ throw ต่อแล้วให้
# caller ดักด้วย Test-IsSharingViolation แทนที่จะจับ exception ในนี้เลย
function Read-FileBytesShared($path) {
    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    try {
        $ms = New-Object System.IO.MemoryStream
        $fs.CopyTo($ms)
        return $ms.ToArray()
    } finally {
        $fs.Close()
    }
}

# ERROR_SHARING_VIOLATION (0x80070020) เดินไล่ InnerException ด้วยเผื่อ .NET/PowerShell ห่อ exception
# ซ้อนชั้นมา (มี case ที่ static method call ผ่าน [Type]::Method() ได้ TargetInvocationException ห่ออีกที)
function Test-IsSharingViolation($exception) {
    $e = $exception
    while ($e) {
        if ($e.HResult -eq -2147024864) { return $true }
        $e = $e.InnerException
    }
    return $false
}

# V29.96 FEAT: parse วันที่แบบ "(DD-MM-YY)" จากชื่อไฟล์ log sheet (เช่น "P1-F-2002-22 (18-08-26) (Digital)")
# ใช้เทียบกับวันที่ปัจจุบันของเครื่องใน Handle-RolloverDailyFile ด้านล่าง — คืน $null ถ้าไม่เจอ pattern
# หรือ parse ไม่ได้เป็นวันที่จริง ไม่เดา (เหมือนปรัชญาของ Resolve-SourceFile ด้านบน)
function Get-FileNameDateInfo($fileName) {
    if ($fileName -notmatch '\((\d{2})-(\d{2})-(\d{2})\)') {
        return $null
    }
    $matchText = $Matches[0]
    $day = [int]$Matches[1]
    $month = [int]$Matches[2]
    $year = 2000 + [int]$Matches[3]
    try {
        $date = Get-Date -Year $year -Month $month -Day $day
    } catch {
        return $null
    }
    return @{ date = $date.Date; matchText = $matchText }
}

function Handle-SourceFileInfo {
    $resolved = Resolve-SourceFile
    if ($resolved.status -ne 'ok') { return $resolved }
    $f = $resolved.file
    return @{ status = 'ok'; fileName = $f.Name; sizeBytes = $f.Length; lastWriteTimeUtc = $f.LastWriteTimeUtc.ToString('o') }
}

function Handle-ArchiveSourceFile {
    $resolved = Resolve-SourceFile
    if ($resolved.status -ne 'ok') { return $resolved }
    if (-not (Test-Path -LiteralPath $ArchiveFolder -PathType Container)) {
        return @{ status = 'error'; message = "ไม่พบโฟลเดอร์ archive: $ArchiveFolder" }
    }

    # V29.80 FEAT: เก็บ archive แยกเป็นโฟลเดอร์ย่อยรายเดือน (เช่น "Aug 26") แทนที่จะกองรวมไว้ที่ root
    # ของ $ArchiveFolder เฉยๆ — ใช้ InvariantCulture (ปฏิทินเกรกอเรียน/ชื่อเดือนอังกฤษ) เสมอ ไม่ใช้ locale
    # ของเครื่อง เพราะเครื่องนี้ตั้ง Windows locale เป็นไทย ซึ่งจะ format 'yy' เป็นปี พ.ศ. 2 หลัก (เช่น 69
    # แทนที่จะเป็น 26) และชื่อเดือนเป็นภาษาไทย (ส.ค. แทนที่จะเป็น Aug) ถ้าไม่ระบุ culture ตรงๆ
    $monthFolderName = (Get-Date).ToString('MMM yy', [System.Globalization.CultureInfo]::InvariantCulture)
    $monthFolder = Join-Path $ArchiveFolder $monthFolderName
    if (-not (Test-Path -LiteralPath $monthFolder -PathType Container)) {
        New-Item -ItemType Directory -Path $monthFolder -Force | Out-Null
    }

    $destPath = Join-Path $monthFolder $resolved.file.Name
    try {
        # Copy-Item เปิดไฟล์ต้นทางอ่านเองภายใน จึงชน sharing violation ได้แบบเดียวกับ Read-FileBytesShared
        Copy-Item -LiteralPath $resolved.file.FullName -Destination $destPath -Force
        return @{ status = 'ok'; fileName = $resolved.file.Name; archivedPath = $destPath }
    } catch {
        if (Test-IsSharingViolation $_.Exception) {
            return @{ status = 'file-locked'; message = 'ไฟล์กำลังถูกเขียนอยู่ (Excel/PI กำลังรีเฟรชข้อมูล) กรุณาลองใหม่ในรอบถัดไป' }
        }
        return @{ status = 'error'; message = $_.Exception.Message }
    }
}

# V29.85 FEAT: เขียน shared-db snapshot (Tags/Records/MasterTags/UserCountermeasures ทั้งหมดจาก
# STORAGE_ENGINE.exportAll() ฝั่ง browser) ลง $SharedDbPath — ให้ operator ที่ login คนละ Windows account
# บนเครื่อง shared เห็นข้อมูลชุดเดียวกัน เขียนแบบ atomic (temp file แล้ว Move-Item ทับทีเดียว) กันไฟล์
# เสียหายครึ่งเดียวถ้า process ถูก interrupt กลางทาง (browser ปิด/network หลุดตอนกำลังเขียน) ซึ่งจะทำให้
# คนถัดไปที่ pull โดน parse error แทน
function Handle-SaveSharedDb($payload) {
    if (-not $payload) {
        return @{ status = 'error'; message = 'missing body' }
    }
    # เช็คว่ามี field หลักครบตาม shape ของ STORAGE_ENGINE.exportAll() ก่อนเขียนทับไฟล์กลาง — กัน payload
    # เพี้ยน (bug ฝั่ง client, request ผิดรูปแบบ) มาทำลาย shared-db ให้ operator คนอื่น pull ได้ข้อมูลพัง
    # ไปด้วย หมายเหตุ: ConvertFrom-Json บน PowerShell 5.1 แปลง JSON array ว่าง [] เป็น $null (ไม่ใช่ array
    # เปล่า) จึงเช็คแค่ว่า property มีอยู่จริง ไม่เช็คว่าต้องไม่เป็น $null (ไม่งั้น payload ที่ tags/records
    # ว่างจริงๆ เช่น export ก่อน import ครั้งแรก จะถูก reject ผิดๆ)
    $requiredFields = @('tags', 'records', 'masterTags')
    $propNames = $payload.PSObject.Properties.Name
    $missing = $requiredFields | Where-Object { $propNames -notcontains $_ }
    if ($missing.Count -gt 0) {
        return @{ status = 'error'; message = "payload missing required field(s): $($missing -join ', ')" }
    }
    try {
        $dir = Split-Path -Parent $SharedDbPath
        if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        $tmpPath = "$SharedDbPath.tmp"
        $json = $payload | ConvertTo-Json -Compress -Depth 10
        # WriteAllText(path, text, Encoding.UTF8) เขียน BOM (U+FEFF) นำหน้าเสมอ — ConvertFrom-Json ตอน
        # อ่านกลับใน Handle-LoadSharedDb จะ parse ไม่ผ่าน ("Invalid JSON primitive") เพราะ GetString ไม่ตัด
        # BOM ออกให้ ต้องเขียนด้วย GetBytes ตรงๆ (ไม่มี preamble) เหมือน Send-JsonResponse ใช้อยู่แล้ว
        [System.IO.File]::WriteAllBytes($tmpPath, [System.Text.Encoding]::UTF8.GetBytes($json))
        Move-Item -LiteralPath $tmpPath -Destination $SharedDbPath -Force
        return @{ status = 'ok' }
    } catch {
        return @{ status = 'error'; message = $_.Exception.Message }
    }
}

# V29.85 FEAT: อ่าน shared-db snapshot ล่าสุดกลับมาให้ browser ตอน init (pull-on-load) — 'not-found' ไม่ใช่
# error ถือเป็นสถานะปกติตอนยังไม่มีใคร push อะไรมาก่อนเลย (เครื่องใหม่/ครั้งแรกที่ตั้ง Bridge)
function Handle-LoadSharedDb {
    if (-not (Test-Path -LiteralPath $SharedDbPath -PathType Leaf)) {
        return @{ status = 'not-found' }
    }
    try {
        $bytes = Read-FileBytesShared $SharedDbPath
        $text = [System.Text.Encoding]::UTF8.GetString($bytes)
        $data = $text | ConvertFrom-Json
        return @{ status = 'ok'; data = $data }
    } catch {
        if (Test-IsSharingViolation $_.Exception) {
            return @{ status = 'file-locked'; message = 'ไฟล์กำลังถูกเขียนอยู่ กรุณาลองใหม่' }
        }
        return @{ status = 'error'; message = $_.Exception.Message }
    }
}

function Find-OpenWorkbook($fileName) {
    # หา workbook จากชื่อไฟล์ (ไม่ใช้ full path เพราะเบราว์เซอร์ให้ full path ไม่ได้ — ดูเหตุผลใน
    # context.md) โดยดึง Excel instance ที่กำลังรันอยู่จาก Running Object Table แล้ววนหา Workbooks.Name
    # ที่ตรงกัน — ครอบคลุมกรณีทั่วไปที่ Excel รันเป็น process เดียวคุมทุกไฟล์ที่เปิดอยู่ (ค่า default
    # ของ Excel ส่วนใหญ่) ถ้า operator เปิด Excel แยกหลาย process จริงๆ อาจหาไม่เจอ — ให้เปิดไฟล์ใน
    # instance เดียวกับที่ใช้งานอยู่ปกติ
    try {
        $excel = [Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')
    } catch {
        return $null, $null
    }
    foreach ($wb in $excel.Workbooks) {
        if ($wb.Name -eq $fileName) { return $excel, $wb }
    }
    return $excel, $null
}

# V29.97 FEAT: ใช้เฉพาะ Handle-RolloverDailyFile — ต่างจาก Find-OpenWorkbook ตรงที่ "เปิดไฟล์ให้เองถ้ายัง
# ไม่มีใครเปิดไว้" แทนที่จะแค่หาแล้วคืน $null ถ้าไม่เจอ ให้ rollover กลางดึกทำงานจบได้เองแม้ operator ยังไม่
# ได้เปิด Excel เลยก็ตาม (ต่างจาก Handle-WriteRemark ที่ยังคง requirement เดิมไว้โดยเจตนา — ดู comment
# header ด้านบนของไฟล์)
function Find-OrOpenWorkbook($fileName, $fullPath) {
    try {
        $excel = [Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')
    } catch {
        $excel = New-Object -ComObject Excel.Application
    }
    # ตั้ง Visible เสมอไม่ว่าจะ attach ของเดิมหรือสร้างใหม่ — กัน instance ที่ถูกสร้างแบบซ่อนอยู่เบื้องหลัง
    # (ทั้งจากสคริปต์นี้เองตอนไม่มี Excel รันอยู่ หรือจาก process อื่นที่เคยสร้างไว้แบบ invisible) ให้
    # operator เห็นไฟล์เปิดอยู่จริงเมื่อมาถึงเครื่อง
    $excel.Visible = $true

    foreach ($wb in $excel.Workbooks) {
        if ($wb.Name -eq $fileName) { return @{ excel = $excel; wb = $wb } }
    }

    $originalDisplayAlerts = $excel.DisplayAlerts
    $excel.DisplayAlerts = $false
    try {
        # UpdateLinks=0: ไม่ต้อง prompt/auto-refresh สูตร PI Datalink ตอนเปิดไฟล์ (เลี่ยง dialog ที่จะค้าง
        # สคริปต์ไว้รอ operator กดตอบ ซึ่งไม่มีใครอยู่หน้าเครื่องตอนกลางดึก) — ReadOnly=$false เพราะต้อง
        # SaveAs/Save ต่อทันทีหลังเปิด
        $wb = $excel.Workbooks.Open($fullPath, 0, $false)
        return @{ excel = $excel; wb = $wb }
    } catch {
        return @{ excel = $excel; wb = $null; errorMessage = $_.Exception.Message }
    } finally {
        $excel.DisplayAlerts = $originalDisplayAlerts
    }
}

function Handle-WriteRemark($payload) {
    if (-not $payload.fileName -or -not $payload.machine -or -not $payload.cellRef) {
        return @{ status = 'error'; message = 'missing fileName/machine/cellRef' }
    }

    $excel, $wb = Find-OpenWorkbook $payload.fileName
    if (-not $excel) {
        return @{ status = 'no-file-open'; message = 'ไม่พบ Excel ที่กำลังรันอยู่บนเครื่องนี้' }
    }
    if (-not $wb) {
        return @{ status = 'no-file-open'; message = "ไม่พบไฟล์ '$($payload.fileName)' เปิดอยู่ใน Excel — กรุณาเปิดไฟล์ต้นฉบับค้างไว้ก่อน" }
    }

    $sheet = $null
    foreach ($s in $wb.Sheets) {
        if ($s.Name -eq $payload.machine) { $sheet = $s; break }
    }
    if (-not $sheet) {
        return @{ status = 'error'; message = "ไม่พบ sheet '$($payload.machine)' ในไฟล์" }
    }

    # V29.75 DEBUG: ห่อแต่ละขั้นตอนเสี่ยงด้วย try/catch แยกกัน — เดิม exception ตรงไหนก็ตามจะโดน catch
    # รวมที่ loop หลักแล้วคืนแค่ "Exception from HRESULT: 0x..." เฉยๆ (COM error ทั่วไปของ Excel ไม่บอก
    # สาเหตุจริง) ทำให้ debug ไม่ได้ว่าพังตรงไหนจาก 4 จุดที่เป็นไปได้ (Range/Comment/AddComment/Save) —
    # ระบุจุดที่พังในข้อความ error ให้ชัดเจนขึ้นแทน ไม่เปลี่ยนพฤติกรรม happy-path
    try {
        $range = $sheet.Range($payload.cellRef)
    } catch {
        return @{ status = 'error'; message = "เปิด range '$($payload.cellRef)' ไม่ได้ (cellRef อาจไม่ถูกต้อง): $($_.Exception.Message)" }
    }

    try {
        $existingComment = $range.Comment
    } catch {
        return @{ status = 'error'; message = "อ่าน comment เดิมของ range '$($payload.cellRef)' ไม่ได้: $($_.Exception.Message)" }
    }

    # V29.75 FIX: Excel รุ่นใหม่มี comment 2 ระบบคือ legacy Note (เข้าถึงผ่าน .Comment ด้านบน) กับ
    # Threaded Comment (ระบบ default ของปุ่ม "New Comment" ใน Excel 2019+/365) — .Comment มองไม่เห็น
    # Threaded Comment เลย (คืน $null ทั้งที่จริงมี Threaded Comment อยู่) เดิมโค้ดจึงคิดว่าเซลล์ว่าง แล้วไป
    # เรียก AddComment() (สร้าง legacy Note) ทับเซลล์ที่มี Threaded Comment อยู่แล้ว ทำให้ Excel COM throw
    # "Exception from HRESULT: 0x800A03EC" (เจอจริงกับ Tag LI-2601 ที่ operator เคยพิมพ์ comment เองใน
    # Excel ไว้ก่อนหน้าฟีเจอร์นี้) — เช็ค .CommentThreaded เพิ่ม แล้วถือเป็น conflict เหมือน legacy comment
    # (แอปเองไม่เคยสร้าง Threaded Comment เลย เขียนแต่ legacy Note เสมอ ดังนั้น Threaded Comment ที่เจอ
    # ต้องเป็นของคนอื่นพิมพ์เองเสมอ ไม่มีทางเป็นของแอป — ไม่ต้องเช็ค Author เหมือนฝั่ง legacy)
    try {
        $existingThreadedComment = $range.CommentThreaded
    } catch {
        # Excel รุ่นเก่าก่อน 2019 ไม่มี property นี้เลย — ถือว่าไม่มี Threaded Comment ให้ชนกัน
        $existingThreadedComment = $null
    }

    $remarkText = [string]$payload.remarkText

    if ($existingComment -and $existingComment.Author -ne $AppCommentAuthor) {
        return @{ status = 'conflict'; message = 'มี Comment ที่คนอื่นพิมพ์ไว้ในช่องนี้แล้ว ระบบไม่เขียนทับให้' }
    }
    if ($existingThreadedComment) {
        return @{ status = 'conflict'; message = 'มี Comment แบบ Threaded (Excel รุ่นใหม่) ที่คนอื่นพิมพ์ไว้ในช่องนี้แล้ว ระบบไม่เขียนทับให้ กรุณาลบ/ตรวจสอบเองใน Excel ก่อน' }
    }

    # ลบของเดิม (ถ้าเป็นของแอปเอง) แล้วค่อยสร้างใหม่เสมอ — ง่ายและชัดเจนกว่าการพยายาม
    # overwrite ข้อความเดิมผ่าน Comment.Text() ซึ่ง Start/Overwrite parameter งงและเสี่ยงพลาด
    if ($existingComment) {
        try {
            $existingComment.Delete()
        } catch {
            return @{ status = 'error'; message = "ลบ comment เดิมไม่ได้: $($_.Exception.Message)" }
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($remarkText)) {
        # Comment.Author เป็น read-only, กำหนดได้ทางเดียวคือตั้ง Application.UserName ก่อนสร้าง comment
        # แล้วรีบตั้งค่าคืนทันทีหลังสร้างเสร็จ ไม่ให้กระทบชื่อผู้ใช้ของ operator เอง
        $originalUserName = $excel.UserName
        try {
            $excel.UserName = $AppCommentAuthor
            $range.AddComment($remarkText) | Out-Null
        } catch {
            return @{ status = 'error'; message = "เพิ่ม comment ใหม่ไม่ได้ (อาจมี Threaded Comment ของ Excel รุ่นใหม่ค้างอยู่ในเซลล์นี้แล้ว): $($_.Exception.Message)" }
        } finally {
            $excel.UserName = $originalUserName
        }
    }

    try {
        $wb.Save()
    } catch {
        return @{ status = 'error'; message = "บันทึกไฟล์ไม่ได้: $($_.Exception.Message)" }
    }
    return @{ status = 'ok' }
}

# V29.96 FEAT: ทุกวัน operator ต้องเปลี่ยนชื่อไฟล์ log sheet เอง (เช่น "(18-08-26)" -> "(19-08-26)") และ
# เขียนวันที่ใหม่ลง cell W1 ของชีต "BM 1" เอง (เป็นตัวขับสูตร PI Datalink ให้ดึงข้อมูลของวันนั้น) — route
# นี้ทำแทนอัตโนมัติ ออกแบบให้ idempotent เรียกซ้ำได้ทุก poll (ทุก 5 นาที) ตลอด 24 ชม. โดยไม่มีผลข้างเคียง
# ถ้าวันที่ในชื่อไฟล์ตรงกับวันนี้อยู่แล้ว (เคสปกติเกือบทุกครั้งที่เช็ค) — จะ rename+เขียนจริงเฉพาะตอนเลย
# เที่ยงคืนมาแล้วเท่านั้น (วันที่ในชื่อไฟล์ < วันนี้) ตัดปัญหาเรื่องต้อง trigger ให้ตรงเที่ยงคืนเป๊ะออกไปทั้งหมด
function Handle-RolloverDailyFile {
    $resolved = Resolve-SourceFile
    if ($resolved.status -ne 'ok') { return $resolved }
    $file = $resolved.file

    $dateInfo = Get-FileNameDateInfo $file.Name
    if (-not $dateInfo) {
        return @{ status = 'error'; message = "ไม่พบรูปแบบวันที่ (DD-MM-YY) ในชื่อไฟล์: $($file.Name)" }
    }

    $today = (Get-Date).Date
    if ($dateInfo.date -eq $today) {
        return @{ status = 'already-current' }
    }
    if ($dateInfo.date -gt $today) {
        return @{ status = 'error'; message = "วันที่ในชื่อไฟล์ ($($dateInfo.date.ToString('dd-MM-yy'))) ล้ำหน้าวันที่ปัจจุบันของเครื่อง กรุณาตรวจสอบเอง" }
    }

    # สำรองไฟล์เดิม (วันก่อนหน้า) ไปเก็บ archive ก่อนเสมอ ไม่ว่า auto-archive-on-4-times จะเคยรันมาก่อน
    # หรือยัง (Handle-ArchiveSourceFile ใช้ Copy-Item -Force เขียนทับได้ ไม่ error ถ้ามีสำเนาอยู่แล้ว) —
    # กันข้อมูลของวันก่อนหน้าหายถ้าวันนั้นไม่เคยครบ 4 เวลา แล้วโดนลบไฟล์ต้นฉบับทิ้งด้านล่าง
    $archiveResult = Handle-ArchiveSourceFile
    if ($archiveResult.status -ne 'ok') {
        return @{ status = 'error'; message = "สำรองไฟล์เดิมก่อน rollover ไม่สำเร็จ: $($archiveResult.message)" }
    }

    # V29.97 FEAT: เปิดไฟล์ให้เองอัตโนมัติถ้ายังไม่มีใครเปิดไว้ (ต่างจาก Handle-WriteRemark ที่ยังใช้
    # Find-OpenWorkbook เดิม — ดู comment เหนือ Find-OrOpenWorkbook)
    $opened = Find-OrOpenWorkbook $file.Name $file.FullName
    $excel = $opened.excel
    $wb = $opened.wb
    if (-not $wb) {
        return @{ status = 'open-failed'; message = "เปิดไฟล์ '$($file.Name)' ใน Excel อัตโนมัติไม่สำเร็จ: $($opened.errorMessage)" }
    }

    $newFileName = $file.Name.Replace($dateInfo.matchText, "($($today.ToString('dd-MM-yy')))")
    $newFullPath = Join-Path $WatchFolder $newFileName

    # ปิด DisplayAlerts ชั่วคราวกัน Excel เด้ง dialog ถามยืนยันฟอร์แมตไฟล์ (เช่น "Keep Current Format?")
    # ค้างสคริปต์ — ต้องส่ง $wb.FileFormat เดิมไปด้วยเสมอ ไม่งั้น SaveAs อาจเปลี่ยนฟอร์แมตไฟล์ (เช่น
    # .xlsm ตัด macro กลายเป็น .xlsx) ทั้งที่ path ปลายทางยังเป็นนามสกุลเดิม
    $originalDisplayAlerts = $excel.DisplayAlerts
    $excel.DisplayAlerts = $false
    try {
        $wb.SaveAs($newFullPath, $wb.FileFormat)
    } catch {
        return @{ status = 'error'; message = "เปลี่ยนชื่อไฟล์ (SaveAs) ไม่สำเร็จ: $($_.Exception.Message)" }
    } finally {
        $excel.DisplayAlerts = $originalDisplayAlerts
    }

    $sheet = $null
    foreach ($s in $wb.Sheets) {
        if ($s.Name -eq 'BM 1') { $sheet = $s; break }
    }
    if (-not $sheet) {
        return @{ status = 'error'; message = "เปลี่ยนชื่อไฟล์เป็น '$newFileName' สำเร็จแล้ว แต่ไม่พบชีต 'BM 1' เพื่อเขียนวันที่ใหม่ — กรุณาแก้ W1 เองในไฟล์" }
    }

    try {
        $range = $sheet.Range('W1')
        $range.Value2 = $today
        $wb.Save()
    } catch {
        return @{ status = 'error'; message = "เปลี่ยนชื่อไฟล์เป็น '$newFileName' สำเร็จแล้ว แต่เขียนวันที่ลง W1 ไม่สำเร็จ: $($_.Exception.Message) — กรุณาแก้เองในไฟล์" }
    }

    try {
        Remove-Item -LiteralPath $file.FullName -Force
    } catch {
        return @{ status = 'ok'; oldFileName = $file.Name; newFileName = $newFileName; warning = "ลบไฟล์ชื่อเดิม ($($file.Name)) ไม่สำเร็จ กรุณาลบเองด้วยมือ ไม่งั้นระบบ auto-import จะ error รอบถัดไป (พบไฟล์มากกว่า 1 ไฟล์)" }
    }

    return @{ status = 'ok'; oldFileName = $file.Name; newFileName = $newFileName }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Excel Bridge กำลังทำงานที่ http://localhost:$Port/ (กด Ctrl+C เพื่อหยุด)"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $origin = $request.Headers['Origin']

        try {
            $corsOk = Write-CorsHeaders $response $origin

            if ($request.HttpMethod -eq 'OPTIONS') {
                $response.StatusCode = 204
                $response.OutputStream.Close()
                continue
            }

            if (-not $corsOk -and $origin) {
                Send-JsonResponse $response 403 @{ status = 'error'; message = 'origin not allowed' }
                continue
            }

            if ($request.Url.AbsolutePath -eq '/ping' -and $request.HttpMethod -eq 'GET') {
                Send-JsonResponse $response 200 @{ status = 'ok' }
                continue
            }

            if ($request.Url.AbsolutePath -eq '/write-remark' -and $request.HttpMethod -eq 'POST') {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
                $payload = $bodyText | ConvertFrom-Json
                $result = Handle-WriteRemark $payload
                Send-JsonResponse $response 200 $result
                continue
            }

            # V29.78 FEAT: ข้อมูลไฟล์ log sheet ปัจจุบัน (ชื่อ/ขนาด/เวลาแก้ไขล่าสุด) — Web App ใช้เทียบว่า
            # ไฟล์เปลี่ยนไปจากรอบก่อนหรือยังก่อนจะ fetch เนื้อไฟล์จริง
            if ($request.Url.AbsolutePath -eq '/source-file-info' -and $request.HttpMethod -eq 'GET') {
                Send-JsonResponse $response 200 (Handle-SourceFileInfo)
                continue
            }

            # V29.78 FEAT: เนื้อไฟล์ดิบ — ตอบ raw binary ตอนสำเร็จ (JS ฝั่ง client เอาไปสร้าง File ต่อได้
            # ทันทีผ่าน arrayBuffer() ไม่ต้อง decode base64) ตอบ JSON envelope ปกติเฉพาะตอน error/not-found/
            # file-locked เท่านั้น — client ต้องเช็ค Content-Type ก่อนตัดสินใจว่าจะ .json() หรือ .arrayBuffer()
            if ($request.Url.AbsolutePath -eq '/source-file' -and $request.HttpMethod -eq 'GET') {
                $resolved = Resolve-SourceFile
                if ($resolved.status -ne 'ok') {
                    Send-JsonResponse $response 200 $resolved
                    continue
                }
                try {
                    $bytes = Read-FileBytesShared $resolved.file.FullName
                    Send-BinaryResponse $response 200 $bytes $resolved.file.Name
                } catch {
                    if (Test-IsSharingViolation $_.Exception) {
                        Send-JsonResponse $response 200 @{ status = 'file-locked'; message = 'ไฟล์กำลังถูกเขียนอยู่ (Excel/PI กำลังรีเฟรชข้อมูล) กรุณาลองใหม่ในรอบถัดไป' }
                    } else {
                        Send-JsonResponse $response 200 @{ status = 'error'; message = $_.Exception.Message }
                    }
                }
                continue
            }

            # V29.78 FEAT: คัดลอกไฟล์ต้นฉบับไปเก็บ safety copy ที่ $ArchiveFolder — เรียกตอน Web App เช็ค
            # แล้วว่าข้อมูลครบ 4 เวลาของวันนั้น (คู่ขนานกับที่ operator อัปโหลด SharePoint เองด้วยมือตามปกติ)
            if ($request.Url.AbsolutePath -eq '/archive-source-file' -and $request.HttpMethod -eq 'POST') {
                Send-JsonResponse $response 200 (Handle-ArchiveSourceFile)
                continue
            }

            # V29.96 FEAT: rollover ไฟล์ log sheet วันใหม่อัตโนมัติ — เปลี่ยนชื่อไฟล์ + เขียนวันที่ใหม่ลง
            # W1 ของชีต "BM 1" แทนที่ operator ต้องทำเองทุกวัน เรียกได้ทุก poll (idempotent, no-op ถ้า
            # วันที่ในชื่อไฟล์ตรงกับวันนี้อยู่แล้ว) หรือกดปุ่ม "Rollover เองตอนนี้" ในเว็บก็เรียก route นี้ตรงๆ
            if ($request.Url.AbsolutePath -eq '/rollover-daily-file' -and $request.HttpMethod -eq 'POST') {
                Send-JsonResponse $response 200 (Handle-RolloverDailyFile)
                continue
            }

            # V29.85 FEAT: push shared-db snapshot จาก browser ไปเก็บที่ $SharedDbPath — เรียกทุกครั้งที่
            # มีการแก้ไขข้อมูลใน Web App (fire-and-forget ฝั่ง client, ดู APP.pushSharedDb)
            if ($request.Url.AbsolutePath -eq '/save-shared-db' -and $request.HttpMethod -eq 'POST') {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
                $payload = $bodyText | ConvertFrom-Json
                $result = Handle-SaveSharedDb $payload
                Send-JsonResponse $response 200 $result
                continue
            }

            # V29.85 FEAT: pull shared-db snapshot ล่าสุด — Web App เรียกครั้งเดียวตอน init ก่อน loadLocalData
            if ($request.Url.AbsolutePath -eq '/load-shared-db' -and $request.HttpMethod -eq 'GET') {
                Send-JsonResponse $response 200 (Handle-LoadSharedDb) 10
                continue
            }

            Send-JsonResponse $response 404 @{ status = 'error'; message = 'not found' }
        } catch {
            try { Send-JsonResponse $response 500 @{ status = 'error'; message = $_.Exception.Message } } catch {}
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
