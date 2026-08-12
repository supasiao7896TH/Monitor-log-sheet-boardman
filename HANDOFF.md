# HANDOFF — Plant Log Analyzer

## 📅 อัปเดตล่าสุด
2026-08-12 — เครื่อง: Office PC (`26007294`)
Branch: `main` | Commit ล่าสุด: `51f102b` — **ตรงกับ `origin/main` แล้ว, working tree clean สนิท** (`git status --short` ไม่มี output)
เวอร์ชันแอปปัจจุบัน: **V29.83**

> ⚠️ ตอนเริ่ม session นี้ที่เครื่อง Office `git log` พบว่า `origin/main` ไปไกลกว่า header เดิมด้านล่าง (ซึ่งหยุดที่ `2b81b3b` / V29.81) อีก 1 commit ที่ไม่เคยถูกบันทึกเป็น entry ใน HANDOFF.md เลย: `51ec9d2` — **V29.82** "Fix canonical-times completeness reporting a future time slot as present" (แก้ `getCanonicalTimesStatus` ให้เทียบกับเวลาจริง ณ ปัจจุบันด้วย ไม่ใช่แค่เช็คว่ามี record ของ time slot นั้นหรือยัง กันไม่ให้ dashboard ขึ้น "ครบ 4 รอบเวลา" ก่อนเวลาจริงมาถึง) — **session นี้ (เครื่อง Office) ไม่ได้เป็นคนทำ V29.82** พบแค่จาก `git log`/`git show --stat` ตอนตรวจสอบก่อนเริ่มงาน ไม่มีบริบทเพิ่มเติมนอกจาก commit message เอง — ถ้าใครรับงานต่อที่เครื่องบ้านและมีบริบทมากกว่านี้ ควรเติม entry ย้อนหลังให้ครบ
>
> หมายเหตุเก่าจากเครื่องบ้าน (เก็บไว้เป็นบันทึกประวัติ): HANDOFF.md ฉบับก่อนหน้า (เขียนที่เครื่อง Office `26007294`) ค้างข้อมูลไว้ที่ commit `22416d8` และบอกว่า "เรื่องที่ 4" (Threaded Comment fix) ยังไม่ commit — ความจริงตอนเริ่ม session นั้นที่เครื่องบ้าน `origin/main` ไปไกลกว่านั้นแล้ว 10 commits (รวม "เรื่องที่ 4" ที่ commit ไปแล้วเป็น `952d8f5`) เนื้อหาเก่าด้านล่างเก็บไว้เป็นบันทึกประวัติ

---

## ✅ เรื่องที่ 5 — Bug fix: Auto-import/auto-archive มองไฟล์ lock ของ Excel เป็นไฟล์ที่ 2 (V29.81) — เครื่องบ้าน

**บริบท:** `git pull` เข้ามา 10 commits ที่ยังไม่เคยบันทึกใน HANDOFF.md เลย ก่อนเริ่มแก้บั๊กนี้ (ดูรายละเอียดครบใน "เรื่องที่ 6" ด้านล่าง) — สรุปสั้นๆ คือมี V29.75–V29.80 เข้ามาแล้ว รวมถึงฟีเจอร์ auto-import/auto-archive (V29.78) ที่โพลไฟล์ล่าสุดจาก watch folder แล้ว archive สำเนาไว้กันข้อมูลหาย

**สิ่งที่ทำ:** ตามคำขอพี่ A ให้ทดสอบฟีเจอร์ auto-import/auto-archive (V29.78/V29.80) แบบ end-to-end จริงจัง — copy `bridge/excel-bridge.ps1` ไปไว้ที่ scratchpad ชั่วคราว override ค่าคงที่ `$WatchFolder`/`$ArchiveFolder` ให้ชี้ไปโฟลเดอร์ทดสอบ (**ไม่ได้แตะ path จริงที่ hardcode ไว้ในสคริปต์** `D:\PTA COMMONT WORK\Log sheet Digital` / `D:\Monitor log sheet boardman` — สองที่นี้ไม่มีอยู่จริงบนเครื่องบ้านด้วยซ้ำ) รันเป็น background HTTP listener จริงที่ port 5175 แล้วยิง request จริงเข้า `/ping`, `/source-file-info`, `/source-file`, `/archive-source-file` ครอบคลุมกรณี: เลือกไฟล์ถูกต้องโดย ignore ไฟล์ `(master)`, โอนไฟล์แบบ byte-for-byte เป๊ะ, error กรณีไฟล์ผู้สมัครหลายไฟล์กำกวม, ไม่พบไฟล์เลย, CORS origin ที่ไม่อนุญาต (403), sharing-violation จริง (เปิดไฟล์ทดสอบด้วย `FileShare.None` จากอีก handle จำลอง PI Datalink กำลังเขียน → ได้ `file-locked` ถูกต้อง), archive ซ้ำแบบ idempotent, และพิสูจน์ตรงๆ ว่า V29.80 (InvariantCulture) ทำงานถูก — เทียบ `(Get-Date).ToString('MMM yy')` ภายใต้ thread culture `th-TH` จำลอง (ได้ `"ส.ค. 69"` ผิด — พ.ศ. 2 หลัก + เดือนไทย) กับโค้ดจริงที่ใช้ `InvariantCulture` (ได้ `"Aug 26"` ถูกต้องไม่ว่า locale เครื่องจะเป็นอะไร)

