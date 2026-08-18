import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EXCEL_AUTOIMPORT } from '../src/modules/excel-autoimport.js';

describe('EXCEL_AUTOIMPORT.getSourceFileInfo', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the bridge JSON envelope on success', async () => {
        const payload = { status: 'ok', fileName: 'P1-F-2002-22 (11-08-26) (Digital).xlsm', sizeBytes: 12345, lastWriteTimeUtc: '2026-08-11T03:00:00.000Z' };
        fetch.mockResolvedValue({ ok: true, json: async () => payload });
        const result = await EXCEL_AUTOIMPORT.getSourceFileInfo();
        expect(result).toEqual(payload);
        expect(fetch).toHaveBeenCalledWith('http://localhost:5175/source-file-info', expect.objectContaining({ method: 'GET' }));
    });

    it('passes through not-found/error statuses from the bridge unchanged', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'not-found' }) });
        expect(await EXCEL_AUTOIMPORT.getSourceFileInfo()).toEqual({ status: 'not-found' });
    });

    it('returns bridge-offline when the bridge is not running (network error)', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_AUTOIMPORT.getSourceFileInfo()).toEqual({ status: 'bridge-offline' });
    });
});

describe('EXCEL_AUTOIMPORT.fetchSourceFile', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('builds a File from the raw binary response, using the filename passed in by the caller', async () => {
        const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
        fetch.mockResolvedValue({
            ok: true,
            headers: { get: (name) => (name === 'Content-Type' ? 'application/octet-stream' : null) },
            arrayBuffer: async () => bytes
        });

        const result = await EXCEL_AUTOIMPORT.fetchSourceFile('P1-F-2002-22 (11-08-26) (Digital).xlsm');
        expect(result.status).toBe('ok');
        expect(result.file).toBeInstanceOf(File);
        expect(result.file.name).toBe('P1-F-2002-22 (11-08-26) (Digital).xlsm');
        expect(result.file.size).toBe(4);
    });

    it('returns the JSON envelope unchanged when the bridge responds with an error/file-locked status', async () => {
        fetch.mockResolvedValue({
            ok: true,
            headers: { get: (name) => (name === 'Content-Type' ? 'application/json; charset=utf-8' : null) },
            json: async () => ({ status: 'file-locked', message: 'ไฟล์กำลังถูกเขียนอยู่' })
        });

        const result = await EXCEL_AUTOIMPORT.fetchSourceFile('P1-F-2002-22 (11-08-26) (Digital).xlsm');
        expect(result).toEqual({ status: 'file-locked', message: 'ไฟล์กำลังถูกเขียนอยู่' });
    });

    it('returns bridge-offline when the bridge is not running (network error)', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_AUTOIMPORT.fetchSourceFile('foo.xlsm')).toEqual({ status: 'bridge-offline' });
    });
});

describe('EXCEL_AUTOIMPORT.archiveSourceFile', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the status the bridge reports on success', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
        const status = await EXCEL_AUTOIMPORT.archiveSourceFile();
        expect(status).toBe('ok');
        expect(fetch).toHaveBeenCalledWith('http://localhost:5175/archive-source-file', expect.objectContaining({ method: 'POST' }));
    });

    it('returns error when the bridge responds with a non-ok HTTP status', async () => {
        fetch.mockResolvedValue({ ok: false });
        expect(await EXCEL_AUTOIMPORT.archiveSourceFile()).toBe('error');
    });

    it('returns bridge-offline when the bridge is not running (network error)', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_AUTOIMPORT.archiveSourceFile()).toBe('bridge-offline');
    });
});

describe('EXCEL_AUTOIMPORT.rolloverDailyFileIfNeeded', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the full bridge JSON envelope on a successful rollover', async () => {
        const payload = { status: 'ok', oldFileName: 'P1-F-2002-22 (18-08-26) (Digital).xlsm', newFileName: 'P1-F-2002-22 (19-08-26) (Digital).xlsm' };
        fetch.mockResolvedValue({ ok: true, json: async () => payload });
        const result = await EXCEL_AUTOIMPORT.rolloverDailyFileIfNeeded();
        expect(result).toEqual(payload);
        expect(fetch).toHaveBeenCalledWith('http://localhost:5175/rollover-daily-file', expect.objectContaining({ method: 'POST' }));
    });

    it('passes through already-current/no-file-open/error statuses from the bridge unchanged', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'already-current' }) });
        expect(await EXCEL_AUTOIMPORT.rolloverDailyFileIfNeeded()).toEqual({ status: 'already-current' });
    });

    it('returns error when the bridge responds with a non-ok HTTP status', async () => {
        fetch.mockResolvedValue({ ok: false });
        expect(await EXCEL_AUTOIMPORT.rolloverDailyFileIfNeeded()).toEqual({ status: 'error' });
    });

    it('returns bridge-offline when the bridge is not running (network error)', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_AUTOIMPORT.rolloverDailyFileIfNeeded()).toEqual({ status: 'bridge-offline' });
    });
});
