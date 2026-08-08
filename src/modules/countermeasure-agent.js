import { COUNTERMEASURE_DB } from './countermeasure-db.js';
import { STATE } from './state.js';

export const COUNTERMEASURE_AGENT = (() => {
            const index = new Map();
            COUNTERMEASURE_DB.forEach(e => index.set(`${e.tagNo.trim().toUpperCase()}|${e.direction}`, e));
            return {
                find: (tagNo, direction, machine = null) => {
                    if (!tagNo || direction === 'deviation') return null;
                    const key = String(tagNo).trim().toUpperCase();
                    // V29.58 FEAT: คู่มือ MPS เดิม (hardcode) มาก่อนเสมอ — คำแนะนำที่ผู้ใช้เพิ่มเองใช้เป็น fallback
                    // เฉพาะตอนที่ Tag+ทิศทางนี้ไม่มีอยู่ในคู่มือเดิม ไม่ให้ทับของเดิมเด็ดขาด
                    // (คู่มือ MPS ไม่มีข้อมูล machine ต่อรายการ จึงยังคง match แค่ tagNo+direction เหมือนเดิม)
                    const curated = index.get(`${key}|${direction}`) || index.get(`${key}|any`);
                    if (curated) return curated;
                    // V29.63 FIX: entry ที่ผู้ใช้ระบุ machine ไว้ ต้อง match เฉพาะเครื่องนั้น กัน tagNo ซ้ำกันคนละ
                    // เครื่อง/train แล้วได้คำแนะนำผิดตัว — entry ที่ไม่ได้ระบุ machine (ของเดิมก่อน fix นี้) ยังคง
                    // ใช้ได้กับทุกเครื่องเหมือนเดิม (fallback)
                    const mKey = machine ? String(machine).trim().toUpperCase() : null;
                    const machineMap = new Map();
                    const anyMachineMap = new Map();
                    (STATE.get('userCountermeasures') || []).forEach(e => {
                        const k = `${e.tagNo.trim().toUpperCase()}|${e.direction}`;
                        if (e.machine) machineMap.set(`${k}|${String(e.machine).trim().toUpperCase()}`, e);
                        else anyMachineMap.set(k, e);
                    });
                    if (mKey) {
                        const machineSpecific = machineMap.get(`${key}|${direction}|${mKey}`) || machineMap.get(`${key}|any|${mKey}`);
                        if (machineSpecific) return machineSpecific;
                    }
                    return anyMachineMap.get(`${key}|${direction}`) || anyMachineMap.get(`${key}|any`) || null;
                },
                // V29.58 FEAT: เช็คว่า Tag+ทิศทางนี้มีคำแนะนำจากคู่มือ (hardcode) อยู่แล้วหรือไม่ — ใช้เตือนในฟอร์มเพิ่มคำแนะนำเอง
                hasCurated: (tagNo, direction) => {
                    if (!tagNo) return false;
                    const key = String(tagNo).trim().toUpperCase();
                    return index.has(`${key}|${direction}`) || index.has(`${key}|any`);
                }
            };
        })();