**บั๊กที่เจอ (ของจริง ไม่เคยมีใครรู้มาก่อน):** `Resolve-SourceFile` ใน `bridge/excel-bridge.ps1` (ใช้ร่วมกันทั้ง auto-import และ auto-archive) กรองเฉพาะชื่อไฟล์ที่มี `"(master)"` ออกจาก candidate list เท่านั้น — **ไม่ได้กรองไฟล์ lock ของ Excel เอง** (`~$<filename>` เช่น `~$P1-F-2002-22 (11-08-26) (Digital).xlsm`) ซึ่ง Windows/Excel สร้างขึ้นอัตโนมัติในโฟลเดอร์เดียวกันทุกครั้งที่ไฟล์ต้นฉบับเปิดอยู่ — และฟีเจอร์ write-back ทั้งหมด **บังคับให้ operator เปิดไฟล์ค้างไว้ใน Excel ตลอดกะ** อยู่แล้ว แปลว่าไฟล์ lock นี้จะอยู่แทบตลอดเวลาขณะใช้งานจริง → `Resolve-SourceFile` จะเจอ "2 ไฟล์ผู้สมัคร" แล้วคืน error กำกวมแทบตลอด ทำให้ auto-import/auto-archive พังเงียบๆ ในสภาวะใช้งานปกติทั่วไป — ยืนยัน reproduce ได้จริง (สร้างไฟล์ `~$...xlsm` จริงคู่กับไฟล์ทดสอบ ยืนยัน `/source-file-info` error "พบไฟล์มากกว่า 1 ไฟล์" ผิดพลาดจริง)

**Fix:** เพิ่มเงื่อนไข `-and $_.Name -notlike '~$*'` ใน `Where-Object` filter ของ `Resolve-SourceFile` (`bridge/excel-bridge.ps1` ราวบรรทัด 67) พร้อมคอมเมนต์ `V29.81 FIX` (สไตล์เดียวกับคอมเมนต์ `V29.75 FIX` เดิมในไฟล์เดียวกัน) — รัน reproduction test ชุดเดิมซ้ำกับสคริปต์ที่แก้แล้ว ยืนยันว่าเลือกไฟล์จริงถูกต้อง ไม่สนใจไฟล์ `~$...` แล้ว

**ไฟล์ที่แก้:** `bridge/excel-bridge.ps1`, `index.html` (title บรรทัด 6 + label "System Version" บรรทัด 664) — bump เป็น **V29.81**

**การยืนยัน:** `npm test` ผ่าน 49/49 ทั้งก่อนและหลังแก้ (ไม่มี automated coverage สำหรับ logic PowerShell นี้เลย — บั๊กนี้เจอและยืนยัน fix ทั้งหมดผ่านการทดสอบ HTTP-level ด้วยมือกับ instance จริงที่รันอยู่ใน session นี้ ไม่ใช่ vitest)

**Commit:** `2b81b3b` "Fix auto-import/archive seeing Excel's own lock file as a second file (V29.81)" — 2 ไฟล์ (`bridge/excel-bridge.ps1`, `index.html`) — **push ขึ้น `origin/main` แล้ว** (`8537334..2b81b3b`)

**สถานะ:** แก้เสร็จ + commit + push แล้ว **แต่ยังไม่มีใครยืนยันบน production/สภาพแวดล้อมจริง** — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 1

---

