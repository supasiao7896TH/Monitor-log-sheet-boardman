import { describe, it, expect } from 'vitest';
import { getCanonicalTimesStatus, computeCausalStatDeviation, dateStrToKey, isDateInRange } from '../src/modules/shared.js';

function rec(dateStr, timeStr) { return { dateStr, timeStr }; }

// เวลาเปรียบเทียบต้องสร้างผ่าน component constructor (new Date(y, m0, d, hh, mm)) เท่านั้น ไม่ใช้ ISO string —
// getHours()/getDate() เป็น local-time getter ทำให้ ISO string ที่ไม่มี offset ตีความไม่ตรงกันข้าม engine/timezone
function at(hh, mm) { return new Date(2026, 7, 11, hh, mm); } // เดือน 0-indexed: 7 = สิงหาคม

describe('getCanonicalTimesStatus (V29.78 FEAT)', () => {
    it('reports incomplete with all 4 times missing when there are no records', () => {
        const status = getCanonicalTimesStatus([]);
        expect(status).toEqual({ dateStr: null, missingTimes: ['03:00', '09:00', '15:00', '21:00'], isComplete: false });
    });

    it('is incomplete when only some canonical times are present for the latest date', () => {
        const status = getCanonicalTimesStatus([
            rec('11/08/2026', '03:00'),
            rec('11/08/2026', '09:00'),
        ], at(10, 0));
        expect(status.dateStr).toBe('11/08/2026');
        expect(status.isComplete).toBe(false);
        expect(status.missingTimes).toEqual(['15:00', '21:00']);
    });

    it('is complete once all 4 canonical times are present for the latest date', () => {
        const status = getCanonicalTimesStatus([
            rec('11/08/2026', '03:00'),
            rec('11/08/2026', '09:00'),
            rec('11/08/2026', '15:00'),
            rec('11/08/2026', '21:00'),
        ], at(21, 30));
        expect(status.isComplete).toBe(true);
        expect(status.missingTimes).toEqual([]);
    });

    it('only evaluates the most recent date, ignoring earlier days already-complete or not', () => {
        const status = getCanonicalTimesStatus([
            rec('10/08/2026', '03:00'),
            rec('10/08/2026', '09:00'),
            rec('10/08/2026', '15:00'),
            rec('10/08/2026', '21:00'),
            rec('11/08/2026', '03:00'), // only the newer day is incomplete
        ], at(10, 0));
        expect(status.dateStr).toBe('11/08/2026');
        expect(status.isComplete).toBe(false);
        expect(status.missingTimes).toEqual(['09:00', '15:00', '21:00']);
    });

    it('is unaffected by extra non-canonical times present alongside the 4 canonical ones', () => {
        const status = getCanonicalTimesStatus([
            rec('11/08/2026', '03:00'),
            rec('11/08/2026', '09:00'),
            rec('11/08/2026', '15:00'),
            rec('11/08/2026', '21:00'),
            rec('11/08/2026', '12:00'), // ad-hoc manual reading, not one of the 4
        ], at(21, 5));
        expect(status.isComplete).toBe(true);
    });

    // V29.82 FIX: ป้องกัน record ของรอบเวลาที่ "ยังไม่มาถึงจริง" (เช่น cell ค้างค่า 0/ค่าเก่าก่อน PI
    // Datalink recalculate) ไม่ให้ถูกนับว่า "มาแล้ว" ก่อนนาฬิกาเครื่องถึงเวลานั้นจริง
    describe('V29.82 FIX: a canonical time is never counted as present before it has actually occurred', () => {
        it('reproduces the reported bug: a premature 21:00 record must not count before 21:00 has occurred', () => {
            const records = [
                rec('11/08/2026', '03:00'),
                rec('11/08/2026', '09:00'),
                rec('11/08/2026', '15:00'),
                rec('11/08/2026', '21:00'), // premature — e.g. a stale/placeholder 0 written before the real 21:00 refresh
            ];
            const status = getCanonicalTimesStatus(records, at(17, 0)); // real time is only 17:00
            expect(status.missingTimes).toEqual(['21:00']);
            expect(status.isComplete).toBe(false);
        });

        it('the same records become complete once the clock actually reaches 21:00 — no new record needed', () => {
            const records = [
                rec('11/08/2026', '03:00'),
                rec('11/08/2026', '09:00'),
                rec('11/08/2026', '15:00'),
                rec('11/08/2026', '21:00'),
            ];
            const status = getCanonicalTimesStatus(records, at(21, 0));
            expect(status.isComplete).toBe(true);
            expect(status.missingTimes).toEqual([]);
        });

        it('past dates are never time-gated — all 4 present always counts as complete regardless of the current clock time', () => {
            const records = [
                rec('10/08/2026', '03:00'),
                rec('10/08/2026', '09:00'),
                rec('10/08/2026', '15:00'),
                rec('10/08/2026', '21:00'),
            ];
            const status = getCanonicalTimesStatus(records, at(5, 0)); // "now" is the 11th, well before any of the 11th's times — but data is from the 10th
            expect(status.isComplete).toBe(true);
        });

        it('a latest date that is in the future relative to the clock never counts as complete, even with all 4 times present', () => {
            const records = [
                rec('12/08/2026', '03:00'),
                rec('12/08/2026', '09:00'),
                rec('12/08/2026', '15:00'),
                rec('12/08/2026', '21:00'),
            ];
            const status = getCanonicalTimesStatus(records, at(12, 0)); // "now" is still the 11th
            expect(status.isComplete).toBe(false);
            expect(status.missingTimes).toEqual(['03:00', '09:00', '15:00', '21:00']);
        });
    });
});

