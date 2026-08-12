import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EXCEL_SYNC } from '../src/modules/excel-sync.js';

const samplePayload = { schemaVersion: 1, exportedAt: '2026-08-12T00:00:00.000Z', tags: [], records: [], masterTags: [], userCountermeasures: [] };

describe('EXCEL_SYNC.pushSharedDb (V29.85 FEAT: talks to bridge/excel-bridge.ps1 via fetch)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('POSTs the snapshot to /save-shared-db and returns the status the bridge reports on success', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
        const status = await EXCEL_SYNC.pushSharedDb(samplePayload);
        expect(status).toBe('ok');
        expect(fetch).toHaveBeenCalledWith('http://localhost:5175/save-shared-db', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(samplePayload)
        }));
    });

    it('returns error when the bridge responds with a non-ok HTTP status', async () => {
        fetch.mockResolvedValue({ ok: false });
        expect(await EXCEL_SYNC.pushSharedDb(samplePayload)).toBe('error');
    });

    it('returns error when the bridge JSON body has no status field', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        expect(await EXCEL_SYNC.pushSharedDb(samplePayload)).toBe('error');
    });

    it('returns bridge-offline when the bridge is not running (network error)', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_SYNC.pushSharedDb(samplePayload)).toBe('bridge-offline');
    });
});

describe('EXCEL_SYNC.pullSharedDb (V29.85 FEAT)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('GETs /load-shared-db and returns the full envelope on success', async () => {
        const envelope = { status: 'ok', data: samplePayload };
        fetch.mockResolvedValue({ ok: true, json: async () => envelope });
        const result = await EXCEL_SYNC.pullSharedDb();
        expect(result).toEqual(envelope);
        expect(fetch).toHaveBeenCalledWith('http://localhost:5175/load-shared-db', { method: 'GET' });
    });

    it('passes through not-found (nobody has pushed to the shared file yet) unchanged', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'not-found' }) });
        expect(await EXCEL_SYNC.pullSharedDb()).toEqual({ status: 'not-found' });
    });

    it('passes through file-locked unchanged', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'file-locked' }) });
        expect(await EXCEL_SYNC.pullSharedDb()).toEqual({ status: 'file-locked' });
    });

    it('returns {status:"error"} when the bridge responds with a non-ok HTTP status', async () => {
        fetch.mockResolvedValue({ ok: false });
        expect(await EXCEL_SYNC.pullSharedDb()).toEqual({ status: 'error' });
    });

    it('returns {status:"bridge-offline"} when the bridge is not running (network error)', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await EXCEL_SYNC.pullSharedDb()).toEqual({ status: 'bridge-offline' });
    });
});
