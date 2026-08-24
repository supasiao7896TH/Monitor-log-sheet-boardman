# HANDOFF — Plant Log Analyzer

## 📅 อัปเดตล่าสุด
2026-08-24 — เพิ่ม "เรื่องที่ 23" (V29.108, fix Bridge auto-open Excel ไม่โหลด PI DataLink Add-in ทำให้ค่าขึ้น `#NAME?`) — commit, push **และทดสอบหน้างานจริงยืนยันแก้ได้แล้ว** วันเดียวกัน (ต่างจาก "เรื่องที่ 22"/V29.107 ก่อนหน้าที่ยัง pending field test อยู่ — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 20 ซึ่งยังไม่เปลี่ยนสถานะ)
Branch: `main` | Commit ล่าสุดบน `origin/main`: `6d29af1` "Confirm V29.108 Bridge auto-open fix on real hardware" — **push แล้ว** (`git status` ตอนเขียนส่วนนี้: working tree clean)
เวอร์ชันแอปปัจจุบัน: **V29.108**
URL production จริง: **https://monitor-log-sheet-boardman.supasiao.workers.dev** (ยืนยันจาก `AllowedOrigins` ใน `bridge/excel-bridge.ps1` + output จริงของ Cloudflare deploy job ล่าสุด commit `3d4792a` — ลิงก์นี้ถูก embed ไว้ใน Excel log sheet ของโรงงานผ่านสูตร `HYPERLINK` ให้ operator กดเปิดแอป ห้ามเปลี่ยนชื่อ worker ใน `wrangler.jsonc` เด็ดขาดเพราะจะทำให้ลิงก์เดิมใน Excel ใช้ไม่ได้)
สูตร Hyperlink ที่ใช้งานจริงตอนนี้ในไฟล์ Excel log sheet (พี่ A ยืนยันเอง 2026-08-13):
```
=HYPERLINK("https://monitor-log-sheet-boardman.supasiao.workers.dev/", "@Open Plant Log Analyzer")
```
สูตร Hyperlink สำหรับเปิด Excel Bridge ที่ใช้งานจริงตอนนี้ (พี่ A ยืนยันเอง 2026-08-13 — label text อัปเดตจากที่เคยบันทึกไว้ที่ "เรื่องที่ 3" ด้านล่าง ซึ่งเป็น label เก่า "กดตอนเริ่มกะ" ไม่ใช่ label ปัจจุบันแล้ว):
```
=HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", "▶ เปิด Excel Bridge (กดก่อนจะ Update log sheet)")
```
> ตั้งแต่ V29.103 มีอีกช่องทางหนึ่งด้วย — ปุ่ม "เปิด Excel Bridge" ในตัว Web App เอง (ข้าง sync indicator, โชว์เฉพาะตอน LOCAL MODE) ยิง custom URI protocol `plantlogbridge://` ซึ่งต้อง double-click `bridge/register-protocol.reg` ที่เครื่องนั้นก่อนครั้งแรก (ลงทะเบียนใต้ `HKCU`, ไม่ต้องสิทธิ์ admin — ดู "เรื่องที่ 17" ด้านล่าง)

> ⚠️ **เหตุผลที่มี entry ย้อนหลัง (เรื่องที่ 10-11 ด้านล่าง):** เมื่อวันที่ 2026-08-12 ~19:37 น. (เวลาไทย) sa-handoff ตัวก่อนหน้ากำลังบันทึกสถานะ session ให้ แต่พี่ A ปิดเครื่องก่อนบันทึกเสร็จ ทำให้ HANDOFF.md ฉบับก่อนหน้า **ไม่มีข้อมูล 2 เรื่องที่เกิดขึ้นจริงแล้วบน `origin/main`**: (1) เรื่องที่ 10 — shared-DB sync ข้าม operator (V29.85, commit `bcfb16b`, push แล้วตั้งแต่ 2026-08-12 ~19:37 เวลาไทย) และ (2) เรื่องที่ 11 — แก้บั๊ก badge เวอร์ชันค้าง (commit `f1041e9`, push แล้ว 2026-08-13 ~09:56 เวลาไทย) — เพิ่ม entry ทั้งสองย้อนหลังใน session recovery นี้ โดยอ้างอิงจาก commit message/diff stat ผ่าน GitHub API เท่านั้น (ไม่มี local clone จึงไม่มีบริบทเพิ่มเติมนอกเหนือจากที่ commit message ระบุไว้ — ถ้าใครมีบริบทการทดสอบเพิ่มเติมของ 2 commit นี้ ควรเติมให้ครบ)
>
> ⚠️ ตอนเริ่ม session ที่เครื่อง Office (ก่อนหน้านี้) `git log` พบว่า `origin/main` ไปไกลกว่า header เดิมด้านล่าง (ซึ่งหยุดที่ `2b81b3b` / V29.81) อีก 1 commit ที่ไม่เคยถูกบันทึกเป็น entry ใน HANDOFF.md เลย: `51ec9d2` — **V29.82** "Fix canonical-times completeness reporting a future time slot as present" (แก้ `getCanonicalTimesStatus` ให้เทียบกับเวลาจริง ณ ปัจจุบันด้วย ไม่ใช่แค่เช็คว่ามี record ของ time slot นั้นหรือยัง กันไม่ให้ dashboard ขึ้น "ครบ 4 รอบเวลา" ก่อนเวลาจริงมาถึง) — **session นั้น (เครื่อง Office) ไม่ได้เป็นคนทำ V29.82** พบแค่จาก `git log`/`git show --stat` ตอนตรวจสอบก่อนเริ่มงาน ไม่มีบริบทเพิ่มเติมนอกจาก commit message เอง — ถ้าใครรับงานต่อและมีบริบทมากกว่านี้ ควรเติม entry ย้อนหลังให้ครบ
>
> ⚠️ **ช่องว่างเดียวกันเกิดซ้ำอีกครั้งกับ V29.95-101 (ดู "เรื่องที่ 15" ด้านล่าง):** เมื่อเริ่ม session นี้ (2026-08-23) `git log` พบว่า `origin/main` ไปไกลกว่า "เรื่องที่ 14" (ซึ่งหยุดที่ V29.94, commit `d124b58`) ไปแล้วถึง V29.101 (`f8ba9a3`) โดยไม่มี entry ใน HANDOFF.md เลยสักตัว — เพิ่ม "เรื่องที่ 15" ย้อนหลังโดยอ้างอิงจาก `git log --stat`/commit message เท่านั้น (ไม่มีบริบทการทดสอบ/การตัดสินใจระหว่างทางเพิ่มเติม เพราะ session ที่ทำจริงไม่ใช่ session ที่เขียน entry นี้) ส่วน V29.102-106 ("เรื่องที่ 16-20") เขียนจาก session นี้เองจึงมีบริบทเต็ม — และ "เรื่องที่ 15" เดิม (การตัดสินใจเรื่อง SQL/Cloud Database ที่ยังค้างอยู่ ไม่มีโค้ดเปลี่ยน) ถูกย้าย/renumber ไปเป็น **"เรื่องที่ 21"** ท้ายสุดของ session log แทน เพื่อไม่ให้ปนกับงานที่ทำเสร็จแล้วจริง
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

**สถานะ:** แก้เสร็จ + commit + push แล้ว **ยืนยันแล้วโดยอ้อมในสภาพแวดล้อมจริง** — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 1

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

**การยืนยัน:** เครื่อง Office นี้ตอนนั้น **ไม่มี Node.js/npm ติดตั้งอยู่เลย** (`npm`/`node` หาไม่เจอทั้งใน bash และ PowerShell ไม่มี `node_modules`/`dist`) จึงรัน `npm run dev` ไม่ได้ — ทดสอบผ่าน browser (Claude in Chrome) แทน โดยตั้ง local Python static server ชั่วคราว (map `/vendor/*` → `public/vendor/*` เลียนแบบ Vite dev server) import ไฟล์ log sheet จริง (`P1-F-2002-22 (11-08-26) (Digital).xlsm`) → กรอก remark → re-import ไฟล์เดิมซ้ำ → ยืนยันว่า remark ไม่หายทั้งในการ์ด dashboard และใน Infographic Report (ทั้ง Card และ Table layout) — ผ่านหมด ปิด server แล้วหลังทดสอบเสร็จ **ตอนนั้นยังไม่ได้รัน `npm test` (Vitest suite) เพราะไม่มี npm บนเครื่องนี้** — **อัปเดต 2026-08-23:** เครื่องนี้มี Node.js/npm ติดตั้งแล้ว และ `npm test` รันผ่าน 140/140 (รวม suite ที่ครอบคลุมไฟล์นี้โดยอ้อม) — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 6

**Commit:** `401e500` "Preserve Resolution Remark across re-import (V29.83)" — 2 ไฟล์ (`index.html`, `src/modules/app/app-import.js`) — **push ขึ้น `origin/main` แล้ว**

**สถานะ:** แก้เสร็จ + commit + push แล้ว + ยืนยัน `npm test` ผ่านแล้ว (2026-08-23)

---

## ✅ เรื่องที่ 8 — Housekeeping: ลบไฟล์ sample log sheet ที่ค้างสถานะ deleted — เครื่อง Office

`git status` ค้างสถานะ `D "Log sheet 08-3-26.xls"` มาหลาย commit ก่อนหน้า โดยไม่มีสำเนาไฟล์อยู่บน disk ที่ไหนแล้ว — พี่ A ยืนยันให้ commit การลบ ยังกู้คืนได้จาก git history เดิมที่ commit `f3fdab4` ถ้าต้องการในอนาคต

**Commit:** `51f102b` "Remove stale sample log sheet no longer present on disk" — 1 ไฟล์ — **push ขึ้น `origin/main` แล้ว**

---

## ✅ เรื่องที่ 9 — เพิ่ม Statistical Deviation detection แยกจาก hard-limit เดิม, opt-in ต่อ tag (V29.84) — เครื่อง Office

**โจทย์:** พี่ A แจ้งว่า Web App กำลังจะเข้ามาแทนการจดกระดาษด้วยมือ 100% (ข้อมูลไหลเข้าจาก PI Datalink ผ่าน Excel auto-import อัตโนมัติ 4 ครั้ง/วัน/tag) แต่ระบบตรวจจับ "ผิดปกติ" เดิมเช็คแค่ hard min/max/exact limit จาก sheet — บาง tag มี spec กว้างมาก (ตัวอย่างที่ยกมา: `TI-2301` spec 220-262) แต่ค่าจริงเสถียรแคบกว่ามาก (swing แค่ 253.4-254.1) ถ้าค่าตกมาที่ 238.7 (ยังอยู่ใน spec) ระบบเดิมจะไม่จับว่าผิดปกติ ทั้งที่จริงคือสัญญาณ sensor clogging

**แนวทางที่เลือก (คุยกับพี่ A แล้วก่อนเริ่ม):** เพิ่มเกณฑ์ตรวจจับตัวที่สอง "Statistical Deviation" — เทียบค่ากับ baseline ทางสถิติของ tag เอง (mean ± 3σ จาก causal, leave-one-out rolling window 120 samples ≈ 30 วัน ที่ 4 samples/วัน) แยกเป็น flag/badge คนละอันจาก hard-limit violation เดิม (ไม่ปนกัน) เปิดใช้แบบ **opt-in ต่อ tag** ผ่าน Tag Master (เหมือน `disableZeroShield`/`forceStandby` ที่มีอยู่แล้ว)

**Implementation:**
- `src/modules/shared.js` — เพิ่ม constants (`STAT_DEVIATION_WINDOW_SAMPLES=120`, `STAT_DEVIATION_MIN_SAMPLES=20`, `STAT_DEVIATION_SIGMA_K=3`) และ pure helper ใหม่ `computeCausalStatDeviation` (ring-buffer streaming mean/variance, causal/leave-one-out, กัน sample ที่ถูก flag แล้วไม่ให้ปนเข้า baseline pool ของตัวเอง)
- `src/modules/state.js` — เพิ่ม pass ที่สองใน `_recomputeFlags` ต่อจาก hard-limit check เดิม เฉพาะ tag ที่เปิด `enableStatDeviation`, skip tag แบบ Exact Value, เขียน `isStatDeviation`/`statZScore` กลับเข้า record — mutually exclusive กับ `isAbnormal` โดยธรรมชาติ (evaluate เฉพาะ record ที่ `isAbnormal===0 && !isStandby`)
- `src/modules/app/app-master.js` + `index.html` — checkbox opt-in ใหม่ใน Tag Master modal + badge `σ-BAND` ในตาราง
- `src/modules/app/app-dashboard.js` + `index.html` — badge/สีม่วงที่ 3 บน dashboard card (แยกจากแดง), counter card ใหม่ "Statistical Deviation", filter option ใหม่, default filter "Abnormal Only" ขยายให้ครอบคลุมทั้งสองแบบ (ห้าม operator พลาดเพราะดูแค่ Web App แล้ว), ปรับ `autoSelectCritical` ให้ครอบคลุม stat-deviation ด้วย
- `src/modules/app/app-report.js` — Infographic Report (Card+Table) แยกสีม่วงให้ stat-deviation ด้วย ไม่ให้โชว์เขียวปกติหลอกๆ
- `tests/shared.test.js` + `tests/state.test.js` (ไฟล์ใหม่) — test ครอบคลุม cold-start, causal/leave-one-out, baseline pool exclusion, std=0 edge case, window eviction, mutual exclusivity, filter integration

**Code review รอบเดียวก่อน commit (เรียก sa-code-reviewer เอง) เจอและแก้แล้ว:**
- **บั๊กจริง:** Time Breakdown bar (ปุ่มเวลาบนสุดของ dashboard) นับแค่ `isAbnormal` ไม่รวม `isStatDeviation` ทำให้ปุ่มโชว์ "OK" ทั้งที่มีรายการผิดปกติทางสถิติอยู่ — แก้ใน `app-dashboard.js`
- Test หนึ่งใน `state.test.js` ไม่ได้ isolate สิ่งที่อ้างว่าทดสอบจริง (เพราะ mutual-exclusivity ทำให้ผลลัพธ์เหมือนกันไม่ว่า guard จะมีหรือไม่) — แก้ให้ test ตรงกับพฤติกรรมที่สังเกตได้จริง พร้อม comment อธิบาย
- Infinity edge case ใน `autoSelectCritical` severity scoring (เมื่อ baseline คงที่เป๊ะ, std=0) — เพิ่ม clamp กัน `Infinity - Infinity = NaN` ทำให้ sort ไม่ deterministic
- Badge `σ-BAND` โชว์แม้ตอน tag เป็น Exact Value ที่ฟีเจอร์นี้ไม่มีผลจริง (state.js skip ไปเงียบๆ) — เพิ่มเงื่อนไข `eExact === null` ก่อนโชว์ badge กันสับสน
- อัปเดต `CLAUDE.md`/`AGENTS.md` ให้ตรงกับโครงสร้าง `_recomputeFlags` แบบ 2-pass ใหม่ (เดิม doc ยังพูดถึง `_deriveAbnormal` ที่เลิกใช้ไปแล้วตั้งแต่ V29.78 — doc drift ที่ค้างมานาน แก้พร้อมกันไปด้วย)

