import { STATE } from '../state.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { escapeHtml, getTagId, resolveEffectiveLimits, getMasterMap, getTagMap, showModal, hideModal } from '../shared.js';
import { APP } from './app.js';
/* global lucide, html2canvas, jspdf */

// V29.76 FEAT: toggle ระหว่าง Card (เดิม, เน้นภาพสำหรับแชร์ผู้บริหาร) กับ Table (ใหม่, เน้นความหนาแน่น
// ของข้อมูลเวลามี Tag ผิดปกติเยอะ) — เก็บนอก STATE เพราะเป็นแค่ preference ของ modal นี้ตอนเปิดอยู่
// ไม่ต้อง persist ข้าม session และไม่ต้องผ่าน STATE.set/_deriveAbnormal ที่หนักเกินจำเป็น
let reportLayoutMode = 'card';

Object.assign(APP, {

            // ดึงชุดข้อมูลเดียวกับที่ openReportModal ใช้ — แยกออกมาให้ toggle layout เรียกซ้ำได้โดยไม่ปิด/เปิด modal ใหม่
            getReportData: () => {
                const selectedIds = STATE.get('selectedForReport');
                const records = STATE.get('records');
                const mTagsMap = getMasterMap();
                const tagMap = getTagMap();
                const selectedRecords = records.filter(r => selectedIds.includes(r.id));
                return { selectedRecords, tagMap, mTagsMap };
            },


            buildInfographicCardHTML: (r, tagDef, master) => {
                const { eMin, eMax, eExact } = resolveEffectiveLimits(tagDef, master);
                const eDesc = (master && master.description) ? master.description : (tagDef.description || '-');

                let normText = "";
                if (eMin !== null && eMax !== null) normText = `${eMin} - ${eMax}`;
                else if (eMin !== null) normText = `> ${eMin}`;
                else if (eMax !== null) normText = `< ${eMax}`;
                else if (eExact !== null) normText = `${eExact}`;
                else normText = 'N/A';

                const isAbnormal = r.isAbnormal;
                const isStatDev = r.isStatDeviation === 1; // V29.84 FEAT — mutually exclusive กับ isAbnormal
                const isTrendWarn = r.isStatTrendWarning === 1; // V29.92 FEAT — เบากว่า isStatDev
                const valColor = isAbnormal ? 'text-red-600' : (isStatDev ? 'text-purple-600' : (isTrendWarn ? 'text-cyan-600' : 'text-emerald-600'));
                const iconColor = isAbnormal ? 'text-red-500' : (isStatDev ? 'text-purple-500' : (isTrendWarn ? 'text-cyan-500' : 'text-emerald-500'));
                const iconName = isAbnormal ? 'alert-triangle' : (isStatDev ? 'activity' : (isTrendWarn ? 'trending-up' : 'check-circle-2'));
                const accentBg = isAbnormal ? 'bg-red-500' : (isStatDev ? 'bg-purple-500' : (isTrendWarn ? 'bg-cyan-500' : 'bg-emerald-500'));

                return `
                        <div class="info-card p-5 rounded-2xl flex flex-col relative overflow-hidden group">
                            <div class="absolute left-0 top-0 bottom-0 w-1.5 ${accentBg}"></div>

                            <div class="flex justify-between items-start mb-1 pl-2">
                                <div>
                                    <h4 class="font-black text-slate-800 text-lg tracking-wide">${escapeHtml(r.tagNo)} <span class="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] ml-1 uppercase">${escapeHtml(r.paramType)}</span></h4>
                                </div>
                                <span class="${iconColor} bg-white p-1.5 rounded-lg border border-slate-200">
                                    <i data-lucide="${iconName}" class="w-4 h-4"></i>
                                </span>
                            </div>

                            <p class="text-[10px] text-slate-500 font-medium mb-4 pl-2 pr-2">${escapeHtml(eDesc)}</p>

                            <div class="flex justify-between items-end mb-4 pl-2">
                                <div class="flex flex-col">
                                    <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Norm: ${normText}</span>
                                    <span class="text-3xl font-black ${valColor} leading-none tracking-tighter">${escapeHtml(String(r.value))}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Time</span>
                                    <span class="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">${escapeHtml(r.timeStr)}</span>
                                </div>
                            </div>

                            ${r.remark ? `
                            <div class="mt-auto pt-3 border-t border-slate-100 pl-2">
                                <span class="text-[8px] font-black uppercase text-brand-600 tracking-widest block mb-1"><i data-lucide="message-square" class="w-3 h-3 inline"></i> Action Remark</span>
                                <p class="text-xs text-slate-600 leading-snug border-l-2 border-brand-500 pl-2 py-0.5">${escapeHtml(r.remark)}</p>
                            </div>
                            ` : `
                            <div class="mt-auto pt-3 border-t border-slate-100 pl-2">
                                <span class="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-1"><i data-lucide="message-square" class="w-3 h-3 inline"></i> Action Remark</span>
                                <p class="text-xs text-slate-400 italic leading-snug pl-2 py-0.5">No action recorded.</p>
                            </div>
                            `}
                        </div>
                    `;
            },


            buildInfographicTableRowHTML: (r, tagDef, master) => {
                const { eMin, eMax, eExact } = resolveEffectiveLimits(tagDef, master);
                const eDesc = (master && master.description) ? master.description : (tagDef.description || '-');

                let normText = "";
                if (eMin !== null && eMax !== null) normText = `${eMin} - ${eMax}`;
                else if (eMin !== null) normText = `> ${eMin}`;
                else if (eMax !== null) normText = `< ${eMax}`;
                else if (eExact !== null) normText = `${eExact}`;
                else normText = 'N/A';

                const isAbnormal = r.isAbnormal;
                const isStatDev = r.isStatDeviation === 1; // V29.84 FEAT — mutually exclusive กับ isAbnormal
                const isTrendWarn = r.isStatTrendWarning === 1; // V29.92 FEAT — เบากว่า isStatDev
                const valColor = isAbnormal ? 'text-red-600' : (isStatDev ? 'text-purple-600' : (isTrendWarn ? 'text-cyan-600' : 'text-emerald-600'));
                const rowBg = isAbnormal ? 'bg-red-50/60' : (isStatDev ? 'bg-purple-50/60' : (isTrendWarn ? 'bg-cyan-50/60' : ''));

                return `
                        <tr class="${rowBg} border-b border-slate-200 last:border-b-0">
                            <td class="py-2.5 px-3 align-top whitespace-nowrap">
                                <div class="font-black text-slate-800 text-sm">${escapeHtml(r.tagNo)}</div>
                                <span class="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] uppercase">${escapeHtml(r.paramType)}</span>
                            </td>
                            <td class="py-2.5 px-3 align-top text-xs text-slate-600">${escapeHtml(eDesc)}</td>
                            <td class="py-2.5 px-3 align-top text-[10px] text-slate-500 font-bold whitespace-nowrap">${escapeHtml(normText)}</td>
                            <td class="py-2.5 px-3 align-top font-black ${valColor} text-base whitespace-nowrap">${escapeHtml(String(r.value))}</td>
                            <td class="py-2.5 px-3 align-top text-xs font-bold text-slate-600 whitespace-nowrap">${escapeHtml(r.timeStr)}</td>
                            <td class="py-2.5 px-3 align-top text-xs text-slate-600">${r.remark ? escapeHtml(r.remark) : '<span class="text-slate-400 italic">No action recorded.</span>'}</td>
                        </tr>
                    `;
            },


            updateLayoutToggleButtons: () => {
                const btnCard = document.getElementById('btn-layout-card');
                const btnTable = document.getElementById('btn-layout-table');
                const activeCls = ['bg-white', 'shadow-sm', 'text-brand-600'];
                const inactiveCls = ['text-slate-500'];
                if (btnCard) {
                    btnCard.classList.remove(...activeCls, ...inactiveCls);
                    btnCard.classList.add(...(reportLayoutMode === 'card' ? activeCls : inactiveCls));
                }
                if (btnTable) {
                    btnTable.classList.remove(...activeCls, ...inactiveCls);
                    btnTable.classList.add(...(reportLayoutMode === 'table' ? activeCls : inactiveCls));
                }
            },


            // สลับ Layout ของ Live Preview ระหว่าง Card/Table โดยไม่ปิด modal — re-render แค่ส่วน records,
            // ไม่แตะ header/date/count ที่ตั้งไว้แล้วตอนเปิด modal
            setInfographicLayout: (mode) => {
                if (mode !== 'card' && mode !== 'table') return;
                reportLayoutMode = mode;
                APP.updateLayoutToggleButtons();

                const { selectedRecords, tagMap, mTagsMap } = APP.getReportData();
                APP.renderInfographicRecords(selectedRecords, tagMap, mTagsMap);
            },


            renderInfographicRecords: (selectedRecords, tagMap, mTagsMap) => {
                const container = document.getElementById('infographic-cards-container');
                if (!container) return;
                while (container.firstChild) container.removeChild(container.firstChild);

                if (reportLayoutMode === 'table') {
                    container.className = 'mb-6';
                    const rowsHTML = selectedRecords.map(r => {
                        const tId = getTagId(r);
                        const tagDef = tagMap.get(tId) || {};
                        const master = mTagsMap.get(tId);
                        return APP.buildInfographicTableRowHTML(r, tagDef, master);
                    }).join('');

                    const tableHTML = `
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-slate-800 text-white">
                                    <th class="py-2.5 px-3 text-left text-[9px] font-black uppercase tracking-widest">Tag</th>
                                    <th class="py-2.5 px-3 text-left text-[9px] font-black uppercase tracking-widest">Description</th>
                                    <th class="py-2.5 px-3 text-left text-[9px] font-black uppercase tracking-widest">Norm</th>
                                    <th class="py-2.5 px-3 text-left text-[9px] font-black uppercase tracking-widest">Value</th>
                                    <th class="py-2.5 px-3 text-left text-[9px] font-black uppercase tracking-widest">Time</th>
                                    <th class="py-2.5 px-3 text-left text-[9px] font-black uppercase tracking-widest">Action Remark</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white">${rowsHTML}</tbody>
                        </table>
                    `;
                    container.insertAdjacentHTML('beforeend', tableHTML);
                } else {
                    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6';
                    selectedRecords.forEach(r => {
                        const tId = getTagId(r);
                        const tagDef = tagMap.get(tId) || {};
                        const master = mTagsMap.get(tId);
                        container.insertAdjacentHTML('beforeend', APP.buildInfographicCardHTML(r, tagDef, master));
                    });
                }

                UI_RENDERER.initIcons();
            },


            updateInfographicLive: () => {
                const rs = document.getElementById('report-shift');
                const rr = document.getElementById('report-reporter');
                const rh = document.getElementById('report-handover');
                
                const shift = rs ? rs.value : '';
                const reporter = rr ? rr.value || '-' : '-';
                const handover = rh ? rh.value || '-' : '-';
                
                const iShift = document.getElementById('info-shift-text');
                const iOp = document.getElementById('info-operator');
                const iHand = document.getElementById('info-handover');
                
                if (iShift) iShift.textContent = shift;
                if (iOp) iOp.textContent = reporter;
                if (iHand) iHand.textContent = handover;
            },


            openReportModal: () => {
                const { selectedRecords, tagMap, mTagsMap } = APP.getReportData();

                const idate = document.getElementById('info-date');
                if (idate) {
                    if (selectedRecords.length > 0) {
                        idate.textContent = selectedRecords[0].dateStr;
                    } else {
                        idate.textContent = new Date().toLocaleDateString('en-GB');
                    }
                }

                const icnt = document.getElementById('info-abn-count');
                if (icnt) icnt.textContent = selectedRecords.length;

                APP.updateLayoutToggleButtons();
                APP.renderInfographicRecords(selectedRecords, tagMap, mTagsMap);
                APP.updateInfographicLive();
                showModal('report-modal');
            },


            closeReportModal: () => {
                hideModal('report-modal');
            },


            // V29.51: rasterize helper shared by JPG and PDF export (was inlined only in exportInfographicImage before)
            renderInfographicCanvas: () => {
                const targetElement = document.getElementById('infographic-container');
                return html2canvas(targetElement, {
                    scale: 2,
                    backgroundColor: '#f8fafc',
                    logging: false,
                    useCORS: true
                });
            },


            getInfographicDateStr: () => {
                const idate = document.getElementById('info-date');
                return idate ? idate.textContent.replace(/\//g, '-') : 'Report';
            },


            exportInfographicImage: async () => {
                const btn = document.getElementById('btn-export-image');
                if (!btn) return;
                const originalHtml = btn.innerHTML;

                btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Generating...';
                btn.disabled = true;
                if (window.lucide) window.lucide.createIcons();

                try {
                    const canvas = await APP.renderInfographicCanvas();
                    const image = canvas.toDataURL("image/jpeg", 0.95);

                    const link = document.createElement('a');
                    link.href = image;
                    link.download = `Shift_Report_Infographic_${APP.getInfographicDateStr()}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // V29.91 FEAT: copy PNG (broadest ClipboardItem support) alongside the JPG
                    // download so operators can Ctrl+V straight into Excel without opening the file
                    let clipboardCopied = false;
                    if (navigator.clipboard && window.ClipboardItem) {
                        try {
                            const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                            if (pngBlob) {
                                await navigator.clipboard.write([
                                    new ClipboardItem({ 'image/png': pngBlob })
                                ]);
                                clipboardCopied = true;
                            }
                        } catch (clipErr) {
                            console.warn('Clipboard copy failed:', clipErr);
                        }
                    }

                    alert(clipboardCopied
                        ? 'บันทึกรูปภาพเรียบร้อย และคัดลอกรูปไปยัง Clipboard แล้ว\nไปที่ Excel แล้วกด Ctrl+V หรือคลิกขวา > Paste วางรูปได้เลยค่ะ'
                        : 'บันทึกรูปภาพเรียบร้อย (เบราว์เซอร์นี้ไม่รองรับการคัดลอกรูปภาพไปยัง Clipboard โดยอัตโนมัติ — เปิดไฟล์ที่ดาวน์โหลดแล้วคัดลอกรูปแทนได้ค่ะ)');

                    APP.closeReportModal();
                    STATE.set('selectedForReport', []);
                } catch (error) {
                    console.error("Image Export Failed: ", error);
                    alert("เกิดข้อผิดพลาดในการสร้างรูปภาพ กรุณาลองใหม่อีกครั้ง");
                } finally {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            },


            // V29.51 FEAT: Export Infographic Report เป็น PDF (ใช้ canvas เดียวกับ JPG export)
            exportInfographicPDF: async () => {
                const btn = document.getElementById('btn-export-pdf');
                if (!btn) return;
                const originalHtml = btn.innerHTML;

                btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Generating...';
                btn.disabled = true;
                if (window.lucide) window.lucide.createIcons();

                try {
                    const canvas = await APP.renderInfographicCanvas();
                    const image = canvas.toDataURL("image/png", 1.0);

                    const { jsPDF } = window.jspdf;
                    const orientation = canvas.width >= canvas.height ? 'l' : 'p';
                    const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
                    pdf.addImage(image, 'PNG', 0, 0, canvas.width, canvas.height);
                    pdf.save(`Shift_Report_Infographic_${APP.getInfographicDateStr()}.pdf`);

                    APP.closeReportModal();
                    STATE.set('selectedForReport', []);
                } catch (error) {
                    console.error("PDF Export Failed: ", error);
                    alert("เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง");
                } finally {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            },
});
