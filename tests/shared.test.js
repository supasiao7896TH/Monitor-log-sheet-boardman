import { describe, it, expect } from 'vitest';
import { getCanonicalTimesStatus } from '../src/modules/shared.js';

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