**การทดสอบ:** เครื่อง Office นี้ตอนนั้นไม่มี Node.js/npm เลย (ยืนยันซ้ำอีกครั้ง หา `node`/`npm` ไม่เจอทั้ง bash/PowerShell) จึง **ไม่ได้รัน `npm test` จริงทั้ง 2 รอบ** (ทั้งตอนเขียน test และตอน sa-code-reviewer ตรวจ) — ตรวจด้วย hand-trace ตัวเลขทีละ step แทน (ไม่พบข้อผิดพลาดทางคณิตศาสตร์) และทดสอบ end-to-end จริงผ่าน browser (Claude in Chrome) แทน: ตั้ง local Python static server ชั่วคราว (เลียนแบบ Vite dev server, map `/vendor/*` → `public/vendor/*`), สร้าง synthetic backup JSON (`STORAGE_ENGINE.importAll` format) ที่มี TI-2301 baseline 25 samples + ค่า anomaly 238.7 + ค่าหลุด hard-limit 300 แล้วใช้ "กู้คืนข้อมูล" (restore) โดย override `window.confirm`/`window.alert` ผ่าน `javascript_tool` ก่อน เพื่อไม่ให้ native dialog บล็อก session (เจอปัญหานี้จริงรอบแรก — tab หลุดค้าง ต้อง `tabs_close_mcp` แล้วเปิดใหม่) ยืนยันผ่านหมด: purple badge/card/filter/counter ถูกต้อง, Infographic Report (Card+Table) สีถูก, Tag Master badge ถูก, ไม่มี console error (นอกจาก "bridge unreachable" ที่ปกติเพราะไม่ได้รัน Local Bridge) — **อัปเดต 2026-08-23:** `npm test` รันผ่าน 140/140 บนเครื่องนี้แล้วเช่นกัน (รวม `tests/shared.test.js`/`tests/state.test.js` ที่มี describe block ของฟีเจอร์นี้) — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 9

**Commit:** `b6df8c8` "Add Statistical Deviation detection, opt-in per tag (V29.84)" — 10 files, 343 insertions — **push ขึ้น `origin/main` แล้ว** (`0a6d7e5..b6df8c8`)

**สถานะ:** แก้เสร็จ + commit + push แล้ว + ยืนยัน `npm test` ผ่านแล้ว (2026-08-23) และฟีเจอร์นี้ **ไม่ได้ opt-in ต่อ tag แบบเดิมแล้ว** — flip เป็น opt-out เปิดอัตโนมัติทุก tag ไปตั้งแต่ V29.92 (ดู "เรื่องที่ 12")

---

## ✅ เรื่องที่ 10 — Shared-DB sync ข้าม operator ผ่าน Local Bridge (V29.85) — บันทึกย้อนหลังจาก recovery session

**หมายเหตุสำคัญ:** entry นี้เขียนย้อนหลังโดย recovery session (2026-08-13) ที่ไม่มี local clone ของ repo อยู่เลย — สรุปจาก commit `bcfb16b` (commit message เต็ม + diff stat) ผ่าน GitHub API เท่านั้น ไม่มีบริบทการทำงาน/การตัดสินใจระหว่างทางเพิ่มเติมนอกเหนือจากที่ commit message ระบุไว้ ถ้าคนที่ทำ session จริงมีบริบทมากกว่านี้ ควรเติมให้ครบ

**ปัญหา:** แอปเป็น local-first (IndexedDB) แต่ PC ที่ทำงานมี operator หลายคน login คนละ Windows account จริง — IndexedDB ผูกกับ browser profile ต่อ account ทำให้ login account ใหม่เห็น dashboard ว่างเปล่า ไม่เห็นข้อมูล/remark ที่ operator คนก่อนกรอกไว้

**Fix:** ขยาย Local Bridge (`bridge/excel-bridge.ps1`) เพิ่ม route ใหม่ 2 อัน — `POST /save-shared-db` และ `GET /load-shared-db` เขียน/อ่าน JSON snapshot เต็มรูปแบบ (shape เดียวกับ backup/restore เดิม) ไปที่ shared file บนไดรฟ์ D: ของเครื่อง — browser pull snapshot ครั้งเดียวตอน init (เงียบๆ ก่อน `loadLocalData`) และ push แบบ fire-and-forget หลังทุกครั้งที่มีการแก้ข้อมูล เพื่อให้ operator ทุกคนเห็นข้อมูลเดียวกันไม่ว่าจะ login account ไหน มี sidebar indicator แสดงสถานะ sync แบบ real-time

**Guard ป้องกันปัญหา 2 แบบ:**
1. `init()` จะไม่ push เองเด็ดขาด — IndexedDB ว่าง/ใหม่ หรือ pull fail จะไม่มีทาง overwrite shared file ได้ มีแต่การแก้ข้อมูลจริงเท่านั้นที่ push
2. มี dirty-flag ใน localStorage ตาม track push ที่ fail (เช่นตอน bridge ปิดอยู่) — `init()` จะ retry push ที่ค้างก่อนจะยอมให้ pull ได้ กัน reload ทับข้อมูลที่ยังไม่ sync ด้วย snapshot เก่า

**การทดสอบ (ตามที่ระบุไว้ใน commit message):** ทดสอบกับ bridge instance ที่รันอยู่จริง round-trip ข้อมูล production จริง (301 tags/901 records) ระหว่าง 2 browser origin คนละตัว, ยืนยัน fallback ทำงานถูกต้องตอน bridge หยุดทำงาน, และเจอ+แก้บั๊กจริงระหว่างทดสอบ (`WriteAllText` เขียน UTF-8 BOM ทำให้ `ConvertFrom-Json` อ่านกลับไม่ได้)

**ไฟล์ที่แก้ (12 files, +341/-9):** `.gitignore`, `bridge/README.md`, `bridge/excel-bridge.ps1`, `index.html`, `src/modules/app/app-core.js`, `src/modules/app/app-countermeasure.js`, `src/modules/app/app-import.js`, `src/modules/app/app-master.js`, `src/modules/app/app-modal.js`, `src/modules/excel-sync.js`, `src/modules/shared.js`, `tests/excel-sync.test.js` — bump เป็น **V29.85**

**Commit:** `bcfb16b` "Add shared-DB sync across operators via Local Bridge (V29.85)" — **push ขึ้น `origin/main` แล้ว** (2026-08-12 ~19:37 น. เวลาไทย, ต่อจาก `b6df8c8`)

**สถานะ:** shipped + push แล้ว — **`tests/excel-sync.test.js` ยืนยันแล้วว่ารันผ่าน `npm test` จริง** (2026-08-23, เป็น 1 ใน 7 test files ที่ผ่านครบ 140/140 — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 12) แต่**การใช้งานจริงกับ operator หลายคนบน PC ที่ทำงาน (คนละ Windows account) หลัง deploy ยังไม่มีใครยืนยัน** — ยังเป็นรายการค้างอยู่ (ข้อ 13)

---

## ✅ เรื่องที่ 11 — Fix badge เวอร์ชันค้าง "V29.52" → "V29.85" (cosmetic) — บันทึกย้อนหลังจาก recovery session

บั๊กที่เคยบันทึกไว้ใน HANDOFF.md ฉบับก่อนหน้าว่า "ยังไม่ได้แก้": `index.html` มี badge UI hardcode ข้อความ "V29.52 Strict Numeric Core" ที่ไม่เคยอัปเดตมาตั้งแต่ V29.52 แม้เวอร์ชันจริงของแอปไปถึง V29.84/V29.85 แล้ว — **แก้เรียบร้อยแล้ว**

**Commit:** `f1041e9` "Fix stale version badge V29.52 -> V29.85 (cosmetic, tracked in HANDOFF.md)" — 1 ไฟล์ (`index.html`), +1/-1 — **push ขึ้น `origin/main` แล้ว** (2026-08-13 ~09:56 น. เวลาไทย)

**สถานะ:** แก้เสร็จ + commit + push แล้ว — **หมายเหตุ 2026-08-23:** badge จุดนี้ (header sparkles badge) หลุดค้างซ้ำอีกครั้งหลังจากนี้ (ที่ข้อความ "V29.85" คราวนี้) เพราะยังไม่เคยอยู่ใน checklist bump เวอร์ชันอย่างเป็นทางการ — แก้แล้วอีกรอบพร้อมเพิ่มเข้า checklist ถาวรที่ V29.98 (ดู "เรื่องที่ 15" ด้านล่าง, housekeeping `8d9e0ed`) กันไม่ให้หลุดซ้ำเป็นครั้งที่ 3

---

## ✅ เรื่องที่ 12 — Statistical Deviation เปิดอัตโนมัติทุก Tag + เพิ่ม Trend Warning tier (V29.92)

> ⚠️ **ช่องว่างที่พบก่อนเริ่ม entry นี้:** `git log` พบว่า `origin/main` ไปไกลกว่า "เรื่องที่ 11" (ซึ่งหยุดที่ V29.85) ไปแล้วถึง V29.90 (History view + Excel export สำหรับ abnormal records, persist AbnormalHistory แยก IndexedDB store) และ session นี้เองก็เพิ่งทำ V29.91 (copy infographic image เข้า Clipboard สำหรับวาง Excel ตรงๆ) มาก่อนหน้า entry นี้ — ทั้งสองไม่เคยถูกบันทึกเป็น entry ใน HANDOFF.md เลย มีแค่ commit message ที่เห็นจาก `git log` ถ้าใครมีบริบทเพิ่มเติมของ V29.86-V29.91 ควรเติม entry ย้อนหลังให้ครบ

**บริบท:** พี่ A ต้องการให้ฟีเจอร์ Statistical Deviation (V29.84, "เรื่องที่ 9") ทำงานอัตโนมัติทุก tag โดยไม่ต้องไปติ๊กเลือกทีละ tag เอง (เดิม opt-in ทำให้ในทางปฏิบัติไม่มี tag ไหนเปิดใช้งานจริงเลย — ดู item 10 ที่เพิ่งแก้ใน "ค้างอยู่" ด้านล่าง) และอยากให้ระบบตรวจจับ "แนวโน้มใกล้ออกนอก control" ได้ด้วย ไม่ใช่รอจนถึงจุด >3σ เต็มรูปแบบ

**สิ่งที่ทำ:**
1. **Flip opt-in → opt-out:** `MasterTags.enableStatDeviation` (opt-in) → field ใหม่ `MasterTags.disableStatDeviation` (opt-out, ตาม pattern `disableZeroShield` เดิม) — ใช้ field ใหม่แทนการ reinterpret field เดิม เพราะทุก Master row ที่มีอยู่จริงมี `enableStatDeviation: false` เขียนไว้ explicit อยู่แล้ว (save ทุกครั้งเขียนเสมอแม้ไม่ติ๊ก) reinterpret ตรงๆ จะพังทันที
2. **เพิ่ม Trend Warning tier ใหม่** — `isStatTrendWarning` + `trendReason` (`src/modules/shared.js` ฟังก์ชันใหม่ `computeCausalStatTrendWarning`, reuse zScore stream จาก `computeCausalStatDeviation` เดิม ไม่คำนวณ mean/std ซ้ำ) สอง rule เจอข้อใดข้อหนึ่งพอ: Rule A (`'PERSISTENT_2SIGMA'`) 2 ใน 3 จุดล่าสุดเกิน 2σ ฝั่งเดียวกัน, Rule B (`'MONOTONIC_RUN_UP'`/`'MONOTONIC_RUN_DOWN'`) 6 จุดล่าสุดไต่ระดับทิศทางเดียวติดกัน — severity ordering ใหม่: `isAbnormal` > `isStatDeviation` (>3σ) > `isStatTrendWarning` (ใหม่) > ปกติ, mutual exclusivity บังคับโดย construction เหมือนของเดิม
3. Surface tier ใหม่ครบทุกจุดที่ `isStatDeviation` เคยปรากฏ: dashboard (การ์ดที่ 5 สีฟ้า/cyan, `autoSelectCritical` scoring), Infographic Report (card+table), History view, `syncAbnormalHistory`, Excel-writeback export label, `SMART_AGENT.analyze()` (Thai text ใหม่อธิบาย z-score/trend reason), `#view-filter` เพิ่ม option `trend-warning`

**ไฟล์ที่แก้:** `src/modules/shared.js`, `src/modules/state.js`, `index.html`, `src/modules/app/app-master.js`, `src/modules/app/app-dashboard.js`, `src/modules/app/app-report.js`, `src/modules/app/app-core.js`, `src/modules/app/app-history.js`, `src/modules/app/app-export.js`, `src/modules/smart-agent.js`, `tests/shared.test.js`, `tests/state.test.js`, `CLAUDE.md`, `AGENTS.md` — bump เป็น **V29.92**

**การยืนยัน:** เขียน test ใหม่ครบ (`computeCausalStatTrendWarning` describe block ใน `tests/shared.test.js`, ปรับ `_recomputeFlags` integration tests ใน `tests/state.test.js` ให้ตรงกับ opt-out gate ใหม่) แต่ **เครื่องที่เขียน session นี้ไม่มี Node.js/npm ติดตั้งอยู่เลย — ยังไม่เคยรัน `npm test` จริงสักครั้ง** ยืนยันแค่ hand-trace logic เท่านั้น — **อัปเดต 2026-08-23:** `npm test` รันผ่าน 140/140 บนเครื่องนี้แล้ว (รวม `tests/shared.test.js`/`tests/state.test.js` ที่มี test ของฟีเจอร์นี้) — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 14 — ยังไม่ได้ทดสอบ UI จริงผ่าน `npm run dev` โดยเฉพาะสำหรับฟีเจอร์นี้ (Trend Warning card สีฟ้า) ในทุก session ที่ผ่านมา

