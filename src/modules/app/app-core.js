import { STATE } from '../state.js';
import { STORAGE_ENGINE } from '../storage-engine.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { EXCEL_AUTOIMPORT, LEGACY_UNKNOWN_FILENAME } from '../excel-autoimport.js';
import { EXCEL_SYNC } from '../excel-sync.js';
import { autoResizeTextarea, STORE_TAGS, STORE_RECORDS, STORE_MASTERTAGS, STORE_COUNTERMEASURES, STORE_ABNORMAL_HISTORY, BACKUP_REMINDER_STALE_DAYS, LS_LAST_BACKUP_KEY, LS_BACKUP_SNOOZE_KEY, AUTOIMPORT_POLL_INTERVAL_MS, LS_AUTOIMPORT_LAST_MTIME_KEY, LS_SYNC_DIRTY_KEY, getCanonicalTimesStatus, getDefaultTimeFilter } from '../shared.js';
import { APP } from './app.js';

// V29.86 FIX: เก็บ mtime ของไฟล์ต้นฉบับ ณ ตอนที่ archive สำเร็จล่าสุด (แทน boolean เดิมที่เคยยิง archive
// แค่ครั้งเดียวแล้วล็อกตัวเองไว้ตลอดวัน) — operator มักพิมพ์ Resolution Remark หลังข้อมูล 21:00 เข้ามาแล้ว
// ซึ่งทำให้ bridge เขียน comment กลับ Excel + save ไฟล์ (mtime เปลี่ยนจริง) ถ้ายังใช้ boolean เดิม
// archive copy ที่ทำไปแล้วครั้งแรกจะไม่มีวันได้ comment ที่เขียนทีหลังเลย เทียบ mtime แทนทำให้ archive
// ยิงซ้ำ (overwrite) ทุกครั้งที่ไฟล์เปลี่ยนจริง ตราบใดที่วันนั้นยังนับว่าครบ 4 เวลาอยู่ — in-memory ล้วนๆ
// รีเซ็ตเมื่อ reload หน้าได้ ไม่กระทบอะไร (แค่ archive ซ้ำอีกครั้งตอนเช็ครอบแรกหลัง reload)
let lastArchivedMtime = null;

// V29.87 FEAT: sync-warning banner state — จุดเล็กๆ สีเหลือง "LOCAL MODE" ที่ sidebar (setSyncIndicator เดิม)
// สังเกตยากมากสำหรับ operator ที่ไม่ได้สนใจรายละเอียดทางเทคนิค ทั้งที่มันแปลว่าการตั้งค่า Tag Master/
// Resolution Remark ที่เพิ่งบันทึกจะไม่ถูกแชร์ให้เพื่อนร่วมกะที่ login คนละบัญชี (ดู bridge/README.md หัวข้อ
// Troubleshooting) — เพิ่ม banner เด่นๆ บน Dashboard คู่กับจุดเดิม ปิดชั่วคราวได้ต่อ session เดียว (ไม่
// persist ข้าม reload) แล้วจะโผล่เตือนใหม่อัตโนมัติถ้าหลุด sync อีกรอบหลังจากเคย sync สำเร็จมาก่อนแล้ว
// กันไม่ให้ operator กด dismiss ครั้งเดียวแล้วพลาดเตือนตลอดกะที่เหลือ
let currentSyncState = 'local';
let syncWarningDismissed = false;

// V29.88 FEAT: auto-import config error banner state — แยกจาก sync-warning-banner ข้างบน เพราะสถานะ
// 'error' ที่ getSourceFileInfo() คืนมา (เจอไฟล์ log sheet ที่ไม่ใช่ (master) มากกว่า 1 ไฟล์ใน
// $WatchFolder, หรือหาโฟลเดอร์ $WatchFolder เองไม่เจอ — ดู Resolve-SourceFile ใน excel-bridge.ps1) เป็น
// ปัญหาที่ต้องมีคนไปจัดการไฟล์/path จริง ต่างจาก 'bridge-offline' (แค่ยังไม่เปิด Bridge) ที่เป็นสถานะปกติ
// รายวัน ถ้ารวมเป็นเงื่อนไขเดียวกัน operator จะเห็นแค่ "Dashboard ไม่อัปเดต" โดยไม่รู้สาเหตุ
let autoImportErrorMessage = null; // ข้อความล่าสุดจาก Bridge ตอน status === 'error', null = ไม่มีปัญหา
let autoImportWarningDismissed = false;

