import { describe, it, expect } from 'vitest';
import { getCanonicalTimesStatus } from '../src/modules/shared.js';

function rec(dateStr, timeStr) { return { dateStr, timeStr }; }

describe('getCanonicalTimesStatus (V29.78 FEAT)', () => {
    it('reports incomplete with all 4 times missing when there are no records', () => {
        const status = getCanonicalTimesStatus([]);
        expect(status).toEqual({ dateStr: null, missingTimes: ['03:00', '09:00', '15:00', '21:00'], isComplete: false });
    });

    it('is incomplete when only some canonical times are present for the latest date', () => {
        const status = getCanonicalTimesStatus([
            rec('11/08/2026', '03:00'),
            rec('11/08/2026', '09:00'),
        ]);
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
        ]);
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
        ]);
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
        ]);
        expect(status.isComplete).toBe(true);
    });
});
