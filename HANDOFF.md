# HANDOFF — Plant Log Analyzer

## 📅 อัปเดตล่าสุด
2026-08-13 — อัปเดตโดย recovery session ผ่าน GitHub API โดยตรง (ไม่มี local clone ของ repo ในเครื่องที่ทำ recovery นี้)
Branch: `main` | Commit ล่าสุดบน `origin/main`: `f1041e9` — **push แล้ว** (ต่อจาก `b6df8c8` ผ่าน `bcfb16b` → `f1041e9`)
เวอร์ชันแอปปัจจุบัน: **V29.85**
URL production จริง: **https://monitor-log-sheet-boardman.supasiao.workers.dev** (ยืนยันจาก `AllowedOrigins` ใน `bridge/excel-bridge.ps1` + output จริงของ Cloudflare deploy job ล่าสุด commit `3d4792a` — ลิงก์นี้ถูก embed ไว้ใน Excel log sheet ของโรงงานผ่านสูตร `HYPERLINK` ให้ operator กดเปิดแอป ห้ามเปลี่ยนชื่อ worker ใน `wrangler.jsonc` เด็ดขาดเพราะจะทำให้ลิงก์เดิมใน Excel ใช้ไม่ได้)
สูตร Hyperlink ที่ใช้งานจริงตอนนี้ในไฟล์ Excel log sheet (พี่ A ยืนยันเอง 2026-08-13):
```
=HYPERLINK("https://monitor-log-sheet-boardman.supasiao.workers.dev/", "@Open Plant Log Analyzer")
```
สูตร Hyperlink สำหรับเปิด Excel Bridge ที่ใช้งานจริงตอนนี้ (พี่ A ยืนยันเอง 2026-08-13 — label text อัปเดตจากที่เคยบันทึกไว้ที่ "เรื่องที่ 3" ด้านล่าง ซึ่งเป็น label เก่า "กดตอนเริ่มกะ" ไม่ใช่ label ปัจจุบันแล้ว):
```
=HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", "▶ เปิด Excel Bridge (กดก่อนจะ Update log sheet)")
```

> ⚠️ **เหตุผลที่มี entry ย้อนหลัง (เรื่องที่ 10-11 ด้านล่าง):** เมื่อวันที่ 2026-08-12 ~19:37 น. (เวลาไทย) sa-handoff ตัวก่อนหน้ากำลังบันทึกสถานะ session ให้ แต่พี่ A ปิดเครื่องก่อนบันทึกเสร็จ ทำให้ HANDOFF.md ฉบับก่อนหน้า **ไม่มีข้อมูล 2 เรื่องที่เกิดขึ้นจริงแล้วบน `origin/main`**: (1) เรื่องที่ 10 — shared-DB sync ข้าม operator (V29.85, commit `bcfb16b`, push แล้วตั้งแต่ 2026-08-12 ~19:37 เวลาไทย) และ (2) เรื่องที่ 11 — แก้บั๊ก badge เวอร์ชันค้าง (commit `f1041e9`, push แล้ว 2026-08-13 ~09:56 เวลาไทย) — เพิ่ม entry ทั้งสองย้อนหลังใน session recovery นี้ โดยอ้างอิงจาก commit message/diff stat ผ่าน GitHub API เท่านั้น (ไม่มี local clone จึงไม่มีบริบทเพิ่มเติมนอกเหนือจากที่ commit message ระบุไว้ — ถ้าใครมีบริบทการทดสอบเพิ่มเติมของ 2 commit นี้ ควรเติมให้ครบ)
>
> ⚠️ ตอนเริ่ม session ที่เครื่อง Office (ก่อนหน้านี้) `git log` พบว่า `origin/main` ไปไกลกว่า header เดิมด้านล่าง (ซึ่งหยุดที่ `2b81b3b` / V29.81) อีก 1 commit ที่ไม่เคยถูกบันทึกเป็น entry ใน HANDOFF.md เลย: `51ec9d2` — **V29.82** "Fix canonical-times completeness reporting a future time slot as present" (แก้ `getCanonicalTimesStatus` ให้เทียบกับเวลาจริง ณ ปัจจุบันด้วย ไม่ใช่แค่เช็คว่ามี record ของ time slot นั้นหรือยัง กันไม่ให้ dashboard ขึ้น "ครบ 4 รอบเวลา" ก่อนเวลาจริงมาถึง) — **session นั้น (เครื่อง Office) ไม่ได้เป็นคนทำ V29.82** พบแค่จาก `git log`/`git show --stat` ตอนตรวจสอบก่อนเริ่มงาน ไม่มีบริบทเพิ่มเติมนอกจาก commit message เอง — ถ้าใครรับงานต่อและมีบริบทมากกว่านี้ ควรเติม entry ย้อนหลังให้ครบ
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

