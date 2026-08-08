import { STATE } from '../state.js';
import { STORAGE_ENGINE } from '../storage-engine.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { escapeHtml, resolveEffectiveLimits, formatLimitText, getMasterMap, showModal, hideModal, STORE_MASTERTAGS, TABLE_RENDER_CAP } from '../shared.js';
import { APP } from './app.js';
/* global lucide */

Object.assign(APP, {

            renderMasterTable: (filterQuery = '') => {
                const tbody = document.getElementById('master-table-body');
                if (!tbody) return;

                const tags = STATE.get('tags');
                const masterTags = STATE.get('masterTags');
                const masterTagsMap = getMasterMap();

                while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

                const allMap = new Map();
                masterTags.forEach(m => {
                    // V29.53 FIX: ใช้ m.tagNo/m.paramType ที่บันทึกไว้ตรงๆ ก่อน — split(id, '_') เป็น fallback
                    // สำหรับ master ที่บันทึกไว้ก่อนแก้เท่านั้น ซึ่งพังถ้า machine/tagNo มี '_' อยู่ในตัวเอง
                    const parts = m.id.split('_');
                    allMap.set(m.id, {
                        id: m.id, machine: parts[0], tagNo: m.tagNo || parts[1], paramType: m.paramType || parts[2] || 'PV',
                        description: m.description || '',
                        min: m.min, max: m.max, exactNum: m.exactNum, isMasterOnly: true
                    });
                });
                
                tags.forEach(t => {
                    if (allMap.has(t.id)) {
                        const existing = allMap.get(t.id);
                        existing.machine = t.machine;
                        existing.isMasterOnly = false;
                        if (!existing.description) existing.description = t.description;
                    } else {
                        allMap.set(t.id, t);
                    }
                });

                let combinedTags = Array.from(allMap.values());
                const q = filterQuery.toLowerCase();
                const filtered = combinedTags.filter(t => t.tagNo.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));

                if(filtered.length === 0) {
                    const tr = UI_RENDERER.createEl('tr');
                    const td = UI_RENDERER.createEl('td', 'text-center py-8 text-slate-400 italic font-medium');
                    td.colSpan = 5; td.textContent = 'ไม่พบข้อมูล Tag ใน Master Settings';
                    tr.appendChild(td); tbody.appendChild(tr);
                    return;
                }

                filtered.slice(0, TABLE_RENDER_CAP).forEach(t => {
                    const master = masterTagsMap.get(t.id);
                    const { eMin, eMax, eExact } = resolveEffectiveLimits(t, master);
                    const eDesc = (master && master.description) ? master.description : t.description;

                    const tr = UI_RENDERER.createEl('tr', 'hover:bg-indigo-50/20 border-b border-slate-50 transition-colors');

                    const tdTag = UI_RENDERER.createEl('td', 'py-3 px-6 font-black text-slate-800');
                    tdTag.innerHTML = `${escapeHtml(t.tagNo)} ${t.isMasterOnly ? '<span class="ml-2 text-[8px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-bold border border-amber-200">No Excel</span>' : ''}`;
                    tr.appendChild(tdTag);

                    const tdType = UI_RENDERER.createEl('td', 'py-3 px-6');
                    tdType.appendChild(UI_RENDERER.createEl('span', 'bg-indigo-50 text-indigo-700 px-2 rounded-md font-black text-[9px] tracking-widest uppercase', t.paramType));
                    tr.appendChild(tdType);

                    tr.appendChild(UI_RENDERER.createEl('td', 'py-3 px-6 text-slate-600 text-[11px] truncate max-w-[200px]', eDesc || '-'));

                    const maxMinText = escapeHtml(formatLimitText(eMin, eMax, eExact, 'No Limit'));
                    const tdLim = UI_RENDERER.createEl('td', 'py-3 px-6 text-center text-[11px]');

                    if (master) {
                        tdLim.innerHTML = `<span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black border border-indigo-200"><i data-lucide="shield-check" class="w-3 h-3 inline mr-1"></i>${maxMinText}</span>`;
                    } else {
                        tdLim.innerHTML = `<span class="text-slate-500 font-bold">${maxMinText}</span>`;
                    }
                    if (master && master.forceStandby) {
                        tdLim.innerHTML += ` <span class="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black border border-amber-200 text-[9px] ml-1">STANDBY</span>`;
                    }
                    tr.appendChild(tdLim);

                    const tdAct = UI_RENDERER.createEl('td', 'py-3 px-6 text-center');
                    const btnEdit = UI_RENDERER.createEl('button', 'px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 shadow-sm transition-all');
                    btnEdit.textContent = "Edit Overrides";
                    btnEdit.onclick = () => APP.openMasterModal(t.id);
                    tdAct.appendChild(btnEdit);
                    tr.appendChild(tdAct);
                    
                    tbody.appendChild(tr);
                });
                UI_RENDERER.initIcons();
            },


            openMasterModal: (tagId) => {
                STATE.set('activeMasterId', tagId);
                const master = STATE.get('masterTags').find(m => m.id === tagId);
                // V29.53 FIX: ใช้ machine/tagNo/paramType ที่เก็บไว้ตรงๆ ใน master (ถ้ามี) แทนการ split(id, '_')
                // ซึ่งพังถ้า machine หรือ tagNo มี '_' อยู่ในตัวเอง — split เป็น fallback สำหรับ master เก่าที่บันทึกไว้ก่อนแก้
                const parts = tagId.split('_');
                const tagDef = STATE.get('tags').find(t => t.id === tagId) || {
                    tagNo: (master && master.tagNo) || parts[1],
                    paramType: (master && master.paramType) || parts[2],
                    description: '', min: null, max: null
                };
                APP._activeMasterTagDef = tagDef;

                const eTagno = document.getElementById('master-edit-tagno');
                if (eTagno) eTagno.textContent = tagDef.tagNo;
                const eType = document.getElementById('master-edit-type');
                if (eType) eType.textContent = tagDef.paramType;
                
                const eDesc = document.getElementById('master-edit-desc');
                if (eDesc) {
                    eDesc.value = (master && master.description) ? master.description : '';
                    eDesc.placeholder = tagDef.description || 'คำอธิบาย';
                }
                const eMin = document.getElementById('master-edit-min');
                if (eMin) {
                    eMin.value = (master && master.min !== null) ? master.min : '';
                    eMin.placeholder = tagDef.min !== null && tagDef.min !== undefined ? `Excel: ${tagDef.min}` : 'Min';
                }
                const eMax = document.getElementById('master-edit-max');
                if (eMax) {
                    eMax.value = (master && master.max !== null) ? master.max : '';
                    eMax.placeholder = tagDef.max !== null && tagDef.max !== undefined ? `Excel: ${tagDef.max}` : 'Max';
                }
                const eExact = document.getElementById('master-edit-exact');
                if (eExact) eExact.value = (master && master.exactNum !== null) ? master.exactNum : '';
                const eDzs = document.getElementById('master-edit-disable-zeroshield');
                if (eDzs) eDzs.checked = !!(master && master.disableZeroShield);
                const eFs = document.getElementById('master-edit-force-standby');
                if (eFs) eFs.checked = !!(master && master.forceStandby);

                showModal('master-modal');
            },


            closeMasterModal: () => {
                hideModal('master-modal');
                STATE.set('activeMasterId', null);
            },


            saveMasterSettings: async () => {
                const id = STATE.get('activeMasterId');
                if(!id) return;
                
                const dEl = document.getElementById('master-edit-desc');
                const minEl = document.getElementById('master-edit-min');
                const maxEl = document.getElementById('master-edit-max');
                const exEl = document.getElementById('master-edit-exact');
                const dzsEl = document.getElementById('master-edit-disable-zeroshield');
                const fsEl = document.getElementById('master-edit-force-standby');

                const desc = dEl ? dEl.value.trim() : '';
                const minV = minEl ? minEl.value.trim() : '';
                const maxV = maxEl ? maxEl.value.trim() : '';
                const exactV = exEl ? exEl.value.trim() : '';

                const minNum = minV !== '' ? parseFloat(minV) : null;
                const maxNum = maxV !== '' ? parseFloat(maxV) : null;

                // V29.52 FIX: กัน operator กรอก Min/Max สลับกัน (Min > Max) ซึ่งจะทำให้ทุกค่ากลายเป็นผิดปกติหมด
                if (minNum !== null && maxNum !== null && minNum > maxNum) {
                    alert("ค่า Min ต้องไม่มากกว่าค่า Max กรุณาตรวจสอบและกรอกใหม่อีกครั้ง");
                    return;
                }

                // V29.53 FIX: เก็บ tagNo/paramType ตรงๆ แทนการพึ่ง split(id, '_') ตอนแสดงผลทีหลัง
                const activeTagDef = APP._activeMasterTagDef || {};
                const masterObj = {
                    id: id,
                    tagNo: activeTagDef.tagNo,
                    paramType: activeTagDef.paramType,
                    description: desc || null,
                    min: minNum,
                    max: maxNum,
                    exactNum: exactV !== '' ? parseFloat(exactV) : null,
                    disableZeroShield: dzsEl ? dzsEl.checked : false,
                    forceStandby: fsEl ? fsEl.checked : false,
                    updatedAt: Date.now()
                };

                try {
                    await STORAGE_ENGINE.saveMasterTag(masterObj);

                    const newMasters = await STORAGE_ENGINE.getAll(STORE_MASTERTAGS);
                    STATE.set('masterTags', newMasters);

                    await STORAGE_ENGINE.updateRecordsBatch(STATE.get('records'));

                    APP.closeMasterModal();
                } catch (error) {
                    console.error("Save Master Settings Failed: ", error);
                    alert("บันทึกการตั้งค่า Master ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                }
            },
});
