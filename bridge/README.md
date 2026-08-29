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

## เปิด Bridge จากปุ่มในหน้า Web App (V29.103 — Custom Protocol Handler)

Web App มีปุ่ม **"เปิด Excel Bridge"** อยู่ข้าง sync status indicator (มุมล่างซ้าย, โผล่เฉพาะตอนสถานะเป็น "LOCAL MODE" สีเหลือง) ให้กดเปิด Bridge ได้โดยไม่ต้องสลับไปที่ไฟล์ Excel ก่อน

**ทำไมต้องตั้งค่าเพิ่ม:** เว็บเบราว์เซอร์ (JS/HTML ธรรมดา) ไม่มีสิทธิ์สั่งเปิดไฟล์ `.bat`/`.exe` ในเครื่องได้เลยตามหลักความปลอดภัยของ browser sandbox (คนละกรณีกับ HYPERLINK ใน Excel ที่ Excel มีสิทธิ์เรียกโปรแกรมภายนอกได้) ปุ่มนี้จึงทำงานผ่าน **Custom URI Protocol** (`plantlogbridge://`) แทน — ต้องลงทะเบียน protocol นี้ในเครื่อง (และในแต่ละ Windows account ถ้าเป็นเครื่อง shared) ก่อนใช้งานครั้งแรก

**วิธีตั้งค่า (ทำครั้งเดียวต่อเครื่อง/ต่อ account):**

1. เปิดโฟลเดอร์ `bridge` ในเครื่อง แล้ว double-click `register-protocol.reg`
2. ยืนยัน dialog ของ Registry Editor ("Are you sure you want to continue?") → Yes — **ไม่ต้องใช้สิทธิ์ Administrator** (ลงทะเบียนไว้ที่ `HKEY_CURRENT_USER` ผูกกับ account ที่ login อยู่เท่านั้น)
3. กลับไปที่หน้า Web App แล้วลองกดปุ่ม "เปิด Excel Bridge" — เบราว์เซอร์จะเด้ง dialog ถามยืนยันว่าจะเปิดแอปภายนอกไหม (ครั้งแรกที่กด) ติ๊ก **"Always allow..."** ไว้ด้วยจะได้ไม่ต้องเจอ dialog นี้ทุกครั้งที่กด แล้วกด Open
4. ต้องเห็นหน้าต่างดำ `Excel Bridge กำลังทำงานที่ http://localhost:5175/` เปิดขึ้นมาเหมือน double-click `start-bridge.bat` เอง

**ยกเลิกการตั้งค่า:** double-click `unregister-protocol.reg` (ลบ registry key ทิ้ง — ไม่ต้อง Administrator เช่นกัน)

**ข้อควรรู้:** path ของ `start-bridge.bat` ถูก hardcode ไว้ใน `register-protocol.reg` (เหมือน `$WatchFolder`/`$ArchiveFolder`/`$SharedDbPath` ใน `excel-bridge.ps1`) — ถ้าย้าย repo ไปที่อื่นบนเครื่อง ต้องแก้ path ในไฟล์นี้แล้ว import ใหม่ด้วย

## ตั้งค่า $AllowedOrigins

`excel-bridge.ps1` เช็ค request's `Origin` header กับ allow-list ก่อนประมวลผลทุกครั้ง (กันเว็บอื่นแอบยิง request มาที่ bridge) — ตอนนี้ครอบคลุมทั้ง dev (`http://localhost:5173`) และ production (`https://monitor-log-sheet-boardman.supasiao.workers.dev`) แล้ว ถ้าเปลี่ยนโดเมน deploy ในอนาคต ต้องมาแก้ `$AllowedOrigins` ในสคริปต์นี้ให้ตรงด้วย ไม่งั้น bridge จะปฏิเสธ request จากเว็บที่ deploy จริง

## ตั้งค่า $WatchFolder / $ArchiveFolder (V29.78 — Auto-Import/Auto-Archive)

`excel-bridge.ps1` มีอีก 2 path คงที่ที่ตั้งไว้ในสคริปต์ (ไม่รับ path จากฝั่งเบราว์เซอร์เลย เพื่อกัน endpoint ถูกใช้อ่าน/เขียนไฟล์นอกเหนือจากที่ตั้งใจไว้):

