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
#
# V29.98 FEAT: เพิ่ม rollover check ทันทีตอน bridge เริ่มทำงาน (ดูโค้ดก่อน main loop ด้านล่างสุดของไฟล์)
# แทนที่จะพึ่ง Web App เปิด/poll ทุก 5 นาทีอย่างเดียว — เจตนาคือให้ rollover เกิดได้แม้ไม่มีใครเปิดหน้าเว็บ
# เลย โดยไม่ต้องใช้บัญชี Windows เฉพาะ + Task Scheduler ยิงตรงเวลา (พิจารณาแล้วปัดทิ้งเพราะเครื่องจริง
# หน้างานเป็น PC shared ที่ operator หลายคน login/logout ด้วยบัญชีตัวเองจริง — บัญชีเฉพาะจะครอง port 5175
# ตลอดเวลาจนทำให้ write-remark ของ operator คนอื่นมองไม่เห็น Excel session ตัวเอง พังทั้งฟีเจอร์)
#
# V29.99 FEAT: เพิ่ม /ensure-file-open — แยก concern "Excel เปิดไฟล์อยู่ไหม" ออกจาก "ต้องเปลี่ยนชื่อไฟล์ไหม"
# ของ /rollover-daily-file เพราะ route เดิม short-circuit เป็น already-current ทันทีถ้าวันที่ตรงกันอยู่แล้ว
# โดยไม่เช็คว่า Excel ยังเปิดไฟล์อยู่จริงไหม — พลาดเคสเปลี่ยนกะกลางวัน (~ทุก 12 ชม., ยังไม่ข้ามเที่ยงคืน)
# ที่ operator คนก่อน logout ปิด Excel/bridge session ไปด้วย แล้วคนใหม่ login มาเปิด Web App แต่ไม่มีอะไร
# เปิด Excel ให้เลย — เรียกจาก 2 จุด: bridge startup (ถ้า rollover ได้ already-current) และ APP.init()
# ฝั่ง Web App (fire-and-forget ทุกครั้งที่เปิดหน้าเว็บ)
#
# V29.100 FIX: Handle-RolloverDailyFile เดิมใช้ SaveAs เปลี่ยนแค่ชื่อไฟล์กับวันที่ใน W1 แต่ comment
# (Resolution Remark) ที่แอปเคยเขียนไว้ผ่าน Handle-WriteRemark ยังติดอยู่กับ cell เดิมข้ามวันไปด้วย — เพราะ
# layout ของ log sheet ใช้แถว/คอลัมน์เดิมซ้ำทุกวัน มีแค่สูตร PI Datalink ที่ดึงค่าของวันใหม่มาแทน ทำให้
# comment ของเมื่อวานค้างโผล่อยู่บนแถวเดียวกันของวันนี้ (ตามที่ operator รายงานเข้ามา) เพิ่ม Clear-AppComments
# ลบ comment ที่ Author เป็นแอปเองออกทั้งไฟล์ทันทีหลัง SaveAs ไม่แตะ comment ที่ operator พิมพ์เอง
#
# V29.102 FEAT: เพิ่ม /autosave-source-file — แก้ปัญหา operator รายงานว่าค่าที่ควรมีตามเวลา (เช่น 9:00)
# ไม่ auto-sync เข้า Web App จนกว่าจะกด Ctrl+S ที่ Excel เอง ต้นเหตุคือสูตร PI Datalink ในไฟล์คำนวณ/แสดงค่า
# ใหม่บนจอ Excel แบบ live ได้เอง แต่ค่านั้นอยู่แค่ใน memory ของ Excel ไม่ถูกเขียนกลับลงไฟล์บนดิสก์จนกว่าจะมี
# การ Save จริง ในขณะที่ auto-import (pollAutoImport ฝั่ง Web App) เช็คแค่ LastWriteTimeUtc ของไฟล์บนดิสก์
# เท่านั้น (ดู Handle-SourceFileInfo) — route นี้ให้ bridge สั่ง Excel save ไฟล์ให้เองเป็นระยะแทนที่จะรอ
# operator กด Save เอง ใช้ Find-OpenWorkbook ตัวเดิม (เหมือน Handle-WriteRemark)
#
# V29.106 FIX: $listener.Start() เดิมไม่มี try/catch — เจอ port 5175 ถูก instance อื่นจองอยู่แล้ว (เช่นตอนกด
# ปุ่ม "เปิด Excel Bridge" ในเว็บขณะ bridge ตัวเดิมยังทำงานอยู่ แต่ sync indicator ยังไม่ทันอัปเดต) จะ throw
# raw .NET exception ยาวๆ ทำให้สคริปต์จบแล้ว start-bridge.bat ไปค้างที่ prompt "กด key ใดก็ได้เพื่อปิด" ต่อ
# ปกติ — operator เจอจริงแล้วนึกว่าหน้าต่างดำ "ไม่ปิดไปเอง" เป็น error ร้ายแรง ทั้งที่ไม่มีผลกระทบอะไรเลย (bridge
# ตัวเดิมยังทำงานปกติ) จับ exception แล้วโชว์ข้อความไทยที่บอกตรงๆ แทน (ดู try/catch รอบ $listener.Start()
# ด้านล่าง) คู่กับฝั่ง Web App ที่เช็คก่อนแล้วว่า bridge ตอบอยู่หรือยังก่อนสั่งเปิดใหม่ (APP.retryConnectAfter
# OpenBridge ใน app-core.js) เพื่อไม่ให้ต้องพึ่งแค่ข้อความที่เป็นมิตรใน bridge ฝั่งเดียว
#
# V29.107 FIX: Handle-AutosaveSourceFile เดิมเช็ค $wb.Saved ก่อนเสมอแล้วข้าม .Save() ถ้าเป็น $true — ตั้ง
# สมมติฐานไว้ (ไม่เคยทดสอบยืนยันจริง) ว่า Excel จะ set .Saved = $false เองเมื่อสูตร PI Datalink refresh แล้ว
# ค่าเปลี่ยน แต่ operator ยังรายงานว่าต้องกด Ctrl+S เองอยู่ดีแม้มี V29.102 แล้ว — ตรวจสอบพบว่า external-data
# refresh ของ PI Datalink ไม่ได้ trigger COM dirty-flag แบบเดียวกับ manual cell edit เสมอไป ทำให้ .Saved ค้าง
# เป็น $true ทั้งที่จอ Excel โชว์ค่าใหม่แล้ว → .Save() ไม่เคยถูกเรียก → mtime ไฟล์ไม่ขยับ → pollAutoImport
# ฝั่ง Web App เห็นว่าไฟล์ "ไม่เปลี่ยน" ทุกรอบ ไม่มีวันเข้าไป fetchSourceFile เลย แก้โดยถอด gate ทิ้ง เรียก
# $wb.Save() แบบไม่มีเงื่อนไขทุกรอบ poll (ทุก 5 นาที) แทน — ยอมแลก disk write ที่บางรอบไม่มีอะไรเปลี่ยนจริง
# เพื่อไม่ต้องพึ่ง COM property ที่พิสูจน์แล้วว่าเชื่อไม่ได้กับเคสนี้ (Save() ก็แค่ flush memory ลงดิสก์เหมือน
# Ctrl+S เป๊ะ ไม่มีความเสี่ยงข้อมูลหาย)
#
# V29.108 FIX: Find-OrOpenWorkbook เดิม (ตอนไม่มี Excel รันอยู่เลย) สร้าง Excel session ใหม่ด้วย
# `New-Object -ComObject Excel.Application` ตรงๆ — operator รายงานว่าไฟล์ที่ bridge เปิดให้อัตโนมัติแบบนี้
# ทุกช่องสูตร PI Datalink ขึ้น #NAME? ทั้งหมด วินิจฉัยสดกับ operator บนเครื่องจริงตัดทฤษฎีอื่นออกหมด: Force
# Full Recalculate (Ctrl+Alt+Shift+F9) ไม่ช่วย, เป็น Windows account เดียวกับที่เปิด Excel เองปกติทุกวัน —
# แต่ Ribbon ของหน้าต่างที่ bridge เปิดให้กลับไม่มีแท็บ "PI DataLink" โผล่มาเลย (ต่างจากตอนเปิดเองแบบ
# double-click ที่มีแท็บนี้เสมอบนเครื่อง/account เดียวกัน) สรุปคือ COM Add-in อย่าง PI DataLink ไม่โหลดเข้า
# Excel session ที่ถูกสร้างผ่าน `New-Object -ComObject` ตรงๆ แบบนี้ ทั้งที่ตั้งค่าให้โหลดอัตโนมัติไว้แล้วก็ตาม
# แก้โดยเปลี่ยนมาสั่งเปิด EXCEL.EXE เป็น process จริงก่อน (เหมือน double-click ไอคอน) แล้วค่อย attach ผ่าน
# GetActiveObject ทีหลัง ให้ Add-in โหลดผ่าน startup path ปกติของ Excel เอง — ดู Find-OrOpenWorkbook ด้านล่าง
#
# V29.110 FIX: Find-OrOpenWorkbook เช็คไฟล์เปิดอยู่แล้วหรือยังจาก $excel.Workbooks ของ session ตัวเองเท่านั้น
# (GetActiveObject ผูกกับ Windows session ที่ script รันอยู่ ข้าม session อื่นไม่ได้ — ดู comment V29.98
# ด้านบน) เครื่องจริงหน้างานเป็น PC shared ที่ operator หลายคน login คนละ Windows account — operator
# รายงานว่าไฟล์ที่เปิดอัตโนมัติขึ้น popup "ไฟล์เปิดอยู่แล้ว" แล้วกลายเป็น read-only เพราะ session ก่อนหน้ายัง
# มี Excel เปิดไฟล์ค้างอยู่ (คนละ session มองไม่เห็นกัน) แต่ Workbooks.Open ที่เรียกซ้ำไม่เคยตั้งค่า
# Notify (ค่า default = True) ให้ Excel แจ้งเตือนแบบ dialog แทนที่จะ fail เฉยๆ แก้โดยเพิ่ม
# Test-FileLockedByOtherSession เช็คไฟล์ ~$<ชื่อไฟล์> (lock-owner file ที่ Excel สร้างไว้ตอนมีคนเปิดไฟล์แบบ
# read/write อยู่ — เห็นได้จาก filesystem ตรงๆ ไม่ต้องพึ่ง COM) ก่อนเรียก Open ทุกครั้ง ถ้าเจอไฟล์ล็อกก็ข้าม
# การเปิดไปเลยแทนที่จะพยายามเปิดซ้ำ และเผื่อกรณี race (ล็อกเพิ่งเกิดหลังเช็คแต่ก่อน Open จริง) ก็เพิ่ม
# Notify:=$false ให้ Open โยน exception ที่ดักได้แทน dialog ที่ค้างสคริปต์ไว้

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
    return @{ status = 'ok'; file = $candidates[0]; looksLikeTemplate = (Test-FileLooksLikeMasterTemplate $candidates[0]) }
}