## ✅ เรื่องที่ 6 — Sync สถานะจาก `origin/main` (10 commits ที่ HANDOFF.md ฉบับเก่าไม่เคยบันทึก) — เครื่องบ้าน

`git pull` ตอนต้น session นี้: fast-forward `27d4c37` → `8537334` (10 commits ไม่มี conflict, ไม่มีงานค้างที่เครื่องบ้านหาย — tree สะอาดอยู่แล้ว มีแค่ `index.html.bak` เป็น untracked ที่ไม่เกี่ยวข้อง ลบทิ้งแล้วตามคำขอพี่ A) commits ที่เข้ามา (เรียงเก่า→ใหม่):

| Commit | เรื่อง |
|---|---|
| `1e99d15` | Document Excel Bridge multi-user setup for shared Office PC |
| `22416d8` | Add Excel-hyperlink launcher for Bridge on shared multi-user PCs |
| `952d8f5` | **V29.75** — Fix silent Excel-sync failure when a cell already has a Threaded Comment (นี่คือ "เรื่องที่ 4" ที่ HANDOFF.md ฉบับเก่าบอกว่ายังไม่ commit — จริงๆ commit ไปแล้ว) |
| `a293f27` | Record V29.75 fix and multi-user bridge deployment pattern in context.md |
| `834d92e` | **V29.76** — Add Card/Table layout toggle to the Infographic Report |
| `05b6a98` | **V29.77** — Expand in-app user manual to cover recent features |
| `64fae6a` | Replace personal branding "Supasit.A" → **"A(i)CODER"** |
| `78ccb1a` | **V29.78** — Add auto-import/auto-archive Excel Bridge (โพล watch folder หาไฟล์ log sheet ล่าสุดแล้ว import อัตโนมัติ + archive สำเนาไว้กันข้อมูลหาย), fix dashboard perf, harden storage |
| `db0aac6` | **V29.79** — Fix auto-imported records getting wrong `sourceFileName` |
| `8537334` | **V29.80** — Archive auto-saved log sheets into a monthly subfolder (เช่น "Aug 26") ใช้ `InvariantCulture` กันปัญหา locale |

รัน `npm test` (49/49 ผ่าน) และ `npm run dev` เปิดแอปผ่าน browser (claude-in-chrome) เช็คว่า dashboard render ปกติ (301 tags, 1200 data points, 47 abnormalities จาก IndexedDB เดิม) — เป็นแค่ smoke check ทั่วไป ไม่เกี่ยวกับบั๊กที่แก้ทีหลัง

---

## ✅ เรื่องที่ 7 — Bug fix: Resolution Remark หายหลัง re-import (V29.83) — เครื่อง Office

**บริบท:** พี่ A รายงานว่ากรอก "Resolution Remark (Action Taken)" ใน record ที่ผิดปกติแล้วบันทึกสำเร็จ แต่พอเปิด "สรุปเป็นรูปภาพ (Smart)" (Infographic Report) ข้อความ remark ที่กรอกไว้กลับไม่ปรากฏ — เกิดแบบไม่คงที่ (intermittent) ซึ่งทำให้ยากต่อการ reproduce ตรงๆ ตอนแรก

**Root cause (ไล่ผ่าน sa-explore + verify เอง):**
- field name และ render logic ของ remark ไม่มีปัญหา — `remark` เขียน/อ่านตรงกันทุกจุด (`app-modal.js` `saveAction` ↔ `app-report.js` `buildInfographicCardHTML`/`buildInfographicTableRowHTML`)
- ปัญหาจริงคือ **re-import เขียนทับ remark กลับเป็นค่าว่างแบบเงียบๆ**: `EXCEL_WORKER.processData` (`excel-worker.js`) สร้าง record ใหม่จาก cell เสมอด้วย `remark: '', actionStatus: 'new'` hardcode และ record id เป็นค่าคงที่ตามตำแหน่ง cell → re-import ไฟล์เดิม (ไม่ว่า manual drag-drop หรือ auto-import ที่ poll ทุก 5 นาที) จะ `put()` ทับ record เดิมใน IndexedDB ทันที ไม่มี merge ป้องกันไว้แบบที่ tag มีอยู่แล้ว (V29.62)
- ตัวกระตุ้นที่ทำให้ "ดูไม่คงที่": Local Bridge (`bridge/excel-bridge.ps1`) เรียก `$wb.Save()` ทุกครั้งที่ sync remark กลับ Excel comment สำเร็จ → mtime ไฟล์เปลี่ยน → auto-import poll เห็น mtime เปลี่ยนก็ re-import ทั้งไฟล์ทันที เขียนทับ remark ที่เพิ่งเซฟไปกลับเป็นค่าว่าง

