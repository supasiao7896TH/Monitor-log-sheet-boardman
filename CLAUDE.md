# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single self-contained HTML file — `index.html` — implementing "Plant Log Analyzer" (currently V29.46), a Thai-language browser tool for plant/machine monitoring engineers. Operators import Excel/CSV log sheets exported from plant SCADA/monitoring systems, and the tool auto-detects tag headers, normal-range limits, and per-row readings, flags out-of-range values, lets operators annotate abnormal readings, and exports a shift-summary "Infographic Report" as a JPG.

See `context.md` for the domain/business background (who uses this, glossary, and the rationale behind recent feature decisions) — this file (`CLAUDE.md`) covers the "how the code works" side. The same guidance is mirrored in `AGENTS.md` for tools that look for that file instead of `CLAUDE.md`; keep the two in sync when editing.

There is no build step, package manager, server, or test suite — everything (HTML, CSS via Tailwind, JS) lives in that one file, plus a `vendor/` folder of locally-hosted copies of the external libraries (see below). Open it directly in a browser to run it.

## Running / testing changes

- Open `index.html` directly in a browser (double-click or `start "" "index.html"`). There is no dev server or bundler.
- `index.html` loads Tailwind, lucide, SheetJS `xlsx`, Chart.js, html2canvas, and jsPDF from `./vendor/*.js` (vendored copies, not CDN — see "Working conventions" below) — keep the `vendor/` folder alongside `index.html` when copying the app anywhere (a normal `git clone` already keeps them together).
- There are no automated tests. Verify changes manually by importing a sample .xls/.xlsx/.csv log sheet through the "นำเข้าข้อมูล" (Import) tab and exercising the affected flow (import → dashboard flagging → annotate/report → infographic export).
- Data persists client-side in IndexedDB (database `PlantLogAnalyzerEnterpriseDB`) — clearing site data/browser storage resets the app.
- Bump the version string in the `<title>` (and the "Ultimate Edition (VXX.XX)" label) when making a notable fix, following the existing `V29.40`-style convention seen in commit history and in-code comments (e.g. `// V29.40 FIX: ...`).

## Architecture

Everything after line ~735 lives in one `<script>` block, organized as plain object modules (no framework, no build tooling, no modules/imports — just globals in file order):

- **`SMART_AGENT`** — generates Thai-language natural-language summaries/analysis text for abnormal readings and shift summaries (rule-based, not an external AI call). When a record's Tag No has a curated entry in `COUNTERMEASURE_DB` (a flat array of `{tagNo, direction, equipmentName, factor, sourceDoc, sourcePage, pdfTagRef, action}` sourced from internal MPS process-deviation manuals — see `COUNTERMEASURE_AGENT`, keyed by `tagNo`+`direction` for O(1) exact-match lookup, no fuzzy matching), it appends the manual's English recommended-action text after the generic Thai sentence; tags with no curated entry get the same output as before this feature existed. `COUNTERMEASURE_DB` is deliberately small and hand-curated — most real Tag Nos won't have an entry, and that's expected (falls back silently).
- **`UI_RENDERER`** — tiny DOM helper (`createEl`, `initIcons` for lucide icons).
- **`STATE`** — the single source of truth (`STATE.data`: tags, masterTags, records, filters, selection). `STATE.set(key, value)` triggers `_deriveAbnormal()` (recomputes `isAbnormal`/`isStandby` per record against min/max/exact limits, applies the "zero shield" to suppress false positives near zero, then filters/sorts into `STATE.data.abnormalRecords`) and notifies subscribers. `APP` subscribes once via `STATE.subscribe` and re-renders the active view based on the changed key (see `APP.render`, ~line 1492).
- **`STORAGE_ENGINE`** — thin IndexedDB wrapper (object stores: `Tags`, `Records`, `MasterTags`) for persisting imported data and operator annotations across reloads.
- **`EXCEL_WORKER`** — the CSV/Excel ingestion pipeline: `parseCSV` (quote-aware line splitter), `extractGlobalDate`/`normalizeYear` (parses dates from filename or sheet content, handles Buddhist-era years), `extractTime` (parses time from various formats including Excel serial fractions), and `processData` — the core row-classification state machine that walks each row of a sheet and, by matching header keywords (name/item/description, tag no, normal/limit), builds tag definitions and then reading rows keyed by column position. This is the most fragile/complex part of the codebase — log sheet layouts vary, so this uses heuristics (keyword matching, column-adjacency fallback for misaligned values, ignore-lists) rather than a fixed schema.
- **`APP`** — the controller/view layer: binds DOM events (`bindEvents`), routes tab switches (`data-tab` buttons → `view-*` panels, e.g. `view-dashboard`, `view-import`, `view-tags`, `view-master`, `view-manual`), renders the dashboard/tag table/master (limits) table, handles the abnormal-record annotation modal (`openActionModal`/`saveAction`), builds the Chart.js trend chart (`renderChart`), and generates the shift Infographic Report (`openReportModal` → `updateInfographicLive` → `exportInfographicImage`, which rasterizes `#infographic-container` via `html2canvas` and triggers a JPG download).

### Data model essentials

