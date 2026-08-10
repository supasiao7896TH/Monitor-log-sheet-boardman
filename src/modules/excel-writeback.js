// V29.71 FEAT: sync "Resolution Remark (Action Taken)" กลับไปเป็น native Excel cell comment
// (เทียบเท่า right-click -> "New Comment" ที่ operator เคยต้องพิมพ์ซ้ำเองในไฟล์ต้นฉบับ) —
// ปิด loop ให้จบงานที่ Web App ได้เลยโดยไม่ต้องไปแก้ Excel เพิ่ม
//
// V29.74 ARCH: เดิมโมดูลนี้อ่าน-เขียนไฟล์ Excel เองผ่าน SheetJS (XLSX.read/XLSX.write) แต่การทดสอบจริง
// กับไฟล์ log sheet ที่มีสูตรเชื่อม OSIsoft PI System แบบ live พบว่าไม่มีไลบรารี JS ฟรีตัวไหน (SheetJS,
// exceljs) เขียนไฟล์กลับได้ครบถ้วนปลอดภัย — ไฟล์ที่เขียนออกมาทำให้ Excel บังคับคำนวณสูตร PI ใหม่ทั้งหมด
// (เพราะเขียน calcChain.xml ไม่ถูกต้อง) กลายเป็น #NAME? ทุกช่องแม้ค่าจริงจะยังถูกต้องอยู่ก็ตาม (รายละเอียด
// การทดสอบและหลักฐานอยู่ใน context.md) จึงเปลี่ยนมาให้ Excel ตัวจริงเป็นคนเขียนแทน ผ่าน Local Bridge
// (bridge/excel-bridge.ps1, PowerShell + Excel COM automation) ที่รันบนเครื่อง operator เอง — โมดูลนี้
// เหลือแค่ fetch คุยกับ bridge ผ่าน HTTP บนเครื่องเดียวกันเท่านั้น ไม่แตะไฟล์ Excel โดยตรงอีกต่อไป
const APP_COMMENT_AUTHOR = 'Plant Log Analyzer (Web App)';
const BRIDGE_URL = 'http://localhost:5175';
const FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export const EXCEL_WRITEBACK = {

            // Pure: ประกอบ request body ที่จะส่งให้ bridge — แยกออกมาให้ test เรียกตรงได้โดยไม่ต้องพึ่ง fetch จริง
            buildWriteRemarkPayload: (record, remarkText) => ({
                fileName: record.sourceFileName,
                machine: record.machine,
                cellRef: record.cellRef,
                remarkText: (remarkText || '').trim(),
                author: APP_COMMENT_AUTHOR
            }),

            // เช็คว่า Local Bridge (bridge/excel-bridge.ps1) กำลังรันอยู่บนเครื่องนี้ไหม
            checkBridgeStatus: async () => {
                try {
                    const res = await fetchWithTimeout(`${BRIDGE_URL}/ping`, { method: 'GET' });
                    return res.ok;
                } catch {
                    return false;
                }
            },

            // ส่ง Resolution Remark ไปให้ Local Bridge เขียนกลับเป็น Excel cell comment บนไฟล์ต้นฉบับ
            // ที่ operator เปิดค้างไว้ใน Excel จริง — status ที่เป็นไปได้: 'ok' | 'conflict' | 'no-file-open' |
            // 'no-source-file' (record import มาก่อนมีฟีเจอร์นี้) | 'bridge-offline' | 'error'
            syncRemarkToExcel: async (record, remarkText) => {
                if (!record.sourceFileName || !record.cellRef || !record.machine) return 'no-source-file';

                const payload = EXCEL_WRITEBACK.buildWriteRemarkPayload(record, remarkText);
                try {
                    const res = await fetchWithTimeout(`${BRIDGE_URL}/write-remark`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) return 'error';
                    const data = await res.json();
                    return data.status || 'error';
                } catch (err) {
                    console.error('EXCEL_WRITEBACK.syncRemarkToExcel: bridge unreachable', err);
                    return 'bridge-offline';
                }
            }
        };
