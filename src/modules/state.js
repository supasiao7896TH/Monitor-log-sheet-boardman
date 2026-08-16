import { getMasterMap, getTagMap, resolveEffectiveLimits, parseNum, getTagId, LIMIT_EPSILON, ZERO_SHIELD_ABS, ZERO_SHIELD_REF_MAGNITUDE, ZERO_SHIELD_REF_ABS, ZERO_SHIELD_REF_RATIO, computeCausalStatDeviation } from './shared.js';

export const STATE = {
            data: {
                activeTab: 'dashboard',
                tags: [],
                masterTags: [],
                userCountermeasures: [],
                records: [],
                abnormalRecords: [],
                abnormalHistory: [], // V29.90 FEAT: snapshot ของ record ที่เคย Abnormal/Stat Deviation, sync จาก STORE_ABNORMAL_HISTORY โดย APP.syncAbnormalHistory (app-core.js) — อยู่รอด "ล้างฐานข้อมูล" (ต่างจาก records)
                timeFilter: 'all',
                viewFilter: 'abnormal', 
                activeRecordId: null,
                activeMasterId: null,
                selectedForReport: []
            },
            listeners: [],
            get: (key) => STATE.data[key],
            // V29.78 PERF: _deriveAbnormal used to always do BOTH the expensive per-record
            // isAbnormal/isStandby recompute AND the filter+sort in one pass, so clicking a time-slot
            // or view-filter button (which changes nothing about which records are abnormal — only
            // which subset is *displayed*) still re-ran the full recompute over every record ever
            // imported. Split so the expensive part only reruns when the data or limits actually
            // changed ('records'/'masterTags'), while filter/sort (cheap) reruns on every trigger key,
            // reusing the flags from the last recompute.
            set: (key, value) => {
                STATE.data[key] = value;
                if (['records', 'masterTags'].includes(key)) {
                    STATE._recomputeFlags();
                }
                if (['records', 'timeFilter', 'masterTags', 'viewFilter'].includes(key)) {
                    STATE._applyFilterSort();
                }
                STATE.notify(key);
            },
            _recomputeFlags: () => {
                const mTagsMap = getMasterMap();
                const tagMap = getTagMap(); // V29.52 PERF: build once instead of tags.find per record
                const updatedRecords = STATE.data.records.map(r => {
                    const tId = getTagId(r);
                    const tDef = tagMap.get(tId);
                    const master = mTagsMap.get(tId);

                    const { eMin, eMax, eExact } = resolveEffectiveLimits(tDef, master);

                    let val = parseNum(r.value);
                    let isAb = 0;
                    let isStandby = false;
                    const zeroShieldDisabled = !!(master && master.disableZeroShield);
                    const forceStandby = !!(master && master.forceStandby);

                    // V29.42: บังคับ Standby ทั้ง Tag (ข้ามการตรวจจับผิดปกติทั้งหมด ไม่ว่าค่าจะเป็นเท่าไหร่)
                    if (forceStandby) {
                        isStandby = true;
                        isAb = 0;
                    }
                    // V29.40 FIX: ต้องเป็นตัวเลขเท่านั้น (String ที่ถูกเว้นมาจะไม่ประมวลผล)
                    else if (!isNaN(val) && String(r.value).trim() !== '') {
                        // V29.61 FIX: absolute zero-shield มีไว้จับ "เครื่องมือ offline อ่านค่า 0" ซึ่งมีความหมาย
                        // เฉพาะ tag ที่ช่วงค่าปกติมี magnitude ใหญ่พอ (>= ZERO_SHIELD_REF_MAGNITUDE) หรือไม่มี limit
                        // กำหนดไว้เลย — ถ้า tag มีช่วงค่าปกติเล็กใกล้ 0 อยู่แล้ว (เช่น leak/ppm sensor eMax=0.08)
                        // ต้องไม่ปล่อยให้ shield นี้กลืนค่าที่หลุด limit จริงแบบไม่มีร่องรอย
                        const limitMags = [eMin, eMax, eExact].filter(v => v !== null).map(Math.abs);
                        const limitMagnitude = limitMags.length ? Math.max(...limitMags) : null;
                        const zeroShieldEligible = limitMagnitude === null || limitMagnitude >= ZERO_SHIELD_REF_MAGNITUDE;

                        if (!zeroShieldDisabled && zeroShieldEligible && Math.abs(val) <= ZERO_SHIELD_ABS) {
                            isStandby = true;
                            isAb = 0;
                        } else {
                            if (eMin !== null && val < (eMin - LIMIT_EPSILON)) isAb = 1;
                            if (eMax !== null && val > (eMax + LIMIT_EPSILON)) isAb = 1;
                            if (eExact !== null && Math.abs(val - eExact) > LIMIT_EPSILON) isAb = 1;

                            if (!zeroShieldDisabled && isAb === 1) {
                                // V29.61 FIX: เลือก refValue ตามทิศทางที่หลุด limit จริง แทนที่จะใช้ eMin ก่อนเสมอ
                                let refValue;
                                if (eExact !== null) refValue = eExact;
                                else if (eMax !== null && val > (eMax + LIMIT_EPSILON)) refValue = eMax;
                                else if (eMin !== null && val < (eMin - LIMIT_EPSILON)) refValue = eMin;
                                else refValue = eMin !== null ? eMin : eMax;

                                if (refValue !== null && Math.abs(refValue) >= ZERO_SHIELD_REF_MAGNITUDE) {
                                    if (Math.abs(val) <= ZERO_SHIELD_REF_ABS || Math.abs(val) < Math.abs(refValue) * ZERO_SHIELD_REF_RATIO) {
                                        isStandby = true;
                                        isAb = 0;
                                    }
                                }
                            }
                        }
                    } else {
                        // ป้องกันขยะข้อความทุกชนิดให้เป็น Standby ให้หมด
                        isStandby = true;
                        isAb = 0;
                    }
                    return { ...r, isAbnormal: isAb, isStandby: isStandby, isStatDeviation: 0, statZScore: null };
                });

                // V29.84 FEAT: pass ที่สอง — Statistical Deviation (opt-in ต่อ tag ผ่าน Tag Master) จับ
                // reading ที่ยังอยู่ใน hard-limit spec แต่หลุด baseline จริงของ tag เอง (ดู shared.js
                // computeCausalStatDeviation) ทำเฉพาะ tag ที่เปิด enableStatDeviation ไว้เท่านั้น เพื่อไม่ให้
                // tag ที่ swing กว้างโดยธรรมชาติ (เช่น batch process) เกิด false-positive รัว
                const statGroups = new Map(); // tagId -> [{ idx, timestamp, value, isAbnormal, isStandby }]
                updatedRecords.forEach((r, idx) => {
                    const tId = getTagId(r);
                    const master = mTagsMap.get(tId);
                    if (!master || !master.enableStatDeviation) return;
                    if (!statGroups.has(tId)) statGroups.set(tId, []);
                    statGroups.get(tId).push({ idx, timestamp: r.timestamp, value: parseNum(r.value), isAbnormal: r.isAbnormal, isStandby: r.isStandby });
                });

                statGroups.forEach((entries, tId) => {
                    const { eExact } = resolveEffectiveLimits(tagMap.get(tId), mTagsMap.get(tId));
                    if (eExact !== null) return; // exact-match/discrete tag — mean/σ ไม่มีความหมาย, skip แม้เปิด opt-in

                    entries.sort((a, b) => a.timestamp - b.timestamp);
                    const samples = entries.map(e => ({
                        value: e.value,
                        isBaselineEligible: !isNaN(e.value) && e.isAbnormal !== 1 && !e.isStandby
                    }));
                    const results = computeCausalStatDeviation(samples);
                    entries.forEach((e, i) => {
                        // record ที่หลุด hard-limit หรือ standby อยู่แล้วต้องไม่ได้ป้ายที่สองทับ (mutual
                        // exclusivity ตาม design) — ปล่อยให้ค่าเริ่มต้น isStatDeviation:0 จาก pass แรกคงอยู่
                        if (e.isAbnormal === 1 || e.isStandby) return;
                        updatedRecords[e.idx] = { ...updatedRecords[e.idx], isStatDeviation: results[i].isStatDeviation, statZScore: results[i].zScore };
                    });
                });

                STATE.data.records = updatedRecords;
            },
            _applyFilterSort: () => {
                let list = STATE.data.records;
                if (STATE.data.viewFilter === 'abnormal') {
                    // V29.84: ต้องครอบคลุมทั้ง hard-limit violation และ Statistical Deviation — operator
                    // ดู Web App แทนกระดาษ 100% แล้ว ห้ามพลาดอะไรเพราะ default filter แคบเกินไป (badge/สี
                    // ที่แยกกันใน dashboard ทำหน้าที่บอกความต่างของประเภทปัญหาแทน)
                    list = list.filter(r => r.isAbnormal === 1 || r.isStatDeviation === 1);
                } else if (STATE.data.viewFilter === 'stat-deviation') {
                    list = list.filter(r => r.isStatDeviation === 1);
                }
                if (STATE.data.timeFilter !== 'all') {
                    list = list.filter(r => `${r.dateStr} ${r.timeStr}` === STATE.data.timeFilter);
                }
                
                list.sort((a,b) => {
                    const dA = a.dateStr || '';
                    const dB = b.dateStr || '';
                    if (dA !== dB) {
                        const dateA = dA.includes('/') ? dA.split('/').reverse().join('') : (dA.includes('-') ? dA.split('-').reverse().join('') : dA);
                        const dateB = dB.includes('/') ? dB.split('/').reverse().join('') : (dB.includes('-') ? dB.split('-').reverse().join('') : dB);
                        return dateA.localeCompare(dateB);
                    }
                    const tA = a.timeStr || '';
                    const tB = b.timeStr || '';
                    if (tA !== tB) return tA.localeCompare(tB);
                    
                    const m1Match = (a.machine || '').match(/\d+/);
                    const m2Match = (b.machine || '').match(/\d+/);
                    const n1 = parseInt(m1Match ? m1Match[0] : '999');
                    const n2 = parseInt(m2Match ? m2Match[0] : '999');
                    if (n1 !== n2) return n1 - n2;
                    return (a.sortIndex || 0) - (b.sortIndex || 0);
                });
                STATE.data.abnormalRecords = list;
            },
            subscribe: (fn) => STATE.listeners.push(fn),
            notify: (changedKey) => STATE.listeners.forEach(fn => fn(changedKey))
        };