# V29.101 FEAT: ตรวจจับกรณีไฟล์ live ที่ผ่าน Resolve-SourceFile มา (ชื่อไฟล์ถูกต้อง ไม่ใช่ (master)) แต่
# เนื้อหาจริงข้างในเป็นสำเนา (master) แบบ byte-ต่อ-byte ที่ไม่เคยถูกแก้เลย — เกิดจากเหตุการณ์จริง
# (2026-08-22): rollover คืนก่อนหน้า SaveAs สร้างไฟล์วันใหม่สำเร็จถูกต้องแล้ว แต่มีบางอย่างภายนอกสคริปต์นี้
# (ไม่พบใน Task Scheduler ตอนตรวจสอบ) เขียนทับไฟล์นั้นด้วยสำเนา (master) เก่าอีกที ทำให้ไฟล์ชื่อเป็นวันนี้
# ถูกต้อง แต่เนื้อหาข้างในย้อนกลับไปเป็นไฟล์เปล่า — ทุก route เดิม (source-file-info/rollover/
# ensure-file-open) เช็คแค่ "ชื่อไฟล์ตรงวันนี้ไหม" ไม่เคยเช็คเนื้อหาเลย ทำให้ operator เห็น Excel เปิดไฟล์
# ขึ้นมาแต่ข้อมูลเก่า/เปล่า โดยไม่มี warning ใดๆ ทั้งฝั่ง bridge และ Web App
# เทียบ Length ก่อน (เร็ว, กรองเคสส่วนใหญ่ทิ้งได้ทันทีโดยไม่ต้องอ่านไฟล์) แล้วค่อยเทียบ hash จริงเฉพาะตอน
# Length ตรงกันเท่านั้น (ไฟล์ log sheet ขนาด ~200KB คิด hash เร็วมาก ไม่กระทบ performance ของ poll ทุก 5 นาที)
# fail-open เสมอ (คืน $false) ถ้าอ่านไฟล์ไม่ได้ (เช่นชนจังหวะ Excel/PI กำลังเขียนพอดี) — เป็นแค่ signal
# เสริมให้ operator ระวัง ไม่ควรทำให้ route หลักที่พึ่ง Resolve-SourceFile ล้มเหลวไปด้วย
function Get-FileSha256Shared($path) {
    # V29.101 FIX: Get-FileHash เปิดไฟล์เอง (ไม่ใช่ FileShare.ReadWrite) — พังจริงกับ "The process cannot
    # access the file" ทุกครั้งที่ไฟล์ log sheet เปิดค้างอยู่ใน Excel (สถานะปกติของ feature นี้เกือบตลอดเวลา
    # ที่ใช้งานจริง) ทำให้ Test-FileLooksLikeMasterTemplate ด้านล่าง fail-open เป็น $false เงียบๆ ทุกครั้งที่
    # ไฟล์เปิดอยู่ — ตรงข้ามกับตอนที่ควรจะเตือนที่สุด ใช้ Read-FileBytesShared ตัวเดิม (FileShare.ReadWrite)
    # ที่ไฟล์นี้ใช้อ่านไฟล์ที่อาจเปิดอยู่ใน Excel อยู่แล้วทุกจุด แล้วคิด hash จาก byte ในหน่วยความจำแทน
    $bytes = Read-FileBytesShared $path
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hashBytes = $sha256.ComputeHash($bytes)
        return [System.BitConverter]::ToString($hashBytes) -replace '-', ''
    } finally {
        $sha256.Dispose()
    }
}

