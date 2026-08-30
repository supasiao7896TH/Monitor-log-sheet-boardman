import { describe, it, expect } from 'vitest';
import { selectMissingById } from '../src/modules/storage-engine.js';

// V29.112 FIX: mergeAll's merge decision, extracted into this pure function so it can be tested without
// IndexedDB (this repo has no fake-indexeddb/jsdom in its test setup). The bug this guards against: the
// first version of mergeAll put() every remote item unconditionally, which reverted local edits that
// hadn't been pushed yet (see APP.pushSharedDb, app-core.js) — caught in code review before commit.
describe('selectMissingById (STORAGE_ENGINE.mergeAll merge logic, V29.112 FIX)', () => {
    it('excludes an item whose id already exists locally — local always wins for ids it already has', () => {
        const existingIds = new Set(['rec_a']);
        const items = [{ id: 'rec_a', value: 'stale-remote-value' }];
        expect(selectMissingById(existingIds, items)).toEqual([]);
    });

    it('includes an item whose id does not exist locally', () => {
        const existingIds = new Set(['rec_a']);
        const items = [{ id: 'rec_b', value: 42 }];
        expect(selectMissingById(existingIds, items)).toEqual([{ id: 'rec_b', value: 42 }]);
    });

    it('mixed batch: keeps only the ids missing locally, in original order', () => {
        const existingIds = new Set(['rec_a', 'rec_c']);
        const items = [
            { id: 'rec_a', value: 1 },
            { id: 'rec_b', value: 2 },
            { id: 'rec_c', value: 3 },
            { id: 'rec_d', value: 4 },
        ];
        expect(selectMissingById(existingIds, items)).toEqual([
            { id: 'rec_b', value: 2 },
            { id: 'rec_d', value: 4 },
        ]);
    });

    it('empty existingIds (fresh browser profile): every remote item is included', () => {
        const items = [{ id: 'rec_a' }, { id: 'rec_b' }];
        expect(selectMissingById(new Set(), items)).toEqual(items);
    });

    it('empty items array: returns empty regardless of existingIds', () => {
        expect(selectMissingById(new Set(['rec_a']), [])).toEqual([]);
    });

    it('a just-deleted id (no longer in existingIds) would be re-added — the reason deleteCountermeasureEntry force-pushes instead of merging', () => {
        // Simulates: operator deletes 'cm_1' locally, then a merge-pull runs before the delete is pushed.
        // existingIds no longer contains 'cm_1', so the still-present remote copy would be selected —
        // this is exactly why APP.deleteCountermeasureEntry uses pushSharedDb({ merge: false }) instead.
        const existingIdsAfterDelete = new Set(['cm_2']);
        const remoteItems = [{ id: 'cm_1', text: 'old advice' }, { id: 'cm_2', text: 'kept advice' }];
        expect(selectMissingById(existingIdsAfterDelete, remoteItems)).toEqual([{ id: 'cm_1', text: 'old advice' }]);
    });
});
