import { getTagId, STORE_TAGS, STORE_RECORDS, STORE_MASTERTAGS, STORE_IMPORTHISTORY, STORE_COUNTERMEASURES, STORE_SOURCEWORKBOOKS, STORE_FILEHANDLES } from './shared.js';

export const STORAGE_ENGINE = {
            db: null,
            init: () => new Promise((resolve, reject) => {
                const req = indexedDB.open('PlantLogAnalyzerEnterpriseDB', 5);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if(!db.objectStoreNames.contains(STORE_TAGS)) db.createObjectStore(STORE_TAGS, { keyPath: 'id' });
                    if(!db.objectStoreNames.contains(STORE_RECORDS)) {
                        const s = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
                        s.createIndex('isAbnormal', 'isAbnormal', { unique: false });
                    }
                    if(!db.objectStoreNames.contains(STORE_MASTERTAGS)) db.createObjectStore(STORE_MASTERTAGS, { keyPath: 'id' });
                    // V29.51 FEAT: Import audit trail
                    if(!db.objectStoreNames.contains(STORE_IMPORTHISTORY)) db.createObjectStore(STORE_IMPORTHISTORY, { keyPath: 'id' });
                    // V29.58 FEAT: คำแนะนำ Auto-Draft ที่ผู้ใช้เพิ่มเอง (นอกเหนือจากคู่มือ MPS ที่ hardcode ไว้)
                    if(!db.objectStoreNames.contains(STORE_COUNTERMEASURES)) db.createObjectStore(STORE_COUNTERMEASURES, { keyPath: 'id' });
                    // V29.71 FEAT: sync remark กลับไปเป็น Excel cell comment — เก็บไฟล์ดิบ (Blob, ทุก browser)
                    // และ FileSystemFileHandle (Chrome/Edge เท่านั้น, เขียนกลับไฟล์เดิมบน disk ได้อัตโนมัติ)
                    if(!db.objectStoreNames.contains(STORE_SOURCEWORKBOOKS)) db.createObjectStore(STORE_SOURCEWORKBOOKS, { keyPath: 'sourceFileId' });
                    if(!db.objectStoreNames.contains(STORE_FILEHANDLES)) db.createObjectStore(STORE_FILEHANDLES, { keyPath: 'sourceFileId' });
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
            getAll: (storeName) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve([]);
                const tx = STORAGE_ENGINE.db.transaction([storeName], 'readonly');
                const req = tx.objectStore(storeName).getAll();
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
            exportAll: async () => {
                const [tags, records, masterTags, userCountermeasures] = await Promise.all([
                    STORAGE_ENGINE.getAll(STORE_TAGS),
                    STORAGE_ENGINE.getAll(STORE_RECORDS),
                    STORAGE_ENGINE.getAll(STORE_MASTERTAGS),
                    STORAGE_ENGINE.getAll(STORE_COUNTERMEASURES)
                ]);
                return { schemaVersion: 1, exportedAt: new Date().toISOString(), tags, records, masterTags, userCountermeasures };
            },
            importAll: (payload) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                if (!payload || !Array.isArray(payload.tags) || !Array.isArray(payload.records) || !Array.isArray(payload.masterTags)) {
                    return reject(new Error('Invalid backup file structure'));
                }
                // backup เก่าก่อนมีฟีเจอร์นี้จะไม่มี userCountermeasures — default เป็น array ว่างกันพัง
                const userCountermeasures = Array.isArray(payload.userCountermeasures) ? payload.userCountermeasures : [];
                const tx = STORAGE_ENGINE.db.transaction([STORE_TAGS, STORE_RECORDS, STORE_MASTERTAGS, STORE_COUNTERMEASURES], 'readwrite');
                tx.objectStore(STORE_TAGS).clear();
                tx.objectStore(STORE_RECORDS).clear();
                tx.objectStore(STORE_MASTERTAGS).clear();
                tx.objectStore(STORE_COUNTERMEASURES).clear();
                payload.tags.forEach(t => tx.objectStore(STORE_TAGS).put(t));
                payload.records.forEach(r => tx.objectStore(STORE_RECORDS).put(r));
                payload.masterTags.forEach(m => tx.objectStore(STORE_MASTERTAGS).put(m));
                userCountermeasures.forEach(c => tx.objectStore(STORE_COUNTERMEASURES).put(c));
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
            }),
            // V29.71 FEAT: เก็บไฟล์ Excel ต้นฉบับ (raw bytes) ไว้ใช้ sync remark กลับเป็น cell comment ทีหลัง
            saveSourceWorkbook: (sourceFileId, fileName, blob) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_SOURCEWORKBOOKS], 'readwrite');
                tx.objectStore(STORE_SOURCEWORKBOOKS).put({ sourceFileId, fileName, blob, savedAt: new Date().toISOString() });
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            getSourceWorkbook: (sourceFileId) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve(null);
                const tx = STORAGE_ENGINE.db.transaction([STORE_SOURCEWORKBOOKS], 'readonly');
                const req = tx.objectStore(STORE_SOURCEWORKBOOKS).get(sourceFileId);
                req.onsuccess = (e) => resolve(e.target.result || null);
                tx.onerror = () => reject(tx.error);
            }),
            // V29.71 FEAT: FileSystemFileHandle (Chrome/Edge) — ให้เขียนกลับไฟล์เดิมบน disk ได้โดยอัตโนมัติ
            // ไม่ต้อง export/download ใหม่ทุกครั้ง
            saveFileHandle: (sourceFileId, fileName, handle) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve();
                const tx = STORAGE_ENGINE.db.transaction([STORE_FILEHANDLES], 'readwrite');
                tx.objectStore(STORE_FILEHANDLES).put({ sourceFileId, fileName, handle, savedAt: new Date().toISOString() });
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            }),
            getFileHandle: (sourceFileId) => new Promise((resolve, reject) => {
                if(!STORAGE_ENGINE.db) return resolve(null);
                const tx = STORAGE_ENGINE.db.transaction([STORE_FILEHANDLES], 'readonly');
                const req = tx.objectStore(STORE_FILEHANDLES).get(sourceFileId);
                req.onsuccess = (e) => resolve(e.target.result || null);
                tx.onerror = () => reject(tx.error);
            })
        };
