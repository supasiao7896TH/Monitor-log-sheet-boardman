import { STATE } from '../state.js';
import { STORAGE_ENGINE } from '../storage-engine.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { EXCEL_AUTOIMPORT } from '../excel-autoimport.js';
import { autoResizeTextarea, STORE_TAGS, STORE_RECORDS, STORE_MASTERTAGS, STORE_COUNTERMEASURES, BACKUP_REMINDER_STALE_DAYS, LS_LAST_BACKUP_KEY, LS_BACKUP_SNOOZE_KEY, AUTOIMPORT_POLL_INTERVAL_MS, LS_AUTOIMPORT_LAST_MTIME_KEY, getCanonicalTimesStatus } from '../shared.js';
import { APP } from './app.js';

// V29.78 FEAT: กันสั่ง archive ซ้ำทุกรอบ poll ตราบใดที่ยังครบ 4 เวลาอยู่ (Copy-Item -Force เขียนทับ
// เฉยๆ ไม่เสียหายถ้าซ้ำ แต่ไม่จำเป็นต้องยิง request ทุก 5 นาทีถ้าไม่มีอะไรเปลี่ยน) — in-memory ล้วนๆ
// รีเซ็ตเมื่อ reload หน้าได้ ไม่กระทบอะไร (แค่ archive ซ้ำอีกครั้งตอนเช็ครอบแรกหลัง reload)
let lastKnownCanonicalComplete = false;