**Fix:** `src/modules/app/app-import.js` — เพิ่ม merge block ใน `handleFiles` และ `handleAutoImportedFile` ทั้งสองจุด ให้ carry-over `remark`+`actionStatus` จาก record เดิมใน STATE มาก่อนบันทึกทับ (pattern เดียวกับ tag-merge ที่มีอยู่แล้ว)

**Version collision ระหว่างทาง:** ตั้งชื่อ fix นี้เป็น V29.81 ไว้ก่อน แต่ตอน push พบว่าเครื่องบ้านได้ใช้เลข V29.81 (lock-file fix, "เรื่องที่ 5") ไปแล้ว และไปต่อถึง V29.82 (canonical-times fix, `51ec9d2`) บน `origin/main` — rebase local commit มาต่อบน `origin/main` แล้ว **renumber เป็น V29.83** เพื่อไม่ให้ชนกัน

**ไฟล์ที่แก้:** `src/modules/app/app-import.js`, `index.html` (title + label "System Version") — bump เป็น **V29.83**

**การยืนยัน:** เครื่อง Office นี้ **ไม่มี Node.js/npm ติดตั้งอยู่เลย** (`npm`/`node` หาไม่เจอทั้งใน bash และ PowerShell ไม่มี `node_modules`/`dist`) จึงรัน `npm run dev` ไม่ได้ — ทดสอบผ่าน browser (Claude in Chrome) แทน โดยตั้ง local Python static server ชั่วคราว (map `/vendor/*` → `public/vendor/*` เลียนแบบ Vite dev server) import ไฟล์ log sheet จริง (`P1-F-2002-22 (11-08-26) (Digital).xlsm`) → กรอก remark → re-import ไฟล์เดิมซ้ำ → ยืนยันว่า remark ไม่หายทั้งในการ์ด dashboard และใน Infographic Report (ทั้ง Card และ Table layout) — ผ่านหมด ปิด server แล้วหลังทดสอบเสร็จ **ยังไม่ได้รัน `npm test` (Vitest suite) เพราะไม่มี npm บนเครื่องนี้** — ควรรันที่เครื่องบ้านเพื่อ double-check ว่า suite ผ่านปกติ (แม้ fix นี้จะไม่แตะไฟล์ที่มี test coverage ก็ตาม)

**Commit:** `401e500` "Preserve Resolution Remark across re-import (V29.83)" — 2 ไฟล์ (`index.html`, `src/modules/app/app-import.js`) — **push ขึ้น `origin/main` แล้ว**

**สถานะ:** แก้เสร็จ + commit + push แล้ว **แต่ยังไม่ได้รัน automated test suite (`npm test`) เพื่อยืนยัน** — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 6

---

## ✅ เรื่องที่ 8 — Housekeeping: ลบไฟล์ sample log sheet ที่ค้างสถานะ deleted — เครื่อง Office

`git status` ค้างสถานะ `D "Log sheet 08-3-26.xls"` มาหลาย commit ก่อนหน้า โดยไม่มีสำเนาไฟล์อยู่บน disk ที่ไหนแล้ว — พี่ A ยืนยันให้ commit การลบ ยังกู้คืนได้จาก git history เดิมที่ commit `f3fdab4` ถ้าต้องการในอนาคต

**Commit:** `51f102b` "Remove stale sample log sheet no longer present on disk" — 1 ไฟล์ — **push ขึ้น `origin/main` แล้ว**

---

## 🚧 ค้างอยู่ตรงไหน

