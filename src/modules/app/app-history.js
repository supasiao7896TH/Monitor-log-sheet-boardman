import { STATE } from '../state.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { getTagId, getMasterMap, getTagMap, resolveEffectiveLimits, formatLimitText, dateStrToKey, isDateInRange, HISTORY_DEFAULT_DAYS, HISTORY_PAGE_SIZE } from '../shared.js';
import { APP } from './app.js';
/* global lucide */

// V29.89 FEAT: หน้า "History" — ดูข้อมูล Abnormal/Stat Deviation ย้อนหลังแบบเลือกช่วงวันที่ได้ แทนที่จะ
// จำกัดแค่ Time Breakdown chip 3 วันล่าสุด + dropdown ทีละวันของ Dashboard เดิม อ่านข้อมูลจาก
// STATE.data.records ตรงๆ (ผ่าน STATE._recomputeFlags แล้ว) ไม่ query IndexedDB แยกต่างหาก — isAbnormal/
// isStatDeviation ไม่ได้ถูกเก็บถาวรลง IndexedDB เลย คำนวณสดใน memory ทุกครั้งที่โหลดแอปเท่านั้น (ต้องมี
// full-history context สำหรับ Stat Deviation baseline ด้วย) ดังนั้นการ query IndexedDB range ตรงๆ
// (STORAGE_ENGINE.getRecordsByTimestampRange) จะได้ record ที่ยังไม่มี flag ถูกต้อง ใช้ไม่ได้กับหน้านี้
//
// State ทั้งหมดเป็น module-level (ไม่ผ่าน STATE.data) เพราะเป็น UI state เฉพาะหน้านี้ล้วนๆ ไม่ต้อง trigger
// STATE._recomputeFlags/_applyFilterSort ซ้ำซ้อนเวลาแค่เปลี่ยนหน้า/ช่วงวันที่ที่ดู — เหมือน pattern เดียวกับ
// lastArchivedMtime/syncWarningDismissed ใน app-core.js
let historyFrom = null; // YYYYMMDD string หรือ null = ไม่จำกัดขอบล่าง
let historyTo = null;   // YYYYMMDD string หรือ null = ไม่จำกัดขอบบน
let historyPage = 1;
let historyInitialized = false; // เผื่อ default range (30 วันล่าสุด) แค่ตอนเปิดหน้าครั้งแรกเท่านั้น

function defaultRangeKeys() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (HISTORY_DEFAULT_DAYS - 1));
    const toKey = `${to.getFullYear()}${String(to.getMonth() + 1).padStart(2, '0')}${String(to.getDate()).padStart(2, '0')}`;
    const fromKey = `${from.getFullYear()}${String(from.getMonth() + 1).padStart(2, '0')}${String(from.getDate()).padStart(2, '0')}`;
    return { fromKey, toKey };
}

