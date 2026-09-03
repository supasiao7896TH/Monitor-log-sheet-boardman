import { STATE } from '../state.js';
import { STORAGE_ENGINE } from '../storage-engine.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { COUNTERMEASURE_AGENT } from '../countermeasure-agent.js';
import { COUNTERMEASURE_DB } from '../countermeasure-db.js';
import { escapeHtml, showModal, hideModal, autoResizeTextarea, STORE_COUNTERMEASURES, TABLE_RENDER_CAP } from '../shared.js';
import { APP } from './app.js';
/* global lucide */

Object.assign(APP, {

            // V29.58 FEAT: หลังบ้านให้เพิ่มคำแนะนำ Auto-Draft เอง (นอกเหนือจากคู่มือ MPS ที่ hardcode ไว้)
            renderCountermeasureTable: (filterQuery = '') => {
                const tbody = document.getElementById('countermeasure-table-body');
                if (!tbody) return;

                const userEntries = STATE.get('userCountermeasures') || [];
                const combined = [
                    ...COUNTERMEASURE_DB.map(e => ({ ...e, isCurated: true })),
                    ...userEntries.map(e => ({ ...e, isCurated: false }))
                ];

                const q = filterQuery.trim().toLowerCase();
                const filtered = q ? combined.filter(e => e.tagNo.toLowerCase().includes(q)) : combined;

                while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

                if (filtered.length === 0) {
                    const tr = UI_RENDERER.createEl('tr');
                    const td = UI_RENDERER.createEl('td', 'text-center py-8 text-slate-400 italic font-medium');
                    td.colSpan = 6; td.textContent = 'ไม่พบคำแนะนำ';
                    tr.appendChild(td); tbody.appendChild(tr);
                    return;
                }

                const directionLabel = { high: 'High', low: 'Low', any: 'Any' };

                filtered.slice(0, TABLE_RENDER_CAP).forEach(e => {
                    const tr = UI_RENDERER.createEl('tr', 'hover:bg-teal-50/20 border-b border-slate-50 transition-colors align-top');

                    const tdTag = UI_RENDERER.createEl('td', 'py-3 px-6 font-black text-slate-800');
                    // V29.63 FEAT: แสดง machine badge ถ้า entry นี้ผูกไว้เฉพาะเครื่อง (กันสับสนเวลา tagNo ซ้ำกันคนละเครื่อง)
                    const machineBadge = e.machine ? `<span class="ml-2 text-[8px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded font-bold border border-indigo-200">${escapeHtml(e.machine)}</span>` : '';
                    tdTag.innerHTML = `${escapeHtml(e.tagNo)} ${machineBadge} ${e.isCurated ? '<span class="ml-2 text-[8px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold border border-slate-200">จากคู่มือ</span>' : '<span class="ml-2 text-[8px] text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded font-bold border border-teal-200">เพิ่มเอง</span>'}`;
                    tr.appendChild(tdTag);

                    const tdDir = UI_RENDERER.createEl('td', 'py-3 px-6');
                    tdDir.appendChild(UI_RENDERER.createEl('span', 'bg-slate-100 text-slate-600 px-2 rounded-md font-black text-[9px] tracking-widest uppercase', directionLabel[e.direction] || e.direction));
                    tr.appendChild(tdDir);

                    tr.appendChild(UI_RENDERER.createEl('td', 'py-3 px-6 text-slate-600 text-[11px] truncate max-w-[220px]', [e.equipmentName, e.factor].filter(Boolean).join(' — ') || '-'));

                    const sourceText = e.sourceDoc ? `${e.sourceDoc}${e.sourcePage ? ' p.' + e.sourcePage : ''}` : '-';
                    tr.appendChild(UI_RENDERER.createEl('td', 'py-3 px-6 text-slate-500 text-[11px]', sourceText));

                    tr.appendChild(UI_RENDERER.createEl('td', 'py-3 px-6 text-slate-500 text-[11px] truncate max-w-[260px]', e.action || '-'));

                    const tdAct = UI_RENDERER.createEl('td', 'py-3 px-6 text-center');
                    if (e.isCurated) {
                        tdAct.appendChild(UI_RENDERER.createEl('span', 'text-[10px] text-slate-400 italic', 'Read-only'));
                    } else {
                        const btnEdit = UI_RENDERER.createEl('button', 'px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-teal-600 hover:bg-teal-50 shadow-sm transition-all');
                        btnEdit.textContent = 'แก้ไข';
                        btnEdit.onclick = () => APP.openCountermeasureModal(e.id);
                        tdAct.appendChild(btnEdit);
                    }
                    tr.appendChild(tdAct);

                    tbody.appendChild(tr);
                });
                UI_RENDERER.initIcons();
            },


            // แจ้งเตือนแบบไม่บล็อกถ้า Tag+ทิศทางที่เลือกมีคำแนะนำจากคู่มืออยู่แล้ว (คู่มือชนะเสมอ ตามที่ยืนยันไว้)
            updateCountermeasureWarning: () => {
                const tagEl = document.getElementById('cm-edit-tagno');
                const dirEl = document.getElementById('cm-edit-direction');
                const warnEl = document.getElementById('cm-curated-warning');
                if (!tagEl || !dirEl || !warnEl) return;
                const hasCurated = COUNTERMEASURE_AGENT.hasCurated(tagEl.value, dirEl.value);
                warnEl.classList.toggle('hidden', !hasCurated);
            },


            openCountermeasureModal: (id = null) => {
                APP._activeCountermeasureId = id;

                const datalist = document.getElementById('countermeasure-tag-options');
                if (datalist) {
                    while (datalist.firstChild) datalist.removeChild(datalist.firstChild);
                    const distinctTagNos = Array.from(new Set(STATE.get('tags').map(t => t.tagNo))).sort();
                    distinctTagNos.forEach(tagNo => {
                        const opt = document.createElement('option');
                        opt.value = tagNo;
                        datalist.appendChild(opt);
                    });
                }

                const entry = id ? (STATE.get('userCountermeasures') || []).find(e => e.id === id) : null;

                const titleEl = document.getElementById('countermeasure-modal-title');
                if (titleEl) titleEl.innerHTML = `<i data-lucide="lightbulb" class="w-5 h-5 text-teal-500"></i> ${entry ? 'แก้ไขคำแนะนำ' : 'เพิ่มคำแนะนำใหม่'}`;

                const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = (val === null || val === undefined) ? '' : val; };
                setVal('cm-edit-tagno', entry ? entry.tagNo : '');
                setVal('cm-edit-direction', entry ? entry.direction : 'high');
                setVal('cm-edit-machine', entry ? entry.machine : '');
                setVal('cm-edit-equipment', entry ? entry.equipmentName : '');
                setVal('cm-edit-factor', entry ? entry.factor : '');
                setVal('cm-edit-sourcedoc', entry ? entry.sourceDoc : '');
                setVal('cm-edit-sourcepage', entry ? entry.sourcePage : '');
                setVal('cm-edit-pdftagref', entry ? entry.pdfTagRef : '');
                setVal('cm-edit-action', entry ? entry.action : '');

                const actionEl = document.getElementById('cm-edit-action');
                if (actionEl) autoResizeTextarea(actionEl);

                const btnDelete = document.getElementById('btn-delete-countermeasure');
                if (btnDelete) btnDelete.classList.toggle('hidden', !entry);

                APP.updateCountermeasureWarning();
                showModal('countermeasure-modal');
                UI_RENDERER.initIcons();
            },


            closeCountermeasureModal: () => {
                hideModal('countermeasure-modal');
                APP._activeCountermeasureId = null;
            },


            saveCountermeasureEntry: async () => {
                const tagEl = document.getElementById('cm-edit-tagno');
                const dirEl = document.getElementById('cm-edit-direction');
                const machineEl = document.getElementById('cm-edit-machine');
                const equipEl = document.getElementById('cm-edit-equipment');
                const factorEl = document.getElementById('cm-edit-factor');
                const srcDocEl = document.getElementById('cm-edit-sourcedoc');
                const srcPageEl = document.getElementById('cm-edit-sourcepage');
                const pdfRefEl = document.getElementById('cm-edit-pdftagref');
                const actionEl = document.getElementById('cm-edit-action');

                const tagNo = tagEl ? tagEl.value.trim() : '';
                const direction = dirEl ? dirEl.value : 'high';
                const machine = machineEl ? machineEl.value.trim() : '';
                const action = actionEl ? actionEl.value.trim() : '';

                if (!tagNo || !action) {
                    alert('กรุณากรอก Tag No และ Action (คำแนะนำการแก้ไข) ให้ครบก่อนบันทึก');
                    return;
                }

                // V29.63 FIX: รวม machine เข้า id ด้วยถ้าระบุไว้ (กัน tagNo ซ้ำกันคนละเครื่องชนกัน)
                // — ถ้าไม่ระบุ machine, id คงรูปแบบเดิม (tagNo|direction) ให้เข้ากันได้กับ entry เก่า
                const id = machine ? `${tagNo.toUpperCase()}|${direction}|${machine.toUpperCase()}` : `${tagNo.toUpperCase()}|${direction}`;
                const sourcePageV = srcPageEl ? srcPageEl.value.trim() : '';

                const entry = {
                    id,
                    tagNo,
                    direction,
                    machine: machine || null,
                    equipmentName: equipEl ? equipEl.value.trim() || null : null,
                    factor: factorEl ? factorEl.value.trim() || null : null,
                    sourceDoc: srcDocEl ? srcDocEl.value.trim() || null : null,
                    sourcePage: sourcePageV !== '' ? parseInt(sourcePageV, 10) : null,
                    pdfTagRef: pdfRefEl ? pdfRefEl.value.trim() || null : null,
                    action,
                    updatedAt: Date.now()
                };

                try {
                    await STORAGE_ENGINE.saveCountermeasure(entry);

                    // ถ้าแก้ไข entry เดิมแล้วเปลี่ยน Tag/Direction จน id เปลี่ยนไป ต้องลบ entry เก่าทิ้ง กัน record ค้าง
                    const originalId = APP._activeCountermeasureId;
                    const idChanged = originalId && originalId !== id;
                    if (idChanged) {
                        await STORAGE_ENGINE.deleteCountermeasure(originalId);
                    }

                    const newList = await STORAGE_ENGINE.getAll(STORE_COUNTERMEASURES);
                    STATE.set('userCountermeasures', newList);
                    // V29.112 เดิมใช้ force-push (merge:false) เฉพาะตอน id เปลี่ยน (มี delete ของ originalId
                    // แฝงอยู่) กัน mergeAll เอา entry เก่าที่เพิ่งลบกลับมาจากไฟล์กลาง — แต่ merge:false เขียน
                    // ทับไฟล์กลางทั้งก้อนด้วย snapshot เครื่องนี้เฉยๆ เสี่ยงทับข้อมูลใหม่จาก session อื่น
                    // V29.119 FIX: เปลี่ยนมาใช้ reapplyAfterMerge แทน — pull+merge ตามปกติก่อนเสมอ (ได้ข้อมูล
                    // ใหม่จาก session อื่นครบ) แล้วค่อยลบ originalId ซ้ำอีกครั้งหลัง merge ก่อน push
                    APP.pushSharedDb(idChanged
                        ? { merge: true, reapplyAfterMerge: () => STORAGE_ENGINE.deleteCountermeasure(originalId) }
                        : {}); // V29.85 FEAT: fire-and-forget

                    APP.closeCountermeasureModal();
                } catch (error) {
                    console.error("Save Countermeasure Failed: ", error);
                    alert("บันทึกคำแนะนำไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                }
            },


            deleteCountermeasureEntry: async () => {
                const id = APP._activeCountermeasureId;
                if (!id) return;
                if (!confirm('ต้องการลบคำแนะนำนี้ใช่หรือไม่?')) return;

                try {
                    await STORAGE_ENGINE.deleteCountermeasure(id);
                    const newList = await STORAGE_ENGINE.getAll(STORE_COUNTERMEASURES);
                    STATE.set('userCountermeasures', newList);
                    // V29.112 เดิมใช้ force-push (merge:false) เพราะการลบทำให้ id นี้ "ไม่มีใน local" ตรง
                    // เงื่อนไข mergeAll ที่จะ merge กลับเข้ามาจากไฟล์กลางทันที — แต่ merge:false เขียนทับไฟล์
                    // กลางทั้งก้อนด้วย snapshot เครื่องนี้เฉยๆ เสี่ยงทับข้อมูลใหม่จาก session อื่น
                    // V29.119 FIX: เปลี่ยนมาใช้ reapplyAfterMerge แทน — pull+merge ตามปกติก่อนเสมอ แล้วค่อยลบ
                    // id ซ้ำอีกครั้งหลัง merge ก่อน push
                    APP.pushSharedDb({ merge: true, reapplyAfterMerge: () => STORAGE_ENGINE.deleteCountermeasure(id) });

                    APP.closeCountermeasureModal();
                } catch (error) {
                    console.error("Delete Countermeasure Failed: ", error);
                    alert("ลบคำแนะนำไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                }
            },
});