1. **V29.81 fix (เรื่องที่ 5) ยังไม่ได้ยืนยันในสภาพแวดล้อมจริง** — ทดสอบแค่กับ temp folder จำลองที่เครื่องบ้าน ยังไม่เคยทดสอบกับ watch folder จริง (`D:\PTA COMMONT WORK\Log sheet Digital`) บนเครื่องที่มีจริง และยังไม่เคยทดสอบกับ Excel ตัวจริงที่เปิดไฟล์ค้างไว้จริงๆ (จำลองด้วย `FileShare.None` เท่านั้น) — แนะนำให้ยืนยันที่เครื่อง Office (หรือเครื่องไหนก็ตามที่มี watch folder จริง) ว่า auto-import/auto-archive ยังทำงานต่อได้ปกติขณะ log sheet เปิดค้างอยู่ใน Excel เพราะนั่นคือเงื่อนไขที่พังมาก่อน
2. **ยังไม่ได้เช็ค GitHub Actions deploy status ของ commit ล่าสุด (`51f102b`)** — เช็คได้ที่ https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions ก่อนสรุปว่า production ขึ้น V29.83 แล้วจริง
3. **บั๊กเล็กๆ ที่เจอแต่ยังไม่ได้แก้ (cosmetic, ไม่เร่งด่วน):** `index.html` บรรทัดราว 274 มี badge UI hardcode ข้อความ "V29.52 Strict Numeric Core" ที่ไม่เคยอัปเดตมาตั้งแต่ V29.52 (ผ่านมาแล้วหลายเวอร์ชัน ปัจจุบัน V29.83 ก็ยังขึ้น V29.52 อยู่)
4. **รายการค้างเก่าจาก session ที่เครื่อง Office (22416d8 เป็นต้นไป) — ยังไม่ได้ตรวจสอบซ้ำใน session นี้ ให้ถือว่ายังค้างอยู่จนกว่าจะมีหลักฐานใหม่:**
   - สูตร Hyperlink (`=HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", ...)`) ยังไม่ได้แปะในไฟล์ log sheet จริง
   - Task Scheduler (Specific-user, ผูก `PTTGC\26007294`) ยังไม่ได้ยืนยันด้วยการ log off/log on จริงว่า auto-start ทำงาน
   - เศษโฟลเดอร์ `.git` ว่างเปล่าค้างที่ `C:\Users\26007294\Monitor log sheet boardman\.git` ยังไม่ได้ลบ
   - **หมายเหตุสำคัญ:** commit `1e99d15` ("Document Excel Bridge multi-user setup") ที่อยู่ใน 10 commits ที่ pull เข้ามา *อาจจะ* เป็น doc commit ที่ HANDOFF.md ฉบับเก่าพูดถึงว่า "รอ commit อยู่" (เรื่องที่ 3) ไปแล้วก็ได้ — **ยังไม่ได้ตรวจสอบยืนยัน** ให้คนที่รับงานต่อลอง `git show 1e99d15 --stat` เทียบเนื้อหาเองก่อนสรุปว่าตรงกัน อย่าเดาเอาว่าตรงแน่นอน
5. **bridge บนเครื่องบ้าน (4000D) ยังรันแบบ manual** เหมือนเดิม (ยังไม่ได้ตั้ง Task Scheduler ที่นี่)
6. **V29.83 fix (เรื่องที่ 7) ยังไม่ได้รัน `npm test` (Vitest suite) เลย** — เครื่อง Office ไม่มี Node.js/npm ติดตั้ง ยืนยันแค่ manual ผ่าน browser เท่านั้น ควรรัน `npm test` ที่เครื่องบ้าน (หรือเครื่องที่มี Node.js) เพื่อ double-check ว่ายังผ่านครบ 49/49 เหมือนเดิม
7. **commit `51ec9d2` (V29.82, canonical-times fix) ไม่เคยมีการบันทึกรายละเอียดใน HANDOFF.md เลย** มีแค่ commit message ที่เห็นจาก `git log`/`git show --stat` — ถ้าใครที่เครื่องบ้านมีบริบทเพิ่มเติมของ session ที่ทำ V29.82 ควรเติม entry ย้อนหลังให้ครบ
8. **เครื่อง Office (`26007294`) ไม่มี Node.js/npm ติดตั้งอยู่เลย** — ถ้าจะ dev/test ต่อบนเครื่องนี้ในอนาคตต้องติดตั้ง Node.js ก่อน (การตั้ง static server ชั่วคราวแบบที่ทำใน "เรื่องที่ 7" ใช้ตรวจ UI ได้เท่านั้น ไม่ครอบคลุม Vitest suite)

---

## 🎯 ขั้นตอนถัดไปที่ตั้งใจจะทำ