function Test-FileLooksLikeMasterTemplate($file) {
    $master = Get-ChildItem -LiteralPath $WatchFolder -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '\(master\)' } | Select-Object -First 1
    if (-not $master) { return $false }
    if ($file.Length -ne $master.Length) { return $false }
    try {
        $fileHash = Get-FileSha256Shared $file.FullName
        $masterHash = Get-FileSha256Shared $master.FullName
        return $fileHash -eq $masterHash
    } catch {
        return $false
    }
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
    return @{ status = 'ok'; fileName = $f.Name; sizeBytes = $f.Length; lastWriteTimeUtc = $f.LastWriteTimeUtc.ToString('o'); looksLikeTemplate = $resolved.looksLikeTemplate }
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

# V29.108 FIX: ใช้เฉพาะตอน Find-OrOpenWorkbook ไม่เจอ Excel รันอยู่เลย (GetActiveObject fail) — เปิด
# EXCEL.EXE เป็น process จริงแบบเดียวกับ double-click ไอคอน แทนที่จะสร้าง Application object ตรงๆ ผ่าน
# `New-Object -ComObject` เพราะพิสูจน์แล้วว่า COM Add-in (PI DataLink) ไม่โหลดเข้า session ที่ถูกสร้างแบบหลัง
# (ดู comment header ด้านบนของไฟล์สำหรับหลักฐานการวินิจฉัย) resolve path ของ EXCEL.EXE จาก registry key
# เดียวกับที่ Windows เองใช้ resolve ชื่อโปรแกรมจาก Start/Run แล้ว poll GetActiveObject รอ process ใหม่
# ลงทะเบียนตัวเองใน ROT (ใช้เวลาสักพักหลัง Start-Process คืนค่าทันที ไม่ได้แปลว่า Excel พร้อมใช้แล้ว)
# ถ้า resolve path ไม่ได้หรือรอ timeout ให้ fallback กลับไปพฤติกรรมเดิม (สร้างตรงผ่าน COM) แทนที่จะ fail
# เฉยๆ — กันเครื่องที่ theory นี้ไม่ตรง (เช่นไม่มี key นี้ในเครื่องนั้นจริงๆ) จากที่เคยใช้งานได้อยู่แล้วพัง
function Start-ExcelProcessAndAttach {
    $excelExePath = $null
    try {
        $excelExePath = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\EXCEL.EXE' -ErrorAction Stop).'(default)'
    } catch {
        Write-Host "[ensure-file-open] หา path ของ EXCEL.EXE จาก registry ไม่เจอ — ใช้วิธีเดิม (New-Object -ComObject) แทน"
        return New-Object -ComObject Excel.Application
    }

    Start-Process -FilePath $excelExePath | Out-Null

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            return [Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')
        } catch {
            # ยังไม่ทันขึ้นทะเบียนใน ROT — ลองรอบถัดไป
        }
    }

    Write-Host "[ensure-file-open] เปิด EXCEL.EXE แล้วรอ 20 วินาทีแต่ attach ไม่สำเร็จ — ใช้วิธีเดิม (New-Object -ComObject) แทน"
    return New-Object -ComObject Excel.Application
}