function s(value, isBaselineEligible = true) { return { value, isBaselineEligible }; }

describe('computeCausalStatDeviation (V29.84 FEAT)', () => {
    it('never flags anything before minSamples eligible samples have accumulated (cold-start guard)', () => {
        // ค่าที่ 3 (9999) ต่างจากสองค่าแรกมหาศาล แต่ยังไม่มี baseline พอ (minSamples=3) ต้องไม่ flag
        const results = computeCausalStatDeviation([s(10), s(20), s(9999)], { minSamples: 3 });
        results.forEach(r => {
            expect(r.isStatDeviation).toBe(0);
            expect(r.zScore).toBeNull();
        });
    });

    it('flags a value that drifts far from a tight baseline (TI-2301 clogging scenario)', () => {
        // Tag จริงสวิงแคบมาก 253.4-254.1 — ค่า 238.7 ยังอยู่ใน hard-limit spec ทั่วไป (เช่น 220-262)
        // แต่ผิดปกติมากเทียบกับ baseline จริงของตัวเอง
        const baseline = [253.7, 253.9, 253.8, 254.0, 253.6, 253.9].map(v => s(v));
        const results = computeCausalStatDeviation([...baseline, s(238.7)], { minSamples: 5 });
        expect(results[results.length - 1].isStatDeviation).toBe(1);
        expect(results[results.length - 1].zScore).toBeLessThan(-3);
    });

    it('is causal / leave-one-out: a later sample never changes the flag decided for an earlier one', () => {
        const withoutFuture = computeCausalStatDeviation([s(10), s(10), s(10), s(10)], { minSamples: 3 });
        const withFutureOutlier = computeCausalStatDeviation([s(10), s(10), s(10), s(10), s(99999)], { minSamples: 3 });
        // ตัดผลของ index สุดท้าย (future outlier) ออก เทียบที่เหลือต้องเหมือนกันเป๊ะ — พิสูจน์ว่าอนาคตไม่ย้อนแก้อดีต
        expect(withFutureOutlier.slice(0, 4)).toEqual(withoutFuture);
    });

    it('excludes non-eligible (already-flagged/contaminated) samples from the baseline pool', () => {
        const samples = [
            s(100), s(100), s(100), // baseline
            s(500, false),          // contaminated reading (e.g. already isAbnormal by hard-limit) — must NOT enter the pool
            s(100),                 // back to normal
        ];
        const results = computeCausalStatDeviation(samples, { minSamples: 3, windowSize: 10 });
        // ถ้า pool ยังเป็น {100,100,100} เป๊ะ (ไม่ปนเปื้อน) mean=100,std=0 พอดี ค่าที่ 5 (100) ต้อง match
        // เป๊ะจนได้ zScore=0 เท่านั้น — ถ้า 500 หลุดเข้า pool ไปได้ mean/std จะขยับออกจาก 0 ทันที (พิสูจน์ได้แม่นกว่า
        // เช็คแค่ isStatDeviation เพราะแม้ปนเปื้อนแล้ว z อาจยังไม่เกิน sigma threshold แต่ zScore จะไม่เท่ากับ 0 แน่ๆ)
        expect(results[4].zScore).toBe(0);
        expect(results[4].isStatDeviation).toBe(0);
    });

    it('std=0 edge case: any different value from a perfectly constant baseline is flagged, exact matches are not', () => {
        const results = computeCausalStatDeviation([s(100), s(100), s(100), s(100), s(100.001)], { minSamples: 3, sigmaK: 1000 });
        expect(results[3].isStatDeviation).toBe(0); // เท่ากับ baseline เป๊ะ — ไม่ flag แม้ sigmaK จะเข้มมากก็ไม่เกี่ยว (std=0 branch ไม่หารด้วย sigmaK)
        expect(results[4].isStatDeviation).toBe(1); // ต่างจาก baseline แม้เพียงนิดเดียว (0.001) — ต้อง flag เพราะ std=0 ไม่มีทางบอกว่า "ต่างน้อย"
    });

    it('slides the window: only the most recent windowSize eligible samples affect the baseline, not full history', () => {
        // v0=10,v1=20,v2=10,v3=20,v4=10 กับ windowSize=3 — พิสูจน์ว่า mean ที่ใช้ประเมิน v4 มาจาก {v1,v2,v3}
        // เท่านั้น (v0 ถูก evict ไปแล้ว) ไม่ใช่ค่าเฉลี่ยของ v0..v3 ทั้งหมด
        const results = computeCausalStatDeviation([s(10), s(20), s(10), s(20), s(10)], { minSamples: 2, windowSize: 3, sigmaK: 1000 });
        // ก่อนประเมิน v4: pool = {v1=20, v2=10, v3=20} → mean = 50/3 ≈ 16.667, std ≈ 4.714
        // z = (10 - 16.667) / 4.714 ≈ -1.4142 (≈ -√2)
        expect(results[4].zScore).toBeCloseTo(-1.4142, 3);
    });
});