**การทดสอบ:** เครื่อง Office นี้ไม่มี Node.js/npm เลย (ยืนยันซ้ำอีกครั้ง หา `node`/`npm` ไม่เจอทั้ง bash/PowerShell) จึง **ไม่ได้รัน `npm test` จริงทั้ง 2 รอบ** (ทั้งตอนเขียน test และตอน sa-code-reviewer ตรวจ) — ตรวจด้วย hand-trace ตัวเลขทีละ step แทน (ไม่พบข้อผิดพลาดทางคณิตศาสตร์) และทดสอบ end-to-end จริงผ่าน browser (Claude in Chrome) แทน: ตั้ง local Python static server ชั่วคราว (เลียนแบบ Vite dev server, map `/vendor/*` → `public/vendor/*`), สร้าง synthetic backup JSON (`STORAGE_ENGINE.importAll` format) ที่มี TI-2301 baseline 25 samples + ค่า anomaly 238.7 + ค่าหลุด hard-limit 300 แล้วใช้ "กู้คืนข้อมูล" (restore) โดย override `window.confirm`/`window.alert` ผ่าน `javascript_tool` ก่อน เพื่อไม่ให้ native dialog บล็อก session (เจอปัญหานี้จริงรอบแรก — tab หลุดค้าง ต้อง `tabs_close_mcp` แล้วเปิดใหม่) ยืนยันผ่านหมด: purple badge/card/filter/counter ถูกต้อง, Infographic Report (Card+Table) สีถูก, Tag Master badge ถูก, ไม่มี console error (นอกจาก "bridge unreachable" ที่ปกติเพราะไม่ได้รัน Local Bridge)

**Commit:** `b6df8c8` "Add Statistical Deviation detection, opt-in per tag (V29.84)" — 10 files, 343 insertions — **push ขึ้น `origin/main` แล้ว** (`0a6d7e5..b6df8c8`)

**สถานะ:** แก้เสร็จ + commit + push แล้ว **แต่ยังไม่มีใครรัน `npm test` จริงเลยตลอด session นี้** (ทั้ง test เก่าและ test ใหม่ที่เพิ่งเขียน) — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 9 และ **ฟีเจอร์นี้ปิดอยู่ทุก tag โดย default** จนกว่าพี่ A จะไปเปิด `enableStatDeviation` เองผ่าน Tag Master — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 10

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

**สถานะ:** shipped + push แล้ว — **แต่ยังไม่มีข้อมูลยืนยันว่า `tests/excel-sync.test.js` (ไฟล์ test ใหม่ของ feature นี้) เคยรันผ่าน `npm test` จริงหรือไม่** (commit message ไม่ได้ระบุ ไม่มีข้อมูลยืนยัน) — ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 12

---

## ✅ เรื่องที่ 11 — Fix badge เวอร์ชันค้าง "V29.52" → "V29.85" (cosmetic) — บันทึกย้อนหลังจาก recovery session

บั๊กที่เคยบันทึกไว้ใน HANDOFF.md ฉบับก่อนหน้าว่า "ยังไม่ได้แก้": `index.html` มี badge UI hardcode ข้อความ "V29.52 Strict Numeric Core" ที่ไม่เคยอัปเดตมาตั้งแต่ V29.52 แม้เวอร์ชันจริงของแอปไปถึง V29.84/V29.85 แล้ว — **แก้เรียบร้อยแล้ว**

**Commit:** `f1041e9` "Fix stale version badge V29.52 -> V29.85 (cosmetic, tracked in HANDOFF.md)" — 1 ไฟล์ (`index.html`), +1/-1 — **push ขึ้น `origin/main` แล้ว** (2026-08-13 ~09:56 น. เวลาไทย)

**สถานะ:** แก้เสร็จ + commit + push แล้ว เป็น commit ล่าสุดบน `origin/main` ณ ตอนที่บันทึก entry นี้

---

## ✅ เรื่องที่ 12 — Statistical Deviation เปิดอัตโนมัติทุก Tag + เพิ่ม Trend Warning tier (V29.92)

> ⚠️ **ช่องว่างที่พบก่อนเริ่ม entry นี้:** `git log` พบว่า `origin/main` ไปไกลกว่า "เรื่องที่ 11" (ซึ่งหยุดที่ V29.85) ไปแล้วถึง V29.90 (History view + Excel export สำหรับ abnormal records, persist AbnormalHistory แยก IndexedDB store) และ session นี้เองก็เพิ่งทำ V29.91 (copy infographic image เข้า Clipboard สำหรับวาง Excel ตรงๆ) มาก่อนหน้า entry นี้ — ทั้งสองไม่เคยถูกบันทึกเป็น entry ใน HANDOFF.md เลย มีแค่ commit message ที่เห็นจาก `git log` ถ้าใครมีบริบทเพิ่มเติมของ V29.86-V29.91 ควรเติม entry ย้อนหลังให้ครบ

**บริบท:** พี่ A ต้องการให้ฟีเจอร์ Statistical Deviation (V29.84, "เรื่องที่ 9") ทำงานอัตโนมัติทุก tag โดยไม่ต้องไปติ๊กเลือกทีละ tag เอง (เดิม opt-in ทำให้ในทางปฏิบัติไม่มี tag ไหนเปิดใช้งานจริงเลย — ดู item 10 ที่เพิ่งแก้ใน "ค้างอยู่" ด้านล่าง) และอยากให้ระบบตรวจจับ "แนวโน้มใกล้ออกนอก control" ได้ด้วย ไม่ใช่รอจนถึงจุด >3σ เต็มรูปแบบ

**สิ่งที่ทำ:**
1. **Flip opt-in → opt-out:** `MasterTags.enableStatDeviation` (opt-in) → field ใหม่ `MasterTags.disableStatDeviation` (opt-out, ตาม pattern `disableZeroShield` เดิม) — ใช้ field ใหม่แทนการ reinterpret field เดิม เพราะทุก Master row ที่มีอยู่จริงมี `enableStatDeviation: false` เขียนไว้ explicit อยู่แล้ว (save ทุกครั้งเขียนเสมอแม้ไม่ติ๊ก) reinterpret ตรงๆ จะพังทันที
2. **เพิ่ม Trend Warning tier ใหม่** — `isStatTrendWarning` + `trendReason` (`src/modules/shared.js` ฟังก์ชันใหม่ `computeCausalStatTrendWarning`, reuse zScore stream จาก `computeCausalStatDeviation` เดิม ไม่คำนวณ mean/std ซ้ำ) สอง rule เจอข้อใดข้อหนึ่งพอ: Rule A (`'PERSISTENT_2SIGMA'`) 2 ใน 3 จุดล่าสุดเกิน 2σ ฝั่งเดียวกัน, Rule B (`'MONOTONIC_RUN_UP'`/`'MONOTONIC_RUN_DOWN'`) 6 จุดล่าสุดไต่ระดับทิศทางเดียวติดกัน — severity ordering ใหม่: `isAbnormal` > `isStatDeviation` (>3σ) > `isStatTrendWarning` (ใหม่) > ปกติ, mutual exclusivity บังคับโดย construction เหมือนของเดิม
3. Surface tier ใหม่ครบทุกจุดที่ `isStatDeviation` เคยปรากฏ: dashboard (การ์ดที่ 5 สีฟ้า/cyan, `autoSelectCritical` scoring), Infographic Report (card+table), History view, `syncAbnormalHistory`, Excel-writeback export label, `SMART_AGENT.analyze()` (Thai text ใหม่อธิบาย z-score/trend reason), `#view-filter` เพิ่ม option `trend-warning`

**ไฟล์ที่แก้:** `src/modules/shared.js`, `src/modules/state.js`, `index.html`, `src/modules/app/app-master.js`, `src/modules/app/app-dashboard.js`, `src/modules/app/app-report.js`, `src/modules/app/app-core.js`, `src/modules/app/app-history.js`, `src/modules/app/app-export.js`, `src/modules/smart-agent.js`, `tests/shared.test.js`, `tests/state.test.js`, `CLAUDE.md`, `AGENTS.md` — bump เป็น **V29.92**