1. ยืนยัน V29.81 fix กับ watch folder จริง + Excel ตัวจริงเปิดไฟล์ค้างไว้ (ที่เครื่อง Office หรือเครื่องที่มี path จริง)
2. เช็คสถานะ GitHub Actions ของ commit ล่าสุด (`51f102b`)
3. `git show 1e99d15 --stat` เช็คว่า "เรื่องที่ 3" เดิม (doc changes ของ Hyperlink/multi-user setup) commit ไปแล้วจริงหรือยัง
4. ถ้ายังไม่ได้ทำ: แปะสูตร Hyperlink ในไฟล์ log sheet จริง, ทดสอบ Task Scheduler ด้วย log off/log on จริง, ลบเศษ `.git` ค้างที่เครื่อง Office
5. (ไม่เร่งด่วน) แก้ badge "V29.52" ที่ค้างใน `index.html` บรรทัดราว 274 ให้ตรงเวอร์ชันปัจจุบัน
6. รัน `npm test` ที่เครื่องบ้าน (หรือเครื่องที่มี Node.js) เพื่อ double-check ว่า V29.83 fix (เรื่องที่ 7) ไม่ทำ suite เดิม (49/49) พัง
7. ถ้าจะพัฒนาต่อที่เครื่อง Office ในอนาคต ให้ติดตั้ง Node.js ก่อน
8. พิจารณาเติม entry ย้อนหลังของ V29.82 (`51ec9d2`) ใน HANDOFF.md ให้ครบถ้วน (ตอนนี้มีแค่ commit message)

---

## ⚠️ ข้อควรระวัง / สิ่งที่ต้องไม่ลืม

- ฟีเจอร์ sync remark กลับ Excel **ใช้ไม่ได้เลยถ้า `bridge/excel-bridge.ps1` ไม่ได้รันอยู่** — Web App จะแจ้งสถานะ "ไม่พบ Local Bridge" ให้ operator ทราบ ไม่ fail เงียบๆ (ข้อมูลใน Web App เองไม่หาย แค่ไม่ sync กลับ Excel)
- **ต้องเปิดไฟล์ log sheet ต้นฉบับค้างไว้ใน Excel ก่อน** ถึงจะ sync/auto-import/auto-archive ได้ — bridge หา workbook จาก "ชื่อไฟล์ที่เปิดอยู่ใน Excel" ไม่ใช่ path บนดิสก์ (browser ให้ path จริงไม่ได้)
- **หลัง V29.81:** `Resolve-SourceFile` กรองทั้งไฟล์ `(master)` และไฟล์ lock ของ Excel (`~$*`) แล้ว — ถ้าเจอ error "พบไฟล์มากกว่า 1 ไฟล์" อีก ให้เช็คว่ามีไฟล์ผู้สมัครจริงมากกว่า 1 ไฟล์ในโฟลเดอร์ (ไม่ใช่แค่ lock file) ก่อน
- ถ้าเจอ "ไม่พบไฟล์นี้เปิดอยู่ใน Excel" ทั้งที่เปิดไฟล์ถูกต้องแล้วจริงๆ **เช็ค Task Manager ก่อนว่ามี `EXCEL.EXE` มากกว่า 1 ตัวไหม** (อาจมีตัวที่ไม่มีหน้าต่างค้างอยู่จากการเปิด/ปิดไฟล์ก่อนหน้า) ปิดตัวที่ไม่มีหน้าต่างทิ้งแล้วลองใหม่
- อย่า commit ไฟล์ข้อมูลหน้างานจริง (`.xls`/`.xlsm`/PDF) ปนไปกับ commit โค้ด — gitignore ดักไว้อยู่แล้ว เช็ค `git status` ก่อน commit ทุกครั้ง
- `wrangler.jsonc`'s `name` (`monitor-log-sheet-boardman`) ห้ามเปลี่ยน — URL ฝังอยู่ใน Excel log sheet จริงผ่าน HYPERLINK formula
- แบรนด์เปลี่ยนจาก "Supasit.A" → **"A(i)CODER"** แล้วตั้งแต่ commit `64fae6a` — ถ้าจะเพิ่ม branding ใหม่ที่ไหน ให้ใช้ชื่อใหม่
- **หลัง V29.83:** re-import (ทั้ง manual drag-drop และ auto-import) จะ carry-over `remark`+`actionStatus` จาก record เดิมมาก่อนบันทึกทับเสมอ (`src/modules/app/app-import.js`) — ถ้าต้องการล้าง remark ของ record ใดจริงๆ ต้องลบ/แก้เองผ่าน UI (annotation modal) ไม่ใช่หวังพึ่งการ re-import ทับให้ว่าง
- **เครื่อง Office (`26007294`) ไม่มี Node.js/npm ติดตั้ง** — ตรวจสอบ/ติดตั้งก่อนถ้าจะรัน `npm run dev`/`npm test`/`npm install` ที่นี่ (session ที่ผ่านมาต้องใช้ local Python static server จำลองแทน ใช้ตรวจ UI ได้เท่านั้น)

