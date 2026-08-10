import { STATE } from '../state.js';
import { STORAGE_ENGINE } from '../storage-engine.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { EXCEL_WORKER } from '../excel-worker.js';
import { getTagId } from '../shared.js';
import { APP } from './app.js';
/* global lucide, XLSX */

Object.assign(APP, {

            // V29.51 FEAT: แสดงประวัติการนำเข้าไฟล์ (Import Audit Trail)
            renderImportHistory: async () => {
                const list = document.getElementById('import-history-list');
                if (!list) return;

                const history = await STORAGE_ENGINE.getImportHistory();
                while (list.firstChild) list.removeChild(list.firstChild);

                if (history.length === 0) {
                    const empty = UI_RENDERER.createEl('p', 'text-xs text-slate-400 italic text-center py-3');
                    empty.textContent = 'ยังไม่มีประวัติการนำเข้าไฟล์';
                    list.appendChild(empty);
                    return;
                }

                history.slice(0, 10).forEach(entry => {
                    const isError = entry.status === 'error';
                    const row = UI_RENDERER.createEl('div', `flex items-start gap-3 p-2.5 rounded-lg border ${isError ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`);

                    const iconWrap = UI_RENDERER.createEl('div', `w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isError ? 'bg-red-100 text-red-500' : 'bg-brand-100 text-brand-600'}`);
                    iconWrap.innerHTML = isError ? '<i data-lucide="x-circle" class="w-3.5 h-3.5"></i>' : '<i data-lucide="check" class="w-3.5 h-3.5"></i>';
                    row.appendChild(iconWrap);

                    const textWrap = UI_RENDERER.createEl('div', 'flex-1 min-w-0');
                    const nameEl = UI_RENDERER.createEl('p', 'text-xs font-bold text-slate-700 truncate');
                    nameEl.textContent = entry.fileName;
                    const metaEl = UI_RENDERER.createEl('p', 'text-[10px] text-slate-400 font-medium');
                    const dt = new Date(entry.importedAt);
                    const dtStr = isNaN(dt.getTime()) ? entry.importedAt : dt.toLocaleString('th-TH');
                    metaEl.textContent = isError
                        ? `${dtStr} • ${entry.errorMessage || 'Import failed'}`
                        : `${dtStr} • +${entry.tagsAdded} tags / +${entry.recordsAdded} records`;
                    textWrap.appendChild(nameEl);
                    textWrap.appendChild(metaEl);
                    row.appendChild(textWrap);

                    list.appendChild(row);
                });
                UI_RENDERER.initIcons();
            },


            // V29.71 FEAT: handles (optional) — FileSystemFileHandle ต่อไฟล์ ตำแหน่งตรงกับ files (index-aligned),
            // มาจาก drag-drop (DataTransferItem.getAsFileSystemHandle) หรือปุ่ม "นำเข้าและเชื่อมต่อไฟล์"
            // (showOpenFilePicker) — ถ้ามี จะเก็บไว้ใช้ sync remark กลับไฟล์เดิมบน disk โดยอัตโนมัติ
            handleFiles: async (files, handles = null) => {
                if(!files.length) return;

                document.getElementById('drop-zone').classList.add('hidden');
                document.getElementById('processing-status').classList.remove('hidden');
                const logEl = document.getElementById('process-log');
                while (logEl.firstChild) logEl.removeChild(logEl.firstChild);

                let allTags = [], allRecords = [];
                const fileLogEntries = []; // V29.51 FEAT: import audit trail, one entry per file

                for(let fIdx = 0; fIdx < files.length; fIdx++) {
                    const f = files[fIdx];
                    const fileHandle = handles ? handles[fIdx] : null;
                    document.getElementById('process-filename').textContent = "Analyzing: " + f.name;
                    logEl.appendChild(UI_RENDERER.createEl('div', '', `> Reading file structure: ${f.name}`));

                    let fileTagsCount = 0, fileRecordsCount = 0;
                    // V29.71 FEAT: id เดียวกันใช้ทั้งใน ImportHistory และผูก record ทุกตัวจากไฟล์นี้กลับไปหา
                    // ไฟล์ Excel ต้นฉบับที่เก็บไว้ (SourceWorkbooks/FileHandles) สำหรับ sync remark กลับเป็น cell comment
                    const fileId = `${Date.now()}_${f.name}`;

                    try {
                        const buffer = await f.arrayBuffer();
                        const wb = XLSX.read(new Uint8Array(buffer), {type: 'array'});

                        // V29.71 FEAT: เก็บไฟล์ดิบไว้เสมอ (ทุก browser) — เป็น fallback สำหรับปุ่ม "Export
                        // Updated Excel" เมื่อไม่มี FileSystemFileHandle ที่เขียนกลับ disk ได้โดยตรง
                        await STORAGE_ENGINE.saveSourceWorkbook(fileId, f.name, new Blob([buffer]));
                        if (fileHandle) await STORAGE_ENGINE.saveFileHandle(fileId, f.name, fileHandle);

                        let sharedDate = null;
                        for(let sn of wb.SheetNames) {
                            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn], {raw:true});
                            let found = EXCEL_WORKER.extractGlobalDate(csv.split(/\r\n|\n/), f.name);
                            if (found) {
                                sharedDate = found;
                                logEl.appendChild(UI_RENDERER.createEl('div', 'text-brand-400 ml-4', `> Date Found in [${sn}]: ${sharedDate}`));
                                break;
                            }
                        }
                        if (!sharedDate) {
                            sharedDate = new Date().toLocaleDateString('en-GB');
                            logEl.appendChild(UI_RENDERER.createEl('div', 'text-amber-500 ml-4', `> Date not found. Using system date: ${sharedDate}`));
                        }

                        let sIdx = 1;
                        for(let sn of wb.SheetNames) {
                            logEl.appendChild(UI_RENDERER.createEl('div', 'text-slate-300 ml-2', `> Parsing Sheet ${sIdx}/${wb.SheetNames.length}: ${sn}`));
                            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn], {raw:true});
                            const result = await EXCEL_WORKER.processData(csv, sn, f.name, sharedDate, logEl);
                            // V29.71 FEAT: ผูก record กลับไปหาไฟล์ต้นฉบับที่เพิ่งเก็บไว้ข้างบน
                            result.records.forEach(r => { r.sourceFileId = fileId; });
                            allTags.push(...result.tags);
                            allRecords.push(...result.records);
                            fileTagsCount += result.tags.length;
                            fileRecordsCount += result.records.length;
                            logEl.appendChild(UI_RENDERER.createEl('div', 'text-brand-400 ml-4 mb-1', `✓ Extracted ${result.records.length} records.`));

                            const pct = Math.round((sIdx / wb.SheetNames.length) * 100);
                            document.getElementById('process-bar').style.width = pct + '%';
                            document.getElementById('process-percent').textContent = pct + '%';
                            sIdx++;
                        }

                        fileLogEntries.push({
                            id: fileId,
                            importedAt: new Date().toISOString(),
                            fileName: f.name,
                            fileSizeBytes: f.size,
                            tagsAdded: fileTagsCount,
                            recordsAdded: fileRecordsCount,
                            status: 'success'
                        });
                    } catch (err) {
                        logEl.appendChild(UI_RENDERER.createEl('div', 'text-red-400 font-bold', `❌ Error: ${err.message}`));
                        console.error(err);
                        fileLogEntries.push({
                            id: fileId,
                            importedAt: new Date().toISOString(),
                            fileName: f.name,
                            fileSizeBytes: f.size,
                            tagsAdded: fileTagsCount,
                            recordsAdded: fileRecordsCount,
                            status: 'error',
                            errorMessage: err.message
                        });
                    }
                }

                logEl.appendChild(UI_RENDERER.createEl('div', 'text-emerald-400 mt-2 font-bold', `> Saving to Local Database...`));
                const uniqueTags = Array.from(new Map(allTags.map(t => [getTagId(t), t])).values());

                // V29.62 FIX: saveBatch does a full put() overwrite per tag — if this import's sheet
                // format doesn't carry limit/description info for a tag that's already known (e.g. a
                // partial/differently-formatted sheet), don't blank out the previously-learned
                // normalText/min/max/exactNum. Carry over the old value only where the new one is empty.
                const existingTagsMap = new Map(STATE.get('tags').map(t => [t.id, t]));
                uniqueTags.forEach(t => {
                    const existing = existingTagsMap.get(getTagId(t));
                    if (!existing) return;
                    if (!t.normalText && existing.normalText) t.normalText = existing.normalText;
                    if (!t.description && existing.description) t.description = existing.description;
                    if (t.min === null && existing.min !== null && existing.min !== undefined) t.min = existing.min;
                    if (t.max === null && existing.max !== null && existing.max !== undefined) t.max = existing.max;
                    if (t.exactNum === null && existing.exactNum !== null && existing.exactNum !== undefined) t.exactNum = existing.exactNum;
                });

                // V29.64 FIX: เดิมถ้าบันทึกลง IndexedDB ไม่สำเร็จ (quota เต็ม, private mode, เปิดแอปค้างไว้
                // หลาย tab พร้อมกัน ฯลฯ) หน้าจอจะค้างที่ "Saving to Local Database..." ตลอดไปโดยไม่มี error
                // แจ้ง operator เลย และข้อมูลที่เพิ่ง import มาจะหายไปเงียบๆ
                try {
                    await STORAGE_ENGINE.saveBatch(uniqueTags, allRecords);
                    await Promise.all(fileLogEntries.map(entry => STORAGE_ENGINE.logImport(entry)));
                    await APP.renderImportHistory();

                    STATE.set('timeFilter', 'all');
                    STATE.set('viewFilter', 'abnormal');
                    const vfEl = document.getElementById('view-filter');
                    if (vfEl) vfEl.value = 'abnormal';

                    await APP.loadLocalData();
                } catch (error) {
                    console.error("Save Import Failed: ", error);
                    logEl.appendChild(UI_RENDERER.createEl('div', 'text-red-400 font-bold', `❌ บันทึกข้อมูลลงฐานข้อมูลไม่สำเร็จ: ${error.message}`));
                    alert("บันทึกข้อมูลที่ import ลงฐานข้อมูล (IndexedDB) ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หากยังไม่สำเร็จ ลองปิดแท็บอื่นที่เปิดแอปนี้อยู่ หรือตรวจสอบพื้นที่ว่างของ Browser Storage");
                }

                setTimeout(() => {
                    document.getElementById('drop-zone').classList.remove('hidden');
                    document.getElementById('processing-status').classList.add('hidden');
                    document.querySelector('[data-tab="dashboard"]').click();
                }, 1500);
            },
});
