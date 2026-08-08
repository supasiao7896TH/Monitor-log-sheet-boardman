import { STATE } from '../state.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { escapeHtml, getTagId, resolveEffectiveLimits, getMasterMap, getTagMap, showModal, hideModal } from '../shared.js';
import { APP } from './app.js';
/* global lucide, html2canvas, jspdf */

Object.assign(APP, {

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
                const selectedIds = STATE.get('selectedForReport');
                const records = STATE.get('records');
                const mTagsMap = getMasterMap();
                const tagMap = getTagMap(); // V29.52 PERF: build once instead of tags.find per selected record
                const container = document.getElementById('infographic-cards-container');
                if (!container) return;

                while (container.firstChild) container.removeChild(container.firstChild);

                const selectedRecords = records.filter(r => selectedIds.includes(r.id));
                
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

                selectedRecords.forEach(r => {
                    const tId = getTagId(r);
                    const tagDef = tagMap.get(tId) || {};
                    const master = mTagsMap.get(tId);

                    const { eMin, eMax, eExact } = resolveEffectiveLimits(tagDef, master);
                    const eDesc = (master && master.description) ? master.description : (tagDef.description || '-');
                    
                    let normText = "";
                    if (eMin !== null && eMax !== null) normText = `${eMin} - ${eMax}`;
                    else if (eMin !== null) normText = `> ${eMin}`;
                    else if (eMax !== null) normText = `< ${eMax}`;
                    else if (eExact !== null) normText = `${eExact}`;
                    else normText = 'N/A';

                    const isAbnormal = r.isAbnormal;
                    const valColor = isAbnormal ? 'text-red-600' : 'text-emerald-600';
                    const iconColor = isAbnormal ? 'text-red-500' : 'text-emerald-500';
                    const iconName = isAbnormal ? 'alert-triangle' : 'check-circle-2';

                    let cardHTML = `
                        <div class="info-card p-5 rounded-2xl flex flex-col relative overflow-hidden group">
                            <div class="absolute left-0 top-0 bottom-0 w-1.5 ${isAbnormal ? 'bg-red-500' : 'bg-emerald-500'}"></div>

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
                    container.insertAdjacentHTML('beforeend', cardHTML);
                });

                UI_RENDERER.initIcons();
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