function keyToInputValue(key) {
    if (!key || key.length !== 8) return '';
    return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

function inputValueToKey(v) {
    return v ? v.replace(/-/g, '') : null;
}

Object.assign(APP, {

            // V29.89 FEAT: filter เดียวใช้ร่วมกันทั้งตาราง History และ Export (app-export.js เรียกตรงๆ ผ่าน
            // APP.getHistoryFilteredRecords() — ไม่ duplicate logic, ใช้ date-range/search ที่ operator
            // กำลังดูอยู่ในหน้า History เป็นค่าเดียวกับที่จะ export ด้วย)
            getHistoryFilteredRecords: () => {
                const records = STATE.get('records') || [];
                const searchEl = document.getElementById('history-search');
                const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
                const tagMap = getTagMap();
                const mTagsMap = getMasterMap();

                return records
                    .filter(r => r.isAbnormal === 1 || r.isStatDeviation === 1)
                    .filter(r => isDateInRange(r.dateStr, historyFrom, historyTo))
                    .filter(r => {
                        if (!q) return true;
                        const tId = getTagId(r);
                        const tagDef = tagMap.get(tId) || {};
                        const master = mTagsMap.get(tId);
                        const desc = (master && master.description) ? master.description : (tagDef.description || '');
                        return (r.tagNo || '').toLowerCase().includes(q)
                            || (r.machine || '').toLowerCase().includes(q)
                            || desc.toLowerCase().includes(q);
                    })
                    // ใหม่→เก่า: History เป็นการเรียกดูอดีต เห็นล่าสุดก่อนสมเหตุสมผลกว่า (ต่างจาก Dashboard
                    // ที่เรียงเก่า→ใหม่เพราะเป็นคิวงานที่ operator ต้องจัดการไล่ตามลำดับ)
                    .sort((a, b) => `${dateStrToKey(b.dateStr)}${b.timeStr || ''}`.localeCompare(`${dateStrToKey(a.dateStr)}${a.timeStr || ''}`));
            },

            setHistoryDateRange: (fromInputVal, toInputVal) => {
                historyFrom = inputValueToKey(fromInputVal);
                historyTo = inputValueToKey(toInputVal);
                historyPage = 1;
                APP.renderHistoryView();
            },

            resetHistoryDateRangeToAll: () => {
                historyFrom = null;
                historyTo = null;
                historyPage = 1;
                const fromEl = document.getElementById('history-from');
                const toEl = document.getElementById('history-to');
                if (fromEl) fromEl.value = '';
                if (toEl) toEl.value = '';
                APP.renderHistoryView();
            },

            historyPrevPage: () => {
                if (historyPage > 1) historyPage--;
                APP.renderHistoryView();
            },

            historyNextPage: () => {
                historyPage++; // renderHistoryView() จะ clamp กลับเองถ้าเกิน totalPages จริง
                APP.renderHistoryView();
            },

            renderHistoryView: () => {
                const tbody = document.getElementById('history-table-body');
                if (!tbody) return;

                if (!historyInitialized) {
                    const { fromKey, toKey } = defaultRangeKeys();
                    historyFrom = fromKey;
                    historyTo = toKey;
                    historyInitialized = true;
                    const fromEl = document.getElementById('history-from');
                    const toEl = document.getElementById('history-to');
                    if (fromEl) fromEl.value = keyToInputValue(fromKey);
                    if (toEl) toEl.value = keyToInputValue(toKey);
                }

                const filtered = APP.getHistoryFilteredRecords();
                const countEl = document.getElementById('history-count-display');
                if (countEl) countEl.textContent = filtered.length.toLocaleString();

                const totalPages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
                if (historyPage > totalPages) historyPage = totalPages;
                const pageStart = (historyPage - 1) * HISTORY_PAGE_SIZE;
                const pageItems = filtered.slice(pageStart, pageStart + HISTORY_PAGE_SIZE);

                const tagMap = getTagMap();
                const mTagsMap = getMasterMap();

                while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

                if (pageItems.length === 0) {
                    const tr = UI_RENDERER.createEl('tr');
                    const td = UI_RENDERER.createEl('td', 'text-center py-10 text-slate-400 italic font-medium');
                    td.colSpan = 8;
                    td.textContent = 'ไม่พบรายการ Abnormal ในช่วงวันที่ที่เลือก';
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                } else {
                    pageItems.forEach(r => {
                        const tId = getTagId(r);
                        const tagDef = tagMap.get(tId) || {};
                        const master = mTagsMap.get(tId);
                        const { eMin, eMax, eExact } = resolveEffectiveLimits(tagDef, master);
                        const isAck = r.actionStatus === 'acknowledged';
                        const isStatDev = r.isStatDeviation === 1;

                        const tr = UI_RENDERER.createEl('tr', 'hover:bg-sky-50/40 border-b border-slate-50 transition-colors cursor-pointer');
                        tr.onclick = () => APP.openActionModal(r.id);

                        tr.appendChild(UI_RENDERER.createEl('td', 'py-2.5 px-4 text-slate-500 font-medium', `${r.dateStr || ''} ${r.timeStr || ''}`));
                        tr.appendChild(UI_RENDERER.createEl('td', 'py-2.5 px-4 text-slate-500 font-bold uppercase text-[10px]', r.machine));
                        tr.appendChild(UI_RENDERER.createEl('td', 'py-2.5 px-4 font-black text-slate-800', r.tagNo));

                        const eDesc = (master && master.description) ? master.description : (tagDef.description || '-');
                        tr.appendChild(UI_RENDERER.createEl('td', 'py-2.5 px-4 text-slate-600 text-[11px] truncate max-w-[220px]', eDesc));

                        tr.appendChild(UI_RENDERER.createEl('td', `py-2.5 px-4 text-center font-black ${isStatDev ? 'text-purple-600' : 'text-red-600'}`, r.value));
                        tr.appendChild(UI_RENDERER.createEl('td', 'py-2.5 px-4 text-center text-[10px] font-bold text-slate-500', formatLimitText(eMin, eMax, eExact, '-')));

                        const tdType = UI_RENDERER.createEl('td', 'py-2.5 px-4 text-center');
                        tdType.appendChild(UI_RENDERER.createEl('span', `px-2 py-0.5 rounded text-[9px] font-black uppercase ${isStatDev ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`, isStatDev ? 'Stat Deviation' : 'Abnormal'));
                        tr.appendChild(tdType);

                        const tdStatus = UI_RENDERER.createEl('td', 'py-2.5 px-4 text-center');
                        tdStatus.appendChild(UI_RENDERER.createEl('span', `px-2 py-0.5 rounded text-[9px] font-black uppercase ${isAck ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`, isAck ? 'รับทราบ' : 'ใหม่'));
                        tr.appendChild(tdStatus);

                        tbody.appendChild(tr);
                    });
                }

                const pageInfo = document.getElementById('history-page-info');
                if (pageInfo) pageInfo.textContent = `หน้า ${historyPage} / ${totalPages}`;
                const prevBtn = document.getElementById('btn-history-prev');
                if (prevBtn) prevBtn.disabled = historyPage <= 1;
                const nextBtn = document.getElementById('btn-history-next');
                if (nextBtn) nextBtn.disabled = historyPage >= totalPages;

                UI_RENDERER.initIcons();
            },
});
