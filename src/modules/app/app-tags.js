import { STATE } from '../state.js';
import { UI_RENDERER } from '../ui-renderer.js';
import { resolveEffectiveLimits, formatLimitText, getMasterMap, TABLE_RENDER_CAP } from '../shared.js';
import { APP } from './app.js';

Object.assign(APP, {

            renderTagTable: (filterQuery = '') => {
                const tbody = document.getElementById('tag-table-body');
                if (!tbody) return;

                const tags = STATE.get('tags');
                const masterTagsMap = getMasterMap();

                const countDisplay = document.getElementById('tag-count-display');
                if (countDisplay) countDisplay.textContent = tags.length;
                
                while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

                const q = filterQuery.toLowerCase();
                const filtered = tags.filter(t => t.tagNo.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));

                if(filtered.length === 0) {
                    const tr = UI_RENDERER.createEl('tr');
                    const td = UI_RENDERER.createEl('td', 'text-center py-8 text-slate-400 italic font-medium');
                    td.colSpan = 6; td.textContent = 'ไม่พบข้อมูล Tag';
                    tr.appendChild(td); tbody.appendChild(tr);
                    return;
                }

                filtered.slice(0, TABLE_RENDER_CAP).forEach(t => {
                    const master = masterTagsMap.get(t.id);
                    const { eMin, eMax, eExact } = resolveEffectiveLimits(t, master);
                    const eDesc = (master && master.description) ? master.description : t.description;

                    const tr = UI_RENDERER.createEl('tr', 'hover:bg-slate-50 border-b border-slate-50 transition-colors');
                    tr.appendChild(UI_RENDERER.createEl('td', 'py-3 px-6 text-slate-500 font-bold uppercase tracking-tighter', t.machine));
                    
                    const tdTag = UI_RENDERER.createEl('td', 'py-3 px-6 font-black text-slate-800 flex items-center gap-2');
                    tdTag.textContent = t.tagNo;
                    if(master) tdTag.appendChild(UI_RENDERER.createEl('span', 'w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm'));
                    tr.appendChild(tdTag);
                    
                    const tdType = UI_RENDERER.createEl('td', 'py-3 px-6');
                    tdType.appendChild(UI_RENDERER.createEl('span', 'bg-slate-100 text-slate-600 px-2 rounded-md font-black text-[9px] tracking-widest uppercase', t.paramType));
                    tr.appendChild(tdType);

                    tr.appendChild(UI_RENDERER.createEl('td', 'py-3 px-6 text-slate-600 text-[11px] truncate max-w-xs', eDesc || '-'));
                    
                    const tdNorm = UI_RENDERER.createEl('td', 'py-3 px-6 text-center');
                    tdNorm.appendChild(UI_RENDERER.createEl('span', 'px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] font-black text-slate-500 uppercase', t.normalText || '-'));
                    tr.appendChild(tdNorm);

                    const maxMinText = formatLimitText(eMin, eMax, eExact, '-');
                    const tdLim = UI_RENDERER.createEl('td', `py-3 px-6 text-center font-bold text-[11px] ${master ? 'text-indigo-600' : 'text-red-500'}`);
                    tdLim.textContent = maxMinText;
                    tr.appendChild(tdLim);
                    
                    tbody.appendChild(tr);
                });
            },
});