- **`$WatchFolder`** — โฟลเดอร์ที่เก็บไฟล์ log sheet ต้นฉบับที่ PI Datalink เขียนสดอัตโนมัติ (ค่า default: `D:\PTA COMMONT WORK\Log sheet Digital`) Bridge จะหาไฟล์ที่ไม่มีคำว่า `(master)` ในชื่อเป็นไฟล์เป้าหมายเสมอ — ถ้าเจอมากกว่า 1 ไฟล์ที่ไม่ใช่ master จะไม่เดา และตอบ error กลับแทน (ป้องกันดึง/archive ไฟล์ผิด)
- **`$ArchiveFolder`** — โฟลเดอร์ที่เก็บสำเนา (safety copy) ของไฟล์ log sheet เมื่อ Web App ตรวจพบว่าข้อมูลวันนั้นครบ 4 รอบเวลาแล้ว (ค่า default ตั้งแต่ V29.95: `D:\PTA COMMONT WORK\Log sheet Digital` — โฟลเดอร์เดียวกับ `$WatchFolder` โดยตั้งใจ archive จะไปอยู่ใต้ subfolder รายเดือนเท่านั้น ไม่ปนกับไฟล์ live ที่ root) — ตั้งแต่ V29.80 ไฟล์จะถูกเก็บใต้โฟลเดอร์ย่อยตามเดือน/ปีปัจจุบันของเครื่องเสมอ (รูปแบบ `Mmm yy` แบบอังกฤษ/ค.ศ. เช่น `$ArchiveFolder\Aug 26\`) ไม่ใช่ root ตรงๆ — อิงปฏิทินของเครื่อง ณ วันที่ archive จริง ไม่ใช่วันที่ในชื่อไฟล์ log sheet

แก้ 2 ตัวแปรนี้ในสคริปต์ถ้าย้ายโฟลเดอร์บนเครื่องจริง

### Route ใหม่ (auto-import/auto-archive)

| Route | Method | ใช้ทำอะไร |
|---|---|---|
| `/source-file-info` | GET | คืนชื่อ/ขนาด/เวลาแก้ไขล่าสุดของไฟล์ log sheet ปัจจุบันใน `$WatchFolder` — Web App poll route นี้ทุก 5 นาทีเพื่อเช็คว่าไฟล์เปลี่ยนไปหรือยัง |
| `/source-file` | GET | คืนเนื้อไฟล์ดิบ (raw binary ตอนสำเร็จ, JSON envelope ตอน error/file-locked) — Web App เอาไป import เหมือนลาก-วางไฟล์เอง |
| `/archive-source-file` | POST | คัดลอกไฟล์ต้นฉบับไปเก็บที่ `$ArchiveFolder` — Web App เรียกอัตโนมัติเมื่อเช็คแล้วว่าข้อมูลวันนั้นครบ 4 เวลา (03:00/09:00/15:00/21:00) |
| `/save-shared-db` | POST | รับ JSON snapshot ทั้งหมด (Tags/Records/MasterTags/UserCountermeasures) จาก browser แล้วเขียนทับ `$SharedDbPath` แบบ atomic — เรียกทุกครั้งที่มีการแก้ไขข้อมูลใน Web App (fire-and-forget, ดูหัวข้อ `$SharedDbPath` ด้านล่าง) |
| `/load-shared-db` | GET | คืน snapshot ล่าสุดจาก `$SharedDbPath` — Web App ดึงมา `importAll` เข้า IndexedDB ตอนเปิดแอปครั้งเดียว (`status:'not-found'` ถ้ายังไม่มีใคร push มาก่อนเลย ไม่ใช่ error) |
| `/rollover-daily-file` | POST | เปลี่ยนชื่อไฟล์ log sheet ให้เป็นวันปัจจุบัน (แพทเทิร์นวันที่ `(DD-MM-YY)` ในชื่อไฟล์) และเขียนวันที่ใหม่ลง cell `W1` ของชีต `BM 1` — Web App เรียกทุก poll (idempotent, no-op ถ้าวันที่ในชื่อไฟล์ตรงกับวันนี้อยู่แล้ว) ตั้งแต่ V29.97 route นี้ **เปิดไฟล์ให้เองอัตโนมัติผ่าน COM ถ้ายังไม่มีใครเปิดไว้ใน Excel** (ต่างจาก `/write-remark` ที่ยังต้องเปิดไฟล์เองก่อนเสมอ) — ถ้าเปิดไฟล์ไม่สำเร็จจริงๆ (ไฟล์เสีย/ถูกล็อกโดยเครื่องอื่น) จะตอบ `{status:'open-failed'}` — ถ้าไฟล์ถูก Excel session ของ Windows account อื่นบนเครื่องเดียวกันเปิดค้างอยู่ (bridge มองไม่เห็น session อื่น) จะตอบ `{status:'locked-by-other-session'}` แทนที่จะพยายามเปิดซ้ำจนขึ้น popup "ไฟล์เปิดอยู่แล้ว" ของ Excel (V29.110) — ตั้งแต่ V29.98 bridge เช็ค rollover นี้ **ทันทีตอน script เริ่มทำงานด้วย** (ไม่ต้องรอ Web App เปิด) เหมาะกับเครื่อง shared ที่ operator login/logout คนละบัญชี เพราะ operator คนแรกที่เปิด bridge ในแต่ละวันจะ trigger rollover ให้อัตโนมัติด้วย Excel session ของตัวเอง — ตั้งแต่ V29.100 ทุกครั้งที่ rollover เปลี่ยนวันจริง (ไม่ใช่ no-op) จะ **ลบ comment (Resolution Remark) ที่แอปเคยเขียนไว้เองทั้งไฟล์ด้วย** เพราะ layout log sheet ใช้แถว/คอลัมน์เดิมซ้ำทุกวัน comment เดิมจะติดค้างอยู่กับ cell เดิมข้ามวันไม่งั้น — ไม่แตะ comment ที่ operator พิมพ์เอง ถ้าลบไม่สำเร็จจะตอบ `{status:'ok', warning:'...'}` (rename/วันที่ยังสำเร็จปกติ แค่ comment เก่าอาจค้าง ให้ไปลบเองในไฟล์) |
| `/ensure-file-open` | POST | เช็คแค่ว่า Excel เปิดไฟล์ log sheet อยู่ไหม **ไม่สนใจวันที่/ชื่อไฟล์เลย** (คนละเรื่องกับ `/rollover-daily-file` ซึ่ง short-circuit เป็น `already-current` ทันทีถ้าวันที่ตรงกันอยู่แล้ว โดยไม่เช็คว่า Excel ยังเปิดไฟล์อยู่จริงไหม) ถ้ายังไม่เปิดก็เปิดให้เอง (ใช้ `Find-OrOpenWorkbook` ตัวเดิมกับ rollover — รวมถึงเช็ค `locked-by-other-session` เดียวกันด้วย V29.110) V29.99 — เพิ่มมาปิดช่องว่างตอนเปลี่ยนกะ (~ทุก 12 ชม., ยังไม่ข้ามเที่ยงคืน) ที่ operator คนก่อน logout ปิด Excel/bridge session ไปด้วย แล้วคนใหม่ login มาเปิด Web App โดยที่ไม่มีอะไร trigger ให้ Excel เปิดเลย — Web App เรียก route นี้ทันทีทุกครั้งที่โหลดหน้าเว็บ (`APP.init()`) และ bridge เองก็เรียกตอน startup ถ้า rollover ได้ `already-current` |

ทั้งสาม route แรก (source-file*, archive-source-file) ไม่ต้องเปิด Excel ไฟล์ต้นฉบับไว้ก็ทำงานได้ (อ่านไฟล์ดิบจาก disk ตรงๆ ไม่ผ่าน COM) — ถ้า Excel/PI Datalink กำลังเขียนไฟล์อยู่พอดี (ช่วงสั้นๆ ตอน refresh 4 รอบ/วัน) จะตอบ `{status:'file-locked'}` แทนที่จะ error รอบ poll ถัดไปจะลองใหม่เองอัตโนมัติ ไม่ต้องทำอะไรเพิ่ม (`/save-shared-db`/`/load-shared-db` ก็ใช้หลักการเดียวกัน — ดูหัวข้อถัดไป)

## ตั้งค่า $SharedDbPath (V29.85 — Multi-Operator Sync)

เครื่อง Office ใช้ร่วมกันหลาย operator แต่ login คนละ Windows account — ข้อมูลในแอป (Tags/Records/Master overrides/Remark) เก็บอยู่ใน **IndexedDB ของ browser ซึ่งผูกกับ Windows account เสมอ** (ไม่เกี่ยวกับว่า repo/ไฟล์แอปอยู่ที่ไหน) ทำให้คนที่ login ใหม่เห็น Dashboard เปล่าๆ ไม่เห็นข้อมูลของคนก่อนหน้า

`$SharedDbPath` (ค่า default: `D:\Monitor log sheet boardman\shared-data\plantlog-shared-db.json`) แก้ปัญหานี้โดยให้ Web App **push** snapshot ข้อมูลทั้งหมดไปเก็บที่ D: ทุกครั้งที่มีการแก้ไข (fire-and-forget ไม่บล็อก UI) และ **pull** กลับมาตอนเปิดแอปครั้งเดียว (ไม่มี periodic re-pull — reload หน้าเว็บถ้าต้องการข้อมูลล่าสุด) เป็น path คงที่ในสคริปต์เหมือน `$WatchFolder`/`$ArchiveFolder` (ห้ามรับจากเบราว์เซอร์) เขียนแบบ atomic (temp file แล้ว `Move-Item` ทับทีเดียว) กันไฟล์เสียหายครึ่งเดียวถ้า process ถูก interrupt กลางทาง — โฟลเดอร์ `shared-data` จะถูกสร้างอัตโนมัติตอน push ครั้งแรก

แก้ตัวแปรนี้ในสคริปต์ถ้าย้ายโฟลเดอร์บนเครื่องจริง

## Troubleshooting

| อาการ | สาเหตุที่เป็นไปได้ |
|---|---|
| Web App ขึ้น "ไม่พบ Local Bridge" | ยังไม่ได้เปิดสคริปต์นี้ หรือหน้าต่างถูกปิดไปแล้ว — เปิดใหม่ |
| Web App ขึ้น "ไม่พบไฟล์นี้เปิดอยู่ใน Excel" | ยังไม่ได้เปิดไฟล์ log sheet ต้นฉบับใน Excel ค้างไว้ หรือชื่อไฟล์ไม่ตรงกับที่ import เข้า Web App (เฉพาะ `/write-remark` — `/rollover-daily-file` เปิดไฟล์ให้เองอัตโนมัติตั้งแต่ V29.97 ไม่ต้องเปิดเองล่วงหน้าแล้ว) |
| Rollover ข้ามคืนไม่สำเร็จ ขึ้น "เปิดไฟล์ ... ใน Excel อัตโนมัติไม่สำเร็จ" (`open-failed`) | ไฟล์ log sheet เสีย/ถูกล็อกโดยเครื่องอื่นอยู่ หรือ path ผิด — เช็ค `errorMessage`/`message` ที่ตอบกลับมา แล้วลองเปิดไฟล์เองใน Excel บนเครื่อง Bridge ดูว่า error เดียวกันไหม |
| ไฟล์ที่เปิดอัตโนมัติขึ้น popup "ไฟล์นี้ถูกเปิดใช้งานอยู่แล้ว" ของ Excel แล้วกลายเป็น read-only | เกิดจาก operator อีกคนบน Windows account อื่นในเครื่องเดียวกันยังมี Excel เปิดไฟล์นี้ค้างอยู่ (COM มองเห็นแค่ session ตัวเอง ข้าม account ไม่ได้) — ตั้งแต่ V29.110 bridge เช็คไฟล์ `~$<ชื่อไฟล์>` (Excel lock file) ก่อนเปิดซ้ำเสมอ ถ้าเจอจะตอบ `{status:'locked-by-other-session'}` แทนที่จะพยายามเปิดจน Excel ขึ้น dialog เอง ไม่ต้องทำอะไร ระบบจะลองเปิดใหม่เองในรอบ poll ถัดไปหลัง account เดิมปิดไฟล์ — ถ้ายังเจอ popup อยู่หลังอัปเดต bridge แล้ว แปลว่ามีไฟล์ `~$` ค้างจาก Excel session ที่ crash ไปก่อนหน้า (ไม่ได้ปิดไฟล์อย่างถูกวิธี) ให้ลบไฟล์ `~$<ชื่อไฟล์>` ทิ้งเองในโฟลเดอร์ `$WatchFolder` (มองไม่เห็นถ้า Explorer ซ่อนไฟล์ที่ขึ้นต้นด้วย `~$` ไว้ — เปิด "Show hidden files" ก่อน) |
| ขึ้น "พบ Comment ที่มีคนพิมพ์ไว้แล้ว" | มีคนเคยพิมพ์ comment เองตรงๆ ใน Excel cell นั้น ระบบไม่เขียนทับให้อัตโนมัติ ต้องแก้ในไฟล์เอง |
| หน้าต่าง bridge ปิดตัวทันทีตอนเปิด | เปิด PowerShell รันแบบ manual (ดูข้างบน) เพื่อดู error message ที่แท้จริง — สาเหตุที่พบบ่อยคือ port 5175 ถูกโปรแกรมอื่นใช้อยู่แล้ว |
| กด Hyperlink ใน Excel แล้วขึ้นเตือนความปลอดภัย | ปกติของการเปิดไฟล์ local (`.bat`) ผ่าน hyperlink — กด Allow/Yes ได้ตามปกติ |
| `Register-ScheduledTask` ขึ้น `Access is denied` | ปกติถ้าใช้ `-GroupId` (trigger แบบ Any user) กับ account ที่ไม่มีสิทธิ์ local Administrator — Task Scheduler บังคับต้องใช้สิทธิ์ Admin เสมอสำหรับ group principal ใช้ `-UserId` แบบ Specific user แทนถ้าไม่มีสิทธิ์ Admin (ดูหัวข้อด้านบน) |
| ข้อมูลใน Dashboard ไม่อัปเดตเองอัตโนมัติ | เช็คว่า bridge รันอยู่ไหม (`/ping`) และไฟล์ใน `$WatchFolder` ไม่มีคำว่า `(master)` ในชื่อ + มีแค่ไฟล์เดียวที่ไม่ใช่ master — ถ้ามีมากกว่า 1 ไฟล์ bridge จะปฏิเสธไม่ import เลย (กันดึงไฟล์ผิด) auto-import เช็คทุก 5 นาที ไม่ใช่ทันที |
| ไม่มีไฟล์ archive โผล่ที่ `$ArchiveFolder` | archive จะเกิดเฉพาะตอนข้อมูลวันนั้นครบ 4 เวลา (03:00/09:00/15:00/21:00) แล้วเท่านั้น — เช็ค chip สถานะข้าง "Time Breakdown" บน Dashboard ว่าขึ้น "✓ ครบ 4 รอบเวลา" หรือยัง และอย่าลืมเช็คใน**โฟลเดอร์ย่อยตามเดือน** (เช่น `$ArchiveFolder\Aug 26\`) ไม่ใช่แค่ root ของ `$ArchiveFolder` เฉยๆ |
| Dashboard เห็นข้อมูล/remark ไม่ตรงกับเพื่อนร่วมกะที่ login คนละ account | เช็คว่า bridge รันอยู่ไหม (`/ping`) ทั้งสองเครื่อง/สอง session แล้ว **reload หน้าเว็บใหม่** — pull จาก `$SharedDbPath` เกิดแค่ตอนเปิดแอป (init) เท่านั้น ไม่มี periodic re-pull ระหว่างใช้งาน |
| Sidebar indicator ค้างที่ "LOCAL MODE" สีเหลืองทั้งที่ bridge เปิดอยู่ | เช็คสิทธิ์เขียนไฟล์ที่โฟลเดอร์ `shared-data` ใต้ `$SharedDbPath` (NTFS permission บนเครื่อง shared) หรือดู error ใน console ของ browser (`EXCEL_SYNC.pushSharedDb`/`pullSharedDb`) |
| กดปุ่ม "เปิด Excel Bridge" ในหน้า Web App แล้วไม่มีอะไรเกิดขึ้น / เบราว์เซอร์บอก "ไม่รู้จักลิงก์นี้" | ยังไม่ได้ import `register-protocol.reg` บนเครื่อง/account นี้ — ดูหัวข้อ "เปิด Bridge จากปุ่มในหน้า Web App" ด้านบน |
| กดปุ่ม "เปิด Excel Bridge" แล้วขึ้นหน้าต่างดำแวบเดียวแล้วปิด | Bridge instance เดิมเปิดอยู่แล้ว (จองพอร์ต 5175 ไว้) instance ใหม่เปิดซ้ำจะ error ทันที — ปกติ ไม่กระทบ instance เดิม เช็คว่า sync indicator ขึ้น SYNCED หรือยัง |
