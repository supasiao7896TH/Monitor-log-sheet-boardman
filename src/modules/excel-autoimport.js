// V29.78 FEAT: ดึงไฟล์ log sheet ล่าสุดจาก D:\PTA COMMONT WORK\Log sheet Digital มา import เข้า Web App
// เองอัตโนมัติผ่าน Local Bridge (bridge/excel-bridge.ps1) แทนที่ operator ต้องลาก-วางไฟล์เอง — ไฟล์นี้ถูก
// PI Datalink เขียนสดหลายรอบ/วัน (03:00/09:00/15:00/21:00) จึงต้อง poll เป็นระยะ ไม่ใช่ import ครั้งเดียวจบ
// (ดู APP.pollAutoImport ใน app-core.js สำหรับ logic การเทียบเวลาแก้ไขไฟล์และ trigger การ import จริง)
//
// ตาม pattern เดียวกับ excel-writeback.js: คืนเป็น status string/object เสมอ ไม่ throw ให้ caller ต้อง
// ห่อ try/catch เอง — เครือข่าย/bridge ปิดอยู่ถือเป็นสถานะปกติที่ต้องรองรับเงียบๆ ไม่ใช่ error รุนแรง
import { BRIDGE_URL, fetchWithTimeout } from './shared.js';

// ชื่อ placeholder เดิมที่เคยถูก fallback ใช้ผิดๆ ตอน browser ซ่อน header Content-Disposition
// (CORS ไม่ expose header นี้ให้ JS อ่านเห็น) — เก็บเป็น const ให้ app-core.js เทียบหา record ที่เคย
// ติดชื่อผิดนี้ไปแก้ไขย้อนหลังได้ ไม่ต้อง hardcode ซ้ำ
export const LEGACY_UNKNOWN_FILENAME = 'source-file.xlsm';

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
    //
    // fileName ต้องมาจาก caller เสมอ (getSourceFileInfo() ที่ต้องเรียกก่อนหน้านี้อยู่แล้วเพื่อเทียบ
    // mtime) — เดิมโค้ดพยายามอ่านชื่อไฟล์จาก header Content-Disposition ที่ bridge ตอบมาแทน แต่ browser
    // ซ่อน header นี้จาก JS เสมอเพราะ CORS ไม่ได้ safelist Content-Disposition ไว้ (bridge ไม่ได้ส่ง
    // Access-Control-Expose-Headers) ทำให้ res.headers.get() คืน null เงียบๆ แล้ว fallback ไปใช้ชื่อ
    // placeholder ผิดๆ ติดไปกับทุก record ที่ import — ใช้ fileName จาก JSON body ของ /source-file-info
    // แทนเพราะไม่ติด CORS restriction นี้เลย
    fetchSourceFile: async (fileName) => {
        try {
            const res = await fetchWithTimeout(`${BRIDGE_URL}/source-file`, { method: 'GET' });
            if (!res.ok) return { status: 'error' };

            const contentType = res.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                return await res.json();
            }

            const buffer = await res.arrayBuffer();
            const file = new File([buffer], fileName, { type: contentType || 'application/octet-stream' });
            return { status: 'ok', file };
        } catch (err) {
            console.error('EXCEL_AUTOIMPORT.fetchSourceFile: bridge unreachable', err);
            return { status: 'bridge-offline' };
        }
    },

    // คัดลอกไฟล์ต้นฉบับไปเก็บ safety copy ที่โฟลเดอร์ archive (D:\PTA COMMONT WORK\Log sheet Digital,
    // ตั้งแต่ V29.95 — subfolder รายเดือนใต้ $WatchFolder เอง) — เรียกตอน Web App เช็คแล้วว่าข้อมูลครบ
    // 4 เวลาของวันนั้น (ดู getCanonicalTimesStatus ใน shared.js)
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
    },

    // V29.96 FEAT: เปลี่ยนชื่อไฟล์ log sheet + เขียนวันที่ใหม่ลง cell W1 ของชีต "BM 1" อัตโนมัติ แทนที่
    // operator ต้องทำเองทุกวัน — idempotent ฝั่ง bridge เอง (no-op ถ้าวันที่ในชื่อไฟล์ตรงกับวันนี้อยู่
    // แล้ว) จึงเรียกซ้ำได้ทุก poll cycle อย่างปลอดภัย คืนเป็น object เต็ม (ไม่ใช่แค่ status string) เพราะ
    // ต้องใช้ oldFileName/newFileName/warning ไปแสดงผลให้ operator เห็นตอนสำเร็จ
    rolloverDailyFileIfNeeded: async () => {
        try {
            const res = await fetchWithTimeout(`${BRIDGE_URL}/rollover-daily-file`, { method: 'POST' });
            if (!res.ok) return { status: 'error' };
            return await res.json();
        } catch (err) {
            console.error('EXCEL_AUTOIMPORT.rolloverDailyFileIfNeeded: bridge unreachable', err);
            return { status: 'bridge-offline' };
        }
    },

    // V29.99 FEAT: เช็คแค่ "ไฟล์เปิดอยู่ใน Excel ไหม" เฉยๆ ไม่ยุ่งกับวันที่/ชื่อไฟล์เลย (คนละเรื่องกับ
    // rolloverDailyFileIfNeeded ด้านบน ซึ่งจะ short-circuit เป็น 'already-current' ทันทีถ้าวันที่ตรงกัน
    // อยู่แล้ว โดยไม่เช็คว่า Excel ยังเปิดไฟล์อยู่จริงหรือเปล่า) — เกิดปัญหาจริงตอนเปลี่ยนกะ (~ทุก 12 ชม.):
    // bridge/Excel ของ operator คนก่อนถูกปิดไปพร้อม session ตอน logout, operator คนใหม่ login มาเปิด
    // Web App แต่วันที่ในชื่อไฟล์ยังเป็นวันเดียวกัน (ยังไม่ข้ามเที่ยงคืน) ทำให้ rollover เห็นว่า
    // already-current แล้วไม่เปิด Excel ให้ — เรียก endpoint นี้แยกต่างหากตอน APP.init() เพื่อปิดช่องว่างนี้
    ensureFileOpen: async () => {
        try {
            const res = await fetchWithTimeout(`${BRIDGE_URL}/ensure-file-open`, { method: 'POST' });
            if (!res.ok) return { status: 'error' };
            return await res.json();
        } catch (err) {
            console.error('EXCEL_AUTOIMPORT.ensureFileOpen: bridge unreachable', err);
            return { status: 'bridge-offline' };
        }
    },

    // V29.102 FEAT: สั่ง Excel save ไฟล์ log sheet ที่เปิดอยู่ให้เอง — แก้ปัญหาสูตร PI Datalink คำนวณค่า
    // ใหม่แสดงบนจอ Excel แบบ live ได้เองแต่ไม่เขียนกลับไฟล์บนดิสก์จนกว่าจะมีคน Save จริง ทำให้ pollAutoImport
    // (เช็คแค่ mtime บนดิสก์) มองไม่เห็นค่าใหม่จนกว่า operator จะกด Ctrl+S เอง เรียกเป็นก้าวแรกสุดของทุก
    // poll cycle ก่อนเช็ค getSourceFileInfo (ดู APP.pollAutoImport ใน app-core.js)
    autosaveSourceFile: async () => {
        try {
            const res = await fetchWithTimeout(`${BRIDGE_URL}/autosave-source-file`, { method: 'POST' });
            if (!res.ok) return { status: 'error' };
            return await res.json();
        } catch (err) {
            console.error('EXCEL_AUTOIMPORT.autosaveSourceFile: bridge unreachable', err);
            return { status: 'bridge-offline' };
        }
    }
};
