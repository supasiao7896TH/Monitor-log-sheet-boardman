// V29.78 FEAT: ดึงไฟล์ log sheet ล่าสุดจาก D:\PTA COMMONT WORK\Log sheet Digital มา import เข้า Web App
// เองอัตโนมัติผ่าน Local Bridge (bridge/excel-bridge.ps1) แทนที่ operator ต้องลาก-วางไฟล์เอง — ไฟล์นี้ถูก
// PI Datalink เขียนสดหลายรอบ/วัน (03:00/09:00/15:00/21:00) จึงต้อง poll เป็นระยะ ไม่ใช่ import ครั้งเดียวจบ
// (ดู APP.pollAutoImport ใน app-core.js สำหรับ logic การเทียบเวลาแก้ไขไฟล์และ trigger การ import จริง)
//
// ตาม pattern เดียวกับ excel-writeback.js: คืนเป็น status string/object เสมอ ไม่ throw ให้ caller ต้อง
// ห่อ try/catch เอง — เครือข่าย/bridge ปิดอยู่ถือเป็นสถานะปกติที่ต้องรองรับเงียบๆ ไม่ใช่ error รุนแรง
import { BRIDGE_URL, fetchWithTimeout } from './shared.js';

export const EXCEL_AUTOIMPORT = {

    // ข้อมูลไฟล์ปัจจุบัน (ชื่อ/ขนาด/เวลาแก้ไขล่าสุด) — ใช้เทียบว่าไฟล์เปลี่ยนไปจากรอบก่อนหรือยัง
    // ก่อนจะ fetch เนื้อไฟล์จริง (เนื้อไฟล์หนักกว่ามาก ไม่อยากดึงถ้าไม่จำเป็น)
    getSourceFileInfo: async () => {
        try {
            const res = await fetchWithTimeout(`${BRIDGE_URL}/source-file-info`, { method: 'GET' });
            if (!res.ok) return { status: 'error' };
            return await res.json();
        } catch (err) {
            console.error('EXCEL_AUTOIMPORT.getSourceFileInfo: bridge unreachable', err);
            return { status: 'bridge-offline' };
        }
    },

    // เนื้อไฟล์จริง — bridge ตอบ raw binary ตอนสำเร็จ (เบากว่า base64-in-JSON ~33% และสร้าง File ต่อได้
    // ทันทีไม่ต้อง decode) และตอบ JSON envelope ปกติเฉพาะตอน error/not-found/file-locked — เช็ค
    // Content-Type ก่อนตัดสินใจว่าจะ .arrayBuffer() หรือ .json()
    fetchSourceFile: async () => {
        try {
            const res = await fetchWithTimeout(`${BRIDGE_URL}/source-file`, { method: 'GET' });
            if (!res.ok) return { status: 'error' };

            const contentType = res.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                return await res.json();
            }

            // ดึงชื่อไฟล์จาก Content-Disposition: attachment; filename="xxx" ที่ bridge ตั้งให้
            const disposition = res.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="([^"]+)"/);
            const fileName = match ? match[1] : 'source-file.xlsm';

            const buffer = await res.arrayBuffer();
            const file = new File([buffer], fileName, { type: contentType || 'application/octet-stream' });
            return { status: 'ok', file };
        } catch (err) {
            console.error('EXCEL_AUTOIMPORT.fetchSourceFile: bridge unreachable', err);
            return { status: 'bridge-offline' };
        }
    },

    // คัดลอกไฟล์ต้นฉบับไปเก็บ safety copy ที่โฟลเดอร์ archive (D:\Monitor log sheet boardman) — เรียกตอน
    // Web App เช็คแล้วว่าข้อมูลครบ 4 เวลาของวันนั้น (ดู getCanonicalTimesStatus ใน shared.js)
    archiveSourceFile: async () => {
        try {
            const res = await fetchWithTimeout(`${BRIDGE_URL}/archive-source-file`, { method: 'POST' });
            if (!res.ok) return 'error';
            const data = await res.json();
            return data.status || 'error';
        } catch (err) {
            console.error('EXCEL_AUTOIMPORT.archiveSourceFile: bridge unreachable', err);
            return 'bridge-offline';
        }
    }
};
