import { parseNum, classifyDeviation, formatCountermeasureAction } from './shared.js';
import { COUNTERMEASURE_AGENT } from './countermeasure-agent.js';

export const SMART_AGENT = {
            analyze: (record, eMin, eMax, eExact) => {
                const val = parseNum(record.value);
                const direction = classifyDeviation(val, eMin, eMax);

                // V29.92 FEAT: Statistical Deviation / Trend Warning เป็นค่าที่ยังอยู่ใน Min/Max spec
                // (classifyDeviation จะได้ 'deviation' ธรรมดาเสมอ ไม่สื่อความหมายจริง) — branch แยกข้อความ
                // ก่อน แต่ยังคำนวณ direction ไว้เหมือนเดิมเพื่อใช้กับ COUNTERMEASURE_AGENT.find ด้านล่าง
                let status;
                if (record.isStatDeviation === 1) {
                    const zTxt = (record.statZScore !== null && isFinite(record.statZScore)) ? Number(record.statZScore).toFixed(2) : 'N/A';
                    status = `เบี่ยงเบนผิดปกติทางสถิติ (Statistical Deviation, z ≈ ${zTxt}) แม้ยังอยู่ในช่วง Min/Max`;
                } else if (record.isStatTrendWarning === 1) {
                    const reasonTh = (record.trendReason === 'MONOTONIC_RUN_UP' || record.trendReason === 'MONOTONIC_RUN_DOWN')
                        ? 'ค่าขยับต่อเนื่องไปทิศทางเดียวกันหลายครั้งติดต่อกัน (สัญญาณ drift)'
                        : 'มีจุดเบี่ยงเบนปานกลาง (เกิน 2σ) เกิดซ้ำในช่วงสั้นๆ ทางฝั่งเดียวกัน';
                    status = `สัญญาณแนวโน้มเสี่ยง (Trend Warning) — ${reasonTh} ควรเฝ้าระวังก่อนหลุด Spec จริง`;
                } else {
                    const statusMap = {
                        high: "สูงเกินขีดจำกัด (High)",
                        low: "ต่ำกว่าเกณฑ์ควบคุม (Low)",
                        deviation: "เบี่ยงเบนจากค่ามาตรฐาน (Deviation)"
                    };
                    status = statusMap[direction];
                }

                const baseText = `ตรวจพบค่าพารามิเตอร์ ${status} ที่ระดับ ${val} ได้ทำการตรวจสอบความผิดปกติหน้างานและเฝ้าระวังอย่างใกล้ชิดเพื่อป้องกันผลกระทบต่อระบบ`;

                const cm = COUNTERMEASURE_AGENT.find(record.tagNo, direction, record.machine);
                if (!cm) return baseText;

                return `${baseText}\n\nแนวทางแก้ไขจากคู่มือ (${cm.sourceDoc} — ${cm.equipmentName} / ${cm.factor}):\n${formatCountermeasureAction(cm.action)}`;
            }
        };
