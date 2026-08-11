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

$Port = 5175
$AllowedOrigins = @(
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://monitor-log-sheet-boardman.supasiao.workers.dev'
)
$AppCommentAuthor = 'Plant Log Analyzer (Web App)'

function Write-CorsHeaders($response, $origin) {
    if ($origin -and ($AllowedOrigins -contains $origin)) {
        $response.Headers.Add('Access-Control-Allow-Origin', $origin)
        $response.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        $response.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')
        return $true
    }
    return $false
}

function Send-JsonResponse($response, $statusCode, $body) {
    $json = $body | ConvertTo-Json -Compress -Depth 5
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.StatusCode = $statusCode
    $response.ContentType = 'application/json; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
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

            Send-JsonResponse $response 404 @{ status = 'error'; message = 'not found' }
        } catch {
            try { Send-JsonResponse $response 500 @{ status = 'error'; message = $_.Exception.Message } } catch {}
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
