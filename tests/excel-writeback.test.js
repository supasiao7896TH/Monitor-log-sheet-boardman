import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EXCEL_WRITEBACK } from '../src/modules/excel-writeback.js';

const record = { machine: 'BM2', cellRef: 'D34', sourceFileName: 'Log sheet 08-3-26.xls' };

describe('EXCEL_WRITEBACK.buildWriteRemarkPayload (V29.74 ARCH)', () => {
    it('builds the request body the Local Bridge expects, trimming the remark', () => {
        const payload = EXCEL_WRITEBACK.buildWriteRemarkPayload(record, '  Fouling  ');
        expect(payload).toEqual({
            fileName: 'Log sheet 08-3-26.xls',
            machine: 'BM2',
            cellRef: 'D34',
            remarkText: 'Fouling',
            author: 'Plant Log Analyzer (Web App)'
        });
    });

    it('sends an empty remarkText as an empty string, not null/undefined', () => {
        const payload = EXCEL_WRITEBACK.buildWriteRemarkPayload(record, undefined);
        expect(payload.remarkText).toBe('');
    });
});

describe('EXCEL_WRITEBACK.syncRemarkToExcel (V29.74 ARCH: talks to bridge/excel-bridge.ps1 via fetch)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns no-source-file when the record predates this feature (no sourceFileName)', async () => {
        const status = await EXCEL_WRITEBACK.syncRemarkToExcel({ machine: 'BM2', cellRef: 'D34' }, 'text');
        expect(status).toBe('no-source-file');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('returns the status the bridge reports on success', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
        const status = await EXCEL_WRITEBACK.syncRemarkToExcel(record, 'Fouling');
        expect(status).toBe('ok');
        expect(fetch).toHaveBeenCalledWith('http://localhost:5175/write-remark', expect.objectContaining({ method: 'POST' }));
    });

    it('passes through conflict/no-file-open statuses from the bridge unchanged', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'conflict' }) });
        expect(await EXCEL_WRITEBACK.syncRemarkToExcel(record, 'x')).toBe('conflict');

        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'no-file-open' }) });
        expect(await EXCEL_WRITEBACK.syncRemarkToExcel(record, 'x')).toBe('no-file-open');
    });

    it('returns error when the bridge responds with a non-ok HTTP status', async () => {
        fetch.mockResolvedValue({ ok: false });
        expect(await EXCEL_WRITEBACK.syncRemarkToExcel(record, 'x')).toBe('error');
    });

    it('returns bridge-offline when the bridge is not running (network error)', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_WRITEBACK.syncRemarkToExcel(record, 'x')).toBe('bridge-offline');
    });
});

describe('EXCEL_WRITEBACK.checkBridgeStatus', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('is true when /ping responds ok', async () => {
        fetch.mockResolvedValue({ ok: true });
        expect(await EXCEL_WRITEBACK.checkBridgeStatus()).toBe(true);
    });

    it('is false when the bridge is unreachable', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_WRITEBACK.checkBridgeStatus()).toBe(false);
    });
});
