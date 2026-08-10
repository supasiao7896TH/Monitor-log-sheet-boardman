import { STORAGE_ENGINE } from './storage-engine.js';
/* global XLSX */

// V29.71 FEAT: sync "Resolution Remark (Action Taken)" กลับไปเป็น native Excel cell comment
// (เทียบเท่า right-click -> "New Comment" ที่ operator เคยต้องพิมพ์ซ้ำเองในไฟล์ต้นฉบับ) —
// ปิด loop ให้จบงานที่ Web App ได้เลยโดยไม่ต้องไปแก้ Excel เพิ่ม
const APP_COMMENT_AUTHOR = 'Plant Log Analyzer (Web App)';

function pickBookType(fileName) {
    return (fileName || '').toLowerCase().endsWith('.xlsm') ? 'xlsm' : 'xlsx';
}

export const EXCEL_WRITEBACK = {

            // File System Access API (showOpenFilePicker / FileSystemFileHandle.createWritable)
            // รองรับเฉพาะ Chrome/Edge — ใช้ feature-detect แทนการเดา browser
            isFsAccessSupported: () => typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function',

            // Pure: แก้ cell.c ของ cellRef ที่ระบุใน wb (SheetJS workbook object) แล้ว return wb เดิม (mutate in place)
            // ไม่แตะ I/O ใดๆ ทั้งสิ้น เพื่อให้ unit test ได้โดยไม่ต้องพึ่ง browser API จริง
            applyRemarkToWorkbook: (wb, record, remarkText) => {
                const sheet = wb && wb.Sheets && wb.Sheets[record.machine];
                if (!sheet || !record.cellRef) return { status: 'error' };

                let cell = sheet[record.cellRef];
                if (!cell) {
                    // เผื่อ cell หายไปจริงๆ (เช่นแถวถูกลบใน Excel หลัง import) — สร้าง cell ว่างไว้ให้ comment เกาะได้
                    cell = { t: 's', v: '' };
                    sheet[record.cellRef] = cell;
                }

                const existing = Array.isArray(cell.c) ? cell.c : null;
                const hasForeignComment = existing && existing.length > 0 && existing[0].a && existing[0].a !== APP_COMMENT_AUTHOR;

                if (hasForeignComment) {
                    // มีคนพิมพ์ comment เองตรงๆ ใน Excel (ไม่ใช่จาก Web App) — ห้ามเขียนทับเงียบๆ
                    return { status: 'conflict' };
                }

                const trimmed = (remarkText || '').trim();
                if (trimmed) {
                    cell.c = [{ a: APP_COMMENT_AUTHOR, t: trimmed, hidden: true }];
                } else if (existing) {
                    // ล้าง Resolution Remark ใน Web App แล้ว -> ล้าง comment ที่ Web App เคยเขียนไว้ด้วย
                    delete cell.c;
                }
                return { status: 'ok' };
            },

            // เขียนกลับไฟล์เดิมบน disk อัตโนมัติผ่าน FileSystemFileHandle ที่เก็บไว้ตอน import
            // (ต้องเชื่อมไฟล์ผ่านปุ่ม "นำเข้าและเชื่อมต่อไฟล์" ก่อน — ดู app-import.js)
            syncRemarkToExcel: async (record, remarkText) => {
                if (!record.sourceFileId || !record.cellRef || !record.machine) return 'no-handle';
                if (!EXCEL_WRITEBACK.isFsAccessSupported()) return 'no-handle';

                let handleEntry;
                try {
                    handleEntry = await STORAGE_ENGINE.getFileHandle(record.sourceFileId);
                } catch (err) {
                    console.error('EXCEL_WRITEBACK: getFileHandle failed', err);
                    return 'error';
                }
                if (!handleEntry || !handleEntry.handle) return 'no-handle';

                const handle = handleEntry.handle;
                try {
                    let perm = await handle.queryPermission({ mode: 'readwrite' });
                    if (perm !== 'granted') {
                        perm = await handle.requestPermission({ mode: 'readwrite' });
                    }
                    if (perm !== 'granted') return 'permission-denied';

                    const file = await handle.getFile();
                    const buffer = await file.arrayBuffer();
                    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', bookVBA: true, cellStyles: true });

                    const { status } = EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, record, remarkText);
                    if (status !== 'ok') return status;

                    const bookType = pickBookType(handleEntry.fileName);
                    const out = XLSX.write(wb, { bookType, bookVBA: true, type: 'array' });

                    const writable = await handle.createWritable();
                    await writable.write(out);
                    await writable.close();
                    return 'synced';
                } catch (err) {
                    console.error('EXCEL_WRITEBACK.syncRemarkToExcel failed:', err);
                    if (err && err.name === 'NoModificationAllowedError') return 'file-locked';
                    if (err && err.name === 'NotAllowedError') return 'permission-denied';
                    return 'error';
                }
            },

            // Fallback สำหรับ browser ที่ไม่รองรับ File System Access API หรือยังไม่ได้เชื่อมไฟล์ —
            // สร้างไฟล์ Excel ใหม่ที่มี Resolution Remark ทุกรายการของไฟล์นั้นเป็น comment แล้ว trigger download
            exportUpdatedWorkbook: async (sourceFileId, allRecords) => {
                const entry = await STORAGE_ENGINE.getSourceWorkbook(sourceFileId);
                if (!entry || !entry.blob) return { status: 'error' };

                const buffer = await entry.blob.arrayBuffer();
                const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', bookVBA: true, cellStyles: true });

                allRecords
                    .filter(r => r.sourceFileId === sourceFileId && r.remark && r.remark.trim())
                    .forEach(r => EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, r, r.remark));

                const bookType = pickBookType(entry.fileName);
                const out = XLSX.write(wb, { bookType, bookVBA: true, type: 'array' });
                const blob = new Blob([out], { type: 'application/octet-stream' });

                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = entry.fileName || `updated.${bookType}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);

                return { status: 'exported' };
            }
        };
