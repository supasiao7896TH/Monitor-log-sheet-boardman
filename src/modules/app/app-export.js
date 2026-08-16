import { getTagId, getMasterMap, getTagMap, resolveEffectiveLimits, formatLimitText } from '../shared.js';
import { APP } from './app.js';
/* global XLSX */

// V29.89 FEAT: Export ประวัติ Abnormal/Stat Deviation เป็นไฟล์ .xlsx ให้มีสำเนาอ้างอิงอยู่นอก IndexedDB
// ด้วย (เช่นแนบไปกับรายงานประจำเดือน) — ใช้ date-range/search ที่ operator กำลังเลือกอยู่ในหน้า History
// เป็นตัวกำหนดขอบเขต export ตรงๆ (ผ่าน APP.getHistoryFilteredRecords() ใน app-history.js ไม่ duplicate
// filter logic) ไม่มี date-range picker แยกต่างหากอีกชุด
//
// ไม่ผ่าน Local Bridge/COM เลย ต่างจาก Resolution Remark write-back (excel-writeback.js) — เพราะไฟล์นี้
// เป็นไฟล์ใหม่ล้วนๆ ไม่มีสูตร OSIsoft PI Datalink ให้ต้องรักษาเหมือนไฟล์ log sheet ต้นฉบับ ใช้ SheetJS
// (XLSX, vendored อยู่แล้วที่ public/vendor/ — ตัวเดียวกับที่แอปใช้อ่านไฟล์ import อยู่แล้ว) เขียนตรงๆ ใน
// เบราว์เซอร์ได้อย่างปลอดภัย
Object.assign(APP, {

            exportAbnormalHistory: () => {
                const records = APP.getHistoryFilteredRecords();
                if (records.length === 0) {
                    alert('ไม่มีรายการ Abnormal ในช่วงวันที่ที่เลือกให้ export ครับ');
                    return;
                }

                const tagMap = getTagMap();
                const mTagsMap = getMasterMap();

                const rows = records.map(r => {
                    const tId = getTagId(r);
                    const tagDef = tagMap.get(tId) || {};
                    const master = mTagsMap.get(tId);
                    const { eMin, eMax, eExact } = resolveEffectiveLimits(tagDef, master);
                    return {
                        'วันที่': r.dateStr || '',
                        'เวลา': r.timeStr || '',
                        'Machine': r.machine || '',
                        'Tag No': r.tagNo || '',
                        'Param Type': r.paramType || '',
                        'ค่าที่อ่านได้': r.value,
                        'Limit ที่ใช้': formatLimitText(eMin, eMax, eExact, '-'),
                        'ประเภทความผิดปกติ': r.isStatDeviation === 1 ? 'Stat Deviation' : 'Abnormal',
                        'สถานะ': r.actionStatus === 'acknowledged' ? 'รับทราบ' : 'ใหม่',
                        'Resolution Remark': r.remark || '',
                    };
                });

                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Abnormal History');

                const fromLabel = document.getElementById('history-from')?.value || 'all';
                const toLabel = document.getElementById('history-to')?.value || 'all';
                XLSX.writeFile(wb, `PlantLogAnalyzer_AbnormalHistory_${fromLabel}_to_${toLabel}.xlsx`);
            },
});