**การยืนยัน:** เขียน test ใหม่ครบ (`computeCausalStatTrendWarning` describe block ใน `tests/shared.test.js`, ปรับ `_recomputeFlags` integration tests ใน `tests/state.test.js` ให้ตรงกับ opt-out gate ใหม่) แต่ **เครื่องที่เขียน session นี้ไม่มี Node.js/npm ติดตั้งอยู่เลย — ยังไม่เคยรัน `npm test` จริงสักครั้ง** ยืนยันแค่ hand-trace logic เท่านั้น ต้องรัน `npm test` ที่เครื่องที่มี Node.js ก่อนไว้ใจ 100%, และควรทดสอบ UI จริงผ่าน `npm run dev` (import log sheet ตัวอย่าง, เปิด Tag Master ดู checkbox ใหม่, ลองสร้างข้อมูลไต่ระดับ/เบี่ยงเบนซ้ำเพื่อดู Trend Warning card สีฟ้าขึ้นจริง)

**Commit:** `c5aa038` "Auto-enable Statistical Deviation for all tags, add Trend Warning tier (V29.92)" — 15 ไฟล์, +326/-71 — **push ขึ้น `origin/main` แล้ว** (ต่อจาก `7757c1f`)

**สถานะ:** โค้ด+test เขียนเสร็จ, commit+push แล้ว — **`npm test` ยังไม่เคยรันจริง** (เครื่องนี้ไม่มี Node.js/npm) ยังเป็นรายการค้างอยู่

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

**การยืนยัน:** เพิ่ม test ใหม่ใน `tests/state.test.js` สำหรับ filter `'hard-abnormal'` (แยกจาก `isStatDeviation` ถูกต้อง) — **`npm test` ยังไม่เคยรันจริงเช่นเดียวกับ "เรื่องที่ 12"** (เครื่องนี้ไม่มี Node.js/npm) ยัง**ไม่เคยทดสอบ UI จริงผ่าน browser เลย** ว่าคลิกการ์ดแล้ว ring highlight/filter ทำงานถูกต้อง โดยเฉพาะ toggle-off (คลิกซ้ำ) ต้องเช็คให้ดีที่เครื่องที่มี Node.js

**Commit:** ยังไม่ commit ณ ตอนเขียน entry นี้ — ให้เติม commit hash ตรงนี้หลัง commit จริง

**สถานะ:** โค้ด+test เขียนเสร็จ, ยังไม่ commit/push, ยังไม่เคยรัน `npm test`/ทดสอบ UI จริง

---

## 🚧 ค้างอยู่ตรงไหน

1. **V29.81 fix (เรื่องที่ 5) ยังไม่ได้ยืนยันในสภาพแวดล้อมจริง** — ทดสอบแค่กับ temp folder จำลองที่เครื่องบ้าน ยังไม่เคยทดสอบกับ watch folder จริง (`D:\PTA COMMONT WORK\Log sheet Digital`) บนเครื่องที่มีจริง และยังไม่เคยทดสอบกับ Excel ตัวจริงที่เปิดไฟล์ค้างไว้จริงๆ (จำลองด้วย `FileShare.None` เท่านั้น) — แนะนำให้ยืนยันที่เครื่อง Office (หรือเครื่องไหนก็ตามที่มี watch folder จริง) ว่า auto-import/auto-archive ยังทำงานต่อได้ปกติขณะ log sheet เปิดค้างอยู่ใน Excel เพราะนั่นคือเงื่อนไขที่พังมาก่อน
2. **ยังไม่ได้เช็ค GitHub Actions deploy status ของ commit ล่าสุด (`f1041e9`, ต่อจาก `bcfb16b`/`b6df8c8`)** — เช็คได้ที่ https://github.com/supasiao7896TH/Monitor-log-sheet-boardman/actions ก่อนสรุปว่า production ขึ้น V29.85 แล้วจริง
3. ~~บั๊กเล็กๆ ที่เจอแต่ยังไม่ได้แก้ (cosmetic, ไม่เร่งด่วน): `index.html` badge UI hardcode ข้อความ "V29.52 Strict Numeric Core" ที่ไม่เคยอัปเดตมาตั้งแต่ V29.52~~ — **แก้แล้ว** commit `f1041e9` (2026-08-13) เปลี่ยนเป็น "V29.85 Strict Numeric Core" ดู "เรื่องที่ 11" ด้านบน
4. **รายการค้างเก่าจาก session ที่เครื่อง Office (22416d8 เป็นต้นไป) — ยังไม่ได้ตรวจสอบซ้ำใน session นี้ ให้ถือว่ายังค้างอยู่จนกว่าจะมีหลักฐานใหม่:**
   - สูตร Hyperlink (`=HYPERLINK("D:\Monitor log sheet boardman\bridge\start-bridge.bat", ...)`) ยังไม่ได้แปะในไฟล์ log sheet จริง
   - Task Scheduler (Specific-user, ผูก `PTTGC\26007294`) ยังไม่ได้ยืนยันด้วยการ log off/log on จริงว่า auto-start ทำงาน
   - เศษโฟลเดอร์ `.git` ว่างเปล่าค้างที่ `C:\Users\26007294\Monitor log sheet boardman\.git` ยังไม่ได้ลบ
   - **หมายเหตุสำคัญ:** commit `1e99d15` ("Document Excel Bridge multi-user setup") ที่อยู่ใน 10 commits ที่ pull เข้ามา *อาจจะ* เป็น doc commit ที่ HANDOFF.md ฉบับเก่าพูดถึงว่า "รอ commit อยู่" (เรื่องที่ 3) ไปแล้วก็ได้ — **ยังไม่ได้ตรวจสอบยืนยัน** ให้คนที่รับงานต่อลอง `git show 1e99d15 --stat` เทียบเนื้อหาเองก่อนสรุปว่าตรงกัน อย่าเดาเอาว่าตรงแน่นอน
