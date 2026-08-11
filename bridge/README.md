# Excel Local Bridge

ตัวกลางเล็กๆ ที่รันบนเครื่อง operator เพื่อให้ **Excel ตัวจริง** เขียน Resolution Remark กลับเข้าไฟล์ log sheet เป็น native cell comment ให้ Web App โดยอัตโนมัติ

## ทำไมต้องมีสคริปต์นี้

Web App รันในเบราว์เซอร์ ซึ่งไม่สามารถสั่ง Excel เขียนไฟล์ได้โดยตรง (browser sandbox) ตอนแรกแอปพยายามใช้ไลบรารี JavaScript (SheetJS, exceljs) เขียนไฟล์ .xls/.xlsm กลับเอง แต่พบว่า **ไม่มีไลบรารีฟรีตัวไหนเขียนไฟล์ log sheet จริงของโรงงานได้ครบถ้วนปลอดภัย** — ไฟล์เหล่านี้มีสูตรเชื่อมต่อ OSIsoft PI System แบบ live (ผ่าน PI Datalink add-in) ซึ่งไลบรารีเหล่านั้นทำให้ Excel ต้องคำนวณสูตรใหม่ทั้งหมดทุกครั้งที่เปิดไฟล์ที่ export ออกมา (เพราะเขียน `calcChain.xml` ไม่ถูกต้อง) กลายเป็น `#NAME?` ทุกช่อง ทั้งที่ค่าจริงถูกต้องอยู่แล้ว — รายละเอียดการทดสอบและหลักฐานทั้งหมดอยู่ใน `context.md` ของโปรเจกต์

มีแค่ Excel ตัวจริงเท่านั้นที่เขียนไฟล์ตัวเองได้ถูกต้อง 100% — bridge นี้จึงทำหน้าที่รับคำสั่งจาก Web App แล้วส่งต่อให้ Excel ที่เปิดไฟล์อยู่แล้วบนเครื่องเดียวกันเขียนแทน

## วิธีใช้งาน (ทุกครั้งที่เริ่มกะ)

1. เปิดไฟล์ log sheet ต้นฉบับ (`.xls`/`.xlsm`) ด้วย Excel ตามปกติ แล้ว **เปิดค้างไว้**
2. Double-click `excel-bridge.ps1` (หรือรันผ่าน PowerShell — ดู "รันด้วยมือ" ด้านล่าง)
3. จะเห็นหน้าต่างสีดำขึ้นข้อความ `Excel Bridge กำลังทำงานที่ http://localhost:5175/` — ปล่อยหน้าต่างนี้รันค้างไว้ตลอดที่ใช้งาน Web App
4. ใช้งาน Web App ตามปกติ — ทุกครั้งที่บันทึก Resolution Remark ระบบจะ sync กลับ Excel ที่เปิดอยู่ให้อัตโนมัติ
5. เลิกใช้งานแล้วปิดหน้าต่าง bridge ได้ (กด Ctrl+C หรือปิดหน้าต่างเลย)

## รันด้วยมือผ่าน PowerShell

Double-click ไฟล์ `.ps1` อาจถูก Windows บล็อกด้วย Execution Policy default — ถ้าเจอ ให้เปิด PowerShell แล้วรัน:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "bridge\excel-bridge.ps1"
```

## ตั้งให้รันอัตโนมัติทุกครั้งที่ล็อกอินเข้าเครื่อง (แนะนำ)

ใช้ Windows Task Scheduler ให้รันสคริปต์นี้ตอน login โดยไม่ต้อง double-click เอง วิธีตั้งต่างกันเล็กน้อยตามลักษณะเครื่อง:

**เครื่อง single-user** (มีคนเดียวใช้ login account เดียวตลอด เช่น PC บ้าน):

1. เปิด **Task Scheduler** → Create Task
2. **General**: ตั้งชื่อ เช่น `Plant Log Analyzer - Excel Bridge`, เลือก "Run only when user is logged on"
3. **Triggers** → New → "At log on" (เลือกเฉพาะ user account ของตัวเอง)
4. **Actions** → New → Program/script: `powershell.exe`, Add arguments: `-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\path\to\bridge\excel-bridge.ps1"` (แก้ path ให้ตรงกับตำแหน่งจริงบนเครื่อง)
5. บันทึก แล้วทดสอบด้วยการ log off/log on ใหม่ หรือคลิกขวา task ที่สร้าง → Run

**เครื่อง shared ที่ operator หลายคน login คนละ account** (เช่น PC หน้างานที่ผลัดกันใช้):

