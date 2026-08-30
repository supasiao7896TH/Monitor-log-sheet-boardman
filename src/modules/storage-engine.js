import { getTagId, STORE_TAGS, STORE_RECORDS, STORE_MASTERTAGS, STORE_IMPORTHISTORY, STORE_COUNTERMEASURES, STORE_ABNORMAL_HISTORY } from './shared.js';

// V29.112 FEAT: pure logic ของ mergeAll แยกออกมาเป็น named export ต่างหาก (เหมือน pattern buildWriteRemarkPayload
// ใน excel-writeback.js) ให้ test ได้โดยไม่ต้องพึ่ง IndexedDB จริง (repo นี้ไม่มี fake-indexeddb/jsdom
// ในชุด test — ดู tests/storage-engine.test.js) — คืนเฉพาะ item ที่ id ยังไม่มีใน existingIds เท่านั้น
// ("local ชนะเสมอสำหรับ id ที่มีอยู่แล้ว" ดูเหตุผลเต็มที่คอมเมนต์ mergeAll ด้านล่าง)
export function selectMissingById(existingIds, items) {
    return items.filter(item => !existingIds.has(item.id));
}

export const STORAGE_ENGINE = {
            db: null,
            init: () => new Promise((resolve, reject) => {
                const req = indexedDB.open('PlantLogAnalyzerEnterpriseDB', 7);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if(!db.objectStoreNames.contains(STORE_TAGS)) db.createObjectStore(STORE_TAGS, { keyPath: 'id' });
                    // V29.78 FEAT: index บน timestamp (numeric epoch ms) เพิ่มเติมจาก isAbnormal เดิม — เผื่อ
                    // query แบบช่วงวันที่ในอนาคต (getRecordsByTimestampRange) ไม่ต้อง getAll() ทั้ง store เสมอไป.
                    // Guard ด้วย indexNames.contains ทั้งสองเส้นทาง เพราะ store อาจเพิ่งถูกสร้างใหม่ (fresh install
                    // ยังไม่มี index ไหนเลย) หรือมีอยู่แล้วจาก v5 (มีแค่ isAbnormal ต้องเติม timestamp เพิ่ม)
                    let recordsStore;
                    if(!db.objectStoreNames.contains(STORE_RECORDS)) {
                        recordsStore = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
                    } else {
                        recordsStore = e.target.transaction.objectStore(STORE_RECORDS);
                    }
                    if(!recordsStore.indexNames.contains('isAbnormal')) recordsStore.createIndex('isAbnormal', 'isAbnormal', { unique: false });
                    if(!recordsStore.indexNames.contains('timestamp')) recordsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    if(!db.objectStoreNames.contains(STORE_MASTERTAGS)) db.createObjectStore(STORE_MASTERTAGS, { keyPath: 'id' });
                    // V29.51 FEAT: Import audit trail
                    if(!db.objectStoreNames.contains(STORE_IMPORTHISTORY)) db.createObjectStore(STORE_IMPORTHISTORY, { keyPath: 'id' });
                    // V29.58 FEAT: คำแนะนำ Auto-Draft ที่ผู้ใช้เพิ่มเอง (นอกเหนือจากคู่มือ MPS ที่ hardcode ไว้)
                    if(!db.objectStoreNames.contains(STORE_COUNTERMEASURES)) db.createObjectStore(STORE_COUNTERMEASURES, { keyPath: 'id' });
                    // V29.90 FEAT: snapshot ของ record ที่เคยเป็น Abnormal/Stat Deviation แยกจาก STORE_RECORDS
                    // โดยตั้งใจ — ให้อยู่รอด "ล้างฐานข้อมูล" (ซึ่งเคลียร์แค่ STORE_RECORDS) ดู
                    // APP.syncAbnormalHistory ใน app-core.js
                    if(!db.objectStoreNames.contains(STORE_ABNORMAL_HISTORY)) db.createObjectStore(STORE_ABNORMAL_HISTORY, { keyPath: 'id' });
                };
                req.onsuccess = (e) => { STORAGE_ENGINE.db = e.target.result; resolve(); };
                req.onerror = reject;
                // V29.64 FIX: ถ้าเปิดแอปนี้ค้างไว้อีก tab หนึ่งพร้อมกันตอนต้อง upgrade version, onsuccess/onerror
                // จะไม่ยิงเลยและ tab นี้จะค้างเงียบๆ ตลอดไป — อย่างน้อยแจ้งให้ operator รู้ว่าต้องปิด tab อื่นก่อน
                req.onblocked = () => alert("ไม่สามารถเปิดฐานข้อมูลได้เนื่องจากมีการเปิดแอปนี้ค้างไว้ในแท็บอื่น กรุณาปิดแท็บอื่นที่เปิดแอปนี้อยู่ แล้วโหลดหน้านี้ใหม่อีกครั้ง");
            }),
            saveBatch: (tags, records) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_TAGS, STORE_RECORDS], 'readwrite');
                tags.forEach(t => { t.id = getTagId(t); tx.objectStore(STORE_TAGS).put(t); });
                records.forEach(r => tx.objectStore(STORE_RECORDS).put(r));
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            // V29.78 FEAT: เหมือน saveBatch ทุกประการ (put()-based upsert เดียวกัน) แต่นับด้วยว่า record
            // ไหนเป็นของใหม่จริง (id ไม่เคยมีมาก่อน) กับของเดิมที่แค่เขียนทับ — auto-import ใช้ตัวเลขนี้
            // ตัดสินใจว่าควร log เข้า ImportHistory ไหม (ไม่ log ทุกรอบ poll ที่ไม่มีอะไรเปลี่ยนจริง) แยกเป็น
            // ฟังก์ชันใหม่ต่างหาก ไม่แก้ saveBatch เดิม กันกระทบ manual import ที่ทดสอบมาดีอยู่แล้ว
            saveBatchCounting: (tags, records) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve({ recordsAdded: 0, recordsUpdated: 0 });
                const tx = STORAGE_ENGINE.db.transaction([STORE_TAGS, STORE_RECORDS], 'readwrite');
                const recordsStore = tx.objectStore(STORE_RECORDS);
                let recordsAdded = 0, recordsUpdated = 0;

                const keysReq = recordsStore.getAllKeys();
                keysReq.onsuccess = (e) => {
                    const existingIds = new Set(e.target.result);
                    tags.forEach(t => { t.id = getTagId(t); tx.objectStore(STORE_TAGS).put(t); });
                    records.forEach(r => {
                        if (existingIds.has(r.id)) recordsUpdated++; else recordsAdded++;
                        recordsStore.put(r);
                    });
                };

                tx.oncomplete = () => resolve({ recordsAdded, recordsUpdated });
                tx.onerror = () => reject(tx.error);
            }),
            saveMasterTag: (masterData) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_MASTERTAGS], 'readwrite');
                tx.objectStore(STORE_MASTERTAGS).put(masterData);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            // V29.58 FEAT: บันทึก/ลบคำแนะนำ Auto-Draft ที่ผู้ใช้เพิ่มเอง
            saveCountermeasure: (data) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_COUNTERMEASURES], 'readwrite');
                tx.objectStore(STORE_COUNTERMEASURES).put(data);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            deleteCountermeasure: (id) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_COUNTERMEASURES], 'readwrite');
                tx.objectStore(STORE_COUNTERMEASURES).delete(id);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            updateRecord: (id, updates) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_RECORDS], 'readwrite');
                const store = tx.objectStore(STORE_RECORDS);
                const req = store.get(id);
                req.onsuccess = (e) => {
                    const record = e.target.result;
                    if(record) { Object.assign(record, updates); store.put(record); }
                };
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            updateRecordsBatch: (recordsArr) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_RECORDS], 'readwrite');
                recordsArr.forEach(r => tx.objectStore(STORE_RECORDS).put(r));
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            // V29.90 FEAT: upsert record ที่เป็น Abnormal/Stat Deviation ณ ตอนนี้เข้า STORE_ABNORMAL_HISTORY
            // — put() ทับด้วย id เดิม ทำให้ remark/actionStatus ที่แก้ทีหลังอัปเดต entry เดิมอัตโนมัติ ไม่
            // ต้องมี sync logic แยกสำหรับ remark โดยเฉพาะ (ดู APP.syncAbnormalHistory ใน app-core.js)
            upsertAbnormalHistoryBatch: (recordsArr) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db || recordsArr.length === 0) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_ABNORMAL_HISTORY], 'readwrite');
                recordsArr.forEach(r => tx.objectStore(STORE_ABNORMAL_HISTORY).put(r));
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            getAll: (storeName) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve([]);
                const tx = STORAGE_ENGINE.db.transaction([storeName], 'readonly');
                const req = tx.objectStore(storeName).getAll();
                req.onsuccess = (e) => resolve(e.target.result);
                tx.onerror = () => reject(tx.error);
            }),
            // V29.78 FEAT: range query ผ่าน index 'timestamp' (เพิ่มใน schema v6) — ยังไม่มีจุดใช้งานจริงใน
            // แอปตอนนี้ (STATE.data.records ยังคงโหลดทุกวันเข้า memory เหมือนเดิมโดยตั้งใจ) แต่เตรียมไว้ให้ query
            // แบบช่วงวันที่ทำได้โดยไม่ต้อง getAll() ทั้ง store เมื่อมีความจำเป็นในอนาคต
            getRecordsByTimestampRange: (startTs, endTsExclusive) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve([]);
                const tx = STORAGE_ENGINE.db.transaction([STORE_RECORDS], 'readonly');
                const range = IDBKeyRange.bound(startTs, endTsExclusive, false, true);
                const req = tx.objectStore(STORE_RECORDS).index('timestamp').getAll(range);
                req.onsuccess = (e) => resolve(e.target.result);
                tx.onerror = () => reject(tx.error);
            }),
            clearImportedData: () => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_RECORDS], 'readwrite');
                tx.objectStore(STORE_RECORDS).clear();
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            // V29.51 FEAT: Backup / Restore (สำรอง/กู้คืนข้อมูลทั้ง 3 store เป็นไฟล์ JSON)
            // V29.58 FEAT: เพิ่ม userCountermeasures เข้า backup/restore ด้วย
            // V29.90 FEAT: เพิ่ม abnormalHistory เข้า backup/restore ด้วย — ให้ backup JSON เป็นสำเนาถาวรที่
            // ครบถ้วนจริงๆ (ไม่งั้น field ที่ตั้งใจให้ "รอดล้างฐานข้อมูล" กลับไม่รอดตอน restore จากไฟล์เก่า)
            exportAll: async () => {
                const [tags, records, masterTags, userCountermeasures, abnormalHistory] = await Promise.all([
                    STORAGE_ENGINE.getAll(STORE_TAGS),
                    STORAGE_ENGINE.getAll(STORE_RECORDS),
                    STORAGE_ENGINE.getAll(STORE_MASTERTAGS),
                    STORAGE_ENGINE.getAll(STORE_COUNTERMEASURES),
                    STORAGE_ENGINE.getAll(STORE_ABNORMAL_HISTORY)
                ]);
                return { schemaVersion: 1, exportedAt: new Date().toISOString(), tags, records, masterTags, userCountermeasures, abnormalHistory };
            },
            importAll: (payload) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                if (!payload || !Array.isArray(payload.tags) || !Array.isArray(payload.records) || !Array.isArray(payload.masterTags)) {
                    return reject(new Error('Invalid backup file structure'));
                }
                // backup เก่าก่อนมีฟีเจอร์นี้จะไม่มี userCountermeasures/abnormalHistory — default เป็น array ว่างกันพัง
                const userCountermeasures = Array.isArray(payload.userCountermeasures) ? payload.userCountermeasures : [];
                const abnormalHistory = Array.isArray(payload.abnormalHistory) ? payload.abnormalHistory : [];
                const tx = STORAGE_ENGINE.db.transaction([STORE_TAGS, STORE_RECORDS, STORE_MASTERTAGS, STORE_COUNTERMEASURES, STORE_ABNORMAL_HISTORY], 'readwrite');
                tx.objectStore(STORE_TAGS).clear();
                tx.objectStore(STORE_RECORDS).clear();
                tx.objectStore(STORE_MASTERTAGS).clear();
                tx.objectStore(STORE_COUNTERMEASURES).clear();
                tx.objectStore(STORE_ABNORMAL_HISTORY).clear();
                payload.tags.forEach(t => tx.objectStore(STORE_TAGS).put(t));
                payload.records.forEach(r => tx.objectStore(STORE_RECORDS).put(r));
                payload.masterTags.forEach(m => tx.objectStore(STORE_MASTERTAGS).put(m));
                userCountermeasures.forEach(c => tx.objectStore(STORE_COUNTERMEASURES).put(c));
                abnormalHistory.forEach(h => tx.objectStore(STORE_ABNORMAL_HISTORY).put(h));
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            // V29.112 FEAT, V29.112 FIX (code review รอบแรกจับได้ก่อน commit): เติมเฉพาะ record/tag ที่
            // "ยังไม่มีใน local" จาก payload ที่ pull มา — id ไหนที่ local มีอยู่แล้วจะถูกข้ามเสมอ ไม่ put()
            // ทับ ต่างจาก importAll ที่ clear() ทั้งก้อนก่อนเสมอ ใช้กับ background sync pull เท่านั้น
            // (APP.init และ APP.pushSharedDb ก่อน push จริง — ดู excel-sync.js) ต่างจาก importAll ที่ยังคงไว้
            // สำหรับ "กู้คืนข้อมูล" (restoreData) ซึ่งเป็น action ที่ operator ตั้งใจ overwrite ทั้งหมดจริงๆ
            // (มี confirm() ชัดเจน)
            // เหตุผลที่ต้อง "ข้าม id ที่ local มีอยู่แล้ว" แทนที่จะ put() ทับไปเลยแบบรอบแรก (ตัวแรกที่เขียน
            // เคยพลาดจุดนี้ — code review จับได้ก่อน commit): ฝั่ง APP.pushSharedDb เรียก mergeAll ด้วยข้อมูล
            // remote "เก่ากว่า" local เสมอ (pull ก่อน push ของ mutation ที่เพิ่งทำ) ถ้า put() ทับ id ที่ local
            // เพิ่งแก้ไปหมาดๆ (เช่น remark ที่เพิ่ง saveAction) จะโดนค่าเก่าจาก remote เขียนทับกลับ กลาย
            // เป็นบั๊ก data-loss ตัวใหม่ที่แย่กว่าเดิม (ทุก saveAction/saveMasterSettings/
            // saveCountermeasureEntry จะโดนโดยพื้นฐาน ไม่ใช่ edge case) — "local ชนะเสมอสำหรับ id ที่มีอยู่
            // แล้ว" แก้ปัญหานี้ตรงๆ เพราะ local คือข้อมูลล่าสุดของ id นั้นบนเครื่องนี้เสมอ
            // ข้อจำกัดที่เหลือ (ยอมรับได้): การ "ลบ" (เช่น deleteCountermeasureEntry, หรือ rename path ใน
            // saveCountermeasureEntry ที่ลบ originalId ทิ้งตอน id เปลี่ยน — พลาดจุดนี้ในรอบแรกที่เขียน code
            // review รอบสองจับได้ก่อน commit) ทำให้ id หายไปจาก local ไม่ใช่ "มีอยู่แล้ว" ตาม logic ข้างบน
            // เข้าเงื่อนไข "ยังไม่มีใน local" กลับกลายเป็น merge เอาของที่เพิ่งลบกลับเข้ามาใหม่ — ทุกจุดที่มี
            // delete แฝงอยู่ต้อง push แบบ { merge: false } แทน (เหมือน restoreData/btn-clear-db) ไม่ใช่แก้ที่
            // mergeAll เพราะการลบต้องการ "สะท้อนไปที่ไฟล์กลางจริงๆ" ไม่ใช่ "merge เข้าด้วยกัน" อยู่แล้วโดย
            // ธรรมชาติ — จุดไหนในอนาคตที่มี delete()/clear() แฝงก่อน pushSharedDb ต้องเช็คแบบนี้เสมอ
            mergeAll: (payload) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                if (!payload || !Array.isArray(payload.tags) || !Array.isArray(payload.records) || !Array.isArray(payload.masterTags)) {
                    return reject(new Error('Invalid sync payload structure'));
                }
                const userCountermeasures = Array.isArray(payload.userCountermeasures) ? payload.userCountermeasures : [];
                const abnormalHistory = Array.isArray(payload.abnormalHistory) ? payload.abnormalHistory : [];
                const tx = STORAGE_ENGINE.db.transaction([STORE_TAGS, STORE_RECORDS, STORE_MASTERTAGS, STORE_COUNTERMEASURES, STORE_ABNORMAL_HISTORY], 'readwrite');
                const putMissingOnly = (storeName, items) => {
                    const store = tx.objectStore(storeName);
                    const keysReq = store.getAllKeys();
                    keysReq.onsuccess = () => {
                        const existingIds = new Set(keysReq.result);
                        selectMissingById(existingIds, items).forEach(item => store.put(item));
                    };
                };
                putMissingOnly(STORE_TAGS, payload.tags);
                putMissingOnly(STORE_RECORDS, payload.records);
                putMissingOnly(STORE_MASTERTAGS, payload.masterTags);
                putMissingOnly(STORE_COUNTERMEASURES, userCountermeasures);
                putMissingOnly(STORE_ABNORMAL_HISTORY, abnormalHistory);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            // V29.51 FEAT: Import audit trail (บันทึกประวัติการนำเข้าไฟล์ แยกจาก process-log ที่หายไปทุกครั้งที่ import ใหม่)
            logImport: (entry) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_IMPORTHISTORY], 'readwrite');
                tx.objectStore(STORE_IMPORTHISTORY).put(entry);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            getImportHistory: () => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve([]);
                const tx = STORAGE_ENGINE.db.transaction([STORE_IMPORTHISTORY], 'readonly');
                const req = tx.objectStore(STORE_IMPORTHISTORY).getAll();
                req.onsuccess = (e) => {
                    const sorted = e.target.result.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
                    resolve(sorted.slice(0, 50));
                };
                tx.onerror = () => reject(tx.error);
            })
        };
