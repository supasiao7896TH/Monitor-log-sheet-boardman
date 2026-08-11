# HANDOFF — Plant Log Analyzer

## 📅 อัปเดตล่าสุด
2026-08-11 — เครื่อง: PC `26007294` (ที่ทำงาน / Office)
Branch: `main` | Commit ล่าสุด: `27d4c37` (ตรงกับ `origin/main`)
**Repo ย้ายที่เก็บแล้ว: `D:\Monitor log sheet boardman`** (จากเดิม `C:\Users\26007294\Monitor log sheet boardman`) — ดูเหตุผลด้านล่าง
สถานะ repo: ตรงกับ `origin/main` เป๊ะ, ไฟล์ข้อมูลหน้างานจริงที่ตั้งใจไม่ commit ยังอยู่ครบ (`Log sheet 08-3-26.xls` ลบไว้, `*.xlsm` untracked)

---

## ✅ ทำอะไรเสร็จไปแล้วบ้าง (session นี้ — เครื่อง Office)

**เรื่องที่ 1 — Sync โค้ดล่าสุด:** `git pull` จาก `34a719e` → `27d4c37` (fast-forward, ไม่มี conflict) ได้โฟลเดอร์ `bridge/` (V29.74 Local Excel Bridge ที่ทำเสร็จที่บ้านเมื่อคืน) เข้ามาที่เครื่องนี้แล้ว

**เรื่องที่ 2 — ย้าย repo จาก `C:\Users\26007294\...` ไป `D:\Monitor log sheet boardman`:**

**สาเหตุ:** เครื่อง Office นี้ operator แต่ละคน login คนละ Windows username จริง (ไม่ใช่ account เดียวใช้ร่วมกัน) — ถ้าเก็บ repo ไว้ใต้ profile ส่วนตัว (`C:\Users\26007294\...`) จะมี 2 ปัญหา: (1) NTFS permission ไม่ให้ account อื่นอ่าน/รันไฟล์ในนั้น (2) Task Scheduler trigger "At log on" แบบเดิมผูกกับ account เดียว operator คนอื่น login แล้ว bridge จะไม่ auto-start ให้