describe('dateStrToKey (V29.89 FEAT)', () => {
    it('reverses a DD/MM/YYYY dateStr into a sortable YYYYMMDD key', () => {
        expect(dateStrToKey('11/08/2026')).toBe('20260811');
    });

    it('passes through a value with no slashes unchanged (already a plain key)', () => {
        expect(dateStrToKey('20260811')).toBe('20260811');
    });

    it('returns an empty string for null/undefined/empty input', () => {
        expect(dateStrToKey(null)).toBe('');
        expect(dateStrToKey(undefined)).toBe('');
        expect(dateStrToKey('')).toBe('');
    });
});

describe('isDateInRange (V29.89 FEAT)', () => {
    it('is inside an inclusive from/to range', () => {
        expect(isDateInRange('11/08/2026', '20260801', '20260831')).toBe(true);
        expect(isDateInRange('01/08/2026', '20260801', '20260831')).toBe(true); // boundary: from
        expect(isDateInRange('31/08/2026', '20260801', '20260831')).toBe(true); // boundary: to
    });

    it('is outside the range before "from" or after "to"', () => {
        expect(isDateInRange('31/07/2026', '20260801', '20260831')).toBe(false);
        expect(isDateInRange('01/09/2026', '20260801', '20260831')).toBe(false);
    });

    it('treats a missing/empty from or to bound as unbounded on that side', () => {
        expect(isDateInRange('01/01/2000', null, '20260831')).toBe(true);
        expect(isDateInRange('31/12/2099', '20260801', null)).toBe(true);
        expect(isDateInRange('01/01/2000', null, null)).toBe(true);
    });
});
