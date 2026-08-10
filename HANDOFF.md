# HANDOFF — Plant Log Analyzer

## 📅 อัปเดตล่าสุด
2026-08-10 (ดึกๆ) — เครื่อง: PC `4000D` (บ้าน / Home)
Branch: `main` | Commit ล่าสุดบน `origin/main`: `6a7b628` (`Fix Excel-sync status message getting hidden by immediate modal auto-close`)
สถานะ repo: **local ตรงกับ origin/main เป๊ะ ทุกอย่าง commit + push แล้ว** ไม่มีอะไรค้าง (เหลือแค่ `index.html.bak` untracked ที่ตั้งใจเก็บไว้อยู่แล้ว)

---

## ✅ ทำอะไรเสร็จไปแล้วบ้าง (session นี้) — **สำเร็จและยืนยันด้วยการใช้งานจริงแล้ว**

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

1. **bridge บนเครื่องนี้ (บ้าน) รันแบบ manual อยู่** (เปิดผ่าน PowerShell เอง ยังไม่ได้ตั้ง Task Scheduler ให้ auto-start) — ใช้งานได้ปกติ แค่ต้องเปิดเองทุกครั้งที่จะใช้
2. **เครื่องที่ทำงาน (Office, PC `26007294`) ยังไม่ได้ตั้งอะไรเลย** — พี่ A จะไปตั้งค่าต่อพรุ่งนี้เช้า (ทั้ง pull โค้ดล่าสุดและตั้ง bridge)

---

## 🎯 ขั้นตอนถัดไปที่ตั้งใจจะทำ (พรุ่งนี้เช้า ที่เครื่อง Office)

1. `git pull` ที่เครื่อง Office ให้ได้ commit `6a7b628` ล่าสุด
2. เอาโฟลเดอร์ `bridge/` ไปวางที่เครื่อง Office (มากับ `git pull` อยู่แล้วถ้า clone repo ทั้งชุด)
3. ทดสอบรัน bridge แบบ manual ก่อน (`powershell -NoProfile -ExecutionPolicy Bypass -File "bridge\excel-bridge.ps1"`) ให้แน่ใจว่าทำงานได้แบบเดียวกับที่เครื่องบ้าน
4. **ตั้ง Task Scheduler ให้ bridge auto-start ตอน login** — ขั้นตอนละเอียดอยู่ใน `bridge/README.md` หัวข้อ "ตั้งให้รันอัตโนมัติทุกครั้งที่ล็อกอินเข้าเครื่อง" (Create Task → Trigger "At log on" → Action รัน `powershell.exe` พร้อม argument ชี้ไปที่ path จริงบนเครื่อง Office)
5. ทดสอบ end-to-end ที่เครื่อง Office เหมือนที่ทำสำเร็จที่บ้าน (เปิดไฟล์ log sheet ใน Excel ค้างไว้ → เข้าเว็บ production → import ไฟล์เดียวกัน → Save Remark → เช็คว่า comment ขึ้นใน Excel จริง)
6. ถ้าเจอ "ไม่พบไฟล์นี้เปิดอยู่ใน Excel" ทั้งที่เปิดถูกต้องแล้ว ให้เช็คก่อนว่ามี Excel process ซ้อนกันไหม (ดูรายละเอียดในหัวข้อบั๊กที่เจอด้านบน)
7. ทำ Task Scheduler ให้เครื่องบ้าน (PC 4000D) ด้วยเหมือนกัน (ตอนนี้ยังเป็น manual อยู่ ตามข้อ "ค้างอยู่ตรงไหน" ข้อ 1) — จะได้ไม่ต้องเปิด bridge มือทุกครั้ง

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
cd "C:\Users\26007294\Monitor log sheet boardman"   # path เครื่อง Office — แก้ตามจริง
git pull
npm install   # ถ้ายังไม่เคยลงที่เครื่องนี้
npm test      # ควรผ่าน 35/35
```

รัน bridge (manual, ทดสอบก่อนตั้ง Task Scheduler):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "bridge\excel-bridge.ps1"
```

เช็คสถานะ deploy: https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions
