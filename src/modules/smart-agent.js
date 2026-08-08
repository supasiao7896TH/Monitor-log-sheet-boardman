import { parseNum, classifyDeviation, formatCountermeasureAction } from './shared.js';
import { COUNTERMEASURE_AGENT } from './countermeasure-agent.js';

export const SMART_AGENT = {
            analyze: (record, eMin, eMax, eExact) => {
                const val = parseNum(record.value);
                const direction = classifyDeviation(val, eMin, eMax);
                const statusMap = {
                    high: "สูงเกินขีดจำกัด (High)",
                    low: "ต่ำกว่าเกณฑ์ควบคุม (Low)",
                    deviation: "เบี่ยงเบนจากค่ามาตรฐาน (Deviation)"
                };
                const status = statusMap[direction];

                const baseText = `ตรวจพบค่าพารามิเตอร์ ${status} ที่ระดับ ${val} ได้ทำการตรวจสอบความผิดปกติหน้างานและเฝ้าระวังอย่างใกล้ชิดเพื่อป้องกันผลกระทบต่อระบบ`;

                const cm = COUNTERMEASURE_AGENT.find(record.tagNo, direction, record.machine);
                if (!cm) return baseText;

                return `${baseText}\n\nแนวทางแก้ไขจากคู่มือ (${cm.sourceDoc} — ${cm.equipmentName} / ${cm.factor}):\n${formatCountermeasureAction(cm.action)}`;
            }
        };
