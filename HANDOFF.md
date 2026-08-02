# HANDOFF — Plant Log Analyzer

## 📅 อัปเดตล่าสุด
2026-08-02 (บ่าย/เย็น) — เครื่อง: PC 4000D (ที่ทำงาน)
Branch: `main` | สถานะ repo ตอนปิดเครื่อง: **clean, up to date with origin/main**
Commit ล่าสุด: `9dc091c` — "Fix O(n^2) tag lookups, add min>max guard, reduce redundant renders (V29.52)"
(ถัดจาก `9fae88b` V29.51)

---

## ✅ ทำเสร็จแล้ว push ขึ้น main แล้ว (session นี้)

รีวิวไฟล์ `index.html` ทั้งไฟล์ (2,962 บรรทัด) พบ 8 ประเด็น จัดลำดับ 🔴🟡🟢 แล้วแก้ 5 ข้อที่ได้รับอนุมัติ → bump เป็น **V29.52**:

- 🔴 เพิ่ม `getTagMap()` helper (index.html:834, เลียนแบบ `getMasterMap()`) แทนที่ `tags.find()` ที่วนแบบ O(n²) ใน 4 จุด: `STATE._deriveAbnormal`, `APP.renderDashboard` (2 จุด), `APP.autoSelectCritical`, `APP.openReportModal`
- 🔴 เพิ่ม validation กัน Min > Max ใน `APP.saveMasterSettings` (แจ้งเตือน alert ภาษาไทย แล้วไม่บันทึกถ้ากรอกสลับ)
- 🟡 ตัด double-render ที่ซ้ำซ้อนใน `btn-clear-select` และ `autoSelectCritical` (STATE.set trigger render อยู่แล้ว ไม่ต้อง render ซ้ำ)
- 🟡 ปรับ `APP.render` ให้ render เฉพาะตารางของแท็บที่เปิดอยู่ (ก่อนหน้านี้ render ตาราง Tag/Master ทุกครั้งแม้ซ่อนอยู่)
- 🟢 เพิ่ม null-check ใน `handleFiles` สำหรับ element `view-filter`

**ทดสอบแล้ว**: เปิดผ่าน Chrome จริง (ใช้ local Python HTTP server เพราะ extension บล็อก `file://` ตรงๆ) ทุกจุดผ่าน ไม่มี console error ยืนยันด้วยการอ่าน IndexedDB จริง (301 tags / 1200 records จากการทดสอบก่อนหน้า) — ล้างข้อมูลทดสอบที่ฉีดเข้า IndexedDB ระหว่างทดสอบเรียบร้อยแล้ว **ไม่มีไฟล์/ข้อมูลทดสอบตกค้างใน repo**

---

## 🚧 ค้างอยู่ / ยังไม่ได้ทำ

1. **คำถามที่ตอบไปแล้วแต่ยังไม่ได้ลงมือทำอะไรต่อ**: พี่ A ถามว่า "Web App นี้อ่านข้อมูล Excel ยังไงและอ่านได้ครบทุก Tag หรือไม่" — อธิบายกลไก `EXCEL_WORKER.processData` (index.html:1351-1645) และตอบว่า **ไม่การันตี 100%** เพราะเป็นระบบ heuristic-based (keyword matching ไม่ใช่ fixed schema) จุดอ่อน 4 อย่าง:
   - พึ่ง keyword header ตรงรูปแบบ
   - Tag No ต้องยาว 3–30 ตัวอักษรและมีตัวเลขปน
   - ยึดตำแหน่งคอลัมน์คงที่หลังเจอแถว Tag No
   - ค่าที่ไม่ใช่ตัวเลขล้วนถูกทิ้งเสมอ (Strict Numeric Mode)

2. **ข้อเสนอที่ค้างอยู่ ยังไม่ได้รับคำตอบจากพี่ A**: เสนอจะช่วยตรวจสอบไฟล์ log sheet จริง (`Log sheet 08-3-26.xls` ที่มีอยู่ในโปรเจกต์) ว่ามี tag ไหนหลุดจากการอ่านบ้างไหม — **ยังไม่ได้ตอบรับ/ปฏิเสธ**

3. **ประเด็น 🟢 อื่นจากรีวิวที่ยังไม่ได้แก้** (priority ต่ำ ยังไม่มีแผนจะทำ เว้นแต่พี่ A ขอ):
   - ปุ่ม icon-only ยังไม่มี `aria-label`
   - เลขเวอร์ชันซ้ำหลายจุดในไฟล์ (ต้องแก้เองทุกจุดเวลา bump version)
   - `parseCSV` ไม่รองรับ escaped-quote `""`

---

## 🎯 ขั้นตอนถัดไปที่ตั้งใจจะทำ

1. ถามพี่ A ว่าต้องการให้ตรวจสอบ `Log sheet 08-3-26.xls` เทียบกับผลลัพธ์การอ่านจริงหรือไม่ (ข้อ 2 ด้านบน) — ถ้าใช่ ให้เปิดไฟล์นั้นและไล่เทียบ tag ที่อ่านได้กับที่มีในไฟล์ต้นฉบับ
2. ถ้าไม่ ให้ถามว่าจะทำประเด็น 🟢 ที่เหลือต่อไหม หรือมีงานใหม่

---

## ⚠️ ข้อควรระวัง / สิ่งที่ต้องไม่ลืม

- ไฟล์แผนงาน/รายละเอียดรีวิวเต็มทั้ง 8 ข้อ (ทั้งที่แก้แล้วและยังไม่แก้) อยู่ที่ `C:\Users\PC 4000D\.claude\plans\index-html-whimsical-lampson.md` — **ไฟล์นี้อยู่นอก repo** (ใน `.claude/plans` ของ user profile ไม่ใช่ของโปรเจกต์) จึงไม่ sync ผ่าน GitHub ข้ามเครื่อง ถ้าทำงานจากเครื่องอื่น ไฟล์นี้จะไม่มี — ต้องอาศัย HANDOFF.md นี้แทน
- การทดสอบ V29.52 ต้องรัน local HTTP server (เช่น `python -m http.server`) แล้วเปิดผ่าน `http://localhost:...` ไม่ใช่เปิดไฟล์ `file://` ตรงๆ เพราะ extension ที่ใช้ตรวจสอบบล็อก local file access
- เวลา bump version ต้องแก้ที่ 2 จุดในไฟล์: `<title>` และ label "Ultimate Edition (VXX.XX)" (ยังไม่ได้ consolidate เป็นจุดเดียว — ดูข้อ 🟢 ด้านบน)

---

## 🔧 คำสั่งที่ต้องรันก่อนทำงานต่อ

```bash
cd "C:\Users\PC 4000D\Check Out of Range Log"
git pull
```

ไม่มี npm install / build step ใดๆ (เป็น single-file app เปิด `index.html` ตรงได้เลย หรือรัน local server ถ้าต้องทดสอบผ่าน extension)