# V29.110 FEAT: เช็คไฟล์ ~$<ชื่อไฟล์> ข้างไฟล์จริง — Excel สร้างไฟล์นี้ไว้เสมอตอนมีใครเปิดไฟล์แบบ read/write
# ค้างอยู่ (ไม่ว่าจะเป็น Excel session ไหน/Windows account ไหนก็ตาม) แล้วลบทิ้งตอนปิดไฟล์ปกติ — เช็คผ่าน
# filesystem ตรงๆ ด้วย Test-Path จึงเห็นได้ข้าม Windows session ต่างจาก $excel.Workbooks ที่เห็นแค่ session
# ตัวเอง ใช้แก้ปัญหา cross-session lock ใน Find-OrOpenWorkbook ด้านล่าง (ดู comment V29.110 header ด้านบนของ
# ไฟล์) เนื้อหาในไฟล์ ~$ ปกติจะเป็นชื่อผู้เปิด — พยายามอ่านมาโชว์ให้ operator เห็นด้วยแบบ best-effort เท่านั้น
# (ถ้าอ่านไม่ได้ก็ไม่เป็นไร ยังคง detect ว่าไฟล์ถูกล็อกอยู่ได้จากแค่ Test-Path)
function Test-FileLockedByOtherSession($fullPath) {
    $folder = Split-Path -Parent $fullPath
    $lockFilePath = Join-Path $folder ('~$' + (Split-Path -Leaf $fullPath))
    if (-not (Test-Path -LiteralPath $lockFilePath -PathType Leaf)) {
        return @{ locked = $false }
    }
    $ownerName = $null
    try {
        # Encoding.Default = ANSI codepage ของเครื่อง (Windows-874 ถ้าเป็น Thai locale) — Excel เขียนชื่อผู้
        # เปิดลงไฟล์ ~$ ด้วย codepage นี้ ไม่ใช่ UTF-8 ถ้าใช้ UTF8.GetString กับชื่อ Windows account ที่มี
        # อักษรไทยจะได้ mojibake แทน (best-effort เท่านั้น — อ่านผิด/อ่านไม่ได้ไม่กระทบ $lockCheck.locked หลัก)
        $bytes = Read-FileBytesShared $lockFilePath
        $raw = ([System.Text.Encoding]::Default.GetString($bytes) -replace '[\x00-\x1F]', '').Trim()
        if (-not [string]::IsNullOrWhiteSpace($raw)) { $ownerName = $raw }
    } catch { }
    return @{ locked = $true; ownerName = $ownerName }
}

# V29.97 FEAT: ใช้เฉพาะ Handle-RolloverDailyFile — ต่างจาก Find-OpenWorkbook ตรงที่ "เปิดไฟล์ให้เองถ้ายัง
# ไม่มีใครเปิดไว้" แทนที่จะแค่หาแล้วคืน $null ถ้าไม่เจอ ให้ rollover กลางดึกทำงานจบได้เองแม้ operator ยังไม่
# ได้เปิด Excel เลยก็ตาม (ต่างจาก Handle-WriteRemark ที่ยังคง requirement เดิมไว้โดยเจตนา — ดู comment
# header ด้านบนของไฟล์)
function Find-OrOpenWorkbook($fileName, $fullPath) {
    try {
        $excel = [Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')
    } catch {
        $excel = Start-ExcelProcessAndAttach
    }
    # ตั้ง Visible เสมอไม่ว่าจะ attach ของเดิมหรือสร้างใหม่ — กัน instance ที่ถูกสร้างแบบซ่อนอยู่เบื้องหลัง
    # (ทั้งจากสคริปต์นี้เองตอนไม่มี Excel รันอยู่ หรือจาก process อื่นที่เคยสร้างไว้แบบ invisible) ให้
    # operator เห็นไฟล์เปิดอยู่จริงเมื่อมาถึงเครื่อง
    $excel.Visible = $true

    foreach ($wb in $excel.Workbooks) {
        if ($wb.Name -eq $fileName) { return @{ excel = $excel; wb = $wb } }
    }

    # V29.110 FIX: เช็ค cross-session lock ก่อนเปิดเสมอ — ดู comment เหนือ Test-FileLockedByOtherSession
    $lockCheck = Test-FileLockedByOtherSession $fullPath
    if ($lockCheck.locked) {
        $ownerText = if ($lockCheck.ownerName) { " โดย $($lockCheck.ownerName)" } else { '' }
        return @{ excel = $excel; wb = $null; locked = $true;
            errorMessage = "ไฟล์นี้กำลังถูกเปิดอยู่แล้วโดย Excel session อื่นบนเครื่องเดียวกัน (คนละ Windows account)$ownerText — ระบบจะลองใหม่ในรอบถัดไปโดยอัตโนมัติ" }
    }

    $originalDisplayAlerts = $excel.DisplayAlerts
    $excel.DisplayAlerts = $false
    try {
        # UpdateLinks=0: ไม่ต้อง prompt/auto-refresh สูตร PI Datalink ตอนเปิดไฟล์ (เลี่ยง dialog ที่จะค้าง
        # สคริปต์ไว้รอ operator กดตอบ ซึ่งไม่มีใครอยู่หน้าเครื่องตอนกลางดึก) — ReadOnly=$false เพราะต้อง
        # SaveAs/Save ต่อทันทีหลังเปิด — Notify=$false (V29.110, ตำแหน่งสุดท้าย) กันเผื่อ race ที่ไฟล์ถูกล็อก
        # เพิ่มหลัง Test-FileLockedByOtherSession เช็คผ่านไปแล้วแต่ก่อนเรียก Open จริง ให้ throw exception ที่
        # ดักได้แทนที่จะเป็น native "already open" dialog ที่ค้างสคริปต์ไว้รอ operator กดตอบ
        $wb = $excel.Workbooks.Open($fullPath, 0, $false, [Type]::Missing, [Type]::Missing, [Type]::Missing, [Type]::Missing, [Type]::Missing, [Type]::Missing, [Type]::Missing, $false)
        return @{ excel = $excel; wb = $wb }
    } catch {
        return @{ excel = $excel; wb = $null; errorMessage = $_.Exception.Message }
    } finally {
        $excel.DisplayAlerts = $originalDisplayAlerts
    }
}

# V29.100 FIX: ใช้เฉพาะใน Handle-RolloverDailyFile — ลบ comment (Resolution Remark) ที่แอปเคยเขียนไว้เอง
# ทั้งหมดในไฟล์ตอน rollover ข้ามวัน ก่อน fix นี้ SaveAs เปลี่ยนแค่ชื่อไฟล์กับวันที่ใน W1 แต่ตัว comment ยัง
# ผูกติดกับ cell เดิมเหมือนเดิม เพราะ layout ของ log sheet ใช้แถว/คอลัมน์เดิมซ้ำทุกวัน (มีแค่สูตร PI
# Datalink ที่ดึงค่าของวันใหม่มาแทนค่าเดิม) ทำให้ Resolution Remark ของเมื่อวานค้างโผล่อยู่บนแถวเดียวกันของ
# วันนี้ทั้งที่ค่า reading เป็นของวันใหม่แล้ว (ตามที่ operator แจ้งปัญหานี้เข้ามา) — ลบเฉพาะ comment ที่
# Author ตรงกับ $AppCommentAuthor เท่านั้น (เหมือนตรรกะ conflict-detection ใน Handle-WriteRemark) ไม่แตะ
# comment ที่ operator พิมพ์เองใน Excel เด็ดขาด ต้อง snapshot ด้วย @() ก่อน foreach เพราะลบสมาชิกออกจาก COM
# collection ระหว่างวนอยู่จะทำให้ index เลื่อนและข้ามบางตัวไป
function Clear-AppComments($wb) {
    foreach ($sheet in $wb.Sheets) {
        $comments = @($sheet.Comments)
        foreach ($comment in $comments) {
            if ($comment.Author -eq $AppCommentAuthor) {
                $comment.Delete()
            }
        }
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
        # V29.101 FEAT: ปกติ "ตรงกับวันนี้แล้ว" คือ no-op เงียบๆ — แต่ถ้าเนื้อหาจริงเหมือนไฟล์ (master) เป๊ะ
        # แปลว่ามีบางอย่างเขียนทับไฟล์ที่ rollover ตั้งชื่อไว้ถูกต้องแล้วด้วยของเปล่า ต้องแจ้ง operator แทนที่
        # จะปล่อยผ่านแบบเดิม (ดู Test-FileLooksLikeMasterTemplate ด้านบนสำหรับที่มา)
        if ($resolved.looksLikeTemplate) {
            return @{ status = 'stale-template'; fileName = $file.Name; message = "ไฟล์ '$($file.Name)' ชื่อเป็นวันปัจจุบันแล้ว แต่เนื้อหาข้างในเหมือนไฟล์ (master) เป๊ะ (ไม่เคยถูกแก้เลย) — น่าจะมีอะไรเขียนทับไฟล์นี้หลัง rollover สำเร็จ กรุณาตรวจสอบเนื้อหาในไฟล์เอง" }
        }
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
        # V29.110 FIX: แยกเคส "ไฟล์ถูก session อื่นล็อกอยู่" ออกจาก open-failed ทั่วไป — ไม่ใช่ error จริง
        # แค่ต้องรอให้ session นั้นปิดไฟล์ก่อน จะลองใหม่เองในรอบ poll ถัดไป
        if ($opened.locked) {
            return @{ status = 'locked-by-other-session'; fileName = $file.Name; message = $opened.errorMessage }
        }
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

    # V29.100 FIX: ลบ comment ของแอปเมื่อวานทิ้งตอนนี้ (หลัง rename แต่ก่อน save) — ไม่ fatal ถ้าพลาด เพราะ
    # ส่วนสำคัญ (rename + วันที่ W1) สำเร็จไปแล้ว แค่แจ้งเตือนกลับไปให้ operator ไปลบเองในไฟล์แทน
    $commentClearWarning = $null
    try {
        Clear-AppComments $wb
    } catch {
        $commentClearWarning = "ลบ comment (Resolution Remark) ของเมื่อวานไม่สำเร็จ: $($_.Exception.Message) — comment เก่าจะยังค้างอยู่บน cell เดิมของวันนี้ กรุณาตรวจสอบ/ลบเองในไฟล์"
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
        $removeWarning = "ลบไฟล์ชื่อเดิม ($($file.Name)) ไม่สำเร็จ กรุณาลบเองด้วยมือ ไม่งั้นระบบ auto-import จะ error รอบถัดไป (พบไฟล์มากกว่า 1 ไฟล์)"
        $combinedWarning = if ($commentClearWarning) { "$removeWarning; $commentClearWarning" } else { $removeWarning }
        return @{ status = 'ok'; oldFileName = $file.Name; newFileName = $newFileName; warning = $combinedWarning }
    }

    if ($commentClearWarning) {
        return @{ status = 'ok'; oldFileName = $file.Name; newFileName = $newFileName; warning = $commentClearWarning }
    }
    return @{ status = 'ok'; oldFileName = $file.Name; newFileName = $newFileName }
}

# V29.99 FEAT: แยก concern "ต้องเปิด Excel ไหม" ออกจาก "ต้องเปลี่ยนชื่อไฟล์ไหม" ของ Handle-RolloverDailyFile
# ด้านบน — Handle-RolloverDailyFile เช็คแค่วันที่ในชื่อไฟล์ ถ้าตรงกับวันนี้อยู่แล้วจะ return
# 'already-current' ทันทีโดยไม่เช็คเลยว่า Excel ยังเปิดไฟล์ค้างอยู่จริงไหม — เกิดปัญหาจริงตอนเปลี่ยนกะ
# (~ทุก 12 ชม.): operator คนก่อน logout ทำให้ Excel/bridge session ของเขาปิดไปด้วย operator คนใหม่
# login มาเปิด Web App แต่วันที่ในชื่อไฟล์ยังเป็นวันเดียวกัน (ยังไม่ข้ามเที่ยงคืน) ทำให้ Excel ไม่ถูกเปิด
# ให้เลย ฟังก์ชันนี้ไม่สนใจวันที่เลย ใช้ Find-OrOpenWorkbook ตัวเดิม (V29.97) เช็คแค่ว่าไฟล์เปิดอยู่ไหม
# ถ้าไม่เปิดก็เปิดให้เฉยๆ ไม่ rename/ไม่เขียน W1
function Handle-EnsureFileOpen {
    $resolved = Resolve-SourceFile
    if ($resolved.status -ne 'ok') { return $resolved }
    $file = $resolved.file

    $opened = Find-OrOpenWorkbook $file.Name $file.FullName
    if (-not $opened.wb) {
        # V29.110 FIX: ดู comment เดียวกันใน Handle-RolloverDailyFile ด้านบน
        if ($opened.locked) {
            return @{ status = 'locked-by-other-session'; fileName = $file.Name; message = $opened.errorMessage }
        }
        return @{ status = 'open-failed'; message = "เปิดไฟล์ '$($file.Name)' ใน Excel อัตโนมัติไม่สำเร็จ: $($opened.errorMessage)" }
    }
    # V29.101 FEAT: แนบ warning เดียวกับ Handle-RolloverDailyFile ถ้าไฟล์ที่เพิ่งเปิดให้ดูเหมือนสำเนา
    # (master) เปล่าๆ — เคสนี้สำคัญกว่าปกติเพราะ ensureFileOpen ถูกเรียกตอน APP.init() ทุกครั้งที่เปิดหน้าเว็บ
    # เป็นจุดแรกสุดที่จะจับความผิดปกตินี้ได้ก่อน operator เห็นไฟล์เปล่าใน Excel เอง
    if ($resolved.looksLikeTemplate) {
        return @{ status = 'ok'; fileName = $file.Name; warning = "ไฟล์ '$($file.Name)' เปิดสำเร็จ แต่เนื้อหาข้างในเหมือนไฟล์ (master) เป๊ะ (ไม่เคยถูกแก้เลย) — น่าจะมีอะไรเขียนทับไฟล์นี้หลัง rollover สำเร็จ กรุณาตรวจสอบเนื้อหาในไฟล์เอง" }
    }
    return @{ status = 'ok'; fileName = $file.Name }
}

# V29.102 FEAT: สั่ง Excel save ไฟล์ log sheet ที่เปิดอยู่ให้เอง — ดู comment header ด้านบนของไฟล์สำหรับ
# ที่มา ใช้ Find-OpenWorkbook ตัวเดิม (ไม่ auto-open เหมือน Find-OrOpenWorkbook เพราะถ้ายังไม่มีใครเปิดไฟล์
# เลยก็ไม่มีอะไรให้ save — /ensure-file-open จัดการเปิดไฟล์ให้อยู่แล้วจากอีกจุดใน poll cycle เดียวกันฝั่ง
# Web App)
# V29.107 FIX: เดิมเช็ค $wb.Saved ก่อนแล้วข้าม .Save() ถ้าเป็น $true (สมมติว่า Excel จะ set เป็น $false เอง
# ตอน PI Datalink refresh) — พิสูจน์แล้วว่าเชื่อไม่ได้ (ดู comment header ด้านบนของไฟล์) เรียก .Save() แบบ
# ไม่มีเงื่อนไขทุกครั้งแทน
function Handle-AutosaveSourceFile {
    $resolved = Resolve-SourceFile
    if ($resolved.status -ne 'ok') { return $resolved }
    $file = $resolved.file

    $excel, $wb = Find-OpenWorkbook $file.Name
    if (-not $excel -or -not $wb) {
        return @{ status = 'no-file-open'; message = "ไม่พบไฟล์ '$($file.Name)' เปิดอยู่ใน Excel" }
    }

    try {
        $wb.Save()
        return @{ status = 'ok'; saved = $true }
    } catch {
        if (Test-IsSharingViolation $_.Exception) {
            return @{ status = 'file-locked'; message = 'ไฟล์กำลังถูกเขียนอยู่ (Excel/PI กำลังรีเฟรชข้อมูล) กรุณาลองใหม่ในรอบถัดไป' }
        }
        return @{ status = 'error'; message = "บันทึกไฟล์ไม่ได้: $($_.Exception.Message)" }
    }
}

# V29.106 FIX: เดิม $listener.Start() ไม่มี try/catch ห่อเลย — เจอ port ชนกัน (bridge อีกตัวรันอยู่แล้ว เช่น
# instance ที่ auto-start ผ่าน Task Scheduler ตอน login) จะ throw raw .NET exception ยาวๆ เป็นภาษาอังกฤษ ทำให้
# สคริปต์จบทันที แล้ว start-bridge.bat ไปโชว์ "Bridge หยุดทำงานแล้ว - กด key ใดก็ได้เพื่อปิดหน้าต่างนี้" ต่อ
# ตามปกติ — operator เจอจริงแล้วงงว่าทำไมหน้าต่างดำไม่ปิดไปเอง (เข้าใจว่าเป็น error ร้ายแรง ทั้งที่จริงๆ ไม่มี
# ผลกระทบอะไรเลย เพราะ instance เดิมยังทำงานปกติ) เปลี่ยนเป็นจับ exception แล้วโชว์ข้อความไทยที่บอกตรงๆ ว่า
# ไม่เป็นไร แทน — ยังคงให้สคริปต์จบแบบเดิม (ไม่เปลี่ยนพฤติกรรม "กด key ใดก็ได้เพื่อปิด" ของ start-bridge.bat
# เพราะเป็น safety net ที่ตั้งใจไว้สำหรับ error จริงๆ กรณีอื่นด้วย)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
    $listener.Start()
} catch {
    Write-Host ""
    Write-Host "Bridge อีกตัวกำลังทำงานอยู่แล้วบนเครื่องนี้ (port $Port ถูกใช้อยู่)"
    Write-Host "ปิดหน้าต่างนี้ได้เลย ไม่มีผลกระทบอะไร — ระบบใช้ตัวที่รันอยู่ก่อนแล้วต่อไปได้ตามปกติ"
    exit 1
}
Write-Host "Excel Bridge กำลังทำงานที่ http://localhost:$Port/ (กด Ctrl+C เพื่อหยุด)"

# V29.98 FEAT: เช็ค rollover ทันทีตอน bridge เริ่มทำงาน — ไม่ต้องรอ Web App เปิด/poll ทุก 5 นาทีอีกแล้ว
# เครื่องจริงหน้างานเป็น PC shared ที่ operator หลายคน login/logout ด้วยบัญชีตัวเองจริง (ไม่ใช่บัญชีเดียว
# ค้างไว้ 24 ชม.) จึงเลือกวิธีนี้แทนบัญชีเฉพาะ + Task Scheduler ยิงตรงเวลา เพราะ COM GetActiveObject ผูกกับ
# Windows session ที่ script รันอยู่เท่านั้น (ข้าม session อื่นไม่ได้) และ port 5175 มีได้แค่ 1 process —
# ถ้าใช้บัญชีเฉพาะครอง port ไว้ตลอด operator ที่ login บัญชีตัวเองแล้วเปิด Excel ของตัวเองจะโดน bridge
# มองไม่เห็น (คนละ session) ทำให้ write-remark พังทันที วิธีนี้แก้ปัญหาได้เพราะ operator คนแรกที่ login
# เข้ามาแล้วเปิด bridge เอง (Task Scheduler "At log on" ของตัวเอง หรือกด HYPERLINK start-bridge.bat) จะ
# trigger rollover ด้วย Excel session ของตัวเอง ไม่มีปัญหาข้าม session เลย
try {
    $startupRollover = Handle-RolloverDailyFile
    if ($startupRollover.status -eq 'ok') {
        Write-Host "[auto-rollover] เปลี่ยนไฟล์ log sheet เป็นวันใหม่แล้วตอนเริ่ม bridge: $($startupRollover.oldFileName) -> $($startupRollover.newFileName)"
    } elseif ($startupRollover.status -eq 'already-current') {
        # V29.99 FEAT: rollover ไม่ต้องทำ (วันที่ตรงกับวันนี้อยู่แล้ว) แต่ยังต้องเช็คแยกว่า Excel เปิดไฟล์
        # อยู่จริงไหม — เคสเปลี่ยนกะกลางวัน (bridge ของ operator คนก่อนถูกปิดไปตอน logout, operator คนใหม่
        # login มา bridge เริ่มใหม่แต่ยังไม่ข้ามเที่ยงคืน) ถ้าไม่เช็คแยกจุดนี้ Excel จะไม่ถูกเปิดให้เลย
        try {
            $startupEnsureOpen = Handle-EnsureFileOpen
            if ($startupEnsureOpen.status -ne 'ok') {
                Write-Host "[ensure-file-open] เปิดไฟล์ log sheet ตอนเริ่ม bridge ไม่สำเร็จ: $($startupEnsureOpen.status) $($startupEnsureOpen.message)"
            }
        } catch {
            Write-Host "[ensure-file-open] เปิดไฟล์ log sheet ตอนเริ่ม bridge เกิด error: $($_.Exception.Message)"
        }
    } else {
        Write-Host "[auto-rollover] เช็ค rollover ตอนเริ่ม bridge ไม่สำเร็จ: $($startupRollover.status) $($startupRollover.message)"
    }
} catch {
    Write-Host "[auto-rollover] เช็ค rollover ตอนเริ่ม bridge เกิด error: $($_.Exception.Message)"
}

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

            # V29.99 FEAT: เช็ค/เปิดไฟล์ log sheet ให้เฉยๆ ไม่สนวันที่ — ดู Handle-EnsureFileOpen ด้านบนสำหรับ
            # เหตุผลที่แยก route นี้ออกจาก /rollover-daily-file
            if ($request.Url.AbsolutePath -eq '/ensure-file-open' -and $request.HttpMethod -eq 'POST') {
                Send-JsonResponse $response 200 (Handle-EnsureFileOpen)
                continue
            }

            # V29.102 FEAT (แก้เพิ่ม V29.107): สั่ง Excel save ไฟล์ log sheet ที่เปิดอยู่ให้เองแบบไม่มี
            # เงื่อนไขทุกรอบ poll — ดู Handle-AutosaveSourceFile ด้านบนสำหรับที่มา (แก้ปัญหาต้องกด Ctrl+S
            # เองก่อนข้อมูลจะ sync)
            if ($request.Url.AbsolutePath -eq '/autosave-source-file' -and $request.HttpMethod -eq 'POST') {
                Send-JsonResponse $response 200 (Handle-AutosaveSourceFile)
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
