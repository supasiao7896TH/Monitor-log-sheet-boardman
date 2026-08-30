// V29.85 FEAT: sync ข้อมูลทั้งหมด (Tags/Records/MasterTags/UserCountermeasures) ไปเก็บที่ D: ผ่าน Local
// Bridge (bridge/excel-bridge.ps1) — แก้ปัญหา operator login คนละ Windows account บนเครื่อง shared แล้ว
// เห็นข้อมูลคนละก้อน (IndexedDB ผูกกับ browser profile ต่อ account เสมอ ไม่เกี่ยวกับตำแหน่งไฟล์ของแอป)
// pushSharedDb เรียกแบบ fire-and-forget จากทุกจุดที่มีการแก้ไขข้อมูล (ดู APP.pushSharedDb), pullSharedDb
// เรียกครั้งเดียวตอน APP.init() ก่อน loadLocalData — เหมือน excel-writeback.js/excel-autoimport.js
// ไม่มีทางที่ exception จะหลุดไปถึง caller เลย แปลงเป็น status string/object เสมอ
//
// payload ที่ pushSharedDb ได้รับยังเป็น full-snapshot ของ local เสมอ (ไม่ใช่ delta) — แต่ตั้งแต่ V29.112
// ผู้เรียก (APP.pushSharedDb ใน app-core.js) จะ pull ไฟล์กลางมาก่อนเสมอ แล้ว merge เข้า local ด้วย
// STORAGE_ENGINE.mergeAll ซึ่งเติมเฉพาะ id ที่ local "ยังไม่มี" เท่านั้น (id ที่ local มีอยู่แล้วชนะเสมอ ไม่ถูก
// remote เขียนทับ) ก่อนค่อย export+push ผลลัพธ์ที่ merge แล้ว — แก้ช่องโหว่เดิมที่ session ใดก็ตามที่ local
// data น้อย/เก่ากว่า (เช่น browser profile ใหม่, หรือ auto-import ที่เพิ่งเห็นข้อมูลแค่วันเดียว) เขียนทับไฟล์
// กลางด้วยข้อมูลที่น้อยกว่าจนวันเก่าที่คนอื่น push ไว้หายไปเงียบๆ (เคสจริง: "Time Breakdown เหลือ 1 วัน"
// หลัง refresh หลายรอบ) เหลือ known trade-off เดิมเฉพาะกรณี 2 operator แก้ record เดียวกัน (id เดียวกัน)
// พร้อมกันจริงๆ เท่านั้น — เพราะ mergeAll ให้ local ชนะเสมอสำหรับ id ที่มีอยู่แล้ว ถ้า operator คนที่ 2 pull
// ก่อน operator คนที่ 1 จะ push การแก้ไขของคนที่ 1 (สำเร็จ push ไปแล้ว) อาจไม่ถูกดึงมาที่เครื่องคนที่ 2 เลย
// จนกว่าจะ pull ใหม่อีกรอบ ยอมรับได้เพราะ tool นี้ design ไว้เป็น single-operator-ต่อกะ (ดู context.md)
// ไม่ใช่ real-time multi-user
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