- **ห้ามเก็บ repo ไว้ใต้ profile ส่วนตัว** (`C:\Users\<username>\...`) เพราะ account อื่นจะอ่าน/รันไฟล์ไม่ได้ตามสิทธิ์ NTFS ปกติ — ต้องย้ายทั้ง repo ไปไว้ที่ drive/โฟลเดอร์กลางที่ไม่ผูกกับ user คนใดคนหนึ่ง (เช่น `D:\Monitor log sheet boardman` ถ้ามี local fixed drive แยกที่ไม่ใช่ profile drive) แล้วให้สิทธิ์ `BUILTIN\Users` อ่าน+รันได้ เช่น `icacls "D:\path" /grant "Users:(OI)(CI)RX" /T` (หลีกเลี่ยง network/mapped drive เพราะ drive letter มักผูกกับ login script ของแต่ละ account เหมือนปัญหาเดิม)
- **Trigger แบบ "At log on" → Any user (group principal) ต้องใช้สิทธิ์ local Administrator เสมอ** — ถ้า account ที่ตั้งค่าไม่มีสิทธิ์ Admin (`Register-ScheduledTask` กับ `-GroupId "BUILTIN\Users"` จะขึ้น `Access is denied` ทันที) ให้ใช้แนวทางผสมแทน:
  1. ตั้ง Task Scheduler แบบ **"Specific user"** ให้เฉพาะ account ของตัวเอง (ไม่ต้องใช้สิทธิ์ Admin เพราะเป็นการตั้งให้ตัวเองคนเดียว):
     ```powershell
     $me = "$env:USERDOMAIN\$env:USERNAME"
     $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "D:\path\to\bridge\excel-bridge.ps1"'
     $trigger = New-ScheduledTaskTrigger -AtLogOn -User $me
     $principal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited
     Register-ScheduledTask -TaskName "Plant Log Analyzer - Excel Bridge" -Action $action -Trigger $trigger -Principal $principal
     ```
  2. Operator คนอื่นที่ไม่มี task auto-start ให้เปิด bridge เองผ่านปุ่ม **Hyperlink ใน Excel** แทน (ดูหัวข้อถัดไป) — ง่ายกว่าเปิด PowerShell พิมพ์คำสั่งเอง
  - ถ้ามีสิทธิ์ Admin จริง (หรือขอ IT ช่วยรันให้) ก็ยังใช้ group-principal แบบ Any user ได้ตามปกติ ใช้คำสั่งเดิม (`-GroupId "BUILTIN\Users"`) — ครอบคลุมทุก operator โดยไม่ต้องตั้งทีละคน

## ปุ่มเปิด Bridge จาก Excel (สำหรับ operator ที่ไม่ได้ตั้ง Task Scheduler)

สำหรับ operator ที่ไม่มี Task Scheduler auto-start (เช่นไม่ใช่ account ที่ตั้งไว้ในเครื่อง shared) มีไฟล์ `bridge/start-bridge.bat` เป็นตัวกลางเรียก `excel-bridge.ps1` ให้ — ต่างจาก `.ps1` ตรงที่ Windows เปิด `.bat` ผ่าน HYPERLINK/double-click แล้ว **รันทันที** ได้เลย (ไม่ต้องเปิด PowerShell เอง)

แปะสูตรนี้ในเซลล์ของไฟล์ log sheet ที่ operator เปิดใช้งานประจำ (แก้ path ให้ตรงกับตำแหน่งจริงบนเครื่อง):

```excel
=HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", "▶ เปิด Excel Bridge (กดตอนเริ่มกะ)")
```

กดครั้งเดียวตอนเริ่มกะ จะเห็นหน้าต่างดำขึ้นข้อความ `Excel Bridge กำลังทำงานที่ http://localhost:5175/` เหมือนรันผ่าน PowerShell ตรงๆ — ปล่อยหน้าต่างนี้ค้างไว้ตลอดกะ

**หมายเหตุ:** ครั้งแรกที่กด Excel อาจขึ้น dialog เตือนความปลอดภัยเรื่องเปิดไฟล์ในเครื่อง (ปกติของ HYPERLINK ไปยังไฟล์ local) กด Allow/Yes ได้ตามปกติ

## ตั้งค่า $AllowedOrigins

`excel-bridge.ps1` เช็ค request's `Origin` header กับ allow-list ก่อนประมวลผลทุกครั้ง (กันเว็บอื่นแอบยิง request มาที่ bridge) — ตอนนี้ครอบคลุมทั้ง dev (`http://localhost:5173`) และ production (`https://monitor-log-sheet-boardman.supasiao.workers.dev`) แล้ว ถ้าเปลี่ยนโดเมน deploy ในอนาคต ต้องมาแก้ `$AllowedOrigins` ในสคริปต์นี้ให้ตรงด้วย ไม่งั้น bridge จะปฏิเสธ request จากเว็บที่ deploy จริง

## Troubleshooting

| อาการ | สาเหตุที่เป็นไปได้ |
|---|---|
| Web App ขึ้น "ไม่พบ Local Bridge" | ยังไม่ได้เปิดสคริปต์นี้ หรือหน้าต่างถูกปิดไปแล้ว — เปิดใหม่ |
| Web App ขึ้น "ไม่พบไฟล์นี้เปิดอยู่ใน Excel" | ยังไม่ได้เปิดไฟล์ log sheet ต้นฉบับใน Excel ค้างไว้ หรือชื่อไฟล์ไม่ตรงกับที่ import เข้า Web App |
| ขึ้น "พบ Comment ที่มีคนพิมพ์ไว้แล้ว" | มีคนเคยพิมพ์ comment เองตรงๆ ใน Excel cell นั้น ระบบไม่เขียนทับให้อัตโนมัติ ต้องแก้ในไฟล์เอง |
| หน้าต่าง bridge ปิดตัวทันทีตอนเปิด | เปิด PowerShell รันแบบ manual (ดูข้างบน) เพื่อดู error message ที่แท้จริง — สาเหตุที่พบบ่อยคือ port 5175 ถูกโปรแกรมอื่นใช้อยู่แล้ว |
| กด Hyperlink ใน Excel แล้วขึ้นเตือนความปลอดภัย | ปกติของการเปิดไฟล์ local (`.bat`) ผ่าน hyperlink — กด Allow/Yes ได้ตามปกติ |
| `Register-ScheduledTask` ขึ้น `Access is denied` | ปกติถ้าใช้ `-GroupId` (trigger แบบ Any user) กับ account ที่ไม่มีสิทธิ์ local Administrator — Task Scheduler บังคับต้องใช้สิทธิ์ Admin เสมอสำหรับ group principal ใช้ `-UserId` แบบ Specific user แทนถ้าไม่มีสิทธิ์ Admin (ดูหัวข้อด้านบน) |