**ที่ตั้งใหม่ที่เลือก:** `D:\` — ตรวจแล้วเป็น **Local Fixed drive จริง** (ไม่ใช่ profile, ไม่ใช่ network) เหลือพื้นที่ 106 GB ส่วน `J:`/`K:`/`L:` ที่มีในเครื่องเป็น **Network (mapped) drive** ไม่เลือกเพราะผูกกับ login script ของแต่ละ account เหมือนปัญหาเดิม

**ขั้นตอนที่ทำไปแล้ว:**
1. ย้ายทั้งโฟลเดอร์ (`.git` ติดไปด้วย ไม่ต้อง clone ใหม่) จาก `C:\Users\26007294\Monitor log sheet boardman` → `D:\Monitor log sheet boardman` — ยืนยันแล้วว่า `git log`/`git status` ที่ตำแหน่งใหม่ตรงกับก่อนย้ายทุกอย่าง
   - **หมายเหตุ:** เหลือโฟลเดอร์ `.git` ว่างเปล่าค้างอยู่ที่ `C:\Users\26007294\Monitor log sheet boardman\.git` (ลบไม่สำเร็จตอนย้ายเพราะติด process lock ชั่วคราว, ไม่มีข้อมูลอยู่ข้างในแล้ว) — **ต้องลบโฟลเดอร์นี้ทิ้งเองผ่าน File Explorer** ทีหลัง (ไม่กระทบการใช้งานอะไร แค่เป็นเศษที่ค้าง)
2. ตั้ง NTFS permission ให้ `BUILTIN\Users` (ครอบคลุมทุก local account) อ่าน+รันได้บนโฟลเดอร์ใหม่: `icacls "D:\Monitor log sheet boardman" /grant "Users:(OI)(CI)RX" /T` — สำเร็จ (พบว่า drive `D:` root มี `BUILTIN\Users:(I)(OI)(CI)(F)` inherited อยู่แล้วด้วย ยิ่งมั่นใจว่าทุก account เข้าถึงได้)
3. ยืนยันแล้วว่า `bridge/excel-bridge.ps1` **ไม่มี hardcoded path เลย** — ย้ายที่เก็บได้โดยไม่ต้องแก้โค้ดสคริปต์นี้แม้แต่บรรทัดเดียว
4. **ทดสอบ end-to-end จากตำแหน่งใหม่ (`D:\`) สำเร็จแล้ว** — เปิดไฟล์ log sheet ค้างไว้ใน Excel → รัน `bridge\excel-bridge.ps1` จาก `D:\Monitor log sheet boardman` (`/ping` ตอบ `{"status":"ok"}` ปกติ) → เข้าเว็บ production → import ไฟล์เดียวกัน → Save Remark → **พี่ A ยืนยันว่าทำงานถูกต้องครบถ้วน** comment ขึ้นใน Excel จริง
5. Commit doc changes (`bridge/README.md`, `HANDOFF.md`) แล้ว — commit `1e99d15`

**เรื่องที่ 3 — Task Scheduler + ปุ่ม Hyperlink สำหรับ operator คนอื่น:**

ลองสร้าง Task Scheduler แบบ "Any user" (`-GroupId "BUILTIN\Users"`) แล้วโดน Windows ปฏิเสธ **`Access is denied`** — ยืนยันแล้วว่า account `pttgc\26007294` **ไม่มีสิทธิ์ local Administrator** (`whoami /groups` ไม่มี Admin group เลย) และ Task Scheduler บังคับต้องใช้สิทธิ์ Admin เสมอสำหรับ trigger ที่ผูกกับ group principal ไม่ว่าใครรันก็ตาม

**แนวทางที่ทำแทน (พี่ A เลือกเอง):**
1. **✅ สร้าง Task Scheduler แบบ "Specific user" สำเร็จแล้ว** — ผูกกับ account พี่ A (`PTTGC\26007294`) เท่านั้น ไม่ต้องใช้สิทธิ์ Admin (ยืนยัน `State: Ready`, trigger `UserId: PTTGC\26007294`, principal `LogonType: Interactive, RunLevel: Limited`) — bridge จะ auto-start เองเฉพาะตอนพี่ A login เท่านั้น ยังไม่ครอบคลุม operator คนอื่น
2. **✅ สร้าง `bridge/start-bridge.bat`** — ตัวกลางเรียก `excel-bridge.ps1` (ใช้ `%~dp0` หา path ตัวเองเสมอ) เพื่อให้ operator คนอื่นเปิด bridge ได้ง่ายโดยไม่ต้องพิมพ์คำสั่ง PowerShell เอง — double-click ได้ตรงๆ หรือเปิดผ่าน Hyperlink ใน Excel
3. **✅ อัปเดต `bridge/README.md`** — แก้หัวข้อ Task Scheduler ให้ตรงกับสถานการณ์จริง (Any-user ต้องใช้ Admin, ถ้าไม่มีให้ใช้ Specific-user + ปุ่ม Hyperlink แทน) เพิ่มหัวข้อใหม่ "ปุ่มเปิด Bridge จาก Excel" พร้อม Troubleshooting เพิ่ม 2 แถว
4. **สูตร Hyperlink ที่พี่ A ต้องนำไปแปะเองในไฟล์ log sheet จริง** (ยังไม่ได้แปะ — พี่ A ทำเอง):
   ```excel
   =HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", "▶ เปิด Excel Bridge (กดตอนเริ่มกะ)")
   ```
   ครั้งแรกที่กดอาจขึ้น dialog เตือนความปลอดภัยของ Excel (ปกติ กด Allow/Yes ได้)

---

## ✅ ทำอะไรเสร็จไปแล้วบ้าง (session ก่อนหน้า — เครื่องบ้าน, สำเร็จและยืนยันด้วยการใช้งานจริงแล้ว)

**ปัญหาต้นเรื่อง:** ฟีเจอร์ sync Resolution Remark กลับเป็น Excel comment ทำให้ไฟล์ export ไม่เหมือนต้นฉบับ

**สืบสวนพบว่า** ไม่มีไลบรารี JS ฟรีตัวไหน (SheetJS, exceljs) เขียนไฟล์ log sheet จริงกลับได้ปลอดภัย (ไฟล์มีสูตรเชื่อม PI Datalink แบบ live — เขียนผ่าน JS แล้ว Excel จะกลายเป็น `#NAME?` ทุกช่อง หรือ SheetJS เขียน `.xls` แล้ว Excel เปิดไม่ได้เลย) → เปลี่ยนสถาปัตยกรรมทั้งหมดให้ **Excel ตัวจริงเป็นคนเขียนเอง** ผ่าน:

**`bridge/excel-bridge.ps1`** — PowerShell script รันบนเครื่อง operator เอง เปิด HTTP listener ที่ `localhost:5175`, หา workbook ที่เปิดอยู่ใน Excel จากชื่อไฟล์ แล้วสั่งเขียน/ลบ comment ผ่าน COM automation จริง

**สถานะ: ทดสอบ end-to-end ผ่านจริงครบวงจรแล้ว** (พี่ A ทดสอบเองที่เครื่องนี้ 2026-08-10 ดึก) — เปิดไฟล์ log sheet ใน Excel ค้างไว้ → รัน bridge ผ่าน PowerShell → เข้าเว็บ production (`https://monitor-log-sheet-boardman.supasiao.workers.dev`) → import ไฟล์เดียวกัน → กด Save Remark → **comment ขึ้นใน Excel จริงสำเร็จ**

**บั๊กที่เจอระหว่างทดสอบและแก้ไปแล้วทั้งหมด:**
1. Modal ปิดตัวเองเร็วเกินไปจนอ่านข้อความสถานะไม่ทัน → แก้แล้ว (commit `6a7b628`) ตอนนี้ปิดอัตโนมัติเฉพาะกรณีสำเร็จ (`ok`) แบบหน่วง 1.2 วิ ส่วนกรณีอื่น (bridge ปิดอยู่/ไม่เจอไฟล์เปิด/conflict) จะค้างให้อ่านจนกว่าจะปิดเอง
2. เจอ Excel process ค้าง (orphan จากการทดสอบของหนูเอง) ไปแย่งตำแหน่งที่ bridge มองหา ทำให้หาไฟล์ไม่เจอทั้งที่เปิดอยู่จริง — แก้โดย kill process ที่ค้าง (เป็นปัญหาเฉพาะหน้าจากการทดสอบ ไม่ใช่บั๊กถาวรในโค้ด — **ถ้าเจอ "ไม่พบไฟล์นี้เปิดอยู่ใน Excel" ทั้งที่เปิดไฟล์ถูกต้องแล้ว ให้เช็ค Task Manager ว่ามี `EXCEL.EXE` มากกว่า 1 instance ไหม ถ้ามีให้ปิดตัวที่ไม่มีหน้าต่าง (ไม่มี MainWindowTitle) ทิ้ง**)

**อื่นๆ ที่ทำในโค้ด:**
- `src/modules/excel-writeback.js` — rewrite ใหม่ทั้งหมด (fetch คุยกับ bridge)
- ลบ `FileSystemFileHandle`/ปุ่ม "นำเข้าและเชื่อมต่อไฟล์"/ปุ่ม "Export Updated Excel" ที่ไม่จำเป็นแล้ว
- `record.sourceFileId` → `record.sourceFileName` ตรงๆ
- อัปเดต `CLAUDE.md`/`AGENTS.md`/`context.md`/`bridge/README.md` ครบ, bump เป็น **V29.74**
- `npm test` ผ่าน 35/35
- Deploy ขึ้น production ผ่าน GitHub Actions สำเร็จแล้ว (auto-deploy ทุก push เข้า `main`)

---

## 🚧 ค้างอยู่ตรงไหน

1. **สูตร Hyperlink ยังไม่ได้แปะในไฟล์ log sheet จริง** — พี่ A ต้องนำสูตรที่ให้ไว้ (ดูเรื่องที่ 3 ด้านบน) ไปแปะเองในเซลล์ที่ operator เห็นง่าย
2. **ยังไม่ได้ทดสอบ Task Scheduler จริงด้วยการ log off/log on ใหม่** — สร้าง task แล้ว (`State: Ready`) แต่ยังไม่ได้ยืนยันว่า auto-start จริงตอน login
3. **ยังไม่ได้ทดสอบปุ่ม `start-bridge.bat`/Hyperlink จริง** — สร้างไฟล์แล้วแต่ยังไม่ได้ double-click ทดสอบ (มี bridge instance เดิมรันจากคำสั่ง PowerShell ค้างอยู่แล้ว ครองพอร์ต 5175 อยู่ — ต้องปิดตัวเดิมก่อนถึงจะทดสอบตัวใหม่ได้)
4. เศษโฟลเดอร์ `.git` ว่างเปล่าค้างที่ `C:\Users\26007294\Monitor log sheet boardman\.git` — ต้องลบเองผ่าน File Explorer (ไม่กระทบอะไร)
5. **bridge บนเครื่องบ้าน (4000D) ยังรันแบบ manual อยู่** เหมือนเดิม (ยังไม่ได้ตั้ง Task Scheduler ที่นั่น)
6. เครื่อง Office ยังไม่มี Node.js/npm (รอ IT ติดตั้ง) — ไม่กระทบงาน bridge เพราะทดสอบผ่าน production URL ได้เลย แต่ยังกระทบถ้าจะแก้โค้ดที่เครื่องนี้โดยตรง
7. **doc changes ของเรื่องที่ 3 (`bridge/README.md`, `HANDOFF.md`, `bridge/start-bridge.bat`) ยังไม่ได้ commit** — รอพี่ A สั่ง (แยกจาก commit `1e99d15` ที่ทำไปแล้วของเรื่องที่ 2)

---

## 🎯 ขั้นตอนถัดไปที่ตั้งใจจะทำ (ที่เครื่อง Office)

1. แปะสูตร Hyperlink ในไฟล์ log sheet จริง แล้วทดสอบกดจาก Excel ว่าเปิด bridge ได้จริง
2. ทดสอบ Task Scheduler จริงด้วยการ log off/log on ใหม่ ว่า bridge auto-start เองโดยไม่ต้องเปิดมือ (เฉพาะ account พี่ A)
3. ลบเศษโฟลเดอร์ `.git` ว่างที่ `C:\Users\26007294\Monitor log sheet boardman\` ทิ้ง
4. Commit ไฟล์/เอกสารของเรื่องที่ 3 (`bridge/README.md`, `HANDOFF.md`, `bridge/start-bridge.bat`) เมื่อพร้อม
5. ทำ Task Scheduler ให้เครื่องบ้าน (PC 4000D) ด้วยเหมือนกัน (ยังเป็น manual อยู่ — เครื่องบ้านเป็น single-user ใช้ Any-user หรือ Specific-user ก็ได้ตามสะดวก)

---

## ⚠️ ข้อควรระวัง / สิ่งที่ต้องไม่ลืม

- ฟีเจอร์ sync remark กลับ Excel **ใช้ไม่ได้เลยถ้า `bridge/excel-bridge.ps1` ไม่ได้รันอยู่** — Web App จะแจ้งสถานะ "ไม่พบ Local Bridge" ให้ operator ทราบ ไม่ fail เงียบๆ (ข้อมูลใน Web App เองไม่หาย แค่ไม่ sync กลับ Excel)
- **ต้องเปิดไฟล์ log sheet ต้นฉบับค้างไว้ใน Excel ก่อน** ถึงจะ sync ได้ — bridge หา workbook จาก "ชื่อไฟล์ที่เปิดอยู่ใน Excel" ไม่ใช่ path บนดิสก์ (browser ให้ path จริงไม่ได้)
- ถ้าเจอ "ไม่พบไฟล์นี้เปิดอยู่ใน Excel" ทั้งที่เปิดไฟล์ถูกต้องแล้วจริงๆ **เช็ค Task Manager ก่อนว่ามี `EXCEL.EXE` มากกว่า 1 ตัวไหม** (อาจมีตัวที่ไม่มีหน้าต่างค้างอยู่จากการเปิด/ปิดไฟล์ก่อนหน้า) ปิดตัวที่ไม่มีหน้าต่างทิ้งแล้วลองใหม่
- อย่า commit ไฟล์ข้อมูลหน้างานจริง (`.xls`/`.xlsm`/PDF) ปนไปกับ commit โค้ด — gitignore ดักไว้อยู่แล้ว เช็ค `git status` ก่อน commit ทุกครั้ง
- `wrangler.jsonc`'s `name` (`monitor-log-sheet-boardman`) ห้ามเปลี่ยน — URL ฝังอยู่ใน Excel log sheet จริงผ่าน HYPERLINK formula

---

## 🔧 คำสั่งที่ต้องรันก่อนทำงานต่อ

```bash
cd "D:\Monitor log sheet boardman"   # ที่ตั้งใหม่ที่เครื่อง Office (ย้ายจาก C:\Users\26007294\... แล้ว)
git pull
npm install   # ถ้ายังไม่เคยลงที่เครื่องนี้ (เครื่อง Office ยังไม่มี Node.js ณ ตอนนี้)
npm test      # ควรผ่าน 35/35
```

รัน bridge (manual, ทดสอบก่อนตั้ง Task Scheduler):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "bridge\excel-bridge.ps1"
```

เช็คสถานะ deploy: https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions
