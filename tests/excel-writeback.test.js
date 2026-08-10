import { describe, it, expect } from 'vitest';
import { EXCEL_WRITEBACK } from '../src/modules/excel-writeback.js';

function makeWb(cell) {
    return { SheetNames: ['BM2'], Sheets: { BM2: { D34: cell } } };
}

const record = { machine: 'BM2', cellRef: 'D34' };

describe('EXCEL_WRITEBACK.applyRemarkToWorkbook (V29.71 FEAT)', () => {
    it('writes a fresh app-authored comment onto the reading cell', () => {
        const wb = makeWb({ t: 'n', v: 47.5 });
        const result = EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, record, 'Fouling');
        expect(result.status).toBe('ok');
        expect(wb.Sheets.BM2.D34.c).toEqual([{ a: 'Plant Log Analyzer (Web App)', t: 'Fouling', hidden: true }]);
    });

    it('creates the cell if it is missing from the re-read workbook', () => {
        const wb = makeWb(undefined);
        delete wb.Sheets.BM2.D34;
        const result = EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, record, 'Range not appropriate');
        expect(result.status).toBe('ok');
        expect(wb.Sheets.BM2.D34.c[0].t).toBe('Range not appropriate');
    });

    it('overwrites its own previously-written comment when the remark is edited', () => {
        const wb = makeWb({ t: 'n', v: 47.5, c: [{ a: 'Plant Log Analyzer (Web App)', t: 'old text', hidden: true }] });
        const result = EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, record, 'new text');
        expect(result.status).toBe('ok');
        expect(wb.Sheets.BM2.D34.c[0].t).toBe('new text');
    });

    it('clears its own comment when the remark is cleared in the web app', () => {
        const wb = makeWb({ t: 'n', v: 47.5, c: [{ a: 'Plant Log Analyzer (Web App)', t: 'old text', hidden: true }] });
        const result = EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, record, '');
        expect(result.status).toBe('ok');
        expect(wb.Sheets.BM2.D34.c).toBeUndefined();
    });

    it('does not clobber a comment a human typed directly in Excel', () => {
        const wb = makeWb({ t: 'n', v: 47.5, c: [{ a: 'Wuttichat Srichompol', t: 'Fouling', hidden: true }] });
        const result = EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, record, 'different remark from web app');
        expect(result.status).toBe('conflict');
        // the human's comment must be left untouched
        expect(wb.Sheets.BM2.D34.c[0].a).toBe('Wuttichat Srichompol');
        expect(wb.Sheets.BM2.D34.c[0].t).toBe('Fouling');
    });

    it('returns an error status when the target sheet does not exist in the workbook', () => {
        const wb = { SheetNames: ['BM2'], Sheets: { BM2: {} } };
        const result = EXCEL_WRITEBACK.applyRemarkToWorkbook(wb, { machine: 'BM3', cellRef: 'D34' }, 'text');
        expect(result.status).toBe('error');
    });
});

describe('EXCEL_WRITEBACK.isFsAccessSupported', () => {
    it('is a callable feature-detection function', () => {
        expect(typeof EXCEL_WRITEBACK.isFsAccessSupported).toBe('function');
        expect(typeof EXCEL_WRITEBACK.isFsAccessSupported()).toBe('boolean');
    });
});
