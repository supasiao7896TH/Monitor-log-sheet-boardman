import { describe, it, expect, beforeEach } from 'vitest';
import { APP } from '../src/modules/app/app.js';
import '../src/modules/app/app-report.js'; // side-effect import: Object.assign(APP, {...})
import { STATE } from '../src/modules/state.js';

// Pure-function coverage for APP.buildInfographicCardHTML / APP.buildInfographicTableRowHTML /
// APP.getReportData — the only 3 functions across src/modules/app/*.js that don't touch DOM/
// IndexedDB/alert directly, so testable today without adding jsdom as a dependency.

function makeRecord(overrides = {}) {
    return {
        tagNo: 'TI-2301', paramType: 'PV', value: 254, timeStr: '09:00',
        remark: '', isAbnormal: 0, isStatDeviation: 0, isStatTrendWarning: 0,
        ...overrides
    };
}
function makeTagDef(overrides = {}) {
    return { description: 'Reactor Temp', min: 220, max: 262, exactNum: null, ...overrides };
}
function makeMaster(overrides = {}) {
    return { description: null, min: null, max: null, exactNum: null, ...overrides };
}

describe('APP.buildInfographicCardHTML', () => {
    it('renders a min+max normText range', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ min: 20, max: 100 }), makeMaster());
        expect(html).toContain('Norm: 20 - 100');
    });

    it('renders a min-only normText as "> min"', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ min: 20, max: null }), makeMaster());
        expect(html).toContain('Norm: > 20');
    });

    it('renders a max-only normText as "< max"', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ min: null, max: 100 }), makeMaster());
        expect(html).toContain('Norm: < 100');
    });

    it('renders an exact-only normText', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ min: null, max: null, exactNum: 50 }), makeMaster());
        expect(html).toContain('Norm: 50');
    });

    it('renders "N/A" normText when no limits are defined at all', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ min: null, max: null, exactNum: null }), makeMaster());
        expect(html).toContain('Norm: N/A');
    });

    it('prefers master.description over tagDef.description', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ description: 'Tag Desc' }), makeMaster({ description: 'Master Desc' }));
        expect(html).toContain('Master Desc');
        expect(html).not.toContain('Tag Desc');
    });

    it('falls back to tagDef.description when master has none', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ description: 'Tag Desc' }), makeMaster());
        expect(html).toContain('Tag Desc');
    });

    it('falls back to "-" when neither master nor tagDef has a description', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef({ description: '' }), makeMaster());
        expect(html).toMatch(/>-</);
    });

    it('uses the abnormal (red) styling when isAbnormal is truthy, taking priority over stat flags', () => {
        const html = APP.buildInfographicCardHTML(makeRecord({ isAbnormal: 1, isStatDeviation: 1 }), makeTagDef(), makeMaster());
        expect(html).toContain('text-red-600');
        expect(html).toContain('alert-triangle');
        expect(html).toContain('bg-red-500');
    });

    it('uses the stat-deviation (purple) styling when isStatDeviation===1 and not abnormal', () => {
        const html = APP.buildInfographicCardHTML(makeRecord({ isStatDeviation: 1 }), makeTagDef(), makeMaster());
        expect(html).toContain('text-purple-600');
        expect(html).toContain('activity');
        expect(html).toContain('bg-purple-500');
    });

    it('uses the trend-warning (cyan) styling when isStatTrendWarning===1 and no higher-priority flag', () => {
        const html = APP.buildInfographicCardHTML(makeRecord({ isStatTrendWarning: 1 }), makeTagDef(), makeMaster());
        expect(html).toContain('text-cyan-600');
        expect(html).toContain('trending-up');
        expect(html).toContain('bg-cyan-500');
    });

    it('uses the normal (emerald) styling when no flag is set', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), makeTagDef(), makeMaster());
        expect(html).toContain('text-emerald-600');
        expect(html).toContain('check-circle-2');
        expect(html).toContain('bg-emerald-500');
    });

    it('renders the remark block with escaped text when a remark is present', () => {
        const html = APP.buildInfographicCardHTML(makeRecord({ remark: 'Checked & fixed' }), makeTagDef(), makeMaster());
        expect(html).toContain('Checked &amp; fixed');
        expect(html).not.toContain('No action recorded.');
    });

    it('renders "No action recorded." when remark is empty', () => {
        const html = APP.buildInfographicCardHTML(makeRecord({ remark: '' }), makeTagDef(), makeMaster());
        expect(html).toContain('No action recorded.');
    });

    it('escapes HTML-unsafe characters in tagNo and remark to prevent injection', () => {
        const html = APP.buildInfographicCardHTML(
            makeRecord({ tagNo: '<script>alert(1)</script>', remark: '"quoted" & <b>bold</b>' }),
            makeTagDef(), makeMaster()
        );
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain('&quot;quoted&quot;');
        expect(html).toContain('&amp;');
    });

    it('renders a falsy-but-real value of 0 (uses String(), not a truthy check)', () => {
        const html = APP.buildInfographicCardHTML(makeRecord({ value: 0 }), makeTagDef(), makeMaster());
        expect(html).toMatch(/text-3xl[^>]*>0</);
    });

    it('does not crash with an empty tagDef object and a null master', () => {
        const html = APP.buildInfographicCardHTML(makeRecord(), {}, null);
        expect(html).toContain('Norm: N/A');
        expect(html).toMatch(/>-</); // eDesc falls back to '-'
    });
});