- A **tag** is a monitored point, identified by `getTagId(r) = ${machine}_${tagNo}_${paramType}` (paramType is PV/MV/SV/etc). Tags carry `min`/`max`/`exactNum` limits parsed from the sheet's "Normal"/"Limit" row.
- **`masterTags`** are operator-curated overrides of a tag's limits (edited in the "Master" tab) that take precedence over the per-import `tags` limits — see the override logic in `STATE._deriveAbnormal`. Master overrides live in their own IndexedDB store (`MasterTags`) and are never cleared by re-importing or by the "ล้างฐานข้อมูล" (Clear Database) button — only `Records` gets cleared by that button; `Tags` and `MasterTags` persist so limits/overrides don't need to be re-entered every shift.
- A **record** is one reading (one tag, one timestamp). Records get annotated in place with `isAbnormal`, `isStandby`, `remark`, `actionStatus` ('new'/'acknowledged').
- Values within ~0.1 of zero (or near zero relative to the limit) are treated as instrument "standby" and suppressed from abnormal flagging (the "zero shield", toggleable per-tag via `master.disableZeroShield`) — this exists to avoid false alarms from idle/offline instruments. For instruments whose idle baseline isn't near zero (e.g. a vibration sensor that reads ~13 while its equipment is parked), `master.forceStandby` lets an operator force a tag to always read as standby regardless of value.
- There is no cap on how many abnormal records can be selected for the Infographic Report (`STATE.data.selectedForReport`) — operators can select individual rows, use the "คัดเลือกอัตโนมัติ" (Top N by severity) dropdown, or "เลือกทั้งหมด" to select everything currently visible under the active filter.

## Working conventions (from this repo's history)

- All UI copy is Thai; keep new user-facing strings in Thai consistent with the surrounding tone.
- All external libraries (Tailwind, lucide icons, SheetJS `xlsx`, Chart.js, html2canvas, jsPDF) are loaded from `./vendor/*.js` in `<head>` — vendored copies committed to the repo (not a CDN, and not npm-managed) so the app has zero network dependency once opened. Google Fonts (`index.html:8-10`) is the one deliberate exception, still loaded from `fonts.googleapis.com` — non-critical, degrades gracefully to a system font if offline. To update a vendored library, re-download it from its original CDN URL (see git history / `vendor/` filenames) and overwrite the file in place.
- User-supplied strings that reach the DOM must go through `escapeHtml` (an XSS fix landed in this repo's early history — don't regress it).
- Past fixes in this repo have centered on: tag-ID collisions across machines/sheets (always include `machine` in identity), date/time parsing edge cases in imported sheets, and text clipping in the exported Infographic JPG — when touching the infographic layout, verify the exported image (not just the on-screen preview), since html2canvas rendering can diverge from live CSS.
## Available Subagents

Subagent ที่ใช้กับโปรเจกต์นี้เป็น **global agent** อยู่ที่ `~/.claude/agents/` (ไม่ใช่ project-local) ภายใต้แบรนด์ "Supasit.A | A-Class WebCraft" — ใช้ร่วมกันได้ทุกโปรเจกต์ของผู้ใช้ และปรับตัวตามโครงสร้างจริงของแต่ละโปรเจกต์ (โปรเจกต์นี้ไม่ได้ใช้ 9-Module IIFE หรือ Neo-Glassmorphism ดังนั้น check ส่วนนั้นจะถูกข้ามไปโดยอัตโนมัติ):

| Subagent | ใช้เมื่อ | สิทธิ์ |
|---|---|---|
| `sa-explore` | เปิด session ใหม่ / อยากรู้ภาพรวมโค้ดก่อนเริ่มงาน / หาว่าฟังก์ชันอยู่ไฟล์ไหน | Read-only |
| `sa-code-reviewer` | หลังแก้โค้ดเสร็จในแต่ละรอบ ก่อน commit | Read-only |
| `sa-debugger` | โค้ด error / พฤติกรรมไม่ตรงที่คาด | Edit ได้ |
| `sa-architect` | ก่อนตัดสินใจโครงสร้างสำหรับฟีเจอร์ใหญ่ๆ | Read-only, plan-only |
| `sa-handoff` | จะปิดเครื่อง หรือเพิ่งเปิดเครื่องมาทำงานต่อ (สลับบ้าน↔ที่ทำงาน) — อ่าน/เขียนเฉพาะ `HANDOFF.md` | Read + Write เฉพาะ `HANDOFF.md` |
| `sa-git-manager` | จะ commit, จัดการ branch, เจอ merge conflict, หรือเตรียม PR — ยึด Git Safety Protocol เข้มงวด ไม่ push/force ops โดยไม่ขออนุญาตก่อน | Edit + Bash (git) |

**Workflow แนะนำ:**
1. Session ใหม่ → เรียก `sa-explore` สำรวจโค้ดที่เกี่ยวข้องก่อน
2. Plan Mode (Opus) → วางแผน
3. Accept Edits (Sonnet) → ลงมือแก้
4. เรียก `sa-code-reviewer` ก่อน commit
5. ถ้าเจอ Critical issue → เรียก `sa-debugger` แก้ต่อ
6. เรียก `sa-git-manager` เพื่อ commit/push/PR อย่างปลอดภัย
