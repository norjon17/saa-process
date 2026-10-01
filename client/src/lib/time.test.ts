import { describe, expect, it } from 'vitest';

import { addDays, currentShift, daysInMonth, isWeekend, monthRange, nextShift, prevShift, shiftDate, shiftMonth } from './time';

// Helper: a UTC instant that corresponds to the given Manila wall-clock time (UTC+8).
const manila = (iso: string) => new Date(`${iso}+08:00`);

describe('shift boundaries (Asia/Manila)', () => {
  it.each([
    ['2026-09-25T05:59:00', 'NS'],
    ['2026-09-25T06:00:00', 'DS'],
    ['2026-09-25T17:59:59', 'DS'],
    ['2026-09-25T18:00:00', 'NS'],
    ['2026-09-25T23:59:00', 'NS'],
  ])('%s → %s', (t, shift) => {
    expect(currentShift(manila(t))).toBe(shift);
  });

  it('NS hours after midnight belong to the previous business date', () => {
    expect(shiftDate(manila('2026-09-26T02:30:00'))).toBe('2026-09-25');
    expect(shiftDate(manila('2026-09-25T19:00:00'))).toBe('2026-09-25');
    expect(shiftDate(manila('2026-09-25T09:00:00'))).toBe('2026-09-25');
  });

  it('steps DS → NS → next day DS', () => {
    expect(nextShift('2026-09-25', 'DS')).toEqual({ date: '2026-09-25', shift: 'NS' });
    expect(nextShift('2026-09-25', 'NS')).toEqual({ date: '2026-09-26', shift: 'DS' });
    expect(prevShift('2026-09-26', 'DS')).toEqual({ date: '2026-09-25', shift: 'NS' });
  });
});

describe('date helpers', () => {
  it('addDays / monthRange / daysInMonth / shiftMonth', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(daysInMonth('2024-02')).toHaveLength(29);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(isWeekend('2026-09-26')).toBe(true); // Saturday
    expect(isWeekend('2026-09-25')).toBe(false);
  });
});
