import { describe, expect, it } from 'vitest';

import { emptyPmRow, type PmItem } from './api';
import { pmState, shortDate } from './pmState';

const tool: PmItem['tool'] = { id: 1, code: 'SAA05H', region: 'Luzon', toolType: 'SAAT05', ee: null };
const noRow: PmItem = { tool, row: null };
const withRow = (actualDate: string | null): PmItem => ({ tool, row: { ...emptyPmRow(noRow, '2026-10'), actualDate } });

describe('pmState', () => {
  it('is done whenever a PM done date is set', () => {
    expect(pmState(withRow('2026-10-03'), '2026-10', '2026-10')).toBe('done');
    expect(pmState(withRow('2026-09-30'), '2026-09', '2026-10')).toBe('done');
  });
  it('is pending for the current or a future month without a date', () => {
    expect(pmState(withRow(null), '2026-10', '2026-10')).toBe('pending');
    expect(pmState(withRow(null), '2026-11', '2026-10')).toBe('pending');
  });
  it('is missed for a past month without a date', () => {
    expect(pmState(withRow(null), '2026-09', '2026-10')).toBe('missed');
  });
  it('is none when the tool has no PM row', () => {
    expect(pmState(noRow, '2026-09', '2026-10')).toBe('none');
    expect(pmState(noRow, '2026-10', '2026-10')).toBe('none');
  });
});

describe('shortDate', () => {
  it('formats without timezone shifting and adds the year only when it differs', () => {
    expect(shortDate('2026-10-03', '2026')).toBe('Oct 3');
    expect(shortDate('2027-01-04', '2026')).toBe('Jan 4, 2027');
    expect(shortDate('2026-12-31')).toBe('Dec 31');
  });
});