5. **bridge บนเครื่องบ้าน (4000D) ยังรันแบบ manual** เหมือนเดิม (ยังไม่ได้ตั้ง Task Scheduler ที่นี่)
6. **V29.83 fix (เรื่องที่ 7) ยังไม่ได้รัน `npm test` (Vitest suite) เลย** — เครื่อง Office ไม่มี Node.js/npm ติดตั้ง ยืนยันแค่ manual ผ่าน browser เท่านั้น ควรรัน `npm test` ที่เครื่องบ้าน (หรือเครื่องที่มี Node.js) เพื่อ double-check ว่ายังผ่านครบ 49/49 เหมือนเดิม
7. **commit `51ec9d2` (V29.82, canonical-times fix) ไม่เคยมีการบันทึกรายละเอียดใน HANDOFF.md เลย** มีแค่ commit message ที่เห็นจาก `git log`/`git show --stat` — ถ้าใครที่เครื่องบ้านมีบริบทเพิ่มเติมของ session ที่ทำ V29.82 ควรเติม entry ย้อนหลังให้ครบ
8. **เครื่อง Office (`26007294`) ไม่มี Node.js/npm ติดตั้งอยู่เลย** — ถ้าจะ dev/test ต่อบนเครื่องนี้ในอนาคตต้องติดตั้ง Node.js ก่อน (การตั้ง static server ชั่วคราวแบบที่ทำใน "เรื่องที่ 7"/"เรื่องที่ 9" ใช้ตรวจ UI ได้เท่านั้น ไม่ครอบคลุม Vitest suite)
9. **V29.84 (เรื่องที่ 9) — ทั้ง test suite เดิม (49 tests) และ test ใหม่ (`tests/shared.test.js` describe ใหม่, `tests/state.test.js` ทั้งไฟล์) ยังไม่มีใคร run จริงเลยด้วย `npm test`** — ต้องรันที่เครื่องบ้านก่อนไว้ใจ 100% ว่า test ใหม่ผ่านและ suite เดิมไม่พัง (ตรวจด้วย hand-trace + browser manual test เท่านั้นใน session นี้)
10. ~~**Statistical Deviation feature (V29.84) ยังไม่ได้เปิดใช้กับ tag ไหนเลยในข้อมูลจริง** — default ปิดทุก tag ต้องไปติ๊ก `enableStatDeviation` เองผ่าน Tag Master ทีละ tag (เช่น TI-2301) ก่อนฟีเจอร์นี้จะเริ่มทำงาน~~ — **แก้แล้ว** V29.92 (ดู "เรื่องที่ 12" ด้านล่าง) flip เป็น opt-out เปิดอัตโนมัติทุก tag แล้ว
11. **Known limitation ของ Statistical Deviation ที่ตั้งใจไม่แก้ใน v1 (มี comment ในโค้ดแล้ว):** ถ้า process เปลี่ยน setpoint จริงถาวร (ไม่ใช่ fault) จะเกิด false-positive ต่อเนื่องจนกว่า window 120 samples จะเลื่อนผ่านครบ — mitigation ระยะสั้นคือปิด `disableStatDeviation` (เดิมชื่อ `enableStatDeviation` ก่อน V29.92) ชั่วคราวเองผ่าน Tag Master — ยังไม่แก้ใน V29.92 เช่นกัน (ยังเป็น known limitation อยู่)
12. **V29.85 shared-DB sync (เรื่องที่ 10) — ยังไม่มีข้อมูลยืนยันว่า `tests/excel-sync.test.js` เคยรันผ่าน `npm test` จริงหรือไม่** (entry เขียนย้อนหลังจาก recovery session ที่ไม่มี local clone จึงรันเองไม่ได้ ไม่มีข้อมูลยืนยันจาก commit message) — ควรรัน `npm test` ที่เครื่องบ้าน/เครื่องที่มี Node.js เพื่อยืนยัน พร้อมกับ suite เดิมและ test ของ V29.84
13. **V29.85 shared-DB sync (เรื่องที่ 10) ยังไม่มีใครยืนยันการใช้งานจริงกับ operator หลายคนบน PC ที่ทำงานหลัง deploy** — commit message ยืนยันแค่ผลทดสอบ round-trip ระหว่าง browser origin 2 ตัว ไม่ใช่การใช้งานจริงกับ Windows account คนละ account บนเครื่อง Office
14. **V29.92/V29.93 (เรื่องที่ 12-13) — `npm test` ยังไม่เคยรันจริงเลยทั้งสองรอบ** เครื่องที่เขียนไม่มี Node.js/npm ติดตั้งอยู่ ต้องรันที่เครื่องบ้าน/เครื่องที่มี Node.js ก่อนไว้ใจ 100%
15. **V29.93 (เรื่องที่ 13) — ยังไม่เคยทดสอบ UI จริงผ่าน browser เลย** โดยเฉพาะพฤติกรรมคลิกการ์ด: ring highlight ขึ้นถูกการ์ด, คลิกซ้ำแล้วยกเลิกกรองกลับไป `abnormal` จริง, empty-state message ขึ้นถูกต้องครบทุก filter — ต้องเปิด `npm run dev` ทดสอบก่อนใช้งานจริง

