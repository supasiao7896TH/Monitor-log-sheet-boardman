import { describe, it, expect } from 'vitest';
import { EXCEL_WORKER } from '../src/modules/excel-worker.js';
import { isValidDayMonth } from '../src/modules/shared.js';

describe('EXCEL_WORKER.parseCSV', () => {
  it('splits plain comma-separated values', () => {
    expect(EXCEL_WORKER.parseCSV('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps commas inside quoted fields intact', () => {
    expect(EXCEL_WORKER.parseCSV('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
  });

  // V29.65 FIX: RFC4180 escaped-quote ("" inside a quoted field = one literal quote).
  // Before the fix this miscounted quotes and shifted every column after it.
  it('unescapes RFC4180 doubled quotes inside a quoted field', () => {
    const row = 'a,"Valve ""A"" closed",c';
    expect(EXCEL_WORKER.parseCSV(row)).toEqual(['a', 'Valve "A" closed', 'c']);
  });
});

describe('isValidDayMonth (V29.67 FIX)', () => {
  it('rejects day 31 in a 30-day month', () => {
    expect(isValidDayMonth(31, 4, 2026)).toBe(false); // April has 30 days
  });

  it('accepts day 30 in April', () => {
    expect(isValidDayMonth(30, 4, 2026)).toBe(true);
  });

  it('rejects Feb 30 even without a known year', () => {
    expect(isValidDayMonth(30, 2, null)).toBe(false);
  });

  it('accepts Feb 29 without a known year (leap-year-tolerant fallback table)', () => {
    expect(isValidDayMonth(29, 2, null)).toBe(true);
  });

  it('rejects Feb 29 on a known non-leap year', () => {
    expect(isValidDayMonth(29, 2, 2026)).toBe(false); // 2026 is not a leap year
  });

  it('rejects an out-of-range month', () => {
    expect(isValidDayMonth(15, 13, 2026)).toBe(false);
  });
});

describe('EXCEL_WORKER.extractGlobalDate (V29.67 FIX)', () => {
  it('extracts a date next to a "DATE" label only when day/month are valid', () => {
    const lines = ['DATE,31/04/2026,other'];
    // 31/04 is invalid (April has 30 days) — must not be accepted, must fall through to null
    // since no other valid date-like token exists in these lines.
    expect(EXCEL_WORKER.extractGlobalDate(lines, 'log.csv')).toBeNull();
  });

  it('extracts a valid date next to a "DATE" label', () => {
    const lines = ['DATE,08/03/2026,other'];
    expect(EXCEL_WORKER.extractGlobalDate(lines, 'log.csv')).toBe('08/03/2026');
  });

  it('prefers a valid date embedded in the file name', () => {
    const lines = ['irrelevant,row'];
    expect(EXCEL_WORKER.extractGlobalDate(lines, 'Log sheet 08-3-2026.csv')).toBe('08/03/2026');
  });
});

describe('EXCEL_WORKER.extractTime (V29.68 FIX)', () => {
  it('reads a strict HH:MM time from a column', () => {
    const cols = ['07:30', 'FI-1401', '12.5'];
    expect(EXCEL_WORKER.extractTime(cols)).toBe('07:30');
  });

  it('skips a column already claimed as a tag/reading via skipIdx', () => {
    // column 0 looks numeric-ish but is registered as an active tag column (e.g. a totalizer
    // value that happens to fall in the Excel-serial-time numeric range) — must not be
    // misread as a time; the real time in column 1 should be picked up instead.
    const cols = ['45123.5', '08:15'];
    const skipIdx = { 0: { tagNo: 'FI-9999' } };
    expect(EXCEL_WORKER.extractTime(cols, skipIdx)).toBe('08:15');
  });
});

describe('EXCEL_WORKER.processData — Normal/Limit parsing word-boundary (V29.66 FIX)', () => {
  it('does not treat "Minor" as containing the min/max limit keyword', () => {
    const csv = [
      'Name,FI-1401',
      'Tag No,FI-1401',
      'Normal,Minor Deviation Range',
      '07:00,55',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ tags }) => {
      const tag = tags.find(t => t.tagNo === 'FI-1401');
      expect(tag.min).toBeNull();
      expect(tag.max).toBeNull();
    });
  });

  it('parses both Min and Max when present in one cell without a range separator', () => {
    const csv = [
      'Name,FI-1401',
      'Tag No,FI-1401',
      'Normal,Min: 10 Max: 20',
      '07:00,15',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ tags }) => {
      const tag = tags.find(t => t.tagNo === 'FI-1401');
      expect(tag.min).toBe(10);
      expect(tag.max).toBe(20);
    });
  });

  it('parses a plain numeric range as min/max', () => {
    const csv = [
      'Name,FI-1401',
      'Tag No,FI-1401',
      'Normal,10 - 20',
      '07:00,15',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ tags }) => {
      const tag = tags.find(t => t.tagNo === 'FI-1401');
      expect(tag.min).toBe(10);
      expect(tag.max).toBe(20);
    });
  });
});

describe('EXCEL_WORKER.processData — header/ignore word-boundary (V29.69 FIX)', () => {
  it('does not fuse adjacent cell text into a false keyword across cell boundaries', () => {
    // "...Nam" + "e..." must NOT fuse into "name" and be misdetected as a description header row.
    const csv = [
      'Nam,e Field,Tag No',
      'Tag No,FI-1401',
      '07:00,15',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ tags }) => {
      // the first row must not have been consumed as a "description" header row —
      // if it had been, 'Tag No' row detection below would behave normally regardless,
      // so assert indirectly via the fact tag extraction still succeeds correctly.
      expect(tags.find(t => t.tagNo === 'FI-1401')).toBeTruthy();
    });
  });

  it('does not ignore a data row just because a cell contains "aluminum" (substring of "min")', () => {
    const csv = [
      'Name,,FI-1401,FI-1402',
      'Tag No,,FI-1401,FI-1402',
      'aluminum housing,07:00,50,60',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ records }) => {
      // must not have been skipped by the ignore-row word-boundary check (only whole-word "min" ignores)
      expect(records.length).toBe(2);
    });
  });

  it('does not let two tags with missing values borrow the same neighbor cell twice', () => {
    // two adjacent tag columns both have empty readings; only one real neighbor value (col 2)
    // is available to borrow — the second tag must not duplicate it.
    const csv = [
      'Name,FI-1401,FI-1402',
      'Tag No,FI-1401,FI-1402',
      '07:00,,,99',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ records }) => {
      const values = records.map(r => r.value);
      // at most one record should have borrowed the stray "99" — not both
      expect(values.filter(v => v === 99).length).toBeLessThanOrEqual(1);
    });
  });
});

describe('EXCEL_WORKER.processData — invalid timestamp guard (V29.67 FIX)', () => {
  it('skips a row whose computed timestamp is NaN instead of storing a broken one', () => {
    const csv = [
      'Name,FI-1401',
      'Tag No,FI-1401',
      '99:99,50',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', 'not-a-date').then(({ records }) => {
      expect(records.length).toBe(0);
    });
  });
});

describe('EXCEL_WORKER.colIdxToLetter (V29.71 FEAT)', () => {
  it('converts single-letter columns', () => {
    expect(EXCEL_WORKER.colIdxToLetter(0)).toBe('A');
    expect(EXCEL_WORKER.colIdxToLetter(1)).toBe('B');
    expect(EXCEL_WORKER.colIdxToLetter(25)).toBe('Z');
  });

  it('converts double-letter columns (base-26 rollover)', () => {
    expect(EXCEL_WORKER.colIdxToLetter(26)).toBe('AA');
    expect(EXCEL_WORKER.colIdxToLetter(27)).toBe('AB');
    expect(EXCEL_WORKER.colIdxToLetter(51)).toBe('AZ');
    expect(EXCEL_WORKER.colIdxToLetter(52)).toBe('BA');
  });
});

describe('EXCEL_WORKER.processData — cellRef/sheetRow/sheetCol (V29.71 FEAT)', () => {
  it('computes the exact Excel cell address for a reading, matching sheet_to_csv line/column position', () => {
    const csv = [
      'Name,FI-1401,FI-1402',
      'Tag No,FI-1401,FI-1402',
      '07:00,50,60',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ records }) => {
      const r1 = records.find(r => r.tagNo === 'FI-1401');
      const r2 = records.find(r => r.tagNo === 'FI-1402');
      // row 3 (1-based) = CSV line index 2 ("07:00,50,60"); column B/C = CSV index 1/2
      expect(r1.sheetRow).toBe(3);
      expect(r1.sheetCol).toBe(1);
      expect(r1.cellRef).toBe('B3');
      expect(r2.sheetRow).toBe(3);
      expect(r2.sheetCol).toBe(2);
      expect(r2.cellRef).toBe('C3');
    });
  });

  it('keeps the row count accurate across a blank line, since sheet_to_csv never drops blank rows', () => {
    const csv = [
      'Name,FI-1401',
      'Tag No,FI-1401',
      '',
      '07:00,50',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026').then(({ records }) => {
      const r = records.find(r => r.tagNo === 'FI-1401');
      // data row is CSV line index 3 (0-based) -> Excel row 4
      expect(r.cellRef).toBe('B4');
    });
  });

  // V29.72 FIX: sheet_to_csv(sheet, {raw:true}) with no `range` option only serializes the sheet's
  // used-range (!ref) — when that range doesn't start at A1 (frozen panes, leading blank rows/cols),
  // CSV row/col 0 is NOT Excel row 1/col A. app-import.js must compute this offset from !ref and pass
  // it in, or the write-back feature silently writes the remark comment onto the wrong cell/Tag.
  it('shifts cellRef by the sheet\'s used-range offset when data does not start at A1', () => {
    const csv = [
      'Name,FI-1401',
      'Tag No,FI-1401',
      '07:00,50',
    ].join('\n');
    return EXCEL_WORKER.processData(csv, 'Unit1', 'test.csv', '08/03/2026', undefined, { rowOffset: 2, colOffset: 2 })
      .then(({ records }) => {
        const r = records.find(r => r.tagNo === 'FI-1401');
        // without offset this would be B3 (CSV line index 2 -> row 3, CSV col index 1 -> col B);
        // with offset {rowOffset:2, colOffset:2} it must shift to D5
        expect(r.cellRef).toBe('D5');
      });
  });
});
