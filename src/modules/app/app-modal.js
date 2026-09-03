import { STATE } from '../state.js';
import { STORAGE_ENGINE } from '../storage-engine.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { SMART_AGENT } from '../smart-agent.js';
import { COUNTERMEASURE_AGENT } from '../countermeasure-agent.js';
import { EXCEL_WRITEBACK } from '../excel-writeback.js';
import { escapeHtml, getTagId, parseNum, classifyDeviation, resolveEffectiveLimits, formatLimitText, getMasterMap, showModal, hideModal, autoResizeTextarea, showTransientMessage } from '../shared.js';
import { APP } from './app.js';
/* global lucide */

Object.assign(APP, {

            openActionModal: (recordId) => {
                STATE.set('activeRecordId', recordId);
                const record = STATE.get('records').find(r => r.id === recordId);
                if (!record) return;
                const tagDef = STATE.get('tags').find(t => t.id === getTagId(record));
                const master = STATE.get('masterTags').find(m => m.id === getTagId(record));
                
                const mTagNo = document.getElementById('modal-tag-no');
                if (mTagNo) mTagNo.textContent = record.tagNo;
                const mType = document.getElementById('modal-tag-type');
                if (mType) mType.textContent = record.paramType;
                const mDesc = document.getElementById('modal-tag-desc');
                if (mDesc) mDesc.textContent = (master && master.description) ? master.description : (tagDef?.description || '-');
                const mVal = document.getElementById('modal-value');
                if (mVal) mVal.textContent = record.value;
                const mTime = document.getElementById('modal-time');
                if (mTime) mTime.textContent = `${record.dateStr} ${record.timeStr}`;
                
                const { eMin, eMax, eExact } = resolveEffectiveLimits(tagDef, master);
                const maxMinText = escapeHtml(formatLimitText(eMin, eMax, eExact, 'N/A'));

                const mNorm = document.getElementById('modal-norm-text');
                if (mNorm) mNorm.innerHTML = `${master ? '<i data-lucide="shield-check" class="w-3 h-3 inline text-indigo-500"></i> Master: ' : 'Excel: '}` + maxMinText;

                const aInput = document.getElementById('action-input');
                if (aInput) aInput.value = record.remark || '';

                const aiBadge = document.getElementById('ai-source-badge');
                if (aiBadge) aiBadge.classList.add('hidden');

                // V29.116 FEAT, V29.117 เปลี่ยนให้โชว์เสมอ: Auto-Draft ขึ้นเองอัตโนมัติทุกครั้งที่เปิด modal
                // ไม่ว่า record จะเคยบันทึก remark ไว้แล้วหรือไม่ — ยังต้องกด "ใช้ข้อความนี้" เองอยู่ดีก่อนจะ
                // เขียนทับกล่อง Resolution Remark จริง (human-in-the-loop เดิม ไม่เปลี่ยน)
                APP.renderAutoDraftSuggestion(recordId);

                // V29.71 FEAT: เคลียร์สถานะ sync ค้างจาก record ก่อนหน้า
                const syncStatusEl = document.getElementById('excel-sync-status');
                if (syncStatusEl) syncStatusEl.textContent = '';

                const history = STATE.get('records')
                    .filter(r => r.tagNo === record.tagNo && r.paramType === record.paramType && r.machine === record.machine)
                    .sort((a, b) => a.timestamp - b.timestamp);

                APP.renderChart(history, eMin, eMax, eExact);

                // V29.51 FEAT: ประวัติการแก้ไขก่อนหน้าของ Tag นี้ (ไม่รวม record ปัจจุบัน)
                const pastAnnotations = history
                    .filter(r => r.id !== record.id && r.remark && r.remark.trim())
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 5);

                const pastList = document.getElementById('past-actions-list');
                if (pastList) {
                    while (pastList.firstChild) pastList.removeChild(pastList.firstChild);
                    if (pastAnnotations.length === 0) {
                        const empty = UI_RENDERER.createEl('p', 'text-xs text-slate-400 italic text-center py-3');
                        empty.textContent = 'ยังไม่มีประวัติการแก้ไขก่อนหน้าสำหรับ Tag นี้';
                        pastList.appendChild(empty);
                    } else {
                        pastAnnotations.forEach(r => {
                            const row = UI_RENDERER.createEl('div', 'bg-slate-50 border border-slate-100 rounded-lg p-2.5');
                            const timeEl = UI_RENDERER.createEl('p', 'text-[10px] font-bold text-slate-400 mb-0.5');
                            timeEl.textContent = `${r.dateStr} ${r.timeStr}`;
                            const remarkEl = UI_RENDERER.createEl('p', 'text-xs font-medium text-slate-700');
                            remarkEl.textContent = r.remark;
                            row.appendChild(timeEl);
                            row.appendChild(remarkEl);
                            pastList.appendChild(row);
                        });
                    }
                }

                showModal('action-modal');
                UI_RENDERER.initIcons();
                // V29.56 FIX: ต้องขยาย textarea หลัง showModal เพราะตอน modal ยังซ่อนอยู่ (display:none) scrollHeight จะอ่านค่าไม่ถูกต้อง
                if (aInput) autoResizeTextarea(aInput);
            },


            closeActionModal: () => {
                hideModal('action-modal');
                STATE.set('activeRecordId', null);
            },


            saveAction: async () => {
                const id = STATE.get('activeRecordId');
                if(!id) return;
                const aInput = document.getElementById('action-input');
                const text = aInput ? aInput.value.trim() : '';
                const updates = { remark: text, actionStatus: text ? 'acknowledged' : 'new' };

                try {
                    await STORAGE_ENGINE.updateRecord(id, updates);
                    await APP.loadLocalData();
                    APP.pushSharedDb(); // V29.85 FEAT: fire-and-forget
                } catch (error) {
                    console.error("Save Remark Failed: ", error);
                    alert("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                    return;
                }

                // V29.74 FEAT: sync Resolution Remark กลับไปเป็น Excel cell comment ผ่าน Local Bridge
                // (bridge/excel-bridge.ps1 สั่ง Excel ตัวจริงที่เปิดไฟล์อยู่ให้เขียนแทน — ดูเหตุผลใน
                // src/modules/excel-writeback.js) ความล้มเหลวตรงนี้ต้องไม่ทำให้การบันทึกใน Web App (ข้างบน,
                // สำเร็จไปแล้ว) เสียหายหรือถูกม้วนกลับ จึงแยก try/catch ของตัวเองต่างหาก
                const record = STATE.get('records').find(r => r.id === id);
                let syncStatus = 'no-source-file';
                try {
                    if (record) syncStatus = await EXCEL_WRITEBACK.syncRemarkToExcel(record, text);
                } catch (syncErr) {
                    console.error('Excel sync failed:', syncErr);
                    syncStatus = 'error';
                }

                const SYNC_MESSAGES = {
                    ok: ['✓ บันทึกลง Excel (New Comment) อัตโนมัติแล้ว', 'success'],
                    'no-source-file': ['ℹ ไฟล์นี้ import มาก่อนอัปเดตฟีเจอร์นี้ — import ไฟล์ใหม่อีกครั้งเพื่อ sync กลับ Excel ได้', 'info'],
                    'bridge-offline': ['ℹ ไม่พบ Local Bridge — เปิดโปรแกรม Excel Bridge บนเครื่องนี้ก่อน (ดู bridge/README.md)', 'info'],
                    'no-file-open': ['ℹ ไม่พบไฟล์นี้เปิดอยู่ใน Excel — เปิดไฟล์ต้นฉบับใน Excel ค้างไว้ก่อนแล้วบันทึกใหม่อีกครั้ง', 'info'],
                    conflict: ['⚠ พบ Comment ที่มีคนพิมพ์ไว้ใน Excel cell นี้แล้ว ระบบไม่เขียนทับให้ กรุณาตรวจสอบเอง', 'warning'],
                    error: ['⚠ Sync กลับ Excel ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error']
                };
                const [msg, variant] = SYNC_MESSAGES[syncStatus] || SYNC_MESSAGES.error;
                showTransientMessage('excel-sync-status', msg, variant, 0);

                // V29.74 FIX: ข้อความสถานะ (#excel-sync-status) อยู่ข้างในตัว modal เอง — ถ้าปิด modal
                // ทันทีข้อความจะถูกซ่อนไปด้วยก่อน operator จะทันอ่าน (พี่ A เจอเคสนี้จริงตอนทดสอบ) ดังนั้น
                // ปิดอัตโนมัติเฉพาะกรณีสำเร็จแบบไม่มีอะไรต้องอ่านต่อ ('ok') โดยหน่วงเวลาสั้นๆ ให้เห็น
                // ข้อความติ๊กถูกก่อน — ทุกสถานะอื่น (ต้องเปิด bridge/ไฟล์ Excel, conflict, error) ปล่อยให้
                // operator อ่านแล้วปิดเองเมื่อพร้อม
                if (syncStatus === 'ok') {
                    setTimeout(() => {
                        // เผื่อ operator ปิด modal เองหรือเปิด record อื่นไปแล้วภายใน 1.2 วินาทีนี้
                        if (STATE.get('activeRecordId') === id) APP.closeActionModal();
                    }, 1200);
                }
            },


            clearAction: async () => {
                const id = STATE.get('activeRecordId');
                if(!id) return;
                try {
                    await STORAGE_ENGINE.updateRecord(id, { remark: '', actionStatus: 'new' });
                    await APP.loadLocalData();
                    APP.pushSharedDb(); // V29.85 FEAT: fire-and-forget
                    APP.closeActionModal();
                } catch (error) {
                    console.error("Clear Remark Failed: ", error);
                    alert("ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                }
            },


            // V29.116 FEAT: คำนวณและโชว์คำแนะนำใน #autodraft-suggestion (ไม่แตะกล่อง Resolution Remark จริง)
            // ใช้ทั้งตอนเปิด modal อัตโนมัติ (openActionModal) และตอนกดปุ่ม "Auto-Draft" เดิมเพื่อ regenerate
            renderAutoDraftSuggestion: (recordId) => {
                const box = document.getElementById('autodraft-suggestion');
                const textEl = document.getElementById('autodraft-text');
                const badge = document.getElementById('autodraft-source-badge');
                if (!recordId || !box || !textEl) return;

                const record = STATE.get('records').find(r => r.id === recordId);
                if (!record) return;
                const tags = STATE.get('tags');
                const masterTagsMap = getMasterMap();

                const tId = getTagId(record);
                const tDef = tags.find(t => t.id === tId);
                const master = masterTagsMap.get(tId);
                const { eMin, eMax, eExact } = resolveEffectiveLimits(tDef, master);

                const val = parseNum(record.value);
                const direction = classifyDeviation(val, eMin, eMax);
                const cm = COUNTERMEASURE_AGENT.find(record.tagNo, direction, record.machine);
                if (badge) {
                    if (cm) { badge.textContent = `จากคู่มือ ${cm.sourceDoc}`; badge.classList.remove('hidden'); }
                    else { badge.classList.add('hidden'); }
                }

                textEl.textContent = SMART_AGENT.analyze(record, eMin, eMax, eExact);
                box.classList.remove('hidden');
                UI_RENDERER.initIcons();
            },


            // V29.116 FEAT: "ใช้ข้อความนี้" — copy คำแนะนำเข้ากล่อง Resolution Remark จริง ต้องกดเองเสมอ
            // (human-in-the-loop เพราะข้อความนี้จะกลายเป็นส่วนหนึ่งของบันทึกกะจริงและ sync กลับ Excel comment)
            applyAutoDraft: () => {
                const textEl = document.getElementById('autodraft-text');
                const input = document.getElementById('action-input');
                const box = document.getElementById('autodraft-suggestion');
                const aiBadge = document.getElementById('ai-source-badge');
                const sourceBadge = document.getElementById('autodraft-source-badge');
                if (!textEl || !input) return;

                input.value = textEl.textContent;
                autoResizeTextarea(input);
                if (aiBadge) {
                    if (sourceBadge && !sourceBadge.classList.contains('hidden')) {
                        aiBadge.textContent = sourceBadge.textContent;
                        aiBadge.classList.remove('hidden');
                    } else {
                        aiBadge.classList.add('hidden');
                    }
                }
                if (box) box.classList.add('hidden');
            },


            dismissAutoDraft: () => {
                const box = document.getElementById('autodraft-suggestion');
                if (box) box.classList.add('hidden');
            },


            triggerSmartAssist: () => {
                const id = STATE.get('activeRecordId');
                if (!id) return;
                APP.renderAutoDraftSuggestion(id);
            },
});