---

## 🎯 ขั้นตอนถัดไปที่ตั้งใจจะทำ

1. ยืนยัน V29.81 fix กับ watch folder จริง + Excel ตัวจริงเปิดไฟล์ค้างไว้ (ที่เครื่อง Office หรือเครื่องที่มี path จริง)
2. เช็คสถานะ GitHub Actions ของ commit ล่าสุด (`f1041e9`)
3. `git show 1e99d15 --stat` เช็คว่า "เรื่องที่ 3" เดิม (doc changes ของ Hyperlink/multi-user setup) commit ไปแล้วจริงหรือยัง
4. ถ้ายังไม่ได้ทำ: แปะสูตร Hyperlink ในไฟล์ log sheet จริง, ทดสอบ Task Scheduler ด้วย log off/log on จริง, ลบเศษ `.git` ค้างที่เครื่อง Office
5. ~~(ไม่เร่งด่วน) แก้ badge "V29.52" ที่ค้างใน `index.html` ให้ตรงเวอร์ชันปัจจุบัน~~ — **ทำแล้ว** commit `f1041e9`
6. รัน `npm test` ที่เครื่องบ้าน (หรือเครื่องที่มี Node.js) เพื่อ double-check ว่า V29.83 fix (เรื่องที่ 7) ไม่ทำ suite เดิม (49/49) พัง
7. ถ้าจะพัฒนาต่อที่เครื่อง Office ในอนาคต ให้ติดตั้ง Node.js ก่อน
8. พิจารณาเติม entry ย้อนหลังของ V29.82 (`51ec9d2`) ใน HANDOFF.md ให้ครบถ้วน (ตอนนี้มีแค่ commit message)
9. **สำคัญที่สุด:** รัน `npm test` ที่เครื่องบ้าน (มี Node.js) เพื่อ confirm ชุด test ใหม่ของ V29.84 (`tests/shared.test.js` describe block ใหม่, `tests/state.test.js` ทั้งไฟล์) **และ** V29.85 (`tests/excel-sync.test.js`) ผ่านจริงและ suite เดิมไม่พัง — ยังไม่มีใคร run จริงเลยตลอดทั้ง 2 session ที่เขียนฟีเจอร์เหล่านี้
10. ~~เปิดใช้ Statistical Deviation ผ่าน Tag Master ให้ tag ที่ต้องการจริง (เช่น TI-2301) เพราะ default ปิดไว้ทุก tag ฟีเจอร์นี้ยังไม่ทำงานกับ tag ไหนเลยจนกว่าจะไปติ๊กเปิดเอง~~ — **ทำแล้ว** V29.92 flip เป็น opt-out เปิดอัตโนมัติทุก tag แล้ว (ดู "เรื่องที่ 12")
12. **สำคัญ:** รัน `npm test` เพื่อยืนยัน test ใหม่ของ V29.92 (`tests/shared.test.js` describe block `computeCausalStatTrendWarning`, `tests/state.test.js` ที่แก้ opt-out flip) ผ่านจริงและ suite เดิมไม่พัง — เขียน session นี้ที่เครื่องไม่มี Node.js/npm ติดตั้ง ยืนยันแค่ hand-trace logic เท่านั้น ยังไม่เคยรันจริงเลย
11. ยืนยันการใช้งานจริงของ shared-DB sync (V29.85) กับ operator หลายคนบน PC ที่ทำงานจริง (login คนละ Windows account) หลัง deploy ขึ้น production แล้ว — ตรวจว่า sidebar sync indicator ขึ้นสถานะถูกต้องและข้อมูล/remark เห็นตรงกันข้ามคน login

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
- **หลัง V29.84:** Statistical Deviation (`isStatDeviation`/`statZScore`) เป็นเกณฑ์แยกจาก hard-limit (`isAbnormal`) โดยตั้งใจ — mutually exclusive กัน (evaluate เฉพาะ record ที่ผ่าน hard-limit แล้วว่าไม่ผิดปกติ) ต้องเปิด opt-in ต่อ tag ผ่าน Tag Master (`enableStatDeviation`) ก่อนจะมีผล ไม่ทำงานกับ tag แบบ Exact Value และต้องมีข้อมูลอย่างน้อย 20 samples ก่อน baseline จะเริ่มมีผล (ไม่งั้น record จะไม่ถูก flag เพราะข้อมูลไม่พอ ไม่ใช่บั๊ก) — ถ้า process เปลี่ยน setpoint จริงถาวรจะเห็น false-positive ต่อเนื่องจนกว่า rolling window 120 samples จะเลื่อนผ่าน ให้ปิด `enableStatDeviation` ชั่วคราวถ้าเจอกรณีนี้
- **หลัง V29.85:** เปิดแอปแล้วอาจเห็น dashboard ดึงข้อมูลจาก shared snapshot บน D: มาทับ/ผสานกับ IndexedDB local ตอน init (pull แบบเงียบๆ ก่อน `loadLocalData`) — ถ้า bridge ปิดอยู่ ระบบจะ fallback ไปใช้ IndexedDB local เดิมโดยไม่ error แต่จะไม่ sync ข้าม operator จนกว่า bridge จะกลับมาออนไลน์ (มี dirty-flag ใน localStorage คอย retry push ที่ค้างเองอัตโนมัติ) — ยังไม่มีการยืนยันการใช้งานจริงกับ operator หลายคนบนเครื่อง Office หลัง deploy (ดู "🚧 ค้างอยู่ตรงไหน" ข้อ 13)

---

## 🔧 คำสั่งที่ต้องรันก่อนทำงานต่อ

```bash
git pull
npm install   # ถ้ายังไม่เคยลงที่เครื่องนี้ หรือ package.json เปลี่ยน
npm test      # ควรผ่าน 49/49 (suite เดิม) + test ใหม่จาก V29.84 (tests/shared.test.js, tests/state.test.js) + V29.85 (tests/excel-sync.test.js) — ยังไม่มีใคร run จริงเลยทั้งหมด ให้รันเป็นอันดับแรก
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