describe('APP.buildInfographicTableRowHTML', () => {
    it('renders a min+max normText range', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord(), makeTagDef({ min: 20, max: 100 }), makeMaster());
        expect(html).toContain('20 - 100');
    });

    it('renders "N/A" normText when no limits are defined at all', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord(), makeTagDef({ min: null, max: null, exactNum: null }), makeMaster());
        expect(html).toContain('N/A');
    });

    it('prefers master.description over tagDef.description', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord(), makeTagDef({ description: 'Tag Desc' }), makeMaster({ description: 'Master Desc' }));
        expect(html).toContain('Master Desc');
        expect(html).not.toContain('Tag Desc');
    });

    it('tints the row red when isAbnormal is truthy, taking priority over stat flags', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord({ isAbnormal: 1, isStatDeviation: 1 }), makeTagDef(), makeMaster());
        expect(html).toContain('bg-red-50/60');
        expect(html).toContain('text-red-600');
    });

    it('tints the row purple when isStatDeviation===1 and not abnormal', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord({ isStatDeviation: 1 }), makeTagDef(), makeMaster());
        expect(html).toContain('bg-purple-50/60');
        expect(html).toContain('text-purple-600');
    });

    it('tints the row cyan when isStatTrendWarning===1 and no higher-priority flag', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord({ isStatTrendWarning: 1 }), makeTagDef(), makeMaster());
        expect(html).toContain('bg-cyan-50/60');
        expect(html).toContain('text-cyan-600');
    });

    it('leaves the row untinted (no rowBg class) when no flag is set', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord(), makeTagDef(), makeMaster());
        expect(html).toContain('text-emerald-600');
        expect(html).not.toContain('bg-red-50/60');
        expect(html).not.toContain('bg-purple-50/60');
        expect(html).not.toContain('bg-cyan-50/60');
    });

    it('renders escaped remark text inline when a remark is present', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord({ remark: 'Checked & fixed' }), makeTagDef(), makeMaster());
        expect(html).toContain('Checked &amp; fixed');
        expect(html).not.toContain('No action recorded.');
    });

    it('renders the muted "No action recorded." span (not wrapped like the card) when remark is empty', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord({ remark: '' }), makeTagDef(), makeMaster());
        expect(html).toContain('<span class="text-slate-400 italic">No action recorded.</span>');
    });

    it('escapes HTML-unsafe characters in tagNo to prevent injection', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord({ tagNo: '<script>alert(1)</script>' }), makeTagDef(), makeMaster());
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('renders a falsy-but-real value of 0 (uses String(), not a truthy check)', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord({ value: 0 }), makeTagDef(), makeMaster());
        expect(html).toMatch(/font-black[^>]*>0</);
    });

    it('does not crash with an empty tagDef object and a null master', () => {
        const html = APP.buildInfographicTableRowHTML(makeRecord(), {}, null);
        expect(html).toContain('N/A');
    });
});

describe('APP.getReportData', () => {
    beforeEach(() => {
        STATE.data.tags = [];
        STATE.data.masterTags = [];
        STATE.data.records = [];
        STATE.data.selectedForReport = [];
    });

    it('filters records down to only the ones whose id is in selectedForReport', () => {
        STATE.data.records = [
            { id: 'rec_1', tagNo: 'TI-2301' },
            { id: 'rec_2', tagNo: 'TI-2302' },
            { id: 'rec_3', tagNo: 'TI-2303' }
        ];
        STATE.data.selectedForReport = ['rec_1', 'rec_3'];

        const { selectedRecords } = APP.getReportData();
        expect(selectedRecords.map(r => r.id)).toEqual(['rec_1', 'rec_3']);
    });

    it('returns an empty selectedRecords array when nothing is selected', () => {
        STATE.data.records = [{ id: 'rec_1', tagNo: 'TI-2301' }];
        STATE.data.selectedForReport = [];

        const { selectedRecords } = APP.getReportData();
        expect(selectedRecords).toEqual([]);
    });

    it('returns tagMap and mTagsMap as Maps keyed by id, matching seeded tags/masterTags', () => {
        STATE.data.tags = [{ id: 'BM2_TI-2301_PV', description: 'Reactor Temp' }];
        STATE.data.masterTags = [{ id: 'BM2_TI-2301_PV', description: 'Override Desc' }];

        const { tagMap, mTagsMap } = APP.getReportData();
        expect(tagMap.get('BM2_TI-2301_PV').description).toBe('Reactor Temp');
        expect(mTagsMap.get('BM2_TI-2301_PV').description).toBe('Override Desc');
    });
});