**Commit:** `c5aa038` "Auto-enable Statistical Deviation for all tags, add Trend Warning tier (V29.92)" — 15 ไฟล์, +326/-71 — **push ขึ้น `origin/main` แล้ว** (ต่อจาก `7757c1f`)

**สถานะ:** โค้ด+test เขียนเสร็จ, commit+push แล้ว, **`npm test` ยืนยันผ่านแล้ว** (2026-08-23) — ยังไม่เคยทดสอบ UI จริงผ่าน browser สำหรับ Trend Warning card โดยเฉพาะ

---

## ✅ เรื่องที่ 13 — การ์ดสรุป Dashboard เป็นปุ่มกรองในตัว แทน dropdown `#view-filter` (V29.93)

**บริบท:** หลัง "เรื่องที่ 12" เพิ่ม Trend Warning tier แล้ว พี่ A สังเกตว่าหน้า "รายการพารามิเตอร์ (Log Data)" ที่ filter default `abnormal` รวมทั้ง 3 ประเภท (Abnormal/Stat Deviation/Trend Warning) ไว้ในลิสต์เดียวกันอาจดูปนกันจนแยกยาก — คุยกันหลายไอเดีย (จัดกลุ่ม section header ในลิสต์ / เพิ่มแถบ pill/tab ใหม่ / ทำให้การ์ดสรุปที่มีอยู่แล้วคลิกได้) พี่ A เลือกแบบสุดท้าย: **ให้การ์ดสรุป 5 ใบที่มีอยู่แล้วเหนือรายการทำหน้าที่เป็นปุ่มกรองในตัว** แทนที่จะเพิ่ม UI ใหม่ซ้ำซ้อน

**สิ่งที่ทำ:**
1. เพิ่ม `viewFilter` ค่าใหม่ `'hard-abnormal'` ใน `STATE._applyFilterSort` (`src/modules/state.js`) — กรองเฉพาะ `isAbnormal===1` แยกจาก filter `'abnormal'` เดิมที่ยังคงความหมาย "รวมทั้ง 3 ประเภท" (ใช้เป็น default เวลาไม่มีการ์ดไหน active)
2. ลบ `<select id="view-filter">` dropdown ออกจาก `index.html` ทั้งหมด — ตัด option `trend-warning` ที่เพิ่งเพิ่มใน "เรื่องที่ 12" ไปด้วย (ย้ายไปอยู่ที่การ์ดแทน)
3. การ์ด 4 ใบ (Data Points → `all`, Abnormalities → `hard-abnormal` ใหม่, Statistical Deviation → `stat-deviation`, Trend Warning → `trend-warning`) ได้ `id`/`data-filter`/`cursor-pointer` ใหม่ใน `index.html`; การ์ด Total Tags ไม่คลิกได้ (ไม่มีความหมายเป็น filter)
4. `APP.renderDashboard` (`src/modules/app/app-dashboard.js`) ผูก `onclick` ให้ทั้ง 4 การ์ดทุกครั้งที่ render, toggle ring highlight (`ring-2 ring-offset-2 ring-indigo-500`) ตามการ์ดที่ active อยู่จริง (`viewFilter` ตรงกับ `data-filter`) — **คลิกการ์ดที่ active ซ้ำ = ยกเลิกกรอง กลับไป `'abnormal'` (default รวม 3 ประเภท)** ทำให้ระบบ reactive เต็มที่ ไม่ต้อง poke DOM ค่า select แบบ manual เหมือนเดิมอีกแล้ว (ลบโค้ด sync ที่ `app-core.js`/`app-import.js` 2 จุดออกไปด้วย)
5. แก้ empty-state message ใน dashboard ให้ครอบคลุมทุก filter ที่เป็น "ประเภทความผิดปกติ" (`abnormal`/`hard-abnormal`/`stat-deviation`/`trend-warning`) ไม่ใช่เช็คแค่ `'abnormal'` แบบเดิม

**ไฟล์ที่แก้:** `index.html`, `src/modules/state.js`, `src/modules/app/app-dashboard.js`, `src/modules/app/app-core.js`, `src/modules/app/app-import.js`, `tests/state.test.js` — bump เป็น **V29.93**

**การยืนยัน:** เพิ่ม test ใหม่ใน `tests/state.test.js` สำหรับ filter `'hard-abnormal'` (แยกจาก `isStatDeviation` ถูกต้อง) — **อัปเดต 2026-08-23:** `npm test` รันผ่าน 140/140 แล้ว (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 14) แต่ **ยังไม่เคยทดสอบ UI จริงผ่าน browser เลย** ว่าคลิกการ์ดแล้ว ring highlight/filter ทำงานถูกต้อง โดยเฉพาะ toggle-off (คลิกซ้ำ) — ยังไม่มีข้อมูลยืนยันจาก session ใดเลยจนถึงตอนนี้ (session นี้ทดสอบ UI จริงหลายฟีเจอร์แต่ไม่ใช่ฟีเจอร์นี้โดยตรง — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 15)

**Commit:** `afb0593` "Make dashboard summary cards act as click-to-filter controls (V29.93)" — 7 ไฟล์, +75/-24 — **push ขึ้น `origin/main` แล้ว** (ต่อจาก `c5aa038`)

**สถานะ:** โค้ด+test เขียนเสร็จ, commit+push แล้ว, `npm test` ยืนยันผ่านแล้ว (2026-08-23) — **ทดสอบ UI จริงยังไม่เคยทำเลย** ยังเป็นรายการค้างอยู่ (ดู item 15 ใน "ค้างอยู่ตรงไหน")

---

## ✅ เรื่องที่ 14 — เปลี่ยน default view filter เป็น "Abnormalities" เท่านั้น (V29.94)

**บริบท:** หลัง "เรื่องที่ 13" พี่ A เห็นว่า default `'abnormal'` (รวม 3 ประเภท) ไม่ตรงจุดประสงค์หลักของแอป — อยากให้ default เห็นเฉพาะ Abnormalities (หลุด Min/Max จริง) ส่วน Stat Deviation/Trend Warning ให้กดการ์ดดูเองเมื่อสนใจ

**สิ่งที่ทำ:** เปลี่ยนค่า default/reset ทุกจุดจาก `'abnormal'` เป็น `'hard-abnormal'` (filter ที่มีอยู่แล้วจาก V29.93): ค่า default ใน `STATE.data` (`state.js`), ปุ่ม "ล้างฐานข้อมูล" (`app-core.js`), หลัง import สำเร็จ (`app-import.js`), และ toggle-off ตอนคลิกการ์ดที่ active ซ้ำใน `app-dashboard.js` (เดิมกลับไป `'abnormal'` รวม 3 ประเภท ตอนนี้กลับไป `'hard-abnormal'` แทน) — filter `'abnormal'` เดิมยังอยู่ในโค้ด ไม่ได้ลบ แค่ไม่มีจุดไหนตั้งค่าไปที่มันโดยตรงจาก UI แล้ว

**ไฟล์ที่แก้:** `src/modules/state.js`, `src/modules/app/app-dashboard.js`, `src/modules/app/app-core.js`, `src/modules/app/app-import.js`, `index.html` — bump เป็น **V29.94**

**การยืนยัน:** ไม่กระทบ `tests/state.test.js` เดิม (แต่ละ test set `viewFilter` เองผ่าน `beforeEach`/`STATE.set` โดยตรง ไม่พึ่งค่า default จาก `STATE.data`) — **อัปเดต 2026-08-23:** `npm test` รันผ่าน 140/140 แล้ว — ทดสอบ UI จริงยังไม่เคยทำ เหมือน "เรื่องที่ 12-13"

**Commit:** `d124b58` "Default the parameter list to Abnormalities only (V29.94)" — 6 ไฟล์, +23/-6 — **push ขึ้น `origin/main` แล้ว** (ต่อจาก `f277fae`)

**สถานะ:** โค้ดเขียนเสร็จ, commit+push แล้ว, `npm test` ยืนยันผ่านแล้ว (2026-08-23) — ทดสอบ UI จริงยังไม่เคยทำเหมือนเดิม

---

## ✅ เรื่องที่ 15 — Excel Bridge: ระบบ Rollover ไฟล์ log sheet รายวันอัตโนมัติ + ตรวจจับไฟล์ template ค้าง (V29.95–V29.101) — บันทึกย้อนหลัง

**หมายเหตุสำคัญ:** entry นี้ครอบคลุม 7 commits ฟีเจอร์ต่อเนื่องกัน (+housekeeping คั่นกลาง) เขียนย้อนหลังโดย sa-handoff session นี้ (2026-08-23) — **ไม่มีบริบทการทำงาน/การตัดสินใจระหว่างทางเพิ่มเติมนอกเหนือจาก commit message** เพราะเป็นงานที่ทำใน session ก่อนหน้า (2026-08-18 ถึง 2026-08-22 ตาม timestamp ของ commit) ไม่ใช่ session ที่เขียน entry นี้ — ถ้าใครมีบริบทเพิ่มเติม (โดยเฉพาะการทดสอบ) ควรเติมให้ครบ