// V29.104 FEAT: กันกดปุ่ม "เปิด Excel Bridge" รัวๆ แล้วมี retry loop (APP.retryConnectAfterOpenBridge)
// หลายอันวิ่งซ้อนกันพร้อมกัน — true ระหว่างกำลัง poll อยู่เท่านั้น
let isConnectingToBridge = false;

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

                    // V29.85 FEAT: pull shared-db snapshot จาก D: (ผ่าน Local Bridge) ก่อน loadLocalData
                    // ตามปกติ — แก้ปัญหา operator login คนละ Windows account บนเครื่อง shared เห็น IndexedDB
                    // คนละก้อน ไม่มี confirm() dialog (ต่างจาก restoreData ที่เป็น manual user action)
                    // เพราะนี่เป็น background sync ตอน init เท่านั้น — ถ้า bridge ไม่พร้อม/ยังไม่มีไฟล์เลย
                    // (status !== 'ok') fallback ใช้ IndexedDB local เดิมเงียบๆ ไม่ error/ไม่ alert เพราะเป็น
                    // สถานะปกติ (เครื่องไม่มี bridge, หรือเครื่องแรกที่ยังไม่มีใคร push มา)
                    // ⚠️ ห้ามเรียก APP.pushSharedDb() ด้วยข้อมูล local ที่ยังไม่ผ่าน mutation จริงเด็ดขาด — ถ้า
                    // pull ล้มเหลว/IndexedDB ยังเปล่าอยู่ (browser profile ใหม่) การ push ตรงนี้จะเขียนทับ
                    // shared-db บน D: ด้วยข้อมูลเปล่า ทำลายข้อมูลของทุกคนที่แชร์กันอยู่
                    // V29.85 FIX: ข้อยกเว้นเดียวคือ dirty flag ค้างจาก mutation จริงที่ push ไม่สำเร็จรอบก่อน
                    // (เช่น operator save remark ตอน Bridge ดับพอดี) — กรณีนี้ IndexedDB มีข้อมูลจริงที่ยังไม่
                    // ถูก sync อยู่แน่นอน (ไม่ใช่ข้อมูลเปล่า) ต้อง retry push ก่อนให้โอกาส sync ทันเวลา ไม่งั้น
                    // pull ข้างล่างจะได้ shared-db เก่าที่ยังไม่มี edit นี้มาทับ local ทิ้งไปเงียบๆ
                    if (localStorage.getItem(LS_SYNC_DIRTY_KEY)) {
                        await APP.pushSharedDb(); // เคลียร์ dirty flag เองถ้าสำเร็จ
                    }

                    if (localStorage.getItem(LS_SYNC_DIRTY_KEY)) {
                        // retry push ข้างบนก็ยังไม่สำเร็จ (Bridge ยังไม่พร้อม) — ข้าม pull รอบนี้ไปเลย
                        // ปลอดภัยไว้ก่อน ใช้ local data เดิมต่อไป (เหมือน bridge offline ปกติ)
                        APP.setSyncIndicator('local');
                    } else {
                        const pulled = await EXCEL_SYNC.pullSharedDb();
                        if (pulled.status === 'ok' && pulled.data) {
                            try {
                                await STORAGE_ENGINE.importAll(pulled.data);
                                APP.setSyncIndicator('synced');
                            } catch (err) {
                                console.error('Pull-on-load importAll failed, falling back to local data:', err);
                                APP.setSyncIndicator('local');
                            }
                        } else {
                            APP.setSyncIndicator('local');
                        }
                    }

                    // V29.51 FIX: subscribe BEFORE the initial loadLocalData so its STATE.set calls actually
                    // trigger the first render — previously, if IndexedDB already had data from a prior
                    // session (the normal case once an operator has imported before), the dashboard stayed
                    // stuck on its 0/blank loading state until some other STATE change (e.g. a nav click).
                    STATE.subscribe(APP.render);
                    // V29.90 FEAT: sync record ที่เป็น Abnormal/Stat Deviation เข้า STORE_ABNORMAL_HISTORY
                    // (แยกจาก Records โดยตั้งใจ ให้อยู่รอด "ล้างฐานข้อมูล") ทุกครั้งที่ records/masterTags
                    // เปลี่ยน — ใช้ STATE.subscribe แทนการเรียกจาก 10 จุด mutation แยกทีละจุด เพราะทุกจุดเปลี่ยน
                    // ผ่าน STATE.set('records'/'masterTags', ...) อยู่แล้วทั้งหมด (ดู APP.syncAbnormalHistory)
                    STATE.subscribe(APP.syncAbnormalHistoryOnChange);
                    await APP.loadLocalData();
                    // V29.105 FEAT: default Dashboard ไปที่รอบเวลาล่าสุดที่ผ่านไปแล้วจริง (เช่น ตอนนี้ 10:54
                    // → เลือกรอบ 09:00 ให้เอง) แทน 'all' — คำนวณครั้งเดียวตอนเปิดแอปเท่านั้น ไม่ re-apply ทุก
                    // ครั้งที่ loadLocalData() ถูกเรียกจากจุดอื่น (เช่น หลังบันทึก remark) กันไม่ให้ไปแย่งรอบ
                    // เวลาที่ operator เลือกดูเองอยู่ระหว่างกะ
                    STATE.set('timeFilter', getDefaultTimeFilter(STATE.get('records')));
                    // V29.109 FIX: จำค่า default ที่เพิ่ง auto-set ไว้ ให้ APP.handleAutoImportedFile (ทำงาน
                    // เบื้องหลังทุก 5 นาที) รู้ว่า timeFilter ยังไม่ถูก operator เลือกเอง จะได้เลื่อนตามให้อัตโนมัติ
                    // เมื่อรอบเวลาใหม่มาถึง — ดู pattern เดียวกันใน restoreData() และ handleFiles()
                    APP._autoTimeFilter = STATE.get('timeFilter');
                    await APP.renderImportHistory();
                    APP.startAutoImportPolling(); // V29.78 FEAT: เริ่ม poll ไฟล์จาก Excel Bridge เบื้องหลัง (เงียบๆ ไม่บล็อก init)
                    APP.ensureExcelFileOpen(); // V29.99 FEAT: fire-and-forget เช็ค/เปิดไฟล์ log sheet ทันทีตอนเปิดหน้าเว็บ (ปิดช่องว่างตอนเปลี่ยนกะ)
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

            // V29.90 FEAT: STATE.subscribe listener — sync record ที่เป็น Abnormal/Stat Deviation เข้า
            // STORE_ABNORMAL_HISTORY ทุกครั้งที่ records/masterTags เปลี่ยน (import ใหม่, auto-import poll,
            // แก้ Tag Master, บันทึก/ลบ remark — ทุกจุดเปลี่ยนผ่าน STATE.set('records'/'masterTags', ...)
            // อยู่แล้วทั้งหมด ไม่ต้องแก้ 10 จุด mutation แยกทีละจุด)
            syncAbnormalHistoryOnChange: (changedKey) => {
                if (!['records', 'masterTags'].includes(changedKey)) return;
                APP.syncAbnormalHistory(); // fire-and-forget เหมือน pushSharedDb — ไม่บล็อก UI
            },

            syncAbnormalHistory: async () => {
                const records = STATE.get('records') || [];
                const toUpsert = records.filter(r => r.isAbnormal === 1 || r.isStatDeviation === 1 || r.isStatTrendWarning === 1);
                try {
                    if (toUpsert.length > 0) await STORAGE_ENGINE.upsertAbnormalHistoryBatch(toUpsert);
                    // ดึงทั้ง store กลับมาเสมอ (ไม่ใช่แค่ตอน toUpsert.length > 0) — กันเคส records ว่างเปล่า
                    // ตอนนี้ (เช่น เพิ่งกด "ล้างฐานข้อมูล" แล้ว reload หน้า) ทำให้ STATE.data.abnormalHistory
                    // ไม่เคยถูก set จาก IndexedDB เลยตั้งแต่เปิดแอปมา
                    const merged = await STORAGE_ENGINE.getAll(STORE_ABNORMAL_HISTORY);
                    STATE.set('abnormalHistory', merged);
                } catch (err) {
                    console.error('[history-sync] upsert failed:', err);
                }
            },


            // V29.85 FEAT: push snapshot ปัจจุบันทั้งหมดไปเก็บที่ D: ผ่าน Local Bridge — fire-and-forget
            // ตอนเรียกจากจุด mutation ทั้ง 10 จุด (saveAction/clearAction/saveMasterSettings/handleFiles/
            // handleAutoImportedFile/saveCountermeasureEntry/deleteCountermeasureEntry/btn-clear-db/
            // repairAutoImportedFileNames/restoreData) — ไม่ await เพื่อไม่บล็อก UI ให้ operator รอ
            // network round-trip
            // V29.85 FIX: ตั้ง LS_SYNC_DIRTY_KEY ก่อนพยายาม push ทุกครั้ง แล้วเคลียร์เมื่อสำเร็จเท่านั้น —
            // ถ้า push รอบนี้ล้มเหลว (เช่น Bridge ดับพอดี) flag จะค้างไว้ ทำให้ init() รอบต่อไปรู้ว่ามี local
            // change ที่ยังไม่ถูก sync ค้างอยู่ ต้อง retry push ก่อนจะยอม pull ทับ (ดู init() ด้านบน) — กัน
            // pull-on-load ทำลาย edit ที่ operator ทำไว้จริงแต่ push ไม่ทันสำเร็จก่อน reload
            pushSharedDb: async () => {
                localStorage.setItem(LS_SYNC_DIRTY_KEY, '1');
                try {
                    const payload = await STORAGE_ENGINE.exportAll();
                    const status = await EXCEL_SYNC.pushSharedDb(payload);
                    if (status === 'ok') {
                        localStorage.removeItem(LS_SYNC_DIRTY_KEY);
                        APP.setSyncIndicator('synced');
                    } else {
                        APP.setSyncIndicator('local');
                    }
                } catch (err) {
                    console.error('pushSharedDb failed:', err);
                    APP.setSyncIndicator('local');
                }
            },

            // V29.104 FEAT: หลังกดปุ่ม "เปิด Excel Bridge" (index.html, ยิง custom protocol
            // plantlogbridge:// ให้ OS เปิด process ใหม่) หน้าเว็บไม่รู้ตัวว่า bridge เพิ่งเปิดสำเร็จเมื่อไหร่
            // — เดิมต้องรอ pollAutoImport รอบถัดไป (สูงสุด 5 นาที) หรือ operator กด refresh หน้าเว็บเองถึงจะ
            // sync ให้ ฟังก์ชันนี้ poll ถี่ๆ ระยะสั้นแทน (ทุก 1 วิ, สูงสุด 15 ครั้ง — จากการทดสอบจริงตอนทำ
            // V29.103 bridge ตอบ /ping ได้ภายใน ~2-3 วิหลัง process เริ่ม จึงเผื่อเกินพอ) พอเจอว่า bridge
            // ตอบแล้วให้ sync ทันทีทั้ง indicator (pushSharedDb) และข้อมูลจริง (pollAutoImport) ในจังหวะ
            // เดียวกันเลย ไม่ต้องรอ operator ทำอะไรต่อ
            //
            // V29.106 FIX: เดิม index.html ปล่อยให้ href="plantlogbridge://start" ทำงานเสมอทุกครั้งที่กดปุ่ม
            // ควบคู่ไปกับฟังก์ชันนี้ — ถ้ากดปุ่มตอน bridge จริงๆ ทำงานอยู่แล้วแต่ indicator ยังไม่ทันอัปเดตเป็น
            // SYNCED (จังหวะสั้นๆ ตอนเพิ่งโหลดหน้าเว็บ ก่อน pushSharedDb/pullSharedDb ตอน init จะสำเร็จ) จะ
            // เผลอสั่งเปิด instance ใหม่ซ้อนทับของเดิม → ชน port 5175 → excel-bridge.ps1 crash (ไม่มี try/catch
            // ห่อ $listener.Start() เลย) → ค้างเป็นหน้าต่างดำรอ keypress ที่ operator เห็นว่า "ไม่ปิดไปเอง"
            // (พบจริงบนเครื่อง operator) — แก้โดยเช็คก่อนเสมอว่า bridge ตอบอยู่แล้วหรือยัง ถ้าตอบแล้วข้ามการ
            // เปิด instance ใหม่ไปเลย เปิดจริงเฉพาะตอนเช็คแล้วว่ายังไม่มีใครตอบเท่านั้น (ดู index.html
            // bindEvents ที่เปลี่ยนมา preventDefault() คู่กัน ให้ JS เป็นคนตัดสินใจ navigate แทน href ตรงๆ)
            retryConnectAfterOpenBridge: async () => {
                if (isConnectingToBridge) return; // กันกดปุ่มรัวๆ แล้วมี loop ซ้อนกันหลายอัน
                isConnectingToBridge = true;
                try {
                    const already = await EXCEL_AUTOIMPORT.getSourceFileInfo();
                    if (already.status !== 'bridge-offline') {
                        // bridge ตอบอยู่แล้ว (indicator แค่ยังไม่ทันอัปเดตเป็น SYNCED) — sync ทันที ไม่ต้อง
                        // เปิด instance ใหม่ซ้อนของเดิม (กัน crash ชน port ตามที่อธิบายไว้ด้านบน)
                        await APP.pushSharedDb();
                        await APP.pollAutoImport();
                        return;
                    }

                    window.location.href = 'plantlogbridge://start';

                    const maxAttempts = 15;
                    for (let i = 0; i < maxAttempts; i++) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const info = await EXCEL_AUTOIMPORT.getSourceFileInfo();
                        if (info.status !== 'bridge-offline') {
                            await APP.pushSharedDb();
                            await APP.pollAutoImport();
                            return;
                        }
                    }
                } finally {
                    isConnectingToBridge = false;
                }
            },

            // V29.85 FEAT: sidebar indicator — เขียว "SYNCED" ตอน push/pull กับ D: สำเร็จสดๆ, เหลือง
            // "LOCAL MODE" (ค่า default เดิม) ตอนไม่มี Bridge/ใช้ local เท่านั้น อัปเดตทุกครั้งที่ push/pull
            // เสร็จ ไม่มี poll แยกต่างหาก
            // V29.87 FEAT: คู่กับจุดเล็กๆ นี้ ยังอัปเดต banner เด่นๆ บน Dashboard ด้วย (renderSyncWarningBanner)
            // ให้ operator ที่ไม่ได้สังเกตจุดเล็กๆ รู้ตัวว่าข้อมูลที่แก้ไม่ถูกแชร์ให้เพื่อนร่วมกะ
            setSyncIndicator: (state) => {
                currentSyncState = state;
                if (state === 'synced') syncWarningDismissed = false; // sync กลับมาแล้ว เผื่อหลุดอีกจะได้เตือนใหม่

                const dot = document.getElementById('sync-status-dot');
                const label = document.getElementById('sync-status-label');
                if (dot && label) {
                    if (state === 'synced') {
                        dot.classList.remove('bg-amber-400');
                        dot.classList.add('bg-emerald-500');
                        label.textContent = 'SYNCED';
                    } else {
                        dot.classList.remove('bg-emerald-500');
                        dot.classList.add('bg-amber-400');
                        label.textContent = 'LOCAL MODE';
                    }
                }
                // V29.103 FEAT: โชว์ปุ่ม "เปิด Excel Bridge" เฉพาะตอนยังไม่ synced (Bridge อาจยังไม่ได้เปิด) —
                // ซ่อนทันทีที่ synced สำเร็จ กันกดซ้ำเปิด instance ที่สองไปชน port 5175 ที่จองอยู่แล้ว
                const openBridgeBtn = document.getElementById('btn-open-bridge');
                if (openBridgeBtn) openBridgeBtn.classList.toggle('hidden', state === 'synced');

                APP.renderSyncWarningBanner();
            },

            renderSyncWarningBanner: () => {
                const banner = document.getElementById('sync-warning-banner');
                if (!banner) return;
                banner.classList.toggle('hidden', currentSyncState === 'synced' || syncWarningDismissed);
                if (!banner.classList.contains('hidden')) UI_RENDERER.initIcons();
            },

            dismissSyncWarning: () => {
                syncWarningDismissed = true;
                APP.renderSyncWarningBanner();
            },

            // V29.88 FEAT: แยก banner นี้จาก sync-warning-banner เพราะ 'error' (เจอไฟล์ซ้ำ/หา WatchFolder
            // ไม่เจอ) เป็นปัญหาที่ต้องมีคนไปจัดการไฟล์/path จริง ต่างจาก 'bridge-offline' (แค่ยังไม่เปิด
            // Bridge) ที่ยังคงเงียบเหมือนเดิม — reset dismiss อัตโนมัติถ้าข้อความเปลี่ยน (ปัญหาใหม่คนละเรื่อง)
            // หรือกลับมาปกติแล้วเจอปัญหาอีกรอบ กันไม่ให้ dismiss ครั้งเดียวพลาดเตือนปัญหาถัดไป
            renderAutoImportWarningBanner: (info) => {
                const banner = document.getElementById('autoimport-warning-banner');
                if (!banner) return;

                if (info.status === 'error') {
                    if (autoImportErrorMessage !== info.message) autoImportWarningDismissed = false;
                    autoImportErrorMessage = info.message || 'ตั้งค่า Watch Folder ของ Excel Bridge มีปัญหา';
                    const textEl = document.getElementById('autoimport-warning-text');
                    if (textEl) textEl.textContent = autoImportErrorMessage;
                    banner.classList.toggle('hidden', autoImportWarningDismissed);
                    if (!banner.classList.contains('hidden')) UI_RENDERER.initIcons();
                } else {
                    autoImportErrorMessage = null;
                    banner.classList.add('hidden');
                }
            },

            dismissAutoImportWarning: () => {
                autoImportWarningDismissed = true;
                const banner = document.getElementById('autoimport-warning-banner');
                if (banner) banner.classList.add('hidden');
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
                // V29.102 FEAT: สั่ง Excel save ไฟล์ log sheet ที่เปิดอยู่ให้เองก่อนอย่างอื่นทั้งหมด — สูตร
                // PI Datalink คำนวณค่าใหม่แสดงบนจอ Excel แบบ live ได้เอง แต่ค่านั้นยังไม่ถูกเขียนกลับไฟล์บน
                // ดิสก์จนกว่าจะมีการ Save จริง ทำให้เช็ค mtime ด้านล่าง (getSourceFileInfo) ไม่เห็นว่าไฟล์
                // เปลี่ยนจนกว่า operator จะกด Ctrl+S เอง — ไม่ block ถ้า bridge offline/ไม่มีไฟล์เปิดอยู่ แค่
                // log ไว้เฉยๆ (auto-import เดิมยังทำงานได้ปกติถ้า operator กด save เองอยู่แล้ว)
                // V29.107 FIX: เดิมไม่ log สถานะ 'no-file-open' เลย (ตั้งใจ whitelist ไว้เพราะคิดว่าเป็นเคส
                // ปกติที่ยังไม่มีใครเปิดไฟล์) แต่นี่คือสาเหตุหนึ่งที่ทำให้ autosave เงียบล้มเหลวโดยไม่มีร่องรอย
                // ให้ตามหา (ดู root cause จริงที่ excel-bridge.ps1 — Handle-AutosaveSourceFile) เปลี่ยนเป็น log
                // ทุก status ที่ไม่ใช่ 'ok' เพื่อให้วินิจฉัยปัญหาลักษณะนี้ในอนาคตได้จาก console โดยไม่ต้องสืบใหม่
                const autosave = await EXCEL_AUTOIMPORT.autosaveSourceFile();
                if (autosave.status !== 'ok') {
                    console.warn('[auto-save] autosaveSourceFile:', autosave.status, autosave.message || '');
                }

                // V29.96 FEAT: เช็ค/ทำ rollover ไฟล์ log sheet วันใหม่เป็นก้าวถัดมาของทุก poll (idempotent
                // ฝั่ง bridge เอง — no-op ถ้าวันที่ในชื่อไฟล์ตรงกับวันนี้อยู่แล้ว) ก่อนเช็ค getSourceFileInfo
                // เพื่อให้ถ้ามี rename เกิดขึ้นพอดีรอบนี้ ส่วนที่เหลือของ poll เดียวกันเห็นไฟล์ใหม่ทันที
                // ไม่ต้องรอ poll รอบถัดไปอีก 5 นาที
                const rollover = await APP.rolloverDailyFileIfNeeded();

                const info = await EXCEL_AUTOIMPORT.getSourceFileInfo();
                // V29.96 FEAT: ถ้า rollover เจอว่าถึงเวลาต้องเปลี่ยนวันแล้วแต่เปิดไฟล์อัตโนมัติไม่สำเร็จ
                // ให้ banner เดิมของ V29.88 (ปกติไว้เตือน info.status==='error') โชว์ปัญหานี้แทน — สำคัญ
                // กว่าสถานะปกติของ info (ไฟล์เดิมยังอ่านได้ปกติ แค่ยังไม่ถูกเปลี่ยนชื่อ) ต้อง merge ก่อนเรียก
                // ครั้งเดียว ไม่ใช่เรียกซ้อนสองครั้งแยกกัน ไม่งั้นการเรียกครั้งหลังจะไปเคลียร์ banner ที่เพิ่ง
                // โชว์จากรอบแรกทิ้งทันที
                // V29.97 FEAT: bridge เปิดไฟล์ log sheet ให้เองอัตโนมัติแล้ว (ไม่ต้องรอ operator เปิดเอง) —
                // เหลือแค่ status 'open-failed' (COM เปิดไฟล์จริงๆ ไม่สำเร็จ เช่นไฟล์เสีย/ถูกล็อก) ที่ยังต้อง
                // แจ้งเตือน operator ให้ไปเช็คที่เครื่อง Bridge เอง
                // V29.101 FEAT: เพิ่มเคส 'stale-template' (rollover เห็นว่าชื่อไฟล์ตรงวันนี้แล้วเลยไม่ทำอะไร
                // แต่เนื้อหาจริงเหมือนไฟล์ (master) เป๊ะ — ดู Test-FileLooksLikeMasterTemplate ใน
                // excel-bridge.ps1) และ info.looksLikeTemplate (เจอผ่าน /source-file-info ตามปกติ แม้
                // rollover จะไม่ได้ถูกเรียกหรือคืนสถานะอื่น) — ทั้งสองเคสคือไฟล์ที่ Web App/operator เห็น
                // "เปิดสำเร็จ" แต่จริงๆ ไม่มีข้อมูลจริงอยู่ข้างในเลย ต้องแจ้งเตือนแทนที่จะเงียบเหมือนเดิม
                let bannerInfo = info;
                if (rollover.status === 'open-failed') {
                    bannerInfo = { status: 'error', message: `ถึงเวลาต้องเปลี่ยนไฟล์ log sheet เป็นวันใหม่แล้ว แต่เปิดไฟล์ใน Excel อัตโนมัติไม่สำเร็จ — กรุณาตรวจสอบไฟล์/Excel บนเครื่อง Bridge (${rollover.message || ''})` };
                } else if (rollover.status === 'stale-template') {
                    bannerInfo = { status: 'error', message: rollover.message || `ไฟล์ log sheet '${rollover.fileName || ''}' ชื่อเป็นวันนี้แล้ว แต่เนื้อหายังเป็นไฟล์ (master) เปล่าอยู่ — กรุณาตรวจสอบไฟล์เอง` };
                } else if (info.status === 'ok' && info.looksLikeTemplate) {
                    bannerInfo = { status: 'error', message: `ไฟล์ log sheet '${info.fileName}' เนื้อหาเหมือนไฟล์ (master) เป๊ะ (ไม่มีข้อมูลจริงอยู่ข้างใน) — กรุณาตรวจสอบไฟล์เอง` };
                } else if (autosave.status === 'no-file-open') {
                    // V29.107 FEAT: priority ต่ำกว่าเคสข้างบนทั้งหมดเพราะเคสเหล่านั้นเจาะจงกว่า — เคสนี้แค่
                    // "ไม่มีไฟล์เปิดอยู่ใน Excel เลย" ซึ่งทำให้ autosave (และ Handle-WriteRemark) ทำอะไรไม่ได้
                    // เลยจนกว่า operator จะเปิดไฟล์ log sheet ค้างไว้ที่เครื่อง Bridge
                    bannerInfo = { status: 'error', message: `ไม่พบไฟล์ log sheet เปิดอยู่ใน Excel บนเครื่อง Bridge — กรุณาเปิดไฟล์ log sheet ค้างไว้ เพื่อให้ autosave/auto-import ทำงานได้` };
                }
                APP.renderAutoImportWarningBanner(bannerInfo); // V29.88 FEAT: โชว์/ซ่อน banner ตามสถานะล่าสุดทุกรอบ poll

                if (info.status !== 'ok' || info.looksLikeTemplate) {
                    // bridge-offline / not-found — สถานะปกติ ไม่ต้องรบกวน operator (เหมือนเดิม)
                    // 'error' (เจอไฟล์ซ้ำ/หา WatchFolder ไม่เจอ) โชว์ผ่าน banner ข้างบนไปแล้ว
                    // V29.101 FEAT: looksLikeTemplate — ไฟล์อ่านได้ปกติแต่เนื้อหาเป็น (master) เปล่า ห้าม
                    // import เนื้อหานี้เข้า Records เด็ดขาด (จะสร้าง reading ปลอมทั้งชุดจากไฟล์ template)
                    return;
                }

                // แก้ record เก่าที่เคยติดชื่อไฟล์ผิด (บั๊ก CORS ก่อน fix — ดู LEGACY_UNKNOWN_FILENAME)
                // ให้กลับมาเป็นชื่อไฟล์จริง ก่อนเช็ค mtime เพื่อให้รันแม้ไฟล์ยังไม่เปลี่ยนจากรอบก่อน
                await APP.repairAutoImportedFileNames(info.fileName);

                const lastMtime = localStorage.getItem(LS_AUTOIMPORT_LAST_MTIME_KEY);
                if (lastMtime === info.lastWriteTimeUtc) {
                    // V29.86 FIX: ไฟล์ไม่เปลี่ยนจากรอบก่อน ไม่ต้อง reimport ซ้ำ — แต่ยังเช็ค archive ต่อ
                    // เผื่อรอบก่อน archive ล้มเหลว (เช่นไฟล์ล็อกจังหวะ Excel/PI กำลังเขียน) จะได้ retry ได้
                    // ต่อแม้ไฟล์จะไม่เปลี่ยนแปลงเพิ่มแล้วก็ตาม (เดิมจะ return ทิ้งตรงนี้เลย ทำให้ archive
                    // ที่เคยพลาดไม่มีวันถูก retry อีกถ้าไฟล์ไม่ถูกแก้เพิ่ม)
                    await APP.checkAndArchiveIfComplete(info.lastWriteTimeUtc);
                    return;
                }

                const fetched = await EXCEL_AUTOIMPORT.fetchSourceFile(info.fileName);
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

                // เช็คว่าข้อมูลวันล่าสุดครบ 4 เวลา (03:00/09:00/15:00/21:00) แล้วหรือยัง — ถ้าไฟล์ต้นฉบับ
                // เปลี่ยนไปจากตอน archive ล่าสุด (mtime ต่าง) ให้สั่ง Bridge archive ซ้ำเก็บ safety copy
                // ให้อัตโนมัติ ครอบคลุมทั้งข้อมูลใหม่และ Resolution Remark ที่เพิ่งเขียนกลับ Excel
                await APP.checkAndArchiveIfComplete(info.lastWriteTimeUtc);
            },

            // แก้ record ที่เคย auto-import เข้ามาตอนยังมีบั๊ก CORS (ก่อน fix นี้) แล้วติดชื่อไฟล์ placeholder
            // ผิดๆ (LEGACY_UNKNOWN_FILENAME) ค้างอยู่ ให้กลับมาเป็นชื่อไฟล์จริงปัจจุบัน จะได้ sync remark
            // กลับ Excel ได้ตามปกติ — one-time best-effort: ตั้งอยู่บนสมมติฐานว่ามี log sheet ไฟล์เดียวที่
            // active อยู่ (ตาม pattern การทำงานจริงของ operator) ไม่ได้ออกแบบมารองรับ record เก่าหลายวันที่
            // ติดชื่อผิดจากไฟล์คนละไฟล์กัน
            repairAutoImportedFileNames: async (correctFileName) => {
                const records = STATE.get('records') || [];
                const broken = records.filter(r => r.sourceFileName === LEGACY_UNKNOWN_FILENAME);
                if (broken.length === 0) return;

                broken.forEach(r => { r.sourceFileName = correctFileName; });
                await STORAGE_ENGINE.updateRecordsBatch(broken);
                APP.pushSharedDb(); // V29.85 FEAT: fire-and-forget
            },

            // V29.86 FIX (เดิม V29.78 FEAT): trigger archive อัตโนมัติเมื่อข้อมูลวันล่าสุดครบ 4 เวลา
            // (03:00/09:00/15:00/21:00) — เช็คใหม่ทุกครั้งที่เรียก และสั่ง archive ซ้ำทุกครั้งที่ไฟล์
            // ต้นฉบับเปลี่ยนไปจากตอน archive สำเร็จล่าสุด (เทียบ mtime) ไม่ใช่แค่ครั้งแรกที่ครบ 4 เวลา
            // เหมือนเดิม — เพราะ operator มักพิมพ์ Resolution Remark หลังข้อมูล 21:00 เข้ามาแล้ว ทำให้
            // bridge เขียน comment กลับ Excel + save ไฟล์ (mtime เปลี่ยนจริง) ถ้า archive ไปแล้วครั้งเดียว
            // แล้วหยุดเลย comment ที่เขียนทีหลังจะไม่มีวันถูกคัดลอกไปที่ archive copy เลย ถ้า archive
            // ล้มเหลว (เช่นไฟล์ล็อกจังหวะ PI กำลังเขียน) จะไม่ mark ว่าเสร็จแล้ว รอบ poll ถัดไปจะลองใหม่เอง
            // ไม่ต้องมี retry logic พิเศษ
            checkAndArchiveIfComplete: async (currentMtime) => {
                const status = getCanonicalTimesStatus(STATE.get('records'));
                if (!status.isComplete) {
                    lastArchivedMtime = null; // เผื่อเปลี่ยนวันใหม่ ให้เริ่มนับใหม่รอบหน้า
                    return;
                }
                if (lastArchivedMtime === currentMtime) return; // archive ไฟล์เวอร์ชันนี้ไปแล้ว ไม่ต้องซ้ำ

                const archiveStatus = await EXCEL_AUTOIMPORT.archiveSourceFile();
                if (archiveStatus === 'ok') {
                    lastArchivedMtime = currentMtime;
                } else {
                    console.warn('[auto-archive] archive failed, will retry next poll:', archiveStatus);
                }
            },

            // V29.96 FEAT: เรียกทุก poll cycle (ทุก 5 นาที ดู pollAutoImport ด้านบน) — idempotent ฝั่ง
            // bridge เอง ปกติจะได้ 'already-current' เกือบทุกครั้ง (no-op เงียบๆ) จะ rename+เขียนวันที่ใหม่
            // จริงแค่ตอนเลยเที่ยงคืนมาแล้วเท่านั้น คืนผลลัพธ์กลับให้ caller ตัดสินใจเรื่อง banner เอง (ดู
            // การ merge กับ getSourceFileInfo ใน pollAutoImport) — ใช้ร่วมกับปุ่ม "Rollover เองตอนนี้" ได้ด้วย
            rolloverDailyFileIfNeeded: async () => {
                const result = await EXCEL_AUTOIMPORT.rolloverDailyFileIfNeeded();
                if (result.status === 'ok') {
                    console.info(`[auto-rollover] เปลี่ยนไฟล์ log sheet เป็นวันใหม่แล้ว: ${result.oldFileName} → ${result.newFileName}`, result.warning || '');
                } else if (result.status === 'error') {
                    console.warn('[auto-rollover] rollover failed:', result.message);
                } else if (result.status === 'stale-template') {
                    // V29.101 FEAT: banner แสดงจริงถูก merge ไว้ที่ pollAutoImport (caller) แล้ว — log ไว้ที่
                    // นี้เพื่อ debug เท่านั้น
                    console.warn('[auto-rollover] stale-template detected:', result.message);
                }
                return result;
            },

            // V29.99 FEAT: เรียกครั้งเดียวตอน init() — ปิดช่องว่างตอนเปลี่ยนกะ (~ทุก 12 ชม.) ที่ operator
            // คนใหม่ login มาเปิด Web App แต่วันที่ในชื่อไฟล์ยังไม่ข้ามเที่ยงคืน (rollover เห็นว่า
            // already-current เลยไม่เปิด Excel ให้) — endpoint นี้ไม่สนวันที่เลย เช็คแค่ว่า Excel เปิดไฟล์
            // อยู่ไหม เงียบๆ เบื้องหลัง ไม่ต้อง block init และไม่มี UI feedback (ต่างจาก rollover ที่มี
            // banner/alert เพราะเคสนี้ไม่ใช่ error ที่ operator ต้องรู้ แค่ background housekeeping)
            ensureExcelFileOpen: async () => {
                const result = await EXCEL_AUTOIMPORT.ensureFileOpen();
                if (result.status === 'ok') {
                    console.info(`[ensure-file-open] เปิดไฟล์ log sheet ให้พร้อมแล้ว: ${result.fileName}`);
                    // V29.101 FEAT: ต่างจาก comment เดิมด้านบน (V29.99 — "ไม่ใช่ error ที่ operator ต้องรู้")
                    // — เคสนี้คือไฟล์เปิดสำเร็จจริง แต่เนื้อหาข้างในเหมือนไฟล์ (master) เป๊ะ (ไม่มีข้อมูลจริง)
                    // ซึ่งเป็นสาเหตุตรงของเหตุการณ์จริงที่ operator เจอ (2026-08-22) — ต้องแจ้งทันทีตอนเปิดหน้า
                    // เว็บ ไม่รอ poll รอบถัดไปอีก 5 นาที
                    if (result.warning) {
                        console.warn('[ensure-file-open] warning:', result.warning);
                        APP.renderAutoImportWarningBanner({ status: 'error', message: result.warning });
                    }
                } else if (result.status === 'open-failed') {
                    console.warn('[ensure-file-open] เปิดไฟล์ log sheet ไม่สำเร็จ:', result.message);
                }
                return result;
            },

            // V29.96 FEAT: ปุ่ม "Rollover เองตอนนี้" (view-import) — เรียก logic เดียวกับที่ poll อัตโนมัติ
            // ใช้ทุก 5 นาที มีไว้ทดสอบตอน deploy ครั้งแรก หรือเป็นทางสำรองถ้า bridge ดันไม่ออนไลน์พอดีตอน
            // เที่ยงคืน ต่างจาก poll ตรงที่ต้องมี feedback ให้เห็นทันที (alert ตาม pattern เดียวกับ backup/
            // restore ในไฟล์นี้) เพราะเป็น manual user action ไม่ใช่ background sync เงียบๆ
            rolloverDailyFileNow: async () => {
                const result = await APP.rolloverDailyFileIfNeeded();
                if (result.status === 'ok') {
                    alert(`เปลี่ยนไฟล์ log sheet เป็นวันใหม่สำเร็จ\n${result.oldFileName}\n→ ${result.newFileName}${result.warning ? `\n\n⚠️ ${result.warning}` : ''}`);
                } else if (result.status === 'already-current') {
                    alert('ไฟล์ log sheet เป็นวันปัจจุบันอยู่แล้ว ไม่ต้องเปลี่ยน');
                } else if (result.status === 'stale-template') {
                    // V29.101 FEAT: ชื่อไฟล์ตรงวันนี้แล้ว (rollover จึงไม่ทำอะไรต่อ) แต่เนื้อหาข้างในเหมือน
                    // ไฟล์ (master) เป๊ะ — ดู Test-FileLooksLikeMasterTemplate ใน excel-bridge.ps1
                    alert(`⚠️ ${result.message || 'ไฟล์เป็นวันปัจจุบันแล้ว แต่เนื้อหาเหมือนไฟล์ (master) เป๊ะ กรุณาตรวจสอบไฟล์เอง'}`);
                } else if (result.status === 'open-failed') {
                    // V29.97 FEAT: bridge พยายามเปิดไฟล์ให้เองอัตโนมัติแล้วแต่ล้มเหลวจริงๆ (ไฟล์เสีย/ถูกล็อก)
                    // — ไม่ใช่เคส "operator ยังไม่เปิด" อีกต่อไป จึงไม่บอกให้เปิดไฟล์เองแบบเดิม
                    alert(`${result.message || 'เปิดไฟล์ log sheet ใน Excel อัตโนมัติไม่สำเร็จ'}\n\nกรุณาตรวจสอบไฟล์/Excel บนเครื่อง Bridge`);
                } else if (result.status === 'bridge-offline') {
                    alert('ไม่พบ Local Bridge — กรุณาเปิด excel-bridge.ps1 ก่อน');
                } else {
                    alert(`เปลี่ยนวันไม่สำเร็จ: ${result.message || result.status}`);
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
                        STATE.set('timeFilter', getDefaultTimeFilter(STATE.get('records'))); // V29.105 FEAT: default ไปรอบเวลาล่าสุด แทน 'all'
                        APP._autoTimeFilter = STATE.get('timeFilter'); // V29.109 FIX: reset tracking ให้ auto-import เลื่อนตามได้ต่อ
                        APP.pushSharedDb(); // V29.85 FEAT: fire-and-forget — sync restore ที่เพิ่ง import ไปทับ D: ด้วย
                        alert("กู้คืนข้อมูลสำเร็จ");
                    } catch (error) {
                        console.error("Restore Failed: ", error);
                        alert("เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ไฟล์อาจมีโครงสร้างไม่ถูกต้อง");
                    }
                };
                reader.onerror = () => alert("ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
                reader.readAsText(file);
            },


            // V29.89 FEAT: สลับ tab แบบ imperative (toggle nav-btn active class + view-panel visibility)
            // แยกออกมาจาก nav-btn click handler เดิม เพื่อให้โค้ดที่ไม่ใช่ click event จริง (เช่น ปุ่ม "ดู
            // ทั้งหมดที่หน้า History" ใน Dashboard truncation-notice) เรียกสลับ tab ได้แบบเดียวกันโดยไม่ต้อง
            // duplicate logic
            switchTab: (tab) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab));
                document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
                const viewEl = document.getElementById(`view-${tab}`);
                if (viewEl) viewEl.classList.remove('hidden');
                STATE.set('activeTab', tab);
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
                    btn.addEventListener('click', (e) => APP.switchTab(e.currentTarget.dataset.tab));
                });

                // V29.89 FEAT: History view (date-range, search, pagination, export)
                assignEvent('history-search', () => APP.renderHistoryView(), 'input');
                assignEvent('history-from', (e) => APP.setHistoryDateRange(e.target.value, document.getElementById('history-to')?.value), 'change');
                assignEvent('history-to', (e) => APP.setHistoryDateRange(document.getElementById('history-from')?.value, e.target.value), 'change');
                assignEvent('btn-history-reset-range', () => APP.resetHistoryDateRangeToAll());
                assignEvent('btn-history-prev', () => APP.historyPrevPage());
                assignEvent('btn-history-next', () => APP.historyNextPage());
                assignEvent('btn-history-export', () => APP.exportAbnormalHistory());

                assignEvent('btn-clear-db', async () => {
                    // V29.85 FIX: การล้างนี้จะ push ไป shared-db บน D: ด้วย (เหมือน mutation อื่นทุกจุด)
                    // กระทบ Dashboard ของ operator คนอื่นที่ reload หน้าเว็บทีหลังด้วย ไม่ใช่แค่เครื่องนี้
                    // อีกต่อไป — ต้องบอกตรงๆ ใน dialog กันสับสน
                    if (confirm("ต้องการล้างค่าที่บันทึกไว้ (Readings) ของรอบก่อนหน้าใช่หรือไม่? (รายการ Tag และการตั้งค่า Master จะไม่ถูกลบ)\n\n⚠ การล้างนี้จะ sync ไปยังเครื่อง/operator คนอื่นที่ใช้ข้อมูลชุดเดียวกันผ่าน Local Bridge ด้วย")) {
                        try {
                            await STORAGE_ENGINE.clearImportedData();
                            STATE.set('timeFilter', 'all');
                            STATE.set('viewFilter', 'hard-abnormal'); // V29.94: default ใหม่ = เฉพาะ Abnormalities (การ์ด active-state sync ผ่าน renderDashboard เองแล้ว ไม่ต้อง poke DOM แยก)
                            await APP.loadLocalData();
                            APP.pushSharedDb(); // V29.85 FEAT: fire-and-forget
                        } catch (error) {
                            console.error("Clear DB Failed: ", error);
                            alert("ล้างข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                        }
                    }
                });

                // V29.87 FEAT: Sync warning banner dismiss (ปิดชั่วคราวต่อ session เดียว ไม่ persist)
                assignEvent('btn-sync-warning-dismiss', () => APP.dismissSyncWarning());

                // V29.88 FEAT: Auto-import config error banner dismiss (ปิดชั่วคราวต่อ session เดียว)
                assignEvent('btn-autoimport-warning-dismiss', () => APP.dismissAutoImportWarning());

                // V29.96 FEAT: ปุ่ม "Rollover เองตอนนี้" (view-import) — ทดสอบ/สำรองคู่กับ auto-rollover
                assignEvent('btn-rollover-daily-file', APP.rolloverDailyFileNow);

                // V29.106 FIX: เดิมไม่ preventDefault ปล่อยให้ href (plantlogbridge://start) ทำงานเสมอ
                // ควบคู่ไปกับ retry loop — ทำให้เปิด bridge ซ้อนไปชน port กับ instance ที่ทำงานอยู่แล้วได้
                // (ดู comment ใน retryConnectAfterOpenBridge) ต้อง preventDefault แล้วให้ JS เป็นคนตัดสินใจ
                // navigate เองแทนเฉพาะตอนเช็คแล้วว่าจำเป็นจริงๆ
                assignEvent('btn-open-bridge', (e) => {
                    e.preventDefault();
                    APP.retryConnectAfterOpenBridge();
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

                if (['tags', 'records', 'timeFilter', 'viewFilter', 'masterTags', 'userCountermeasures', 'selectedForReport', 'abnormalHistory'].includes(changedKey)) {
                    // V29.52 PERF: render only the table for the visible tab; hidden tabs re-render on switch below
                    if (activeTab === 'dashboard') APP.renderDashboard();
                    else if (activeTab === 'tags') APP.renderTagTable(tagSearchVal());
                    else if (activeTab === 'master') APP.renderMasterTable(masterSearchVal());
                    else if (activeTab === 'countermeasure') APP.renderCountermeasureTable(countermeasureSearchVal());
                    else if (activeTab === 'history') APP.renderHistoryView(); // V29.89 FEAT
                    APP.updateFloatingBar();
                }
                if (changedKey === 'activeTab') {
                    if (activeTab === 'dashboard') APP.renderDashboard();
                    if (activeTab === 'tags') APP.renderTagTable(tagSearchVal());
                    if (activeTab === 'master') APP.renderMasterTable(masterSearchVal());
                    if (activeTab === 'countermeasure') APP.renderCountermeasureTable(countermeasureSearchVal());
                    if (activeTab === 'history') APP.renderHistoryView(); // V29.89 FEAT
                }
            },
});
