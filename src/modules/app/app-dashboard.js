import { STATE } from '../state.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { escapeHtml, getTagId, parseNum, resolveEffectiveLimits, getMasterMap, getTagMap, LIMIT_EPSILON, SELECT_ALL_CAP, DASHBOARD_RENDER_CAP, RECURRING_ABNORMAL_THRESHOLD, BACKUP_REMINDER_STALE_DAYS, LS_LAST_BACKUP_KEY, LS_BACKUP_SNOOZE_KEY, DEFAULT_TIME_BREAKDOWN_DAYS, getCanonicalTimesStatus, STAT_DEVIATION_SIGMA_K } from '../shared.js';
import { APP } from './app.js';
/* global lucide */

Object.assign(APP, {

            autoSelectCritical: (count = 5) => {
                const allRecords = STATE.get('records');
                const currentVal = STATE.get('timeFilter');
                
                let timeFiltered = currentVal === 'all' ? allRecords : allRecords.filter(r => `${r.dateStr} ${r.timeStr}` === currentVal);
                // V29.84/V29.92: ครอบคลุม Statistical Deviation และ Trend Warning ด้วย ไม่งั้น record
                // ประเภทนี้จะไม่ถูกเลือกเข้า Infographic Report อัตโนมัติเลย เพราะ isAbnormal ของมันเป็น 0
                // เสมอ (mutually exclusive)
                let strictlyAbnormal = timeFiltered.filter(r => (r.isAbnormal === 1 || r.isStatDeviation === 1 || r.isStatTrendWarning === 1) && !r.isStandby);

                if(strictlyAbnormal.length === 0) {
                    alert("ไม่มีข้อมูลพารามิเตอร์ผิดปกติ (ที่ไม่ใช่การหยุดเครื่อง) ในช่วงเวลานี้ครับ");
                    return;
                }
                
                const mTagsMap = getMasterMap();
                const tagMap = getTagMap(); // V29.52 PERF: build once instead of tags.find per record

                let scored = strictlyAbnormal.map(r => {
                    const tId = getTagId(r);
                    const tDef = tagMap.get(tId);
                    const master = mTagsMap.get(tId);

                    const { eMin, eMax, eExact } = resolveEffectiveLimits(tDef, master);

                    let val = parseNum(r.value);
                    let score = 0;

                    if (r.isStatDeviation === 1 && r.statZScore !== null) {
                        // Normalize เทียบเคียงกับ severity score เดิม (สัดส่วนระยะห่างจาก limit): 1.0 = พอดี
                        // เกณฑ์ sigma, >1 = รุนแรงกว่า — heuristic ranking ไม่ใช่หน่วยเดียวกันเป๊ะ แต่พอสำหรับ
                        // จัดลำดับ Top-N ให้ operator เห็นทั้งสองประเภทปนกันตามความรุนแรงสัมพัทธ์
                        // clamp กัน Infinity (std=0 edge case ใน computeCausalStatDeviation) ทำให้ sort เทียบ
                        // Infinity-Infinity=NaN แล้วลำดับ Top-N ของคู่นั้นไม่ deterministic
                        score = Math.min(Math.abs(r.statZScore) / STAT_DEVIATION_SIGMA_K, 1000);
                    } else if (r.isStatTrendWarning === 1 && r.statZScore !== null && isFinite(r.statZScore)) {
                        // V29.92: Trend Warning ต้อง rank ต่ำกว่า full Stat Deviation เสมอ — cap ไว้ที่ 1
                        // (full stat-dev score เริ่มต้นที่ >=1 เพราะ |z| > STAT_DEVIATION_SIGMA_K เป็นเงื่อนไข)
                        score = Math.min(Math.abs(r.statZScore) / STAT_DEVIATION_SIGMA_K, 1);
                    } else if (!isNaN(val)) {
                        if (eMax !== null && val > eMax) {
                            score = eMax !== 0 ? Math.abs((val - eMax) / eMax) : Math.abs(val);
                        } else if (eMin !== null && val < eMin) {
                            score = eMin !== 0 ? Math.abs((eMin - val) / eMin) : Math.abs(val);
                        } else if (eExact !== null && Math.abs(val - eExact) > LIMIT_EPSILON) {
                            score = eExact !== 0 ? Math.abs((val - eExact) / eExact) : Math.abs(val);
                        }
                    }
                    return { ...r, severityScore: score };
                });
                
                scored.sort((a, b) => b.severityScore - a.severityScore);
                
                const uniqueTags = new Map();
                const finalSelection = [];

                for (let r of scored) {
                    const tagKey = getTagId(r);
                    if (!uniqueTags.has(tagKey)) {
                        uniqueTags.set(tagKey, true); 
                        finalSelection.push(r);
                        if (finalSelection.length >= count) break; 
                    }
                }
                
                const topIds = finalSelection.map(r => r.id);
                // V29.52 PERF: STATE.set already triggers APP.render → renderDashboard (no manual re-render needed)
                STATE.set('selectedForReport', topIds);
            },


            updateFloatingBar: () => {
                const selected = STATE.get('selectedForReport');
                const bar = document.getElementById('floating-report-bar');
                if (!bar) return;
                
                const rCount = document.getElementById('report-count');
                if (rCount) rCount.textContent = selected.length;
                
                if (selected.length > 0) {
                    bar.classList.remove('translate-y-full');
                } else {
                    bar.classList.add('translate-y-full');
                }
            },


            toggleReportSelection: (recordId) => {
                let selected = [...STATE.get('selectedForReport')];
                if (selected.includes(recordId)) {
                    selected = selected.filter(id => id !== recordId);
                } else {
                    selected.push(recordId);
                }
                STATE.set('selectedForReport', selected);
            },


            selectAllVisible: () => {
                const abs = STATE.get('abnormalRecords');
                if (abs.length === 0) {
                    alert('ไม่มีรายการพารามิเตอร์ให้เลือกในช่วงเวลานี้ครับ');
                    return;
                }
                STATE.set('selectedForReport', abs.slice(0, SELECT_ALL_CAP).map(r => r.id));
            },


            // V29.51 FEAT: Backup reminder banner (เตือนถ้ายังไม่เคยสำรอง หรือสำรองครั้งล่าสุดนานเกินไป)
            renderBackupReminder: () => {
                const banner = document.getElementById('backup-reminder-banner');
                if (!banner) return;

                const tags = STATE.get('tags');
                const records = STATE.get('records');
                if ((!tags || tags.length === 0) && (!records || records.length === 0)) {
                    banner.classList.add('hidden');
                    return;
                }

                const snoozeUntil = localStorage.getItem(LS_BACKUP_SNOOZE_KEY);
                if (snoozeUntil && new Date(snoozeUntil) > new Date()) {
                    banner.classList.add('hidden');
                    return;
                }

                const lastBackupAt = localStorage.getItem(LS_LAST_BACKUP_KEY);
                const daysSince = lastBackupAt ? (Date.now() - new Date(lastBackupAt).getTime()) / 86400000 : Infinity;

                if (daysSince < BACKUP_REMINDER_STALE_DAYS) {
                    banner.classList.add('hidden');
                    return;
                }

                const textEl = document.getElementById('backup-reminder-text');
                if (textEl) {
                    textEl.textContent = lastBackupAt
                        ? `สำรองข้อมูลล่าสุดเมื่อ ${Math.floor(daysSince)} วันที่แล้ว — สำรองข้อมูลเพื่อป้องกันข้อมูลสูญหาย`
                        : 'ยังไม่เคยสำรองข้อมูล — สำรองข้อมูลเพื่อป้องกันข้อมูลสูญหายหากล้าง Browser Data';
                }
                banner.classList.remove('hidden');
                UI_RENDERER.initIcons();
            },


            renderDashboard: () => {
                APP.renderBackupReminder();
                const tags = STATE.get('tags');
                const records = STATE.get('records');
                const abs = STATE.get('abnormalRecords');
                const viewFilter = STATE.get('viewFilter');
                const mTagsMap = getMasterMap();
                const tagMap = getTagMap(); // V29.52 PERF: build once instead of tags.find per card
                const selectedForReport = STATE.get('selectedForReport');
                const currentVal = STATE.get('timeFilter');

                const timeBreakdownBar = document.getElementById('time-breakdown-bar');
                if (!timeBreakdownBar) return;
                while (timeBreakdownBar.firstChild) timeBreakdownBar.removeChild(timeBreakdownBar.firstChild);
                
                const timeGroups = {};
                records.forEach(r => {
                    const key = `${r.dateStr} ${r.timeStr}`;
                    if (!timeGroups[key]) timeGroups[key] = { date: r.dateStr, time: r.timeStr, total: 0, abnormal: 0 };
                    timeGroups[key].total++;
                    // V29.84/V29.92 FIX: ต้องนับ Statistical Deviation และ Trend Warning ด้วย ไม่งั้นปุ่ม
                    // time-slot จะโชว์ "OK" (0 ผิดปกติ) ทั้งที่รายการด้านล่างมีปรากฏอยู่จริง — ขัดกับเจตนาของ
                    // ฟีเจอร์นี้ที่อยากให้ operator ไม่พลาดอะไรเพราะแยกดูแค่ isAbnormal
                    if (r.isAbnormal === 1 || r.isStatDeviation === 1 || r.isStatTrendWarning === 1) timeGroups[key].abnormal++;
                });

                // V29.78 FEAT: chip แสดงว่าวันล่าสุดมีข้อมูลครบ 4 รอบเวลา (03:00/09:00/15:00/21:00) หรือยัง
                const chip = document.getElementById('canonical-times-chip');
                if (chip) {
                    const cts = getCanonicalTimesStatus(records);
                    if (!cts.dateStr) {
                        chip.classList.add('hidden');
                    } else {
                        chip.classList.remove('hidden');
                        if (cts.isComplete) {
                            chip.className = 'text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700';
                            chip.textContent = `✓ ครบ 4 รอบเวลา (${cts.dateStr})`;
                        } else {
                            chip.className = 'text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700';
                            chip.textContent = `⏳ รอ ${cts.missingTimes.join(', ')} (${cts.dateStr})`;
                        }
                    }
                }

                const sortedKeys = Object.keys(timeGroups).sort((a,b) => {
                    const [da, ta] = a.split(' ');
                    const [db, tb] = b.split(' ');
                    if(da !== db) {
                        const dateA = (da || '').includes('/') ? da.split('/').reverse().join('') : da;
                        const dateB = (db || '').includes('/') ? db.split('/').reverse().join('') : db;
                        return dateA.localeCompare(dateB);
                    }
                    return (ta || '').localeCompare(tb || '');
                });

                // V29.78 PERF: sortedKeys is already date-ascending (sorted above), so de-duping in order
                // yields distinct dates ascending too — no separate date sort needed.
                const distinctDates = [...new Set(sortedKeys.map(k => timeGroups[k].date))];
                const recentDates = new Set(distinctDates.slice(-DEFAULT_TIME_BREAKDOWN_DAYS));
                const olderKeys = sortedKeys.filter(k => !recentDates.has(timeGroups[k].date));

                const allBtn = UI_RENDERER.createEl('button', `shrink-0 px-4 py-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${currentVal === 'all' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`);
                allBtn.onclick = () => STATE.set('timeFilter', 'all');
                allBtn.innerHTML = `<span class="text-[10px] font-bold ${currentVal === 'all' ? 'text-indigo-600' : 'text-slate-500'}">แสดงทั้งหมด</span><span class="text-xs font-black text-slate-800">All Time</span>`;
                timeBreakdownBar.appendChild(allBtn);

                sortedKeys.forEach(k => {
                    if (!recentDates.has(timeGroups[k].date)) return; // อยู่ dropdown "วันที่เก่ากว่านี้" แทน
                    const tg = timeGroups[k];
                    const isSelected = currentVal === k;
                    const hasAbnormal = tg.abnormal > 0;

                    const btn = UI_RENDERER.createEl('button', `shrink-0 px-4 py-2.5 rounded-xl border flex flex-col items-start transition-all ${isSelected ? 'ring-2 ring-brand-500 shadow-md' : 'shadow-sm hover:bg-slate-50'} ${hasAbnormal ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-200'}`);
                    btn.onclick = () => STATE.set('timeFilter', k);

                    const topRow = UI_RENDERER.createEl('div', 'flex items-center justify-between w-full mb-1');
                    topRow.innerHTML = `<span class="text-[10px] font-bold text-slate-500">${escapeHtml((tg.date || '').substring(0,5))}</span> <span class="text-[9px] font-bold ${hasAbnormal ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} px-1.5 rounded ml-2">${escapeHtml(hasAbnormal ? tg.abnormal + ' Abn' : 'OK')}</span>`;

                    const botRow = UI_RENDERER.createEl('div', 'text-sm font-black text-slate-800');
                    botRow.textContent = (tg.time || '00:00') + ' น.';

                    btn.appendChild(topRow);
                    btn.appendChild(botRow);
                    timeBreakdownBar.appendChild(btn);
                });

                // V29.78 PERF: วันที่เก่ากว่า DEFAULT_TIME_BREAKDOWN_DAYS วันล่าสุด ไม่ render เป็นปุ่มถาวร
                // (กัน DOM บวมไม่รู้จบเมื่อสะสมข้อมูลหลายเดือน) — เข้าถึงผ่าน dropdown นี้แทน ใช้ STATE.set
                // ตัวเดียวกับปุ่มปกติทุกประการ
                const olderSelect = document.getElementById('older-dates-select');
                if (olderSelect) {
                    if (olderKeys.length === 0) {
                        olderSelect.classList.add('hidden');
                    } else {
                        olderSelect.classList.remove('hidden');
                        while (olderSelect.options.length > 1) olderSelect.remove(1);
                        olderKeys.forEach(k => {
                            const tg = timeGroups[k];
                            const opt = document.createElement('option');
                            opt.value = k;
                            opt.textContent = `${tg.date || ''} ${tg.time || ''}${tg.abnormal > 0 ? ` (${tg.abnormal} Abn)` : ''}`;
                            if (currentVal === k) opt.selected = true;
                            olderSelect.appendChild(opt);
                        });
                        olderSelect.onchange = (e) => { if (e.target.value) STATE.set('timeFilter', e.target.value); };
                    }
                }

                const currentRecords = currentVal === 'all' ? records : records.filter(r => `${r.dateStr} ${r.timeStr}` === currentVal);
                const totalAbnormal = currentRecords.filter(r => r.isAbnormal === 1);
                const totalStatDev = currentRecords.filter(r => r.isStatDeviation === 1); // V29.84 FEAT
                const totalTrendWarn = currentRecords.filter(r => r.isStatTrendWarning === 1); // V29.92 FEAT

                const st = document.getElementById('stat-tags');
                if (st) st.textContent = tags.length.toLocaleString();
                const sr = document.getElementById('stat-records');
                if (sr) sr.textContent = currentRecords.length.toLocaleString();
                const sa = document.getElementById('stat-abnormal');
                if (sa) sa.textContent = totalAbnormal.length.toLocaleString();

                const ackCount = totalAbnormal.filter(r => r.actionStatus === 'acknowledged').length;
                const sack = document.getElementById('stat-ack');
                if (sack) sack.textContent = ackCount;
                const spen = document.getElementById('stat-pending');
                if (spen) spen.textContent = totalAbnormal.length - ackCount;

                const sSd = document.getElementById('stat-statdev');
                if (sSd) sSd.textContent = totalStatDev.length.toLocaleString();
                const sdAckCount = totalStatDev.filter(r => r.actionStatus === 'acknowledged').length;
                const sdAck = document.getElementById('stat-statdev-ack');
                if (sdAck) sdAck.textContent = sdAckCount;
                const sdPen = document.getElementById('stat-statdev-pending');
                if (sdPen) sdPen.textContent = totalStatDev.length - sdAckCount;

                const sTw = document.getElementById('stat-trendwarn');
                if (sTw) sTw.textContent = totalTrendWarn.length.toLocaleString();
                const twAckCount = totalTrendWarn.filter(r => r.actionStatus === 'acknowledged').length;
                const twAck = document.getElementById('stat-trendwarn-ack');
                if (twAck) twAck.textContent = twAckCount;
                const twPen = document.getElementById('stat-trendwarn-pending');
                if (twPen) twPen.textContent = totalTrendWarn.length - twAckCount;

                // V29.51 FEAT: ช่องค้นหาใน Dashboard (ค้นหาภายในช่วงเวลา/filter ที่เลือกอยู่)
                const searchInput = document.getElementById('dashboard-search');
                const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
                const visibleAbs = searchQuery ? abs.filter(r => {
                    const tId = getTagId(r);
                    const tagDef = tagMap.get(tId) || {};
                    const master = mTagsMap.get(tId);
                    const desc = (master && master.description) ? master.description : (tagDef.description || '');
                    return (r.tagNo || '').toLowerCase().includes(searchQuery)
                        || (r.machine || '').toLowerCase().includes(searchQuery)
                        || desc.toLowerCase().includes(searchQuery);
                }) : abs;

                const grid = document.getElementById('abnormal-grid');
                if (!grid) return;
                while (grid.firstChild) grid.removeChild(grid.firstChild);

                if (visibleAbs.length === 0) {
                    const empty = UI_RENDERER.createEl('div', 'col-span-full py-20 flex flex-col items-center justify-center text-slate-400 opacity-70');
                    if (searchQuery) {
                        empty.innerHTML = `<i data-lucide="search-x" class="w-12 h-12 mb-3 text-slate-300"></i><p class="text-sm font-medium text-slate-500">ไม่พบรายการที่ตรงกับคำค้นหา</p>`;
                    } else if(viewFilter === 'abnormal') {
                        empty.innerHTML = `<i data-lucide="check-circle" class="w-12 h-12 mb-3 text-brand-400"></i><p class="text-sm font-medium text-slate-500">เยี่ยมมาก! ไม่พบรายการพารามิเตอร์ผิดปกติในช่วงเวลานี้</p>`;
                    } else {
                        empty.innerHTML = `<i data-lucide="inbox" class="w-12 h-12 mb-3 text-slate-300"></i><p class="text-sm font-medium text-slate-500">ยังไม่มีข้อมูล</p>`;
                    }
                    grid.appendChild(empty);
                } else {
                    // V29.51 FEAT: Recurring-abnormality badge — count abnormal (non-standby) occurrences per tag across ALL loaded records, not just the current time/search filter
                    const abnormalCounts = new Map();
                    records.forEach(rec => {
                        if (rec.isAbnormal === 1 && rec.isStandby !== true) {
                            const tId = getTagId(rec);
                            abnormalCounts.set(tId, (abnormalCounts.get(tId) || 0) + 1);
                        }
                    });

                    // V29.89 FIX: เดิม slice(0, SELECT_ALL_CAP) ตัดจากหัว list ที่เรียงเก่า→ใหม่ ทำให้ Abnormal
                    // ที่สะสมเกิน 300 รายการ (เช่นสะสมมาเป็นปี) เห็นแค่ 300 รายการที่เก่าที่สุด รายการล่าสุดไม่
                    // โผล่เลยแบบเงียบๆ — ตัดจากท้ายแทนให้เหลือ "300 รายการล่าสุด" แล้วแจ้ง notice ให้ไปดูทั้งหมด
                    // ที่หน้า History แทน (ไม่มี cap นี้)
                    if (visibleAbs.length > DASHBOARD_RENDER_CAP) {
                        const notice = UI_RENDERER.createEl('div', 'col-span-full flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl py-2.5 px-3 mb-1');
                        notice.appendChild(document.createTextNode(`แสดง ${DASHBOARD_RENDER_CAP.toLocaleString()} รายการล่าสุด จากทั้งหมด ${visibleAbs.length.toLocaleString()} รายการ —`));
                        const gotoBtn = UI_RENDERER.createEl('button', 'underline font-black text-amber-800 hover:text-amber-900');
                        gotoBtn.textContent = 'ดูทั้งหมดที่หน้า History';
                        gotoBtn.onclick = () => APP.switchTab('history');
                        notice.appendChild(gotoBtn);
                        grid.appendChild(notice);
                    }

                    visibleAbs.slice(-DASHBOARD_RENDER_CAP).forEach(r => {
                        const tId = getTagId(r);
                        const tagDef = tagMap.get(tId) || {};
                        const master = mTagsMap.get(tId);
                        const isAck = r.actionStatus === 'acknowledged';
                        const isAbnormal = r.isAbnormal === 1;
                        const isStandby = r.isStandby === true;
                        const isStatDev = r.isStatDeviation === 1; // V29.84 FEAT — mutually exclusive กับ isAbnormal (state.js เช็คแค่ record ที่ isAbnormal===0 เท่านั้น)
                        const isTrendWarn = r.isStatTrendWarning === 1; // V29.92 FEAT — เบากว่า isStatDev, mutually exclusive กันทั้งคู่
                        const isSelected = selectedForReport.includes(r.id);

                        let borderColor = isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-100';
                        let accentColor = 'bg-brand-500';
                        let valueColor = 'text-slate-800';

                        if (isStandby) {
                            borderColor = isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 bg-slate-50/50';
                            accentColor = 'bg-slate-300';
                            valueColor = 'text-slate-400';
                        } else if (isAbnormal) {
                            if (!isSelected) borderColor = isAck ? 'border-amber-200' : 'border-red-100 bg-red-50/10';
                            accentColor = isAck ? 'bg-amber-400' : 'bg-red-500';
                            valueColor = isAck ? 'text-amber-600' : 'text-red-600';
                        } else if (isStatDev) {
                            if (!isSelected) borderColor = isAck ? 'border-amber-200' : 'border-purple-100 bg-purple-50/10';
                            accentColor = isAck ? 'bg-amber-400' : 'bg-purple-500';
                            valueColor = isAck ? 'text-amber-600' : 'text-purple-600';
                        } else if (isTrendWarn) {
                            if (!isSelected) borderColor = isAck ? 'border-amber-200' : 'border-cyan-100 bg-cyan-50/10';
                            accentColor = isAck ? 'bg-amber-400' : 'bg-cyan-500';
                            valueColor = isAck ? 'text-amber-600' : 'text-cyan-600';
                        }
                        
                        const card = UI_RENDERER.createEl('div', `p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md relative overflow-hidden flex flex-col min-h-[9rem] transition-all cursor-pointer group ${borderColor}`);
                        card.onclick = () => APP.openActionModal(r.id);

                        card.appendChild(UI_RENDERER.createEl('div', `absolute top-0 left-0 w-1.5 h-full transition-colors ${accentColor}`));

                        const cbWrapper = UI_RENDERER.createEl('div', 'absolute top-4 right-4 z-20');
                        const cb = UI_RENDERER.createEl('input', 'custom-checkbox');
                        cb.type = 'checkbox';
                        cb.checked = isSelected;
                        cb.onclick = (e) => {
                            e.stopPropagation(); 
                            APP.toggleReportSelection(r.id);
                        };
                        cbWrapper.appendChild(cb);
                        card.appendChild(cbWrapper);

                        const topDiv = UI_RENDERER.createEl('div', 'flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-tighter pr-8');
                        const timeSpan = UI_RENDERER.createEl('span', 'flex items-center gap-1.5 text-slate-500');
                        
                        if (isStandby) {
                            timeSpan.innerHTML = '<i data-lucide="power-off" class="w-3.5 h-3.5 text-slate-400"></i>';
                            timeSpan.appendChild(document.createTextNode(` ${r.dateStr || ''} • ${r.timeStr || ''} (STANDBY)`));
                        } else if (isAbnormal) {
                            timeSpan.innerHTML = isAck ? '<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-amber-500"></i>' : '<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-red-500"></i>';
                            timeSpan.appendChild(document.createTextNode(` ${r.dateStr || ''} • ${r.timeStr || ''}`));
                        } else if (isStatDev) {
                            timeSpan.innerHTML = isAck ? '<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-amber-500"></i>' : '<i data-lucide="activity" class="w-3.5 h-3.5 text-purple-500"></i>';
                            timeSpan.appendChild(document.createTextNode(` ${r.dateStr || ''} • ${r.timeStr || ''} (STAT DEVIATION)`));
                        } else if (isTrendWarn) {
                            timeSpan.innerHTML = isAck ? '<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-amber-500"></i>' : '<i data-lucide="trending-up" class="w-3.5 h-3.5 text-cyan-500"></i>';
                            timeSpan.appendChild(document.createTextNode(` ${r.dateStr || ''} • ${r.timeStr || ''} (TREND WARNING)`));
                        } else {
                            timeSpan.innerHTML = '<i data-lucide="check-circle" class="w-3.5 h-3.5 text-brand-500"></i>';
                            timeSpan.appendChild(document.createTextNode(` ${r.dateStr || ''} • ${r.timeStr || ''}`));
                        }
                        
                        const mSpan = UI_RENDERER.createEl('span', 'bg-slate-100 px-2 py-0.5 rounded text-slate-500', r.machine);
                        topDiv.appendChild(timeSpan); topDiv.appendChild(mSpan);

                        // V29.51 FEAT: Recurring-abnormality badge
                        const recurCount = abnormalCounts.get(tId) || 0;
                        if (isAbnormal && !isStandby && recurCount >= RECURRING_ABNORMAL_THRESHOLD) {
                            const recurSpan = UI_RENDERER.createEl('span', 'bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center gap-1 ml-1.5');
                            recurSpan.innerHTML = `<i data-lucide="repeat" class="w-3 h-3"></i> ผิดปกติซ้ำ ${recurCount} ครั้ง`;
                            topDiv.appendChild(recurSpan);
                        }

                        card.appendChild(topDiv);

                        const midDiv = UI_RENDERER.createEl('div', 'flex-1');
                        const titleDiv = UI_RENDERER.createEl('div', 'flex items-center gap-2');
                        titleDiv.appendChild(UI_RENDERER.createEl('span', 'font-black text-slate-800 text-lg leading-none', r.tagNo));
                        titleDiv.appendChild(UI_RENDERER.createEl('span', 'bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest uppercase', r.paramType));
                        midDiv.appendChild(titleDiv);
                        
                        const eDesc = (master && master.description) ? master.description : (tagDef.description || '-');
                        midDiv.appendChild(UI_RENDERER.createEl('p', 'text-[10px] text-slate-500 truncate mt-1 font-medium', eDesc));
                        card.appendChild(midDiv);

                        const botDiv = UI_RENDERER.createEl('div', 'flex justify-between items-end pt-3 mt-1');
                        botDiv.appendChild(UI_RENDERER.createEl('span', 'text-[10px] font-bold text-slate-400 uppercase tracking-tighter', `Norm: ${tagDef.normalText || 'N/A'}`));
                        botDiv.appendChild(UI_RENDERER.createEl('span', `text-2xl font-black leading-none ${valueColor}`, r.value));
                        card.appendChild(botDiv);

                        if (r.remark) {
                            const remDiv = UI_RENDERER.createEl('div', `mt-3 pt-2 border-t flex flex-col gap-0.5 ${isAck ? 'border-amber-100' : 'border-slate-50'}`);
                            const rH = UI_RENDERER.createEl('span', `text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isAck ? 'text-amber-500' : 'text-slate-400'}`);
                            rH.innerHTML = '<i data-lucide="message-square" class="w-3 h-3"></i> Action Remark';
                            remDiv.appendChild(rH);
                            remDiv.appendChild(UI_RENDERER.createEl('p', `text-[11px] font-medium leading-tight line-clamp-2 ${isAck ? 'text-amber-800' : 'text-slate-600'}`, `"${r.remark}"`));
                            card.appendChild(remDiv);
                        }

                        const overlay = UI_RENDERER.createEl('div', 'absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl duration-200 pointer-events-none');
                        const hoverBtn = UI_RENDERER.createEl('span', 'bg-white text-slate-700 px-4 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform');
                        hoverBtn.innerHTML = '<i data-lucide="mouse-pointer-click" class="w-4 h-4 text-brand-500"></i> ดูกราฟแนวโน้ม';
                        overlay.appendChild(hoverBtn);
                        card.appendChild(overlay);

                        grid.appendChild(card);
                    });
                }
                UI_RENDERER.initIcons();
            },
});