**V29.95** (`d869583`, 2026-08-18) — ย้าย archive folder ของสำเนา log sheet ที่ auto-archive ไว้ ให้ไปอยู่ใต้ `$WatchFolder` เอง (`D:\PTA COMMONT WORK\Log sheet Digital\<Mmm yy>\`) แทนที่จะอยู่ใต้ folder ของ repo — ตามคำขอ operator พฤติกรรม subfolder รายเดือนเหมือนเดิม

**V29.96** (`000fd07`, 2026-08-18) — เพิ่ม route ใหม่ `/rollover-daily-file`: parse วันที่แบบ "(DD-MM-YY)" จากชื่อไฟล์ log sheet เมื่อวันที่ในเครื่องเลยวันที่ในชื่อไฟล์แล้ว จะ safety-archive ไฟล์เก่า, rename (SaveAs คง FileFormat เดิม) เป็นวันที่วันนี้ และเขียนวันที่วันนี้ลง `"BM 1"!W1` (cell ที่ขับสูตร PI Datalink) แทนที่ operator ต้อง rename+แก้ cell ด้วยมือทุกวัน — idempotent ต่อรอบ poll (ทุก 5 นาที ไม่มี trigger เที่ยงคืนตรงๆ) มีปุ่ม "Rollover เองตอนนี้" เป็น manual fallback/test path ด้วย

**V29.97** (`7baf197`, 2026-08-18) — แก้ปัญหา rollover เดิมต้องพึ่งให้ operator เปิดไฟล์ไว้ใน Excel ก่อนเอง (ไม่งั้น fail เงียบด้วย `no-file-open`) — `Handle-RolloverDailyFile` เปิดไฟล์เองผ่าน COM (`Find-OrOpenWorkbook`) ถ้ายังไม่มีใครเปิดไว้ ทำให้ rollover ข้ามคืนสำเร็จโดยไม่ต้องมีคนอยู่หน้าเครื่อง

**V29.98** (`0306a1c`, 2026-08-18) — ย้าย trigger การ rollover จากที่พึ่ง Web App poll ทุก 5 นาทีอย่างเดียว (พังถ้าไม่มีใครเปิด Web App ค้างไว้ข้ามคืน) มาให้ `excel-bridge.ps1` รัน `Handle-RolloverDailyFile` เองตอน bridge เริ่มทำงาน — เคยพิจารณา dedicated always-logged-in account + Task Scheduler แต่ปฏิเสธเพราะ shared PC ให้แต่ละ operator login/logout คนละ Windows account จริง บัญชี dedicated จะไปแย่ง port 5175 และมองไม่เห็น Excel session ของ operator คนอื่น

**Housekeeping ระหว่างทาง (คั่นระหว่าง V29.98-99, ไม่ bump version):**
- `13ab688` — บันทึกการตัดสินใจ (ไม่มีโค้ดเปลี่ยน) **ไม่** เพิ่ม setting ให้ browser ตั้ง path โฟลเดอร์เอง เพราะ Local Bridge ผูกกับเครื่องโดยตั้งใจ เปิดให้ browser สั่ง path เองจะกลายเป็นช่องโหว่ arbitrary file read/write — ถ้าต้องย้าย Bridge ไปเครื่องอื่นในอนาคต ให้แก้ `excel-bridge.ps1` ตรงๆ
- `8d9e0ed` — พบว่า badge เวอร์ชันเล็กที่หัวเว็บ (header sparkles badge, `index.html:282`) ค้างที่ข้อความ **"V29.85 Strict Numeric Core" มาตั้งแต่ V29.41–V29.97** (คนละจุดกับ badge "V29.52" ที่เคยแก้ไปแล้วใน "เรื่องที่ 11") เพราะไม่เคยอยู่ใน checklist bump เวอร์ชันที่บันทึกไว้ (checklist เดิมมีแค่ `<title>` กับ label "System Version") — แก้เป็น V29.98 แล้วเพิ่มเป็นจุดที่ 3 ใน checklist ของ `CLAUDE.md`/`AGENTS.md` กันหลุดซ้ำอีก
- `f1395ad` — เพิ่ม `tests/app-report.test.js` (235 บรรทัด) คลุม 3 pure function ใน `app-report.js` (`buildInfographicCardHTML`/`buildInfographicTableRowHTML`/`getReportData`) — ไฟล์เดียวใน `src/modules/app/*.js` (9 ไฟล์) ที่มี test ได้ เพราะที่เหลือแตะ DOM/IndexedDB/`alert` ตรงๆ ต้องใช้ jsdom

**V29.99** (`14c4a0f`, 2026-08-19) — Rollover เดิมเช็คแค่ "วันที่ในชื่อไฟล์ตรงกับวันนี้ไหม" ไม่ได้เช็คว่า Excel ยังเปิดไฟล์อยู่จริงไหม — พอเปลี่ยนกะ (~ทุก 12 ชม.) operator คนเดิม logout ทำให้ Excel/bridge process เดิมตายไปด้วย operator คนใหม่เปิด bridge ใหม่เจอว่าวันที่ตรงกันแล้ว (`already-current`) เลยไม่เช็คว่า Excel เปิดอยู่จริงไหม — เพิ่ม route แยก `/ensure-file-open` เช็คเฉพาะ "Excel เปิดไฟล์นี้อยู่ไหม" ไม่สนวันที่ เรียกทั้งจาก bridge startup (ตอน rollover เป็น no-op) และจาก `APP.init()` ทุกครั้งที่เปิด Web App

**Doc-only** (`24b460c`, ผ่าน PR #9, merge `5cc20a0`, 2026-08-21) — SaveAs ตอน rollover เก็บ cell comment เดิมไว้หมด (เพราะแต่ละ Tag ใช้ row เดิมซ้ำทุกวัน มีแค่สูตร PI Datalink ที่ดึงค่าใหม่) ทำให้ Resolution Remark comment ของเมื่อวานค้างอยู่กับไฟล์วันใหม่ — เพิ่ม `Clear-AppComments` ลบเฉพาะ comment ที่แอปเป็นคนเขียน (ไม่แตะ comment ที่ operator พิมพ์เอง) ทันทีหลัง SaveAs ตอน rollover จริง (commit ตัวนี้ authored โดย "Claude" ผ่าน PR flow แยกต่างหาก ไม่ใช่ local session ปกติ)

**V29.101** (`79535d1` + fix `f8ba9a3`, merge `e1f7347`, 2026-08-22) — สืบสวนเคสที่ Web App เปิดไฟล์แล้วเห็นข้อมูลของ 2026-08-14 ทั้งที่ชื่อไฟล์ถูกต้องสำหรับ 2026-08-22 — root cause: ไฟล์ถูก rename ถูกต้องแล้ว แต่มีอะไรบางอย่าง **นอกเหนือโค้ด repo นี้** เขียนทับเนื้อหาไฟล์ด้วยสำเนา (master) template แบบ byte-identical ในภายหลัง (แอป/bridge เช็คแค่วันที่ในชื่อไฟล์ ไม่เคยเช็คเนื้อหา error ที่ต่ำกว่า `open-failed` ถูกกลืนเงียบๆ ไม่มี UI แจ้งเตือนเลย) — เพิ่ม `Test-FileLooksLikeMasterTemplate` (เทียบขนาด + SHA256 กับ master template) surface ผ่าน `/source-file-info`, `/rollover-daily-file` (status ใหม่ `'stale-template'`), `/ensure-file-open` ให้ Web App โชว์ warning banner ทันทีแทนที่จะเงียบ และข้ามการ import เนื้อหา template เป็นค่าจริง — **fix ตามมาทันที** (`f8ba9a3`): `Test-FileLooksLikeMasterTemplate` เดิมใช้ `Get-FileHash` ตรงๆ ซึ่งเปิดไฟล์แบบไม่ share — ยืนยันสดกับ bridge จริงที่เครื่อง Office ว่าตอนไฟล์เปิดอยู่ใน Excel (สภาวะปกติทุกครั้งที่ check นี้มีความหมาย) `Get-FileHash` throw "process cannot access the file" แล้ว fail-open เป็น `false` เงียบๆ พลาดเคส stale-template ที่ตั้งใจจะจับพอดี — แก้โดยใช้ helper เดิม `Read-FileBytesShared` (เปิดแบบ `FileShare.ReadWrite`) แล้ว hash bytes ในหน่วยความจำแทน ยืนยันสดอีกครั้งว่าตรวจจับถูกต้องแล้ว

**ไฟล์ที่แก้ (รวมทั้งชุด V29.95-101):** `bridge/excel-bridge.ps1`, `bridge/README.md`, `index.html`, `package.json`, `src/modules/app/app-core.js`, `src/modules/excel-autoimport.js`, `tests/excel-autoimport.test.js`, `context.md`, `CLAUDE.md`, `AGENTS.md`

**การยืนยัน:** commit message ของ `f8ba9a3` ระบุชัดว่า "Verified live against the actual office-PC bridge" และ "Confirmed against the live bridge" — ยืนยันสดกับเครื่อง Office จริงอย่างน้อย 1 รอบสำหรับ V29.101 แต่ไม่มีข้อมูลยืนยันการทดสอบของ V29.95-99 นอกจาก commit message เอง (ไม่มีบริบทเพิ่มเติมเพราะ session ที่ทำไม่ใช่ session นี้)

**Commits:** `d869583`, `000fd07`, `7baf197`, `0306a1c`, `13ab688`, `8d9e0ed`, `f1395ad`, `14c4a0f`, `24b460c` (PR #9, merge `5cc20a0`), `79535d1`, (merge `e1f7347`), `f8ba9a3` — ทั้งหมด **push ขึ้น `origin/main` แล้ว**

**สถานะ:** shipped + push แล้วทั้งหมด — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 17-18 สำหรับรายการที่ยังต้องติดตาม (เฝ้าดู rollover/stale-template ต่อเนื่องอีกสักพัก)

---

## ✅ เรื่องที่ 16 — Auto-save log sheet ก่อนทุกรอบ poll ของ auto-import (V29.102) — เครื่อง Office, session นี้

**ปัญหา:** operator รายงานว่าค่าที่อ่านได้จาก PI Datalink ไม่ auto-sync เข้า Web App จนกว่าจะกด Ctrl+S เองใน Excel — root cause: สูตร PI Datalink คำนวณ/แสดงค่าใหม่สดบนหน้าจอตลอด แต่ **ไม่เขียนลงดิสก์จนกว่าจะ save** ส่วน `pollAutoImport` เช็คแค่ mtime ของไฟล์บนดิสก์เท่านั้น เลยไม่เห็นค่าที่เพิ่งอัปเดตจนกว่าจะมีคน save ไฟล์

**Fix:** bridge เซฟ workbook ที่เปิดอยู่เองที่จุดเริ่มต้นของทุกรอบ poll เมื่อมี unsaved changes ค้างอยู่ (ไม่รอ operator กด Ctrl+S)

**ไฟล์ที่แก้ (5 files, +109/-4):** `bridge/excel-bridge.ps1`, `index.html`, `src/modules/app/app-core.js`, `src/modules/excel-autoimport.js`, `tests/excel-autoimport.test.js` — bump เป็น **V29.102**

**Doc ตามมาทันที (`e9f15aa`):** ในคู่มือผู้ใช้ในแอป step 7 เดิมพูดถึงแค่ทิศทาง write-back remark กลับ Excel เท่านั้น ไม่เคยพูดถึงทิศทาง auto-import (ดึงค่าใหม่จาก log sheet เข้า Web App) และ auto-save fix ตัวนี้ที่ทำให้ทำงานได้โดยไม่ต้อง Ctrl+S เอง — เพิ่ม manual step ใหม่ครอบคลุมเรื่องนี้ เลื่อนเลข step backup/restore เดิมจาก 8 เป็น 9

**Commit:** `9bac710` "Auto-save Excel log sheet before each auto-import poll (V29.102)" — **push ขึ้น `origin/main` แล้ว**

**สถานะ:** shipped + push แล้ว — เป็นงานของ session นี้เอง (`Claude-Session: session_018svBnWMvQzCwuLkKZo5RnM`)

---

## ✅ เรื่องที่ 17 — ปุ่ม "เปิด Excel Bridge" ในหน้าเว็บผ่าน custom URI protocol (V29.103) — เครื่อง Office, session นี้

**ปัญหา:** browser เรียก `.bat`/`.exe` บนเครื่องตรงๆ จากหน้าเว็บไม่ได้ (ต่างจากสูตร Excel `HYPERLINK` ที่มีอยู่แล้วซึ่งเรียกจาก Excel ได้) — พี่ A อยากให้มีปุ่มเปิด bridge จากในตัว Web App เองด้วย ไม่ต้องสลับไปเปิดจาก Excel เท่านั้น

**Fix:** ลงทะเบียน custom URI protocol `plantlogbridge://` ใต้ `HKCU` (per-user registry hive, **ไม่ต้องสิทธิ์ admin**) ที่ map ไปเรียก `start-bridge.bat` — เพิ่มไฟล์ `bridge/register-protocol.reg` (ลงทะเบียน) และ `bridge/unregister-protocol.reg` (ถอด) ใหม่ — ปุ่ม "เปิด Excel Bridge" โชว์ในหน้าเว็บข้าง sync indicator เฉพาะตอนอยู่ LOCAL MODE (bridge ยังไม่ online) และซ่อนไปเองเมื่อ sync สำเร็จแล้ว

**ไฟล์ที่แก้ (5 files, +50/-3):** `bridge/README.md`, `bridge/register-protocol.reg` (ใหม่), `bridge/unregister-protocol.reg` (ใหม่), `index.html`, `src/modules/app/app-core.js` — bump เป็น **V29.103**

**การทดสอบ (ทำจริงใน session นี้):** ทดสอบ register/unregister ไฟล์ `.reg` จริงบน `HKCU` ของเครื่องนี้ (เครื่อง Office) + ทดสอบเปิด bridge ผ่าน protocol จริงสำเร็จ

**Commit:** `e050d81` "Add web-app button to launch Excel Bridge via custom URI protocol (V29.103)" — **push ขึ้น `origin/main` แล้ว**

**สถานะ:** shipped + push แล้ว, ทดสอบจริงบนเครื่องนี้แล้ว — **ข้อควรระวัง:** `HKCU` เป็น per-user hive ตามหลักการทั่วไปของ Windows registry — เครื่อง Office เป็น shared PC ที่ operator แต่ละคน login คนละ Windows account จริง (ดู "เรื่องที่ 2"/"เรื่องที่ 10") การลงทะเบียนที่ทำในเซสชันนี้ผูกกับ user account เดียวที่ทดสอบเท่านั้น — ยังไม่มีข้อมูลยืนยันว่า operator คนอื่นต้อง double-click `register-protocol.reg` เองก่อนใช้ปุ่มนี้ได้หรือไม่ (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 18)

---

## ✅ เรื่องที่ 18 — Auto-sync sidebar indicator หลังกดปุ่มเปิด bridge ไม่ต้องรีเฟรชหน้า (V29.104) — เครื่อง Office, session นี้

**ปัญหา:** ปุ่มจาก "เรื่องที่ 17" กดแล้วแค่ยิง protocol เปิด process bridge บนเครื่องเท่านั้น หน้าเว็บไม่มีทางรู้ว่า bridge ขึ้นมาสำเร็จหรือยัง operator ต้องรีเฟรชหน้าเองถึงจะเห็นสถานะเปลี่ยนเป็น SYNCED

**Fix:** ตอนกดปุ่ม นอกจากยิง protocol แล้ว เริ่ม probe เพิ่มทุก 1 วินาที (สูงสุด 15 วินาที) push/pull shared data และ poll auto-import ทันทีที่ bridge เริ่มตอบสนอง ไม่ต้องรอรอบ poll ปกติ (ทุก 5 นาที) หรือให้ operator รีเฟรชเอง

**ไฟล์ที่แก้ (2 files, +37/-3):** `index.html`, `src/modules/app/app-core.js` — bump เป็น **V29.104**

**การทดสอบ (ทำจริงใน session นี้):** ยืนยันด้วยข้อมูลจริงบนเครื่อง (4282 records) ว่า label sync indicator เปลี่ยนเป็น SYNCED ภายใน ~6 วินาทีหลังกดปุ่ม โดยไม่ต้องรีเฟรชหน้า

**Commit:** `ab21adc` "Auto-sync sidebar indicator after clicking Open Bridge, no reload needed (V29.104)" — **push ขึ้น `origin/main` แล้ว**

**สถานะ:** shipped + push แล้ว, ทดสอบจริงบนเครื่องนี้ด้วยข้อมูล production จริงแล้ว

---

## ✅ เรื่องที่ 19 — Default "รายการพารามิเตอร์ (Log Data)" ไปที่รอบเวลาปัจจุบันแทน All Time (V29.105) — เครื่อง Office, session นี้

**ปัญหา:** หน้า "รายการพารามิเตอร์ (Log Data)" เดิมเปิดมาแล้วโชว์ทุก record จากทุกวัน/ทุกเวลารวมกันเสมอ (`timeFilter = 'all'`) ทำให้ค่าล่าสุดของกะปัจจุบันจมอยู่ใต้ข้อมูลเก่าเยอะมาก

**Fix:** เพิ่ม `getDefaultTimeFilter` ใน `src/modules/shared.js` — reuse logic gating เดิมของ `getCanonicalTimesStatus` (ที่มีอยู่แล้วสำหรับ V29.82) เพื่อเลือกรอบเวลามาตรฐาน (03:00/09:00/15:00/21:00) **ล่าสุดที่ผ่านไปแล้วจริง** ตามเวลาปัจจุบัน — ใช้ค่านี้เป็น default ตอนเปิดหน้าเว็บครั้งแรก, หลัง import, และหลัง restore เท่านั้น **ไม่ override เวลาที่ operator เลือกเองระหว่างกะ**

**ไฟล์ที่แก้ (5 files, +82/-8):** `index.html`, `src/modules/app/app-core.js`, `src/modules/app/app-import.js`, `src/modules/shared.js`, `tests/shared.test.js` — bump เป็น **V29.105**

**การทดสอบ (ทำจริงใน session นี้):** ยืนยันด้วยข้อมูลจริงว่าเวลา 11:01 น. ระบบเลือกรอบเวลา 09:00 ของวันนั้นให้อัตโนมัติถูกต้อง + เพิ่ม test ใหม่ใน `tests/shared.test.js`

**Commit:** `c994d86` "Default Dashboard to the latest occurred time slot instead of All Time (V29.105)" — **push ขึ้น `origin/main` แล้ว**

**สถานะ:** shipped + push แล้ว, ทดสอบจริง 1 เคส (11:01→09:00) แล้ว — ยังไม่ครอบคลุม edge case อื่น (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 19)

---

## ✅ เรื่องที่ 20 — Fix บั๊ก duplicate bridge window ค้าง (V29.106) — เครื่อง Office, session นี้ (พบและแก้จริงระหว่าง session)

**ปัญหา (operator รายงานเข้ามาระหว่าง session นี้):** กดปุ่ม "เปิด Excel Bridge" (จาก "เรื่องที่ 17") ยิง protocol `plantlogbridge://` ทุกครั้งไม่ว่า bridge จะรันอยู่แล้วจริงหรือไม่ — ถ้า bridge รันอยู่แล้วแต่ sync indicator ยังตามไม่ทัน (เช่นเพิ่งกดไปหมาดๆ) การกดซ้ำจะ spawn instance ที่สองซึ่งชนกับ port 5175 เดิม เกิด unhandled exception แล้วค้างเป็นหน้าต่าง terminal สีดำรอ keypress อยู่เฉยๆ — operator รายงานว่าหน้าจอดำไม่หายไปเอง

**Fix:**
1. Click handler ของปุ่มเช็ค reachability ของ bridge ก่อนเสมอ เปิด instance ใหม่เฉพาะตอนที่ยืนยันแล้วว่า offline จริงเท่านั้น
2. `excel-bridge.ps1` wrap `$listener.Start()` ด้วย try/catch ให้ error message กรณีพอร์ตชนกันในอนาคต (เช่นถ้ามีจุดอื่นเรียกซ้ำจนหลุด guard ข้อ 1 ไปได้) อ่านง่ายเป็นภาษาธรรมดาแทน raw exception ที่ค้างหน้าต่างไว้เฉยๆ

**ไฟล์ที่แก้ (3 files, +59/-8):** `bridge/excel-bridge.ps1`, `index.html`, `src/modules/app/app-core.js` — bump เป็น **V29.106**

**การทดสอบ (ทำจริงใน session นี้):** ยืนยันว่ากดปุ่มตอน bridge ทำงานอยู่แล้วไม่มี process ใหม่เกิดขึ้นเลย (ไม่มี window ดำค้างซ้ำอีก)

**Commit:** `2b030e9` "Stop the Open Bridge button from launching a duplicate instance (V29.106)" — **push ขึ้น `origin/main` แล้ว**

**สถานะ:** shipped + push แล้ว, ทดสอบจริงบนเครื่องนี้ยืนยันแล้วว่าแก้ได้ — นี่คือเวอร์ชันปัจจุบันของแอป ณ ตอนเขียน HANDOFF.md entry นี้

---

## ✅ เรื่องที่ 22 — Fix autosave gate ที่พึ่ง `$wb.Saved` ซึ่งเชื่อไม่ได้กับ PI Datalink (V29.107) — บันทึกจาก session นี้ (dev sandbox ไม่มี Excel/PI Datalink จริง)

**ปัญหา (พี่ A รายงานเข้ามา 2026-08-23):** หลังใช้งานจริงต่อจาก V29.102 (autosave) พี่ A ยังต้องกดปุ่ม Save เองในหน้าไฟล์ Excel อยู่ดี ข้อมูลถึงจะเข้า Web App — ทั้งที่ V29.102 ทำมาเพื่อแก้ปัญหานี้โดยเฉพาะ

**Root cause ที่ตรวจพบ:** `Handle-AutosaveSourceFile` ใน `bridge/excel-bridge.ps1` เดิมเช็ค `if ($wb.Saved) { skip .Save() }` — โค้ดตั้งสมมติฐานไว้ว่า Excel จะ set `.Saved = $false` เองเมื่อสูตร PI Datalink refresh แล้วค่าเปลี่ยน แต่สมมติฐานนี้**ไม่เคยถูกทดสอบยืนยันจริง** (entry ของ V29.102 เองก็ไม่มี section "การทดสอบ" ต่างจาก entry อื่นๆ) — PI Datalink refresh ผ่าน external-data-link มักไม่ trigger COM dirty-flag แบบเดียวกับ manual cell edit ทำให้ `.Saved` ค้างเป็น `$true` ทั้งที่จอ Excel โชว์ค่าใหม่แล้ว → `.Save()` ไม่เคยถูกเรียกจริง → mtime ไฟล์ไม่ขยับ → `pollAutoImport` ฝั่ง Web App เห็นว่าไฟล์ "ไม่เปลี่ยน" ทุกรอบ ไม่เข้า `fetchSourceFile` เลย

**Fix:**
1. `bridge/excel-bridge.ps1` (`Handle-AutosaveSourceFile`): ถอด gate `$wb.Saved` ออก เรียก `$wb.Save()` แบบไม่มีเงื่อนไขทุกรอบ poll (ทุก ~5 นาที) แทน — ยอมแลก disk write ที่บางรอบไม่มีอะไรเปลี่ยนจริง เพื่อไม่ต้องพึ่ง COM property ที่พิสูจน์แล้วว่าเชื่อไม่ได้กับเคสนี้ (`.Save()` แค่ flush memory ลงดิสก์เหมือน Ctrl+S เป๊ะ ไม่มีความเสี่ยงข้อมูลหาย)
2. `src/modules/app/app-core.js` (`pollAutoImport`): เอา whitelist ที่กันไม่ให้ log สถานะ `'no-file-open'` ออก (log ทุก status ที่ไม่ใช่ `'ok'` แล้ว) + เพิ่ม banner แจ้ง operator ตรงๆ ถ้า bridge หาไฟล์เปิดอยู่ใน Excel ไม่เจอเลย — กันไม่ให้เกิดปัญหาแบบนี้ซ้ำแบบเงียบๆ วินิจฉัยไม่ได้อีก

**ไฟล์ที่แก้:** `bridge/excel-bridge.ps1`, `src/modules/app/app-core.js`, `index.html`, `HANDOFF.md`, `context.md` — bump เป็น **V29.107**

**⚠️ ยังไม่ได้ทดสอบกับ PI Datalink จริง** — dev sandbox นี้ไม่มี Excel COM + PI Datalink ให้ทดสอบ (มีแค่ `npm test` ยืนยันว่า JS-side pass-through logic เดิม (`tests/excel-autoimport.test.js`) ไม่พัง — ผ่าน 140/140 เหมือนเดิม, ไม่มี test ใหม่เพราะ logic ที่เปลี่ยนอยู่ฝั่ง PowerShell/COM ล้วนๆ ซึ่งอยู่นอกขอบเขตที่ Vitest แตะถึง) **ต้องให้พี่ A ยืนยันหน้างานจริงตาม `bridge/README.md`** ก่อนถือว่าจบ — ดู "🚧 ค้างอยู่ตรงไหน" ข้อใหม่ด้านล่างสำหรับ steps การ verify

**Commit:** `accf5a5` "Remove unverified $wb.Saved gate from Bridge autosave (V29.107)" — **push ขึ้น `origin/main` แล้ว** (พี่ A สั่ง commit ก่อนยืนยันหน้างานจริง)

**สถานะ:** shipped + push แล้ว — **ยังไม่ได้ทดสอบกับ PI Datalink จริงหน้างาน** (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 20 สำหรับ steps การ verify)

---

## ✅ เรื่องที่ 23 — Fix Bridge auto-open Excel ไม่โหลด PI DataLink Add-in ทำให้ค่าขึ้น `#NAME?` (V29.108) — บันทึกจาก session นี้ ยืนยันหน้างานจริงแล้ว

**ปัญหา (พี่ A รายงานเข้ามา 2026-08-24 พร้อมภาพหน้าจอ `Log055.png`):** ไฟล์ log sheet ที่ Bridge เปิดให้เองอัตโนมัติ (ตอนไม่มีใครเปิด Excel ค้างไว้ก่อน — bridge เพิ่ง startup หรือเปลี่ยนกะแล้วไม่มีใครเปิดไฟล์ไว้) ทุกช่องสูตร PI Datalink ขึ้น `#NAME?` หมด ทั้งที่ไฟล์บนดิสก์มีค่าถูกต้องอยู่

**วินิจฉัยสดกับพี่ A บนเครื่องจริง (ใช้ `AskUserQuestion` ตัดทฤษฎีทีละข้อก่อนสรุป root cause แทนการเดา):**
- Force Full Recalculate (`Ctrl+Alt+Shift+F9`) → **ไม่ช่วย** ตัดทฤษฎี "Add-in โหลดช้ากว่า Excel เปิดไฟล์ (race condition)" ทิ้ง
- Excel ที่ auto-open เป็น **Windows account เดียวกัน** กับที่พี่ A เปิดเองปกติทุกวัน → ตัดทฤษฎี "Add-in ไม่เคยถูก enable ต่อ account นี้" ทิ้ง
- **จุดชี้ขาด:** สังเกตจากภาพว่า Ribbon ของหน้าต่างที่ auto-open ไม่มีแท็บ "PI DataLink" โผล่มาเลย (มีแค่ File/Home/.../Automate/Developer) — พี่ A ยืนยันว่าเปิดเองแบบ double-click ที่เครื่อง/account เดียวกันนี้มีแท็บ PI DataLink ขึ้นทุกครั้ง

**Root cause:** `Find-OrOpenWorkbook` (`bridge/excel-bridge.ps1`) ตอนไม่มี Excel รันอยู่เลย สร้าง Excel session ใหม่ด้วย `New-Object -ComObject Excel.Application` ตรงๆ — COM Add-in อย่าง PI DataLink ไม่โหลดเข้า session ที่ถูกสร้างผ่านทางนี้ แม้ตั้งค่าให้โหลดอัตโนมัติไว้แล้วและเป็น account ที่ enable ไว้ถูกต้องก็ตาม (ต่างจากตอนเปิดผ่าน double-click ไอคอนจริงๆ ซึ่งผ่าน startup path ปกติของ Excel)

**Fix:**
1. เพิ่มฟังก์ชันใหม่ `Start-ExcelProcessAndAttach` — resolve path ของ `EXCEL.EXE` จาก registry (`HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\EXCEL.EXE`, key เดียวกับที่ Windows เองใช้ resolve จาก Start/Run), เปิดเป็น process จริงผ่าน `Start-Process` (เหมือน double-click ไอคอน ไม่ใช่สร้าง COM object ตรงๆ), แล้ว poll `GetActiveObject` รอ process ใหม่ขึ้นทะเบียนใน ROT (ทุก 1 วินาที สูงสุด 20 ครั้ง) — ถ้า resolve path ไม่ได้หรือรอ timeout ให้ fallback กลับไปพฤติกรรมเดิม (`New-Object -ComObject`) แทนที่จะ fail เฉยๆ กันเครื่องที่ theory นี้ไม่ตรงจากที่เคยใช้งานได้อยู่แล้วพัง
2. `Find-OrOpenWorkbook` เปลี่ยนไปเรียกฟังก์ชันใหม่นี้แทนตอนไม่เจอ Excel รันอยู่ — ใช้ร่วมกันทั้ง `/ensure-file-open` และ `/rollover-daily-file` (ทั้งคู่เรียก `Find-OrOpenWorkbook` เดียวกัน ได้ fix นี้ไปพร้อมกันโดยไม่ต้องแก้แยก)

**ไฟล์ที่แก้ (3 files, +47/-4):** `bridge/excel-bridge.ps1`, `index.html` (bump เป็น **V29.108** ทั้ง 3 จุด: title, sparkles badge, Manual view label), `context.md`

**✅ ทดสอบหน้างานจริงแล้ว (2026-08-24, วันเดียวกับที่แก้):** ปิด Bridge เดิมที่รันอยู่ (PID หาเจอผ่าน `Get-CimInstance Win32_Process` filter หา `excel-bridge.ps1` ใน CommandLine, ยืนยัน owner ของ port 5175 ด้วย) ให้พี่ A รันใหม่ผ่าน `start-bridge.bat` — หลัง Bridge เปิดไฟล์ log sheet ให้อัตโนมัติ พี่ A ยืนยันว่า **ค่าขึ้นแล้วและมีแท็บ PI DataLink บน Ribbon แล้ว** ตรงตามที่คาดไว้ 100%

**Commit:** `3975939` "Launch real EXCEL.EXE instead of raw COM object for auto-open (V29.108)", `6d29af1` "Confirm V29.108 Bridge auto-open fix on real hardware" — **push ขึ้น `origin/main` แล้วทั้งคู่**

**สถานะ:** shipped + push แล้ว + **ทดสอบหน้างานจริงยืนยันแก้ได้แล้ว** ไม่มีงานค้างสำหรับเรื่องนี้

**หมายเหตุ (ขอบเขตที่ยังไม่ทดสอบแยก):** เคสที่ทดสอบคือ scenario "ปิด Bridge แล้วเปิดใหม่ตอนไม่มี Excel รันอยู่เลย" (ตรงกับ `/ensure-file-open` ที่รันตอน bridge startup) — ยังไม่เคยทดสอบแยกกรณี `/rollover-daily-file` เรียก `Find-OrOpenWorkbook` เอง (เที่ยงคืนข้ามวันตอนไม่มีใครเปิด Excel ไว้เลย) ตรงๆ แต่ใช้ฟังก์ชันร่วมกันตัวเดียวกันเป๊ะ คาดว่าน่าจะแก้ได้เหมือนกัน — ควรเฝ้าสังเกตรอบเที่ยงคืนถัดไปว่าไม่มีปัญหาเช่นกัน (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 21 ใหม่ด้านล่าง)

---

### 📚 เอกสารที่อัปเดตไปแล้วในช่วง V29.95-106 (ไม่ใช่งานค้าง แค่บันทึกว่าทำแล้ว)

หลัง V29.106 มีอีก 2 commit doc-only ปิดท้าย session นี้ ไม่ bump เวอร์ชันแอป:
- `e376663` "Document excel-autoimport.js, excel-sync.js, and the bridge's V29.78-106 routes" — `CLAUDE.md`/`AGENTS.md` ไม่เคยแตะตั้งแต่ baseline V29.74 (write-remark) มาก่อน ทั้งโมดูล auto-import/auto-save/rollover และโมดูล shared-DB sync ข้าม operator ไม่เคยถูกบันทึกในเอกสารเลย และ route list ของ bridge ในเอกสารมีแค่ `/ping`/`/write-remark` ทั้งที่จริงมีเพิ่มอีก 6 route + ปุ่ม custom-protocol ไปแล้ว
- `50eedbf` "Record notable feature decisions from V29.78 through V29.106 in context.md" — `context.md` ไม่เคยแตะตั้งแต่ entry ของ V29.76 (card/table toggle) — เพิ่ม rationale ของ auto-import/auto-archive/rollover subsystem ทั้งชุด (V29.78-101), shared-DB sync (V29.85), stat-deviation opt-out + trend-warning tier (V29.92), dashboard click-filter cards (V29.93/94), และงานของ session นี้เอง (V29.102-106)

---

## 🚧 ค้างอยู่ตรงไหน

1. ~~**V29.81 fix (เรื่องที่ 5) ยังไม่ได้ยืนยันในสภาพแวดล้อมจริง**~~ — **ยืนยันแล้วโดยอ้อม (2026-08-23):** ระบบ auto-import/auto-archive/rollover (ที่พึ่ง `Resolve-SourceFile` เดียวกับที่ V29.81 แก้) ทำงานต่อเนื่องมาหลายสัปดาห์บนเครื่อง Office จริงตั้งแต่ V29.95 เป็นต้นมา รวมถึงมีการยืนยันสดกับ bridge จริงที่กำลังรันอยู่หลายรอบ (เช่น commit message ของ `f8ba9a3`: "Verified live against the actual office-PC bridge") — ไม่มีรายงานว่า auto-import/auto-archive ล้มเหลวเพราะ lock-file ปัญหาเดิมอีกเลย แต่ยังไม่มีการทดสอบแบบเจาะจงกรณีนี้ตรงๆ อีกครั้ง (เป็นการยืนยันทางอ้อมจากการใช้งานต่อเนื่อง ไม่ใช่การทดสอบซ้ำแบบตั้งใจ)
2. **ยังไม่ได้เช็ค GitHub Actions deploy status ของ commit ล่าสุด (`50eedbf`, V29.106)** — เช็คได้ที่ https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions ก่อนสรุปว่า production ขึ้น V29.106 แล้วจริง (เดิมข้อนี้อ้างถึง commit `f1041e9`/V29.85 เก่ามาก — อัปเดต reference เป็น commit ล่าสุดแล้ว)
3. ~~บั๊กเล็กๆ ที่เจอแต่ยังไม่ได้แก้ (cosmetic, ไม่เร่งด่วน): `index.html` badge UI hardcode ข้อความ "V29.52 Strict Numeric Core" ที่ไม่เคยอัปเดตมาตั้งแต่ V29.52~~ — **แก้แล้ว** commit `f1041e9` (2026-08-13) เปลี่ยนเป็น "V29.85 Strict Numeric Core" ดู "เรื่องที่ 11" ด้านบน (**หมายเหตุ:** badge จุดเดียวกันหลุดค้างซ้ำอีกครั้งที่ "V29.85" ในภายหลัง เพราะยังไม่เคยอยู่ใน checklist อย่างเป็นทางการ — แก้รอบ 2 แล้วที่ V29.98 พร้อมเพิ่มเข้า checklist ถาวรใน `CLAUDE.md`/`AGENTS.md` แล้ว ดู "เรื่องที่ 15", commit `8d9e0ed`)
4. **รายการค้างเก่าจาก session ที่เครื่อง Office (22416d8 เป็นต้นไป) — ยังไม่ได้ตรวจสอบซ้ำใน session นี้ ให้ถือว่ายังค้างอยู่จนกว่าจะมีหลักฐานใหม่:**
   - ~~สูตร Hyperlink (`=HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", ...)`) ยังไม่ได้แปะในไฟล์ log sheet จริง~~ — **แก้แล้ว/ยืนยันแล้ว** ดู header บนสุดของไฟล์นี้ — พี่ A ยืนยันเอง 2026-08-13 ว่าทั้งสูตรเปิดแอปและสูตรเปิด Bridge ใช้งานจริงอยู่ในไฟล์ log sheet แล้ว
   - Task Scheduler (Specific-user, ผูก `PTTGC\26007294`) ยังไม่ได้ยืนยันด้วยการ log off/log on จริงว่า auto-start ทำงาน — ยังไม่มีหลักฐานใหม่
   - เศษโฟลเดอร์ `.git` ว่างเปล่าค้างที่ `C:\Users\26007294\Monitor log sheet boardman\.git` ยังไม่ได้ลบ — ยังไม่มีหลักฐานใหม่ว่าลบแล้ว
   - **หมายเหตุสำคัญ:** commit `1e99d15` ("Document Excel Bridge multi-user setup") ที่อยู่ใน 10 commits ที่ pull เข้ามา *อาจจะ* เป็น doc commit ที่ HANDOFF.md ฉบับเก่าพูดถึงว่า "รอ commit อยู่" (เรื่องที่ 3) ไปแล้วก็ได้ — **ยังไม่ได้ตรวจสอบยืนยัน** ให้คนที่รับงานต่อลอง `git show 1e99d15 --stat` เทียบเนื้อหาเองก่อนสรุปว่าตรงกัน อย่าเดาเอาว่าตรงแน่นอน
5. **bridge บนเครื่องบ้าน (4000D) ยังรันแบบ manual** เหมือนเดิม (ยังไม่ได้ตั้ง Task Scheduler ที่นี่) — ยังไม่มีหลักฐานใหม่
6. ~~**V29.83 fix (เรื่องที่ 7) ยังไม่ได้รัน `npm test` (Vitest suite) เลย**~~ — **แก้แล้ว/ยืนยันแล้ว (2026-08-23):** เครื่องนี้มี Node.js/npm ติดตั้งแล้ว รัน `npm test` ผ่าน **140/140** (7 test files) ครบทุก suite รวมถึง suite ที่ครอบคลุมการทำงานของ import/re-import
7. **commit `51ec9d2` (V29.82, canonical-times fix) ไม่เคยมีการบันทึกรายละเอียดใน HANDOFF.md เลย** มีแค่ commit message ที่เห็นจาก `git log`/`git show --stat` — ถ้าใครที่เครื่องบ้านมีบริบทเพิ่มเติมของ session ที่ทำ V29.82 ควรเติม entry ย้อนหลังให้ครบ — ยังไม่มีหลักฐานใหม่
8. ~~**เครื่อง Office (`26007294`) ไม่มี Node.js/npm ติดตั้งอยู่เลย**~~ — **แก้แล้ว/ยืนยันแล้ว (2026-08-23):** เครื่องนี้ (ที่มี WatchFolder จริง `D:\PTA COMMONT WORK\Log sheet Digital` และ Task Scheduler ผูก `PTTGC\26007294` ทำงานอยู่จริง — ยืนยันว่าเป็น "เครื่อง Office" ตัวเดิม) **มี Node.js/npm ติดตั้งแล้ว** — ไม่ทราบว่าติดตั้งเองเมื่อไหร่หรือมีคนติดตั้งให้ระหว่างทาง ไม่มีข้อมูลยืนยันวันที่ติดตั้ง แต่ยืนยันแล้วว่าใช้งานได้จริงตอนนี้ (`npm test`/`npm install` รันสำเร็จ)
9. ~~**V29.84 (เรื่องที่ 9) — ทั้ง test suite เดิม (49 tests) และ test ใหม่ (`tests/shared.test.js` describe ใหม่, `tests/state.test.js` ทั้งไฟล์) ยังไม่มีใคร run จริงเลยด้วย `npm test`**~~ — **แก้แล้ว/ยืนยันแล้ว (2026-08-23):** รันแล้ว ผ่านหมดเป็นส่วนหนึ่งของ 140/140 ที่กล่าวในข้อ 6
10. ~~**Statistical Deviation feature (V29.84) ยังไม่ได้เปิดใช้กับ tag ไหนเลยในข้อมูลจริง** — default ปิดทุก tag ต้องไปติ๊ก `enableStatDeviation` เองผ่าน Tag Master ทีละ tag (เช่น TI-2301) ก่อนฟีเจอร์นี้จะเริ่มทำงาน~~ — **แก้แล้ว** V29.92 (ดู "เรื่องที่ 12" ด้านล่าง) flip เป็น opt-out เปิดอัตโนมัติทุก tag แล้ว
11. **Known limitation ของ Statistical Deviation ที่ตั้งใจไม่แก้ใน v1 (มี comment ในโค้ดแล้ว):** ถ้า process เปลี่ยน setpoint จริงถาวร (ไม่ใช่ fault) จะเกิด false-positive ต่อเนื่องจนกว่า window 120 samples จะเลื่อนผ่านครบ — mitigation ระยะสั้นคือปิด `disableStatDeviation` (เดิมชื่อ `enableStatDeviation` ก่อน V29.92) ชั่วคราวเองผ่าน Tag Master — ยังไม่แก้จนถึงตอนนี้ (V29.106) เช่นกัน (ยังเป็น known limitation อยู่ ไม่มีหลักฐานว่าเกิดขึ้นจริงในหน้างานหรือยัง)
12. ~~**V29.85 shared-DB sync (เรื่องที่ 10) — ยังไม่มีข้อมูลยืนยันว่า `tests/excel-sync.test.js` เคยรันผ่าน `npm test` จริงหรือไม่**~~ — **แก้แล้ว/ยืนยันแล้ว (2026-08-23):** `tests/excel-sync.test.js` เป็น 1 ใน 7 test files ที่รันผ่านครบใน `npm test` (140/140) แล้ว
13. **V29.85 shared-DB sync (เรื่องที่ 10) ยังไม่มีใครยืนยันการใช้งานจริงกับ operator หลายคนบน PC ที่ทำงานหลัง deploy** — commit message ยืนยันแค่ผลทดสอบ round-trip ระหว่าง browser origin 2 ตัว ไม่ใช่การใช้งานจริงกับ Windows account คนละ account บนเครื่อง Office — ยังไม่มีหลักฐานใหม่จาก session นี้
14. ~~**V29.92/V29.93 (เรื่องที่ 12-13) — `npm test` ยังไม่เคยรันจริงเลยทั้งสองรอบ**~~ — **แก้แล้ว/ยืนยันแล้ว (2026-08-23):** รันแล้ว ผ่านหมดเป็นส่วนหนึ่งของ 140/140 (ข้อ 6) — **หมายเหตุ:** ยืนยันได้แค่ว่า ณ ตอนนี้ (2026-08-23) test suite ทั้งหมดที่มีอยู่ผ่านหมด ไม่สามารถยืนยันย้อนหลังได้ 100% ว่าตอนที่เขียนแต่ละเวอร์ชันนั้น (V29.84/85/92/93) เคยรันผ่านจริงหรือยังในตอนนั้น
15. **V29.93 (เรื่องที่ 13) — ยังไม่เคยทดสอบ UI จริงผ่าน browser เลย** โดยเฉพาะพฤติกรรมคลิกการ์ด: ring highlight ขึ้นถูกการ์ด, คลิกซ้ำแล้วยกเลิกกรองกลับไป `hard-abnormal` (default หลัง V29.94) จริง, empty-state message ขึ้นถูกต้องครบทุก filter — ต้องเปิด `npm run dev` ทดสอบก่อนใช้งานจริง (session นี้ทดสอบ UI จริงหลายฟีเจอร์อื่น แต่ไม่ใช่ฟีเจอร์นี้)
16. **(เรื่องที่ 21 — เดิมคือเรื่องที่ 15) พี่ A ยังไม่ตัดสินใจว่าจะย้ายไป SQL/Cloud Database หรือไม่** — มี 3 ทางเลือกที่คุยกันไว้แล้ว (auto-backup เบาสุด / Firebase Firestore / Cloudflare D1 หนักสุด) รายละเอียด pros/cons เต็มอยู่ใน "เรื่องที่ 21" ท้ายไฟล์นี้ — session ถัดไปควรถามพี่ A ว่าคิดออกหรือยัง ก่อนเริ่มออกแบบอะไรในเรื่องนี้
17. **(ใหม่) V29.95-101 rollover subsystem (เรื่องที่ 15) — ยืนยันสดกับ bridge จริงแล้วอย่างน้อย 1 รอบสำหรับ V29.101 (stale-template) แต่ยังไม่มีการเฝ้าสังเกตระยะยาวต่อเนื่องหลายวัน/หลายรอบเที่ยงคืน** ว่า rollover ทำงานถูกต้อง 100% ทุกวันโดยไม่มี edge case ใหม่โผล่มา — โดยเฉพาะยังไม่ทราบแน่ชัดว่าอะไร "นอกเหนือโค้ด repo นี้" เป็นตัวเขียนทับไฟล์ด้วย (master) template ในเคสที่ V29.101 ไปเจอและแก้อาการปลายทาง ไม่ใช่ต้นตอ — ควรเฝ้าดูต่อว่าจะเกิดซ้ำไหม
18. **(ใหม่) V29.103 custom protocol handler (`plantlogbridge://`) ลงทะเบียนไว้ที่ `HKCU` ของ user ที่ทดสอบบนเครื่องนี้ในเซสชันนี้เท่านั้น** — เครื่อง Office เป็น shared PC ที่ operator แต่ละคน login คนละ Windows account จริง (`HKCU` เป็น per-user registry hive) ยังไม่มีข้อมูลยืนยันว่า operator คนอื่นต้อง double-click `bridge/register-protocol.reg` เองก่อนปุ่ม "เปิด Excel Bridge" จะใช้งานได้ในเครื่องเดียวกันหรือไม่ — ควรทดสอบข้าม account จริงก่อนบอกว่าใช้ได้กับทุกคน
19. **(ใหม่) V29.105 default time filter (`getDefaultTimeFilter`) ทดสอบจริงแค่ 1 เคส** (11:01 น. → เลือกรอบ 09:00 ให้ถูกต้อง) — ยังไม่ครอบคลุม edge case เช่น เวลาก่อนรอบ 03:00 แรกของวัน (ยังไม่มีรอบไหน "ผ่านไปแล้ว" เลยในวันนั้น) หรือกรณีไม่มี record ใดๆ อยู่เลย — มี test ใน `tests/shared.test.js` แล้วแต่ยังไม่ได้ตรวจ manual ผ่าน UI ในทุก edge case
20. **(สำคัญ) V29.107 autosave gate fix (เรื่องที่ 22) ยังไม่ได้ทดสอบกับ PI Datalink จริงเลย** — dev sandbox ไม่มี Excel COM + PI Datalink ให้ทดสอบ มีแค่ `npm test` ยืนยันว่า JS-side ไม่พัง (140/140) ต้อง verify หน้างานจริงตาม steps นี้ก่อนถือว่าจบ: (1) รัน `bridge/excel-bridge.ps1` บนเครื่องจริงที่เปิดไฟล์ log sheet ค้างไว้ใน Excel พร้อม PI Datalink ทำงานอยู่ (2) **ห้ามกด Ctrl+S เอง** ปล่อยให้ PI Datalink refresh ตามรอบปกติ (3) รอครบ 1 รอบ poll (5 นาที) (4) เช็คว่า reading ใหม่เข้า dashboard อัตโนมัติโดยไม่มีใครกด save เอง + เช็คไฟล์ไม่มีข้อมูลเสีย/`#NAME?` โผล่มา (5) ถ้าเป็นไปได้ลองทิ้งไว้เกินครึ่งกะดูว่า save ถี่ทุก 5 นาทีไม่ทำให้ Excel/PI มีปัญหาสะสม — **commit/push ไปแล้ว** (`accf5a5`, พี่ A สั่งก่อนยืนยันหน้างาน) ถ้าทดสอบแล้วเจอปัญหาต้องแก้เพิ่ม ให้เปิด commit ใหม่ทับ ไม่ใช่ amend
21. **(ใหม่, minor) V29.108 fix (เรื่องที่ 23) ยืนยันแล้วเฉพาะ scenario `/ensure-file-open` (bridge startup ตอนไม่มี Excel รันอยู่เลย)** — ยังไม่เคยเห็น `/rollover-daily-file` เรียก `Find-OrOpenWorkbook`/`Start-ExcelProcessAndAttach` ตัวเดียวกันนี้เอง (เที่ยงคืนข้ามวันตอนไม่มีใครเปิด Excel ไว้เลย) ทำงานจริงหลัง fix นี้ — คาดว่าน่าจะแก้ได้เหมือนกันเพราะใช้ฟังก์ชันร่วมกัน แต่ยังไม่มีหลักฐานตรงๆ ควรเฝ้าสังเกตรอบเที่ยงคืนถัดไป

---

## 🎯 ขั้นตอนถัดไปที่ตั้งใจจะทำ

1. ~~ยืนยัน V29.81 fix กับ watch folder จริง + Excel ตัวจริงเปิดไฟล์ค้างไว้ (ที่เครื่อง Office หรือเครื่องที่มี path จริง)~~ — ยืนยันแล้วโดยอ้อมจากการใช้งานต่อเนื่อง (ดู "ค้างอยู่ตรงไหน" ข้อ 1)
2. **เช็คสถานะ GitHub Actions ของ commit ล่าสุด (`50eedbf`, V29.106)** — https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions
3. `git show 1e99d15 --stat` เช็คว่า "เรื่องที่ 3" เดิม (doc changes ของ Hyperlink/multi-user setup) commit ไปแล้วจริงหรือยัง
4. ถ้ายังไม่ได้ทำ: ทดสอบ Task Scheduler ด้วย log off/log on จริง, ลบเศษ `.git` ค้างที่เครื่อง Office (สูตร Hyperlink แปะแล้วยืนยันแล้ว ตัดออกจากรายการนี้)
5. ~~(ไม่เร่งด่วน) แก้ badge "V29.52" ที่ค้างใน `index.html` ให้ตรงเวอร์ชันปัจจุบัน~~ — **ทำแล้ว** commit `f1041e9`, และแก้ badge รอบ 2 ("V29.85" ค้าง) แล้วที่ V29.98 (`8d9e0ed`) พร้อมเพิ่มเข้า checklist bump ถาวรกันหลุดซ้ำรอบ 3
6. ~~รัน `npm test` ที่เครื่องบ้าน (หรือเครื่องที่มี Node.js) เพื่อ double-check ว่า V29.83 fix (เรื่องที่ 7) ไม่ทำ suite เดิม (49/49) พัง~~ — ทำแล้ว 2026-08-23 ผ่าน 140/140
7. ~~ถ้าจะพัฒนาต่อที่เครื่อง Office ในอนาคต ให้ติดตั้ง Node.js ก่อน~~ — เครื่องนี้มี Node.js แล้ว ไม่ต้องทำอีก
8. พิจารณาเติม entry ย้อนหลังของ V29.82 (`51ec9d2`) ใน HANDOFF.md ให้ครบถ้วน (ตอนนี้มีแค่ commit message) — ยังไม่ได้ทำ
9. ~~**สำคัญที่สุด:** รัน `npm test` ที่เครื่องบ้าน (มี Node.js) เพื่อ confirm ชุด test ใหม่ของ V29.84/V29.85 ผ่านจริงและ suite เดิมไม่พัง~~ — ทำแล้ว 2026-08-23 ผ่าน 140/140 (บนเครื่อง Office ไม่ใช่เครื่องบ้าน แต่ยืนยันผ่านแล้วจริง)
10. ~~เปิดใช้ Statistical Deviation ผ่าน Tag Master ให้ tag ที่ต้องการจริง~~ — **ทำแล้ว** V29.92 flip เป็น opt-out เปิดอัตโนมัติทุก tag แล้ว
11. ยืนยันการใช้งานจริงของ shared-DB sync (V29.85) กับ operator หลายคนบน PC ที่ทำงานจริง (login คนละ Windows account) — ตรวจว่า sidebar sync indicator ขึ้นสถานะถูกต้องและข้อมูล/remark เห็นตรงกันข้ามคน login — **ยังไม่ได้ทำ**
12. ~~รัน `npm test` เพื่อยืนยัน test ใหม่ของ V29.92~~ — ทำแล้ว 2026-08-23 ผ่าน 140/140
13. **(ใหม่)** ทดสอบ UI จริงผ่าน `npm run dev` สำหรับพฤติกรรมคลิกการ์ด dashboard (V29.93/94): ring highlight, toggle-off กลับไป `hard-abnormal`, empty-state message — ยังไม่เคยทำเลยตั้งแต่ V29.93 (ดู "ค้างอยู่ตรงไหน" ข้อ 15)
14. **(ใหม่)** ถ้าจะให้ operator คนอื่นบนเครื่อง Office ใช้ปุ่ม "เปิด Excel Bridge" (V29.103) ได้ ให้แต่ละคน double-click `bridge/register-protocol.reg` เองครั้งเดียวตอน login ด้วย Windows account ของตัวเอง (เพราะ `HKCU` เป็น per-user) — ยังไม่ได้ทดสอบว่าจำเป็นจริงหรือไม่ ควรทดสอบข้าม account ก่อน
15. **(ใหม่)** เฝ้าสังเกตระบบ rollover รายวัน (V29.95-101) ต่อเนื่องอีกสักพักว่าไม่มี edge case ใหม่ โดยเฉพาะเคส stale-template ที่ยังไม่ทราบ root cause ที่แท้จริงว่าอะไรนอกเหนือโค้ด repo นี้เขียนทับไฟล์ด้วย template
16. พิจารณาว่าจะเดินหน้าเรื่อง SQL/Cloud Database ต่อไหม (ดู "เรื่องที่ 21" ท้ายไฟล์) — ถามพี่ A ก่อนว่าคิดออกหรือยัง
17. **(สำคัญที่สุด) ทดสอบ V29.107 autosave gate fix (เรื่องที่ 22, commit `accf5a5` push แล้ว) หน้างานจริงตาม steps ใน "🚧 ค้างอยู่ตรงไหน" ข้อ 20** — พี่ A สั่งให้ commit/push ไปก่อนแล้วโดยยังไม่ทดสอบหน้างาน ถ้าเจอว่ายังไม่แก้ปัญหา Ctrl+S ได้จริง ต้องสืบสวนต่อ (เช่น `.Saved` อาจไม่ใช่สาเหตุเดียว หรือมีปัจจัยอื่นที่ COM Save() เจอ) แล้วเปิด commit ใหม่ ไม่ใช่ amend
18. ~~**(ใหม่) ทดสอบ V29.108 Bridge auto-open fix (เรื่องที่ 23) หน้างานจริง**~~ — **ทำแล้ว/ยืนยันแล้ว (2026-08-24):** พี่ A ทดสอบทันทีวันที่แก้ ยืนยันค่าขึ้นถูกต้อง + แท็บ PI DataLink โผล่มาแล้ว — เหลือแค่เฝ้าสังเกตรอบเที่ยงคืนถัดไปว่า `/rollover-daily-file` (ยังไม่เคยเห็นเรียกใช้ fix นี้ตรงๆ) ทำงานถูกต้องเช่นกัน (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 21)

---

## ⚠️ ข้อควรระวัง / สิ่งที่ต้องไม่ลืม

- ฟีเจอร์ sync remark กลับ Excel **ใช้ไม่ได้เลยถ้า `bridge/excel-bridge.ps1` ไม่ได้รันอยู่** — Web App จะแจ้งสถานะ "ไม่พบ Local Bridge" ให้ operator ทราบ ไม่ fail เงียบๆ (ข้อมูลใน Web App เองไม่หาย แค่ไม่ sync กลับ Excel)
- **ต้องเปิดไฟล์ log sheet ต้นฉบับค้างไว้ใน Excel ก่อน** ถึงจะ sync/auto-import/auto-archive/rollover ได้ — bridge หา workbook จาก "ชื่อไฟล์ที่เปิดอยู่ใน Excel" ไม่ใช่ path บนดิสก์ (browser ให้ path จริงไม่ได้) — ตั้งแต่ V29.97/V29.99 bridge จะพยายามเปิดไฟล์เองผ่าน COM ให้อัตโนมัติถ้ายังไม่มีใครเปิดไว้ (`Find-OrOpenWorkbook`, เรียกจาก rollover ตอน bridge startup และจาก `/ensure-file-open` ทุกครั้งที่เปิด Web App) แต่ยัง "เปิดไฟล์ให้เอง" ได้เท่านั้น — ไม่ได้ช่วยกรณี Excel ปิดไปเลยระหว่างวันโดยไม่มี bridge process อยู่คอย trigger
- **หลัง V29.81:** `Resolve-SourceFile` กรองทั้งไฟล์ `(master)` และไฟล์ lock ของ Excel (`~$*`) แล้ว — ถ้าเจอ error "พบไฟล์มากกว่า 1 ไฟล์" อีก ให้เช็คว่ามีไฟล์ผู้สมัครจริงมากกว่า 1 ไฟล์ในโฟลเดอร์ (ไม่ใช่แค่ lock file) ก่อน
- ถ้าเจอ "ไม่พบไฟล์นี้เปิดอยู่ใน Excel" ทั้งที่เปิดไฟล์ถูกต้องแล้วจริงๆ **เช็ค Task Manager ก่อนว่ามี `EXCEL.EXE` มากกว่า 1 ตัวไหม** (อาจมีตัวที่ไม่มีหน้าต่างค้างอยู่จากการเปิด/ปิดไฟล์ก่อนหน้า) ปิดตัวที่ไม่มีหน้าต่างทิ้งแล้วลองใหม่
- อย่า commit ไฟล์ข้อมูลหน้างานจริง (`.xls`/`.xlsm`/PDF) ปนไปกับ commit โค้ด — gitignore ดักไว้อยู่แล้ว เช็ค `git status` ก่อน commit ทุกครั้ง
- `wrangler.jsonc`'s `name` (`monitor-log-sheet-boardman`) ห้ามเปลี่ยน — URL ฝังอยู่ใน Excel log sheet จริงผ่าน HYPERLINK formula
- แบรนด์เปลี่ยนจาก "Supasit.A" → **"A(i)CODER"** แล้วตั้งแต่ commit `64fae6a` — ถ้าจะเพิ่ม branding ใหม่ที่ไหน ให้ใช้ชื่อใหม่
- **หลัง V29.83:** re-import (ทั้ง manual drag-drop และ auto-import) จะ carry-over `remark`+`actionStatus` จาก record เดิมมาก่อนบันทึกทับเสมอ (`src/modules/app/app-import.js`) — ถ้าต้องการล้าง remark ของ record ใดจริงๆ ต้องลบ/แก้เองผ่าน UI (annotation modal) ไม่ใช่หวังพึ่งการ re-import ทับให้ว่าง — **ยกเว้น** ตอน rollover ข้ามวันจริง (V29.100/`24b460c`) ซึ่งตั้งใจลบเฉพาะ**คอมเมนต์ที่แอปเป็นคนเขียนใน Excel** ก่อนวันใหม่เริ่ม (ไม่แตะคอมเมนต์ของ operator เอง) — คนละกลไกกับ carry-over ใน IndexedDB
- **เครื่อง Office (`26007294`) มี Node.js/npm ติดตั้งแล้ว** (ยืนยัน 2026-08-23 — ต่างจากที่เคยบันทึกไว้ก่อนหน้าว่าไม่มี) — `npm run dev`/`npm test`/`npm install` รันได้ตรงบนเครื่องนี้แล้ว ไม่ต้องพึ่ง local Python static server จำลองอีกต่อไป
- **หลัง V29.84 (แก้ไขเพิ่มเติมโดย V29.92):** Statistical Deviation (`isStatDeviation`/`statZScore`) เป็นเกณฑ์แยกจาก hard-limit (`isAbnormal`) โดยตั้งใจ — mutually exclusive กัน (evaluate เฉพาะ record ที่ผ่าน hard-limit แล้วว่าไม่ผิดปกติ) **ตั้งแต่ V29.92 เปิดอัตโนมัติทุก tag แล้ว** (opt-out ผ่าน `master.disableStatDeviation`, ไม่ใช่ opt-in แบบเดิมอีกต่อไป) ไม่ทำงานกับ tag แบบ Exact Value และต้องมีข้อมูลอย่างน้อย 20 samples ก่อน baseline จะเริ่มมีผล (ไม่งั้น record จะไม่ถูก flag เพราะข้อมูลไม่พอ ไม่ใช่บั๊ก) — ถ้า process เปลี่ยน setpoint จริงถาวรจะเห็น false-positive ต่อเนื่องจนกว่า rolling window 120 samples จะเลื่อนผ่าน ให้ปิด `disableStatDeviation` ชั่วคราวถ้าเจอกรณีนี้ (known limitation ที่ยังไม่แก้ ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 11)
- **หลัง V29.85:** เปิดแอปแล้วอาจเห็น dashboard ดึงข้อมูลจาก shared snapshot บน D: มาทับ/ผสานกับ IndexedDB local ตอน init (pull แบบเงียบๆ ก่อน `loadLocalData`) — ถ้า bridge ปิดอยู่ ระบบจะ fallback ไปใช้ IndexedDB local เดิมโดยไม่ error แต่จะไม่ sync ข้าม operator จนกว่า bridge จะกลับมาออนไลน์ (มี dirty-flag ใน localStorage คอย retry push ที่ค้างเองอัตโนมัติ) — ยังไม่มีการยืนยันการใช้งานจริงกับ operator หลายคนบนเครื่อง Office หลัง deploy (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 13)
- **หลัง V29.93/94:** ไม่มี `<select id="view-filter">` dropdown แล้ว — filter ตอนนี้ควบคุมจากการคลิกการ์ดสรุป 4 ใบเหนือ dashboard เท่านั้น (`data-filter` attribute) ค่า default/reset คือ `'hard-abnormal'` (เฉพาะ Abnormalities จริง หลุด min/max) ไม่ใช่ `'abnormal'` (รวม 3 ประเภท) อีกต่อไป — ถ้าจะเพิ่ม filter ใหม่ในอนาคต ต้องผูก onclick ในการ์ดใหม่เอง ไม่มี dropdown ให้เพิ่ม option แล้ว
- **หลัง V29.95-99 (ระบบ Rollover):** log sheet จะถูก **rename ไฟล์อัตโนมัติ** (ชื่อไฟล์มีวันที่ฝังอยู่แบบ "(DD-MM-YY)") ทุกครั้งที่วันที่ในเครื่องเลยวันที่ในชื่อไฟล์ — ถ้าเห็นไฟล์ log sheet เปลี่ยนชื่อเองข้ามคืนโดยไม่มีใครทำ **นี่คือพฤติกรรมปกติที่ตั้งใจ ไม่ใช่บั๊ก** (แทนที่การ rename+แก้ cell `"BM 1"!W1` ด้วยมือของ operator เดิม) — bridge จะ archive สำเนาไฟล์เก่าไว้ที่ `$WatchFolder\<Mmm yy>\` ก่อนเสมอ (ตั้งแต่ V29.95 ย้ายมาอยู่ใต้ share `D:\PTA COMMONT WORK\Log sheet Digital` ไม่ใช่ใต้ repo แล้ว) และลบเฉพาะคอมเมนต์ที่แอปเขียนเองก่อนวันใหม่เริ่ม (V29.100)
- **หลัง V29.101:** ถ้าเห็น warning banner ใน Web App บอกว่าไฟล์ log sheet "ดูเหมือนเป็น template เปล่า" (stale-template) **อย่าเพิกเฉย** — แปลว่าเนื้อหาไฟล์บนดิสก์ถูกเขียนทับด้วยสำเนา (master) template จริง (ตรวจจากขนาดไฟล์ + SHA256 เทียบกับ master) แม้ชื่อไฟล์จะถูกต้องตามวันที่ก็ตาม แอปจะไม่ import เนื้อหานั้นเป็นค่าจริงให้ — ต้นตอที่แท้จริงว่าอะไรไปเขียนทับยังไม่ทราบแน่ชัด (นอกเหนือโค้ด repo นี้) ถ้าเจอซ้ำควรรายงานรายละเอียดให้ครบเพื่อสืบต่อ
- **หลัง V29.102 (แก้เพิ่ม V29.107):** bridge auto-save workbook เองทุกรอบ poll (ทุก ~5 นาที) **แบบไม่มีเงื่อนไข** (V29.102 เดิมเช็ค `$wb.Saved` ก่อนแล้วข้าม save ถ้าไม่มีอะไรเปลี่ยน — พบว่าเชื่อไม่ได้กับ PI Datalink ถอดออกแล้วที่ V29.107 ดู "เรื่องที่ 22") — operator ไม่ต้องกด Ctrl+S เองอีกต่อไปเพื่อให้ auto-import เห็นค่าล่าสุด แต่หมายความว่า **ไฟล์จะถูกเซฟเองทุก ~5 นาทีเสมอโดยไม่มีใครสั่ง แม้ไม่มีอะไรเปลี่ยนจริง** ถ้าเห็น Excel เด้ง/save indicator ขึ้นเองโดยไม่มีใครกด นี่คือ bridge ทำงานปกติ ไม่ใช่บั๊ก — **ยังไม่ได้ยืนยันหน้างานจริงว่าแก้ปัญหา Ctrl+S ได้จริง** (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 20)
- **หลัง V29.103/104:** ปุ่ม "เปิด Excel Bridge" ในหน้าเว็บใช้ custom protocol `plantlogbridge://` ซึ่ง**ต้อง register ผ่าน `bridge/register-protocol.reg` ก่อนครั้งแรกต่อ 1 Windows user account** (ลงทะเบียนที่ `HKCU`) — ถ้า operator คนใหม่ (login คนละ account) กดปุ่มแล้วไม่มีอะไรเกิดขึ้นเลย ให้ตรวจสอบว่า register ให้ user นั้นแล้วหรือยัง (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 18 — ยังไม่เคยทดสอบข้าม account จริง)
- **หลัง V29.105:** "รายการพารามิเตอร์ (Log Data)" เปิดมาแล้ว **ไม่ใช่ All Time เป็น default อีกต่อไป** — ระบบจะเลือกรอบเวลามาตรฐานล่าสุดที่ผ่านไปแล้ว (03:00/09:00/15:00/21:00) ให้อัตโนมัติตอนเปิดหน้าครั้งแรก/import/restore เท่านั้น — ถ้า operator เปลี่ยน time filter เองระหว่างกะ ระบบจะไม่ไป override ค่านั้นทับจนกว่าจะมี trigger ใหม่ (import/restore/เปิดหน้าใหม่)
- **หลัง V29.106:** ปุ่ม "เปิด Excel Bridge" เช็ค reachability ก่อนเปิด instance ใหม่เสมอแล้ว — ถ้ายังเจอหน้าต่าง terminal ดำค้างซ้ำอีก **ให้ถือว่าเป็นบั๊กใหม่** ไม่ใช่อาการเดิมที่เคยแก้แล้ว ควรสืบสวนแยกจากเคสเดิม
- **หลัง V29.108:** ตอน Bridge ไม่เจอ Excel รันอยู่เลย (cold-start ตอน bridge เริ่ม/เปลี่ยนกะ) จะเปิด **`EXCEL.EXE` เป็น process จริง** (เหมือน double-click ไอคอน) แทนการสร้าง COM object ตรงๆ แบบเดิม — operator อาจเห็น Excel ขึ้นหน้า Start Screen/blank workbook สั้นๆ ก่อนไฟล์ log sheet จะเปิดตามมา (ต่างจากเดิมที่กระโดดไปเปิดไฟล์เลยทันที) **นี่คือพฤติกรรมปกติที่ตั้งใจ ไม่ใช่บั๊ก** — แลกมาเพื่อให้ PI DataLink Add-in โหลดได้ถูกต้อง (ดู "เรื่องที่ 23") ถ้า resolve path `EXCEL.EXE` จาก registry ไม่ได้หรือรอ attach เกิน 20 วินาที จะ fallback กลับไปพฤติกรรมเดิมอัตโนมัติ

---

## 🔧 คำสั่งที่ต้องรันก่อนทำงานต่อ

```bash
git pull
npm install   # ถ้ายังไม่เคยลงที่เครื่องนี้ หรือ package.json เปลี่ยน
npm test      # ควรผ่าน 140/140 (7 test files: excel-worker, excel-writeback, excel-sync, excel-autoimport, shared, state, app-report) — ยืนยันแล้วบนเครื่องนี้ (Office) 2026-08-23
```

> **อัปเดต 2026-08-23:** เครื่อง Office (`26007294`) มี Node.js/npm ติดตั้งแล้ว คำสั่งข้างบนรันได้ตรงบนเครื่องนี้เลย ไม่ต้องพึ่ง local Python static server จำลองอีกต่อไป (หมายเหตุเดิมที่บอกว่า "เครื่อง Office ไม่มี Node.js" ล้าสมัยแล้ว)

รัน bridge (manual, ทดสอบก่อนตั้ง Task Scheduler):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "bridge\excel-bridge.ps1"
```

ลงทะเบียน custom protocol ให้ปุ่ม "เปิด Excel Bridge" ในหน้าเว็บใช้งานได้ (V29.103, ครั้งเดียวต่อ Windows user account, ไม่ต้อง admin):
```
ดับเบิลคลิก bridge\register-protocol.reg
```
(ถอดออก: ดับเบิลคลิก `bridge\unregister-protocol.reg`)

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

---

## 💭 เรื่องที่ 21 (เดิมคือ "เรื่องที่ 15") — การตัดสินใจที่ยังค้างอยู่: ควรย้ายไป SQL/Cloud Database ไหม? (ยังไม่ตัดสินใจ ไม่มีโค้ดเปลี่ยนแปลง)

> ย้าย/renumber จาก "เรื่องที่ 15" มาเป็น "เรื่องที่ 21" ในการอัปเดต HANDOFF.md เมื่อ 2026-08-23 (sa-handoff) เพื่อไม่ให้ปนกับงานที่ทำเสร็จแล้วจริงของ V29.95-106 ("เรื่องที่ 15-20" ใหม่ด้านบน) — เนื้อหาข้างล่างนี้เหมือนเดิมทุกประการ ไม่มีอะไรเปลี่ยน เพราะพี่ A ยังไม่ได้ตัดสินใจเรื่องนี้เพิ่มเติมนับตั้งแต่บันทึกครั้งแรก

**คำถามที่พี่ A ถาม:** "เราเก็บข้อมูลไว้มากมายขนาดนี้ และเป็นข้อมูลรูปแบบเดิมๆ เราจะต้องทำ database SQL ไหม" — ตามด้วยเหตุผลที่แท้จริง 2 ข้อ: (1) อยากวิเคราะห์/ทำรายงานข้อมูลย้อนหลังแบบซับซ้อนกว่าที่ UI ปัจจุบันทำได้ และ (2) **กลัวว่าเครื่อง PC จะพัง หรือหมดสัญญาเช่า แล้วข้อมูลจะหายหมด**

**สิ่งที่เช็คแล้ว (ข้อเท็จจริงจากโค้ดจริง ไม่ใช่การเดา):**
- **IndexedDB (ข้อมูลหลัก):** อยู่ในเครื่อง PC เครื่องเดียว ผูกกับ browser profile ด้วย
- **Shared-DB sync (V29.85, `src/modules/excel-sync.js` + `bridge/excel-bridge.ps1`):** เขียนไปที่ `$SharedDbPath = "D:\Monitor log sheet boardman\shared-data\plantlog-shared-db.json"` ซึ่ง**เป็น drive เดียวกับเครื่องเดิม** — แก้ปัญหา operator login คนละ Windows account เห็นข้อมูลคนละก้อน แต่**ไม่ใช่ backup นอกเครื่อง**
- **ปุ่ม "สำรองข้อมูล" (`APP.backupData`, V29.51, `app-core.js`):** ดาวน์โหลดไฟล์ JSON ด้วยมือเท่านั้น (`STORAGE_ENGINE.exportAll()` → Blob → download) — ถ้า operator ไม่เอาไฟล์ไปเก็บที่อื่นเอง (OneDrive/network drive/USB) ก็ยังอยู่ในเครื่องเดิม
- **สรุป: ถ้าเครื่องนี้พัง/หมดสัญญาเช่าโดยไม่มีใครย้ายข้อมูลออกมาก่อน ข้อมูลหายจริงตามที่พี่ A กังวล** — เป็นช่องโหว่จริง เกิดจาก "ข้อมูลอยู่ที่เดียว ไม่มี copy นอกเครื่อง" ไม่ใช่ปัญหา SQL vs NoSQL

**3 ทางเลือกที่เสนอไป (เรียงจากเบาไปหนัก) — สรุปสั้น (รายละเอียด pros/cons เต็มอยู่ใน conversation ของ session ที่คุยกันครั้งแรก ยังไม่ได้ก็อปมาไว้ที่นี่ทั้งหมดเพราะยาวมาก):**

1. **Auto-backup ออกนอกเครื่อง** (เช่น สำรองอัตโนมัติไปโฟลเดอร์ OneDrive/network drive ที่ sync อยู่แล้ว) — เบาสุด ไม่แตะสถาปัตยกรรม แก้เฉพาะปัญหาข้อมูลหาย ไม่ช่วยเรื่อง reporting
2. **Firebase Firestore** — cloud จริง, ตรงกับ roadmap เดิมของพี่ A เอง (`vibe-coding-firebase` skill), แก้ปัญหาข้อมูลหายได้ + multi-device real-time แต่ยังไม่ใช่ SQL เต็มรูปแบบ (query ซับซ้อนยังจำกัด) ต้องออกแบบ Auth ใหม่ทั้งหมด (ตอนนี้แอปไม่มี auth เลย)
3. **Cloudflare D1** — SQL จริง, ต่อยอดจาก Cloudflare Workers ที่ deploy อยู่แล้ว, ตอบโจทย์ทั้ง 2 ข้อดีที่สุด **แต่เป็นงานใหญ่ที่สุด**: ตอนนี้ Worker เสิร์ฟแค่ static file ล้วนๆ ไม่มี server-side logic เลย ต้องสร้าง backend API ใหม่ทั้งหมด + ต้องออกแบบระบบ auth/สิทธิ์เข้าถึงใหม่จริงจัง (ตอนนี้ "security" = ไม่มีใครรู้ URL เฉยๆ) + rewrite `STORAGE_ENGINE` เกือบทั้งหมด + แอปจะไม่ offline 100% เหมือนเดิม + เสี่ยงข้อมูลเสียหายช่วง migrate ถ้าพลาด (ย้อนแย้งกับเป้าหมายที่อยากป้องกันข้อมูลหาย)

**ข้อสังเกตร่วมของทาง 2 และ 3:** ทั้งคู่ทำให้แอปต้องพึ่งอินเทอร์เน็ตทุกครั้งที่อ่าน/เขียนข้อมูล (จากเดิม offline ได้เต็มที่) — สำหรับเครื่องมือหน้างานโรงงานที่สัญญาณเน็ตอาจไม่เสถียรตลอดเวลา ควรคิดให้รอบคอบ

**คำแนะนำที่ให้ไป (ยังไม่ได้ทำ):** เริ่มจากทาง 1 (auto-backup) ก่อนได้เลยเพราะความเสี่ยงต่ำสุดและเป็น "ประกันภัย" ที่มีประโยชน์ไม่ว่าจะเลือกทางไหนต่อ ส่วนทาง 2/3 ควรตัดสินใจแยกต่างหาก เพราะเป็นการเปลี่ยนสถาปัตยกรรมใหญ่ที่ควรผ่านขั้นตอน Blueprint + อนุมัติแบบเต็มรูปแบบ (อาจใช้ `sa-architect` subagent ช่วยตอนเริ่มออกแบบจริง)

**สถานะ:** **พี่ A ยังไม่ตัดสินใจ** ("ขอฟังข้อดี/ข้อเสียของแต่ละทางก่อน" แล้วง่วง/คิดไม่ออก ขอพักไว้ก่อน) — **ยังไม่มีโค้ดเปลี่ยนแปลงใดๆ ในเรื่องนี้เลยจนถึง 2026-08-23** entry นี้บันทึกไว้เฉพาะบริบท/ข้อเท็จจริงที่หามาได้ + ทางเลือกที่คุยกันไว้ เพื่อให้ session ถัดไปสานต่อได้โดยไม่ต้องเริ่มคิดใหม่ทั้งหมด

**Commit:** เอกสารอย่างเดียว ไม่มีโค้ดเปลี่ยน (`f9e14c9` เอกสารต้นฉบับ, `4051f6c` backfill commit hash ของ entry ที่ 14)

---
