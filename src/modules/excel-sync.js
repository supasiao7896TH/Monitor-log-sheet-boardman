// V29.85 FEAT: sync ข้อมูลทั้งหมด (Tags/Records/MasterTags/UserCountermeasures) ไปเก็บที่ D: ผ่าน Local
// Bridge (bridge/excel-bridge.ps1) — แก้ปัญหา operator login คนละ Windows account บนเครื่อง shared แล้ว
// เห็นข้อมูลคนละก้อน (IndexedDB ผูกกับ browser profile ต่อ account เสมอ ไม่เกี่ยวกับตำแหน่งไฟล์ของแอป)
// pushSharedDb เรียกแบบ fire-and-forget จากทุกจุดที่มีการแก้ไขข้อมูล (ดู APP.pushSharedDb), pullSharedDb
// เรียกครั้งเดียวตอน APP.init() ก่อน loadLocalData — เหมือน excel-writeback.js/excel-autoimport.js
// ไม่มีทางที่ exception จะหลุดไปถึง caller เลย แปลงเป็น status string/object เสมอ
//
// Known trade-off (v1, ตั้งใจไม่แก้): push เป็น full-snapshot overwrite เสมอ ไม่ใช่ delta/merge — ถ้ามี 2
// operator แก้ข้อมูลพร้อมกันจริงๆ (เช่น สลับ user บนเครื่อง shared ผ่าน fast-user-switching) คนที่ push
// หลังจะเขียนทับของคนก่อนแบบไม่รู้ตัว (last-write-wins) ยอมรับได้เพราะ tool นี้ design ไว้เป็น
// single-operator-ต่อกะ (ดู context.md) ไม่ใช่ real-time multi-user
import { BRIDGE_URL, fetchWithTimeout } from './shared.js';

export const EXCEL_SYNC = {

            // ส่ง snapshot ทั้งหมด (จาก STORAGE_ENGINE.exportAll()) ไปเขียนทับไฟล์ shared-db บน D: —
            // full overwrite ทุกครั้ง ไม่ใช่ delta (เหมือนปุ่มสำรอง/กู้คืนข้อมูลเดิม) status ที่เป็นไปได้:
            // 'ok' | 'bridge-offline' | 'error'
            pushSharedDb: async (payload) => {
                try {
                    const res = await fetchWithTimeout(`${BRIDGE_URL}/save-shared-db`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) return 'error';
                    const data = await res.json();
                    return data.status || 'error';
                } catch (err) {
                    console.error('EXCEL_SYNC.pushSharedDb: bridge unreachable', err);
                    return 'bridge-offline';
                }
            },

            // ดึง snapshot ล่าสุดจาก D: กลับมา — คืน envelope ทั้งอัน ({status:'ok', data:{...}} |
            // {status:'not-found'} | {status:'bridge-offline'} | {status:'error'} | {status:'file-locked'})
            // ให้ caller (APP.init) ตัดสินใจว่าจะ importAll หรือ fallback local เงียบๆ
            pullSharedDb: async () => {
                try {
                    const res = await fetchWithTimeout(`${BRIDGE_URL}/load-shared-db`, { method: 'GET' });
                    if (!res.ok) return { status: 'error' };
                    return await res.json();
                } catch (err) {
                    console.error('EXCEL_SYNC.pullSharedDb: bridge unreachable', err);
                    return { status: 'bridge-offline' };
                }
            }
        };