Object.assign(APP, {
            // V29.78 FEAT: ขอให้เบราว์เซอร์ mark storage ของแอปนี้เป็น "persistent" กันเบราว์เซอร์ auto-evict
            // (ลบ IndexedDB ทิ้งเงียบๆ) ตอนดิสก์เครื่องตึง — เกิดได้แม้มีข้อมูลแค่วันเดียว ไม่เกี่ยวกับปริมาณ
            // ข้อมูลเลย best-effort ล้วนๆ (เบราว์เซอร์อาจไม่ grant ก็ได้ ไม่ block อะไร ไม่มี UI ให้)
            requestPersistentStorage: async () => {
                try {
                    if (navigator.storage && navigator.storage.persist) {
                        const granted = await navigator.storage.persist();
                        console.info('[storage] persist()', granted ? 'granted — จะไม่ถูกเบราว์เซอร์ลบทิ้งเองแล้ว' : 'denied — เบราว์เซอร์อาจยังลบทิ้งเองได้ถ้าดิสก์ตึง');
                    }
                } catch (error) {
                    console.warn('[storage] persist() failed', error);
                }
            },

            init: async () => {
                UI_RENDERER.initIcons();
                APP.bindEvents();
                APP.requestPersistentStorage(); // fire-and-forget — ไม่ await ไม่บล็อกการโหลดข้อมูล

                try {
                    await STORAGE_ENGINE.init();

                    // V29.51 FIX: subscribe BEFORE the initial loadLocalData so its STATE.set calls actually
                    // trigger the first render — previously, if IndexedDB already had data from a prior
                    // session (the normal case once an operator has imported before), the dashboard stayed
                    // stuck on its 0/blank loading state until some other STATE change (e.g. a nav click).
                    STATE.subscribe(APP.render);
                    await APP.loadLocalData();
                    await APP.renderImportHistory();
                    APP.startAutoImportPolling(); // V29.78 FEAT: เริ่ม poll ไฟล์จาก Excel Bridge เบื้องหลัง (เงียบๆ ไม่บล็อก init)
                } catch (error) {
                    // V29.64 FIX: เดิมถ้า IndexedDB เปิดไม่สำเร็จ (private mode, ถูก block, หรือเปิดแอปนี้ค้าง
                    // ไว้หลาย tab พร้อมกันจน version-upgrade ค้าง) แอปจะค้างเงียบๆ ไม่มี error แจ้ง operator เลย
                    console.error("App Init Failed: ", error);
                    alert("เปิดฐานข้อมูลของแอป (IndexedDB) ไม่สำเร็จ อาจเกิดจากเปิดแอปนี้ค้างไว้หลายแท็บพร้อมกัน หรือใช้ Private/Incognito mode กรุณาปิดแท็บอื่นที่เปิดแอปนี้อยู่แล้วโหลดหน้านี้ใหม่ หากยังไม่หาย ลองเปิดด้วย Browser mode ปกติ (ไม่ใช่ Private/Incognito)");
                }
            },

            
            loadLocalData: async () => {
                const tags = await STORAGE_ENGINE.getAll(STORE_TAGS);
                const records = await STORAGE_ENGINE.getAll(STORE_RECORDS);
                const masterTags = await STORAGE_ENGINE.getAll(STORE_MASTERTAGS);
                const userCountermeasures = await STORAGE_ENGINE.getAll(STORE_COUNTERMEASURES);

                STATE.set('tags', tags);
                STATE.set('masterTags', masterTags);
                STATE.set('records', records);
                STATE.set('userCountermeasures', userCountermeasures);
                // V29.60 FIX: keep the operator's Infographic Report selection alive across
                // annotation save/clear (saveAction/clearAction call loadLocalData to refresh
                // records) — only drop IDs that no longer exist, don't wipe the whole selection.
                const validRecordIds = new Set(records.map(r => r.id));
                const prevSelected = STATE.get('selectedForReport') || [];
                STATE.set('selectedForReport', prevSelected.filter(id => validRecordIds.has(id)));
            },


            // V29.78 FEAT: auto-import จาก Excel Bridge — เช็คทันที 1 ครั้งตอนเปิดแอป แล้ว poll ต่อเนื่อง
            // ทุก AUTOIMPORT_POLL_INTERVAL_MS ตราบใดที่ยังเปิดแอปทิ้งไว้ (เงียบๆ เบื้องหลัง ไม่มี dialog
            // ยืนยัน — ปลอดภัยเพราะเป็นไฟล์เดิมที่รู้จักอยู่แล้ว และ saveBatchCounting upsert ด้วย id
            // deterministic ทำให้ import ซ้ำไม่สร้างข้อมูลซ้ำซ้อน)
            startAutoImportPolling: () => {
                APP.pollAutoImport();
                setInterval(APP.pollAutoImport, AUTOIMPORT_POLL_INTERVAL_MS);
            },

            pollAutoImport: async () => {
                const info = await EXCEL_AUTOIMPORT.getSourceFileInfo();
                if (info.status !== 'ok') {
                    // bridge-offline / not-found / error — ไม่เปิดโปรแกรม Bridge ไว้เป็นสถานะปกติ ไม่ใช่
                    // ข้อผิดพลาดที่ต้องรบกวน operator รอรอบ poll ถัดไปเฉยๆ
                    return;
                }

                const lastMtime = localStorage.getItem(LS_AUTOIMPORT_LAST_MTIME_KEY);
                if (lastMtime === info.lastWriteTimeUtc) return; // ไฟล์ไม่เปลี่ยนจากรอบก่อน ไม่ต้องทำอะไรต่อ

                const fetched = await EXCEL_AUTOIMPORT.fetchSourceFile();
                if (fetched.status !== 'ok') {
                    console.warn('[auto-import] fetch failed:', fetched.status, fetched.message || '');
                    return; // file-locked/error ตอนดึงไฟล์ — ไม่ update marker รอบถัดไปลองไฟล์เดิมซ้ำ (เผื่อล็อกแค่ชั่วคราว)
                }

                // mark ว่า fetch สำเร็จแล้วก่อน ไม่ว่า parse/save ข้างล่างจะเป็นอย่างไรต่อ — กันวน retry
                // ไฟล์เดิมที่ parse fail ซ้ำไม่รู้จบทุก 5 นาที (ถ้า parse fail จริงๆ คือปัญหาที่ข้อมูลไฟล์
                // เอง ไม่ใช่ปัญหาจังหวะที่ retry แล้วจะหาย)
                localStorage.setItem(LS_AUTOIMPORT_LAST_MTIME_KEY, info.lastWriteTimeUtc);

                const result = await APP.handleAutoImportedFile(fetched.file);
                if (result.status !== 'ok') {
                    console.error('[auto-import] save failed:', result.message);
                    return;
                }

                // เช็คว่าข้อมูลวันล่าสุดครบ 4 เวลา (03:00/09:00/15:00/21:00) แล้วหรือยัง — ถ้าเพิ่งครบรอบนี้
                // ให้สั่ง Bridge archive ไฟล์ต้นฉบับเก็บ safety copy ให้อัตโนมัติ
                await APP.checkAndArchiveIfComplete();
            },

            // V29.78 FEAT: trigger archive อัตโนมัติเมื่อข้อมูลวันล่าสุดครบ 4 เวลา (03:00/09:00/15:00/21:00)
            // — เช็คใหม่ทุกครั้งที่เรียก แต่สั่ง archive จริงเฉพาะตอน "เพิ่งครบ" (เปลี่ยนจากไม่ครบ→ครบ) กัน
            // ยิง request ซ้ำไม่จำเป็นทุกรอบ poll ถ้า archive ล้มเหลว (เช่นไฟล์ล็อกจังหวะ PI กำลังเขียน) จะ
            // ไม่ mark ว่าเสร็จแล้ว รอบ poll ถัดไปจะลองใหม่เอง ไม่ต้องมี retry logic พิเศษ
            checkAndArchiveIfComplete: async () => {
                const status = getCanonicalTimesStatus(STATE.get('records'));
                if (!status.isComplete) {
                    lastKnownCanonicalComplete = false; // เผื่อเปลี่ยนวันใหม่ ให้เริ่มนับใหม่รอบหน้า
                    return;
                }
                if (lastKnownCanonicalComplete) return; // ครบอยู่แล้วจากรอบก่อน ไม่ต้อง archive ซ้ำ

                const archiveStatus = await EXCEL_AUTOIMPORT.archiveSourceFile();
                if (archiveStatus === 'ok') {
                    lastKnownCanonicalComplete = true;
                } else {
                    console.warn('[auto-archive] archive failed, will retry next poll:', archiveStatus);
                }
            },


            // V29.51 FEAT: Export ข้อมูลทั้งหมด (Tags/Records/MasterTags) เป็นไฟล์ JSON สำรอง
            backupData: async () => {
                try {
                    const payload = await STORAGE_ENGINE.exportAll();
                    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    const dateStr = new Date().toISOString().slice(0, 10);
                    link.href = url;
                    link.download = `PlantLogAnalyzer_Backup_${dateStr}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    // V29.51 FEAT: บันทึกเวลาสำรองล่าสุด สำหรับ backup reminder banner
                    localStorage.setItem(LS_LAST_BACKUP_KEY, new Date().toISOString());
                    localStorage.removeItem(LS_BACKUP_SNOOZE_KEY);
                    APP.renderBackupReminder();
                } catch (error) {
                    console.error("Backup Failed: ", error);
                    alert("เกิดข้อผิดพลาดในการสำรองข้อมูล กรุณาลองใหม่อีกครั้ง");
                }
            },


            // V29.51 FEAT: กู้คืนข้อมูลจากไฟล์ JSON สำรอง (เขียนทับข้อมูลปัจจุบันทั้งหมด)
            restoreData: (file) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    let payload;
                    try {
                        payload = JSON.parse(e.target.result);
                    } catch (error) {
                        alert("ไฟล์สำรองไม่ถูกต้อง หรือเสียหาย ไม่สามารถอ่านเป็น JSON ได้");
                        return;
                    }
                    if (!confirm("การกู้คืนข้อมูลจะเขียนทับข้อมูล Tag, Record และ Master ทั้งหมดที่มีอยู่ในขณะนี้ ต้องการดำเนินการต่อหรือไม่?")) return;
                    try {
                        await STORAGE_ENGINE.importAll(payload);
                        await APP.loadLocalData();
                        STATE.set('timeFilter', 'all');
                        alert("กู้คืนข้อมูลสำเร็จ");
                    } catch (error) {
                        console.error("Restore Failed: ", error);
                        alert("เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ไฟล์อาจมีโครงสร้างไม่ถูกต้อง");
                    }
                };
                reader.onerror = () => alert("ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
                reader.readAsText(file);
            },


            bindEvents: () => {
                const assignEvent = (id, fn, evt = 'click') => {
                    const el = document.getElementById(id);
                    if (el) el.addEventListener(evt, fn);
                };

                assignEvent('btn-select-all', () => APP.selectAllVisible());

                assignEvent('btn-clear-select', () => {
                    // V29.52 PERF: STATE.set already triggers APP.render → renderDashboard (no manual re-render needed)
                    STATE.set('selectedForReport', []);
                });

                assignEvent('auto-select-dropdown', (e) => {
                    const count = parseInt(e.target.value);
                    if (!isNaN(count)) {
                        APP.autoSelectCritical(count);
                    }
                    e.target.value = "";
                }, 'change');

                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const tab = e.currentTarget.dataset.tab;
                        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active'));
                        e.currentTarget.classList.add('tab-active');
                        document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
                        const viewEl = document.getElementById(`view-${tab}`);
                        if (viewEl) viewEl.classList.remove('hidden');
                        STATE.set('activeTab', tab);
                    });
                });

                assignEvent('btn-clear-db', async () => {
                    if (confirm("ต้องการล้างค่าที่บันทึกไว้ (Readings) ของรอบก่อนหน้าใช่หรือไม่? (รายการ Tag และการตั้งค่า Master จะไม่ถูกลบ)")) {
                        try {
                            await STORAGE_ENGINE.clearImportedData();
                            STATE.set('timeFilter', 'all');
                            STATE.set('viewFilter', 'abnormal');
                            const vf = document.getElementById('view-filter');
                            if (vf) vf.value = 'abnormal';
                            await APP.loadLocalData();
                        } catch (error) {
                            console.error("Clear DB Failed: ", error);
                            alert("ล้างข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                        }
                    }
                });

                // V29.51 FEAT: สำรอง/กู้คืนข้อมูล (Backup/Restore)
                assignEvent('btn-backup-db', APP.backupData);

                // V29.51 FEAT: Backup reminder banner actions
                assignEvent('btn-backup-reminder-action', APP.backupData);
                assignEvent('btn-backup-reminder-dismiss', () => {
                    const snoozeUntil = new Date(Date.now() + BACKUP_REMINDER_STALE_DAYS * 86400000);
                    localStorage.setItem(LS_BACKUP_SNOOZE_KEY, snoozeUntil.toISOString());
                    const banner = document.getElementById('backup-reminder-banner');
                    if (banner) banner.classList.add('hidden');
                });

                assignEvent('btn-restore-db', () => {
                    const input = document.getElementById('restore-file-input');
                    if (input) input.click();
                });

                assignEvent('restore-file-input', (e) => {
                    const file = e.target.files[0];
                    e.target.value = '';
                    if (file) APP.restoreData(file);
                }, 'change');

                const dz = document.getElementById('drop-zone');
                const fi = document.getElementById('file-input');
                if (fi && dz) {
                    fi.addEventListener('change', (e) => APP.handleFiles(e.target.files));
                    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('bg-brand-50/50'); });
                    dz.addEventListener('dragleave', () => dz.classList.remove('bg-brand-50/50'));
                    dz.addEventListener('drop', (e) => {
                        e.preventDefault();
                        dz.classList.remove('bg-brand-50/50');
                        APP.handleFiles(e.dataTransfer.files);
                    });
                }

                assignEvent('view-filter', (e) => STATE.set('viewFilter', e.target.value), 'change');
                assignEvent('tag-search', (e) => APP.renderTagTable(e.target.value), 'input');
                assignEvent('master-search', (e) => APP.renderMasterTable(e.target.value), 'input');
                assignEvent('countermeasure-search', (e) => APP.renderCountermeasureTable(e.target.value), 'input');
                assignEvent('dashboard-search', () => APP.renderDashboard(), 'input');

                assignEvent('btn-close-modal', APP.closeActionModal);
                assignEvent('btn-cancel-action', APP.closeActionModal);
                assignEvent('btn-save-action', APP.saveAction);
                assignEvent('btn-clear-action', APP.clearAction);
                assignEvent('btn-ai-assist', APP.triggerSmartAssist);
                assignEvent('action-input', (e) => autoResizeTextarea(e.target), 'input');

                assignEvent('btn-cancel-master', APP.closeMasterModal);
                assignEvent('btn-save-master', APP.saveMasterSettings);

                assignEvent('btn-add-countermeasure', () => APP.openCountermeasureModal(null));
                assignEvent('btn-cancel-countermeasure', APP.closeCountermeasureModal);
                assignEvent('btn-save-countermeasure', APP.saveCountermeasureEntry);
                assignEvent('btn-delete-countermeasure', APP.deleteCountermeasureEntry);
                assignEvent('cm-edit-tagno', APP.updateCountermeasureWarning, 'input');
                assignEvent('cm-edit-action', (e) => autoResizeTextarea(e.target), 'input');
                assignEvent('cm-edit-direction', APP.updateCountermeasureWarning, 'change');

                assignEvent('btn-open-report', APP.openReportModal);
                assignEvent('btn-close-report', APP.closeReportModal);

                assignEvent('btn-layout-card', () => APP.setInfographicLayout('card'));
                assignEvent('btn-layout-table', () => APP.setInfographicLayout('table'));

                assignEvent('btn-export-image', APP.exportInfographicImage);
                assignEvent('btn-export-pdf', APP.exportInfographicPDF);

                assignEvent('report-shift', APP.updateInfographicLive, 'change');
                assignEvent('report-reporter', APP.updateInfographicLive, 'input');
                assignEvent('report-handover', APP.updateInfographicLive, 'input');
            },


            render: (changedKey) => {
                const activeTab = STATE.get('activeTab');
                const tagSearchVal = () => { const el = document.getElementById('tag-search'); return el ? el.value : ''; };
                const masterSearchVal = () => { const el = document.getElementById('master-search'); return el ? el.value : ''; };
                const countermeasureSearchVal = () => { const el = document.getElementById('countermeasure-search'); return el ? el.value : ''; };

                if (['tags', 'records', 'timeFilter', 'viewFilter', 'masterTags', 'userCountermeasures', 'selectedForReport'].includes(changedKey)) {
                    // V29.52 PERF: render only the table for the visible tab; hidden tabs re-render on switch below
                    if (activeTab === 'dashboard') APP.renderDashboard();
                    else if (activeTab === 'tags') APP.renderTagTable(tagSearchVal());
                    else if (activeTab === 'master') APP.renderMasterTable(masterSearchVal());
                    else if (activeTab === 'countermeasure') APP.renderCountermeasureTable(countermeasureSearchVal());
                    APP.updateFloatingBar();
                }
                if (changedKey === 'activeTab') {
                    if (activeTab === 'dashboard') APP.renderDashboard();
                    if (activeTab === 'tags') APP.renderTagTable(tagSearchVal());
                    if (activeTab === 'master') APP.renderMasterTable(masterSearchVal());
                    if (activeTab === 'countermeasure') APP.renderCountermeasureTable(countermeasureSearchVal());
                }
            },
});