---

## 🔧 คำสั่งที่ต้องรันก่อนทำงานต่อ

```bash
git pull
npm install   # ถ้ายังไม่เคยลงที่เครื่องนี้ หรือ package.json เปลี่ยน
npm test      # ควรผ่าน 49/49
```

> หมายเหตุ: เครื่อง Office (`26007294`) ยังไม่มี Node.js ติดตั้ง — ต้องติดตั้ง Node.js ก่อนถึงจะรันคำสั่งข้างบนได้จริงที่เครื่องนี้

รัน bridge (manual, ทดสอบก่อนตั้ง Task Scheduler):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "bridge\excel-bridge.ps1"
```

เช็คสถานะ deploy: https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions

---

## 🗂️ ประวัติ session ก่อนหน้า (เก็บไว้อ้างอิง — อาจมีบางส่วนซ้ำ/ล้าสมัยกับหัวข้อด้านบน)

<details>
<summary>คลิกเพื่อดู — session เครื่อง Office (22416d8 และก่อนหน้า) และเครื่องบ้าน (V29.74 Local Excel Bridge)</summary>

### เครื่อง Office — เรื่องที่ 1-3 (ย้าย repo, Task Scheduler, Hyperlink)

**เรื่องที่ 1 — Sync โค้ดล่าสุด:** `git pull` จาก `34a719e` → `27d4c37` ได้โฟลเดอร์ `bridge/` (V29.74) เข้ามา

**เรื่องที่ 2 — ย้าย repo จาก `C:\Users\26007294\...` ไป `D:\Monitor log sheet boardman`:** เพราะเครื่อง Office แต่ละ operator login คนละ Windows username จริง เก็บใต้ profile ส่วนตัวจะมีปัญหา NTFS permission + Task Scheduler ผูก account เดียว ย้ายไป `D:\` (local fixed drive, ไม่ใช่ network) ตั้ง NTFS permission ให้ `BUILTIN\Users` อ่าน+รันได้ ทดสอบ end-to-end จากที่ตั้งใหม่สำเร็จ (พี่ A ยืนยัน comment ขึ้นใน Excel จริง) — commit `1e99d15`

**เรื่องที่ 3 — Task Scheduler + Hyperlink สำหรับ operator คนอื่น:** Task Scheduler แบบ "Any user" โดนปฏิเสธ (account `pttgc\26007294` ไม่มีสิทธิ์ Admin) → ใช้ "Specific user" แทน (สำเร็จ, ผูกกับ `PTTGC\26007294`) + สร้าง `bridge/start-bridge.bat` ให้ double-click ได้ + อัปเดต `bridge/README.md` — สูตร Hyperlink ที่ต้องแปะเองในไฟล์ log sheet จริง:
```excel
=HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", "▶ เปิด Excel Bridge (กดตอนเริ่มกะ)")
```

### เครื่องบ้าน — V29.74 Local Excel Bridge (สำเร็จและยืนยันด้วยการใช้งานจริงแล้ว)

**ปัญหาต้นเรื่อง:** ฟีเจอร์ sync Resolution Remark กลับเป็น Excel comment ทำให้ไฟล์ export ไม่เหมือนต้นฉบับ — ไม่มีไลบรารี JS ฟรีตัวไหน (SheetJS, exceljs) เขียนไฟล์ log sheet จริงกลับได้ปลอดภัย (สูตร PI Datalink แบบ live พังหมด) → เปลี่ยนสถาปัตยกรรมให้ Excel ตัวจริงเขียนเองผ่าน `bridge/excel-bridge.ps1` (PowerShell + COM automation, listener ที่ `localhost:5175`)

**สถานะ:** ทดสอบ end-to-end ผ่านจริงครบวงจร (2026-08-10 ดึก) — comment ขึ้นใน Excel จริงสำเร็จ, `npm test` ผ่าน 35/35 (ตอนนั้น), deploy ขึ้น production ผ่าน GitHub Actions

</details>
</content>
