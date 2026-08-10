# HANDOFF — Plant Log Analyzer

## 📅 อัปเดตล่าสุด
2026-08-10 — เครื่อง: PC `4000D` (บ้าน / Home)
Branch: `main` | Commit ล่าสุดบน `origin/main`: `2556624` (`Sync package-lock.json name field...`)
สถานะ repo: **local ตรงกับ origin/main เป๊ะ ก่อนเริ่ม session นี้** — session นี้ยังไม่ commit อะไรเลย มีการแก้ไข/ไฟล์ใหม่ค้างอยู่ใน working directory (ดูรายละเอียดด้านล่าง) รอพี่ A ตรวจแล้วสั่ง commit

---

## ✅ ทำอะไรเสร็จไปแล้วบ้าง (session นี้)

**ปัญหาต้นเรื่อง:** พี่ A รายงานว่าฟีเจอร์ "Export Updated Excel"/auto-sync (sync Resolution Remark กลับเป็น Excel comment) ทำให้ไฟล์ที่ได้ไม่เหมือนต้นฉบับ (โลโก้/สี/ความสูงแถวหาย)

**สืบสวนเชิงลึก** (ทดสอบจริงกับไฟล์ log sheet ตัวจริง 2 ไฟล์ที่พี่ A ส่งมา — `.xls` และ `.xlsm` ที่มี live PI Datalink formula) พบว่า:
- ไม่มีไลบรารี JS ฟรีตัวไหน (SheetJS, exceljs) เขียนไฟล์กลับได้ครบถ้วนปลอดภัย — ทำให้ Excel ต้อง force recalculate สูตร PI จนกลายเป็น `#NAME?` ทุกช่อง (แม้ค่าจริงจะยังถูกต้องอยู่ในไฟล์) เพราะไม่เขียน `calcChain.xml` กลับ
- SheetJS เขียน `.xls` (BIFF8) แล้ว **Excel ตัวจริงเปิดไฟล์ไม่ได้เลย** (ยืนยันด้วย COM automation ไม่เกี่ยวกับ Mark-of-the-Web)
- มีแค่ Excel ตัวจริง (ผ่าน COM automation) เท่านั้นที่ round-trip ไฟล์ได้ 100% ไม่มีข้อบกพร่องเลย

**สถาปัตยกรรมใหม่ที่สร้าง (ตามที่พี่ A อนุมัติ): Local Excel Bridge**
- `bridge/excel-bridge.ps1` — PowerShell script รันบนเครื่อง operator, เปิด HTTP listener ที่ `localhost:5175`, รับคำสั่งจาก Web App แล้วสั่ง Excel (ที่เปิดไฟล์ log sheet ค้างไว้อยู่แล้ว) เขียน comment กลับผ่าน COM automation จริง — **ทดสอบผ่านจริงแล้วครบทุก scenario ทั้งผ่าน PowerShell โดยตรงและผ่าน Web App ใน browser จริง (end-to-end เต็มรูปแบบ)** ok/conflict/no-file-open/clear กับไฟล์ macro ตัวอย่างจริง, `$AllowedOrigins` ใส่ production URL (`https://monitor-log-sheet-boardman.supasiao.workers.dev`) ครบแล้ว
- `bridge/README.md` — วิธีติดตั้ง/รัน/ตั้ง Task Scheduler ให้ operator
- `src/modules/excel-writeback.js` — rewrite ใหม่ทั้งหมด ให้ fetch คุยกับ bridge แทนการอ่าน-เขียน SheetJS เอง
- ลบโค้ด `FileSystemFileHandle`/`showOpenFilePicker`/ปุ่ม "นำเข้าและเชื่อมต่อไฟล์"/ปุ่ม "Export Updated Excel" ออกทั้งหมด (ไม่จำเป็นอีกต่อไป เพราะ bridge ทำงานได้ทุก browser และไม่มีความเสี่ยงเขียนไฟล์ผิด format)
- `record.sourceFileId` (+ `SourceWorkbooks`/`FileHandles` IndexedDB stores) เปลี่ยนเป็น `record.sourceFileName` ตรงๆ (bridge หา workbook จากชื่อไฟล์ที่เปิดอยู่ใน Excel แทน path ที่ browser ให้ไม่ได้)
- อัปเดต `CLAUDE.md`/`AGENTS.md`/`context.md` ครบ, bump version เป็น **V29.74**
- `npm test` ผ่านครบ 35/35 (แก้ `tests/excel-writeback.test.js` ให้ mock `fetch` แทนการ test SheetJS logic เดิม)

---

## 🚧 ค้างอยู่ตรงไหน

1. **ยังไม่ได้ commit** — พี่ A สั่งให้แก้ `$AllowedOrigins` ให้ครบก่อน (เสร็จแล้ว) แล้วค่อย commit — รอลงมือ commit จริง
2. Local-only ค้างใน working directory ตามเดิม (ไม่ commit ตามที่พี่ A ยืนยันไว้ก่อนหน้า): ไฟล์ log sheet/PDF ข้อมูลหน้างานจริงต่างๆ ที่ gitignore ไว้อยู่แล้ว
3. `index.html.bak` (untracked) ยังค้างอยู่ตามที่พี่ A ให้เก็บไว้ก่อนหน้านี้ — ไม่เกี่ยวกับ session นี้

---

## 🎯 ขั้นตอนถัดไปที่ตั้งใจจะทำ

1. Commit + push (รอคำสั่งชัดเจนก่อนทุกครั้งตาม Git Safety Protocol)
2. แจ้ง operator เรื่องต้องรัน `bridge/excel-bridge.ps1` ก่อนใช้ฟีเจอร์ sync (ดู `bridge/README.md`) และตั้ง Task Scheduler ให้ auto-start

---

## ⚠️ ข้อควรระวัง / สิ่งที่ต้องไม่ลืม

- **อย่า commit ไฟล์ข้อมูลหน้างานจริง** (`.xls`/`.xlsm`/PDF ที่ยังค้างใน `git status`) ปนไปกับ commit โค้ด — เช็ค `git status` ก่อน commit ทุกครั้ง (ปัจจุบัน gitignore ดักไว้อยู่แล้ว ไม่เคยหลุดมาก่อน)
- ฟีเจอร์ sync remark กลับ Excel **ใช้ไม่ได้เลยถ้า `bridge/excel-bridge.ps1` ไม่ได้รันอยู่** — Web App จะแจ้งสถานะ "ไม่พบ Local Bridge" ให้ operator ทราบ ไม่ fail เงียบๆ
- `wrangler.jsonc`'s `name` (`monitor-log-sheet-boardman`) ห้ามเปลี่ยน — URL ฝังอยู่ใน Excel log sheet จริงผ่าน HYPERLINK formula
- Production URL / Cloudflare Workers deploy target ไม่เปลี่ยน

---

## 🔧 คำสั่งที่ต้องรันก่อนทำงานต่อ

```bash
cd "C:\Users\PC 4000D\Check Out of Range Log"
git status   # เช็คว่า working directory ตรงกับที่สรุปไว้ข้างบนไหม
npm test     # ควรผ่าน 35/35
npm run dev  # ทดสอบ UI
```

ทดสอบ bridge แยก:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "bridge\excel-bridge.ps1"
```

ถ้าจะเช็คสถานะ deploy ให้ดูที่ GitHub Actions tab: https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions
