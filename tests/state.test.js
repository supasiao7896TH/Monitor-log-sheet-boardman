import { describe, it, expect, beforeEach } from 'vitest';
import { STATE } from '../src/modules/state.js';

// V29.84 FEAT: _recomputeFlags ไม่มี test เลยมาก่อน (ทั้งไฟล์ state.js) — testable โดยไม่ต้อง jsdom เพราะ
// ไม่แตะ DOM ตอน module-evaluation เลย (ดู CLAUDE.md) เขียน suite นี้ตอนเพิ่ม Statistical Deviation
// เพื่อคุม integration ระหว่าง hard-limit check เดิมกับ pass ใหม่ให้พร้อมกัน

function makeTag(id, machine, tagNo, paramType, min, max) {
    return { id, machine, tagNo, paramType, min, max, exactNum: null, description: '', normalText: `${min}-${max}` };
}
function makeMaster(id, tagNo, paramType, overrides = {}) {
    return { id, tagNo, paramType, min: null, max: null, exactNum: null, disableZeroShield: false, forceStandby: false, disableStatDeviation: false, ...overrides };
}
function makeRecord(idx, value, machine = 'BM2', tagNo = 'TI-2301', paramType = 'PV') {
    return { id: `rec_${idx}`, machine, tagNo, paramType, value, timestamp: idx * 1000, dateStr: '01/01/2026', timeStr: '00:00', remark: '', actionStatus: 'new' };
}

const TAG_ID = 'BM2_TI-2301_PV';
// swing แคบมากแบบ TI-2301 จริง (253.4-254.1) — ต้องมี >= STAT_DEVIATION_MIN_SAMPLES (20) ก้อนก่อนจะเริ่มจับ
const BASELINE = Array.from({ length: 25 }, (_, i) => makeRecord(i, 253.7 + (i % 3) * 0.1));

beforeEach(() => {
    STATE.data.tags = [];
    STATE.data.masterTags = [];
    STATE.data.records = [];
    STATE.data.viewFilter = 'abnormal';
    STATE.data.timeFilter = 'all';
});

describe('_recomputeFlags Statistical Deviation integration (V29.84 FEAT, V29.92 opt-out flip)', () => {
    it('flags isStatDeviation automatically with no Tag Master row at all (default is ON for every tag)', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = []; // ไม่มี Master row เลย — ต้องยังจับได้ (เดิม opt-in ต้องมี master.enableStatDeviation===true ถึงจะจับ)

        const anomaly = makeRecord(25, 238.7); // ยังอยู่ใน spec 220-262 แต่หลุด baseline จริง
        STATE.set('records', [...BASELINE, anomaly]);

        const flagged = STATE.data.records.find(r => r.id === 'rec_25');
        expect(flagged.isAbnormal).toBe(0);
        expect(flagged.isStatDeviation).toBe(1); // เปิดอัตโนมัติแล้ว ไม่ต้องมี Master row มาเปิดใช้งานเอง
    });

    it('never flags isStatDeviation when the tag has disableStatDeviation set (opt-out escape hatch)', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = [makeMaster(TAG_ID, 'TI-2301', 'PV', { disableStatDeviation: true })];

        const anomaly = makeRecord(25, 238.7);
        STATE.set('records', [...BASELINE, anomaly]);

        const flagged = STATE.data.records.find(r => r.id === 'rec_25');
        expect(flagged.isAbnormal).toBe(0);
        expect(flagged.isStatDeviation).toBe(0); // ปิดไว้ชัดเจน — ต้องไม่จับแม้ค่าจะเบี่ยงมากแค่ไหน
        expect(flagged.isStatTrendWarning).toBe(0);
    });

    // หมายเหตุ: ไม่มีทางสร้าง fixture ที่พิสูจน์ผลของ guard "eExact !== null → return" (state.js) แยกจาก
    // mutual-exclusivity ได้ตรงๆ — ค่าใดๆที่ไม่ตรง exactNum เป๊ะจะกลาย isAbnormal=1 จาก pass แรกไปแล้ว (ก่อนถึง
    // pass สถิติ) ทำให้ isStatDeviation เป็น 0 อยู่ดีไม่ว่า guard นี้จะมีหรือไม่ก็ตาม — guard นี้จึงเป็น
    // performance optimization (ข้าม group/sort ที่เสียเปล่า) ไม่ใช่ correctness-critical จึง test แค่ behavior
    // ที่สังเกตได้จริง: exact-match tag ต้องไม่ crash และไม่มี record ไหนได้ isStatDeviation=1 แม้เปิด default อยู่
    it('does not crash and never flags isStatDeviation on an exact-match tag, even though detection is on by default', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = [makeMaster(TAG_ID, 'TI-2301', 'PV', { exactNum: 254 })];

        const anomaly = makeRecord(25, 238.7);
        STATE.set('records', [...BASELINE, anomaly]);

        expect(STATE.data.records.every(r => r.isStatDeviation === 0)).toBe(true);
        expect(STATE.data.records.every(r => r.isStatTrendWarning === 0)).toBe(true);
    });

    it('flags a value that stays within the wide hard-limit spec but drifts far from the baseline (TI-2301 scenario), and stays visible in the default dashboard filter', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = []; // default เปิดอัตโนมัติ

        const anomaly = makeRecord(25, 238.7);
        STATE.set('records', [...BASELINE, anomaly]);

        const flagged = STATE.data.records.find(r => r.id === 'rec_25');
        expect(flagged.isAbnormal).toBe(0);       // hard-limit check เดิมจับไม่ได้
        expect(flagged.isStatDeviation).toBe(1);  // stat-deviation จับได้
        expect(flagged.isAbnormal === 1 && flagged.isStatDeviation === 1).toBe(false); // mutually exclusive โดยธรรมชาติ

        // default filter "abnormal" ต้องครอบคลุมทั้งคู่ — ห้าม record ประเภทนี้หายไปจาก dashboard
        expect(STATE.data.abnormalRecords.some(r => r.id === 'rec_25')).toBe(true);
    });

    it('leaves the baseline records themselves unflagged', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = [];

        STATE.set('records', BASELINE);

        expect(STATE.data.records.every(r => r.isStatDeviation === 0)).toBe(true);
        expect(STATE.data.records.every(r => r.isStatTrendWarning === 0)).toBe(true);
    });

    it('the "stat-deviation" view filter shows only Statistical Deviation records, excluding hard-limit violations', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = [];

        const statDevRecord = makeRecord(25, 238.7);          // in-spec, off-baseline
        const hardLimitRecord = makeRecord(26, 300);           // หลุด max=262 ตรงๆ
        STATE.set('records', [...BASELINE, statDevRecord, hardLimitRecord]);

        STATE.set('viewFilter', 'stat-deviation');
        expect(STATE.data.abnormalRecords.some(r => r.id === 'rec_25')).toBe(true);
        expect(STATE.data.abnormalRecords.some(r => r.id === 'rec_26')).toBe(false);
    });

    it('a hard-limit-abnormal record never also carries isStatTrendWarning (mutual exclusivity with pass 1)', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = [];

        const hardLimitRecord = makeRecord(26, 300); // หลุด max=262 ตรงๆ
        STATE.set('records', [...BASELINE, hardLimitRecord]);

        const flagged = STATE.data.records.find(r => r.id === 'rec_26');
        expect(flagged.isAbnormal).toBe(1);
        expect(flagged.isStatDeviation).toBe(0);
        expect(flagged.isStatTrendWarning).toBe(0);
    });

    it('the "trend-warning" view filter shows only isStatTrendWarning records', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = [];
        STATE.set('records', BASELINE); // ไม่มี record ไหนถูก flag เป็น trend-warning ในชุดนี้

        STATE.set('viewFilter', 'trend-warning');
        expect(STATE.data.abnormalRecords.length).toBe(0);
    });

    it('the "hard-abnormal" view filter (V29.93, การ์ด Abnormalities) shows only hard-limit violations, excluding Statistical Deviation', () => {
        STATE.data.tags = [makeTag(TAG_ID, 'BM2', 'TI-2301', 'PV', 220, 262)];
        STATE.data.masterTags = [];

        const statDevRecord = makeRecord(25, 238.7);  // in-spec, off-baseline
        const hardLimitRecord = makeRecord(26, 300);   // หลุด max=262 ตรงๆ
        STATE.set('records', [...BASELINE, statDevRecord, hardLimitRecord]);

        STATE.set('viewFilter', 'hard-abnormal');
        expect(STATE.data.abnormalRecords.some(r => r.id === 'rec_26')).toBe(true);
        expect(STATE.data.abnormalRecords.some(r => r.id === 'rec_25')).toBe(false);
    });
});
